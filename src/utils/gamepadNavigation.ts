import { GAMEPAD_INPUT } from './constants'

export type GamepadNavigationDirection = 'up' | 'down' | 'left' | 'right'
export type GamepadNavigationAction = GamepadNavigationDirection | 'confirm' | 'cancel' | 'menu'

interface GamepadButtonLike {
  pressed?: boolean
}

export interface NavigationGamepadLike {
  A?: boolean | GamepadButtonLike
  B?: boolean | GamepadButtonLike
  up?: boolean | GamepadButtonLike
  down?: boolean | GamepadButtonLike
  left?: boolean | GamepadButtonLike
  right?: boolean | GamepadButtonLike
  leftStick?: { x?: number; y?: number }
  buttons?: readonly GamepadButtonLike[]
}

export interface GamepadPluginLike {
  total: number
  getPad(index: number): NavigationGamepadLike | null
}

interface GamepadNavigationSnapshot {
  direction: GamepadNavigationDirection | null
  confirm: boolean
  cancel: boolean
  menu: boolean
}

const NEUTRAL_SNAPSHOT: GamepadNavigationSnapshot = {
  direction: null,
  confirm: false,
  cancel: false,
  menu: false,
}

function isPressed(value: boolean | GamepadButtonLike | undefined): boolean {
  return typeof value === 'boolean' ? value : value?.pressed === true
}

function getDirection(pad: NavigationGamepadLike): GamepadNavigationDirection | null {
  const dpadX = Number(isPressed(pad.right)) - Number(isPressed(pad.left))
  const dpadY = Number(isPressed(pad.down)) - Number(isPressed(pad.up))
  if (dpadX !== 0 || dpadY !== 0) {
    if (Math.abs(dpadY) >= Math.abs(dpadX)) return dpadY < 0 ? 'up' : 'down'
    return dpadX < 0 ? 'left' : 'right'
  }

  const axisX = Number.isFinite(pad.leftStick?.x) ? pad.leftStick?.x ?? 0 : 0
  const axisY = Number.isFinite(pad.leftStick?.y) ? pad.leftStick?.y ?? 0 : 0
  if (Math.max(Math.abs(axisX), Math.abs(axisY)) < GAMEPAD_INPUT.AXIS_ACTIVATION_THRESHOLD) return null
  if (Math.abs(axisY) >= Math.abs(axisX)) return axisY < 0 ? 'up' : 'down'
  return axisX < 0 ? 'left' : 'right'
}

function readSnapshot(pad: NavigationGamepadLike): GamepadNavigationSnapshot {
  return {
    direction: getDirection(pad),
    confirm: isPressed(pad.A),
    cancel: isPressed(pad.B),
    menu: pad.buttons?.[GAMEPAD_INPUT.START_BUTTON_INDEX]?.pressed === true,
  }
}

export class GamepadNavigationController {
  private initialized = false
  private previous: GamepadNavigationSnapshot = { ...NEUTRAL_SNAPSHOT }

  reset(): void {
    this.initialized = false
    this.previous = { ...NEUTRAL_SNAPSHOT }
  }

  poll(plugin: GamepadPluginLike | null | undefined, enabled: boolean): GamepadNavigationAction[] {
    if (!enabled || !plugin || plugin.total === 0) {
      this.reset()
      return []
    }

    const pad = plugin.getPad(0)
    if (!pad) {
      this.reset()
      return []
    }

    const current = readSnapshot(pad)
    if (!this.initialized) {
      this.initialized = true
      this.previous = current
      return []
    }

    const actions: GamepadNavigationAction[] = []
    if (current.direction && current.direction !== this.previous.direction) actions.push(current.direction)
    if (current.confirm && !this.previous.confirm) actions.push('confirm')
    else if (current.cancel && !this.previous.cancel) actions.push('cancel')
    else if (current.menu && !this.previous.menu) actions.push('menu')
    this.previous = current
    return actions
  }
}
