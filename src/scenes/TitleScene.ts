import Phaser from 'phaser'
import { GameData } from '../core/GameData'
import { SaveManager } from '../core/SaveManager'
import { EventBus, GameEvents } from '../core/EventBus'
import { AudioManager } from '../core/AudioManager'
import { GAME_WIDTH, GAME_HEIGHT, START_MAP_ID } from '../utils/constants'

export class TitleScene extends Phaser.Scene {
  private menuIndex = 0
  private menuItems: Phaser.GameObjects.Text[] = []
  private cursor!: Phaser.GameObjects.Rectangle
  private bg!: Phaser.GameObjects.Image

  constructor() {
    super({ key: 'TitleScene' })
  }

  create(): void {
    AudioManager.getInstance().setScene(this)
    AudioManager.getInstance().playBGM('title')

    // Background
    this.bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'ui_title_bg')
    this.bg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
    this.bg.setAlpha(0.6)

    // Dark overlay for text readability
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.3)

    // Title
    this.add.text(GAME_WIDTH / 2, 120, '木桶镇', {
      fontSize: '64px',
      color: '#e8e8f0',
      fontFamily: 'serif',
      stroke: '#1a1a2e',
      strokeThickness: 6,
    }).setOrigin(0.5)

    this.add.text(GAME_WIDTH / 2, 190, 'CaskTown', {
      fontSize: '28px',
      color: '#a0a0c0',
      fontFamily: 'sans-serif',
      stroke: '#1a1a2e',
      strokeThickness: 4,
    }).setOrigin(0.5)

    // Menu
    const menuTexts = ['开始游戏', '继续游戏', '设置', '退出']
    const startY = 300
    for (let i = 0; i < menuTexts.length; i++) {
      const text = this.add.text(GAME_WIDTH / 2, startY + i * 50, menuTexts[i]!, {
        fontSize: '24px',
        color: '#c0c0d0',
        fontFamily: 'sans-serif',
      }).setOrigin(0.5)
      this.menuItems.push(text)
    }

    // Cursor
    this.cursor = this.add.rectangle(GAME_WIDTH / 2 - 80, startY, 12, 12, 0xf1c40f)
    this.cursor.setOrigin(0.5)

    // Input
    this.input.keyboard?.on('keydown-UP', () => this.changeMenu(-1))
    this.input.keyboard?.on('keydown-DOWN', () => this.changeMenu(1))
    this.input.keyboard?.on('keydown-ENTER', () => this.selectMenu())
    this.input.keyboard?.on('keydown-SPACE', () => this.selectMenu())

    // Fade in
    this.cameras.main.fadeIn(500)
  }

  private changeMenu(dir: number): void {
    this.menuIndex = (this.menuIndex + dir + this.menuItems.length) % this.menuItems.length
    this.updateCursor()
  }

  private updateCursor(): void {
    const target = this.menuItems[this.menuIndex]!
    this.cursor.setY(target.y)
  }

  private selectMenu(): void {
    switch (this.menuIndex) {
      case 0:
        this.startNewGame()
        break
      case 1:
        this.loadGame()
        break
      case 2:
        this.openSettings()
        break
      case 3:
        // Exit - nothing in browser
        break
    }
  }

  private startNewGame(): void {
    const gd = GameData.getInstance()
    gd.reset()
    this.cameras.main.fadeOut(500)
    this.time.delayedCall(500, () => {
      this.scene.start('MapScene', { mapId: START_MAP_ID })
    })
  }

  private loadGame(): void {
    const saveManager = SaveManager.getInstance()
    if (saveManager.hasSave(1)) {
      saveManager.load(1)
      this.cameras.main.fadeOut(500)
      this.time.delayedCall(500, () => {
        this.scene.start('MapScene', { mapId: GameData.getInstance().currentMap })
      })
    } else {
      this.showMessage('无存档')
    }
  }

  private openSettings(): void {
    AudioManager.getInstance().playSFX('open_menu')
    this.scene.launch('SettingsScene', { returnTo: 'TitleScene' })
    this.scene.pause()
  }

  private showMessage(msg: string): void {
    const text = this.add.text(GAME_WIDTH / 2, 480, msg, {
      fontSize: '20px',
      color: '#e74c3c',
    }).setOrigin(0.5)
    this.time.delayedCall(1500, () => text.destroy())
  }
}
