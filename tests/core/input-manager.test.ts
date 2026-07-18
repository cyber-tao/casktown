import { beforeEach, describe, expect, test } from 'bun:test'
import { GameData } from '../../src/core/GameData.ts'
import { InputManager, toPhaserKeyName } from '../../src/core/InputManager.ts'

describe('InputManager', () => {
  const input = InputManager.getInstance()

  beforeEach(() => {
    GameData.getInstance().reset()
    input.syncFromGameData()
  })

  test('keeps GDD keyboard fallback controls available across presets', () => {
    expect(input.isDirection('ArrowUp')).toBe('up')
    expect(input.isDirection('KeyW')).toBe('up')
    expect(input.isConfirm('Enter')).toBe(true)
    expect(input.isConfirm('Space')).toBe(true)
    expect(input.isConfirm('KeyE')).toBe(true)

    input.setWASD()

    expect(input.isDirection('KeyW')).toBe('up')
    expect(input.isDirection('ArrowUp')).toBe('up')
    expect(input.isConfirm('Space')).toBe(true)
    expect(input.isConfirm('Enter')).toBe(true)
  })

  test('enables gamepad navigation on a cold start and preserves an explicit opt-out', () => {
    expect(input.isGamepadEnabled()).toBe(true)

    input.setGamepadEnabled(false)
    expect(GameData.getInstance().settings.gamepad).toBe(false)
    input.syncFromGameData()
    expect(input.isGamepadEnabled()).toBe(false)
  })

  test('uses configured bindings alongside authored fallback keys', () => {
    input.setBindings({ up: 'KeyI', confirm: 'KeyE', cancel: 'Backspace' })

    expect(input.isDirection('KeyI')).toBe('up')
    expect(input.isDirection('ArrowUp')).toBe('up')
    expect(input.isConfirm('KeyE')).toBe(true)
    expect(input.isConfirm('Space')).toBe(true)
    expect(input.isCancel('Backspace')).toBe(true)
    expect(input.isCancel('Escape')).toBe(true)
    expect(input.isCancel('KeyX')).toBe(true)
  })

  test('keeps custom bindings through a settings-preserving new-game reset', () => {
    const gameData = GameData.getInstance()
    input.setBindings({ up: 'KeyI', confirm: 'KeyE', cancel: 'Backspace' })

    gameData.reset({ preserveSettings: true })
    input.syncFromGameData()

    expect(input.getBindings().up).toBe('KeyI')
    expect(input.getBindings().confirm).toBe('KeyE')
    expect(input.getBindings().cancel).toBe('Backspace')
  })

  test('resolves keyboard input through the same navigation actions as gamepads', () => {
    input.setWASD()

    expect(input.getNavigationAction('KeyW')).toBe('up')
    expect(input.getNavigationAction('KeyS')).toBe('down')
    expect(input.getNavigationAction('KeyA')).toBe('left')
    expect(input.getNavigationAction('KeyD')).toBe('right')
    expect(input.getNavigationAction('Space')).toBe('confirm')
    expect(input.getNavigationAction('Escape')).toBe('cancel')
    expect(input.getNavigationAction('Tab')).toBe('menu')
    expect(input.getNavigationAction('KeyQ')).toBeNull()
  })

  test('translates browser codes at the Phaser polling boundary', () => {
    expect(toPhaserKeyName('ArrowUp')).toBe('UP')
    expect(toPhaserKeyName('KeyW')).toBe('W')
    expect(toPhaserKeyName('Digit7')).toBe('SEVEN')
    expect(toPhaserKeyName('Numpad2')).toBe('NUMPAD_TWO')
    expect(toPhaserKeyName('ShiftLeft')).toBe('SHIFT')
    expect(toPhaserKeyName('IntlYen')).toBeNull()

    input.setBinding('up', 'KeyI')
    expect(input.getPhaserKeyName('up')).toBe('I')
  })
})
