import Phaser from 'phaser'
import { EventBus, GameEvents } from '../core/EventBus'
import { GameData } from '../core/GameData'
import { AudioManager } from '../core/AudioManager'
import { SkillGrowth } from '../core/SkillGrowth'
import { GAME_CONFIG_DATABASE } from '../data/configDatabase'
import { GAME_WIDTH, GAME_HEIGHT, COLORS, TRAINING_COST, TRAINING_EXP_BASE, TRAINING_EXP_PER_LEVEL, scaleFont, scalePx } from '../utils/constants'
import { bindTouchText } from '../utils/touch'
import { cleanupKeyboardOnShutdown } from '../utils/sceneLifecycle'

export class TrainingOverlay extends Phaser.Scene {
  private selectedIndex = 0
  private textObjects: Phaser.GameObjects.Text[] = []
  private cursor!: Phaser.GameObjects.Rectangle
  private messageText!: Phaser.GameObjects.Text
  private goldText!: Phaser.GameObjects.Text

  constructor() {
    super({ key: 'TrainingOverlay', active: false })
  }

  create(): void {
    this.selectedIndex = 0
    AudioManager.getInstance().playSFX('open_menu')

    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.black, 0.5)
    overlay.setDepth(400).setScrollFactor(0)

    const panel = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, scalePx(600), scalePx(420), COLORS.uiBg, 0.95)
    panel.setStrokeStyle(scalePx(2), COLORS.uiBorder).setDepth(401).setScrollFactor(0)

    this.add.text(GAME_WIDTH / 2 - scalePx(280), GAME_HEIGHT / 2 - scalePx(195), '训练场', {
      fontSize: scaleFont(24), color: COLORS.uiText,
    }).setDepth(402).setScrollFactor(0)

    this.add.text(GAME_WIDTH / 2 - scalePx(280), GAME_HEIGHT / 2 - scalePx(162), `每次消耗 ${TRAINING_COST}G`, {
      fontSize: scaleFont(16), color: '#a0a0b0',
    }).setDepth(402).setScrollFactor(0)

    this.goldText = this.add.text(GAME_WIDTH / 2 + scalePx(100), GAME_HEIGHT / 2 - scalePx(195), '', {
      fontSize: scaleFont(20), color: '#f1c40f',
    }).setDepth(402).setScrollFactor(0)
    this.updateGold()

    this.messageText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + scalePx(185), '', {
      fontSize: scaleFont(16), color: '#f1c40f',
    }).setOrigin(0.5).setDepth(402).setScrollFactor(0)

    bindTouchText(this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + scalePx(200), '↑↓ 选择 | Enter 训练 | Esc 返回', {
      fontSize: scaleFont(12), color: '#808090',
    }).setOrigin(0.5).setDepth(402).setScrollFactor(0), () => this.close())

    this.renderList()
    this.setupInput()
  }

  private renderList(): void {
    for (const t of this.textObjects) t.destroy()
    this.textObjects = []
    this.cursor?.destroy()

    const gd = GameData.getInstance()
    const startY = GAME_HEIGHT / 2 - scalePx(115)

    for (let i = 0; i < gd.party.length; i++) {
      const charId = gd.party[i]!
      const char = gd.characters.get(charId)
      if (!char) continue

      const color = i === this.selectedIndex ? '#f1c40f' : COLORS.uiText
      const expPct = char.stats.expToNext > 0 ? Math.floor((char.stats.exp / char.stats.expToNext) * 100) : 0
      const expGain = TRAINING_EXP_BASE + char.stats.level * TRAINING_EXP_PER_LEVEL

      const t1 = this.add.text(GAME_WIDTH / 2 - scalePx(260), startY + scalePx(i * 70),
        `${char.name} Lv.${char.stats.level}  EXP ${char.stats.exp}/${char.stats.expToNext} (${expPct}%)`,
        { fontSize: scaleFont(18), color },
      ).setDepth(402).setScrollFactor(0)
      bindTouchText(t1, () => this.selectPartyMember(i))
      this.textObjects.push(t1)

      const t2 = this.add.text(GAME_WIDTH / 2 - scalePx(240), startY + scalePx(i * 70 + 24),
        `HP:${char.stats.maxHp} MP:${char.stats.maxMp} ATK:${char.stats.atk} DEF:${char.stats.def} SPD:${char.stats.speed}`,
        { fontSize: scaleFont(14), color: '#a0a0b0' },
      ).setDepth(402).setScrollFactor(0)
      bindTouchText(t2, () => this.selectPartyMember(i))
      this.textObjects.push(t2)

      const t3 = this.add.text(GAME_WIDTH / 2 - scalePx(240), startY + scalePx(i * 70 + 42),
        `+${expGain} EXP per session`,
        { fontSize: scaleFont(12), color: '#606070' },
      ).setDepth(402).setScrollFactor(0)
      bindTouchText(t3, () => this.selectPartyMember(i))
      this.textObjects.push(t3)
    }

    this.cursor = this.add.rectangle(GAME_WIDTH / 2 - scalePx(275), startY + scalePx(this.selectedIndex * 70 + 9), scalePx(8), scalePx(8), COLORS.tpBar)
    this.cursor.setDepth(403).setScrollFactor(0)
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
