export const TILE_SIZE = 32
export const GAME_WIDTH = 960
export const GAME_HEIGHT = 540
export const VIEWPORT_TILES_X = Math.ceil(GAME_WIDTH / TILE_SIZE)
export const VIEWPORT_TILES_Y = Math.ceil(GAME_HEIGHT / TILE_SIZE)

export const DIRECTION = {
  UP: 0,
  RIGHT: 1,
  DOWN: 2,
  LEFT: 3,
} as const

export const START_MAP_ID = 'MAP_001'
export const REDESIGNED_TOWN_START_POSITION = { x: 22, y: 23 } as const
export const START_PLAYER_POSITION = REDESIGNED_TOWN_START_POSITION
export const START_PLAYER_DIRECTION = DIRECTION.DOWN
export const START_PARTY = ['T'] as const
export const RUINED_TOWN_MAP_ID = 'MAP_001'
export const REBUILT_TOWN_MAP_ID = 'MAP_002'
export const TOWN_MAP_IDS = [RUINED_TOWN_MAP_ID, REBUILT_TOWN_MAP_ID] as const
export const REBUILD_VISUAL_MAP_THRESHOLD = 1
export const START_INVENTORY_ITEMS = [
  { itemId: 'heal_grass', quantity: 3 },
  { itemId: 'pineapple_rice', quantity: 1 },
  { itemId: 'antidote', quantity: 2 },
] as const
export const DEFAULT_ENEMY_SPRITE_KEY = 'env_rock_large'
export const MAP_MOVE_SPEED_TILES_PER_SECOND = 4
export const FOLLOWER_MIN_DISTANCE_FACTOR = 0.5

export const MAP_TILE_KEYS = {
  GRASS: 'GRASS',
  DIRT: 'DIRT',
  WATER: 'WATER',
  TREE: 'TREE',
  FLOWERS: 'FLOWERS',
  ROCK: 'ROCK',
  FENCE: 'FENCE',
  BRIDGE: 'BRIDGE',
  HOUSE: 'HOUSE',
  WELL: 'WELL',
  PATH: 'PATH',
  BUSH: 'BUSH',
  STUMP: 'STUMP',
  RUIN: 'RUIN',
  SIGN: 'SIGN',
  BARREL: 'BARREL',
  CAMPFIRE: 'CAMPFIRE',
  BENCH: 'BENCH',
  LAMP: 'LAMP',
  GRASS_CLUMP: 'GRASS_CLUMP',
  FLOWERS_WHITE: 'FLOWERS_WHITE',
  SAPLING: 'SAPLING',
  WHEAT: 'WHEAT',
  CABBAGE: 'CABBAGE',
  FARMLAND: 'FARMLAND',
} as const

export const MAP_ENCOUNTER_RATES = {
  NONE: 0,
  LOW: 0.04,
  STANDARD: 0.06,
  DENSE: 0.08,
  DANGEROUS: 0.1,
} as const

