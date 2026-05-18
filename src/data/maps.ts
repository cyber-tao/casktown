import type { MapConnection, MapData, MapEvent, MapLayer } from './types'
import { REDESIGNED_MAP_LAYOUTS, TILE_SPRITE_FOOTPRINTS } from '../utils/constants'
import { TILE_SPRITES } from './tileSprites'

const T = {
  GRASS: 1, DIRT: 2, WATER: 3, TREE: 4, FLOWERS: 5,
  ROCK: 6, FENCE: 7, BRIDGE: 8, HOUSE: 9, WELL: 10,
  PATH: 11, BUSH: 12, STUMP: 13, RUIN: 14, SIGN: 15,
  BARREL: 16, CAMPFIRE: 17, BENCH: 18, LAMP: 19,
  GRASS_CLUMP: 20, FLOWERS_WHITE: 21, SAPLING: 22,
  WHEAT: 23, CABBAGE: 24, FARMLAND: 25,
}

function createLayer(w: number, h: number, fill: number): MapLayer {
  return { name: 'layer', data: new Array(w * h).fill(fill), visible: true, opacity: 1 }
}

function rect(layer: MapLayer, w: number, x: number, y: number, rw: number, rh: number, val: number): void {
  for (let dy = 0; dy < rh; dy++) {
    for (let dx = 0; dx < rw; dx++) {
      const nx = x + dx
      const ny = y + dy
      if (nx >= 0 && nx < w && ny >= 0 && ny < layer.data.length / w) {
        layer.data[ny * w + nx] = val
      }
    }
  }
}

type RedesignedMapId = keyof typeof REDESIGNED_MAP_LAYOUTS
type TileName = keyof typeof T
type EventBounds = { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
type LayoutArea = EventBounds & { readonly tile: string }
type LayoutObject = { readonly x: number; readonly y: number; readonly tile: string }
type LayoutTransfer = EventBounds & { readonly id: string; readonly targetMap: string; readonly targetX: number; readonly targetY: number; readonly direction: number }
type RedesignLayout = {
  readonly width: number
  readonly height: number
  readonly baseTile: string
  readonly frameTile?: string
  readonly frameThickness?: number
  readonly groundRects: readonly LayoutArea[]
  readonly objectRects?: readonly LayoutArea[]
  readonly objectClearRects?: readonly EventBounds[]
  readonly objects?: readonly LayoutObject[]
  readonly eventPositions: Record<string, EventBounds>
  readonly transfers: readonly LayoutTransfer[]
  readonly encounters: readonly string[]
  readonly encounterRate: number
}

const COLLISION_OBJECT_TILES = new Set<number>([
  T.TREE, T.ROCK, T.FENCE, T.HOUSE, T.WELL, T.BUSH, T.STUMP, T.RUIN, T.BARREL, T.CAMPFIRE,
])

function tile(name: string): number {
  return T[name as TileName]
}

function clearRect(layer: MapLayer, w: number, x: number, y: number, rw: number, rh: number): void {
  rect(layer, w, x, y, rw, rh, 0)
}

function applyFrame(layer: MapLayer, w: number, h: number, frameTile: string | undefined, frameThickness: number | undefined): void {
  if (!frameTile || !frameThickness) return
  const val = tile(frameTile)
  rect(layer, w, 0, 0, w, frameThickness, val)
  rect(layer, w, 0, h - frameThickness, w, frameThickness, val)
  rect(layer, w, 0, 0, frameThickness, h, val)
  rect(layer, w, w - frameThickness, 0, frameThickness, h, val)
}

function getTileFootprint(tileId: number): { readonly width: number; readonly height: number } | undefined {
  const spriteKey = TILE_SPRITES[tileId]
  return spriteKey ? TILE_SPRITE_FOOTPRINTS[spriteKey] : undefined
}

function addCollisionRect(collisions: Set<number>, mapWidth: number, mapHeight: number, x: number, y: number, width: number, height: number): void {
  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      const nx = x + dx
      const ny = y + dy
      if (nx >= 0 && nx < mapWidth && ny >= 0 && ny < mapHeight) {
        collisions.add(ny * mapWidth + nx)
      }
    }
  }
}

function collectCollisions(ground: MapLayer, objects: MapLayer, mapWidth: number, mapHeight: number, placedObjects: readonly LayoutObject[] = []): number[] {
  const collisions = new Set<number>()
  for (let i = 0; i < objects.data.length; i++) {
    const objectTile = objects.data[i] ?? 0
    const groundTile = ground.data[i] ?? 0
    if ((groundTile === T.WATER && objectTile !== T.BRIDGE) || COLLISION_OBJECT_TILES.has(objectTile)) {
      collisions.add(i)
    }
  }
  for (const object of placedObjects) {
    const tileId = tile(object.tile)
    const footprint = getTileFootprint(tileId)
    if (footprint) {
      addCollisionRect(collisions, mapWidth, mapHeight, object.x, object.y, footprint.width, footprint.height)
    }
  }
  return [...collisions]
}

function applyEventBounds(event: MapEvent, bounds: EventBounds): MapEvent {
  return { ...event, x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
}

function createTransferEvent(transfer: EventBounds & { readonly id: string; readonly targetMap: string; readonly targetX: number; readonly targetY: number }, existing?: MapEvent): MapEvent {
  return {
    ...existing,
    id: transfer.id,
    x: transfer.x,
    y: transfer.y,
    width: transfer.width,
    height: transfer.height,
    type: 'transfer',
    trigger: 'touch',
    actions: [{ type: 'transfer', targetMap: transfer.targetMap, targetX: transfer.targetX, targetY: transfer.targetY }],
  }
}

function applyRedesignedLayout(map: MapData): MapData {
  const layout = REDESIGNED_MAP_LAYOUTS[map.id as RedesignedMapId] as RedesignLayout | undefined
  if (!layout) return map

  const ground = createLayer(layout.width, layout.height, tile(layout.baseTile))
  const objects = createLayer(layout.width, layout.height, 0)
  ground.name = 'ground'
  objects.name = 'objects'

  applyFrame(objects, layout.width, layout.height, layout.frameTile, layout.frameThickness)

  for (const area of layout.groundRects) {
    rect(ground, layout.width, area.x, area.y, area.width, area.height, tile(area.tile))
  }
  for (const area of layout.objectRects ?? []) {
    rect(objects, layout.width, area.x, area.y, area.width, area.height, tile(area.tile))
  }
  for (const area of layout.objectClearRects ?? []) {
    clearRect(objects, layout.width, area.x, area.y, area.width, area.height)
  }
  for (const object of layout.objects ?? []) {
    objects.data[object.y * layout.width + object.x] = tile(object.tile)
  }

  const eventPositions = layout.eventPositions
  const transferById = new Map<string, LayoutTransfer>(layout.transfers.map(transfer => [transfer.id, transfer]))
  const preservedEvents = map.events
    .filter(event => event.type !== 'transfer' || transferById.has(event.id))
    .map(event => {
      const transfer = transferById.get(event.id)
      if (transfer) return createTransferEvent(transfer, event)
      const bounds = eventPositions[event.id]
      return bounds ? applyEventBounds(event, bounds) : event
    })
  const preservedIds = new Set(preservedEvents.map(event => event.id))
  for (const transfer of layout.transfers) {
    if (!preservedIds.has(transfer.id)) {
      preservedEvents.push(createTransferEvent(transfer))
    }
  }

  const connections: MapConnection[] = layout.transfers.map(transfer => ({
    targetMap: transfer.targetMap,
    targetX: transfer.targetX,
    targetY: transfer.targetY,
    direction: transfer.direction,
  }))

  return {
    ...map,
    width: layout.width,
    height: layout.height,
    layers: [ground, objects],
    collisions: collectCollisions(ground, objects, layout.width, layout.height, layout.objects ?? []),
    events: preservedEvents,
    encounters: [...layout.encounters],
    encounterRate: layout.encounterRate,
    connections,
  }
}

function buildMap001(): MapData {
  const W = 32
  const H = 24
  const ground = createLayer(W, H, T.DIRT)
  const objs = createLayer(W, H, 0)

  // Grass patches
  rect(ground, W, 2, 2, 10, 8, T.GRASS)
  rect(ground, W, 18, 2, 12, 10, T.GRASS)
  rect(ground, W, 2, 14, 14, 8, T.GRASS)
  rect(ground, W, 20, 16, 10, 6, T.GRASS)

  // Paths
  rect(ground, W, 14, 0, 4, 24, T.PATH)
  rect(ground, W, 0, 10, 32, 4, T.PATH)

  // Trees
  const trees: [number, number][] = [
    [1,1],[3,1],[5,1],[7,1],[9,1],
    [1,3],[1,5],[1,7],[1,9],
    [19,1],[21,1],[23,1],[25,1],[27,1],[29,1],
    [29,3],[29,5],[29,7],[29,9],
    [1,15],[1,17],[1,19],[1,21],
    [3,21],[5,21],[7,21],[9,21],[11,21],
    [21,17],[23,17],[25,17],[27,17],[29,17],
    [29,19],[29,21],[27,21],[25,21],
  ]
  for (const [x,y] of trees) {
    objs.data[y * W + x] = T.TREE
  }

  // Flowers
  const flowers: [number, number][] = [[2,2],[4,4],[6,6],[8,8],[20,3],[22,5],[24,7],[26,4],[28,6]]
  for (const [x,y] of flowers) {
    objs.data[y * W + x] = T.FLOWERS
  }

  // Rocks
  objs.data[5 * W + 5] = T.ROCK
  objs.data[7 * W + 18] = T.ROCK
  objs.data[19 * W + 8] = T.ROCK

  // Well
  objs.data[10 * W + 16] = T.WELL

  // Houses (ruins)
  objs.data[5 * W + 12] = T.HOUSE
  objs.data[5 * W + 20] = T.RUIN
  objs.data[15 * W + 6] = T.HOUSE
  objs.data[18 * W + 24] = T.HOUSE

  // Barrels
  objs.data[11 * W + 13] = T.BARREL
  objs.data[11 * W + 14] = T.BARREL
  objs.data[12 * W + 13] = T.BARREL

  // Fence around farm area
  for (let x = 2; x <= 10; x++) objs.data[14 * W + x] = T.FENCE
  for (let y = 14; y <= 20; y++) objs.data[y * W + 2] = T.FENCE

  // Signposts
  objs.data[9 * W + 15] = T.SIGN
  objs.data[9 * W + 17] = T.SIGN

  const map: MapData = {
    id: 'MAP_001', name: '木桶镇·荒芜', width: W, height: H,
    tileset: 'environment', layers: [ground, objs],
    collisions: [], events: [], encounters: [], encounterRate: 0,
    bgm: 'town_ruins', connections: [],
  }

  // Build collisions
  for (let i = 0; i < objs.data.length; i++) {
    const tile = objs.data[i]
    if (tile && [T.TREE, T.ROCK, T.HOUSE, T.WELL, T.FENCE, T.BARREL, T.RUIN, T.STUMP, T.WATER, T.BUSH].includes(tile)) {
      map.collisions.push(i)
    }
  }

  map.events = [
    {
      id: 'EVT_START', x: 15, y: 12, width: 1, height: 1,
      type: 'trigger', trigger: 'autorun',
      actions: [
        { type: 'questStart', questId: 'QST_002' },
        { type: 'dialogue', dialogueId: 'DIA_001_START' },
      ],
    },
    {
      id: 'NPC_HUIHUI', x: 18, y: 10, width: 1, height: 1,
      type: 'npc', trigger: 'action', sprite: 'huihui_front_idle_01', direction: 2,
      actions: [{ type: 'dialogue', dialogueId: 'DIA_002_HUIHUI' }],
    },
    {
      id: 'NPC_A', x: 12, y: 10, width: 1, height: 1,
      type: 'npc', trigger: 'action', sprite: 'abo_front_idle_01', direction: 2,
      actions: [{ type: 'dialogue', dialogueId: 'DIA_003_A' }],
    },
    {
      id: 'NPC_MAYOR', x: 16, y: 5, width: 1, height: 1,
      type: 'npc', trigger: 'action', sprite: 'npc_mayor', direction: 2,
      actions: [{ type: 'dialogue', dialogueId: 'DIA_004_MAYOR' }],
    },
    {
      id: 'NPC_BARREL', x: 13, y: 11, width: 1, height: 1,
      type: 'npc', trigger: 'action', sprite: 'env_barrel', direction: 2,
      actions: [{ type: 'dialogue', dialogueId: 'DIA_005_BARREL' }],
    },
    {
      id: 'EXIT_EAST', x: W - 1, y: 10, width: 1, height: 4,
      type: 'transfer', trigger: 'touch',
      actions: [{ type: 'transfer', targetMap: 'MAP_010', targetX: 1, targetY: 12 }],
    },
    {
      id: 'EVT_FESTIVAL', x: 15, y: 5, width: 3, height: 2,
      type: 'trigger', trigger: 'action',
      conditions: [{ flag: 'met_mayor', value: true }],
      actions: [{ type: 'dialogue', dialogueId: 'DIA_006_FESTIVAL' }],
    },
  ]

  map.connections = [
    { targetMap: 'MAP_010', targetX: 1, targetY: 12, direction: 1 },
  ]

  return map
}

function buildMap010(): MapData {
  const W = 40
  const H = 28
  const ground = createLayer(W, H, T.GRASS)
  const objs = createLayer(W, H, 0)

  // Forest edge (dense trees on right and top)
  for (let x = 30; x < W; x++) {
    for (let y = 0; y < H; y++) {
      if ((x + y) % 3 !== 0) objs.data[y * W + x] = T.TREE
    }
  }
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < 4; y++) {
      if ((x + y) % 2 !== 0) objs.data[y * W + x] = T.TREE
    }
  }

  // Path from west entrance
  rect(ground, W, 0, 12, 25, 4, T.PATH)
  rect(ground, W, 20, 12, 10, 4, T.PATH)
  rect(ground, W, 25, 8, 4, 12, T.PATH)

  // River
  for (let y = 4; y < H - 4; y++) {
    ground.data[y * W + 10] = T.WATER
    ground.data[y * W + 11] = T.WATER
  }
  objs.data[4 * W + 10] = T.BRIDGE
  objs.data[4 * W + 11] = T.BRIDGE

  // Rocks and bushes
  const rocks: [number, number][] = [[8,8],[15,15],[22,20],[18,6],[35,18],[33,10]]
  for (const [x,y] of rocks) objs.data[y * W + x] = T.ROCK
  const bushes: [number, number][] = [[5,5],[7,7],[12,14],[20,18],[28,22],[32,16]]
  for (const [x,y] of bushes) objs.data[y * W + x] = T.BUSH

  // Flowers
  const flowers: [number, number][] = [[3,3],[6,6],[9,9],[14,18],[19,14],[24,10]]
  for (const [x,y] of flowers) objs.data[y * W + x] = T.FLOWERS

  // Signpost at entrance
  objs.data[12 * W + 2] = T.SIGN

  const map: MapData = {
    id: 'MAP_010', name: '奇妙森林入口', width: W, height: H,
    tileset: 'environment', layers: [ground, objs],
    collisions: [], events: [],
    encounters: ['ENC_FOREST_1', 'ENC_FOREST_2'],
    encounterRate: 0.06, bgm: 'forest', connections: [],
  }

  for (let i = 0; i < objs.data.length; i++) {
    const tile = objs.data[i]
    if (tile && [T.TREE, T.ROCK, T.WATER, T.BUSH].includes(tile)) {
      map.collisions.push(i)
    }
  }

  map.events = [
    {
      id: 'EXIT_WEST', x: 0, y: 10, width: 1, height: 8,
      type: 'transfer', trigger: 'touch',
      actions: [{ type: 'transfer', targetMap: 'MAP_001', targetX: 30, targetY: 12 }],
    },
    {
      id: 'BTL_TRIGGER_1', x: 15, y: 8, width: 5, height: 5,
      type: 'battle', trigger: 'touch',
      actions: [{ type: 'battle', encounterId: 'ENC_FOREST_1' }],
    },
    {
      id: 'FOREST_TUTORIAL', x: 5, y: 12, width: 3, height: 3,
      type: 'trigger', trigger: 'touch',
      actions: [{ type: 'dialogue', dialogueId: 'DIA_101_FOREST' }],
    },
    {
      id: 'CHEST_FOREST_1', x: 8, y: 6, width: 1, height: 1,
      type: 'chest', trigger: 'action',
      actions: [{ type: 'addItem', itemId: 'heal_grass', quantity: 3 }],
    },
  ]

  map.connections = [
    { targetMap: 'MAP_001', targetX: 30, targetY: 12, direction: 3 },
  ]

  return map
}

