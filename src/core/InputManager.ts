import { GameData } from './GameData'
import { CONTROL_MODE } from '../utils/constants'

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
  menu: 'Escape',
  dash: 'ShiftLeft',
}

const WASD_BINDINGS: KeyBindings = {
  up: 'KeyW',
  down: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  confirm: 'Space',
  cancel: 'Escape',
  menu: 'Escape',
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
  'ShiftLeft': 'L-Shift',
  'KeyW': 'W',
  'KeyA': 'A',
  'KeyS': 'S',
  'KeyD': 'D',
}

const DOM_CODE_TO_PHASER_KEY_NAME: Record<string, string> = {
  ArrowUp: 'UP',
  ArrowDown: 'DOWN',
  ArrowLeft: 'LEFT',
  ArrowRight: 'RIGHT',
  Enter: 'ENTER',
  Space: 'SPACE',
  Escape: 'ESC',
  Backspace: 'BACKSPACE',
  Tab: 'TAB',
  ShiftLeft: 'SHIFT',
  ShiftRight: 'SHIFT',
  ControlLeft: 'CTRL',
  ControlRight: 'CTRL',
  AltLeft: 'ALT',
  AltRight: 'ALT',
  PageUp: 'PAGE_UP',
  PageDown: 'PAGE_DOWN',
  Home: 'HOME',
  End: 'END',
  Insert: 'INSERT',
  Delete: 'DELETE',
  Semicolon: 'SEMICOLON',
  Equal: 'PLUS',
  Comma: 'COMMA',
  Minus: 'MINUS',
  Period: 'PERIOD',
  Slash: 'FORWARD_SLASH',
  Backslash: 'BACK_SLASH',
  Quote: 'QUOTES',
  Backquote: 'BACKTICK',
  BracketLeft: 'OPEN_BRACKET',
  BracketRight: 'CLOSED_BRACKET',
}

const NUMBER_KEY_NAMES = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'] as const

export function toPhaserKeyName(code: string): string | null {
  const mapped = DOM_CODE_TO_PHASER_KEY_NAME[code]
  if (mapped) return mapped

  const letter = /^Key([A-Z])$/.exec(code)
  if (letter?.[1]) return letter[1]

  const digit = /^Digit([0-9])$/.exec(code)
  if (digit?.[1]) return NUMBER_KEY_NAMES[Number(digit[1])] ?? null

  const numpadDigit = /^Numpad([0-9])$/.exec(code)
  if (numpadDigit?.[1]) {
    const name = NUMBER_KEY_NAMES[Number(numpadDigit[1])]
    return name ? `NUMPAD_${name}` : null
  }

  if (/^F(?:[1-9]|1[0-2])$/.test(code)) return code
  return null
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
    this.bindings = gd.settings.controlMode === CONTROL_MODE.WASD ? { ...WASD_BINDINGS } : { ...DEFAULT_BINDINGS }
    this.useGamepad = gd.settings.gamepad
    const saved = gd.getFlag('keyBindings')
    if (saved && typeof saved === 'object') {
      for (const action of Object.keys(this.bindings) as (keyof KeyBindings)[]) {
        const code = (saved as Partial<KeyBindings>)[action]
        if (typeof code === 'string' && code.length > 0) this.bindings[action] = code
      }
    }
  }

  syncFromGameData(): void {
    this.loadBindings()
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
    GameData.getInstance().settings.controlMode = CONTROL_MODE.ARROWS
    this.saveBindings()
  }

  setWASD(): void {
    this.bindings = { ...WASD_BINDINGS }
    GameData.getInstance().settings.controlMode = CONTROL_MODE.WASD
    this.saveBindings()
  }

  isWASDMode(): boolean {
    return GameData.getInstance().settings.controlMode === CONTROL_MODE.WASD
  }

  private saveBindings(): void {
    GameData.getInstance().setFlag('keyBindings', { ...this.bindings })
  }

  isConfirm(code: string): boolean {
    return code === this.bindings.confirm || code === 'Space' || code === 'Enter' || code === 'KeyE'
  }

  isCancel(code: string): boolean {
    return code === this.bindings.cancel || code === 'Escape' || code === 'KeyX' || code === 'Backspace'
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

  getPhaserKeyName(action: keyof KeyBindings): string {
    return toPhaserKeyName(this.bindings[action]) ?? toPhaserKeyName(DEFAULT_BINDINGS[action])!
  }

  setGamepadEnabled(enabled: boolean): void {
    this.useGamepad = enabled
    GameData.getInstance().settings.gamepad = enabled
  }

  isGamepadEnabled(): boolean {
    return this.useGamepad
  }

  getActionName(action: keyof KeyBindings): string {
    const code = this.bindings[action]
    return KEY_DISPLAY_NAMES[code] || code
  }
}
