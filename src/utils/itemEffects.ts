import { BATTLE_RULES, BATTLE_STATUS } from './constants'

const ITEM_TARGET_RECOVERY_MULTIPLIERS: Readonly<Record<string, Readonly<Record<string, number>>>> = {
  pineapple_rice: { A: 1.2 },
}

export interface ConsumableEffectTarget {
  hp: number
  maxHp: number
  mp: number
  maxMp: number
  hasStatus?: (status: string) => boolean
}

export function resolveItemRecoveryAmount(itemId: string, targetId: string, baseAmount: number): number {
  const multiplier = ITEM_TARGET_RECOVERY_MULTIPLIERS[itemId]?.[targetId] ?? 1
  return Math.max(0, Math.floor(baseAmount * multiplier))
}

export function canApplyConsumableEffect(effect: string, targets: readonly ConsumableEffectTarget[]): boolean {
  if (effect.startsWith(BATTLE_RULES.HEAL_HP_EFFECT_PREFIX)) {
    return targets.some(target => target.hp > 0 && target.hp < target.maxHp)
  }
  if (effect.startsWith(BATTLE_RULES.HEAL_MP_EFFECT_PREFIX)) {
    return targets.some(target => target.hp > 0 && target.mp < target.maxMp)
  }
  if (effect.startsWith(BATTLE_RULES.REVIVE_EFFECT_PREFIX)) {
    return targets.some(target => target.hp <= 0)
  }
  if (effect === 'cure_poison') {
    return targets.some(target => target.hasStatus?.(BATTLE_STATUS.POISON) === true)
  }
  if (effect === 'cure_confuse_charm_fear') {
    return targets.some(target => [BATTLE_STATUS.CONFUSE, BATTLE_STATUS.CHARM, BATTLE_STATUS.FEAR]
      .some(status => target.hasStatus?.(status) === true))
  }
  return effect === 'buff_speed' || effect === 'barrier_status'
}
