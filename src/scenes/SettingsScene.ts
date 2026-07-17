import Phaser from 'phaser'
import { GameData } from '../core/GameData'
import { AudioManager } from '../core/AudioManager'
import { EventBus, GameEvents } from '../core/EventBus'
import { InputManager } from '../core/InputManager'
import { queueImageAssets } from '../core/AssetLoader'
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  MENU_OVERLAY_UI,
  MENU_SETTINGS_OPTION_LABELS,
  MENU_SETTINGS_OPTIONS,
  TEXT_SPEED,
  BATTLE_SPEED,
  RUNTIME_UI_ASSET_KEYS,
  SETTINGS_PANEL,
  UI_FONT_FAMILY,
  UI_TITLE_FONT_FAMILY,
  scalePx,
} from '../utils/constants'
import { bindTouchText } from '../utils/touch'
import { cleanupKeyboardOnShutdown } from '../utils/sceneLifecycle'
import { addRuntimePanel } from '../utils/runtimePanels'
import { GamepadNavigationController, type GamepadNavigationAction } from '../utils/gamepadNavigation'

type SettingOption = typeof MENU_SETTINGS_OPTIONS[number]

export class SettingsScene extends Phaser.Scene {
  private menuIndex = 0
  private menuItems: Phaser.GameObjects.Container[] = []
  private cursor!: Phaser.GameObjects.Rectangle
  private returnTo: string = 'TitleScene'
  private overlay!: Phaser.GameObjects.Rectangle
  private panel!: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image
  private closing = false
  private gamepadNavigation = new GamepadNavigationController()

  constructor() {
    super({ key: 'SettingsScene', active: false })
  }

  preload(): void {
    queueImageAssets(this, Object.values(RUNTIME_UI_ASSET_KEYS))
  }

  create(data: { returnTo?: string }): void {
    this.returnTo = data.returnTo || 'TitleScene'
    this.menuIndex = 0
    this.menuItems = []
    this.closing = false
    this.gamepadNavigation.reset()

    this.createBackground()
    this.createSettingsUI()
    this.setupInput()

    this.cameras.main.fadeIn(SETTINGS_PANEL.fadeMs)
  }

  override update(): void {
    const input = InputManager.getInstance()
    const actions = this.gamepadNavigation.poll(this.input.gamepad, input.isGamepadEnabled())
    for (const action of actions) this.handleGamepadAction(action)
  }

  private handleGamepadAction(action: GamepadNavigationAction): void {
    if (action === 'up') {
      this.moveMenu(-1)
      return
    }
    if (action === 'down') {
      this.moveMenu(1)
      return
    }
    if (action === 'left') {
      this.changeValue(-1)
      return
    }
    if (action === 'right') {
      this.changeValue(1)
      return
    }
    if (action === 'confirm') {
      this.selectMenu()
      return
    }
    if (action === 'cancel' || action === 'menu') this.goBack()
  }

  private createBackground(): void {
    this.overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, SETTINGS_PANEL.overlayColor, SETTINGS_PANEL.overlayAlpha)
    this.overlay.setScrollFactor(0)
    this.overlay.setDepth(500)

    this.panel = addRuntimePanel(this, SETTINGS_PANEL.x, SETTINGS_PANEL.y, SETTINGS_PANEL.width, SETTINGS_PANEL.height, RUNTIME_UI_ASSET_KEYS.MENU_PANEL, SETTINGS_PANEL.fallbackColor, SETTINGS_PANEL.alpha, 501)
    if (this.panel instanceof Phaser.GameObjects.Rectangle) {
      this.panel.setStrokeStyle(SETTINGS_PANEL.strokeWidth, SETTINGS_PANEL.borderColor)
    }

