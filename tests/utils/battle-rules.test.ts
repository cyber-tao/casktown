import { describe, expect, test } from 'bun:test'
import {
  advanceBattleTurn,
  advanceBreakGauge,
  canGainBreakGauge,
  canEscapeBattle,
  canUseBattleSkill,
  resolveEnemyElementalDamageModifier,
} from '../../src/utils/battleRules.ts'

describe('battle rules', () => {
  test('prefers authored enemy weakness and resistance over elemental fallback', () => {
    const enemy = { element: 'water', weakness: ['earth'], resistance: ['fire'] }

    expect(resolveEnemyElementalDamageModifier(enemy, 'earth')).toEqual({ multiplier: 1.5, result: 'weak' })
    expect(resolveEnemyElementalDamageModifier(enemy, 'fire')).toEqual({ multiplier: 0.5, result: 'resisted' })
    expect(resolveEnemyElementalDamageModifier(enemy, 'thunder')).toEqual({ multiplier: 1, result: 'neutral' })
  })

  test('uses the global elemental relationship only when no weakness is authored', () => {
    const enemy = { element: 'fire', weakness: [], resistance: [] }

    expect(resolveEnemyElementalDamageModifier(enemy, 'water')).toEqual({ multiplier: 1.5, result: 'weak' })
  })

  test('allows escape from ordinary battles but not bosses or forced survival battles', () => {
    expect(canEscapeBattle([{ isBoss: false }])).toBe(true)
    expect(canEscapeBattle([{ isBoss: true }])).toBe(false)
    expect(canEscapeBattle([{ isBoss: false }], true)).toBe(false)
  })

  test('triggers break when a gauge reaches its threshold', () => {
    expect(advanceBreakGauge(89, 100, 10)).toEqual({ gauge: 99, shouldBreak: false })
    expect(advanceBreakGauge(90, 100, 10)).toEqual({ gauge: 100, shouldBreak: true })
  })

  test('does not apply break gauge to players, defeated enemies, or already broken enemies', () => {
    expect(canGainBreakGauge(false, 1, false)).toBe(true)
    expect(canGainBreakGauge(true, 1, false)).toBe(false)
    expect(canGainBreakGauge(false, 0, false)).toBe(false)
    expect(canGainBreakGauge(false, 1, true)).toBe(false)
  })

  test('counts a completed round only after the final scheduled turn', () => {
    expect(advanceBattleTurn(0, 3, 2)).toEqual({ currentTurn: 1, completedRounds: 2, roundCompleted: false })
    expect(advanceBattleTurn(2, 3, 2)).toEqual({ currentTurn: 0, completedRounds: 3, roundCompleted: true })
  })

  test('checks skill costs against current battle resources', () => {
    const skill = { costMp: 20, costTp: 10 }

    expect(canUseBattleSkill(20, 10, skill)).toBe(true)
    expect(canUseBattleSkill(19, 10, skill)).toBe(false)
  })
})
