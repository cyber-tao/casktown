import type { EnemyData, SkillData } from '../data/types'
import { BATTLE_RULES, BATTLE_SOLO_CHARACTER_ID, BATTLE_SOLO_ENCOUNTER_IDS, ELEMENT_WEAKNESS } from './constants'

const WEAKNESS_DAMAGE_MULTIPLIER = 1.5
const RESISTANCE_DAMAGE_MULTIPLIER = 0.5

export type ElementalHitResult = 'weak' | 'resisted' | 'neutral'

export interface ElementalDamageModifier {
  multiplier: number
  result: ElementalHitResult
}

export const HEART_SHADOW_ENEMY_IDS = {
  T: 'heart_shadow_t',
  HUIHUI: 'heart_shadow_huihui',
  WORRY_CHAIN: 'worry_chain',
  A: 'heart_shadow_a',
  CONGCONG: 'heart_shadow_congcong',
  SUN: 'heart_shadow_sun',
} as const

const HEART_SHADOW_DOPPELGANGER_IDS = [
  HEART_SHADOW_ENEMY_IDS.T,
  HEART_SHADOW_ENEMY_IDS.HUIHUI,
  HEART_SHADOW_ENEMY_IDS.A,
  HEART_SHADOW_ENEMY_IDS.CONGCONG,
  HEART_SHADOW_ENEMY_IDS.SUN,
] as const

export function isHeartShadowDoppelganger(enemyId: string): boolean {
  return (HEART_SHADOW_DOPPELGANGER_IDS as readonly string[]).includes(enemyId)
}

export type RecordedPlayerAction =
  | { type: 'attack' }
  | { type: 'defend' }
  | { type: 'item' }
  | { type: 'skill'; skillId: string }

export type HeartShadowCopyAction =
  | { type: 'attack' }
  | { type: 'defend' }
  | { type: 'skill'; skillId: string }

const HEART_SHADOW_COPY_FALLBACKS: Record<SkillData['type'], string> = {
  attack: 'shadow_blade',
  magic: 'illusion_strike',
  heal: 'heal',
  buff: 'armor_up',
  debuff: 'confuse',
  special: 'copy_party',
}

const HUIHUI_EVASION_COUNTER_SKILLS = ['xiubiao', 'dushebiao', 'huixuanbiao'] as const

export function resolveHeartShadowCopyAction(
  action: RecordedPlayerAction | null,
  skills: Readonly<Record<string, SkillData>>,
): HeartShadowCopyAction {
  if (!action || action.type === 'attack') return { type: 'attack' }
  if (action.type === 'defend') return { type: 'defend' }
  if (action.type === 'item') return { type: 'skill', skillId: 'heal' }

  const skill = skills[action.skillId]
  if (!skill) return { type: 'attack' }
  return {
    type: 'skill',
    skillId: skill.costTp === 0 ? skill.id : HEART_SHADOW_COPY_FALLBACKS[skill.type],
  }
}

export function resolveHeartShadowHuihuiSkill(hasLivingChain: boolean): string {
  return hasLivingChain ? 'worry_mend' : 'shadow_blade'
}

export function resolveHeartShadowBreakMax(enemyId: string, defaultMax: number): number {
  return enemyId === HEART_SHADOW_ENEMY_IDS.A ? Math.min(defaultMax, 100) : defaultMax
}

export function isHeartShadowEvasionCounter(enemyId: string, actorId: string, skillId: string): boolean {
  if (enemyId !== HEART_SHADOW_ENEMY_IDS.CONGCONG) return false
  return (actorId === 'HUIHUI' && (HUIHUI_EVASION_COUNTER_SKILLS as readonly string[]).includes(skillId)) ||
    (actorId === 'SUN' && skillId === 'shenyu')
}

export function shouldHeartShadowSunCastShield(completedRounds: number, hasShield: boolean): boolean {
  return !hasShield && completedRounds >= 0 && completedRounds % 3 === 0
}

export function isHeartShadowShieldDispel(enemyId: string, skillId: string): boolean {
  return enemyId === HEART_SHADOW_ENEMY_IDS.SUN && skillId === 'jieguangjinghua'
}

export function resolveEncounterPartyIds(party: readonly string[], encounterId: string): string[] {
  if ((BATTLE_SOLO_ENCOUNTER_IDS as readonly string[]).includes(encounterId)) {
    return [BATTLE_SOLO_CHARACTER_ID]
  }
  return [...party]
}

export function hasCompletedSurvivalRounds(completedRounds: number, requiredRounds: number): boolean {
  return requiredRounds > 0 && completedRounds >= requiredRounds
}

