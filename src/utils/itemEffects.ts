const ITEM_TARGET_RECOVERY_MULTIPLIERS: Readonly<Record<string, Readonly<Record<string, number>>>> = {
  pineapple_rice: { A: 1.2 },
}

export function resolveItemRecoveryAmount(itemId: string, targetId: string, baseAmount: number): number {
  const multiplier = ITEM_TARGET_RECOVERY_MULTIPLIERS[itemId]?.[targetId] ?? 1
  return Math.max(0, Math.floor(baseAmount * multiplier))
}
