import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { EventAction, MapEvent } from '../../src/data/types.ts'
import { MAPS } from '../../src/data/maps.ts'
import { GameData } from '../../src/core/GameData.ts'
import { InputManager } from '../../src/core/InputManager.ts'
import { FIELD_ENTITY_BEHAVIOR, REBUILT_TOWN_MAP_ID, START_MAP_ID, TILE_SIZE, WORLD_MAP_BACKGROUND_LAYOUT } from '../../src/utils/constants.ts'
import { getEscapeRetreatTiles, isTileInsideSpriteBounds } from '../../src/utils/fieldGeometry.ts'

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

type FailedBattleContinuationHarness = {
  pendingActions: EventAction[]
  pendingMapEventId: string
  inEvent: boolean
  scene: { start: (sceneKey: string) => void }
}

type OnBattleEnd = (this: FailedBattleContinuationHarness, victory: boolean, result?: { escaped?: boolean }) => void

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
  syncConditionalBattleEnemies: () => void
  refreshMinimapStatic: () => void
  isJoinFlag: (key: string) => boolean
  removeSuppressedFieldEventSprites: () => void
  refreshFollowers: () => void
  createPartyHud: () => void
  requestMapRestart: (mapId: string) => void
}

type SyncConditionalBattleEnemiesHarness = {
  mapData: { events: MapEvent[] }
  battleEnemies: Map<string, unknown>
  isBattleEventDefeated: (event: MapEvent) => boolean
  areEventConditionsMet: (event: MapEvent) => boolean
  isSpriteUsable: (sprite: unknown) => boolean
  spawnBattleEnemy: (event: MapEvent) => void
  removeBattleEnemy: (eventId: string, sprite: unknown) => void
}

type SyncConditionalBattleEnemies = (this: SyncConditionalBattleEnemiesHarness) => void

type RemoveBattleEnemyHarness = {
  tweens: { killTweensOf: (sprite: unknown) => void }
  enemyPatrolTimers: Map<string, { remove: (dispatchCallback: boolean) => void }>
  battleEnemies: Map<string, unknown>
  battleEnemyEvents: Map<string, MapEvent>
  fieldEntityBehaviors: Map<string, unknown>
  fieldEntityOrigins: Map<string, unknown>
  fieldEntityDirections: Map<string, unknown>
  battleEnemyReentryBlockedUntilMs: Map<string, number>
}

type RemoveBattleEnemy = (
  this: RemoveBattleEnemyHarness,
  eventId: string,
  sprite: { destroy: () => void },
) => void

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

type EscapeRetreatHarness = {
  battleEnemies: Map<string, { x: number; y: number }>
  battleEnemyReentryBlockedUntilMs: Map<string, number>
  fieldEntityOrigins: Map<string, { x: number; y: number }>
  fieldEntityDirections: Map<string, number>
  player: { x: number; y: number }
  time: { now: number }
  tweens: { killTweensOf: (target: unknown) => void }
  canMoveTo: (x: number, y: number) => boolean
  canFieldEntityOccupyPixel: (x: number, y: number) => boolean
  updateFieldEntityFrame: () => void
  savePosition: () => void
}

type RetreatFromEscapedTouchBattle = (this: EscapeRetreatHarness, event: MapEvent) => void
type IsBattleEnemyReentryBlocked = (this: Pick<EscapeRetreatHarness, 'battleEnemyReentryBlockedUntilMs' | 'time'>, eventId: string) => boolean

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

