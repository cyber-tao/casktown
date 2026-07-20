import Phaser from 'phaser'
import { EventBus, GameEvents } from '../core/EventBus'
import { AudioManager } from '../core/AudioManager'
import { queueImageAsset } from '../core/AssetLoader'
import { GameData } from '../core/GameData'
import { InputManager } from '../core/InputManager'
import { GAME_CONFIG_DATABASE } from '../data/configDatabase'
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  LOADING_SCREEN,
  MAP_INPUT_CODES,
  WORLD_MAP_BACKGROUND_DISPLAY_WIDTH,
  WORLD_MAP_BACKGROUND_LAYOUT,
  WORLD_MAP_LOCATION_POINTS,
  WORLD_MAP_UI,
} from '../utils/constants'
import { bindTouchText } from '../utils/touch'
import { showLoadingScreen } from '../utils/loadingScreen'
import { GamepadNavigationController, type GamepadNavigationAction } from '../utils/gamepadNavigation'

export class WorldMapOverlay extends Phaser.Scene {
  private closing = false
  private gamepadNavigation = new GamepadNavigationController()

  constructor() {
    super({ key: 'WorldMapOverlay', active: false })
  }

  private handleKeydown = (event: KeyboardEvent): void => {
    if (event.code === MAP_INPUT_CODES.WORLD_MAP || InputManager.getInstance().isCancel(event.code)) {
      this.close()
    }
  }

  preload(): void {
    showLoadingScreen(this, LOADING_SCREEN.WORLD_MAP_LABEL)
    queueImageAsset(this, WORLD_MAP_BACKGROUND_LAYOUT.KEY)
  }

  create(): void {
    this.closing = false
    this.gamepadNavigation.reset()
    AudioManager.getInstance().pushScene(this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      AudioManager.getInstance().popScene(this)
    })