function buildMap002(): MapData {
  const W = 32
  const H = 24
  const ground = createLayer(W, H, T.GRASS)
  const objs = createLayer(W, H, 0)

  // Path network
  rect(ground, W, 0, 10, 32, 4, T.PATH)
  rect(ground, W, 14, 0, 4, 24, T.PATH)
  rect(ground, W, 0, 18, 32, 4, T.PATH)

  // Well restored
  objs.data[10 * W + 16] = T.WELL

  // Houses active
  objs.data[5 * W + 12] = T.HOUSE
  objs.data[5 * W + 20] = T.HOUSE
  objs.data[15 * W + 6] = T.HOUSE
  objs.data[18 * W + 24] = T.HOUSE

  // Festival plaza
  objs.data[8 * W + 15] = T.RUIN

  // Flowers everywhere
  const flowers: [number, number][] = [[2,2],[4,4],[6,6],[8,8],[20,3],[22,5],[24,7],[26,4],[28,6],[3,20],[5,22],[7,20],[25,20],[27,22],[29,20]]
  for (const [x,y] of flowers) objs.data[y * W + x] = T.FLOWERS

  // Wheat field
  for (let x = 20; x < 30; x++) {
    for (let y = 14; y < 18; y++) {
      if ((x + y) % 2 === 0) objs.data[y * W + x] = T.WHEAT
    }
  }

  // Lamp posts along paths
  objs.data[9 * W + 14] = T.LAMP
  objs.data[9 * W + 17] = T.LAMP
  objs.data[17 * W + 14] = T.LAMP
  objs.data[17 * W + 17] = T.LAMP

  // Benches
  objs.data[11 * W + 15] = T.BENCH
  objs.data[11 * W + 16] = T.BENCH

  const map: MapData = {
    id: 'MAP_002', name: '木桶镇·重建', width: W, height: H,
    tileset: 'environment', layers: [ground, objs],
    collisions: [], events: [], encounters: [], encounterRate: 0,
    bgm: 'town_rebuilt', connections: [],
  }

  for (let i = 0; i < objs.data.length; i++) {
    const tile = objs.data[i]
    if (tile && [T.TREE, T.ROCK, T.HOUSE, T.WELL, T.FENCE, T.BARREL, T.RUIN, T.STUMP, T.WATER, T.BUSH].includes(tile)) {
      map.collisions.push(i)
    }
  }

  map.events = [
    {
      id: 'NPC_PINE', x: 5, y: 8, width: 1, height: 1,
      type: 'npc', trigger: 'action', sprite: 'npc_uncle_boluo', direction: 2,
      actions: [{ type: 'dialogue', dialogueId: 'DIA_202_PINE' }],
    },
    {
      id: 'NPC_MAYOR_2', x: 16, y: 5, width: 1, height: 1,
      type: 'npc', trigger: 'action', sprite: 'npc_mayor', direction: 2,
      actions: [{ type: 'dialogue', dialogueId: 'DIA_203_MAYOR' }],
    },
    {
      id: 'NPC_BARREL_2', x: 15, y: 8, width: 1, height: 1,
      type: 'npc', trigger: 'action', sprite: 'npc_barrel_spirit', direction: 2,
      actions: [{ type: 'dialogue', dialogueId: 'DIA_204_BARREL' }],
    },
    {
      id: 'SHOP_ITEM', x: 18, y: 18, width: 1, height: 1,
      type: 'npc', trigger: 'action', sprite: 'env_signpost', direction: 2,
      actions: [{ type: 'dialogue', dialogueId: 'DIA_205_SHOP' }],
    },
    {
      id: 'TRAIN_GROUND', x: 6, y: 18, width: 2, height: 1,
      type: 'npc', trigger: 'action', sprite: 'env_campfire', direction: 2,
      actions: [{ type: 'dialogue', dialogueId: 'DIA_206_TRAIN' }],
    },
    {
      id: 'EXIT_EAST_2', x: W - 1, y: 10, width: 1, height: 4,
      type: 'transfer', trigger: 'touch',
      actions: [{ type: 'transfer', targetMap: 'MAP_010', targetX: 1, targetY: 12 }],
    },
    {
      id: 'EVT_REBUILD_CEREMONY', x: 14, y: 5, width: 4, height: 3,
      type: 'trigger', trigger: 'action',
      conditions: [{ flag: 'has_all_relics', value: true }],
      actions: [{ type: 'dialogue', dialogueId: 'DIA_305_REBUILD' }],
    },
  ]

  map.connections = [
    { targetMap: 'MAP_010', targetX: 1, targetY: 12, direction: 1 },
  ]

  return map
}

