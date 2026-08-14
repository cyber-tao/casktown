import { describe, expect, test } from 'bun:test'
import { EventBus, GameEvents } from '../../src/core/EventBus.ts'

describe('EventEmitter', () => {
  test('on registers a listener and emit triggers it', () => {
    const received: unknown[] = []
    const handler = (flag: string, value: unknown) => {
      received.push(flag, value)
    }
    EventBus.on(GameEvents.FLAG_SET, handler)
    EventBus.emit(GameEvents.FLAG_SET, 'test_flag', true)
    expect(received).toEqual(['test_flag', true])
    EventBus.off(GameEvents.FLAG_SET, handler)
  })

  test('emit returns false when no listeners', () => {
    const result = EventBus.emit(GameEvents.SAVE_LOADED)
    expect(result).toBe(false)
  })

  test('emit returns true when listeners exist', () => {
    const handler = () => {}
    EventBus.on(GameEvents.SAVE_LOADED, handler)
    const result = EventBus.emit(GameEvents.SAVE_LOADED)
    expect(result).toBe(true)
    EventBus.off(GameEvents.SAVE_LOADED, handler)
  })

  test('off removes a specific listener', () => {
    const calls: string[] = []
    const handler = () => calls.push('a')
    EventBus.on(GameEvents.MENU_CLOSE, handler)
    EventBus.emit(GameEvents.MENU_CLOSE)
    expect(calls).toEqual(['a'])
    EventBus.off(GameEvents.MENU_CLOSE, handler)
    EventBus.emit(GameEvents.MENU_CLOSE)
    expect(calls).toEqual(['a'])
  })

  test('multiple listeners on the same event all fire', () => {
    const calls: string[] = []
    const h1 = () => calls.push('h1')
    const h2 = () => calls.push('h2')
    EventBus.on(GameEvents.QUEST_UPDATE, h1)
    EventBus.on(GameEvents.QUEST_UPDATE, h2)
    EventBus.emit(GameEvents.QUEST_UPDATE, 'QST_001', {
      id: 'QST_001',
      status: 'active',
      progress: 0,
      maxProgress: 1,
    })
    expect(calls).toEqual(['h1', 'h2'])
    EventBus.off(GameEvents.QUEST_UPDATE, h1)
    EventBus.off(GameEvents.QUEST_UPDATE, h2)
  })

  test('listener with context receives correct this', () => {
    const ctx = { val: 42 }
    let captured: number | undefined
    const handler = function (this: { val: number }) {
      captured = this.val
    }
    EventBus.on(GameEvents.MENU_CLOSE, handler, ctx)
    EventBus.emit(GameEvents.MENU_CLOSE)
    expect(captured).toBe(42)
    EventBus.off(GameEvents.MENU_CLOSE, handler, ctx)
  })
})

describe('GameEvents', () => {
  test('all event keys are unique strings', () => {
    const values = Object.values(GameEvents)
    const unique = new Set(values)
    expect(unique.size).toBe(values.length)
  })
})
