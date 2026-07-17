import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { EventAction, MapEvent } from '../../src/data/types.ts'
import { MAPS } from '../../src/data/maps.ts'
import { GameData } from '../../src/core/GameData.ts'
import { InputManager } from '../../src/core/InputManager.ts'
import { FIELD_ENTITY_BEHAVIOR, REBUILT_TOWN_MAP_ID, START_MAP_ID, TILE_SIZE, WORLD_MAP_BACKGROUND_LAYOUT } from '../../src/utils/constants.ts'
import { isTileInsideSpriteBounds } from '../../src/utils/fieldGeometry.ts'

let MapSceneClass: typeof import('../../src/scenes/MapScene.ts').MapScene
let collectMapImageKeys: typeof import('../../src/core/AssetLoader.ts').collectMapImageKeys
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

type DirectionalKeysHarness = {
  input: { keyboard: { addKey: (keyName: string) => unknown } | null }
  actionKeySignature: string
  actionKeys?: Record<string, unknown>
}

type SyncDirectionalActionKeys = (this: DirectionalKeysHarness, force?: boolean) => void

type HandleFlagSetHarness = {
  mapData: { id: string }
  scene: {
    isPaused: () => boolean
    isActive: (sceneKey: string) => boolean
  }
  pendingMapRestartId: string
  refreshMinimapStatic: () => void
  isJoinFlag: (key: string) => boolean
  removeSuppressedFieldEventSprites: () => void
  refreshFollowers: () => void
  createPartyHud: () => void
  requestMapRestart: (mapId: string) => void
}

type FlushPendingMapRestartHarness = {
  pendingMapRestartId: string
  requestMapRestart: (mapId: string) => void
}

type MenuCloseHarness = FlushPendingMapRestartHarness & {
  time: { now: number }
  inputResumeBlockedUntilMs: number
  promptText?: { setVisible: (visible: boolean) => void }
  scene: { resume: () => void }
  pendingActions: EventAction[]
  pendingMapEventId: string
  inEvent: boolean
  markFieldEventCompleted: (eventId?: string) => void
  executeActions: (actions: EventAction[], mapEventId?: string) => void
}

type OnMenuClose = (this: MenuCloseHarness) => void

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
  ;({ collectMapImageKeys } = await import('../../src/core/AssetLoader.ts'))
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

describe('MapScene configured keyboard movement', () => {
  test('rebinds polled direction keys when the control preset changes', () => {
    const input = InputManager.getInstance()
    GameData.getInstance().reset()
    input.syncFromGameData()
    const addedKeys: string[] = []
    const harness: DirectionalKeysHarness = {
      input: { keyboard: { addKey: keyName => {
        addedKeys.push(keyName)
        return { keyName }
      } } },
      actionKeySignature: '',
    }
    const syncKeys = MapSceneClass.prototype['syncDirectionalActionKeys'] as SyncDirectionalActionKeys

    syncKeys.call(harness)
    expect(addedKeys).toEqual(['UP', 'DOWN', 'LEFT', 'RIGHT'])

    input.setWASD()
    syncKeys.call(harness)
    expect(addedKeys.slice(-4)).toEqual(['W', 'S', 'A', 'D'])

    syncKeys.call(harness)
    expect(addedKeys).toHaveLength(8)
  })

  test('recreates configured direction keys for a new scene input lifecycle', () => {
    const input = InputManager.getInstance()
    GameData.getInstance().reset()
    input.syncFromGameData()
    const addedKeys: string[] = []
    const harness: DirectionalKeysHarness = {
      input: { keyboard: { addKey: keyName => {
        addedKeys.push(keyName)
        return { keyName }
      } } },
      actionKeySignature: '',
    }
    const syncKeys = MapSceneClass.prototype['syncDirectionalActionKeys'] as SyncDirectionalActionKeys

    syncKeys.call(harness)
    syncKeys.call(harness, true)

    expect(addedKeys).toEqual(['UP', 'DOWN', 'LEFT', 'RIGHT', 'UP', 'DOWN', 'LEFT', 'RIGHT'])
  })
})

describe('MapScene deferred visual restart', () => {
  test('defers rebuild map restart while RebuildOverlay pauses the map', () => {
    GameData.getInstance().reset()
    const restartCalls: string[] = []
    const harness: HandleFlagSetHarness = {
      mapData: { id: START_MAP_ID },
      scene: {
        isPaused: () => true,
        isActive: sceneKey => sceneKey === 'RebuildOverlay',
      },
      pendingMapRestartId: '',
      refreshMinimapStatic: () => {},
      isJoinFlag: () => false,
      removeSuppressedFieldEventSprites: () => {},
      refreshFollowers: () => {},
      createPartyHud: () => {},
      requestMapRestart: mapId => restartCalls.push(mapId),
    }
    const mapScene = Object.assign(new MapSceneClass(), harness)

    mapScene['handleFlagSet']('rebuild_level', 3)

    expect(restartCalls).toEqual([])
    expect((mapScene as unknown as HandleFlagSetHarness).pendingMapRestartId).toBe(REBUILT_TOWN_MAP_ID)
    expect(GameData.getInstance().currentMap).toBe(REBUILT_TOWN_MAP_ID)
  })

  test('restarts the deferred rebuild map after the overlay closes', () => {
    const calls: string[] = []
    const harness = Object.assign(Object.create(MapSceneClass.prototype), {
      pendingMapRestartId: REBUILT_TOWN_MAP_ID,
      requestMapRestart: (mapId: string) => calls.push(`restart:${mapId}`),
      time: { now: 100 },
      inputResumeBlockedUntilMs: 0,
      scene: { resume: () => calls.push('resume') },
      pendingActions: [],
      pendingMapEventId: '',
      inEvent: true,
      markFieldEventCompleted: () => calls.push('complete'),
      executeActions: () => {},
    }) as MenuCloseHarness
    const onMenuClose = MapSceneClass.prototype['onMenuClose'] as OnMenuClose

    onMenuClose.call(harness)

    expect(calls).toEqual(['resume', 'complete', `restart:${REBUILT_TOWN_MAP_ID}`])
    expect(harness.pendingMapRestartId).toBe('')
    expect(harness.inEvent).toBe(false)
  })
})

describe('MapScene runtime assets', () => {
  test('preloads the world map background before opening the overlay', () => {
    const mapKeys = collectMapImageKeys(MAPS[START_MAP_ID]!, ['T'])

    expect(mapKeys.has(WORLD_MAP_BACKGROUND_LAYOUT.KEY)).toBe(true)
  })
})
