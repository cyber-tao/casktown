import { describe, expect, test } from 'bun:test'
import { EventBus, GameEvents } from '../../src/core/EventBus.ts'

describe('EventEmitter', () => {
  test('on registers a listener and emit triggers it', () => {
    const received: unknown[] = []
    EventBus.on(GameEvents.FLAG_SET, (flag: string, value: unknown) => {
      received.push(flag, value)
    })
    EventBus.emit(GameEvents.FLAG_SET, 'test_flag', true)
    expect(received).toEqual(['test_flag', true])
    EventBus.off(GameEvents.FLAG_SET, (flag: string, value: unknown) => {
      received.push(flag, value)
    })
  })

  test('emit returns false when no listeners', () => {
    const result = EventBus.emit(GameEvents.GAME_CLEARED)
    expect(result).toBe(false)
  })

  test('emit returns true when listeners exist', () => {
    const handler = () => {}
    EventBus.on(GameEvents.LEVEL_UP, handler)
    const result = EventBus.emit(GameEvents.LEVEL_UP, 'T', 2)
    expect(result).toBe(true)
    EventBus.off(GameEvents.LEVEL_UP, handler)
  })

  test('off removes a specific listener', () => {
    const calls: string[] = []
    const handler = () => calls.push('a')
    EventBus.on(GameEvents.ITEM_GET, handler)
    EventBus.emit(GameEvents.ITEM_GET, 'item1', 1)
    expect(calls).toEqual(['a'])
    EventBus.off(GameEvents.ITEM_GET, handler)
    EventBus.emit(GameEvents.ITEM_GET, 'item2', 1)
    expect(calls).toEqual(['a'])
  })

  test('multiple listeners on the same event all fire', () => {
    const calls: string[] = []
    const h1 = () => calls.push('h1')
    const h2 = () => calls.push('h2')
    EventBus.on(GameEvents.MAP_CHANGE, h1)
    EventBus.on(GameEvents.MAP_CHANGE, h2)
    EventBus.emit(GameEvents.MAP_CHANGE, 'MAP_010')
    expect(calls).toEqual(['h1', 'h2'])
    EventBus.off(GameEvents.MAP_CHANGE, h1)
    EventBus.off(GameEvents.MAP_CHANGE, h2)
  })

  test('listener with context receives correct this', () => {
    const ctx = { val: 42 }
    let captured: number | undefined
    const handler = function (this: { val: number }) {
      captured = this.val
    }
    EventBus.on(GameEvents.SAVE_REQUEST, handler, ctx)
    EventBus.emit(GameEvents.SAVE_REQUEST)
    expect(captured).toBe(42)
    EventBus.off(GameEvents.SAVE_REQUEST, handler, ctx)
  })
})

describe('GameEvents', () => {
  test('all event keys are unique strings', () => {
    const values = Object.values(GameEvents)
    const unique = new Set(values)
    expect(unique.size).toBe(values.length)
  })
})
