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
