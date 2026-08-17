import type { EventAction, MapEvent } from '../data/types'
import { getChestOpenedFlag, getFieldEventDoneFlag, isCompletableMapEvent, isMapEventCompleted } from './MapEventState'
import { applyStateEventAction, type StateEventActionResult } from './EventActionExecutor'

export type MapEventPauseReason =
  | 'dialogue'
  | 'battle'
  | 'shop'
  | 'training'
  | 'rebuildMenu'
  | 'menu'
  | 'worldMap'
  | null

export interface MapEventRuntimeHost {
  getMapEvent(eventId: string): MapEvent | undefined
  getFlag(key: string): unknown
  setFlag(key: string, value: unknown): void
  areEventConditionsMet(event: MapEvent): boolean
  isSuppressedFieldEvent(event: MapEvent): boolean
  isBattleEventDefeated(event: MapEvent): boolean
  onStateActionApplied(result: StateEventActionResult): void
  onStateActionFailed(reason: string): void
  startDialogue(dialogueId: string): void
  startBattle(encounterId: string, mapEventId: string): void
  startShop(): void
  startTraining(): void
  startRebuildMenu(): void
  transferMap(mapId: string, x: number, y: number, onSuccess: () => void): boolean
}

export class MapEventRuntime {
  inEvent = false
  pendingActions: EventAction[] = []
  pendingMapEventId = ''
  pauseReason: MapEventPauseReason = null

  reset(): void {
    this.inEvent = false
    this.pendingActions = []
    this.pendingMapEventId = ''
    this.pauseReason = null
  }

  clearPending(): void {
    this.pendingActions = []
    this.pendingMapEventId = ''
    this.pauseReason = null
  }

  isCompletableFieldEvent(event: MapEvent): boolean {
    return isCompletableMapEvent(event)
  }

  isFieldEventCompleted(event: MapEvent, getFlag: (key: string) => unknown): boolean {
    return isMapEventCompleted(event, getFlag)
  }

  markFieldEventCompleted(host: MapEventRuntimeHost, eventId?: string): void {
    if (!eventId) return
    const customMark = (host as unknown as { markFieldEventCompleted?: (id?: string) => void }).markFieldEventCompleted
    if (typeof customMark === 'function' && typeof host.getMapEvent !== 'function') {
      customMark(eventId)
      return
    }
    const event = host.getMapEvent?.(eventId)
    if (!event || !this.isCompletableFieldEvent(event)) return
    if (event.type === 'chest') {
      host.setFlag(getChestOpenedFlag(event.id), true)
    }
    host.setFlag(getFieldEventDoneFlag(event.id), true)
  }

  beginEvent(host: MapEventRuntimeHost, event: MapEvent): boolean {
    if (host.isSuppressedFieldEvent(event)) return false
    this.inEvent = true
    const completionEventId = this.isCompletableFieldEvent(event) ? event.id : undefined

    if (event.type === 'chest' && host.getFlag(getChestOpenedFlag(event.id)) === true) {
      this.inEvent = false
      return false
    }

    if (completionEventId && this.isFieldEventCompleted(event, key => host.getFlag(key))) {
      this.inEvent = false
      return false
    }

    if (event.type === 'battle' && host.isBattleEventDefeated(event)) {
      this.inEvent = false
      return false
    }

    if (!host.areEventConditionsMet(event)) {
      this.inEvent = false
      return false
    }

    this.executeActions(host, event.actions, event.type === 'battle' ? event.id : completionEventId ?? '')
    return true
  }

  executeActions(host: MapEventRuntimeHost, actions: EventAction[], mapEventId = ''): void {
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i]!
      switch (action.type) {
        case 'dialogue':
          this.pendingActions = actions.slice(i + 1)
          this.pendingMapEventId = mapEventId
          this.pauseReason = 'dialogue'
          host.startDialogue(action.dialogueId)
          return
        case 'battle':
          this.pendingActions = actions.slice(i + 1)
          this.pendingMapEventId = mapEventId
          this.pauseReason = 'battle'
          host.startBattle(action.encounterId, mapEventId)
          return
        case 'transfer':
          this.pendingActions = []
          this.pendingMapEventId = ''
          this.pauseReason = null
          host.transferMap(action.targetMap, action.targetX, action.targetY, () => {
            const customMark = (host as unknown as { markFieldEventCompleted?: (id?: string) => void }).markFieldEventCompleted
            if (typeof customMark === 'function' && typeof host.getMapEvent !== 'function') {
              customMark(mapEventId)
            } else {
              this.markFieldEventCompleted(host, mapEventId)
            }
          })
          return
        case 'shop':
          this.pendingActions = actions.slice(i + 1)
          this.pendingMapEventId = mapEventId
          this.pauseReason = 'shop'
          host.startShop()
          return
        case 'training':
          this.pendingActions = actions.slice(i + 1)
          this.pendingMapEventId = mapEventId
          this.pauseReason = 'training'
          host.startTraining()
          return
        case 'rebuildMenu':
          this.pendingActions = actions.slice(i + 1)
          this.pendingMapEventId = mapEventId
          this.pauseReason = 'rebuildMenu'
          host.startRebuildMenu()
          return
        default: {
          const result = applyStateEventAction(action)
          if (result.failureReason) {
            this.clearPending()
            this.inEvent = false
            const failHandler = host.onStateActionFailed
              ?? (host as unknown as { handleStateActionFailure?: (reason: string) => void }).handleStateActionFailure
            failHandler?.(result.failureReason)
            return
          }
          if (!result.handled) break
          host.onStateActionApplied?.(result)
          break
        }
      }
    }
    this.pendingActions = []
    this.pendingMapEventId = ''
    this.pauseReason = null
    const customMark = (host as unknown as { markFieldEventCompleted?: (id?: string) => void }).markFieldEventCompleted
    if (typeof customMark === 'function' && typeof host.getMapEvent !== 'function') {
      customMark(mapEventId)
    } else {
      this.markFieldEventCompleted(host, mapEventId)
    }
    this.inEvent = false
  }

  resumeAfterOverlay(
    host: MapEventRuntimeHost,
    extraActions: EventAction[] = [],
    options: { completeIfIdle?: boolean; missingDialogue?: boolean } = {},
  ): void {
    const mapEventId = this.pendingMapEventId
    if (options.missingDialogue) {
      this.clearPending()
      this.inEvent = false
      return
    }

    const pending = [...extraActions, ...this.pendingActions]
    this.pendingActions = []
    this.pendingMapEventId = ''
    this.pauseReason = null

    if (pending.length > 0) {
      this.inEvent = true
      this.executeActions(host, pending, mapEventId)
      return
    }

    if (options.completeIfIdle !== false) {
      this.markFieldEventCompleted(host, mapEventId)
    }
    this.inEvent = false
  }
}
