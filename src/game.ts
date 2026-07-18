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
import { GameData } from './core/GameData'
import { GAME_CANVAS_BACKGROUND_COLOR, GAME_HEIGHT, GAME_WIDTH, TOUCH_INPUT } from './utils/constants'
import { applyPixelSharp } from './utils/displaySettings'

export class CaskTownGame extends Phaser.Game {
  private scaleSyncRaf = 0
  private appliedPixelSharp: boolean | null = null

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
    this.bindDisplaySettings()
    this.bindFullscreenState()
  }

  private bindFullscreenState(): void {
    const events = [
      Phaser.Scale.Events.ENTER_FULLSCREEN,
      Phaser.Scale.Events.LEAVE_FULLSCREEN,
      Phaser.Scale.Events.FULLSCREEN_FAILED,
      Phaser.Scale.Events.FULLSCREEN_UNSUPPORTED,
    ]
    for (const event of events) this.scale.on(event, this.syncFullscreenState, this)
    this.syncFullscreenState()
    this.events.once(Phaser.Core.Events.DESTROY, () => {
      for (const event of events) this.scale.off(event, this.syncFullscreenState, this)
    })
  }

  private syncFullscreenState(): void {
    GameData.getInstance().settings.fullscreen = this.scale.isFullscreen
  }

  private bindDisplaySettings(): void {
    this.textures.on(Phaser.Textures.Events.ADD, this.handleTextureAdded, this)
    this.events.on(Phaser.Core.Events.PRE_STEP, this.syncDisplaySettings, this)
    this.syncDisplaySettings()
    this.events.once(Phaser.Core.Events.DESTROY, () => {
      this.textures.off(Phaser.Textures.Events.ADD, this.handleTextureAdded, this)
      this.events.off(Phaser.Core.Events.PRE_STEP, this.syncDisplaySettings, this)
    })
  }

  private syncDisplaySettings(): void {
    const enabled = GameData.getInstance().settings.pixelSharp
    if (enabled === this.appliedPixelSharp) return
    this.appliedPixelSharp = enabled
    applyPixelSharp(this, enabled, enabled ? Phaser.Textures.FilterMode.NEAREST : Phaser.Textures.FilterMode.LINEAR)
  }

  private handleTextureAdded(_key: string, texture: Phaser.Textures.Texture): void {
    const enabled = this.appliedPixelSharp ?? GameData.getInstance().settings.pixelSharp
    texture.setFilter(enabled ? Phaser.Textures.FilterMode.NEAREST : Phaser.Textures.FilterMode.LINEAR)
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
