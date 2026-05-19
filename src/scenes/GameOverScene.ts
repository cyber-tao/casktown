import Phaser from 'phaser'
import { AudioManager } from '../core/AudioManager'
import { GameData } from '../core/GameData'
import { SaveManager } from '../core/SaveManager'
import { GAME_HEIGHT, GAME_OVER_PANEL, GAME_WIDTH, START_MAP_ID } from '../utils/constants'
import { bindTouchText } from '../utils/touch'

export class GameOverScene extends Phaser.Scene {
  private menuIndex = 0
  private menuItems: Phaser.GameObjects.Text[] = []
  private cursor!: Phaser.GameObjects.Rectangle

  constructor() {
    super({ key: 'GameOverScene' })
  }

  create(): void {
    this.menuIndex = 0
    this.menuItems = []
    AudioManager.getInstance().setScene(this)
    AudioManager.getInstance().playGameOverBGM()

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x080810, 1)
    this.add.text(GAME_WIDTH / 2, GAME_OVER_PANEL.titleY, 'GAME OVER', {
      fontSize: '56px',
      color: '#e74c3c',
      fontFamily: 'serif',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5)
    this.add.text(GAME_WIDTH / 2, GAME_OVER_PANEL.subtitleY, '队伍倒下了，但故事还没有结束。', {
      fontSize: '22px',
      color: '#e8e8f0',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5)

    const labels = ['读取存档', '重新开始', '返回标题']
    for (let i = 0; i < labels.length; i++) {
      const text = this.add.text(GAME_WIDTH / 2, GAME_OVER_PANEL.menuStartY + i * GAME_OVER_PANEL.menuGap, labels[i]!, {
        fontSize: '24px',
        color: '#c0c0d0',
        fontFamily: 'sans-serif',
      }).setOrigin(0.5)
      bindTouchText(text, () => this.selectMenuItem(i))
      this.menuItems.push(text)
    }

    this.cursor = this.add.rectangle(GAME_WIDTH / 2 - GAME_OVER_PANEL.cursorOffsetX, GAME_OVER_PANEL.menuStartY, GAME_OVER_PANEL.cursorSize, GAME_OVER_PANEL.cursorSize, 0xf1c40f)
    this.cursor.setOrigin(0.5)

    this.input.keyboard?.on('keydown-UP', () => this.changeMenu(-1))
    this.input.keyboard?.on('keydown-DOWN', () => this.changeMenu(1))
    this.input.keyboard?.on('keydown-ENTER', () => this.selectMenu())
    this.input.keyboard?.on('keydown-SPACE', () => this.selectMenu())
  }

  private changeMenu(dir: number): void {
    this.menuIndex = (this.menuIndex + dir + this.menuItems.length) % this.menuItems.length
    this.cursor.setY(this.menuItems[this.menuIndex]!.y)
    AudioManager.getInstance().playSFX('cursor')
  }

  private selectMenu(): void {
    AudioManager.getInstance().playSFX('confirm')
    switch (this.menuIndex) {
      case 0:
        this.loadGame()
        break
      case 1:
        this.startNewGame()
        break
      case 2:
        this.scene.start('TitleScene')
        break
    }
  }

  private selectMenuItem(index: number): void {
    this.menuIndex = index
    this.cursor.setY(this.menuItems[this.menuIndex]!.y)
    this.selectMenu()
  }

  private loadGame(): void {
    const saveManager = SaveManager.getInstance()
    if (!saveManager.hasSave(1)) {
      this.showMessage('无存档')
      return
    }
    saveManager.load(1)
    this.scene.start('MapScene', { mapId: GameData.getInstance().currentMap })
  }

  private startNewGame(): void {
    GameData.getInstance().reset()
    this.scene.start('MapScene', { mapId: START_MAP_ID })
  }

  private showMessage(message: string): void {
    const text = this.add.text(GAME_WIDTH / 2, GAME_OVER_PANEL.messageY, message, {
      fontSize: '20px',
      color: '#e74c3c',
    }).setOrigin(0.5)
    this.time.delayedCall(GAME_OVER_PANEL.messageDurationMs, () => text.destroy())
  }
}
