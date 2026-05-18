type EventHandler = (...args: unknown[]) => void
type EventListener = { handler: EventHandler; context?: unknown }

class EventEmitter {
  private listeners = new Map<string, EventListener[]>()

  on<T extends unknown[]>(event: string, handler: (...args: T) => void, context?: unknown): this {
    const listeners = this.listeners.get(event) ?? []
    listeners.push({ handler: handler as EventHandler, context })
    this.listeners.set(event, listeners)
    return this
  }

  off<T extends unknown[]>(event: string, handler: (...args: T) => void, context?: unknown): this {
    const listeners = this.listeners.get(event)
    if (!listeners) return this
    this.listeners.set(event, listeners.filter(listener => listener.handler !== handler as EventHandler || listener.context !== context))
    return this
  }

  emit(event: string, ...args: unknown[]): boolean {
    const listeners = this.listeners.get(event)
    if (!listeners || listeners.length === 0) return false
    for (const listener of [...listeners]) {
      listener.handler.apply(listener.context, args)
    }
    return true
  }
}

export const EventBus = new EventEmitter()

export const GameEvents = {
  SAVE_REQUEST: 'save-request',
  LOAD_REQUEST: 'load-request',
  DIALOGUE_START: 'dialogue-start',
  DIALOGUE_END: 'dialogue-end',
  BATTLE_START: 'battle-start',
  BATTLE_END: 'battle-end',
  MENU_OPEN: 'menu-open',
  MENU_CLOSE: 'menu-close',
  MAP_CHANGE: 'map-change',
  FLAG_SET: 'flag-set',
  QUEST_UPDATE: 'quest-update',
  ITEM_GET: 'item-get',
  LEVEL_UP: 'level-up',
  GAME_OVER: 'game-over',
  GAME_CLEARED: 'game-cleared',
  SAVE_LOADED: 'save-loaded',
  BARREL_UNLOCKED: 'barrel:unlocked',
} as const
