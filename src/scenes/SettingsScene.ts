import Phaser from 'phaser'
import { GameData } from '../core/GameData'
import { AudioManager } from '../core/AudioManager'
import { EventBus, GameEvents } from '../core/EventBus'
import { InputManager } from '../core/InputManager'
import { GAME_WIDTH, GAME_HEIGHT, TEXT_SPEED, BATTLE_SPEED, SETTINGS_PANEL, scalePx } from '../utils/constants'
import { bindTouchText } from '../utils/touch'

interface SettingOption {
  label: string
  key: string
  type: 'select' | 'slider' | 'toggle'
  options?: string[]
  min?: number
  max?: number
  step?: number
}

const SETTINGS_CONFIG: SettingOption[] = [
  { label: '文字速度', key: 'textSpeed', type: 'select', options: ['slow', 'normal', 'fast', 'instant'] },
  { label: '战斗速度', key: 'battleSpeed', type: 'select', options: ['normal', 'fast', 'fastest'] },
  { label: '巡逻怪物', key: 'encounterRate', type: 'select', options: ['default', 'reduced', 'none'] },
  { label: '战斗难度', key: 'difficulty', type: 'select', options: ['story', 'standard', 'hard'] },
  { label: '预言提示', key: 'prophecyHint', type: 'select', options: ['poem', 'light', 'clear'] },
  { label: '主音量', key: 'masterVolume', type: 'slider', min: 0, max: 1, step: 0.1 },
  { label: '音乐音量', key: 'musicVolume', type: 'slider', min: 0, max: 1, step: 0.1 },
  { label: '音效音量', key: 'sfxVolume', type: 'slider', min: 0, max: 1, step: 0.1 },
  { label: '语音音量', key: 'uiVolume', type: 'slider', min: 0, max: 1, step: 0.1 },
  { label: '像素锐化', key: 'pixelSharp', type: 'toggle' },
  { label: '全屏模式', key: 'fullscreen', type: 'toggle' },
  { label: '操作模式', key: 'controlMode', type: 'select', options: ['arrows', 'wasd'] },
  { label: '手柄', key: 'gamepad', type: 'toggle' },
  { label: '重置按键', key: 'resetKeys', type: 'select', options: ['keep', 'reset'] },
]

const OPTION_LABELS: Record<string, Record<string, string>> = {
  textSpeed: { slow: '慢', normal: '中', fast: '快', instant: '立即' },
  battleSpeed: { normal: '1x', fast: '1.5x', fastest: '2x' },
  encounterRate: { default: '默认', reduced: '降低', none: '关闭' },
  difficulty: { story: '故事', standard: '标准', hard: '困难' },
  prophecyHint: { poem: '原诗', light: '轻提示', clear: '明确目标' },
  controlMode: { arrows: '方向键', wasd: 'WASD' },
  resetKeys: { keep: '--', reset: '确认重置?' },
}

export class SettingsScene extends Phaser.Scene {
  private menuIndex = 0
  private menuItems: Phaser.GameObjects.Container[] = []
  private cursor!: Phaser.GameObjects.Rectangle
  private returnTo: string = 'TitleScene'
  private overlay!: Phaser.GameObjects.Rectangle
  private panel!: Phaser.GameObjects.Rectangle

  constructor() {
    super({ key: 'SettingsScene', active: false })
  }

  create(data: { returnTo?: string }): void {
    this.returnTo = data.returnTo || 'TitleScene'
    this.menuIndex = 0
    this.menuItems = []

    this.createBackground()
    this.createSettingsUI()
    this.setupInput()

    this.cameras.main.fadeIn(300)
  }

  private createBackground(): void {
    this.overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, SETTINGS_PANEL.overlayAlpha)
    this.overlay.setScrollFactor(0)
    this.overlay.setDepth(500)

    this.panel = this.add.rectangle(SETTINGS_PANEL.x, SETTINGS_PANEL.y, SETTINGS_PANEL.width, SETTINGS_PANEL.height, 0x2a2a3e, SETTINGS_PANEL.alpha)
    this.panel.setStrokeStyle(SETTINGS_PANEL.strokeWidth, 0x5a5a7e)
    this.panel.setScrollFactor(0)
    this.panel.setDepth(501)

