import type { ComboDefinition } from '../data/combos'
import { COMBO_SKILL_IDS } from '../data/combos'
import { COMBO_TP_COST } from './constants'

export function isComboSkillId(skillId: string): boolean {
  return COMBO_SKILL_IDS.has(skillId)
}

export function isComboUnlocked(
  definition: ComboDefinition,
  readSkills: (characterId: string) => readonly string[] | undefined,
): boolean {
  return readSkills(definition.unlockCharacterId)?.includes(definition.skillId) === true
}

export function canUseComboAtTp(firstTp: number, secondTp: number): boolean {
  return firstTp >= COMBO_TP_COST && secondTp >= COMBO_TP_COST
}

export function shouldQueueComboTurnSkip(currentTurnIndex: number, unitTurnIndex: number): boolean {
  return unitTurnIndex > currentTurnIndex
}
