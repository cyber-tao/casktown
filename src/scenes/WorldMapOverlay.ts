import Phaser from 'phaser'
import { EventBus, GameEvents } from '../core/EventBus'
import { AudioManager } from '../core/AudioManager'
import { queueImageAsset } from '../core/AssetLoader'
import { GameData } from '../core/GameData'
import { GAME_CONFIG_DATABASE } from '../data/configDatabase'
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  MAP_INPUT_CODES,
  WORLD_MAP_BACKGROUND_DISPLAY_WIDTH,
  WORLD_MAP_BACKGROUND_LAYOUT,
  WORLD_MAP_LOCATION_POINTS,
  WORLD_MAP_UI,
} from '../utils/constants'
import { bindTouchText } from '../utils/touch'

export class WorldMapOverlay extends Phaser.Scene {
  constructor() {
    super({ key: 'WorldMapOverlay', active: false })
  }

  private handleKeydown = (event: KeyboardEvent): void => {
    if (event.code === MAP_INPUT_CODES.WORLD_MAP || event.code === 'Escape') {
      this.close()
    }
  }

  preload(): void {
    queueImageAsset(this, WORLD_MAP_BACKGROUND_LAYOUT.KEY)
  }

  create(): void {
    AudioManager.getInstance().setScene(this)

    const bg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, WORLD_MAP_BACKGROUND_LAYOUT.BACKDROP_COLOR, WORLD_MAP_BACKGROUND_LAYOUT.BACKDROP_ALPHA)
    bg.setDepth(WORLD_MAP_BACKGROUND_LAYOUT.BACKDROP_DEPTH).setScrollFactor(0)

    const mapBackground = this.add.image(WORLD_MAP_BACKGROUND_LAYOUT.X, WORLD_MAP_BACKGROUND_LAYOUT.Y, WORLD_MAP_BACKGROUND_LAYOUT.KEY)
    mapBackground.setDisplaySize(WORLD_MAP_BACKGROUND_DISPLAY_WIDTH, WORLD_MAP_BACKGROUND_LAYOUT.DISPLAY_HEIGHT)
    mapBackground.setDepth(WORLD_MAP_BACKGROUND_LAYOUT.MAP_DEPTH).setScrollFactor(0)

    const title = this.add.text(GAME_WIDTH / 2, WORLD_MAP_UI.TITLE_Y, '世界地图', {
      fontSize: `${WORLD_MAP_UI.TITLE_FONT_SIZE}px`, color: '#f1c40f',
    })
    title.setOrigin(0.5, 0).setScrollFactor(0).setDepth(201)

    const hint = this.add.text(GAME_WIDTH / 2, WORLD_MAP_UI.HINT_Y, 'M / Esc 返回', {
      fontSize: `${WORLD_MAP_UI.HINT_FONT_SIZE}px`, color: '#7f8c8d',
    })
    hint.setOrigin(0.5).setScrollFactor(0).setDepth(201)
    bindTouchText(hint, () => this.close())

    this.renderCurrentLocation()

    this.input.keyboard!.on('keydown', this.handleKeydown)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown', this.handleKeydown)
    })
  }

  private renderCurrentLocation(): void {
    const gd = GameData.getInstance()
    const mapId = gd.currentMap
    const mapName = GAME_CONFIG_DATABASE.getTable('maps')[mapId]?.name ?? mapId
    const label = this.add.text(GAME_WIDTH / 2, WORLD_MAP_UI.LOCATION_LABEL_Y, `当前位置：${mapName}`, {
      fontSize: `${WORLD_MAP_UI.LOCATION_LABEL_FONT_SIZE}px`,
      color: '#f8c46b',
    })
    label.setOrigin(0.5).setScrollFactor(0).setDepth(WORLD_MAP_UI.LOCATION_LABEL_DEPTH)
    const labelBg = this.add.rectangle(
      label.x,
      label.y,
      label.width + WORLD_MAP_UI.LOCATION_LABEL_PADDING_X * 2,
      label.height + WORLD_MAP_UI.LOCATION_LABEL_PADDING_Y * 2,
      WORLD_MAP_UI.LOCATION_LABEL_BG_COLOR,
      WORLD_MAP_UI.LOCATION_LABEL_BG_ALPHA,
    )
    labelBg.setScrollFactor(0).setDepth(WORLD_MAP_UI.LOCATION_LABEL_DEPTH - 1)

    const point = WORLD_MAP_LOCATION_POINTS[mapId]
    if (!point) return

    const pulse = this.add.graphics()
    pulse.setPosition(point.x, point.y)
    pulse.fillStyle(WORLD_MAP_UI.LOCATION_PIN_COLOR, WORLD_MAP_UI.LOCATION_PULSE_FILL_ALPHA)
    pulse.fillCircle(0, 0, WORLD_MAP_UI.LOCATION_PULSE_SIZE)
    pulse.lineStyle(WORLD_MAP_UI.LOCATION_PIN_STROKE_WIDTH, WORLD_MAP_UI.LOCATION_PIN_COLOR, WORLD_MAP_UI.LOCATION_PULSE_ALPHA)
    pulse.strokeCircle(0, 0, WORLD_MAP_UI.LOCATION_PULSE_SIZE)
    pulse.setScrollFactor(0).setDepth(WORLD_MAP_UI.LOCATION_MARKER_DEPTH - 1)

    this.tweens.add({
      targets: pulse,
      alpha: WORLD_MAP_UI.LOCATION_PULSE_MIN_ALPHA,
      scale: WORLD_MAP_UI.LOCATION_PULSE_SCALE,
      duration: WORLD_MAP_UI.LOCATION_PULSE_DURATION_MS,
      yoyo: true,
      repeat: -1,
    })

    const pin = this.add.graphics()
    pin.setPosition(point.x, point.y)
    pin.fillStyle(WORLD_MAP_UI.LOCATION_PIN_COLOR, WORLD_MAP_UI.LOCATION_PIN_ALPHA)
    pin.fillCircle(0, 0, WORLD_MAP_UI.LOCATION_PIN_SIZE)
    pin.lineStyle(WORLD_MAP_UI.LOCATION_PIN_STROKE_WIDTH, WORLD_MAP_UI.LOCATION_PIN_STROKE_COLOR, WORLD_MAP_UI.LOCATION_PIN_ALPHA)
    pin.strokeCircle(0, 0, WORLD_MAP_UI.LOCATION_PIN_SIZE)
    pin.setScrollFactor(0).setDepth(WORLD_MAP_UI.LOCATION_MARKER_DEPTH)
  }

  private close(): void {
    AudioManager.getInstance().playSFX('close_menu')
    EventBus.emit(GameEvents.MENU_CLOSE)
    this.scene.stop()
  }
}
