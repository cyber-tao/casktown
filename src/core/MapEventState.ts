import type { MapEvent } from '../data/types'
import { FIELD_EVENT_FLAGS } from '../utils/constants'

const REPEATABLE_ACTION_TYPES = new Set(['shop', 'training', 'rebuildMenu'])

export function getFieldEventDoneFlag(eventId: string): string {
  return `${FIELD_EVENT_FLAGS.DONE_PREFIX}${eventId}`
}

export function getChestOpenedFlag(eventId: string): string {
  return `${FIELD_EVENT_FLAGS.CHEST_OPENED_PREFIX}${eventId}`
}

export function isCompletableMapEvent(event: Pick<MapEvent, 'type' | 'actions'>): boolean {
  if (event.type === 'npc' || event.type === 'battle' || event.type === 'transfer') return false
  return !event.actions.some(action => REPEATABLE_ACTION_TYPES.has(action.type))
}

export function isMapEventCompleted(event: Pick<MapEvent, 'id' | 'type' | 'actions'>, readFlag: (key: string) => unknown): boolean {
  if (event.type === 'chest') return readFlag(getChestOpenedFlag(event.id)) === true
  return isCompletableMapEvent(event) && readFlag(getFieldEventDoneFlag(event.id)) === true
}