function buildMap011(): MapData {
  const W = 36
  const H = 28
  const ground = createLayer(W, H, T.GRASS)
  const objs = createLayer(W, H, 0)

  // Lake in center
  for (let y = 8; y < 20; y++) {
    for (let x = 10; x < 24; x++) {
      if ((x - 17) * (x - 17) + (y - 14) * (y - 14) < 36) {
        ground.data[y * W + x] = T.WATER
      }
    }
  }

  // Dense trees around
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) {
      if (x < 3 || x >= W - 3 || y < 3 || y >= H - 3) {
        if ((x + y) % 2 !== 0) objs.data[y * W + x] = T.TREE
      }
    }
  }

  // Path from west
  rect(ground, W, 0, 12, 10, 4, T.PATH)
  rect(ground, W, 8, 12, 20, 4, T.PATH)

  // Bridge to lake center
  objs.data[14 * W + 17] = T.BRIDGE
  objs.data[14 * W + 18] = T.BRIDGE

  // Flowers near lake
  const flowers: [number, number][] = [[8,8],[9,9],[26,10],[27,11],[8,18],[9,19],[26,18],[27,19]]
  for (const [x,y] of flowers) objs.data[y * W + x] = T.FLOWERS

  const map: MapData = {
    id: 'MAP_011', name: '奇妙森林围湖', width: W, height: H,
    tileset: 'environment', layers: [ground, objs],
    collisions: [], events: [], encounters: ['ENC_FOREST_2'],
    encounterRate: 0.08, bgm: 'forest', connections: [],
  }

  for (let i = 0; i < objs.data.length; i++) {
    const tile = objs.data[i]
    if (tile && [T.TREE, T.ROCK, T.WATER, T.BUSH].includes(tile)) {
      map.collisions.push(i)
    }
  }

  map.events = [
    {
      id: 'EXIT_WEST_11', x: 0, y: 10, width: 1, height: 8,
      type: 'transfer', trigger: 'touch',
      actions: [{ type: 'transfer', targetMap: 'MAP_010', targetX: 38, targetY: 12 }],
    },
    {
      id: 'EXIT_EAST_11', x: W - 1, y: 10, width: 1, height: 8,
      type: 'transfer', trigger: 'touch',
      actions: [{ type: 'transfer', targetMap: 'MAP_012', targetX: 1, targetY: 10 }],
    },
    {
      id: 'EVT_TIGER', x: 16, y: 12, width: 4, height: 4,
      type: 'battle', trigger: 'touch',
      actions: [{ type: 'battle', encounterId: 'BTL_110' }],
    },
  ]

  map.connections = [
    { targetMap: 'MAP_010', targetX: 38, targetY: 12, direction: 3 },
    { targetMap: 'MAP_012', targetX: 1, targetY: 10, direction: 1 },
  ]

  return map
}

function buildMap012(): MapData {
  const W = 24
  const H = 20
  const ground = createLayer(W, H, T.DIRT)
  const objs = createLayer(W, H, 0)

  // Forest clearing
  rect(ground, W, 4, 4, 16, 12, T.GRASS)

  // Three puzzle trees
  objs.data[6 * W + 6] = T.TREE
  objs.data[6 * W + 12] = T.TREE
  objs.data[6 * W + 18] = T.TREE

  // Ancient altar at center
  objs.data[10 * W + 11] = T.RUIN
  objs.data[10 * W + 12] = T.RUIN

  // Barrels and stumps
  objs.data[8 * W + 5] = T.BARREL
  objs.data[12 * W + 19] = T.STUMP

  // Path from west
  rect(ground, W, 0, 10, 8, 4, T.PATH)

  const map: MapData = {
    id: 'MAP_012', name: '千年树种祭台', width: W, height: H,
    tileset: 'environment', layers: [ground, objs],
    collisions: [], events: [], encounters: ['ENC_FOREST_1'],
    encounterRate: 0.05, bgm: 'forest_mystery', connections: [],
  }

  for (let i = 0; i < objs.data.length; i++) {
    const tile = objs.data[i]
    if (tile && [T.TREE, T.ROCK, T.HOUSE, T.WELL, T.FENCE, T.BARREL, T.RUIN, T.STUMP, T.WATER, T.BUSH].includes(tile)) {
      map.collisions.push(i)
    }
  }

  map.events = [
    {
      id: 'EXIT_WEST_12', x: 0, y: 8, width: 1, height: 6,
      type: 'transfer', trigger: 'touch',
      actions: [{ type: 'transfer', targetMap: 'MAP_011', targetX: 34, targetY: 12 }],
    },
    {
      id: 'EVT_PUZZLE_TREE_1', x: 6, y: 6, width: 1, height: 1,
      type: 'trigger', trigger: 'action',
      actions: [{ type: 'dialogue', dialogueId: 'DIA_105_TREE_1' }],
    },
    {
      id: 'EVT_PUZZLE_TREE_2', x: 12, y: 6, width: 1, height: 1,
      type: 'trigger', trigger: 'action',
      actions: [{ type: 'dialogue', dialogueId: 'DIA_105_TREE_2' }],
    },
    {
      id: 'EVT_PUZZLE_TREE_3', x: 18, y: 6, width: 1, height: 1,
      type: 'trigger', trigger: 'action',
      actions: [{ type: 'dialogue', dialogueId: 'DIA_105_TREE_3' }],
    },
    {
      id: 'EVT_ALTAR', x: 11, y: 10, width: 2, height: 1,
      type: 'trigger', trigger: 'action',
      conditions: [{ flag: 'puzzle_trees_solved', value: true }],
      actions: [{ type: 'dialogue', dialogueId: 'DIA_106_ALTAR' }],
    },
    {
      id: 'EVT_SEED_BOSS', x: 10, y: 12, width: 4, height: 3,
      type: 'battle', trigger: 'touch',
      conditions: [{ flag: 'puzzle_trees_solved', value: true }],
      actions: [{ type: 'battle', encounterId: 'BTL_113' }],
    },
  ]

  map.connections = [
    { targetMap: 'MAP_011', targetX: 34, targetY: 12, direction: 3 },
  ]

  return map
}

function buildMap020(): MapData {
  const W = 40
  const H = 20
  const ground = createLayer(W, H, T.DIRT)
  const objs = createLayer(W, H, 0)

  // Dock planks
  rect(ground, W, 5, 8, 15, 4, T.PATH)
  rect(ground, W, 20, 6, 8, 6, T.PATH)

  // Water
  for (let y = 0; y < H; y++) {
    for (let x = 30; x < W; x++) {
      ground.data[y * W + x] = T.WATER
    }
  }

  // Ship
  objs.data[8 * W + 32] = T.HOUSE
  objs.data[8 * W + 33] = T.HOUSE
  objs.data[9 * W + 32] = T.BRIDGE
  objs.data[9 * W + 33] = T.BRIDGE

  // Barrels on dock
  objs.data[7 * W + 15] = T.BARREL
  objs.data[7 * W + 16] = T.BARREL
  objs.data[8 * W + 15] = T.BARREL

  // Signpost
  objs.data[6 * W + 10] = T.SIGN

  const map: MapData = {
    id: 'MAP_020', name: '码头航路', width: W, height: H,
    tileset: 'environment', layers: [ground, objs],
    collisions: [], events: [], encounters: [], encounterRate: 0,
    bgm: 'dock', connections: [],
  }

  for (let i = 0; i < objs.data.length; i++) {
    const tile = objs.data[i]
    if (tile && [T.TREE, T.ROCK, T.HOUSE, T.WELL, T.FENCE, T.BARREL, T.RUIN, T.STUMP, T.WATER, T.BUSH].includes(tile)) {
      map.collisions.push(i)
    }
  }

  map.events = [
    {
      id: 'NPC_SAILOR', x: 18, y: 8, width: 1, height: 1,
      type: 'npc', trigger: 'action', sprite: 'npc_sailor', direction: 2,
      actions: [{ type: 'dialogue', dialogueId: 'DIA_107_SAILOR' }],
    },
    {
      id: 'EVT_SHIP_TO_HOLY', x: 32, y: 8, width: 2, height: 2,
      type: 'transfer', trigger: 'touch',
      actions: [{ type: 'transfer', targetMap: 'MAP_030', targetX: 2, targetY: 14 }],
    },
    {
      id: 'EXIT_WEST_20', x: 0, y: 8, width: 1, height: 6,
      type: 'transfer', trigger: 'touch',
      actions: [{ type: 'transfer', targetMap: 'MAP_001', targetX: 30, targetY: 12 }],
    },
  ]

  map.connections = [
    { targetMap: 'MAP_001', targetX: 30, targetY: 12, direction: 3 },
    { targetMap: 'MAP_030', targetX: 2, targetY: 14, direction: 1 },
  ]

  return map
}

function buildMap030(): MapData {
  const W = 36
  const H = 28
  const ground = createLayer(W, H, T.DIRT)
  const objs = createLayer(W, H, 0)

  // Crystal-like clearings
  rect(ground, W, 4, 4, 10, 8, T.GRASS)
  rect(ground, W, 20, 4, 12, 8, T.GRASS)
  rect(ground, W, 4, 18, 12, 6, T.GRASS)

  // Paths
  rect(ground, W, 0, 14, 36, 4, T.PATH)
  rect(ground, W, 16, 4, 4, 22, T.PATH)

  // Water channels
  for (let y = 6; y < 22; y++) {
    ground.data[y * W + 8] = T.WATER
    ground.data[y * W + 9] = T.WATER
  }
  objs.data[14 * W + 8] = T.BRIDGE
  objs.data[14 * W + 9] = T.BRIDGE

  // Crystal rocks
  const rocks: [number, number][] = [[5,5],[7,7],[25,5],[27,7],[5,21],[7,23],[25,21],[27,23]]
  for (const [x,y] of rocks) objs.data[y * W + x] = T.ROCK

  // Flowers
  const flowers: [number, number][] = [[6,6],[26,6],[6,22],[26,22],[15,5],[17,25]]
  for (const [x,y] of flowers) objs.data[y * W + x] = T.FLOWERS

  // Sign
  objs.data[14 * W + 2] = T.SIGN

  const map: MapData = {
    id: 'MAP_030', name: '圣水殿外路', width: W, height: H,
    tileset: 'environment', layers: [ground, objs],
    collisions: [], events: [], encounters: ['ENC_HOLY_1', 'ENC_HOLY_2'],
    encounterRate: 0.07, bgm: 'holy_water', connections: [],
  }

  for (let i = 0; i < objs.data.length; i++) {
    const tile = objs.data[i]
    if (tile && [T.TREE, T.ROCK, T.WATER, T.BUSH, T.HOUSE, T.WELL].includes(tile)) {
      map.collisions.push(i)
    }
  }

  map.events = [
    {
      id: 'EXIT_WEST_30', x: 0, y: 12, width: 1, height: 6,
      type: 'transfer', trigger: 'touch',
      actions: [{ type: 'transfer', targetMap: 'MAP_020', targetX: 38, targetY: 8 }],
    },
    {
      id: 'EXIT_NORTH_30', x: 14, y: 0, width: 4, height: 1,
      type: 'transfer', trigger: 'touch',
      actions: [{ type: 'transfer', targetMap: 'MAP_031', targetX: 14, targetY: 18 }],
    },
    {
      id: 'EVT_SHUIYAO_GATE', x: 14, y: 6, width: 4, height: 3,
      type: 'trigger', trigger: 'touch',
      actions: [{ type: 'dialogue', dialogueId: 'DIA_201_SHUIYAO' }],
    },
    {
      id: 'EVT_SHUIYAO_FENGCHI_BOSS', x: 15, y: 7, width: 2, height: 2,
      type: 'battle', trigger: 'touch',
      conditions: [{ flag: 'shuiyao_fengchi_defeated', value: false }],
      actions: [{ type: 'battle', encounterId: 'ENC_SHUIYAO_FENGCHI' }],
    },
    {
      id: 'CHEST_HOLY_1', x: 26, y: 20, width: 1, height: 1,
      type: 'chest', trigger: 'action',
      actions: [{ type: 'addItem', itemId: 'holy_drop', quantity: 2 }],
    },
    {
      id: 'CHEST_HOLY_2', x: 5, y: 6, width: 1, height: 1,
      type: 'chest', trigger: 'action',
      actions: [{ type: 'addItem', itemId: 'antidote', quantity: 3 }],
    },
  ]

  map.connections = [
    { targetMap: 'MAP_020', targetX: 38, targetY: 8, direction: 3 },
    { targetMap: 'MAP_031', targetX: 14, targetY: 18, direction: 0 },
  ]

  return map
}

