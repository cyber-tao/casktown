import type { ComboDefinition } from '../data/combos'
import { COMBO_SKILL_IDS } from '../data/combos'

export function isComboSkillId(skillId: string): boolean {
  return COMBO_SKILL_IDS.has(skillId)
}

export function isComboUnlocked(
  definition: ComboDefinition,
  readSkills: (characterId: string) => readonly string[] | undefined,
): boolean {
  return readSkills(definition.unlockCharacterId)?.includes(definition.skillId) === true
}
