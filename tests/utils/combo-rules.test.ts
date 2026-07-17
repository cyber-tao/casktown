import { describe, expect, test } from 'bun:test'
import { COMBO_DEFINITIONS } from '../../src/data/combos.ts'
import { isComboSkillId, isComboUnlocked } from '../../src/utils/comboRules.ts'

describe('combo rules', () => {
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