function buildMap031(): MapData {
  const W = 28
  const H = 20
  const ground = createLayer(W, H, T.DIRT)
  const objs = createLayer(W, H, 0)

  // Hall floor pattern
  rect(ground, W, 2, 2, 24, 16, T.GRASS)
  rect(ground, W, 10, 0, 8, 20, T.PATH)

  // Pillars (trees as pillars)
  const pillars: [number, number][] = [[4,4],[4,8],[4,12],[4,16],[22,4],[22,8],[22,12],[22,16]]
  for (const [x,y] of pillars) objs.data[y * W + x] = T.TREE

  // Altar
  objs.data[10 * W + 13] = T.RUIN

  // Pool
  for (let y = 16; y < 19; y++) {
    for (let x = 10; x < 18; x++) {
      ground.data[y * W + x] = T.WATER
    }
  }

  const map: MapData = {
    id: 'MAP_031', name: '圣水殿大厅', width: W, height: H,
    tileset: 'environment', layers: [ground, objs],
    collisions: [], events: [], encounters: [], encounterRate: 0,
    bgm: 'holy_temple', connections: [],
  }

  for (let i = 0; i < objs.data.length; i++) {
    const tile = objs.data[i]
    if (tile && [T.TREE, T.ROCK, T.HOUSE, T.WELL, T.FENCE, T.BARREL, T.RUIN, T.STUMP, T.WATER, T.BUSH].includes(tile)) {
      map.collisions.push(i)
    }
  }

  map.events = [
    {
      id: 'EXIT_SOUTH_31', x: 10, y: H - 1, width: 8, height: 1,
      type: 'transfer', trigger: 'touch',
      actions: [{ type: 'transfer', targetMap: 'MAP_030', targetX: 16, targetY: 2 }],
    },
    {
      id: 'NPC_XIYUAN', x: 13, y: 8, width: 1, height: 1,
      type: 'npc', trigger: 'action', sprite: 'npc_xiyuan', direction: 2,
      actions: [{ type: 'dialogue', dialogueId: 'DIA_203_XIYUAN' }],
    },
    {
      id: 'EVT_XIYUAN_QUIZ_BATTLE', x: 13, y: 9, width: 1, height: 1,
      type: 'battle', trigger: 'action',
      conditions: [{ flag: 'xiyuan_quiz_completed', value: false }],
      actions: [{ type: 'battle', encounterId: 'ENC_XIYUAN_QUIZ' }],
    },
  ]

  map.connections = [
    { targetMap: 'MAP_030', targetX: 16, targetY: 2, direction: 2 },
  ]

  return map
}

function buildMap040(): MapData {
  const W = 32
  const H = 26
  const ground = createLayer(W, H, T.DIRT)
  const objs = createLayer(W, H, 0)

  // Mountain path zigzag
  rect(ground, W, 0, 20, 32, 4, T.PATH)
  rect(ground, W, 10, 10, 4, 12, T.PATH)
  rect(ground, W, 0, 10, 14, 4, T.PATH)

  // Rocks blocking path (congcong event)
  objs.data[11 * W + 12] = T.ROCK
  objs.data[11 * W + 13] = T.ROCK
  objs.data[12 * W + 12] = T.ROCK
  objs.data[12 * W + 13] = T.ROCK

  // Trees on slopes
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < 6; y++) {
      if ((x + y) % 3 !== 0) objs.data[y * W + x] = T.TREE
    }
  }

  // Mountain rocks
  const rocks: [number, number][] = [[5,5],[8,7],[15,5],[20,6],[25,5],[28,7]]
  for (const [x,y] of rocks) objs.data[y * W + x] = T.ROCK

  // Sign
  objs.data[10 * W + 2] = T.SIGN

  const map: MapData = {
    id: 'MAP_040', name: '神殿山路', width: W, height: H,
    tileset: 'environment', layers: [ground, objs],
    collisions: [], events: [], encounters: ['ENC_MOUNTAIN_1'],
    encounterRate: 0.06, bgm: 'mountain', connections: [],
  }

  for (let i = 0; i < objs.data.length; i++) {
    const tile = objs.data[i]
    if (tile && [T.TREE, T.ROCK, T.HOUSE, T.WELL, T.FENCE, T.BARREL, T.RUIN, T.STUMP, T.WATER, T.BUSH].includes(tile)) {
      map.collisions.push(i)
    }
  }

  map.events = [
    {
      id: 'EXIT_SOUTH_40', x: 0, y: H - 1, width: 8, height: 1,
      type: 'transfer', trigger: 'touch',
      actions: [{ type: 'transfer', targetMap: 'MAP_020', targetX: 18, targetY: 8 }],
    },
    {
      id: 'EXIT_NORTH_40', x: 10, y: 0, width: 4, height: 1,
      type: 'transfer', trigger: 'touch',
      actions: [{ type: 'transfer', targetMap: 'MAP_041', targetX: 14, targetY: 26 }],
    },
    {
      id: 'EVT_CONGCONG_ROCK', x: 12, y: 11, width: 2, height: 2,
      type: 'trigger', trigger: 'touch',
      actions: [{ type: 'dialogue', dialogueId: 'DIA_301_CONGCONG' }],
    },
    {
      id: 'CHEST_MOUNTAIN_1', x: 24, y: 20, width: 1, height: 1,
      type: 'chest', trigger: 'action',
      actions: [{ type: 'addItem', itemId: 'revive_feather', quantity: 1 }],
    },
    {
      id: 'CHEST_MOUNTAIN_2', x: 5, y: 15, width: 1, height: 1,
      type: 'chest', trigger: 'action',
      actions: [{ type: 'addItem', itemId: 'heal_grass', quantity: 5 }],
    },
  ]

  map.connections = [
    { targetMap: 'MAP_020', targetX: 18, targetY: 8, direction: 2 },
    { targetMap: 'MAP_041', targetX: 14, targetY: 26, direction: 0 },
  ]

  return map
}

function buildMap041(): MapData {
  const W = 28
  const H = 28
  const ground = createLayer(W, H, T.DIRT)
  const objs = createLayer(W, H, 0)

  // Seven colored paths (represented by different ground tiles)
  // Red path
  rect(ground, W, 2, 2, 4, 24, T.PATH)
  // Orange path
  rect(ground, W, 6, 2, 4, 24, T.DIRT)
  // Yellow path
  rect(ground, W, 10, 2, 4, 24, T.PATH)
  // Green path
  rect(ground, W, 14, 2, 4, 24, T.GRASS)
  // Blue path
  rect(ground, W, 18, 2, 4, 24, T.PATH)
  // Indigo path
  rect(ground, W, 22, 2, 4, 24, T.DIRT)

  // Flowers along paths
  for (let x = 2; x < W; x += 2) {
    for (let y = 4; y < H; y += 4) {
      if ((x + y) % 3 === 0) objs.data[y * W + x] = T.FLOWERS
    }
  }

  // Trees as maze walls
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < 3; y++) {
      if ((x + y) % 2 !== 0) objs.data[y * W + x] = T.TREE
    }
  }

  const map: MapData = {
    id: 'MAP_041', name: '七色路', width: W, height: H,
    tileset: 'environment', layers: [ground, objs],
    collisions: [], events: [], encounters: ['ENC_MAZE_1'],
    encounterRate: 0.09, bgm: 'mystery', connections: [],
  }

  for (let i = 0; i < objs.data.length; i++) {
    const tile = objs.data[i]
    if (tile && [T.TREE, T.ROCK, T.HOUSE, T.WELL, T.FENCE, T.BARREL, T.RUIN, T.STUMP, T.WATER, T.BUSH].includes(tile)) {
      map.collisions.push(i)
    }
  }

  map.events = [
    {
      id: 'EXIT_SOUTH_41', x: 10, y: H - 1, width: 4, height: 1,
      type: 'transfer', trigger: 'touch',
      actions: [{ type: 'transfer', targetMap: 'MAP_040', targetX: 12, targetY: 2 }],
    },
    {
      id: 'EXIT_NORTH_41', x: 10, y: 0, width: 4, height: 1,
      type: 'transfer', trigger: 'touch',
      actions: [{ type: 'transfer', targetMap: 'MAP_042', targetX: 16, targetY: 22 }],
    },
    {
      id: 'EVT_MIST', x: 10, y: 10, width: 4, height: 4,
      type: 'trigger', trigger: 'touch',
      actions: [{ type: 'dialogue', dialogueId: 'DIA_302_MIST' }],
    },
    {
      id: 'EVT_PHOENIX_GATE', x: 12, y: 4, width: 4, height: 3,
      type: 'trigger', trigger: 'touch',
      actions: [{ type: 'dialogue', dialogueId: 'DIA_303_PHOENIX' }],
    },
    {
      id: 'EVT_PHOENIX_QILIN_BOSS', x: 13, y: 5, width: 2, height: 2,
      type: 'battle', trigger: 'touch',
      conditions: [{ flag: 'phoenix_qilin_defeated', value: false }],
      actions: [{ type: 'battle', encounterId: 'ENC_PHOENIX_QILIN' }],
    },
  ]

  map.connections = [
    { targetMap: 'MAP_040', targetX: 12, targetY: 2, direction: 2 },
    { targetMap: 'MAP_042', targetX: 16, targetY: 22, direction: 0 },
  ]

  return map
}

