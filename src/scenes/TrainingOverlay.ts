import Phaser from 'phaser'
import { EventBus, GameEvents } from '../core/EventBus'
import { GameData } from '../core/GameData'
import { AudioManager } from '../core/AudioManager'
import { InputManager } from '../core/InputManager'
import { SkillGrowth } from '../core/SkillGrowth'
import { GAME_CONFIG_DATABASE } from '../data/configDatabase'
import { queueImageAssets } from '../core/AssetLoader'
import { GAME_WIDTH, GAME_HEIGHT, COLORS, FACILITY_OVERLAY_UI, MENU_OVERLAY_UI, RUNTIME_UI_ASSET_KEYS, TRAINING_COST, TRAINING_EXP_BASE, TRAINING_EXP_PER_LEVEL, scaleFont } from '../utils/constants'
import { bindTouchText } from '../utils/touch'
import { cleanupKeyboardOnShutdown } from '../utils/sceneLifecycle'
import { addRuntimePanel } from '../utils/runtimePanels'
import { GamepadNavigationController, type GamepadNavigationAction } from '../utils/gamepadNavigation'

export class TrainingOverlay extends Phaser.Scene {
  private selectedIndex = 0
  private textObjects: Phaser.GameObjects.Text[] = []
  private cursor!: Phaser.GameObjects.Rectangle
  private messageText!: Phaser.GameObjects.Text
  private goldText!: Phaser.GameObjects.Text
  private gamepadNavigation = new GamepadNavigationController()

  constructor() {
    super({ key: 'TrainingOverlay', active: false })
  }

  preload(): void {
    queueImageAssets(this, Object.values(RUNTIME_UI_ASSET_KEYS))
  }

  create(): void {
    this.selectedIndex = 0
    this.gamepadNavigation.reset()
    AudioManager.getInstance().playSFX('open_menu')

    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.black, FACILITY_OVERLAY_UI.OVERLAY_ALPHA)
    overlay.setDepth(FACILITY_OVERLAY_UI.OVERLAY_DEPTH).setScrollFactor(0)