export const REDESIGNED_MAP_LAYOUTS = {
  MAP_001: {
    width: 44, height: 34, baseTile: MAP_TILE_KEYS.DIRT, frameTile: MAP_TILE_KEYS.TREE, frameThickness: 2,
    groundRects: [
      { x: 2, y: 2, width: 16, height: 10, tile: MAP_TILE_KEYS.GRASS },
      { x: 27, y: 2, width: 10, height: 12, tile: MAP_TILE_KEYS.GRASS },
      { x: 4, y: 20, width: 14, height: 10, tile: MAP_TILE_KEYS.GRASS },
      { x: 28, y: 21, width: 12, height: 8, tile: MAP_TILE_KEYS.GRASS },
      { x: 20, y: 0, width: 5, height: 34, tile: MAP_TILE_KEYS.PATH },
      { x: 0, y: 14, width: 44, height: 5, tile: MAP_TILE_KEYS.PATH },
      { x: 8, y: 21, width: 16, height: 4, tile: MAP_TILE_KEYS.PATH },
      { x: 22, y: 14, width: 16, height: 4, tile: MAP_TILE_KEYS.PATH },
      { x: 35, y: 0, width: 3, height: 34, tile: MAP_TILE_KEYS.WATER },
      { x: 19, y: 30, width: 8, height: 4, tile: MAP_TILE_KEYS.WATER },
      { x: 35, y: 15, width: 3, height: 4, tile: MAP_TILE_KEYS.PATH },
      { x: 20, y: 30, width: 5, height: 4, tile: MAP_TILE_KEYS.PATH },
    ],
    objectRects: [
      { x: 6, y: 20, width: 11, height: 1, tile: MAP_TILE_KEYS.FENCE },
      { x: 6, y: 28, width: 11, height: 1, tile: MAP_TILE_KEYS.FENCE },
      { x: 6, y: 20, width: 1, height: 9, tile: MAP_TILE_KEYS.FENCE },
      { x: 16, y: 20, width: 1, height: 9, tile: MAP_TILE_KEYS.FENCE },
      { x: 8, y: 22, width: 7, height: 5, tile: MAP_TILE_KEYS.FARMLAND },
    ],
    objectClearRects: [
      { x: 20, y: 0, width: 5, height: 2 },
      { x: 0, y: 14, width: 2, height: 6 },
      { x: 0, y: 24, width: 2, height: 6 },
      { x: 35, y: 15, width: 3, height: 4 },
      { x: 42, y: 14, width: 2, height: 6 },
      { x: 20, y: 32, width: 5, height: 2 },
    ],
    objects: [
      { x: 22, y: 7, tile: MAP_TILE_KEYS.RUIN }, { x: 22, y: 16, tile: MAP_TILE_KEYS.RUIN },
      { x: 22, y: 25, tile: MAP_TILE_KEYS.HOUSE }, { x: 10, y: 21, tile: MAP_TILE_KEYS.HOUSE },
      { x: 31, y: 22, tile: MAP_TILE_KEYS.RUIN }, { x: 15, y: 9, tile: MAP_TILE_KEYS.WELL },
      { x: 20, y: 15, tile: MAP_TILE_KEYS.BARREL }, { x: 24, y: 15, tile: MAP_TILE_KEYS.BARREL },
      { x: 35, y: 15, tile: MAP_TILE_KEYS.BRIDGE }, { x: 36, y: 16, tile: MAP_TILE_KEYS.BRIDGE }, { x: 37, y: 17, tile: MAP_TILE_KEYS.BRIDGE },
      { x: 21, y: 30, tile: MAP_TILE_KEYS.BRIDGE }, { x: 23, y: 30, tile: MAP_TILE_KEYS.BRIDGE },
      { x: 3, y: 16, tile: MAP_TILE_KEYS.SIGN }, { x: 40, y: 16, tile: MAP_TILE_KEYS.SIGN }, { x: 22, y: 3, tile: MAP_TILE_KEYS.SIGN },
    ],
    eventPositions: {
      EVT_START: { x: 22, y: 23, width: 1, height: 1 }, NPC_HUIHUI: { x: 24, y: 17, width: 1, height: 1 },
      NPC_A: { x: 20, y: 17, width: 1, height: 1 }, NPC_MAYOR: { x: 22, y: 8, width: 1, height: 1 },
      NPC_BARREL: { x: 21, y: 15, width: 1, height: 1 }, EVT_FESTIVAL: { x: 20, y: 13, width: 5, height: 4 },
    },
    transfers: [
      { id: 'EXIT_EAST', x: 43, y: 14, width: 1, height: 5, targetMap: 'MAP_010', targetX: 2, targetY: 16, direction: DIRECTION.RIGHT },
      { id: 'EXIT_SOUTH_DOCK', x: 20, y: 33, width: 5, height: 1, targetMap: 'MAP_020', targetX: 4, targetY: 15, direction: DIRECTION.DOWN },
      { id: 'EXIT_NORTH_MOUNTAIN', x: 20, y: 0, width: 5, height: 1, targetMap: 'MAP_040', targetX: 20, targetY: 27, direction: DIRECTION.UP },
      { id: 'EXIT_WEST_SPRING', x: 0, y: 14, width: 1, height: 6, targetMap: 'MAP_050', targetX: 38, targetY: 16, direction: DIRECTION.LEFT },
      { id: 'EXIT_WEST_DARK', x: 0, y: 24, width: 1, height: 6, targetMap: 'MAP_060', targetX: 35, targetY: 25, direction: DIRECTION.LEFT },
    ],
    encounters: [], encounterRate: MAP_ENCOUNTER_RATES.NONE,
  },
  MAP_002: {
    width: 44, height: 34, baseTile: MAP_TILE_KEYS.GRASS, frameTile: MAP_TILE_KEYS.TREE, frameThickness: 2,
    groundRects: [
      { x: 20, y: 0, width: 5, height: 34, tile: MAP_TILE_KEYS.PATH },
      { x: 0, y: 14, width: 44, height: 5, tile: MAP_TILE_KEYS.PATH },
      { x: 8, y: 21, width: 16, height: 4, tile: MAP_TILE_KEYS.PATH },
      { x: 24, y: 21, width: 12, height: 4, tile: MAP_TILE_KEYS.PATH },
      { x: 35, y: 0, width: 3, height: 34, tile: MAP_TILE_KEYS.WATER },
      { x: 19, y: 30, width: 8, height: 4, tile: MAP_TILE_KEYS.WATER },
      { x: 35, y: 15, width: 3, height: 4, tile: MAP_TILE_KEYS.PATH },
      { x: 20, y: 30, width: 5, height: 4, tile: MAP_TILE_KEYS.PATH },
      { x: 8, y: 22, width: 7, height: 5, tile: MAP_TILE_KEYS.FARMLAND },
    ],
    objectRects: [
      { x: 6, y: 20, width: 11, height: 1, tile: MAP_TILE_KEYS.FENCE },
      { x: 6, y: 28, width: 11, height: 1, tile: MAP_TILE_KEYS.FENCE },
      { x: 6, y: 20, width: 1, height: 9, tile: MAP_TILE_KEYS.FENCE },
      { x: 16, y: 20, width: 1, height: 9, tile: MAP_TILE_KEYS.FENCE },
      { x: 8, y: 23, width: 7, height: 3, tile: MAP_TILE_KEYS.WHEAT },
    ],
    objectClearRects: [
      { x: 20, y: 0, width: 5, height: 2 }, { x: 0, y: 14, width: 2, height: 6 },
      { x: 0, y: 24, width: 2, height: 6 }, { x: 35, y: 15, width: 3, height: 4 },
      { x: 42, y: 14, width: 2, height: 6 }, { x: 20, y: 32, width: 5, height: 2 },
    ],
    objects: [
      { x: 22, y: 7, tile: MAP_TILE_KEYS.HOUSE }, { x: 22, y: 16, tile: MAP_TILE_KEYS.RUIN },
      { x: 22, y: 25, tile: MAP_TILE_KEYS.HOUSE }, { x: 10, y: 21, tile: MAP_TILE_KEYS.HOUSE },
      { x: 31, y: 22, tile: MAP_TILE_KEYS.HOUSE }, { x: 28, y: 22, tile: MAP_TILE_KEYS.BENCH },
      { x: 15, y: 9, tile: MAP_TILE_KEYS.WELL }, { x: 19, y: 13, tile: MAP_TILE_KEYS.LAMP }, { x: 25, y: 13, tile: MAP_TILE_KEYS.LAMP },
      { x: 19, y: 19, tile: MAP_TILE_KEYS.LAMP }, { x: 25, y: 19, tile: MAP_TILE_KEYS.LAMP },
      { x: 35, y: 15, tile: MAP_TILE_KEYS.BRIDGE }, { x: 36, y: 16, tile: MAP_TILE_KEYS.BRIDGE }, { x: 37, y: 17, tile: MAP_TILE_KEYS.BRIDGE },
      { x: 21, y: 30, tile: MAP_TILE_KEYS.BRIDGE }, { x: 23, y: 30, tile: MAP_TILE_KEYS.BRIDGE },
      { x: 3, y: 16, tile: MAP_TILE_KEYS.SIGN }, { x: 40, y: 16, tile: MAP_TILE_KEYS.SIGN }, { x: 22, y: 3, tile: MAP_TILE_KEYS.SIGN },
    ],
    eventPositions: {
      NPC_PINE: { x: 10, y: 22, width: 1, height: 1 }, NPC_MAYOR_2: { x: 22, y: 8, width: 1, height: 1 },
      NPC_BARREL_2: { x: 22, y: 16, width: 1, height: 1 }, SHOP_ITEM: { x: 31, y: 23, width: 1, height: 1 },
      TRAIN_GROUND: { x: 12, y: 28, width: 2, height: 1 }, EVT_REBUILD_CEREMONY: { x: 19, y: 13, width: 7, height: 6 },
    },
    transfers: [
      { id: 'EXIT_EAST_2', x: 43, y: 14, width: 1, height: 5, targetMap: 'MAP_010', targetX: 2, targetY: 16, direction: DIRECTION.RIGHT },
      { id: 'EXIT_SOUTH_DOCK_2', x: 20, y: 33, width: 5, height: 1, targetMap: 'MAP_020', targetX: 4, targetY: 15, direction: DIRECTION.DOWN },
      { id: 'EXIT_NORTH_MOUNTAIN_2', x: 20, y: 0, width: 5, height: 1, targetMap: 'MAP_040', targetX: 20, targetY: 27, direction: DIRECTION.UP },
      { id: 'EXIT_WEST_SPRING_2', x: 0, y: 14, width: 1, height: 6, targetMap: 'MAP_050', targetX: 38, targetY: 16, direction: DIRECTION.LEFT },
      { id: 'EXIT_WEST_DARK_2', x: 0, y: 24, width: 1, height: 6, targetMap: 'MAP_060', targetX: 35, targetY: 25, direction: DIRECTION.LEFT },
    ],
    encounters: [], encounterRate: MAP_ENCOUNTER_RATES.NONE,
  },
  MAP_010: {
    width: 46, height: 30, baseTile: MAP_TILE_KEYS.GRASS, frameTile: MAP_TILE_KEYS.TREE, frameThickness: 2,
    groundRects: [
      { x: 0, y: 14, width: 30, height: 5, tile: MAP_TILE_KEYS.PATH }, { x: 26, y: 10, width: 20, height: 5, tile: MAP_TILE_KEYS.PATH },
      { x: 14, y: 4, width: 3, height: 24, tile: MAP_TILE_KEYS.WATER }, { x: 14, y: 15, width: 3, height: 3, tile: MAP_TILE_KEYS.PATH },
    ],
    objectRects: [{ x: 30, y: 3, width: 12, height: 6, tile: MAP_TILE_KEYS.BUSH }, { x: 5, y: 22, width: 10, height: 4, tile: MAP_TILE_KEYS.GRASS_CLUMP }],
    objectClearRects: [{ x: 0, y: 14, width: 2, height: 5 }, { x: 44, y: 10, width: 2, height: 6 }, { x: 14, y: 15, width: 3, height: 3 }],
    objects: [
      { x: 14, y: 15, tile: MAP_TILE_KEYS.BRIDGE }, { x: 15, y: 16, tile: MAP_TILE_KEYS.BRIDGE }, { x: 16, y: 17, tile: MAP_TILE_KEYS.BRIDGE },
      { x: 6, y: 14, tile: MAP_TILE_KEYS.SIGN }, { x: 20, y: 11, tile: MAP_TILE_KEYS.ROCK }, { x: 35, y: 18, tile: MAP_TILE_KEYS.ROCK },
      { x: 10, y: 8, tile: MAP_TILE_KEYS.FLOWERS }, { x: 24, y: 22, tile: MAP_TILE_KEYS.FLOWERS_WHITE },
    ],
    eventPositions: { BTL_TRIGGER_1: { x: 18, y: 11, width: 6, height: 5 }, FOREST_TUTORIAL: { x: 6, y: 14, width: 3, height: 3 }, CHEST_FOREST_1: { x: 12, y: 8, width: 1, height: 1 } },
    transfers: [
      { id: 'EXIT_WEST', x: 0, y: 14, width: 1, height: 5, targetMap: 'MAP_001', targetX: 41, targetY: 16, direction: DIRECTION.LEFT },
      { id: 'EXIT_EAST_10', x: 45, y: 10, width: 1, height: 6, targetMap: 'MAP_011', targetX: 2, targetY: 14, direction: DIRECTION.RIGHT },
    ],
    encounters: ['ENC_FOREST_1', 'ENC_FOREST_2'], encounterRate: MAP_ENCOUNTER_RATES.STANDARD,
  },
  MAP_011: {
    width: 42, height: 30, baseTile: MAP_TILE_KEYS.GRASS, frameTile: MAP_TILE_KEYS.TREE, frameThickness: 2,
    groundRects: [
      { x: 0, y: 13, width: 42, height: 5, tile: MAP_TILE_KEYS.PATH }, { x: 15, y: 6, width: 12, height: 10, tile: MAP_TILE_KEYS.WATER },
      { x: 26, y: 13, width: 6, height: 5, tile: MAP_TILE_KEYS.PATH },
    ],
    objectRects: [{ x: 6, y: 5, width: 7, height: 5, tile: MAP_TILE_KEYS.BUSH }, { x: 30, y: 20, width: 7, height: 4, tile: MAP_TILE_KEYS.GRASS_CLUMP }],
    objectClearRects: [{ x: 0, y: 13, width: 2, height: 6 }, { x: 40, y: 13, width: 2, height: 6 }],
    objects: [{ x: 17, y: 14, tile: MAP_TILE_KEYS.BRIDGE }, { x: 24, y: 14, tile: MAP_TILE_KEYS.BRIDGE }, { x: 24, y: 18, tile: MAP_TILE_KEYS.ROCK }, { x: 29, y: 14, tile: MAP_TILE_KEYS.SIGN }],
    eventPositions: { EVT_TIGER: { x: 24, y: 15, width: 5, height: 5 } },
    transfers: [
      { id: 'EXIT_WEST_11', x: 0, y: 13, width: 1, height: 6, targetMap: 'MAP_010', targetX: 43, targetY: 13, direction: DIRECTION.LEFT },
      { id: 'EXIT_EAST_11', x: 41, y: 13, width: 1, height: 6, targetMap: 'MAP_012', targetX: 2, targetY: 13, direction: DIRECTION.RIGHT },
    ],
    encounters: ['ENC_FOREST_2'], encounterRate: MAP_ENCOUNTER_RATES.STANDARD,
  },
  MAP_012: {
    width: 34, height: 26, baseTile: MAP_TILE_KEYS.GRASS, frameTile: MAP_TILE_KEYS.TREE, frameThickness: 2,
    groundRects: [{ x: 0, y: 12, width: 34, height: 5, tile: MAP_TILE_KEYS.PATH }, { x: 14, y: 5, width: 6, height: 11, tile: MAP_TILE_KEYS.PATH }],
    objectRects: [{ x: 8, y: 5, width: 18, height: 3, tile: MAP_TILE_KEYS.SAPLING }],
    objectClearRects: [{ x: 0, y: 12, width: 2, height: 6 }],
    objects: [{ x: 16, y: 10, tile: MAP_TILE_KEYS.RUIN }, { x: 10, y: 7, tile: MAP_TILE_KEYS.SAPLING }, { x: 17, y: 7, tile: MAP_TILE_KEYS.SAPLING }, { x: 24, y: 7, tile: MAP_TILE_KEYS.SAPLING }],
    eventPositions: {
      EVT_PUZZLE_TREE_1: { x: 10, y: 7, width: 1, height: 1 }, EVT_PUZZLE_TREE_2: { x: 17, y: 7, width: 1, height: 1 },
      EVT_PUZZLE_TREE_3: { x: 24, y: 7, width: 1, height: 1 }, EVT_ALTAR: { x: 15, y: 10, width: 3, height: 2 },
      EVT_SEED_BOSS: { x: 14, y: 12, width: 6, height: 4 },
    },
    transfers: [{ id: 'EXIT_WEST_12', x: 0, y: 12, width: 1, height: 6, targetMap: 'MAP_011', targetX: 39, targetY: 15, direction: DIRECTION.LEFT }],
    encounters: ['ENC_FOREST_1'], encounterRate: MAP_ENCOUNTER_RATES.LOW,
  },
  MAP_020: {
    width: 42, height: 28, baseTile: MAP_TILE_KEYS.WATER, frameTile: MAP_TILE_KEYS.ROCK, frameThickness: 1,
    groundRects: [{ x: 0, y: 13, width: 42, height: 5, tile: MAP_TILE_KEYS.PATH }, { x: 4, y: 6, width: 8, height: 16, tile: MAP_TILE_KEYS.DIRT }, { x: 30, y: 8, width: 8, height: 12, tile: MAP_TILE_KEYS.DIRT }],
    objectClearRects: [{ x: 0, y: 13, width: 2, height: 6 }, { x: 40, y: 10, width: 2, height: 6 }],
    objects: [{ x: 8, y: 15, tile: MAP_TILE_KEYS.BRIDGE }, { x: 18, y: 15, tile: MAP_TILE_KEYS.BRIDGE }, { x: 32, y: 12, tile: MAP_TILE_KEYS.BRIDGE }, { x: 20, y: 14, tile: MAP_TILE_KEYS.SIGN }, { x: 34, y: 12, tile: MAP_TILE_KEYS.BARREL }],
    eventPositions: { NPC_SAILOR: { x: 20, y: 15, width: 1, height: 1 }, EVT_SHIP_TO_HOLY: { x: 36, y: 11, width: 3, height: 3 } },
    transfers: [
      { id: 'EXIT_WEST_20', x: 0, y: 13, width: 1, height: 6, targetMap: 'MAP_001', targetX: 22, targetY: 31, direction: DIRECTION.LEFT },
      { id: 'EVT_SHIP_TO_HOLY', x: 40, y: 10, width: 2, height: 6, targetMap: 'MAP_030', targetX: 2, targetY: 15, direction: DIRECTION.RIGHT },
    ],
    encounters: [], encounterRate: MAP_ENCOUNTER_RATES.NONE,
  },
  MAP_030: {
    width: 40, height: 30, baseTile: MAP_TILE_KEYS.DIRT, frameTile: MAP_TILE_KEYS.ROCK, frameThickness: 2,
    groundRects: [{ x: 0, y: 14, width: 40, height: 5, tile: MAP_TILE_KEYS.PATH }, { x: 18, y: 0, width: 5, height: 18, tile: MAP_TILE_KEYS.PATH }, { x: 18, y: 5, width: 6, height: 8, tile: MAP_TILE_KEYS.WATER }],
    objectClearRects: [{ x: 0, y: 14, width: 2, height: 6 }, { x: 18, y: 0, width: 5, height: 2 }],
    objects: [{ x: 20, y: 7, tile: MAP_TILE_KEYS.RUIN }, { x: 17, y: 10, tile: MAP_TILE_KEYS.LAMP }, { x: 24, y: 10, tile: MAP_TILE_KEYS.LAMP }, { x: 29, y: 21, tile: MAP_TILE_KEYS.BARREL }, { x: 7, y: 8, tile: MAP_TILE_KEYS.BARREL }],
    eventPositions: { EVT_SHUIYAO_GATE: { x: 17, y: 7, width: 7, height: 4 }, EVT_SHUIYAO_FENGCHI_BOSS: { x: 19, y: 9, width: 3, height: 3 }, CHEST_HOLY_1: { x: 29, y: 21, width: 1, height: 1 }, CHEST_HOLY_2: { x: 7, y: 8, width: 1, height: 1 } },
    transfers: [
      { id: 'EXIT_WEST_30', x: 0, y: 14, width: 1, height: 6, targetMap: 'MAP_020', targetX: 38, targetY: 13, direction: DIRECTION.LEFT },
      { id: 'EXIT_NORTH_30', x: 18, y: 0, width: 5, height: 1, targetMap: 'MAP_031', targetX: 16, targetY: 25, direction: DIRECTION.UP },
    ],
    encounters: ['ENC_HOLY_1', 'ENC_HOLY_2'], encounterRate: MAP_ENCOUNTER_RATES.STANDARD,
  },
  MAP_031: {
    width: 34, height: 28, baseTile: MAP_TILE_KEYS.PATH, frameTile: MAP_TILE_KEYS.ROCK, frameThickness: 2,
    groundRects: [{ x: 10, y: 6, width: 14, height: 12, tile: MAP_TILE_KEYS.DIRT }, { x: 14, y: 18, width: 6, height: 10, tile: MAP_TILE_KEYS.PATH }],
    objectClearRects: [{ x: 14, y: 26, width: 6, height: 2 }],
    objects: [{ x: 16, y: 7, tile: MAP_TILE_KEYS.RUIN }, { x: 13, y: 11, tile: MAP_TILE_KEYS.LAMP }, { x: 20, y: 11, tile: MAP_TILE_KEYS.LAMP }],
    eventPositions: { NPC_XIYUAN: { x: 16, y: 10, width: 1, height: 1 }, EVT_XIYUAN_QUIZ_BATTLE: { x: 16, y: 12, width: 2, height: 2 } },
    transfers: [{ id: 'EXIT_SOUTH_31', x: 14, y: 27, width: 6, height: 1, targetMap: 'MAP_030', targetX: 20, targetY: 2, direction: DIRECTION.DOWN }],
    encounters: [], encounterRate: MAP_ENCOUNTER_RATES.NONE,
  },
  MAP_040: {
    width: 40, height: 30, baseTile: MAP_TILE_KEYS.DIRT, frameTile: MAP_TILE_KEYS.ROCK, frameThickness: 2,
    groundRects: [{ x: 18, y: 0, width: 5, height: 30, tile: MAP_TILE_KEYS.PATH }, { x: 10, y: 11, width: 14, height: 4, tile: MAP_TILE_KEYS.PATH }, { x: 23, y: 18, width: 8, height: 4, tile: MAP_TILE_KEYS.PATH }],
    objectClearRects: [{ x: 18, y: 0, width: 5, height: 2 }, { x: 18, y: 28, width: 5, height: 2 }],
    objects: [{ x: 15, y: 12, tile: MAP_TILE_KEYS.ROCK }, { x: 26, y: 20, tile: MAP_TILE_KEYS.BARREL }, { x: 8, y: 16, tile: MAP_TILE_KEYS.BARREL }, { x: 20, y: 4, tile: MAP_TILE_KEYS.SIGN }],
    eventPositions: { EVT_CONGCONG_ROCK: { x: 14, y: 12, width: 3, height: 3 }, CHEST_MOUNTAIN_1: { x: 26, y: 20, width: 1, height: 1 }, CHEST_MOUNTAIN_2: { x: 8, y: 16, width: 1, height: 1 } },
    transfers: [
      { id: 'EXIT_SOUTH_40', x: 18, y: 29, width: 5, height: 1, targetMap: 'MAP_001', targetX: 22, targetY: 2, direction: DIRECTION.DOWN },
      { id: 'EXIT_NORTH_40', x: 18, y: 0, width: 5, height: 1, targetMap: 'MAP_041', targetX: 18, targetY: 27, direction: DIRECTION.UP },
    ],
    encounters: ['ENC_MOUNTAIN_1'], encounterRate: MAP_ENCOUNTER_RATES.STANDARD,
  },
  MAP_041: {
    width: 36, height: 30, baseTile: MAP_TILE_KEYS.GRASS, frameTile: MAP_TILE_KEYS.BUSH, frameThickness: 2,
    groundRects: [{ x: 16, y: 0, width: 5, height: 30, tile: MAP_TILE_KEYS.PATH }, { x: 9, y: 9, width: 18, height: 5, tile: MAP_TILE_KEYS.PATH }, { x: 13, y: 3, width: 10, height: 6, tile: MAP_TILE_KEYS.PATH }],
    objectClearRects: [{ x: 16, y: 0, width: 5, height: 2 }, { x: 16, y: 28, width: 5, height: 2 }],
    objects: [{ x: 14, y: 10, tile: MAP_TILE_KEYS.FLOWERS }, { x: 18, y: 10, tile: MAP_TILE_KEYS.FLOWERS_WHITE }, { x: 22, y: 10, tile: MAP_TILE_KEYS.FLOWERS }, { x: 18, y: 5, tile: MAP_TILE_KEYS.RUIN }],
    eventPositions: { EVT_MIST: { x: 14, y: 10, width: 8, height: 5 }, EVT_PHOENIX_GATE: { x: 15, y: 4, width: 7, height: 4 }, EVT_PHOENIX_QILIN_BOSS: { x: 17, y: 6, width: 3, height: 3 } },
    transfers: [
      { id: 'EXIT_SOUTH_41', x: 16, y: 29, width: 5, height: 1, targetMap: 'MAP_040', targetX: 20, targetY: 2, direction: DIRECTION.DOWN },
      { id: 'EXIT_NORTH_41', x: 16, y: 0, width: 5, height: 1, targetMap: 'MAP_042', targetX: 16, targetY: 24, direction: DIRECTION.UP },
    ],
    encounters: ['ENC_MAZE_1'], encounterRate: MAP_ENCOUNTER_RATES.LOW,
  },
  MAP_042: {
    width: 34, height: 28, baseTile: MAP_TILE_KEYS.PATH, frameTile: MAP_TILE_KEYS.ROCK, frameThickness: 2,
    groundRects: [{ x: 12, y: 5, width: 10, height: 18, tile: MAP_TILE_KEYS.DIRT }, { x: 14, y: 20, width: 6, height: 8, tile: MAP_TILE_KEYS.PATH }],
    objectClearRects: [{ x: 14, y: 26, width: 6, height: 2 }],
    objects: [{ x: 17, y: 6, tile: MAP_TILE_KEYS.RUIN }, { x: 14, y: 9, tile: MAP_TILE_KEYS.LAMP }, { x: 20, y: 9, tile: MAP_TILE_KEYS.LAMP }, { x: 17, y: 4, tile: MAP_TILE_KEYS.SAPLING }],
    eventPositions: { NPC_SUN: { x: 17, y: 10, width: 1, height: 1 }, EVT_LAUREL: { x: 17, y: 6, width: 1, height: 1 } },
    transfers: [{ id: 'EXIT_SOUTH_42', x: 14, y: 27, width: 6, height: 1, targetMap: 'MAP_041', targetX: 18, targetY: 2, direction: DIRECTION.DOWN }],
    encounters: [], encounterRate: MAP_ENCOUNTER_RATES.NONE,
  },
  MAP_050: {
    width: 42, height: 30, baseTile: MAP_TILE_KEYS.GRASS, frameTile: MAP_TILE_KEYS.TREE, frameThickness: 2,
    groundRects: [{ x: 18, y: 0, width: 6, height: 30, tile: MAP_TILE_KEYS.PATH }, { x: 0, y: 13, width: 42, height: 5, tile: MAP_TILE_KEYS.PATH }, { x: 12, y: 8, width: 18, height: 12, tile: MAP_TILE_KEYS.WATER }, { x: 18, y: 13, width: 6, height: 5, tile: MAP_TILE_KEYS.PATH }],
    objectClearRects: [{ x: 18, y: 0, width: 6, height: 2 }, { x: 40, y: 13, width: 2, height: 6 }, { x: 0, y: 6, width: 2, height: 5 }, { x: 20, y: 28, width: 6, height: 2 }],
    objects: [{ x: 21, y: 15, tile: MAP_TILE_KEYS.RUIN }, { x: 13, y: 2, tile: MAP_TILE_KEYS.SIGN }, { x: 21, y: 2, tile: MAP_TILE_KEYS.SIGN }, { x: 30, y: 2, tile: MAP_TILE_KEYS.SIGN }, { x: 2, y: 8, tile: MAP_TILE_KEYS.SIGN }, { x: 22, y: 27, tile: MAP_TILE_KEYS.SIGN }],
    eventPositions: { EVT_SPRING_GATE: { x: 18, y: 12, width: 8, height: 6 } },
    transfers: [
      { id: 'EXIT_SOUTH_50', x: 41, y: 13, width: 1, height: 6, targetMap: 'MAP_001', targetX: 2, targetY: 17, direction: DIRECTION.RIGHT },
      { id: 'EXIT_NORTH_51', x: 11, y: 0, width: 5, height: 1, targetMap: 'MAP_051', targetX: 17, targetY: 24, direction: DIRECTION.UP },
      { id: 'EXIT_NORTH_52', x: 18, y: 0, width: 5, height: 1, targetMap: 'MAP_052', targetX: 16, targetY: 22, direction: DIRECTION.UP },
      { id: 'EXIT_NORTH_53', x: 27, y: 0, width: 5, height: 1, targetMap: 'MAP_053', targetX: 17, targetY: 24, direction: DIRECTION.UP },
      { id: 'EXIT_NORTH_54', x: 0, y: 6, width: 1, height: 5, targetMap: 'MAP_054', targetX: 17, targetY: 24, direction: DIRECTION.LEFT },
      { id: 'EXIT_NORTH_55', x: 20, y: 29, width: 6, height: 1, targetMap: 'MAP_055', targetX: 16, targetY: 22, direction: DIRECTION.DOWN },
    ],
    encounters: ['ENC_FOREST_2'], encounterRate: MAP_ENCOUNTER_RATES.LOW,
  },
  MAP_051: {
    width: 34, height: 28, baseTile: MAP_TILE_KEYS.GRASS, frameTile: MAP_TILE_KEYS.TREE, frameThickness: 2,
    groundRects: [{ x: 14, y: 0, width: 6, height: 28, tile: MAP_TILE_KEYS.PATH }, { x: 8, y: 6, width: 18, height: 10, tile: MAP_TILE_KEYS.WATER }, { x: 14, y: 11, width: 6, height: 5, tile: MAP_TILE_KEYS.PATH }],
    objectClearRects: [{ x: 14, y: 26, width: 6, height: 2 }],
    objects: [{ x: 17, y: 9, tile: MAP_TILE_KEYS.RUIN }, { x: 7, y: 6, tile: MAP_TILE_KEYS.BARREL }, { x: 24, y: 16, tile: MAP_TILE_KEYS.BARREL }],
    eventPositions: { EVT_POISON_GAS: { x: 9, y: 7, width: 16, height: 8 }, EVT_DRAGON_SEAL: { x: 16, y: 9, width: 3, height: 2 }, CHEST_QINGLONG_1: { x: 7, y: 6, width: 1, height: 1 }, CHEST_QINGLONG_2: { x: 24, y: 16, width: 1, height: 1 } },
    transfers: [{ id: 'EXIT_SOUTH_51', x: 14, y: 27, width: 6, height: 1, targetMap: 'MAP_050', targetX: 13, targetY: 2, direction: DIRECTION.DOWN }],
    encounters: ['ENC_SPRING_POISON'], encounterRate: MAP_ENCOUNTER_RATES.DENSE,
  },
  MAP_052: {
    width: 34, height: 26, baseTile: MAP_TILE_KEYS.DIRT, frameTile: MAP_TILE_KEYS.ROCK, frameThickness: 2,
    groundRects: [{ x: 14, y: 0, width: 6, height: 26, tile: MAP_TILE_KEYS.PATH }, { x: 9, y: 5, width: 16, height: 8, tile: MAP_TILE_KEYS.PATH }],
    objectClearRects: [{ x: 14, y: 24, width: 6, height: 2 }],
    objects: [{ x: 17, y: 7, tile: MAP_TILE_KEYS.RUIN }, { x: 7, y: 5, tile: MAP_TILE_KEYS.BARREL }, { x: 25, y: 14, tile: MAP_TILE_KEYS.BARREL }],
    eventPositions: { EVT_WHITE_TIGER_MEMORY: { x: 12, y: 5, width: 10, height: 5 }, EVT_MEI_BOSS: { x: 16, y: 7, width: 3, height: 3 }, CHEST_BAIHU_1: { x: 7, y: 5, width: 1, height: 1 }, CHEST_BAIHU_2: { x: 25, y: 14, width: 1, height: 1 } },
    transfers: [{ id: 'EXIT_SOUTH_52', x: 14, y: 25, width: 6, height: 1, targetMap: 'MAP_050', targetX: 20, targetY: 2, direction: DIRECTION.DOWN }],
    encounters: ['ENC_SPRING_DARK'], encounterRate: MAP_ENCOUNTER_RATES.DENSE,
  },
  MAP_053: {
    width: 36, height: 28, baseTile: MAP_TILE_KEYS.GRASS, frameTile: MAP_TILE_KEYS.TREE, frameThickness: 2,
    groundRects: [{ x: 15, y: 0, width: 6, height: 28, tile: MAP_TILE_KEYS.PATH }, { x: 8, y: 7, width: 20, height: 6, tile: MAP_TILE_KEYS.PATH }],
    objectRects: [{ x: 6, y: 5, width: 24, height: 5, tile: MAP_TILE_KEYS.FLOWERS }, { x: 9, y: 15, width: 18, height: 5, tile: MAP_TILE_KEYS.FLOWERS_WHITE }],
    objectClearRects: [{ x: 15, y: 26, width: 6, height: 2 }],
    objects: [{ x: 18, y: 8, tile: MAP_TILE_KEYS.RUIN }, { x: 6, y: 14, tile: MAP_TILE_KEYS.BARREL }, { x: 28, y: 15, tile: MAP_TILE_KEYS.BARREL }],
    eventPositions: { EVT_FLYING_ENEMIES: { x: 8, y: 11, width: 8, height: 5 }, EVT_WANG_BOSS: { x: 16, y: 7, width: 5, height: 5 }, CHEST_ZHUQUE_1: { x: 6, y: 14, width: 1, height: 1 }, CHEST_ZHUQUE_2: { x: 28, y: 15, width: 1, height: 1 } },
    transfers: [{ id: 'EXIT_SOUTH_53', x: 15, y: 27, width: 6, height: 1, targetMap: 'MAP_050', targetX: 29, targetY: 2, direction: DIRECTION.DOWN }],
    encounters: ['ENC_SPRING_FIRE'], encounterRate: MAP_ENCOUNTER_RATES.DENSE,
  },
  MAP_054: {
    width: 36, height: 28, baseTile: MAP_TILE_KEYS.DIRT, frameTile: MAP_TILE_KEYS.ROCK, frameThickness: 2,
    groundRects: [{ x: 15, y: 0, width: 6, height: 28, tile: MAP_TILE_KEYS.PATH }, { x: 8, y: 8, width: 20, height: 8, tile: MAP_TILE_KEYS.PATH }],
    objectClearRects: [{ x: 15, y: 26, width: 6, height: 2 }],
    objects: [{ x: 18, y: 9, tile: MAP_TILE_KEYS.RUIN }, { x: 7, y: 8, tile: MAP_TILE_KEYS.BARREL }, { x: 28, y: 17, tile: MAP_TILE_KEYS.BARREL }],
    eventPositions: { EVT_LIANG_BOSS: { x: 15, y: 8, width: 6, height: 5 }, EVT_GIANT_BEAST_TRAP: { x: 10, y: 14, width: 16, height: 5 }, CHEST_XUANWU_1: { x: 7, y: 8, width: 1, height: 1 }, CHEST_XUANWU_2: { x: 28, y: 17, width: 1, height: 1 } },
    transfers: [{ id: 'EXIT_SOUTH_54', x: 15, y: 27, width: 6, height: 1, targetMap: 'MAP_050', targetX: 2, targetY: 8, direction: DIRECTION.DOWN }],
    encounters: ['ENC_SPRING_EARTH'], encounterRate: MAP_ENCOUNTER_RATES.DENSE,
  },
  MAP_055: {
    width: 34, height: 26, baseTile: MAP_TILE_KEYS.PATH, frameTile: MAP_TILE_KEYS.BUSH, frameThickness: 2,
    groundRects: [{ x: 4, y: 4, width: 10, height: 6, tile: MAP_TILE_KEYS.GRASS }, { x: 20, y: 4, width: 10, height: 6, tile: MAP_TILE_KEYS.GRASS }, { x: 4, y: 14, width: 10, height: 6, tile: MAP_TILE_KEYS.DIRT }, { x: 20, y: 14, width: 10, height: 6, tile: MAP_TILE_KEYS.DIRT }, { x: 14, y: 0, width: 6, height: 26, tile: MAP_TILE_KEYS.PATH }],
    objectClearRects: [{ x: 14, y: 24, width: 6, height: 2 }],
    objects: [{ x: 17, y: 4, tile: MAP_TILE_KEYS.RUIN }, { x: 17, y: 17, tile: MAP_TILE_KEYS.CAMPFIRE }, { x: 25, y: 19, tile: MAP_TILE_KEYS.BARREL }],
    eventPositions: { EVT_DREAM_START: { x: 14, y: 3, width: 6, height: 4 }, EVT_MEMORY_1: { x: 7, y: 6, width: 2, height: 2 }, EVT_MEMORY_2: { x: 24, y: 6, width: 2, height: 2 }, EVT_MEMORY_3: { x: 7, y: 17, width: 2, height: 2 }, EVT_MEMORY_FINAL: { x: 16, y: 17, width: 3, height: 3 }, CHEST_DREAM_1: { x: 25, y: 19, width: 1, height: 1 } },
    transfers: [{ id: 'EXIT_SOUTH_55', x: 14, y: 25, width: 6, height: 1, targetMap: 'MAP_050', targetX: 22, targetY: 27, direction: DIRECTION.DOWN }],
    encounters: [], encounterRate: MAP_ENCOUNTER_RATES.NONE,
  },
  MAP_060: {
    width: 38, height: 30, baseTile: MAP_TILE_KEYS.DIRT, frameTile: MAP_TILE_KEYS.ROCK, frameThickness: 2,
    groundRects: [{ x: 16, y: 0, width: 6, height: 30, tile: MAP_TILE_KEYS.PATH }, { x: 16, y: 11, width: 22, height: 5, tile: MAP_TILE_KEYS.PATH }, { x: 34, y: 22, width: 4, height: 7, tile: MAP_TILE_KEYS.PATH }],
    objectClearRects: [{ x: 16, y: 0, width: 6, height: 2 }, { x: 36, y: 11, width: 2, height: 6 }, { x: 36, y: 23, width: 2, height: 6 }],
    objects: [{ x: 18, y: 6, tile: MAP_TILE_KEYS.CAMPFIRE }, { x: 9, y: 13, tile: MAP_TILE_KEYS.RUIN }, { x: 30, y: 13, tile: MAP_TILE_KEYS.SIGN }],
    eventPositions: { EVT_MASK_1: { x: 8, y: 12, width: 3, height: 3 } },
    transfers: [
      { id: 'EXIT_SOUTH_60', x: 37, y: 23, width: 1, height: 6, targetMap: 'MAP_001', targetX: 2, targetY: 26, direction: DIRECTION.RIGHT },
      { id: 'EXIT_NORTH_60', x: 16, y: 0, width: 6, height: 1, targetMap: 'MAP_062', targetX: 17, targetY: 25, direction: DIRECTION.UP },
      { id: 'EXIT_EAST_60', x: 37, y: 11, width: 1, height: 6, targetMap: 'MAP_061', targetX: 2, targetY: 14, direction: DIRECTION.RIGHT },
    ],
    encounters: ['ENC_MAZE_1'], encounterRate: MAP_ENCOUNTER_RATES.STANDARD,
  },
  MAP_061: {
    width: 36, height: 28, baseTile: MAP_TILE_KEYS.DIRT, frameTile: MAP_TILE_KEYS.ROCK, frameThickness: 2,
    groundRects: [{ x: 0, y: 12, width: 36, height: 5, tile: MAP_TILE_KEYS.PATH }, { x: 17, y: 0, width: 5, height: 17, tile: MAP_TILE_KEYS.PATH }, { x: 7, y: 7, width: 23, height: 12, tile: MAP_TILE_KEYS.WATER }, { x: 0, y: 12, width: 36, height: 5, tile: MAP_TILE_KEYS.PATH }],
    objectClearRects: [{ x: 0, y: 12, width: 2, height: 6 }, { x: 17, y: 0, width: 5, height: 2 }],
    objects: [{ x: 9, y: 13, tile: MAP_TILE_KEYS.BRIDGE }, { x: 18, y: 13, tile: MAP_TILE_KEYS.BRIDGE }, { x: 27, y: 13, tile: MAP_TILE_KEYS.BRIDGE }, { x: 5, y: 18, tile: MAP_TILE_KEYS.BARREL }, { x: 30, y: 18, tile: MAP_TILE_KEYS.BARREL }],
    eventPositions: { EVT_CHAIN_1: { x: 7, y: 11, width: 2, height: 2 }, EVT_CHAIN_2: { x: 17, y: 9, width: 2, height: 2 }, EVT_CHAIN_3: { x: 27, y: 11, width: 2, height: 2 }, EVT_SWAMP_AMBUSH: { x: 12, y: 12, width: 12, height: 5 }, CHEST_SWAMP_1: { x: 5, y: 18, width: 1, height: 1 }, CHEST_SWAMP_2: { x: 30, y: 18, width: 1, height: 1 } },
    transfers: [
      { id: 'EXIT_SOUTH_61', x: 0, y: 12, width: 1, height: 6, targetMap: 'MAP_060', targetX: 35, targetY: 13, direction: DIRECTION.LEFT },
      { id: 'EXIT_NORTH_61', x: 17, y: 0, width: 5, height: 1, targetMap: 'MAP_062', targetX: 12, targetY: 25, direction: DIRECTION.UP },
    ],
    encounters: ['ENC_SWAMP_1'], encounterRate: MAP_ENCOUNTER_RATES.DANGEROUS,
  },
  MAP_062: {
    width: 34, height: 28, baseTile: MAP_TILE_KEYS.DIRT, frameTile: MAP_TILE_KEYS.ROCK, frameThickness: 2,
    groundRects: [{ x: 14, y: 0, width: 6, height: 28, tile: MAP_TILE_KEYS.PATH }, { x: 9, y: 8, width: 16, height: 8, tile: MAP_TILE_KEYS.PATH }],
    objectClearRects: [{ x: 14, y: 0, width: 6, height: 2 }, { x: 14, y: 26, width: 6, height: 2 }],
    objects: [{ x: 17, y: 9, tile: MAP_TILE_KEYS.RUIN }, { x: 12, y: 12, tile: MAP_TILE_KEYS.CAMPFIRE }, { x: 22, y: 12, tile: MAP_TILE_KEYS.CAMPFIRE }],
    eventPositions: { EVT_FAKE_XIAOAI: { x: 16, y: 9, width: 2, height: 2 }, EVT_FAKE_XIAOAI_BOSS: { x: 16, y: 12, width: 3, height: 3 } },
    transfers: [
      { id: 'EXIT_SOUTH_62', x: 14, y: 27, width: 6, height: 1, targetMap: 'MAP_060', targetX: 18, targetY: 2, direction: DIRECTION.DOWN },
      { id: 'EXIT_NORTH_62', x: 14, y: 0, width: 6, height: 1, targetMap: 'MAP_063', targetX: 16, targetY: 23, direction: DIRECTION.UP },
    ],
    encounters: [], encounterRate: MAP_ENCOUNTER_RATES.NONE,
  },
  MAP_063: {
    width: 32, height: 26, baseTile: MAP_TILE_KEYS.DIRT, frameTile: MAP_TILE_KEYS.ROCK, frameThickness: 2,
    groundRects: [{ x: 13, y: 0, width: 6, height: 26, tile: MAP_TILE_KEYS.PATH }, { x: 9, y: 6, width: 14, height: 8, tile: MAP_TILE_KEYS.PATH }],
    objectClearRects: [{ x: 13, y: 24, width: 6, height: 2 }],
    objects: [{ x: 16, y: 7, tile: MAP_TILE_KEYS.RUIN }, { x: 8, y: 6, tile: MAP_TILE_KEYS.BARREL }, { x: 16, y: 12, tile: MAP_TILE_KEYS.CAMPFIRE }],
    eventPositions: { EVT_XIAOAI_FINAL: { x: 14, y: 7, width: 4, height: 3 }, EVT_PURIFICATION: { x: 15, y: 11, width: 3, height: 3 }, CHEST_UNDERGROUND_1: { x: 8, y: 6, width: 1, height: 1 } },
    transfers: [{ id: 'EXIT_SOUTH_63', x: 13, y: 25, width: 6, height: 1, targetMap: 'MAP_062', targetX: 16, targetY: 2, direction: DIRECTION.DOWN }],
    encounters: [], encounterRate: MAP_ENCOUNTER_RATES.NONE,
  },
  MAP_070: {
    width: 34, height: 28, baseTile: MAP_TILE_KEYS.DIRT, frameTile: MAP_TILE_KEYS.BUSH, frameThickness: 2,
    groundRects: [{ x: 14, y: 0, width: 6, height: 28, tile: MAP_TILE_KEYS.PATH }, { x: 9, y: 7, width: 16, height: 10, tile: MAP_TILE_KEYS.PATH }],
    objectClearRects: [{ x: 14, y: 26, width: 6, height: 2 }],
    objects: [{ x: 17, y: 8, tile: MAP_TILE_KEYS.RUIN }, { x: 12, y: 12, tile: MAP_TILE_KEYS.CAMPFIRE }, { x: 22, y: 12, tile: MAP_TILE_KEYS.CAMPFIRE }],
    eventPositions: { EVT_WUXIANG: { x: 16, y: 8, width: 3, height: 3 } },
    transfers: [{ id: 'EXIT_SOUTH_70', x: 14, y: 27, width: 6, height: 1, targetMap: 'MAP_001', targetX: 22, targetY: 23, direction: DIRECTION.DOWN }],
    encounters: [], encounterRate: MAP_ENCOUNTER_RATES.NONE,
  },
} as const