function buildMap042(): MapData {
  const W = 32
  const H = 24
  const ground = createLayer(W, H, T.GRASS)
  const objs = createLayer(W, H, 0)

  // Temple floor
  rect(ground, W, 4, 4, 24, 16, T.DIRT)
  rect(ground, W, 14, 0, 4, 24, T.PATH)

  // Pillars
  const pillars: [number, number][] = [[6,6],[6,10],[6,14],[6,18],[24,6],[24,10],[24,14],[24,18]]
  for (const [x,y] of pillars) objs.data[y * W + x] = T.TREE

  // Altar / Laurels
  objs.data[6 * W + 15] = T.RUIN

  // Side chambers
  objs.data[10 * W + 4] = T.HOUSE
  objs.data[10 * W + 26] = T.HOUSE

  // Flowers
  const flowers: [number, number][] = [[5,5],[5,19],[25,5],[25,19],[15,5],[15,19]]
  for (const [x,y] of flowers) objs.data[y * W + x] = T.FLOWERS

  const map: MapData = {
    id: 'MAP_042', name: '神殿', width: W, height: H,
    tileset: 'environment', layers: [ground, objs],
    collisions: [], events: [], encounters: [], encounterRate: 0,
    bgm: 'temple', connections: [],
  }

  for (let i = 0; i < objs.data.length; i++) {
    const tile = objs.data[i]
    if (tile && [T.TREE, T.ROCK, T.HOUSE, T.WELL, T.FENCE, T.BARREL, T.RUIN, T.STUMP, T.WATER, T.BUSH].includes(tile)) {
      map.collisions.push(i)
    }
  }

  map.events = [
    {
      id: 'EXIT_SOUTH_42', x: 14, y: H - 1, width: 4, height: 1,
      type: 'transfer', trigger: 'touch',
      actions: [{ type: 'transfer', targetMap: 'MAP_041', targetX: 12, targetY: 2 }],
    },
    {
      id: 'NPC_SUN', x: 15, y: 8, width: 1, height: 1,
      type: 'npc', trigger: 'action', sprite: 'sun_front_idle_01', direction: 2,
      actions: [{ type: 'dialogue', dialogueId: 'DIA_304_TEMPLE' }],
    },
    {
      id: 'EVT_LAUREL', x: 15, y: 5, width: 1, height: 1,
      type: 'trigger', trigger: 'action',
      actions: [{ type: 'dialogue', dialogueId: 'DIA_304_GET_LAUREL' }],
    },
  ]

  map.connections = [
    { targetMap: 'MAP_041', targetX: 12, targetY: 2, direction: 2 },
  ]

  return map
}

function buildMap050(): MapData {
  const W = 36
  const H = 28
  const ground = createLayer(W, H, T.GRASS)
  const objs = createLayer(W, H, 0)

  rect(ground, W, 0, 12, 36, 4, T.PATH)
  rect(ground, W, 16, 4, 4, 20, T.PATH)

  for (let y = 4; y < 12; y++) {
    for (let x = 8; x < 28; x++) {
      ground.data[y * W + x] = T.WATER
    }
  }
  for (let x = 14; x < 22; x++) {
    objs.data[12 * W + x] = T.BRIDGE
  }

  for (let x = 0; x < W; x++) {
    for (let y = 0; y < 3; y++) {
      if ((x + y) % 2 !== 0) objs.data[y * W + x] = T.TREE
    }
  }

  const rocks: [number, number][] = [[5,14],[28,14],[5,20],[28,20],[14,22],[20,22]]
  for (const [x,y] of rocks) objs.data[y * W + x] = T.ROCK

  const map: MapData = {
    id: 'MAP_050', name: '生命之泉入口', width: W, height: H,
    tileset: 'environment', layers: [ground, objs],
    collisions: [], events: [], encounters: ['ENC_FOREST_2'],
    encounterRate: 0.06, bgm: 'life_spring', connections: [],
  }

  for (let i = 0; i < objs.data.length; i++) {
    const tile = objs.data[i]
    if (tile && [T.TREE, T.ROCK, T.WATER, T.BUSH].includes(tile)) {
      map.collisions.push(i)
    }
  }

  map.events = [
    {
      id: 'EXIT_SOUTH_50', x: 0, y: H - 1, width: 6, height: 1,
      type: 'transfer', trigger: 'touch',
      actions: [{ type: 'transfer', targetMap: 'MAP_001', targetX: 30, targetY: 12 }],
    },
    {
      id: 'EXIT_NORTH_51', x: 16, y: 0, width: 4, height: 1,
      type: 'transfer', trigger: 'touch',
      actions: [{ type: 'transfer', targetMap: 'MAP_051', targetX: 12, targetY: 16 }],
    },
    {
      id: 'EXIT_NORTH_52', x: 24, y: 0, width: 4, height: 1,
      type: 'transfer', trigger: 'touch',
      actions: [{ type: 'transfer', targetMap: 'MAP_052', targetX: 11, targetY: 14 }],
    },
    {
      id: 'EXIT_NORTH_53', x: 26, y: 0, width: 4, height: 1,
      type: 'transfer', trigger: 'touch',
      actions: [{ type: 'transfer', targetMap: 'MAP_053', targetX: 14, targetY: 18 }],
    },
    {
      id: 'EXIT_NORTH_54', x: 8, y: 0, width: 4, height: 1,
      type: 'transfer', trigger: 'touch',
      actions: [{ type: 'transfer', targetMap: 'MAP_054', targetX: 13, targetY: 18 }],
    },
    {
      id: 'EXIT_NORTH_55', x: 18, y: 0, width: 4, height: 1,
      type: 'transfer', trigger: 'touch',
      conditions: [{ flag: 'released_four_seals', value: true }],
      actions: [{ type: 'transfer', targetMap: 'MAP_055', targetX: 10, targetY: 13 }],
    },
    {
      id: 'EVT_SPRING_GATE', x: 16, y: 6, width: 4, height: 4,
      type: 'trigger', trigger: 'touch',
      conditions: [{ flag: 'released_four_seals', value: true }],
      actions: [{ type: 'dialogue', dialogueId: 'DIA_401_SPRING' }],
    },
  ]

  map.connections = [
    { targetMap: 'MAP_001', targetX: 30, targetY: 12, direction: 2 },
    { targetMap: 'MAP_051', targetX: 12, targetY: 16, direction: 0 },
    { targetMap: 'MAP_052', targetX: 11, targetY: 14, direction: 0 },
    { targetMap: 'MAP_053', targetX: 14, targetY: 18, direction: 0 },
    { targetMap: 'MAP_054', targetX: 13, targetY: 18, direction: 0 },
    { targetMap: 'MAP_055', targetX: 10, targetY: 13, direction: 0 },
  ]

  return map
}

function buildMap060(): MapData {
  const W = 32
  const H = 26
  const ground = createLayer(W, H, T.DIRT)
  const objs = createLayer(W, H, 0)

  rect(ground, W, 4, 10, 24, 6, T.PATH)
  rect(ground, W, 14, 4, 4, 18, T.PATH)

  for (let x = 0; x < W; x++) {
    for (let y = 0; y < 4; y++) {
      if ((x + y) % 2 !== 0) objs.data[y * W + x] = T.TREE
    }
    for (let y = H - 4; y < H; y++) {
      if ((x + y) % 2 !== 0) objs.data[y * W + x] = T.TREE
    }
  }

  const rocks: [number, number][] = [[6,6],[10,8],[20,6],[24,8],[8,18],[22,18]]
  for (const [x,y] of rocks) objs.data[y * W + x] = T.ROCK

  objs.data[10 * W + 8] = T.BARREL
  objs.data[10 * W + 22] = T.BARREL
  objs.data[14 * W + 8] = T.SIGN

  const map: MapData = {
    id: 'MAP_060', name: '魔宫入口', width: W, height: H,
    tileset: 'environment', layers: [ground, objs],
    collisions: [], events: [], encounters: ['ENC_MAZE_1'],
    encounterRate: 0.08, bgm: 'dark_palace', connections: [],
  }

  for (let i = 0; i < objs.data.length; i++) {
    const tile = objs.data[i]
    if (tile && [T.TREE, T.ROCK, T.HOUSE, T.WELL, T.FENCE, T.BARREL, T.RUIN, T.STUMP, T.WATER, T.BUSH].includes(tile)) {
      map.collisions.push(i)
    }
  }

  map.events = [
    {
      id: 'EXIT_SOUTH_60', x: 0, y: H - 1, width: 6, height: 1,
      type: 'transfer', trigger: 'touch',
      actions: [{ type: 'transfer', targetMap: 'MAP_001', targetX: 30, targetY: 12 }],
    },
    {
      id: 'EXIT_NORTH_60', x: 14, y: 0, width: 4, height: 1,
      type: 'transfer', trigger: 'touch',
      actions: [{ type: 'transfer', targetMap: 'MAP_062', targetX: 16, targetY: 22 }],
    },
    {
      id: 'EXIT_EAST_60', x: W - 1, y: 10, width: 1, height: 4,
      type: 'transfer', trigger: 'touch',
      actions: [{ type: 'transfer', targetMap: 'MAP_061', targetX: 1, targetY: 10 }],
    },
    {
      id: 'EVT_MASK_1', x: 8, y: 12, width: 2, height: 2,
      type: 'trigger', trigger: 'touch',
      actions: [{ type: 'dialogue', dialogueId: 'DIA_501_MASK' }],
    },
  ]

  map.connections = [
    { targetMap: 'MAP_001', targetX: 30, targetY: 12, direction: 2 },
    { targetMap: 'MAP_062', targetX: 16, targetY: 22, direction: 0 },
    { targetMap: 'MAP_061', targetX: 1, targetY: 10, direction: 1 },
  ]

  return map
}

function buildMap062(): MapData {
  const W = 28
  const H = 24
  const ground = createLayer(W, H, T.DIRT)
  const objs = createLayer(W, H, 0)

  rect(ground, W, 2, 2, 24, 20, T.GRASS)
  rect(ground, W, 10, 0, 8, 24, T.PATH)

  const pillars: [number, number][] = [[4,4],[4,8],[4,12],[4,16],[22,4],[22,8],[22,12],[22,16]]
  for (const [x,y] of pillars) objs.data[y * W + x] = T.TREE

  objs.data[8 * W + 13] = T.RUIN
  objs.data[8 * W + 14] = T.RUIN

  const barrels: [number, number][] = [[8,18],[10,18],[8,20],[10,20]]
  for (const [x,y] of barrels) objs.data[y * W + x] = T.BARREL

  const map: MapData = {
    id: 'MAP_062', name: '魔宫大厅', width: W, height: H,
    tileset: 'environment', layers: [ground, objs],
    collisions: [], events: [], encounters: [],
    encounterRate: 0, bgm: 'dark_palace', connections: [],
  }

  for (let i = 0; i < objs.data.length; i++) {
    const tile = objs.data[i]
    if (tile && [T.TREE, T.ROCK, T.HOUSE, T.WELL, T.FENCE, T.BARREL, T.RUIN, T.STUMP, T.WATER, T.BUSH].includes(tile)) {
      map.collisions.push(i)
    }
  }

  map.events = [
    {
      id: 'EXIT_SOUTH_62', x: 10, y: H - 1, width: 8, height: 1,
      type: 'transfer', trigger: 'touch',
      actions: [{ type: 'transfer', targetMap: 'MAP_060', targetX: 16, targetY: 2 }],
    },
    {
      id: 'EXIT_NORTH_62', x: 10, y: 0, width: 8, height: 1,
      type: 'transfer', trigger: 'touch',
      conditions: [{ flag: 'fake_xiaoai_defeated', value: true }],
      actions: [{ type: 'transfer', targetMap: 'MAP_063', targetX: 12, targetY: 16 }],
    },
    {
      id: 'EVT_FAKE_XIAOAI', x: 13, y: 8, width: 2, height: 2,
      type: 'trigger', trigger: 'action',
      actions: [{ type: 'dialogue', dialogueId: 'DIA_503_FAKE_XIAOAI' }],
    },
    {
      id: 'EVT_FAKE_XIAOAI_BOSS', x: 13, y: 10, width: 2, height: 2,
      type: 'battle', trigger: 'action',
      conditions: [{ flag: 'fake_xiaoai_defeated', value: false }],
      actions: [{ type: 'battle', encounterId: 'ENC_FAKE_XIAOAI' }],
    },
  ]

  map.connections = [
    { targetMap: 'MAP_060', targetX: 16, targetY: 2, direction: 2 },
    { targetMap: 'MAP_063', targetX: 12, targetY: 16, direction: 0 },
  ]

  return map
}

