import type { EventCondition } from '../data/types'

export type FlagReader = (key: string) => unknown

export function isEventConditionMet(condition: EventCondition, readFlag: FlagReader): boolean {
  if (condition.flag !== undefined) {
    const expected = condition.value !== undefined ? condition.value : true
    return (readFlag(condition.flag) ?? false) === expected
  }

  if (condition.switch !== undefined) {
    return readFlag(condition.switch) === true
  }

  return true
}

export function areEventConditionsMet(conditions: readonly EventCondition[] | undefined, readFlag: FlagReader): boolean {
  if (!conditions || conditions.length === 0) return true
  return conditions.every(condition => isEventConditionMet(condition, readFlag))
}