    this.add.text(SETTINGS_PANEL.titleX, SETTINGS_PANEL.titleY, '设置', {
      fontSize: `${SETTINGS_PANEL.titleFontSize}px`,
      color: MENU_OVERLAY_UI.COLORS.title,
      fontFamily: UI_TITLE_FONT_FAMILY,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(503)
  }

  private createSettingsUI(): void {
    const gd = GameData.getInstance()

    for (let i = 0; i < MENU_SETTINGS_OPTIONS.length; i++) {
      const config = MENU_SETTINGS_OPTIONS[i]!
      const container = this.add.container(SETTINGS_PANEL.rowX, SETTINGS_PANEL.rowStartY + i * SETTINGS_PANEL.rowHeight)
      container.setDepth(502)
      container.setScrollFactor(0)

      const label = this.add.text(0, 0, config.label, {
        fontSize: `${SETTINGS_PANEL.labelFontSize}px`,
        color: MENU_OVERLAY_UI.COLORS.text,
        fontFamily: UI_FONT_FAMILY,
      }).setDepth(502)
      bindTouchText(label, () => this.selectTouchMenuItem(i))
      container.add(label)

      const valueText = this.createValueText(config, gd)
      valueText.setX(SETTINGS_PANEL.valueX)
      valueText.setDepth(502)
      bindTouchText(valueText, () => this.selectTouchMenuItem(i))
      container.add(valueText)

      this.menuItems.push(container)
    }

    const backContainer = this.add.container(SETTINGS_PANEL.rowX, SETTINGS_PANEL.rowStartY + MENU_SETTINGS_OPTIONS.length * SETTINGS_PANEL.rowHeight + SETTINGS_PANEL.backOffsetY)
    backContainer.setDepth(502)
    backContainer.setScrollFactor(0)
    const backText = this.add.text(0, 0, '返回', { fontSize: `${SETTINGS_PANEL.backFontSize}px`, color: MENU_OVERLAY_UI.COLORS.danger, fontFamily: UI_FONT_FAMILY })
    backText.setDepth(502)
    bindTouchText(backText, () => this.selectTouchMenuItem(MENU_SETTINGS_OPTIONS.length))
    backContainer.add(backText)
    this.menuItems.push(backContainer)

    this.cursor = this.add.rectangle(SETTINGS_PANEL.cursorX, SETTINGS_PANEL.rowStartY + SETTINGS_PANEL.cursorOffsetY, SETTINGS_PANEL.cursorSize, SETTINGS_PANEL.cursorSize, SETTINGS_PANEL.cursorColor)
    this.cursor.setDepth(503)
    this.cursor.setScrollFactor(0)
  }

  private createValueText(config: SettingOption, gd: GameData): Phaser.GameObjects.Text {
    let displayText = ''

    if (config.key === 'controlMode') {
      displayText = InputManager.getInstance().isWASDMode() ? 'WASD' : '方向键'
    } else if (config.key === 'gamepad') {
      displayText = InputManager.getInstance().isGamepadEnabled() ? '开' : '关'
    } else if (config.key === 'resetKeys') {
      displayText = '--'
    } else {
      const value = (gd.settings as Record<string, unknown>)[config.key]
      if (config.type === 'select' && config.options) {
        const labels = MENU_SETTINGS_OPTION_LABELS[config.key]
        displayText = labels?.[value as string] || (value as string)
      } else if (config.type === 'slider') {
        displayText = `${Math.round((value as number) * 100)}%`
      } else if (config.type === 'toggle') {
        displayText = value ? '开' : '关'
      }
    }

    return this.add.text(0, 0, displayText, {
      fontSize: `${SETTINGS_PANEL.valueFontSize}px`,
      color: MENU_OVERLAY_UI.COLORS.title,
      fontFamily: UI_FONT_FAMILY,
    })
  }

  private updateValueText(index: number): void {
    const gd = GameData.getInstance()
    const config = MENU_SETTINGS_OPTIONS[index]
    if (!config) return

    const container = this.menuItems[index]
    if (!container) return

    const oldText = container.list.find(c => c instanceof Phaser.GameObjects.Text && c.x > scalePx(100)) as Phaser.GameObjects.Text
    if (oldText) {
      const newText = this.createValueText(config, gd)
      newText.setX(oldText.x)
      newText.setY(oldText.y)
      newText.setDepth(502)
      bindTouchText(newText, () => this.selectTouchMenuItem(index))
      container.remove(oldText)
      oldText.destroy()
      container.add(newText)
    }
  }

  private setupInput(): void {
    cleanupKeyboardOnShutdown(this)
    this.input.keyboard?.on('keydown-UP', () => this.moveMenu(-1))
    this.input.keyboard?.on('keydown-DOWN', () => this.moveMenu(1))
    this.input.keyboard?.on('keydown-LEFT', () => this.changeValue(-1))
    this.input.keyboard?.on('keydown-RIGHT', () => this.changeValue(1))
    this.input.keyboard?.on('keydown-ENTER', () => this.selectMenu())
    this.input.keyboard?.on('keydown-SPACE', () => this.selectMenu())
    this.input.keyboard?.on('keydown-ESC', () => this.goBack())
  }

  private moveMenu(dir: number): void {
    AudioManager.getInstance().playSFX('cursor')
    this.menuIndex = (this.menuIndex + dir + this.menuItems.length) % this.menuItems.length
    const target = this.menuItems[this.menuIndex]!
    this.cursor.setY(target.y + SETTINGS_PANEL.cursorOffsetY)
  }

  private changeValue(dir: number): void {
    if (this.menuIndex >= MENU_SETTINGS_OPTIONS.length) return

    const config = MENU_SETTINGS_OPTIONS[this.menuIndex]!
    if (config.key === 'controlMode' || config.key === 'gamepad' || config.key === 'resetKeys') return

    const gd = GameData.getInstance()
    const settings = gd.settings as Record<string, unknown>

    if (config.type === 'select' && config.options) {
      const options = config.options as readonly string[]
      const currentIdx = options.indexOf(settings[config.key] as string)
      const newIdx = (currentIdx + dir + options.length) % options.length
      settings[config.key] = options[newIdx]!
      this.updateValueText(this.menuIndex)
      AudioManager.getInstance().playSFX('cursor')
    } else if (config.type === 'slider') {
      const current = settings[config.key] as number
      const step = config.step || 0.1
      const newValue = Math.max(config.min || 0, Math.min(config.max || 1, current + dir * step))
      settings[config.key] = Math.round(newValue * 10) / 10
      this.updateValueText(this.menuIndex)
      AudioManager.getInstance().updateVolume()
      AudioManager.getInstance().playSFX('cursor')
    }
  }

  private selectMenu(): void {
    if (this.menuIndex >= MENU_SETTINGS_OPTIONS.length) {
      this.goBack()
      return
    }

    const config = MENU_SETTINGS_OPTIONS[this.menuIndex]!
    const gd = GameData.getInstance()
    const settings = gd.settings as Record<string, unknown>

    if (config.key === 'controlMode') {
      const im = InputManager.getInstance()
      if (im.isWASDMode()) {
        im.resetToDefault()
      } else {
        im.setWASD()
      }
      this.updateValueText(this.menuIndex)
      AudioManager.getInstance().playSFX('confirm')
    } else if (config.key === 'gamepad') {
      const im = InputManager.getInstance()
      im.setGamepadEnabled(!im.isGamepadEnabled())
      this.updateValueText(this.menuIndex)
      AudioManager.getInstance().playSFX('confirm')
    } else if (config.key === 'resetKeys') {
      InputManager.getInstance().resetToDefault()
      this.updateValueText(this.menuIndex)
      AudioManager.getInstance().playSFX('confirm')
    } else if (config.type === 'toggle') {
      settings[config.key] = !settings[config.key]
      this.updateValueText(this.menuIndex)
      AudioManager.getInstance().playSFX('confirm')

      if (config.key === 'fullscreen') {
        if (settings[config.key]) {
          this.scale.startFullscreen()
        } else {
          this.scale.stopFullscreen()
        }
      }
    } else if (config.type === 'select') {
      this.changeValue(1)
    }
  }

  private selectTouchMenuItem(index: number): void {
    if (index < 0 || index >= this.menuItems.length) return
    const cursorOffsetY = this.cursor.y - this.menuItems[this.menuIndex]!.y
    this.menuIndex = index
    const target = this.menuItems[this.menuIndex]!
    this.cursor.setY(target.y + cursorOffsetY)

    const config = MENU_SETTINGS_OPTIONS[this.menuIndex]
    if (config?.type === 'slider') {
      this.changeValue(1)
      return
    }
    this.selectMenu()
  }

  private goBack(): void {
    if (this.closing) return
    this.closing = true
    AudioManager.getInstance().playSFX('cancel')
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      if (this.returnTo === 'MenuOverlay') {
        this.scene.resume('MenuOverlay')
      } else {
        EventBus.emit(GameEvents.MENU_CLOSE)
        this.scene.resume(this.returnTo)
      }
      this.scene.stop()
    })
    this.cameras.main.fadeOut(SETTINGS_PANEL.fadeMs)
  }
}