function buildMap070(): MapData {
  const W = 30
  const H = 22
  const ground = createLayer(W, H, T.DIRT)
  const objs = createLayer(W, H, 0)

  rect(ground, W, 4, 4, 22, 14, T.GRASS)
  rect(ground, W, 12, 0, 6, 22, T.PATH)

  const pillars: [number, number][] = [[6,6],[6,10],[6,14],[22,6],[22,10],[22,14]]
  for (const [x,y] of pillars) objs.data[y * W + x] = T.TREE

  objs.data[10 * W + 14] = T.RUIN

  const flowers: [number, number][] = [[5,5],[7,7],[21,5],[23,7],[5,15],[21,15]]
  for (const [x,y] of flowers) objs.data[y * W + x] = T.FLOWERS

  const map: MapData = {
    id: 'MAP_070', name: '人心之渊', width: W, height: H,
    tileset: 'environment', layers: [ground, objs],
    collisions: [], events: [], encounters: [],
    encounterRate: 0, bgm: 'wuxiang_battle', connections: [],
  }

  for (let i = 0; i < objs.data.length; i++) {
    const tile = objs.data[i]
    if (tile && [T.TREE, T.ROCK, T.HOUSE, T.WELL, T.FENCE, T.BARREL, T.RUIN, T.STUMP, T.WATER, T.BUSH].includes(tile)) {
      map.collisions.push(i)
    }
  }

  map.events = [
    {
      id: 'EXIT_SOUTH_70', x: 12, y: H - 1, width: 6, height: 1,
      type: 'transfer', trigger: 'touch',
      actions: [{ type: 'transfer', targetMap: 'MAP_001', targetX: 15, targetY: 12 }],
    },
    {
      id: 'EVT_WUXIANG', x: 14, y: 8, width: 2, height: 2,
      type: 'trigger', trigger: 'action',
      actions: [
        { type: 'dialogue', dialogueId: 'DIA_601_WUXIANG' },
        { type: 'battle', encounterId: 'BTL_WUXIANG' },
      ],
    },
  ]

  map.connections = [
    { targetMap: 'MAP_001', targetX: 15, targetY: 12, direction: 2 },
  ]

  return map
}

function buildMap051(): MapData {
  const W = 24
  const H = 18
  const ground = createLayer(W, H, T.WATER)
  const objs = createLayer(W, H, 0)

  // Central island
  rect(ground, W, 6, 4, 12, 10, T.GRASS)

  // Stone paths on island
  rect(ground, W, 10, 0, 4, 4, T.PATH)
  rect(ground, W, 10, 4, 4, 10, T.PATH)
  rect(ground, W, 10, 14, 4, 4, T.PATH)

  // Bridges from edges
  rect(ground, W, 0, 8, 6, 2, T.PATH)
  rect(ground, W, 18, 8, 6, 2, T.PATH)
  objs.data[8 * W + 4] = T.BRIDGE
  objs.data[8 * W + 5] = T.BRIDGE
  objs.data[8 * W + 18] = T.BRIDGE
  objs.data[8 * W + 19] = T.BRIDGE

  // Poison gas markers (bushes represent toxic flora)
  const poisonBushes: [number, number][] = [[7, 5], [8, 6], [14, 5], [15, 6], [7, 11], [8, 12], [14, 11], [15, 12]]
  for (const [x, y] of poisonBushes) objs.data[y * W + x] = T.BUSH

  // Dragon seal altar (center)
  objs.data[8 * W + 11] = T.RUIN
  objs.data[8 * W + 12] = T.RUIN

  // Rocks around water edge
  const rocks: [number, number][] = [[6, 4], [17, 4], [6, 13], [17, 13]]
  for (const [x, y] of rocks) objs.data[y * W + x] = T.ROCK

  // Stumps for atmosphere
  objs.data[6 * W + 8] = T.STUMP
  objs.data[6 * W + 15] = T.STUMP

  // Flowers near water
  const flowers: [number, number][] = [[9, 7], [9, 9], [14, 7], [14, 9]]
  for (const [x, y] of flowers) objs.data[y * W + x] = T.FLOWERS_WHITE

  const map: MapData = {
    id: 'MAP_051', name: '青龙潭', width: W, height: H,
    tileset: 'nature', layers: [ground, objs],
    collisions: [], events: [], encounters: ['ENC_SPRING_POISON'],
    encounterRate: 0.08, bgm: 'life_spring', connections: [],
  }

  for (let i = 0; i < objs.data.length; i++) {
    const tile = objs.data[i]
    if (tile && [T.TREE, T.ROCK, T.WATER, T.BUSH, T.RUIN, T.STUMP].includes(tile)) {
      map.collisions.push(i)
    }
  }
  for (let i = 0; i < ground.data.length; i++) {
    if (ground.data[i] === T.WATER) map.collisions.push(i)
  }

  map.events = [
    {
      id: 'EXIT_SOUTH_51', x: 10, y: H - 1, width: 4, height: 1,
      type: 'transfer', trigger: 'touch',
      actions: [{ type: 'transfer', targetMap: 'MAP_050', targetX: 18, targetY: 8 }],
    },
    {
      id: 'EVT_POISON_GAS', x: 8, y: 6, width: 8, height: 6,
      type: 'trigger', trigger: 'touch',
      conditions: [{ flag: 'seal_qinglong_released', value: false }],
      actions: [
        { type: 'dialogue', dialogueId: 'DIA_511_POISON_GAS' },
        { type: 'setFlag', flag: 'poison_gas_active', value: true },
      ],
    },
    {
      id: 'EVT_DRAGON_SEAL', x: 11, y: 8, width: 2, height: 1,
      type: 'trigger', trigger: 'action',
      conditions: [{ flag: 'seal_qinglong_released', value: false }],
      actions: [
        { type: 'dialogue', dialogueId: 'DIA_512_DRAGON_SEAL' },
        { type: 'battle', encounterId: 'BTL_CHI' },
      ],
    },
    {
      id: 'CHEST_QINGLONG_1', x: 7, y: 5, width: 1, height: 1,
      type: 'chest', trigger: 'action',
      actions: [{ type: 'addItem', itemId: 'antidote', quantity: 3 }],
    },
    {
      id: 'CHEST_QINGLONG_2', x: 16, y: 10, width: 1, height: 1,
      type: 'chest', trigger: 'action',
      actions: [{ type: 'addItem', itemId: 'heal_grass', quantity: 5 }],
    },
  ]

  map.connections = [
    { targetMap: 'MAP_050', targetX: 18, targetY: 8, direction: 2 },
  ]

  return map
}

function buildMap052(): MapData {
  const W = 22
  const H = 16
  const ground = createLayer(W, H, T.DIRT)
  const objs = createLayer(W, H, 0)

  // Cave floor clearing
  rect(ground, W, 3, 2, 16, 12, T.GRASS)

  // Central path
  rect(ground, W, 9, 0, 4, 16, T.PATH)

  // Stalactites (trees as cave columns)
  const columns: [number, number][] = [[4, 3], [4, 7], [4, 11], [17, 3], [17, 7], [17, 11]]
  for (const [x, y] of columns) objs.data[y * W + x] = T.TREE

  // White tiger memorial stones (ruins)
  objs.data[5 * W + 10] = T.RUIN
  objs.data[5 * W + 11] = T.RUIN

  // Rock formations
  const rocks: [number, number][] = [[7, 4], [14, 4], [7, 10], [14, 10]]
  for (const [x, y] of rocks) objs.data[y * W + x] = T.ROCK

  // White flowers (tiger memories)
  const memories: [number, number][] = [[5, 5], [6, 6], [15, 5], [16, 6], [5, 9], [15, 9]]
  for (const [x, y] of memories) objs.data[y * W + x] = T.FLOWERS_WHITE

  // Stumps for abandoned atmosphere
  objs.data[8 * W + 5] = T.STUMP
  objs.data[8 * W + 16] = T.STUMP

  const map: MapData = {
    id: 'MAP_052', name: '白虎穴', width: W, height: H,
    tileset: 'nature', layers: [ground, objs],
    collisions: [], events: [], encounters: ['ENC_SPRING_DARK'],
    encounterRate: 0.07, bgm: 'life_spring', connections: [],
  }

  for (let i = 0; i < objs.data.length; i++) {
    const tile = objs.data[i]
    if (tile && [T.TREE, T.ROCK, T.RUIN, T.STUMP].includes(tile)) {
      map.collisions.push(i)
    }
  }

  map.events = [
    {
      id: 'EXIT_SOUTH_52', x: 9, y: H - 1, width: 4, height: 1,
      type: 'transfer', trigger: 'touch',
      actions: [{ type: 'transfer', targetMap: 'MAP_050', targetX: 18, targetY: 14 }],
    },
    {
      id: 'EVT_WHITE_TIGER_MEMORY', x: 9, y: 4, width: 4, height: 4,
      type: 'trigger', trigger: 'touch',
      conditions: [{ flag: 'seal_baihu_released', value: false }],
      actions: [
        { type: 'dialogue', dialogueId: 'DIA_521_TIGER_MEMORY' },
        { type: 'setFlag', flag: 'charm_active', value: true },
      ],
    },
    {
      id: 'EVT_MEI_BOSS', x: 10, y: 5, width: 2, height: 2,
      type: 'battle', trigger: 'action',
      conditions: [{ flag: 'seal_baihu_released', value: false }],
      actions: [
        { type: 'dialogue', dialogueId: 'DIA_522_MEI_BATTLE' },
        { type: 'battle', encounterId: 'BTL_MEI' },
      ],
    },
    {
      id: 'CHEST_BAIHU_1', x: 5, y: 3, width: 1, height: 1,
      type: 'chest', trigger: 'action',
      actions: [{ type: 'addItem', itemId: 'amulet', quantity: 1 }],
    },
    {
      id: 'CHEST_BAIHU_2', x: 16, y: 10, width: 1, height: 1,
      type: 'chest', trigger: 'action',
      actions: [{ type: 'addItem', itemId: 'holy_drop', quantity: 2 }],
    },
  ]

  map.connections = [
    { targetMap: 'MAP_050', targetX: 18, targetY: 14, direction: 2 },
  ]

  return map
}