    const bg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, WORLD_MAP_BACKGROUND_LAYOUT.BACKDROP_COLOR, WORLD_MAP_BACKGROUND_LAYOUT.BACKDROP_ALPHA)
    bg.setDepth(WORLD_MAP_BACKGROUND_LAYOUT.BACKDROP_DEPTH).setScrollFactor(0)

    const mapBackground = this.add.image(WORLD_MAP_BACKGROUND_LAYOUT.X, WORLD_MAP_BACKGROUND_LAYOUT.Y, WORLD_MAP_BACKGROUND_LAYOUT.KEY)
    mapBackground.setDisplaySize(WORLD_MAP_BACKGROUND_DISPLAY_WIDTH, WORLD_MAP_BACKGROUND_LAYOUT.DISPLAY_HEIGHT)
    mapBackground.setDepth(WORLD_MAP_BACKGROUND_LAYOUT.MAP_DEPTH).setScrollFactor(0)

    const titlePanel = this.add.rectangle(
      GAME_WIDTH / 2,
      WORLD_MAP_UI.TITLE_Y + WORLD_MAP_UI.TITLE_PANEL_HEIGHT / 2,
      WORLD_MAP_UI.TITLE_PANEL_WIDTH,
      WORLD_MAP_UI.TITLE_PANEL_HEIGHT,
      WORLD_MAP_UI.TITLE_PANEL_BG_COLOR,
      WORLD_MAP_UI.TITLE_PANEL_BG_ALPHA,
    )
    titlePanel.setStrokeStyle(
      WORLD_MAP_UI.TITLE_PANEL_BORDER_WIDTH,
      WORLD_MAP_UI.TITLE_PANEL_BORDER_COLOR,
      WORLD_MAP_UI.TITLE_PANEL_BORDER_ALPHA,
    )
    titlePanel.setScrollFactor(0).setDepth(WORLD_MAP_UI.TITLE_PANEL_DEPTH)

    const title = this.add.text(GAME_WIDTH / 2, WORLD_MAP_UI.TITLE_Y, '世界地图', {
      fontSize: `${WORLD_MAP_UI.TITLE_FONT_SIZE}px`,
      color: WORLD_MAP_UI.TITLE_COLOR,
      fontFamily: WORLD_MAP_UI.TITLE_FONT_FAMILY,
      stroke: WORLD_MAP_UI.TITLE_STROKE_COLOR,
      strokeThickness: WORLD_MAP_UI.TITLE_STROKE_THICKNESS,
    })
    title.setOrigin(0.5, 0).setScrollFactor(0).setDepth(WORLD_MAP_UI.TITLE_TEXT_DEPTH)

    const hint = this.add.text(GAME_WIDTH / 2, WORLD_MAP_UI.HINT_Y, `M / ${InputManager.getInstance().getActionName('cancel')} 返回`, {
      fontSize: `${WORLD_MAP_UI.HINT_FONT_SIZE}px`,
      color: WORLD_MAP_UI.HINT_COLOR,
      fontFamily: WORLD_MAP_UI.HINT_FONT_FAMILY,
    })
    hint.setOrigin(0.5).setScrollFactor(0).setDepth(201)
    bindTouchText(hint, () => this.close())

    const closeButton = this.add.rectangle(
      WORLD_MAP_UI.CLOSE_BUTTON_X,
      WORLD_MAP_UI.CLOSE_BUTTON_Y,
      WORLD_MAP_UI.CLOSE_BUTTON_WIDTH,
      WORLD_MAP_UI.CLOSE_BUTTON_HEIGHT,
      WORLD_MAP_UI.CLOSE_BUTTON_BG_COLOR,
      WORLD_MAP_UI.CLOSE_BUTTON_BG_ALPHA,
    )
    closeButton.setStrokeStyle(WORLD_MAP_UI.CLOSE_BUTTON_BORDER_WIDTH, WORLD_MAP_UI.CLOSE_BUTTON_BORDER_COLOR, WORLD_MAP_UI.CLOSE_BUTTON_BORDER_ALPHA)
    closeButton.setScrollFactor(0).setDepth(WORLD_MAP_UI.CLOSE_BUTTON_DEPTH).setInteractive()
    if (closeButton.input) closeButton.input.cursor = 'pointer'
    closeButton.on(Phaser.Input.Events.POINTER_DOWN, () => this.close())

    const closeText = this.add.text(WORLD_MAP_UI.CLOSE_BUTTON_X, WORLD_MAP_UI.CLOSE_BUTTON_Y, WORLD_MAP_UI.CLOSE_BUTTON_TEXT, {
      fontSize: `${WORLD_MAP_UI.CLOSE_BUTTON_FONT_SIZE}px`,
      color: WORLD_MAP_UI.CLOSE_BUTTON_TEXT_COLOR,
      fontFamily: WORLD_MAP_UI.HINT_FONT_FAMILY,
    })
    closeText.setOrigin(0.5).setScrollFactor(0).setDepth(WORLD_MAP_UI.CLOSE_BUTTON_DEPTH + WORLD_MAP_UI.CLOSE_BUTTON_TEXT_DEPTH_OFFSET)
    bindTouchText(closeText, () => this.close())

    this.renderCurrentLocation()

    this.input.keyboard!.on('keydown', this.handleKeydown)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown', this.handleKeydown)
    })
  }

  override update(): void {
    const input = InputManager.getInstance()
    const actions = this.gamepadNavigation.poll(this.input.gamepad, input.isGamepadEnabled())
    for (const action of actions) this.handleGamepadAction(action)
  }

  private handleGamepadAction(action: GamepadNavigationAction): void {
    if (action === 'confirm' || action === 'cancel' || action === 'menu') this.close()
  }

  private renderCurrentLocation(): void {
    const gd = GameData.getInstance()
    const mapId = gd.currentMap
    const mapName = GAME_CONFIG_DATABASE.getTable('maps')[mapId]?.name ?? mapId
    const label = this.add.text(GAME_WIDTH / 2, WORLD_MAP_UI.LOCATION_LABEL_Y, `当前位置：${mapName}`, {
      fontSize: `${WORLD_MAP_UI.LOCATION_LABEL_FONT_SIZE}px`,
      color: WORLD_MAP_UI.LOCATION_LABEL_COLOR,
      fontFamily: WORLD_MAP_UI.LOCATION_LABEL_FONT_FAMILY,
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
    pin.lineStyle(WORLD_MAP_UI.LOCATION_PIN_STROKE_WIDTH, WORLD_MAP_UI.LOCATION_PIN_STROKE_COLOR, WORLD_MAP_UI.LOCATION_PIN_STROKE_ALPHA)
    pin.strokeCircle(0, 0, WORLD_MAP_UI.LOCATION_PIN_SIZE)
    pin.setScrollFactor(0).setDepth(WORLD_MAP_UI.LOCATION_MARKER_DEPTH)
  }

  private close(): void {
    if (this.closing) return
    this.closing = true
    AudioManager.getInstance().playSFX('close_menu')
    EventBus.emit(GameEvents.MENU_CLOSE)
    this.scene.stop()
  }
}
