import { describe, expect, test } from 'bun:test'
import { GamepadNavigationController, type NavigationGamepadLike } from '../../src/utils/gamepadNavigation.ts'

function createPlugin(pad: NavigationGamepadLike | null): {
  total: number
  getPad: () => NavigationGamepadLike | null
} {
  return {
    total: pad ? 1 : 0,
    getPad: () => pad,
  }
}

describe('GamepadNavigationController', () => {
  test('latches held controls on the first scene frame to prevent carry-over actions', () => {
    const navigation = new GamepadNavigationController()
    const pad: NavigationGamepadLike = { A: true, down: true }
    const plugin = createPlugin(pad)

    expect(navigation.poll(plugin, true)).toEqual([])
    expect(navigation.poll(plugin, true)).toEqual([])

    pad.A = false
    pad.down = false
    expect(navigation.poll(plugin, true)).toEqual([])

    pad.A = true
    expect(navigation.poll(plugin, true)).toEqual(['confirm'])
  })

  test('emits one directional action per d-pad or stick transition', () => {
    const navigation = new GamepadNavigationController()
    const pad: NavigationGamepadLike = {}
    const plugin = createPlugin(pad)

    expect(navigation.poll(plugin, true)).toEqual([])
    pad.up = true
    expect(navigation.poll(plugin, true)).toEqual(['up'])
    expect(navigation.poll(plugin, true)).toEqual([])

    pad.up = false
    pad.leftStick = { x: 0.8, y: 0.2 }
    expect(navigation.poll(plugin, true)).toEqual(['right'])
    pad.leftStick = { x: 0, y: 0 }
    expect(navigation.poll(plugin, true)).toEqual([])
    pad.leftStick = { x: 0.2, y: -0.8 }
    expect(navigation.poll(plugin, true)).toEqual(['up'])
  })

  test('maps A, B, and Start to semantic edge actions', () => {
    const navigation = new GamepadNavigationController()
    const buttons = Array.from({ length: 10 }, () => ({ pressed: false }))
    const pad: NavigationGamepadLike = { buttons }
    const plugin = createPlugin(pad)

    navigation.poll(plugin, true)
    pad.A = true
    expect(navigation.poll(plugin, true)).toEqual(['confirm'])
    expect(navigation.poll(plugin, true)).toEqual([])

    pad.A = false
    navigation.poll(plugin, true)
    pad.B = { pressed: true }
    expect(navigation.poll(plugin, true)).toEqual(['cancel'])

    pad.B = false
    navigation.poll(plugin, true)
    buttons[9]!.pressed = true
    expect(navigation.poll(plugin, true)).toEqual(['menu'])
  })

  test('resets while disabled or disconnected before accepting input again', () => {
    const navigation = new GamepadNavigationController()
    const pad: NavigationGamepadLike = {}
    const plugin = createPlugin(pad)

    navigation.poll(plugin, true)
    pad.A = true
    expect(navigation.poll(plugin, false)).toEqual([])
    expect(navigation.poll(plugin, true)).toEqual([])
    pad.A = false
    navigation.poll(plugin, true)
    pad.A = true
    expect(navigation.poll(plugin, true)).toEqual(['confirm'])

    expect(navigation.poll(createPlugin(null), true)).toEqual([])
    expect(navigation.poll(plugin, true)).toEqual([])
  })
})