function buildMap053(): MapData {
  const W = 28
  const H = 20
  const ground = createLayer(W, H, T.GRASS)
  const objs = createLayer(W, H, 0)

  // Burned patches
  rect(ground, W, 4, 6, 8, 8, T.DIRT)
  rect(ground, W, 16, 4, 8, 10, T.DIRT)

  // Paths
  rect(ground, W, 12, 0, 4, 20, T.PATH)
  rect(ground, W, 0, 10, 28, 4, T.PATH)

  // Dense burning trees on edges
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < 3; y++) {
      if ((x + y) % 2 !== 0) objs.data[y * W + x] = T.TREE
    }
    for (let y = H - 3; y < H; y++) {
      if ((x + y) % 2 !== 0) objs.data[y * W + x] = T.TREE
    }
  }

  // Fire-wind markers (campfires)
  const campfires: [number, number][] = [[6, 7], [8, 11], [18, 7], [20, 11]]
  for (const [x, y] of campfires) objs.data[y * W + x] = T.CAMPFIRE

  // Rocks
  const rocks: [number, number][] = [[3, 5], [24, 5], [3, 14], [24, 14]]
  for (const [x, y] of rocks) objs.data[y * W + x] = T.ROCK

  // Signs
  objs.data[10 * W + 2] = T.SIGN

  // Red flowers
  const flowers: [number, number][] = [[10, 5], [17, 5], [10, 14], [17, 14]]
  for (const [x, y] of flowers) objs.data[y * W + x] = T.FLOWERS

  const map: MapData = {
    id: 'MAP_053', name: '朱雀林', width: W, height: H,
    tileset: 'nature', layers: [ground, objs],
    collisions: [], events: [], encounters: ['ENC_SPRING_FIRE'],
    encounterRate: 0.09, bgm: 'life_spring', connections: [],
  }

  for (let i = 0; i < objs.data.length; i++) {
    const tile = objs.data[i]
    if (tile && [T.TREE, T.ROCK, T.CAMPFIRE].includes(tile)) {
      map.collisions.push(i)
    }
  }

  map.events = [
    {
      id: 'EXIT_SOUTH_53', x: 12, y: H - 1, width: 4, height: 1,
      type: 'transfer', trigger: 'touch',
      actions: [{ type: 'transfer', targetMap: 'MAP_050', targetX: 26, targetY: 8 }],
    },
    {
      id: 'EVT_FLYING_ENEMIES', x: 6, y: 6, width: 6, height: 4,
      type: 'battle', trigger: 'touch',
      actions: [{ type: 'battle', encounterId: 'ENC_SPRING_FLYING' }],
    },
    {
      id: 'EVT_WANG_BOSS', x: 12, y: 5, width: 4, height: 4,
      type: 'battle', trigger: 'touch',
      conditions: [{ flag: 'seal_zhuque_released', value: false }],
      actions: [
        { type: 'dialogue', dialogueId: 'DIA_531_WANG_BATTLE' },
        { type: 'battle', encounterId: 'BTL_WANG' },
      ],
    },
    {
      id: 'CHEST_ZHUQUE_1', x: 4, y: 8, width: 1, height: 1,
      type: 'chest', trigger: 'action',
      actions: [{ type: 'addItem', itemId: 'heal_grass', quantity: 5 }],
    },
    {
      id: 'CHEST_ZHUQUE_2', x: 22, y: 12, width: 1, height: 1,
      type: 'chest', trigger: 'action',
      actions: [{ type: 'addItem', itemId: 'antidote', quantity: 3 }],
    },
  ]

  map.connections = [
    { targetMap: 'MAP_050', targetX: 26, targetY: 8, direction: 2 },
  ]

  return map
}

function buildMap054(): MapData {
  const W = 26
  const H = 20
  const ground = createLayer(W, H, T.DIRT)
  const objs = createLayer(W, H, 0)

  // Temple floor
  rect(ground, W, 3, 2, 20, 16, T.GRASS)
  rect(ground, W, 10, 0, 6, 20, T.PATH)

  // Pillars (heavy stone pillars)
  const pillars: [number, number][] = [
    [5, 4], [5, 8], [5, 12], [5, 16],
    [20, 4], [20, 8], [20, 12], [20, 16],
  ]
  for (const [x, y] of pillars) objs.data[y * W + x] = T.TREE

  // Central altar
  objs.data[9 * W + 12] = T.RUIN
  objs.data[9 * W + 13] = T.RUIN

  // Fire braziers (campfires)
  objs.data[6 * W + 8] = T.CAMPFIRE
  objs.data[6 * W + 17] = T.CAMPFIRE
  objs.data[14 * W + 8] = T.CAMPFIRE
  objs.data[14 * W + 17] = T.CAMPFIRE

  // Rocks (heavy stones)
  const rocks: [number, number][] = [[7, 5], [18, 5], [7, 14], [18, 14]]
  for (const [x, y] of rocks) objs.data[y * W + x] = T.ROCK

  // Barrels (supplies)
  objs.data[16 * W + 6] = T.BARREL
  objs.data[16 * W + 7] = T.BARREL

  // Flowers
  const flowers: [number, number][] = [[4, 3], [21, 3], [4, 17], [21, 17]]
  for (const [x, y] of flowers) objs.data[y * W + x] = T.FLOWERS

  const map: MapData = {
    id: 'MAP_054', name: '玄武殿', width: W, height: H,
    tileset: 'holy', layers: [ground, objs],
    collisions: [], events: [], encounters: ['ENC_SPRING_EARTH'],
    encounterRate: 0.07, bgm: 'life_spring', connections: [],
  }

  for (let i = 0; i < objs.data.length; i++) {
    const tile = objs.data[i]
    if (tile && [T.TREE, T.ROCK, T.CAMPFIRE, T.BARREL, T.RUIN].includes(tile)) {
      map.collisions.push(i)
    }
  }

  map.events = [
    {
      id: 'EXIT_SOUTH_54', x: 10, y: H - 1, width: 6, height: 1,
      type: 'transfer', trigger: 'touch',
      actions: [{ type: 'transfer', targetMap: 'MAP_050', targetX: 8, targetY: 24 }],
    },
    {
      id: 'EVT_LIANG_BOSS', x: 11, y: 8, width: 4, height: 3,
      type: 'battle', trigger: 'action',
      conditions: [{ flag: 'seal_xuanwu_released', value: false }],
      actions: [
        { type: 'dialogue', dialogueId: 'DIA_541_LIANG_BATTLE' },
        { type: 'battle', encounterId: 'BTL_LIANG' },
      ],
    },
    {
      id: 'EVT_GIANT_BEAST_TRAP', x: 8, y: 10, width: 10, height: 4,
      type: 'trigger', trigger: 'touch',
      conditions: [{ flag: 'seal_xuanwu_released', value: false }],
      actions: [{ type: 'dialogue', dialogueId: 'DIA_542_GIANT_BEAST' }],
    },
    {
      id: 'CHEST_XUANWU_1', x: 5, y: 6, width: 1, height: 1,
      type: 'chest', trigger: 'action',
      actions: [{ type: 'addItem', itemId: 'heal_grass', quantity: 8 }],
    },
    {
      id: 'CHEST_XUANWU_2', x: 19, y: 14, width: 1, height: 1,
      type: 'chest', trigger: 'action',
      actions: [{ type: 'addItem', itemId: 'amulet', quantity: 2 }],
    },
  ]

  map.connections = [
    { targetMap: 'MAP_050', targetX: 8, targetY: 24, direction: 2 },
  ]

  return map
}

function buildMap055(): MapData {
  const W = 20
  const H = 15
  const ground = createLayer(W, H, T.GRASS)
  const objs = createLayer(W, H, 0)

  // Dream path
  rect(ground, W, 8, 0, 4, 15, T.PATH)

  // Ethereal clearings
  rect(ground, W, 2, 2, 6, 5, T.DIRT)
  rect(ground, W, 12, 2, 6, 5, T.DIRT)
  rect(ground, W, 2, 8, 6, 5, T.DIRT)
  rect(ground, W, 12, 8, 6, 5, T.DIRT)

  // Dream markers (white flowers for xiaoai memories)
  const dreamFlowers: [number, number][] = [
    [3, 3], [4, 4], [5, 3], [14, 3], [15, 4], [16, 3],
    [3, 9], [4, 10], [5, 9], [14, 9], [15, 10], [16, 9],
    [9, 3], [10, 7], [9, 11],
  ]
  for (const [x, y] of dreamFlowers) objs.data[y * W + x] = T.FLOWERS_WHITE

  // Memory fragments (ruins as memory stones)
  objs.data[4 * W + 9] = T.RUIN
  objs.data[10 * W + 10] = T.RUIN

  // Lamp posts (dream guides)
  objs.data[2 * W + 8] = T.LAMP
  objs.data[7 * W + 11] = T.LAMP
  objs.data[12 * W + 8] = T.LAMP

  const map: MapData = {
    id: 'MAP_055', name: '轮回道', width: W, height: H,
    tileset: 'nature', layers: [ground, objs],
    collisions: [], events: [], encounters: [],
    encounterRate: 0, bgm: 'dream', connections: [],
  }

  for (let i = 0; i < objs.data.length; i++) {
    const tile = objs.data[i]
    if (tile && [T.TREE, T.ROCK, T.RUIN, T.WATER].includes(tile)) {
      map.collisions.push(i)
    }
  }

  map.events = [
    {
      id: 'EXIT_SOUTH_55', x: 8, y: H - 1, width: 4, height: 1,
      type: 'transfer', trigger: 'touch',
      actions: [{ type: 'transfer', targetMap: 'MAP_050', targetX: 18, targetY: 20 }],
    },
    {
      id: 'EVT_DREAM_START', x: 8, y: 2, width: 4, height: 3,
      type: 'trigger', trigger: 'autorun',
      conditions: [{ flag: 'released_four_seals', value: true }],
      actions: [
        { type: 'dialogue', dialogueId: 'DIA_551_DREAM_START' },
        { type: 'setFlag', flag: 'dream_active', value: true },
      ],
    },
    {
      id: 'EVT_MEMORY_1', x: 3, y: 3, width: 2, height: 2,
      type: 'trigger', trigger: 'touch',
      conditions: [{ flag: 'dream_active', value: true }],
      actions: [{ type: 'dialogue', dialogueId: 'DIA_552_MEMORY_1' }],
    },
    {
      id: 'EVT_MEMORY_2', x: 14, y: 3, width: 2, height: 2,
      type: 'trigger', trigger: 'touch',
      conditions: [{ flag: 'dream_active', value: true }],
      actions: [{ type: 'dialogue', dialogueId: 'DIA_553_MEMORY_2' }],
    },
    {
      id: 'EVT_MEMORY_3', x: 3, y: 9, width: 2, height: 2,
      type: 'trigger', trigger: 'touch',
      conditions: [{ flag: 'dream_active', value: true }],
      actions: [{ type: 'dialogue', dialogueId: 'DIA_554_MEMORY_3' }],
    },
    {
      id: 'EVT_MEMORY_FINAL', x: 9, y: 10, width: 2, height: 2,
      type: 'trigger', trigger: 'touch',
      conditions: [{ flag: 'dream_active', value: true }],
      actions: [
        { type: 'dialogue', dialogueId: 'DIA_555_MEMORY_FINAL' },
        { type: 'battle', encounterId: 'BTL_XIAOAI_SHADOW' },
        { type: 'setFlag', flag: 'dream_completed', value: true },
      ],
    },
    {
      id: 'CHEST_DREAM_1', x: 14, y: 9, width: 1, height: 1,
      type: 'chest', trigger: 'action',
      actions: [{ type: 'setFlag', flag: 'xiaoai_memory_fragments', value: 1 }],
    },
  ]

  map.connections = [
    { targetMap: 'MAP_050', targetX: 18, targetY: 20, direction: 2 },
  ]

  return map
}

