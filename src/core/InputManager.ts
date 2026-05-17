import { GameData } from './GameData'

export interface KeyBindings {
  up: string
  down: string
  left: string
  right: string
  confirm: string
  cancel: string
  menu: string
  dash: string
}

const DEFAULT_BINDINGS: KeyBindings = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  confirm: 'Enter',
  cancel: 'Escape',
  menu: 'Tab',
  dash: 'ShiftLeft',
}

const WASD_BINDINGS: KeyBindings = {
  up: 'KeyW',
  down: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  confirm: 'Space',
  cancel: 'Escape',
  menu: 'Tab',
  dash: 'ShiftLeft',
}

const KEY_DISPLAY_NAMES: Record<string, string> = {
  'ArrowUp': '↑',
  'ArrowDown': '↓',
  'ArrowLeft': '←',
  'ArrowRight': '→',
  'Enter': 'Enter',
  'Space': 'Space',
  'Escape': 'Esc',
  'Tab': 'Tab',
  'ShiftLeft': 'L-Shift',
  'KeyW': 'W',
  'KeyA': 'A',
  'KeyS': 'S',
  'KeyD': 'D',
}

export class InputManager {
  private static instance: InputManager
  private bindings: KeyBindings
  private useGamepad: boolean = false

  static getInstance(): InputManager {
    if (!InputManager.instance) {
      InputManager.instance = new InputManager()
    }
    return InputManager.instance
  }

  private constructor() {
    this.bindings = { ...DEFAULT_BINDINGS }
    this.loadBindings()
  }

  private loadBindings(): void {
    const gd = GameData.getInstance()
    const saved = gd.getFlag('keyBindings')
    if (saved && typeof saved === 'object') {
      Object.assign(this.bindings, saved)
    }
  }

  getBindings(): KeyBindings {
    return { ...this.bindings }
  }

  setBinding(action: keyof KeyBindings, code: string): void {
    this.bindings[action] = code
    this.saveBindings()
  }

  setBindings(bindings: Partial<KeyBindings>): void {
    Object.assign(this.bindings, bindings)
    this.saveBindings()
  }

  resetToDefault(): void {
    this.bindings = { ...DEFAULT_BINDINGS }
    this.saveBindings()
  }

  setWASD(): void {
    this.bindings = { ...WASD_BINDINGS }
    this.saveBindings()
  }

  isWASDMode(): boolean {
    return this.bindings.up === 'KeyW'
  }

  private saveBindings(): void {
    GameData.getInstance().setFlag('keyBindings', { ...this.bindings })
  }

  isConfirm(code: string): boolean {
    return code === this.bindings.confirm || code === 'Space'
  }

  isCancel(code: string): boolean {
    return code === this.bindings.cancel || code === 'Escape'
  }

  isMenu(code: string): boolean {
    return code === this.bindings.menu || code === 'Tab'
  }

  isDirection(code: string): 'up' | 'down' | 'left' | 'right' | null {
    if (code === this.bindings.up || code === 'ArrowUp' || code === 'KeyW') return 'up'
    if (code === this.bindings.down || code === 'ArrowDown' || code === 'KeyS') return 'down'
    if (code === this.bindings.left || code === 'ArrowLeft' || code === 'KeyA') return 'left'
    if (code === this.bindings.right || code === 'ArrowRight' || code === 'KeyD') return 'right'
    return null
  }

  setGamepadEnabled(enabled: boolean): void {
    this.useGamepad = enabled
  }

  isGamepadEnabled(): boolean {
    return this.useGamepad
  }

  getActionName(action: keyof KeyBindings): string {
    const code = this.bindings[action]
    return KEY_DISPLAY_NAMES[code] || code
  }
}
