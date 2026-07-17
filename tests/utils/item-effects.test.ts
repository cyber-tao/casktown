import { describe, expect, test } from 'bun:test'
import { resolveItemRecoveryAmount } from '../../src/utils/itemEffects.ts'

describe('item recovery effects', () => {
  test('applies the pineapple rice bonus to A', () => {
    expect(resolveItemRecoveryAmount('pineapple_rice', 'A', 150)).toBe(180)
  })

  test('keeps standard recovery for other targets and items', () => {
    expect(resolveItemRecoveryAmount('pineapple_rice', 'T', 150)).toBe(150)
    expect(resolveItemRecoveryAmount('heal_grass', 'A', 80)).toBe(80)
  })
})