describe('MapScene touch-battle escape retreat', () => {
  test('orders retreat tiles away from the enemy instead of using player facing', () => {
    expect(getEscapeRetreatTiles({ x: 5, y: 5 }, { x: 4, y: 5 })[0]).toEqual({ x: 6, y: 5 })
    expect(getEscapeRetreatTiles({ x: 5, y: 5 }, { x: 5, y: 6 })[0]).toEqual({ x: 5, y: 4 })
  })

  test('uses the farthest legal tile, resets the enemy, and starts a reentry guard', () => {
    const enemy = { x: 4 * TILE_SIZE + TILE_SIZE / 2, y: 5 * TILE_SIZE + TILE_SIZE / 2 }
    const calls: string[] = []
    const harness: EscapeRetreatHarness = {
      battleEnemies: new Map([['TOUCH_ENEMY', enemy]]),
      battleEnemyReentryBlockedUntilMs: new Map(),
      fieldEntityOrigins: new Map([['TOUCH_ENEMY', { x: 2 * TILE_SIZE, y: 2 * TILE_SIZE }]]),
      fieldEntityDirections: new Map(),
      player: { x: 5 * TILE_SIZE + TILE_SIZE / 2, y: 5 * TILE_SIZE + TILE_SIZE / 2 },
      time: { now: 500 },
      tweens: { killTweensOf: () => calls.push('kill-tween') },
      canMoveTo: (x, y) => x === 5 && y === 4,
      canFieldEntityOccupyPixel: () => true,
      updateFieldEntityFrame: () => calls.push('idle-frame'),
      savePosition: () => calls.push('save-position'),
    }
    const retreat = MapSceneClass.prototype['retreatFromEscapedTouchBattle'] as RetreatFromEscapedTouchBattle

    retreat.call(harness, {
      id: 'TOUCH_ENEMY', x: 4, y: 5, width: 1, height: 1,
      type: 'battle', trigger: 'touch', actions: [],
    })

    expect(harness.player).toEqual({ x: 5 * TILE_SIZE + TILE_SIZE / 2, y: 4 * TILE_SIZE + TILE_SIZE / 2 })
    expect(enemy).toEqual({ x: 2 * TILE_SIZE, y: 2 * TILE_SIZE })
    expect(harness.battleEnemyReentryBlockedUntilMs.get('TOUCH_ENEMY')).toBe(1500)
    expect(calls).toEqual(['kill-tween', 'idle-frame', 'save-position'])
  })

  test('keeps the player on a legal tile when no retreat neighbor is open', () => {
    const enemy = { x: 5 * TILE_SIZE, y: 5 * TILE_SIZE }
    const harness: EscapeRetreatHarness = {
      battleEnemies: new Map([['TOUCH_ENEMY', enemy]]),
      battleEnemyReentryBlockedUntilMs: new Map(),
      fieldEntityOrigins: new Map([['TOUCH_ENEMY', { x: TILE_SIZE, y: TILE_SIZE }]]),
      fieldEntityDirections: new Map(),
      player: { x: 5 * TILE_SIZE + TILE_SIZE / 2, y: 5 * TILE_SIZE + TILE_SIZE / 2 },
      time: { now: 0 },
      tweens: { killTweensOf: () => {} },
      canMoveTo: () => false,
      canFieldEntityOccupyPixel: () => true,
      updateFieldEntityFrame: () => {},
      savePosition: () => {},
    }
    const retreat = MapSceneClass.prototype['retreatFromEscapedTouchBattle'] as RetreatFromEscapedTouchBattle
    const originalPlayerPosition = { ...harness.player }

    retreat.call(harness, {
      id: 'TOUCH_ENEMY', x: 5, y: 5, width: 1, height: 1,
      type: 'battle', trigger: 'touch', actions: [],
    })

    expect(harness.player).toEqual(originalPlayerPosition)
    expect(enemy).toEqual({ x: TILE_SIZE, y: TILE_SIZE })
  })

  test('blocks the escaped enemy until the guard expires', () => {
    const harness = {
      battleEnemyReentryBlockedUntilMs: new Map([['TOUCH_ENEMY', 1500]]),
      time: { now: 1499 },
    }
    const isBlocked = MapSceneClass.prototype['isBattleEnemyReentryBlocked'] as IsBattleEnemyReentryBlocked

    expect(isBlocked.call(harness, 'TOUCH_ENEMY')).toBe(true)
    harness.time.now = 1500
    expect(isBlocked.call(harness, 'TOUCH_ENEMY')).toBe(false)
    expect(harness.battleEnemyReentryBlockedUntilMs.has('TOUCH_ENEMY')).toBe(false)
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

  test('discards story follow-ups when a nested battle is lost', () => {
    GameData.getInstance().reset()
    const event = MAPS.MAP_055!.events.find(candidate => candidate.id === 'EVT_MEMORY_FINAL')!
    const shadowIndex = event.actions.findIndex(action => action.type === 'dialogue' && action.dialogueId === 'DIA_430_SHADOW')
    const startedScenes: string[] = []
    const harness: FailedBattleContinuationHarness = {
      pendingActions: event.actions.slice(shadowIndex + 1),
      pendingMapEventId: event.id,
      inEvent: true,
      scene: { start: sceneKey => startedScenes.push(sceneKey) },
    }
    const onBattleEnd = MapSceneClass.prototype['onBattleEnd'] as OnBattleEnd

    onBattleEnd.call(harness, false)

    expect(harness.pendingActions).toEqual([])
    expect(harness.pendingMapEventId).toBe('')
    expect(harness.inEvent).toBe(false)
    expect(GameData.getInstance().quests.has('QST_012')).toBe(false)
    expect(GameData.getInstance().getFlag('dream_completed')).not.toBe(true)
    expect(startedScenes).toEqual(['GameOverScene'])
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
  test('syncs conditional battle enemies before refreshing the minimap after a flag update', () => {
    const calls: string[] = []
    const harness: HandleFlagSetHarness = {
      mapData: { id: START_MAP_ID },
      scene: {
        isPaused: () => false,
        isActive: () => false,
      },
      pendingMapRestartId: '',
      syncConditionalBattleEnemies: () => calls.push('sync-battles'),
      refreshMinimapStatic: () => calls.push('refresh-minimap'),
      isJoinFlag: () => false,
      removeSuppressedFieldEventSprites: () => {},
      refreshFollowers: () => {},
      createPartyHud: () => {},
      requestMapRestart: () => {},
    }
    const mapScene = Object.assign(new MapSceneClass(), harness)

    mapScene['handleFlagSet']('puzzle_trees_solved', true)

    expect(calls).toEqual(['sync-battles', 'refresh-minimap'])
  })

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
      syncConditionalBattleEnemies: () => {},
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

describe('MapScene conditional battle enemy sync', () => {
  test('spawns an eligible touch battle once and removes it when invalidated or defeated', () => {
    GameData.getInstance().reset()
    const event: MapEvent = {
      id: 'EVT_CONDITIONAL_TOUCH_BATTLE',
      x: 4,
      y: 5,
      width: 1,
      height: 1,
      type: 'battle',
      trigger: 'touch',
      conditions: [{ flag: 'conditional_touch_battle_unlocked', value: true }],
      actions: [{ type: 'battle', encounterId: 'ENC_TEST' }],
    }
    const roamingSprite = { id: 'roaming' }
    const spawnedIds: string[] = []
    const removedIds: string[] = []
    let defeated = false
    const harness = Object.assign(Object.create(MapSceneClass.prototype), {
      mapData: { events: [event] },
      battleEnemies: new Map<string, unknown>([['ROAM_KEEP', roamingSprite]]),
      isBattleEventDefeated: () => defeated,
      isSpriteUsable: () => true,
    }) as SyncConditionalBattleEnemiesHarness
    harness.spawnBattleEnemy = candidate => {
      spawnedIds.push(candidate.id)
      harness.battleEnemies.set(candidate.id, { id: candidate.id })
    }
    harness.removeBattleEnemy = (eventId) => {
      removedIds.push(eventId)
      harness.battleEnemies.delete(eventId)
    }
    const sync = MapSceneClass.prototype['syncConditionalBattleEnemies'] as SyncConditionalBattleEnemies

    GameData.getInstance().setFlag('conditional_touch_battle_unlocked', false)
    sync.call(harness)
    expect(spawnedIds).toEqual([])

    GameData.getInstance().setFlag('conditional_touch_battle_unlocked', true)
    sync.call(harness)
    sync.call(harness)
    expect(spawnedIds).toEqual([event.id])
    expect(harness.battleEnemies.get('ROAM_KEEP')).toBe(roamingSprite)

    GameData.getInstance().setFlag('conditional_touch_battle_unlocked', false)
    sync.call(harness)
    expect(removedIds).toEqual([event.id])

    GameData.getInstance().setFlag('conditional_touch_battle_unlocked', true)
    sync.call(harness)
    defeated = true
    sync.call(harness)
    expect(spawnedIds).toEqual([event.id, event.id])
    expect(removedIds).toEqual([event.id, event.id])
  })

  test('removing a battle enemy also removes its patrol timer and runtime state', () => {
    const calls: string[] = []
    const eventId = 'EVT_REMOVED_BATTLE'
    const sprite = { destroy: () => calls.push('destroy') }
    const event = {
      id: eventId,
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      type: 'battle',
      trigger: 'touch',
      actions: [],
    } satisfies MapEvent
    const harness: RemoveBattleEnemyHarness = {
      tweens: { killTweensOf: () => calls.push('kill-tweens') },
      enemyPatrolTimers: new Map([[eventId, { remove: () => calls.push('remove-timer') }]]),
      battleEnemies: new Map([[eventId, sprite]]),
      battleEnemyEvents: new Map([[eventId, event]]),
      fieldEntityBehaviors: new Map([[eventId, {}]]),
      fieldEntityOrigins: new Map([[eventId, {}]]),
      fieldEntityDirections: new Map([[eventId, 0]]),
      battleEnemyReentryBlockedUntilMs: new Map([[eventId, 1000]]),
    }
    const remove = MapSceneClass.prototype['removeBattleEnemy'] as RemoveBattleEnemy

    remove.call(harness, eventId, sprite)

    expect(calls).toEqual(['kill-tweens', 'destroy', 'remove-timer'])
    expect(harness.enemyPatrolTimers.has(eventId)).toBe(false)
    expect(harness.battleEnemies.has(eventId)).toBe(false)
    expect(harness.battleEnemyEvents.has(eventId)).toBe(false)
    expect(harness.fieldEntityBehaviors.has(eventId)).toBe(false)
    expect(harness.fieldEntityOrigins.has(eventId)).toBe(false)
    expect(harness.fieldEntityDirections.has(eventId)).toBe(false)
    expect(harness.battleEnemyReentryBlockedUntilMs.has(eventId)).toBe(false)
  })
})

describe('MapScene runtime assets', () => {
  test('preloads the world map background before opening the overlay', () => {
    const mapKeys = collectMapImageKeys(MAPS[START_MAP_ID]!, ['T'])

    expect(mapKeys.has(WORLD_MAP_BACKGROUND_LAYOUT.KEY)).toBe(true)
  })
})
