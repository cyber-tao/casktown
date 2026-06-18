import { describe, expect, test } from 'bun:test'
import { getBattleResultFallbackScene } from '../../src/utils/battleResult.ts'

describe('BattleScene result fallback', () => {
  test('returns to map when a standalone battle ends successfully', () => {
    expect(getBattleResultFallbackScene(true, false)).toBe('MapScene')
  })

  test('returns to map when a standalone battle escape succeeds', () => {
    expect(getBattleResultFallbackScene(false, true)).toBe('MapScene')
  })

  test('opens game over when a standalone battle is lost', () => {
    expect(getBattleResultFallbackScene(false, false)).toBe('GameOverScene')
  })
})