export const WORLD_MAP_NODE_LAYOUTS = [
  { id: 'MAP_001', name: '木桶镇', x: 470, y: 260, requires: [], spawn: { x: 22, y: 17 } },
  { id: 'MAP_002', name: '木桶镇·广场', x: 505, y: 238, requires: ['festival_started'], spawn: { x: 22, y: 17 } },
  { id: 'MAP_010', name: '奇妙森林入口', x: 610, y: 245, requires: [], spawn: { x: 2, y: 16 } },
  { id: 'MAP_011', name: '奇妙森林围湖', x: 710, y: 205, requires: [], spawn: { x: 2, y: 15 } },
  { id: 'MAP_012', name: '千年树种祭台', x: 805, y: 168, requires: [], spawn: { x: 2, y: 13 } },
  { id: 'MAP_020', name: '码头航路', x: 610, y: 330, requires: [], spawn: { x: 4, y: 15 } },
  { id: 'MAP_030', name: '圣水殿外路', x: 720, y: 350, requires: ['has_sacred_water'], spawn: { x: 2, y: 15 } },
  { id: 'MAP_031', name: '圣水殿大厅', x: 790, y: 365, requires: ['has_sacred_water'], spawn: { x: 16, y: 25 } },
  { id: 'MAP_040', name: '神殿山路', x: 470, y: 360, requires: [], spawn: { x: 20, y: 27 } },
  { id: 'MAP_041', name: '七色路', x: 500, y: 430, requires: [], spawn: { x: 18, y: 27 } },
  { id: 'MAP_042', name: '神殿', x: 540, y: 500, requires: [], spawn: { x: 16, y: 24 } },
  { id: 'MAP_050', name: '生命之泉入口', x: 320, y: 245, requires: [], spawn: { x: 38, y: 16 } },
  { id: 'MAP_051', name: '青龙潭', x: 250, y: 178, requires: ['has_millennium_seed'], spawn: { x: 17, y: 24 } },
  { id: 'MAP_052', name: '白虎穴', x: 220, y: 285, requires: ['has_sacred_water'], spawn: { x: 16, y: 22 } },
  { id: 'MAP_053', name: '朱雀林', x: 350, y: 152, requires: ['has_divine_laurel'], spawn: { x: 17, y: 24 } },
  { id: 'MAP_054', name: '玄武殿', x: 265, y: 378, requires: ['defeated_chi_mei_wang'], spawn: { x: 17, y: 24 } },
  { id: 'MAP_055', name: '轮回道', x: 355, y: 410, requires: ['released_four_seals'], spawn: { x: 16, y: 22 } },
  { id: 'MAP_060', name: '魔宫入口', x: 180, y: 250, requires: [], spawn: { x: 35, y: 25 } },
  { id: 'MAP_061', name: '黑暗沼泽', x: 125, y: 330, requires: ['fake_xiaoai_defeated'], spawn: { x: 2, y: 14 } },
  { id: 'MAP_062', name: '魔宫大厅', x: 105, y: 225, requires: ['fake_xiaoai_defeated'], spawn: { x: 17, y: 25 } },
  { id: 'MAP_063', name: '地下魔宫', x: 65, y: 168, requires: ['fake_xiaoai_defeated'], spawn: { x: 16, y: 23 } },
  { id: 'MAP_070', name: '人心之渊', x: 470, y: 455, requires: ['true_route_unlocked'], spawn: { x: 17, y: 24 } },
] as const

