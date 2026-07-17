import type { EnemyData, SkillData } from '../data/types'
import { ELEMENT_WEAKNESS } from './constants'

const WEAKNESS_DAMAGE_MULTIPLIER = 1.5
const RESISTANCE_DAMAGE_MULTIPLIER = 0.5

export type ElementalHitResult = 'weak' | 'resisted' | 'neutral'

export interface ElementalDamageModifier {
  multiplier: number
  result: ElementalHitResult
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
