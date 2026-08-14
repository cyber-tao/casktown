import type { EventAction, QuestState } from '../data/types'

export const GameEvents = {
  DIALOGUE_END: 'dialogue-end',
  BATTLE_END: 'battle-end',
  MENU_CLOSE: 'menu-close',
  FLAG_SET: 'flag-set',
  QUEST_UPDATE: 'quest-update',
  SAVE_LOADED: 'save-loaded',
} as const

type GameEventName = typeof GameEvents[keyof typeof GameEvents]

interface GameEventPayloads {
  [GameEvents.DIALOGUE_END]: [data?: { actions?: EventAction[]; missing?: boolean }]
  [GameEvents.BATTLE_END]: [victory: boolean, result?: { escaped?: boolean }]
  [GameEvents.MENU_CLOSE]: []
  [GameEvents.FLAG_SET]: [key: string, value: unknown]
  [GameEvents.QUEST_UPDATE]: [questId: string, state: QuestState]
  [GameEvents.SAVE_LOADED]: []
}

type EventPayload<T extends GameEventName> = T extends keyof GameEventPayloads ? GameEventPayloads[T] : never
type EventHandler<T extends unknown[] = unknown[]> = (...args: T) => void
type EventListener = { handler: EventHandler; context?: unknown }

class EventEmitter {
  private listeners = new Map<GameEventName, EventListener[]>()

  on<T extends GameEventName>(event: T, handler: (...args: EventPayload<T>) => void, context?: unknown): this {
    const listeners = this.listeners.get(event) ?? []
    listeners.push({ handler: handler as EventHandler, context })
    this.listeners.set(event, listeners)
    return this
  }

  off<T extends GameEventName>(event: T, handler: (...args: EventPayload<T>) => void, context?: unknown): this {
    const listeners = this.listeners.get(event)
    if (!listeners) return this
    const remaining = listeners.filter(listener => listener.handler !== handler as EventHandler || listener.context !== context)
    if (remaining.length > 0) {
      this.listeners.set(event, remaining)
    } else {
      this.listeners.delete(event)
    }
    return this
  }

  emit<T extends GameEventName>(event: T, ...args: EventPayload<T>): boolean {
    const listeners = this.listeners.get(event)
    if (!listeners || listeners.length === 0) return false
    for (const listener of [...listeners]) {
      listener.handler.apply(listener.context, args)
    }
    return true
  }
}

export const EventBus = new EventEmitter()