export const WORLD_MAP_CONNECTION_LAYOUTS = [
  ['MAP_001', 'MAP_002'], ['MAP_001', 'MAP_010'], ['MAP_010', 'MAP_011'], ['MAP_011', 'MAP_012'],
  ['MAP_001', 'MAP_020'], ['MAP_020', 'MAP_030'], ['MAP_030', 'MAP_031'],
  ['MAP_001', 'MAP_040'], ['MAP_040', 'MAP_041'], ['MAP_041', 'MAP_042'],
  ['MAP_001', 'MAP_050'], ['MAP_050', 'MAP_051'], ['MAP_050', 'MAP_052'], ['MAP_050', 'MAP_053'], ['MAP_050', 'MAP_054'], ['MAP_050', 'MAP_055'],
  ['MAP_001', 'MAP_060'], ['MAP_060', 'MAP_061'], ['MAP_060', 'MAP_062'], ['MAP_061', 'MAP_062'], ['MAP_062', 'MAP_063'],
  ['MAP_001', 'MAP_070'],
] as const

export const DIRECTION_VECTORS = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
]

export const DIRECTION_NAMES = ['up', 'right', 'down', 'left']

export const BATTLE_SPEED = {
  normal: 1,
  fast: 1.5,
  fastest: 2,
} as const

