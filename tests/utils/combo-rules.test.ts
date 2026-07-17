import { describe, expect, test } from 'bun:test'
import { COMBO_DEFINITIONS } from '../../src/data/combos.ts'
import { canUseComboAtTp, isComboSkillId, isComboUnlocked, shouldQueueComboTurnSkip } from '../../src/utils/comboRules.ts'

describe('combo rules', () => {
  test('requires both partners to have fifty TP', () => {
    expect(canUseComboAtTp(50, 50)).toBe(true)
    expect(canUseComboAtTp(49, 50)).toBe(false)
    expect(canUseComboAtTp(50, 49)).toBe(false)
  })

  test('consumes a partner action only when it is still ahead in the round', () => {
    expect(shouldQueueComboTurnSkip(1, 2)).toBe(true)
    expect(shouldQueueComboTurnSkip(1, 1)).toBe(false)
    expect(shouldQueueComboTurnSkip(2, 1)).toBe(false)
  })
  test('recognizes every configured combo skill', () => {
    for (const definition of COMBO_DEFINITIONS) {
      expect(isComboSkillId(definition.skillId)).toBe(true)
    }
    expect(isComboSkillId('qizhijian')).toBe(false)
  })

  test('uses the unlock character skill list as the single availability source', () => {
    for (const definition of COMBO_DEFINITIONS) {
      expect(isComboUnlocked(definition, () => [])).toBe(false)
      expect(isComboUnlocked(
        definition,
        characterId => characterId === definition.unlockCharacterId ? [definition.skillId] : [],
      )).toBe(true)
    }
  })
})
