import Phaser from 'phaser'
import { EventBus, GameEvents } from '../core/EventBus'
import { GameData } from '../core/GameData'
import { AudioManager } from '../core/AudioManager'
import { GAME_WIDTH, GAME_HEIGHT, COLORS, TRAINING_COST, TRAINING_EXP_BASE, TRAINING_EXP_PER_LEVEL } from '../utils/constants'

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

    const panel = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 600, 420, COLORS.uiBg, 0.95)
    panel.setStrokeStyle(2, COLORS.uiBorder).setDepth(401).setScrollFactor(0)

    this.add.text(GAME_WIDTH / 2 - 280, GAME_HEIGHT / 2 - 195, 'Training', {
      fontSize: '24px', color: COLORS.uiText,
    }).setDepth(402).setScrollFactor(0)

    this.add.text(GAME_WIDTH / 2 - 280, GAME_HEIGHT / 2 - 162, `Cost: ${TRAINING_COST}G / session`, {
      fontSize: '16px', color: '#a0a0b0',
    }).setDepth(402).setScrollFactor(0)

    this.goldText = this.add.text(GAME_WIDTH / 2 + 100, GAME_HEIGHT / 2 - 195, '', {
      fontSize: '20px', color: '#f1c40f',
    }).setDepth(402).setScrollFactor(0)
    this.updateGold()

    this.messageText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 185, '', {
      fontSize: '16px', color: '#f1c40f',
    }).setOrigin(0.5).setDepth(402).setScrollFactor(0)

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 200, '↑↓ Select | Enter Train | Esc Back', {
      fontSize: '12px', color: '#808090',
    }).setOrigin(0.5).setDepth(402).setScrollFactor(0)

    this.renderList()
    this.setupInput()
  }

  private renderList(): void {
    for (const t of this.textObjects) t.destroy()
    this.textObjects = []
    this.cursor?.destroy()

    const gd = GameData.getInstance()
    const startY = GAME_HEIGHT / 2 - 115

    for (let i = 0; i < gd.party.length; i++) {
      const charId = gd.party[i]!
      const char = gd.characters.get(charId)
      if (!char) continue

      const color = i === this.selectedIndex ? '#f1c40f' : COLORS.uiText
      const expPct = char.stats.expToNext > 0 ? Math.floor((char.stats.exp / char.stats.expToNext) * 100) : 0
      const expGain = TRAINING_EXP_BASE + char.stats.level * TRAINING_EXP_PER_LEVEL

      const t1 = this.add.text(GAME_WIDTH / 2 - 260, startY + i * 70,
        `${char.name} Lv.${char.stats.level}  EXP ${char.stats.exp}/${char.stats.expToNext} (${expPct}%)`,
        { fontSize: '18px', color },
      ).setDepth(402).setScrollFactor(0)
      this.textObjects.push(t1)

      const t2 = this.add.text(GAME_WIDTH / 2 - 240, startY + i * 70 + 24,
        `HP:${char.stats.maxHp} MP:${char.stats.maxMp} ATK:${char.stats.atk} DEF:${char.stats.def} SPD:${char.stats.speed}`,
        { fontSize: '14px', color: '#a0a0b0' },
      ).setDepth(402).setScrollFactor(0)
      this.textObjects.push(t2)

      const t3 = this.add.text(GAME_WIDTH / 2 - 240, startY + i * 70 + 42,
        `+${expGain} EXP per session`,
        { fontSize: '12px', color: '#606070' },
      ).setDepth(402).setScrollFactor(0)
      this.textObjects.push(t3)
    }

    this.cursor = this.add.rectangle(GAME_WIDTH / 2 - 275, startY + this.selectedIndex * 70 + 9, 8, 8, COLORS.tpBar)
    this.cursor.setDepth(403).setScrollFactor(0)
  }

  private updateGold(): void {
    this.goldText.setText(`Gold: ${GameData.getInstance().gold}G`)
  }

  private setupInput(): void {
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
      this.messageText.setText('Gold not enough!')
      AudioManager.getInstance().playSFX('cancel')
      return
    }

    gd.spendGold(TRAINING_COST)

    const expGain = TRAINING_EXP_BASE + char.stats.level * TRAINING_EXP_PER_LEVEL
    char.stats.exp += expGain

    let leveledUp = false
    while (char.stats.exp >= char.stats.expToNext) {
      char.stats.exp -= char.stats.expToNext
      char.stats.level++
      char.stats.expToNext = Math.floor(char.stats.expToNext * 1.3)

      char.stats.maxHp += Math.floor(10 + char.stats.level * 2)
      char.stats.hp = char.stats.maxHp
      char.stats.maxMp += Math.floor(5 + char.stats.level)
      char.stats.mp = char.stats.maxMp
      char.stats.atk += 2
      char.stats.def += 1
      char.stats.matk += 2
      char.stats.mdef += 1
      char.stats.speed += 1

      leveledUp = true
    }

    if (leveledUp) {
      AudioManager.getInstance().playSFX('level_up')
      this.messageText.setText(`${char.name} leveled up to Lv.${char.stats.level}!`)
      EventBus.emit(GameEvents.LEVEL_UP, { charId, level: char.stats.level })
    } else {
      AudioManager.getInstance().playSFX('confirm')
      this.messageText.setText(`${char.name} gained ${expGain} EXP!`)
    }

    this.updateGold()
    this.renderList()
  }

  private close(): void {
    AudioManager.getInstance().playSFX('close_menu')
    EventBus.emit(GameEvents.MENU_CLOSE)
    this.scene.stop()
  }
}