export const TEXT_SPEED = {
  slow: 60,
  normal: 40,
  fast: 20,
  instant: 0,
} as const

export const DIALOGUE_TEXT_WIDTH = 720
export const DIALOGUE_TEXT_WRAP_CHARS = 33
export const DIALOGUE_BOX = {
  x: GAME_WIDTH / 2,
  y: 440,
  width: 900,
  height: 160,
  padding: 18,
} as const
export const DIALOGUE_FACE = {
  x: 110,
  y: DIALOGUE_BOX.y,
  size: 120,
} as const
export const DIALOGUE_NAME_POSITION = {
  x: 50,
  y: DIALOGUE_BOX.y - DIALOGUE_BOX.height / 2,
} as const
export const DIALOGUE_TEXT_POSITION = {
  x: 180,
  y: 380,
} as const
export const DIALOGUE_CHOICE = {
  x: 200,
  cursorX: 190,
  cursorSize: 8,
  width: 700,
  fontSize: 15,
  minFontSize: 12,
  gap: 6,
  minGap: 2,
} as const

export const SAVE_SLOTS = 3
export const QUICK_SAVE_SLOT = SAVE_SLOTS + 1
export const TRUE_ROUTE_MIN_MERCY = 3
export const TRUE_ROUTE_MIN_XIAOAI_MEMORY_FRAGMENTS = 3

