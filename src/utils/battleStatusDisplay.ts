import {
  BATTLE_INTERNAL_STATUSES,
  BATTLE_NEGATIVE_STATUSES,
  BATTLE_RULES,
  BATTLE_STATUS,
  BATTLE_STATUS_LABELS,
  BATTLE_STATUS_SHORT_LABELS,
} from './constants'

export interface ParsedBattleStatus {
  id: string
  duration: number | null
}

export interface BattleStatusDisplayOptions {
  maxVisible?: number
  resolveLabel?: (statusId: string) => string | undefined
}

interface DisplayStatus extends ParsedBattleStatus {
  label: string
  index: number
  priority: number
}

export function parseBattleStatus(status: string): ParsedBattleStatus {
  const separatorIndex = status.lastIndexOf(BATTLE_RULES.STATUS_DURATION_SEPARATOR)
  if (separatorIndex < 0) return { id: status, duration: null }

  const duration = Number(status.slice(separatorIndex + 1))
  if (!Number.isInteger(duration) || duration < 0) return { id: status, duration: null }
  return { id: status.slice(0, separatorIndex), duration }
}

export function formatBattleStatusDisplay(
  statuses: readonly string[],
  options: BattleStatusDisplayOptions = {},
): string {
  const parsedStatuses = statuses.map(parseBattleStatus)
  const breakDuration = parsedStatuses.find(status => status.id === BATTLE_STATUS.BREAK_TURNS)?.duration ?? null
  const internalStatuses = BATTLE_INTERNAL_STATUSES as readonly string[]
  const negativeStatuses = BATTLE_NEGATIVE_STATUSES as readonly string[]

  const displayStatuses = parsedStatuses
    .map((status, index): DisplayStatus | null => {
      if (internalStatuses.includes(status.id)) return null
      const label = BATTLE_STATUS_SHORT_LABELS[status.id]
        ?? BATTLE_STATUS_LABELS[status.id]
        ?? options.resolveLabel?.(status.id)
      if (!label) return null

      const duration = status.id === BATTLE_STATUS.BREAK && status.duration === null
        ? breakDuration
        : status.duration
      const priority = negativeStatuses.includes(status.id) || status.id === BATTLE_STATUS.BREAK ? 0 : 1
      return { ...status, duration, label, index, priority }
    })
    .filter((status): status is DisplayStatus => status !== null)
    .sort((left, right) => left.priority - right.priority || left.index - right.index)

  const maxVisible = Math.max(0, options.maxVisible ?? displayStatuses.length)
  const visibleStatuses = displayStatuses.slice(0, maxVisible)
  const labels = visibleStatuses.map(status => status.duration === null
    ? status.label
    : `${status.label}·${status.duration}回`)
  const hiddenCount = displayStatuses.length - visibleStatuses.length
  if (hiddenCount > 0) labels.push(`+${hiddenCount}`)
  return labels.join(' ')
}
