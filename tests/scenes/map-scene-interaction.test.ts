import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { EventAction, MapEvent } from '../../src/data/types.ts'
import { GameData } from '../../src/core/GameData.ts'
import { FIELD_ENTITY_BEHAVIOR, TILE_SIZE } from '../../src/utils/constants.ts'
import { isTileInsideSpriteBounds } from '../../src/utils/fieldGeometry.ts'

let MapSceneClass: typeof import('../../src/scenes/MapScene.ts').MapScene
let originalWindow: unknown
let originalDocument: unknown
let originalImage: unknown
let originalCanvas: unknown
let originalNavigator: unknown

type ExecuteActionsHarness = {
  pendingActions: EventAction[]
  pendingMapEventId: string
  transferMap: (mapId: string, x: number, y: number, beforeRestart?: () => void) => boolean
  markFieldEventCompleted: (eventId?: string) => void
  handleStateActionFailure: (reason: string) => void
}

type ExecuteActions = (this: ExecuteActionsHarness, actions: EventAction[], mapEventId?: string) => void

type TouchLayoutHarness = {
  touchLayoutActive: boolean
  touchControls: unknown[]
  shouldShowTouchControls: () => boolean
  rebuildResponsiveHudForInputMode: () => void
  destroyTouchControls: () => void
  createTouchControls: () => void
}

type SyncTouchControls = (this: TouchLayoutHarness) => void

type CanInteractHarness = {
  npcs: Map<string, unknown>
  battleEnemies: Map<string, unknown>
  fieldEntityBehaviors: Map<string, unknown>
  player: { x: number; y: number }
  isSuppressedFieldEvent: () => boolean
}

type CanInteractWithEvent = (this: CanInteractHarness, event: MapEvent, px: number, py: number, fx: number, fy: number) => boolean

beforeAll(async () => {
  const runtime = globalThis as unknown as Record<string, unknown>
  originalWindow = runtime.window
  originalDocument = runtime.document
  originalImage = runtime.Image
  originalCanvas = runtime.HTMLCanvasElement
  originalNavigator = runtime.navigator

  ;(globalThis as unknown as { window: unknown }).window = globalThis
  class FakeCanvas {
    style = {}
    parentNode: { removeChild: () => void } | null = null
    getContext(): object {
      return {
        fillRect: () => {},
        drawImage: () => {},
        getImageData: () => ({ data: new Uint8ClampedArray([0, 0, 0, 0]) }),
        putImageData: () => {},
        createImageData: () => ({ data: new Uint8ClampedArray(4) }),
      }
    }
  }
  ;(globalThis as unknown as { Image: unknown }).Image = class {
    onload: (() => void) | null = null
    set src(_value: string) {}
  }
  ;(globalThis as unknown as { HTMLCanvasElement: unknown }).HTMLCanvasElement = FakeCanvas
  ;(globalThis as unknown as { document: unknown }).document = {
    pointerLockElement: null,
    documentElement: {},
    createElement: (tagName: string) => tagName === 'audio'
      ? { canPlayType: () => '' }
      : new FakeCanvas(),
  }
  if (!('navigator' in globalThis)) {
    ;(globalThis as unknown as { navigator: Record<string, unknown> }).navigator = {}
  }

  ;({ MapScene: MapSceneClass } = await import('../../src/scenes/MapScene.ts'))
})

afterAll(() => {
  const runtime = globalThis as unknown as Record<string, unknown>
  if (originalWindow === undefined) delete runtime.window
  else runtime.window = originalWindow
  if (originalDocument === undefined) delete runtime.document
  else runtime.document = originalDocument
  if (originalImage === undefined) delete runtime.Image
  else runtime.Image = originalImage
  if (originalCanvas === undefined) delete runtime.HTMLCanvasElement
  else runtime.HTMLCanvasElement = originalCanvas
  if (originalNavigator === undefined) delete runtime.navigator
  else runtime.navigator = originalNavigator
})

function createNpcSprite(spriteX: number): Parameters<typeof isTileInsideSpriteBounds>[0] {
  return {
    x: spriteX,
    y: 5 * TILE_SIZE + TILE_SIZE / 2,
    displayWidth: TILE_SIZE,
    displayHeight: TILE_SIZE,
    originX: 0.5,
    originY: 0.5,
  }
}

function createActionNpcEvent(): MapEvent {
  return {
    id: 'NPC_MOVING_TEST',
    x: 17,
    y: 23,
    width: 1,
    height: 1,
    type: 'npc',
    trigger: 'action',
    actions: [{ type: 'dialogue', dialogueId: 'DIA_TEST' }],
  }
}

function getCanInteractWithEvent(): CanInteractWithEvent {
  return MapSceneClass.prototype['canInteractWithEvent'] as CanInteractWithEvent
}

function createNpcInteractionHarness(spriteTileX: number, spriteTileY: number, playerTileX: number, playerTileY: number): CanInteractHarness {
  const sprite = {
    x: spriteTileX * TILE_SIZE + TILE_SIZE / 2,
    y: spriteTileY * TILE_SIZE + TILE_SIZE / 2,
    displayWidth: TILE_SIZE,
    displayHeight: TILE_SIZE,
    originX: 0.5,
    originY: 0.5,
  }
  return Object.assign(Object.create(MapSceneClass.prototype), {
    npcs: new Map([['NPC_MOVING_TEST', sprite]]),
    battleEnemies: new Map(),
    fieldEntityBehaviors: new Map(),
    player: {
      x: playerTileX * TILE_SIZE + TILE_SIZE / 2,
      y: playerTileY * TILE_SIZE + TILE_SIZE / 2,
    },
    isSuppressedFieldEvent: () => false,
  }) as CanInteractHarness
}

