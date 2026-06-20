import Phaser from 'phaser'
import { BootScene } from './scenes/BootScene'
import { TitleScene } from './scenes/TitleScene'
import { MapScene } from './scenes/MapScene'
import { BattleScene } from './scenes/BattleScene'
import { GameOverScene } from './scenes/GameOverScene'
import { MenuOverlay } from './scenes/MenuOverlay'
import { DialogueOverlay } from './scenes/DialogueOverlay'
import { SettingsScene } from './scenes/SettingsScene'
import { ShopOverlay } from './scenes/ShopOverlay'
import { TrainingOverlay } from './scenes/TrainingOverlay'
import { RebuildOverlay } from './scenes/RebuildOverlay'
import { CodexOverlay } from './scenes/CodexOverlay'
import { WorldMapOverlay } from './scenes/WorldMapOverlay'
import { GAME_CANVAS_BACKGROUND_COLOR, GAME_HEIGHT, GAME_WIDTH, TOUCH_INPUT } from './utils/constants'

export class CaskTownGame extends Phaser.Game {
  private scaleSyncRaf = 0

  constructor() {
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.CANVAS,
      parent: 'game-container',
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      backgroundColor: GAME_CANVAS_BACKGROUND_COLOR,
      pixelArt: true,
      roundPixels: true,
      scale: {
        parent: 'game-container',
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
      },
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false,
        },
      },
      scene: [BootScene, TitleScene, MapScene, BattleScene, GameOverScene, DialogueOverlay, MenuOverlay, SettingsScene, ShopOverlay, TrainingOverlay, RebuildOverlay, CodexOverlay, WorldMapOverlay],
      input: {
        keyboard: true,
        mouse: true,
        touch: true,
        gamepad: true,
        activePointers: TOUCH_INPUT.ACTIVE_POINTERS,
        windowEvents: true,
      },
    }
    super(config)
    this.bindContainerScaleSync()
  }

  private bindContainerScaleSync(): void {
    if (typeof window === 'undefined') return
    const parent = document.getElementById('game-container')
    if (!parent) return

    let observer: ResizeObserver | null = null
    const scheduleSync = (): void => {
      if (this.scaleSyncRaf) window.cancelAnimationFrame(this.scaleSyncRaf)
      this.scaleSyncRaf = window.requestAnimationFrame(() => {
        this.scaleSyncRaf = 0
        this.syncScaleToContainer(parent)
      })
    }

    scheduleSync()
    window.addEventListener('resize', scheduleSync)
    window.addEventListener('orientationchange', scheduleSync)
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(scheduleSync)
      observer.observe(parent)
    }
    this.events.once(Phaser.Core.Events.DESTROY, () => {
      if (this.scaleSyncRaf) window.cancelAnimationFrame(this.scaleSyncRaf)
      window.removeEventListener('resize', scheduleSync)
      window.removeEventListener('orientationchange', scheduleSync)
      observer?.disconnect()
    })
  }

  private syncScaleToContainer(parent: HTMLElement): void {
    const bounds = parent.getBoundingClientRect()
    const width = Math.round(bounds.width)
    const height = Math.round(bounds.height)
    if (width <= 0 || height <= 0) return
    this.scale.setParentSize(width, height)
    this.scale.refresh()
  }
}
