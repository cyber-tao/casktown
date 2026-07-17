import { describe, expect, test } from 'bun:test'
import {
  advanceBattleTurn,
  advanceBreakGauge,
  canGainBreakGauge,
  canEscapeBattle,
  canUseBattleSkill,
  hasCompletedSurvivalRounds,
  resolveBreakGaugeGain,
  resolveEncounterPartyIds,
  resolveEnemyElementalDamageModifier,
  resolveLimitedSkillTargets,
  shouldEvadeBattleAttack,
  shouldGrantExtraTurnOnKill,
} from '../../src/utils/battleRules.ts'

describe('battle rules', () => {
  test('uses T alone for authored solo encounters', () => {
    const party = ['T', 'HUIHUI', 'A', 'CONGCONG']

    expect(resolveEncounterPartyIds(party, 'BTL_310')).toEqual(['T'])
    expect(resolveEncounterPartyIds(party, 'BTL_530')).toEqual(['T'])
    expect(resolveEncounterPartyIds(party, 'BTL_XIAOAI_TRUE')).toEqual(['T'])
    expect(resolveEncounterPartyIds(party, 'BTL_520')).toEqual(party)
  })

  test('completes survival trials only after whole required rounds', () => {
    expect(hasCompletedSurvivalRounds(1, 2)).toBe(false)
    expect(hasCompletedSurvivalRounds(2, 2)).toBe(true)
    expect(hasCompletedSurvivalRounds(3, 2)).toBe(true)
  })
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

  test('selects a primary target plus the next distinct target', () => {
    const enemies = ['A', 'B', 'C']

    expect(resolveLimitedSkillTargets('B', enemies, 2)).toEqual(['B', 'C'])
    expect(resolveLimitedSkillTargets('C', enemies, 2)).toEqual(['C', 'A'])
    expect(resolveLimitedSkillTargets('A', ['A'], 2)).toEqual(['A'])
    expect(resolveLimitedSkillTargets('A', enemies)).toEqual(['A'])
  })

  test('applies the authored evasion threshold only while the buff is active', () => {
    expect(shouldEvadeBattleAttack(true, 0.399)).toBe(true)
    expect(shouldEvadeBattleAttack(true, 0.4)).toBe(false)
    expect(shouldEvadeBattleAttack(false, 0)).toBe(false)
  })

  test('increases break gauge gain by twenty percent against exposed weakness', () => {
    expect(resolveBreakGaugeGain(10, true)).toBe(12)
    expect(resolveBreakGaugeGain(15, true)).toBe(18)
    expect(resolveBreakGaugeGain(25, true)).toBe(30)
    expect(resolveBreakGaugeGain(15, false)).toBe(15)
  })

  test('grants another action only when a marked skill defeats a non-final enemy', () => {
    const skill = { grantsExtraTurnOnKill: true }

    expect(shouldGrantExtraTurnOnKill(skill, 2, 1)).toBe(true)
    expect(shouldGrantExtraTurnOnKill(skill, 1, 0)).toBe(false)
    expect(shouldGrantExtraTurnOnKill(skill, 2, 2)).toBe(false)
    expect(shouldGrantExtraTurnOnKill({}, 2, 1)).toBe(false)
  })
})
