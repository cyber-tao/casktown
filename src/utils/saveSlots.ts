import type { SaveMeta } from '../core/SaveManager'
import { GAME_CONFIG_DATABASE } from '../data/configDatabase'
import { QUICK_SAVE_SLOT, SAVE_SLOT_MIN, SAVE_SLOTS, SECONDS_PER_HOUR, SECONDS_PER_MINUTE } from './constants'

export type SaveSlotAction = 'save' | 'load'

export function getManualSaveSlots(): number[] {
  return Array.from({ length: SAVE_SLOTS - SAVE_SLOT_MIN + 1 }, (_, index) => SAVE_SLOT_MIN + index)
}

export function getLoadSaveSlots(includeQuick = true): number[] {
  return includeQuick ? [...getManualSaveSlots(), QUICK_SAVE_SLOT] : getManualSaveSlots()
}

export function getSaveSlotName(slot: number): string {
  return slot === QUICK_SAVE_SLOT ? '快速存档' : `槽位 ${slot}`
}

export function formatSavePlayTime(seconds: unknown): string {
  const totalSeconds = typeof seconds === 'number' && Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
  const hours = Math.floor(totalSeconds / SECONDS_PER_HOUR)
  const minutes = Math.floor((totalSeconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE)
  if (hours === 0 && minutes === 0) return `${totalSeconds}s`
  return `${hours}h${minutes}m`
}

export function formatSavePreview(preview: unknown): string {
  if (typeof preview !== 'string') return '未知队伍'
  const characters = GAME_CONFIG_DATABASE.getTable('characters')
  const members = preview
    .split(',')
    .map(member => member.trim())
    .filter(Boolean)
    .map(member => characters[member]?.name ?? member)
  if (members.length > 2) return `${members[0]} 等${members.length}人`
  return members.length > 0 ? members.join(', ') : '未知队伍'
}

export function formatSaveSlotLabel(slot: number, meta: SaveMeta | null, action: SaveSlotAction): string {
  const name = getSaveSlotName(slot)
  const prefix = action === 'save' ? `保存到${name}` : name
  if (!meta || typeof meta !== 'object') return `${prefix} · 空`
  return `${prefix} · ${formatSavePreview(meta.preview)} · ${formatSavePlayTime(meta.playTime)}`
}