    addRuntimePanel(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, FACILITY_OVERLAY_UI.PANEL_WIDTH, FACILITY_OVERLAY_UI.PANEL_HEIGHT, RUNTIME_UI_ASSET_KEYS.MENU_PANEL, COLORS.uiBg, FACILITY_OVERLAY_UI.PANEL_ALPHA, FACILITY_OVERLAY_UI.PANEL_DEPTH)
    const panelBorder = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, FACILITY_OVERLAY_UI.PANEL_WIDTH, FACILITY_OVERLAY_UI.PANEL_HEIGHT, COLORS.black, 0)
    panelBorder.setStrokeStyle(FACILITY_OVERLAY_UI.BORDER_WIDTH, COLORS.uiBorder).setDepth(FACILITY_OVERLAY_UI.BORDER_DEPTH).setScrollFactor(0)

    this.add.text(FACILITY_OVERLAY_UI.TITLE_X, FACILITY_OVERLAY_UI.TITLE_Y, '训练场', {
      fontSize: scaleFont(FACILITY_OVERLAY_UI.TITLE_FONT_SIZE), color: MENU_OVERLAY_UI.COLORS.title,
    }).setDepth(FACILITY_OVERLAY_UI.CONTENT_DEPTH).setScrollFactor(0)

    this.add.text(FACILITY_OVERLAY_UI.TITLE_X, FACILITY_OVERLAY_UI.SUBTITLE_Y, `每次消耗 ${TRAINING_COST}G`, {
      fontSize: scaleFont(FACILITY_OVERLAY_UI.DETAIL_FONT_SIZE), color: MENU_OVERLAY_UI.COLORS.muted,
    }).setDepth(FACILITY_OVERLAY_UI.CONTENT_DEPTH).setScrollFactor(0)

    this.goldText = this.add.text(FACILITY_OVERLAY_UI.GOLD_X, FACILITY_OVERLAY_UI.GOLD_Y, '', {
      fontSize: scaleFont(FACILITY_OVERLAY_UI.GOLD_FONT_SIZE), color: MENU_OVERLAY_UI.COLORS.title,
    }).setDepth(FACILITY_OVERLAY_UI.CONTENT_DEPTH).setScrollFactor(0)
    this.updateGold()

    this.messageText = this.add.text(FACILITY_OVERLAY_UI.MESSAGE_X, FACILITY_OVERLAY_UI.MESSAGE_Y, '', {
      fontSize: scaleFont(FACILITY_OVERLAY_UI.MESSAGE_FONT_SIZE), color: MENU_OVERLAY_UI.COLORS.title, wordWrap: { width: FACILITY_OVERLAY_UI.MESSAGE_WRAP_WIDTH },
    }).setOrigin(0.5).setDepth(FACILITY_OVERLAY_UI.CONTENT_DEPTH).setScrollFactor(0)

    bindTouchText(this.add.text(FACILITY_OVERLAY_UI.FOOTER_X, FACILITY_OVERLAY_UI.FOOTER_Y, '↑↓ 选择 | Enter 训练 | Esc 返回', {
      fontSize: scaleFont(FACILITY_OVERLAY_UI.FOOTER_FONT_SIZE), color: MENU_OVERLAY_UI.COLORS.text,
    }).setOrigin(0.5).setDepth(FACILITY_OVERLAY_UI.CONTENT_DEPTH).setScrollFactor(0), () => this.close())

    this.renderList()
    this.setupInput()
  }

  override update(): void {
    const input = InputManager.getInstance()
    const actions = this.gamepadNavigation.poll(this.input.gamepad, input.isGamepadEnabled())
    for (const action of actions) this.handleGamepadAction(action)
  }

  private handleGamepadAction(action: GamepadNavigationAction): void {
    if (action === 'up') {
      this.move(-1)
      return
    }
    if (action === 'down') {
      this.move(1)
      return
    }
    if (action === 'confirm') {
      this.train()
      return
    }
    if (action === 'cancel' || action === 'menu') this.close()
  }

  private renderList(): void {
    for (const t of this.textObjects) t.destroy()
    this.textObjects = []
    this.cursor?.destroy()

    const gd = GameData.getInstance()
    const startY = FACILITY_OVERLAY_UI.LIST_START_Y

    for (let i = 0; i < gd.party.length; i++) {
      const charId = gd.party[i]!
      const char = gd.characters.get(charId)
      if (!char) continue

      const color = i === this.selectedIndex ? MENU_OVERLAY_UI.COLORS.title : MENU_OVERLAY_UI.COLORS.text
      const rowY = startY + i * FACILITY_OVERLAY_UI.TRAINING_ROW_GAP_Y
      const t1 = this.add.text(FACILITY_OVERLAY_UI.LIST_X, rowY,
        `${char.name} Lv.${char.stats.level}`,
        { fontSize: scaleFont(FACILITY_OVERLAY_UI.BODY_FONT_SIZE), color },
      ).setDepth(FACILITY_OVERLAY_UI.CONTENT_DEPTH).setScrollFactor(0)
      bindTouchText(t1, () => this.selectPartyMember(i))
      this.textObjects.push(t1)
    }

    const selectedCharId = gd.party[this.selectedIndex]
    const selectedChar = selectedCharId ? gd.characters.get(selectedCharId) : null
    if (selectedChar) {
      const expPct = selectedChar.stats.expToNext > 0 ? Math.floor((selectedChar.stats.exp / selectedChar.stats.expToNext) * 100) : 0
      const expGain = TRAINING_EXP_BASE + selectedChar.stats.level * TRAINING_EXP_PER_LEVEL
      const detailLines = [
        `${selectedChar.name} Lv.${selectedChar.stats.level}`,
        `EXP ${selectedChar.stats.exp}/${selectedChar.stats.expToNext} (${expPct}%)`,
        `HP ${selectedChar.stats.maxHp} / MP ${selectedChar.stats.maxMp}`,
        `ATK ${selectedChar.stats.atk}  DEF ${selectedChar.stats.def}`,
        `SPD ${selectedChar.stats.speed}`,
        `本次训练 +${expGain} EXP`,
      ]

      const detailText = this.add.text(FACILITY_OVERLAY_UI.DESC_X, FACILITY_OVERLAY_UI.DESC_Y, detailLines.join('\n'), {
        fontSize: scaleFont(FACILITY_OVERLAY_UI.DETAIL_FONT_SIZE),
        color: MENU_OVERLAY_UI.COLORS.text,
        wordWrap: { width: FACILITY_OVERLAY_UI.DESC_WRAP_WIDTH },
      }).setDepth(FACILITY_OVERLAY_UI.CONTENT_DEPTH).setScrollFactor(0)
      this.textObjects.push(detailText)
    }

    this.cursor = this.add.rectangle(FACILITY_OVERLAY_UI.CURSOR_X, startY + this.selectedIndex * FACILITY_OVERLAY_UI.TRAINING_ROW_GAP_Y + FACILITY_OVERLAY_UI.CURSOR_OFFSET_Y, FACILITY_OVERLAY_UI.CURSOR_SIZE, FACILITY_OVERLAY_UI.CURSOR_SIZE, COLORS.tpBar)
    this.cursor.setDepth(FACILITY_OVERLAY_UI.CONTENT_DEPTH).setScrollFactor(0)
  }

  private updateGold(): void {
    this.goldText.setText(`金币: ${GameData.getInstance().gold}G`)
  }

  private setupInput(): void {
    cleanupKeyboardOnShutdown(this)
    this.input.keyboard?.on('keydown-UP', () => this.move(-1))
    this.input.keyboard?.on('keydown-DOWN', () => this.move(1))
    this.input.keyboard?.on('keydown-ENTER', () => this.train())
    this.input.keyboard?.on('keydown-SPACE', () => this.train())
    this.input.keyboard?.on('keydown-ESC', () => this.close())
  }

  private move(dir: number): void {
    const gd = GameData.getInstance()
    if (gd.party.length === 0) return
    this.selectedIndex = (this.selectedIndex + dir + gd.party.length) % gd.party.length
    AudioManager.getInstance().playSFX('cursor')
    this.renderList()
    this.messageText.setText('')
  }

  private train(): void {
    const gd = GameData.getInstance()
    const charId = gd.party[this.selectedIndex]
    if (!charId) return
    const char = gd.characters.get(charId)
    if (!char) return

    if (gd.gold < TRAINING_COST) {
      this.messageText.setText('金币不足！')
      AudioManager.getInstance().playSFX('cancel')
      return
    }

    gd.spendGold(TRAINING_COST)

    const expGain = TRAINING_EXP_BASE + char.stats.level * TRAINING_EXP_PER_LEVEL
    const levelUps = gd.gainCharacterExperience(charId, expGain)
    const unlockedSkills = SkillGrowth.getInstance().checkUnlocksForCharacter(charId)

    if (levelUps.length > 0) {
      AudioManager.getInstance().playSFX('level_up')
      const skillText = unlockedSkills.length > 0
        ? `，习得 ${unlockedSkills.map(skillId => GAME_CONFIG_DATABASE.getTable('skills')[skillId]?.name ?? skillId).join('、')}`
        : ''
      this.messageText.setText(`${char.name} 升至 Lv.${char.stats.level}${skillText}`)
    } else {
      AudioManager.getInstance().playSFX('confirm')
      this.messageText.setText(`${char.name} 获得 ${expGain} EXP`)
    }

    this.updateGold()
    this.renderList()
  }

  private selectPartyMember(index: number): void {
    const gd = GameData.getInstance()
    if (index < 0 || index >= gd.party.length) return
    this.selectedIndex = index
    this.train()
  }

  private close(): void {
    AudioManager.getInstance().playSFX('close_menu')
    EventBus.emit(GameEvents.MENU_CLOSE)
    this.scene.stop()
  }
}