export const ELEMENTS = {
  FIRE: 'fire',
  WATER: 'water',
  WIND: 'wind',
  EARTH: 'earth',
  THUNDER: 'thunder',
  WOOD: 'wood',
  LIGHT: 'light',
  DARK: 'dark',
  NONE: 'none',
} as const

export const ELEMENT_WEAKNESS: Record<string, string[]> = {
  [ELEMENTS.FIRE]: [ELEMENTS.WATER],
  [ELEMENTS.WATER]: [ELEMENTS.THUNDER, ELEMENTS.WOOD],
  [ELEMENTS.WIND]: [ELEMENTS.EARTH],
  [ELEMENTS.EARTH]: [ELEMENTS.WIND],
  [ELEMENTS.THUNDER]: [ELEMENTS.EARTH],
  [ELEMENTS.WOOD]: [ELEMENTS.FIRE],
  [ELEMENTS.LIGHT]: [ELEMENTS.DARK],
  [ELEMENTS.DARK]: [ELEMENTS.LIGHT],
  [ELEMENTS.NONE]: [],
}

export const COLORS = {
  uiBg: 0x2a2a3e,
  uiBorder: 0x5a5a7e,
  uiText: '#e8e8f0',
  uiHighlight: 0x7a7a9e,
  uiDark: 0x1a1a2e,
  hpBar: 0xe74c3c,
  mpBar: 0x3498db,
  tpBar: 0xf1c40f,
  white: 0xffffff,
  black: 0x000000,
} as const

