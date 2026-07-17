import {
  STORY_SKILL_UNLOCK_FLAGS,
  TRUE_ENDING_SUPPORT_CHARACTER_ID,
  TRUE_ROUTE_MIN_XIAOAI_MEMORY_FRAGMENTS,
} from '../utils/constants'

export type ComboUnlockCondition =
  | { type: 'flag'; value: string }
  | { type: 'flagMinimum'; value: string; threshold: number }

export interface ComboDefinition {
  skillId: string
  char1: string
  char2: string
  unlockCharacterId: string
  unlockCondition: ComboUnlockCondition
}

export const COMBO_DEFINITIONS: readonly ComboDefinition[] = [
  { skillId: 'fengleisanhua', char1: 'HUIHUI', char2: 'CONGCONG', unlockCharacterId: 'HUIHUI', unlockCondition: { type: 'flag', value: 'congcong_joined' } },
  { skillId: 'shouxiangshuangji', char1: 'T', char2: 'A', unlockCharacterId: 'T', unlockCondition: { type: 'flag', value: 'defeated_baihu' } },
  { skillId: 'yuexiahuixuan', char1: 'HUIHUI', char2: 'T', unlockCharacterId: 'T', unlockCondition: { type: 'flag', value: STORY_SKILL_UNLOCK_FLAGS.YUEXIAHUIXUAN } },
  { skillId: 'shendunzhen', char1: 'A', char2: 'SUN', unlockCharacterId: 'A', unlockCondition: { type: 'flag', value: 'has_millennium_seed' } },
  { skillId: 'yuyanzhiren', char1: 'T', char2: 'SUN', unlockCharacterId: 'T', unlockCondition: { type: 'flag', value: 'temple_visited' } },
  { skillId: 'fengyuezhixi', char1: 'T', char2: TRUE_ENDING_SUPPORT_CHARACTER_ID, unlockCharacterId: 'T', unlockCondition: { type: 'flagMinimum', value: 'xiaoai_memory_fragments', threshold: TRUE_ROUTE_MIN_XIAOAI_MEMORY_FRAGMENTS } },
] as const

export const COMBO_SKILL_IDS: ReadonlySet<string> = new Set(COMBO_DEFINITIONS.map(definition => definition.skillId))
