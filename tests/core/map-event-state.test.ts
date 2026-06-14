import { describe, expect, test } from 'bun:test'
import type { MapEvent } from '../../src/data/types.ts'
import { getChestOpenedFlag, getFieldEventDoneFlag, isCompletableMapEvent, isMapEventCompleted } from '../../src/core/MapEventState.ts'

function mapEvent(id: string, type: MapEvent['type']): MapEvent {
  return {
    id,
    type,
    trigger: 'action',
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    actions: [],
  }
}

describe('MapEventState', () => {
  test('builds stable completion flag keys', () => {
    expect(getFieldEventDoneFlag('EVT_TEST')).toBe('event_done_EVT_TEST')
    expect(getChestOpenedFlag('CHEST_TEST')).toBe('chest_opened_CHEST_TEST')
  })

  test('marks one-shot field events as completable', () => {
    expect(isCompletableMapEvent(mapEvent('EVT_TEST', 'trigger'))).toBe(true)
    expect(isCompletableMapEvent(mapEvent('CHEST_TEST', 'chest'))).toBe(true)
    expect(isCompletableMapEvent(mapEvent('NPC_TEST', 'npc'))).toBe(false)
    expect(isCompletableMapEvent(mapEvent('BATTLE_TEST', 'battle'))).toBe(false)
    expect(isCompletableMapEvent(mapEvent('EXIT_TEST', 'transfer'))).toBe(false)
  })

  test('detects completed chest and trigger events from saved flags', () => {
    const flags: Record<string, unknown> = {
      chest_opened_CHEST_TEST: true,
      event_done_EVT_TEST: true,
    }
    const readFlag = (flag: string): unknown => flags[flag]

    expect(isMapEventCompleted(mapEvent('CHEST_TEST', 'chest'), readFlag)).toBe(true)
    expect(isMapEventCompleted(mapEvent('EVT_TEST', 'trigger'), readFlag)).toBe(true)
    expect(isMapEventCompleted(mapEvent('NPC_TEST', 'npc'), readFlag)).toBe(false)
  })
})