export const TRAINING_COST = 30
export const TRAINING_EXP_BASE = 20
export const TRAINING_EXP_PER_LEVEL = 10
export const INITIAL_GOLD = 100

export const COMBO_TP_COST = 25

export const BGM_FADE_DURATIONS = {
  DEFAULT_MS: 1000,
  FAST_MS: 500,
  NONE_MS: 0,
} as const

export const SETTINGS_PANEL = {
  x: GAME_WIDTH / 2,
  y: GAME_HEIGHT / 2,
  width: 560,
  height: 510,
  overlayAlpha: 0.6,
  alpha: 0.98,
  strokeWidth: 2,
  titleY: 76,
  titleFontSize: 28,
  rowX: 220,
  rowStartY: 112,
  rowHeight: 26,
  labelFontSize: 15,
  valueFontSize: 15,
  valueX: 280,
  backOffsetY: 8,
  backFontSize: 16,
  cursorX: 200,
  cursorOffsetY: 7,
  cursorSize: 10,
} as const

export const FIELD_ENTITY_BEHAVIOR = {
  BATTLE_TOUCH_DISTANCE_TILES: 0.8,
  NPC_INTERACTION_DISTANCE_TILES: 1.25,
  CHASE_SPEED_TILES_PER_SECOND: 3.2,
  FAST_ENEMY_SPEED_MIN: 12,
  PATROL_TARGET_ATTEMPTS: 8,
  SPAWN_TARGET_ATTEMPTS: 96,
  SPAWN_MARGIN_TILES: 2,
  PLAYER_SPAWN_CLEAR_RADIUS_TILES: 5,
} as const