    this.add.text(GAME_WIDTH / 2, SETTINGS_PANEL.titleY, '设置', {
      fontSize: `${SETTINGS_PANEL.titleFontSize}px`,
      color: '#f1c40f',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(502)
  }

  private createSettingsUI(): void {
    const gd = GameData.getInstance()

    for (let i = 0; i < SETTINGS_CONFIG.length; i++) {
      const config = SETTINGS_CONFIG[i]!
      const container = this.add.container(SETTINGS_PANEL.rowX, SETTINGS_PANEL.rowStartY + i * SETTINGS_PANEL.rowHeight)
      container.setDepth(502)
      container.setScrollFactor(0)

      const label = this.add.text(0, 0, config.label, {
        fontSize: `${SETTINGS_PANEL.labelFontSize}px`,
        color: '#c0c0d0',
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

    const backContainer = this.add.container(SETTINGS_PANEL.rowX, SETTINGS_PANEL.rowStartY + SETTINGS_CONFIG.length * SETTINGS_PANEL.rowHeight + SETTINGS_PANEL.backOffsetY)
    backContainer.setDepth(502)
    backContainer.setScrollFactor(0)
    const backText = this.add.text(0, 0, '返回', { fontSize: `${SETTINGS_PANEL.backFontSize}px`, color: '#e74c3c' })
    backText.setDepth(502)
    bindTouchText(backText, () => this.selectTouchMenuItem(SETTINGS_CONFIG.length))
    backContainer.add(backText)
    this.menuItems.push(backContainer)

    this.cursor = this.add.rectangle(SETTINGS_PANEL.cursorX, SETTINGS_PANEL.rowStartY + SETTINGS_PANEL.cursorOffsetY, SETTINGS_PANEL.cursorSize, SETTINGS_PANEL.cursorSize, 0xf1c40f)
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
        const labels = OPTION_LABELS[config.key]
        displayText = labels?.[value as string] || (value as string)
      } else if (config.type === 'slider') {
        displayText = `${Math.round((value as number) * 100)}%`
      } else if (config.type === 'toggle') {
        displayText = value ? '开' : '关'
      }
    }

    return this.add.text(0, 0, displayText, {
      fontSize: `${SETTINGS_PANEL.valueFontSize}px`,
      color: '#e8e8f0',
    })
  }

  private updateValueText(index: number): void {
    const gd = GameData.getInstance()
    const config = SETTINGS_CONFIG[index]
    if (!config) return

    const container = this.menuItems[index]
    if (!container) return

    const oldText = container.list.find(c => c instanceof Phaser.GameObjects.Text && c.x > scalePx(100)) as Phaser.GameObjects.Text
    if (oldText) {
      const newText = this.createValueText(config, gd)
      newText.setX(oldText.x)
      newText.setY(oldText.y)
      newText.setDepth(502)
      container.remove(oldText)
      oldText.destroy()
      container.add(newText)
    }
  }

  private setupInput(): void {
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
    if (this.menuIndex >= SETTINGS_CONFIG.length) return

    const config = SETTINGS_CONFIG[this.menuIndex]!
    if (config.key === 'controlMode' || config.key === 'gamepad' || config.key === 'resetKeys') return

    const gd = GameData.getInstance()
    const settings = gd.settings as Record<string, unknown>

    if (config.type === 'select' && config.options) {
      const currentIdx = config.options.indexOf(settings[config.key] as string)
      const newIdx = (currentIdx + dir + config.options.length) % config.options.length
      settings[config.key] = config.options[newIdx]!
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
    if (this.menuIndex >= SETTINGS_CONFIG.length) {
      this.goBack()
      return
    }

    const config = SETTINGS_CONFIG[this.menuIndex]!
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

    const config = SETTINGS_CONFIG[this.menuIndex]
    if (config?.type === 'slider') {
      this.changeValue(1)
      return
    }
    this.selectMenu()
  }

  private goBack(): void {
    AudioManager.getInstance().playSFX('cancel')
    this.cameras.main.fadeOut(300)
    this.time.delayedCall(300, () => {
      if (this.returnTo === 'MenuOverlay') {
        this.scene.resume('MenuOverlay')
      } else {
        EventBus.emit(GameEvents.MENU_CLOSE)
        this.scene.resume(this.returnTo)
      }
      this.scene.stop()
    })
  }
}
