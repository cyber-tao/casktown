import Phaser from 'phaser'
import { GameData } from '../core/GameData'
import { queueImageAsset } from '../core/AssetLoader'

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' })
  }

  preload(): void {
    queueImageAsset(this, 'ui_title_bg')
  }

  create(): void {
    const gd = GameData.getInstance()
    if (gd.characters.size === 0) {
      gd.reset()
    }

    this.scene.start('TitleScene')
  }
}