function buildMap061(): MapData {
  const W = 30
  const H = 22
  const ground = createLayer(W, H, T.WATER)
  const objs = createLayer(W, H, 0)

  // Swamp land masses
  rect(ground, W, 0, 8, 10, 6, T.DIRT)
  rect(ground, W, 10, 4, 10, 14, T.DIRT)
  rect(ground, W, 20, 8, 10, 6, T.DIRT)

  // Paths across swamp
  rect(ground, W, 4, 10, 8, 2, T.PATH)
  rect(ground, W, 14, 8, 8, 2, T.PATH)
  rect(ground, W, 14, 0, 2, 10, T.PATH)

  // Rotting trees (stumps and dead trees)
  const deadTrees: [number, number][] = [
    [2, 9], [3, 11], [7, 9], [8, 12],
    [12, 5], [13, 7], [17, 5], [18, 7],
    [22, 9], [23, 11], [27, 9], [28, 12],
  ]
  for (const [x, y] of deadTrees) objs.data[y * W + x] = T.STUMP

  // Chain mechanism markers (barrels as chain anchors)
  objs.data[10 * W + 6] = T.BARREL
  objs.data[10 * W + 22] = T.BARREL
  objs.data[8 * W + 14] = T.BARREL

  // Rocks
  const rocks: [number, number][] = [[5, 8], [24, 8], [12, 14], [17, 14]]
  for (const [x, y] of rocks) objs.data[y * W + x] = T.ROCK

  // Bushes
  const bushes: [number, number][] = [[3, 10], [7, 12], [22, 10], [26, 12]]
  for (const [x, y] of bushes) objs.data[y * W + x] = T.BUSH

  // Sign
  objs.data[10 * W + 2] = T.SIGN

  const map: MapData = {
    id: 'MAP_061', name: '黑暗沼泽', width: W, height: H,
    tileset: 'dark', layers: [ground, objs],
    collisions: [], events: [], encounters: ['ENC_SWAMP_1'],
    encounterRate: 0.10, bgm: 'dark_palace', connections: [],
  }

  for (let i = 0; i < objs.data.length; i++) {
    const tile = objs.data[i]
    if (tile && [T.TREE, T.ROCK, T.WATER, T.BUSH, T.STUMP, T.BARREL].includes(tile)) {
      map.collisions.push(i)
    }
  }
  for (let i = 0; i < ground.data.length; i++) {
    if (ground.data[i] === T.WATER) map.collisions.push(i)
  }

  map.events = [
    {
      id: 'EXIT_SOUTH_61', x: 0, y: H - 1, width: 4, height: 1,
      type: 'transfer', trigger: 'touch',
      actions: [{ type: 'transfer', targetMap: 'MAP_060', targetX: 16, targetY: 22 }],
    },
    {
      id: 'EXIT_NORTH_61', x: 14, y: 0, width: 2, height: 1,
      type: 'transfer', trigger: 'touch',
      conditions: [{ flag: 'swamp_chains_resolved', value: true }],
      actions: [{ type: 'transfer', targetMap: 'MAP_062', targetX: 14, targetY: 22 }],
    },
    {
      id: 'EVT_CHAIN_1', x: 5, y: 9, width: 2, height: 2,
      type: 'trigger', trigger: 'action',
      actions: [{ type: 'dialogue', dialogueId: 'DIA_611_CHAIN_1' }],
    },
    {
      id: 'EVT_CHAIN_2', x: 13, y: 7, width: 2, height: 2,
      type: 'trigger', trigger: 'action',
      actions: [{ type: 'dialogue', dialogueId: 'DIA_612_CHAIN_2' }],
    },
    {
      id: 'EVT_CHAIN_3', x: 22, y: 9, width: 2, height: 2,
      type: 'trigger', trigger: 'action',
      actions: [
        { type: 'dialogue', dialogueId: 'DIA_613_CHAIN_3' },
        { type: 'setFlag', flag: 'swamp_chains_resolved', value: true },
      ],
    },
    {
      id: 'EVT_SWAMP_AMBUSH', x: 12, y: 10, width: 6, height: 4,
      type: 'battle', trigger: 'touch',
      actions: [{ type: 'battle', encounterId: 'ENC_SWAMP_AMBUSH' }],
    },
    {
      id: 'CHEST_SWAMP_1', x: 3, y: 11, width: 1, height: 1,
      type: 'chest', trigger: 'action',
      actions: [{ type: 'addItem', itemId: 'antidote', quantity: 5 }],
    },
    {
      id: 'CHEST_SWAMP_2', x: 25, y: 10, width: 1, height: 1,
      type: 'chest', trigger: 'action',
      actions: [{ type: 'addItem', itemId: 'heal_grass', quantity: 10 }],
    },
  ]

  map.connections = [
    { targetMap: 'MAP_060', targetX: 16, targetY: 22, direction: 2 },
    { targetMap: 'MAP_062', targetX: 14, targetY: 22, direction: 0 },
  ]

  return map
}

function buildMap063(): MapData {
  const W = 24
  const H = 18
  const ground = createLayer(W, H, T.DIRT)
  const objs = createLayer(W, H, 0)

  // Underground palace floor
  rect(ground, W, 2, 2, 20, 14, T.GRASS)

  // Central aisle
  rect(ground, W, 10, 0, 4, 18, T.PATH)

  // Dark pillars
  const pillars: [number, number][] = [
    [4, 4], [4, 8], [4, 12],
    [19, 4], [19, 8], [19, 12],
  ]
  for (const [x, y] of pillars) objs.data[y * W + x] = T.TREE

  // Dark altar (center)
  objs.data[8 * W + 11] = T.RUIN
  objs.data[8 * W + 12] = T.RUIN

  // Dark braziers
  objs.data[6 * W + 8] = T.CAMPFIRE
  objs.data[6 * W + 15] = T.CAMPFIRE

  // Chains and restraints (barrels)
  objs.data[10 * W + 6] = T.BARREL
  objs.data[10 * W + 17] = T.BARREL

  // Rocks
  const rocks: [number, number][] = [[6, 4], [17, 4], [6, 14], [17, 14]]
  for (const [x, y] of rocks) objs.data[y * W + x] = T.ROCK

  // Dark flowers
  const flowers: [number, number][] = [[3, 3], [20, 3], [3, 15], [20, 15]]
  for (const [x, y] of flowers) objs.data[y * W + x] = T.FLOWERS

  const map: MapData = {
    id: 'MAP_063', name: '地下魔宫', width: W, height: H,
    tileset: 'dark', layers: [ground, objs],
    collisions: [], events: [], encounters: [],
    encounterRate: 0, bgm: 'dark_palace', connections: [],
  }

  for (let i = 0; i < objs.data.length; i++) {
    const tile = objs.data[i]
    if (tile && [T.TREE, T.ROCK, T.CAMPFIRE, T.BARREL, T.RUIN].includes(tile)) {
      map.collisions.push(i)
    }
  }

  map.events = [
    {
      id: 'EXIT_SOUTH_63', x: 10, y: H - 1, width: 4, height: 1,
      type: 'transfer', trigger: 'touch',
      actions: [{ type: 'transfer', targetMap: 'MAP_062', targetX: 14, targetY: 2 }],
    },
    {
      id: 'EVT_XIAOAI_FINAL', x: 10, y: 7, width: 4, height: 3,
      type: 'trigger', trigger: 'action',
      conditions: [{ flag: 'fake_xiaoai_defeated', value: true }],
      actions: [
        { type: 'dialogue', dialogueId: 'DIA_631_XIAOAI_CONFRONT' },
        { type: 'battle', encounterId: 'BTL_XIAOAI_TRUE' },
        { type: 'setFlag', flag: 'xiaoai_purified', value: true },
      ],
    },
    {
      id: 'EVT_PURIFICATION', x: 11, y: 8, width: 2, height: 2,
      type: 'trigger', trigger: 'autorun',
      conditions: [
        { flag: 'xiaoai_purified', value: true },
        { flag: 'purification_scene_shown', value: false },
      ],
      actions: [
        { type: 'dialogue', dialogueId: 'DIA_632_PURIFICATION' },
        { type: 'setFlag', flag: 'purification_scene_shown', value: true },
      ],
    },
    {
      id: 'CHEST_UNDERGROUND_1', x: 5, y: 6, width: 1, height: 1,
      type: 'chest', trigger: 'action',
      actions: [{ type: 'addItem', itemId: 'heal_grass', quantity: 10 }],
    },
  ]

  map.connections = [
    { targetMap: 'MAP_062', targetX: 14, targetY: 2, direction: 2 },
  ]

  return map
}

export const MAPS: Record<string, MapData> = {
  MAP_001: applyRedesignedLayout(buildMap001()),
  MAP_002: applyRedesignedLayout(buildMap002()),
  MAP_010: applyRedesignedLayout(buildMap010()),
  MAP_011: applyRedesignedLayout(buildMap011()),
  MAP_012: applyRedesignedLayout(buildMap012()),
  MAP_020: applyRedesignedLayout(buildMap020()),
  MAP_030: applyRedesignedLayout(buildMap030()),
  MAP_031: applyRedesignedLayout(buildMap031()),
  MAP_040: applyRedesignedLayout(buildMap040()),
  MAP_041: applyRedesignedLayout(buildMap041()),
  MAP_042: applyRedesignedLayout(buildMap042()),
  MAP_050: applyRedesignedLayout(buildMap050()),
  MAP_051: applyRedesignedLayout(buildMap051()),
  MAP_052: applyRedesignedLayout(buildMap052()),
  MAP_053: applyRedesignedLayout(buildMap053()),
  MAP_054: applyRedesignedLayout(buildMap054()),
  MAP_055: applyRedesignedLayout(buildMap055()),
  MAP_060: applyRedesignedLayout(buildMap060()),
  MAP_061: applyRedesignedLayout(buildMap061()),
  MAP_062: applyRedesignedLayout(buildMap062()),
  MAP_063: applyRedesignedLayout(buildMap063()),
  MAP_070: applyRedesignedLayout(buildMap070()),
}

export function getMap(id: string): MapData {
  return MAPS[id] || MAPS['MAP_001']!
}
