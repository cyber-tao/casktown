import Phaser from 'phaser'
import { GameData } from '../core/GameData'
import { queueImageAsset } from '../core/AssetLoader'
import { AudioManager } from '../core/AudioManager'
import { LOADING_SCREEN, TITLE_BACKGROUND } from '../utils/constants'
import { showLoadingScreen } from '../utils/loadingScreen'

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' })
  }

  preload(): void {
    showLoadingScreen(this, LOADING_SCREEN.STARTUP_LABEL)
    queueImageAsset(this, LOADING_SCREEN.BACKGROUND_KEY)
    queueImageAsset(this, TITLE_BACKGROUND.IMAGE_KEY)
    this.load.video(TITLE_BACKGROUND.VIDEO_KEY, TITLE_BACKGROUND.VIDEO_PATH, TITLE_BACKGROUND.VIDEO_NO_AUDIO)
    AudioManager.getInstance().preload(this.load)
  }

  create(): void {
    const gd = GameData.getInstance()
    if (gd.characters.size === 0) {
      gd.reset()
    }

    this.scene.start('TitleScene')
  }
}