export const FIELD_ENTITY_BEHAVIOR_PRESETS = {
  NPC_IDLE: {
    mode: 'idle',
    patrolRangeTiles: 0,
    chaseDistanceTiles: 0,
    interactionDistanceTiles: FIELD_ENTITY_BEHAVIOR.NPC_INTERACTION_DISTANCE_TILES,
    idleMinMs: 0,
    idleMaxMs: 0,
    moveDurationMs: 0,
  },
  NPC_WANDER: {
    mode: 'wander',
    patrolRangeTiles: 2,
    chaseDistanceTiles: 0,
    interactionDistanceTiles: FIELD_ENTITY_BEHAVIOR.NPC_INTERACTION_DISTANCE_TILES,
    idleMinMs: 3000,
    idleMaxMs: 7000,
    moveDurationMs: 1000,
  },
  MONSTER: {
    mode: 'chase',
    patrolRangeTiles: 3,
    chaseDistanceTiles: 4,
    interactionDistanceTiles: FIELD_ENTITY_BEHAVIOR.BATTLE_TOUCH_DISTANCE_TILES,
    idleMinMs: 1500,
    idleMaxMs: 3200,
    moveDurationMs: 750,
  },
  FAST_MONSTER: {
    mode: 'chase',
    patrolRangeTiles: 4,
    chaseDistanceTiles: 5,
    interactionDistanceTiles: FIELD_ENTITY_BEHAVIOR.BATTLE_TOUCH_DISTANCE_TILES,
    idleMinMs: 1200,
    idleMaxMs: 2600,
    moveDurationMs: 620,
  },
  GUARDIAN: {
    mode: 'guard',
    patrolRangeTiles: 2,
    chaseDistanceTiles: 3,
    interactionDistanceTiles: FIELD_ENTITY_BEHAVIOR.BATTLE_TOUCH_DISTANCE_TILES,
    idleMinMs: 1800,
    idleMaxMs: 3600,
    moveDurationMs: 850,
  },
  AMBUSH: {
    mode: 'ambush',
    patrolRangeTiles: 1,
    chaseDistanceTiles: 2,
    interactionDistanceTiles: FIELD_ENTITY_BEHAVIOR.BATTLE_TOUCH_DISTANCE_TILES,
    idleMinMs: 2600,
    idleMaxMs: 5200,
    moveDurationMs: 900,
  },
  BOSS: {
    mode: 'guard',
    patrolRangeTiles: 1,
    chaseDistanceTiles: 4,
    interactionDistanceTiles: 1,
    idleMinMs: 1600,
    idleMaxMs: 3000,
    moveDurationMs: 900,
  },
} as const

export const FIELD_ENCOUNTER_SPAWN_COUNTS = {
  NONE: 0,
  REDUCED: 1,
  DEFAULT: 2,
  DENSE: 3,
  DANGEROUS: 4,
  MAX: 4,
} as const

export const FIELD_ENCOUNTER_RATE_THRESHOLDS = {
  DENSE: MAP_ENCOUNTER_RATES.DENSE,
  DANGEROUS: MAP_ENCOUNTER_RATES.DANGEROUS,
} as const

export const BATTLE_RESULT_PANEL = {
  x: GAME_WIDTH / 2,
  y: GAME_HEIGHT / 2,
  width: 540,
  height: 320,
  titleOffsetY: -118,
  lineStartOffsetY: -68,
  lineGap: 30,
  contentPaddingX: 46,
  maxLines: 6,
  confirmOffsetY: 120,
  overlayAlpha: 0.55,
  confirmPaddingX: 18,
  confirmPaddingY: 8,
} as const

export const GAME_OVER_PANEL = {
  titleY: 132,
  subtitleY: 198,
  menuStartY: 290,
  menuGap: 48,
  cursorOffsetX: 112,
  cursorSize: 12,
  messageY: 484,
  messageDurationMs: 1500,
} as const
