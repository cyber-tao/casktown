import { afterEach, describe, expect, test } from 'bun:test'
import { STARTUP_LOADING } from '../../src/utils/constants.ts'
import { isStartupReady, markStartupReady } from '../../src/utils/startup.ts'

const originalDocument = globalThis.document
const originalWindow = globalThis.window
const originalCustomEvent = globalThis.CustomEvent

afterEach(() => {
  globalThis.document = originalDocument
  globalThis.window = originalWindow
  globalThis.CustomEvent = originalCustomEvent
})

describe('startup ready state', () => {
  test('marks a stable DOM state and dispatches the ready event once', () => {
    const attributes = new Map<string, string>()
    const eventTypes: string[] = []

    globalThis.document = {
      documentElement: {
        getAttribute: (key: string) => attributes.get(key) ?? null,
        setAttribute: (key: string, value: string) => attributes.set(key, value),
      },
    } as Document
    globalThis.window = {
      dispatchEvent: (event: Event) => {
        eventTypes.push(event.type)
        return true
      },
    } as Window & typeof globalThis
    globalThis.CustomEvent = class extends Event {
      constructor(type: string) {
        super(type)
      }
    } as typeof CustomEvent

    expect(isStartupReady()).toBe(false)

    markStartupReady()
    markStartupReady()

    expect(isStartupReady()).toBe(true)
    expect(attributes.get(STARTUP_LOADING.READY_ATTRIBUTE)).toBe(STARTUP_LOADING.READY_VALUE)
    expect(eventTypes).toEqual([STARTUP_LOADING.READY_EVENT])
  })

  test('can mark ready in document-only environments', () => {
    const attributes = new Map<string, string>()

    globalThis.document = {
      documentElement: {
        getAttribute: (key: string) => attributes.get(key) ?? null,
        setAttribute: (key: string, value: string) => attributes.set(key, value),
      },
    } as Document
    globalThis.window = undefined as unknown as Window & typeof globalThis

    markStartupReady()

    expect(isStartupReady()).toBe(true)
    expect(attributes.get(STARTUP_LOADING.READY_ATTRIBUTE)).toBe(STARTUP_LOADING.READY_VALUE)
  })
})