export function resolveEnemyElementalDamageModifier(
  enemy: Pick<EnemyData, 'element' | 'weakness' | 'resistance'>,
  attackElement: string,
  fallbackWeaknesses: Readonly<Record<string, readonly string[]>> = ELEMENT_WEAKNESS,
): ElementalDamageModifier {
  if (enemy.resistance.includes(attackElement)) {
    return { multiplier: RESISTANCE_DAMAGE_MULTIPLIER, result: 'resisted' }
  }

  const isExplicitWeakness = enemy.weakness.includes(attackElement)
  const isFallbackWeakness = enemy.weakness.length === 0 && fallbackWeaknesses[enemy.element]?.includes(attackElement)
  if (isExplicitWeakness || isFallbackWeakness) {
    return { multiplier: WEAKNESS_DAMAGE_MULTIPLIER, result: 'weak' }
  }

  return { multiplier: 1, result: 'neutral' }
}

export function canEscapeBattle(
  enemies: readonly Pick<EnemyData, 'isBoss'>[],
  isForcedSurvivalBattle = false,
): boolean {
  return !isForcedSurvivalBattle && !enemies.some(enemy => enemy.isBoss)
}

export type EscapeAttemptResult = 'blocked' | 'escaped' | 'failed'

export function resolveEscapeAttempt(
  canEscape: boolean,
  roll: number,
  successRate = BATTLE_RULES.ESCAPE_SUCCESS_RATE,
): EscapeAttemptResult {
  if (!canEscape) return 'blocked'
  return roll >= 0 && roll < successRate ? 'escaped' : 'failed'
}

export interface BreakGaugeResult {
  gauge: number
  shouldBreak: boolean
}

export function canGainBreakGauge(isPlayer: boolean, currentHp: number, isBroken: boolean): boolean {
  return !isPlayer && currentHp > 0 && !isBroken
}

export function advanceBreakGauge(currentGauge: number, maxGauge: number, gain: number): BreakGaugeResult {
  if (maxGauge <= 0) return { gauge: 0, shouldBreak: false }
  const gauge = Math.min(maxGauge, Math.max(0, currentGauge + gain))
  return { gauge, shouldBreak: gauge >= maxGauge }
}

export interface TurnAdvanceResult {
  currentTurn: number
  completedRounds: number
  roundCompleted: boolean
}

export function advanceBattleTurn(currentTurn: number, turnOrderLength: number, completedRounds: number): TurnAdvanceResult {
  if (turnOrderLength <= 0) {
    return { currentTurn: 0, completedRounds, roundCompleted: false }
  }

  const nextTurn = currentTurn + 1
  if (nextTurn >= turnOrderLength) {
    return { currentTurn: 0, completedRounds: completedRounds + 1, roundCompleted: true }
  }

  return { currentTurn: nextTurn, completedRounds, roundCompleted: false }
}

export function canUseBattleSkill(
  currentMp: number,
  currentTp: number,
  skill: Pick<SkillData, 'costMp' | 'costTp'>,
): boolean {
  return currentMp >= skill.costMp && currentTp >= skill.costTp
}

export function resolveLimitedSkillTargets<T>(selected: T, candidates: readonly T[], targetCount = 1): T[] {
  const count = Math.max(1, Math.floor(targetCount))
  const selectedIndex = candidates.indexOf(selected)
  const ordered = selectedIndex >= 0
    ? [...candidates.slice(selectedIndex), ...candidates.slice(0, selectedIndex)]
    : [selected, ...candidates]
  return [...new Set(ordered)].slice(0, count)
}

export function shouldEvadeBattleAttack(hasEvasionUp: boolean, roll: number): boolean {
  return hasEvasionUp && roll >= 0 && roll < BATTLE_RULES.EVASION_UP_CHANCE
}

export function resolveBreakGaugeGain(baseGain: number, weaknessExposed: boolean): number {
  const multiplier = weaknessExposed ? BATTLE_RULES.WEAKNESS_EXPOSED_BREAK_GAIN_MULTIPLIER : 1
  return Math.max(0, Math.floor(baseGain * multiplier))
}

export function shouldGrantExtraTurnOnKill(
  skill: Pick<SkillData, 'grantsExtraTurnOnKill'> | undefined,
  opponentsBefore: number,
  opponentsAfter: number,
): boolean {
  return skill?.grantsExtraTurnOnKill === true && opponentsAfter > 0 && opponentsAfter < opponentsBefore
}