describe('MapScene NPC interaction', () => {
  test('detects a moving NPC that still overlaps the faced tile', () => {
    const sprite = createNpcSprite(7 * TILE_SIZE - 2)

    expect(isTileInsideSpriteBounds(
      sprite,
      6,
      5,
      TILE_SIZE,
      FIELD_ENTITY_BEHAVIOR.NPC_INTERACTION_BOUNDS_EPSILON_PX,
    )).toBe(true)
  })

  test('ignores a moving NPC that has left the faced tile', () => {
    const sprite = createNpcSprite(8 * TILE_SIZE + TILE_SIZE / 2)

    expect(isTileInsideSpriteBounds(
      sprite,
      6,
      5,
      TILE_SIZE,
      FIELD_ENTITY_BEHAVIOR.NPC_INTERACTION_BOUNDS_EPSILON_PX,
    )).toBe(false)
  })

  test('does not trigger a moved NPC from its stale origin radius', () => {
    const harness = createNpcInteractionHarness(18, 23, 17, 23)

    expect(getCanInteractWithEvent().call(
      harness,
      createActionNpcEvent(),
      17,
      23,
      17,
      22,
    )).toBe(false)
  })

  test('triggers a moved NPC when facing its current sprite tile', () => {
    const harness = createNpcInteractionHarness(18, 23, 17, 23)

    expect(getCanInteractWithEvent().call(
      harness,
      createActionNpcEvent(),
      17,
      23,
      18,
      23,
    )).toBe(true)
  })
})

describe('MapScene action sequencing', () => {
  const transferAction: EventAction = { type: 'transfer', targetMap: 'MAP_010', targetX: 1, targetY: 2 }

  function getExecuteActions(): ExecuteActions {
    return MapSceneClass.prototype['executeActions'] as ExecuteActions
  }

  test('marks a completable field event before a successful transfer restarts the map', () => {
    const calls: string[] = []
    const completedEvents: string[] = []
    const harness = {
      pendingActions: [],
      pendingMapEventId: '',
      transferMap: (_mapId: string, _x: number, _y: number, beforeRestart?: () => void): boolean => {
        calls.push('transfer-start')
        beforeRestart?.()
        calls.push('restart')
        return true
      },
      markFieldEventCompleted: (eventId?: string): void => {
        if (eventId) completedEvents.push(eventId)
        calls.push(`complete:${eventId ?? ''}`)
      },
      handleStateActionFailure: () => {},
    }

    getExecuteActions().call(harness, [transferAction], 'EVT_SCRIPT_TRANSFER')

    expect(completedEvents).toEqual(['EVT_SCRIPT_TRANSFER'])
    expect(calls).toEqual(['transfer-start', 'complete:EVT_SCRIPT_TRANSFER', 'restart'])
  })

  test('does not mark a field event when map access blocks the transfer', () => {
    const completedEvents: string[] = []
    const harness = {
      pendingActions: [],
      pendingMapEventId: '',
      transferMap: (): boolean => false,
      markFieldEventCompleted: (eventId?: string): void => {
        if (eventId) completedEvents.push(eventId)
      },
      handleStateActionFailure: () => {},
    }

    getExecuteActions().call(harness, [transferAction], 'EVT_BLOCKED_TRANSFER')

    expect(completedEvents).toEqual([])
  })

  test('does not complete an event after a failed state action', () => {
    GameData.getInstance().reset()
    const completedEvents: string[] = []
    const failures: string[] = []
    const harness = {
      pendingActions: [],
      pendingMapEventId: '',
      transferMap: (): boolean => true,
      markFieldEventCompleted: (eventId?: string): void => {
        if (eventId) completedEvents.push(eventId)
      },
      handleStateActionFailure: (reason: string): void => {
        failures.push(reason)
      },
    }

    getExecuteActions().call(harness, [
      { type: 'removeItem', itemId: 'blue_mint', quantity: 1 },
      { type: 'questComplete', questId: 'QST_014' },
    ], 'EVT_FAILED_TURNIN')

    expect(failures).toEqual(['Missing item blue_mint'])
    expect(completedEvents).toEqual([])
  })
})

describe('MapScene responsive touch layout', () => {
  function getSyncTouchControls(): SyncTouchControls {
    return MapSceneClass.prototype['syncTouchControls'] as SyncTouchControls
  }

  test('rebuilds HUD surfaces when resize switches into touch layout', () => {
    const calls: string[] = []
    const harness = {
      touchLayoutActive: false,
      touchControls: [],
      shouldShowTouchControls: () => true,
      rebuildResponsiveHudForInputMode: () => calls.push('rebuild-hud'),
      destroyTouchControls: () => {
        calls.push('destroy-touch')
        harness.touchControls = []
      },
      createTouchControls: () => {
        calls.push('create-touch')
        harness.touchControls = [{}]
      },
    }

    getSyncTouchControls().call(harness)

    expect(harness.touchLayoutActive).toBe(true)
    expect(calls).toEqual(['rebuild-hud', 'create-touch'])
  })

  test('does not rebuild HUD surfaces when touch layout stays active', () => {
    const calls: string[] = []
    const harness = {
      touchLayoutActive: true,
      touchControls: [{}],
      shouldShowTouchControls: () => true,
      rebuildResponsiveHudForInputMode: () => calls.push('rebuild-hud'),
      destroyTouchControls: () => {
        calls.push('destroy-touch')
        harness.touchControls = []
      },
      createTouchControls: () => {
        calls.push('create-touch')
        harness.touchControls = [{}]
      },
    }

    getSyncTouchControls().call(harness)

    expect(harness.touchLayoutActive).toBe(true)
    expect(calls).toEqual(['destroy-touch', 'create-touch'])
  })
})
