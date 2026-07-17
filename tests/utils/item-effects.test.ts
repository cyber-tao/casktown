import { describe, expect, test } from 'bun:test'
import { canApplyConsumableEffect, resolveItemRecoveryAmount } from '../../src/utils/itemEffects.ts'

describe('item recovery effects', () => {
  test('applies the pineapple rice bonus to A', () => {
    expect(resolveItemRecoveryAmount('pineapple_rice', 'A', 150)).toBe(180)
  })

  test('keeps standard recovery for other targets and items', () => {
    expect(resolveItemRecoveryAmount('pineapple_rice', 'T', 150)).toBe(150)
    expect(resolveItemRecoveryAmount('heal_grass', 'A', 80)).toBe(80)
  })

  test('rejects recovery items that cannot change the selected targets', () => {
    const fullTarget = { hp: 100, maxHp: 100, mp: 40, maxMp: 40 }
    const injuredTarget = { hp: 75, maxHp: 100, mp: 40, maxMp: 40 }

    expect(canApplyConsumableEffect('heal_hp:80', [fullTarget])).toBe(false)
    expect(canApplyConsumableEffect('heal_hp:30_all', [fullTarget, injuredTarget])).toBe(true)
    expect(canApplyConsumableEffect('heal_mp:60', [fullTarget])).toBe(false)
    expect(canApplyConsumableEffect('revive:30', [fullTarget])).toBe(false)
    expect(canApplyConsumableEffect('revive:30', [{ ...fullTarget, hp: 0 }])).toBe(true)
  })

  test('requires a matching negative status before consuming a cure', () => {
    const statuses = new Set(['poison'])
    const target = {
      hp: 50,
      maxHp: 100,
      mp: 20,
      maxMp: 40,
      hasStatus: (status: string) => statuses.has(status),
    }

    expect(canApplyConsumableEffect('cure_poison', [target])).toBe(true)
    expect(canApplyConsumableEffect('cure_confuse_charm_fear', [target])).toBe(false)
    statuses.clear()
    expect(canApplyConsumableEffect('cure_poison', [target])).toBe(false)
  })
})
