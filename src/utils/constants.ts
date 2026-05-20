export const BASE_TILE_SIZE = 32
export const BASE_GAME_WIDTH = 960
export const BASE_GAME_HEIGHT = 540
export const GAME_SCALE = 2
export const TILE_SIZE = BASE_TILE_SIZE * GAME_SCALE
export const GAME_WIDTH = BASE_GAME_WIDTH * GAME_SCALE
export const GAME_HEIGHT = BASE_GAME_HEIGHT * GAME_SCALE
export const scalePx = (value: number): number => Math.round(value * GAME_SCALE)
export const scaleFont = (value: number): string => `${scalePx(value)}px`
export const VIEWPORT_TILES_X = Math.ceil(GAME_WIDTH / TILE_SIZE)
export const VIEWPORT_TILES_Y = Math.ceil(GAME_HEIGHT / TILE_SIZE)
export const PROJECT_GITHUB_URL = 'https://github.com/cyber-tao/casktown'

export const TOUCH_INPUT = {
  ACTIVE_POINTERS: 4,
  DEVICE_MEDIA_QUERY: '(pointer: coarse)',
  MOBILE_VIEWPORT_MAX_WIDTH: 768,
  POINTER_ALPHA: 0.4,
  POINTER_HOVER_ALPHA: 0.55,
  POINTER_STROKE_WIDTH: scalePx(2),
  TEXT_HIT_AREA_MIN_CSS_WIDTH: 48,
  TEXT_HIT_AREA_MIN_CSS_HEIGHT: 44,
  TEXT_HIT_AREA_MAX_GAME_HEIGHT: scalePx(40),
  TEXT_HIT_AREA_PADDING_CSS: 8,
  MIN_DISPLAY_SCALE: 0.1,
  CONTROLS_DEPTH: 620,
  LABEL_DEPTH_OFFSET: 1,
  DPAD_CENTER_X: scalePx(104),
  DPAD_CENTER_Y: GAME_HEIGHT - scalePx(92),
  DPAD_BUTTON_SIZE: scalePx(54),
  DPAD_BUTTON_OFFSET: scalePx(58),
  DPAD_LABEL_FONT_SIZE: scalePx(24),
  ACTION_BUTTON_SIZE: scalePx(68),
  ACTION_BUTTON_SPACING: scalePx(82),
  ACTION_BUTTON_X: GAME_WIDTH - scalePx(94),
  ACTION_BUTTON_Y: GAME_HEIGHT - scalePx(92),
  ACTION_LABEL_FONT_SIZE: scalePx(16),
  OVERLAY_BACK_Y: GAME_HEIGHT - scalePx(36),
  OVERLAY_BACK_FONT_SIZE: scalePx(16),
  LABEL_COLOR: '#ffffff',
  LABEL_FONT_FAMILY: 'sans-serif',
} as const

export const TITLE_GITHUB_LINK = {
  x: GAME_WIDTH - scalePx(88),
  y: GAME_HEIGHT - scalePx(28),
  fontSize: scalePx(16),
  target: '_blank',
  features: 'noopener,noreferrer',
} as const

export const TITLE_MENU_ITEMS = ['开始游戏', '继续游戏', '编辑器', '设置', '退出'] as const
export const TITLE_MENU_ACTION_INDEX = {
  NEW_GAME: 0,
  LOAD_GAME: 1,
  EDITOR: 2,
  SETTINGS: 3,
  EXIT: 4,
} as const
export const TITLE_MENU_LAYOUT = {
  START_Y: scalePx(284),
  GAP_Y: scalePx(44),
  CURSOR_OFFSET_X: scalePx(80),
  CURSOR_SIZE: scalePx(12),
} as const
export const EDITOR_PAGE_LINK = {
  url: 'editor.html',
  target: '_blank',
} as const

export const TILE_TEXTURE_PROCESSING = {
  TERRAIN_INSET_RATIO: 0.24,
  TERRAIN_SAMPLE_INSET_RATIO: 0.25,
  TERRAIN_DETAIL_ALPHA: 0.2,
  OBJECT_MARGIN_PX: 2,
} as const

export const TILE_TEXTURE_INSET_OVERRIDES: Record<string, { readonly x: number; readonly y: number }> = {
  env_river_vertical: { x: 0.38, y: 0.12 },
}

export const TILE_TEXTURE_DETAIL_ALPHA_OVERRIDES: Record<string, number> = {
  env_river_vertical: 0.12,
}

export const CONTINUOUS_TERRAIN_TEXTURE_KEYS = [
  'env_grass_plain',
  'env_dirt_plain',
  'env_river_vertical',
  'env_dirt_pebbles',
  'env_farmland_plain',
] as const

export const STRETCHED_TILE_TEXTURE_KEYS = ['env_fence_long', 'env_wood_bridge'] as const

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
export const CHARACTER_SPRITE_BASE_KEYS: Record<string, string> = {
  T: 't',
  HUIHUI: 'huihui',
  A: 'abo',
  CONGCONG: 'congcong',
  SUN: 'sun',
  xiaoai: 'xiaoai',
} as const
export const DEFAULT_CHARACTER_SPRITE_BASE_KEY = CHARACTER_SPRITE_BASE_KEYS.T
export const DEFAULT_CHARACTER_SPRITE_KEY = `${DEFAULT_CHARACTER_SPRITE_BASE_KEY}_front_idle_01`
export const BATTLE_BACKGROUND_KEYS = {
  FIELD: 'ui_battle_bg_field',
  TOWN_RUINS: 'ui_battle_bg_town_ruins',
  FOREST: 'ui_battle_bg_forest',
  FOREST_ALTAR: 'ui_battle_bg_forest_altar',
  HOLY_WATER: 'ui_battle_bg_holy_water',
  HOLY_HALL: 'ui_battle_bg_holy_hall',
  MOUNTAIN: 'ui_battle_bg_mountain',
  RAINBOW_PATH: 'ui_battle_bg_rainbow_path',
  LIFE_SPRING: 'ui_battle_bg_life_spring',
  AZURE_POOL: 'ui_battle_bg_azure_pool',
  TIGER_CAVE: 'ui_battle_bg_tiger_cave',
  PHOENIX_GROVE: 'ui_battle_bg_phoenix_grove',
  BASALT_TEMPLE: 'ui_battle_bg_basalt_temple',
  REINCARNATION_PATH: 'ui_battle_bg_reincarnation_path',
  DARK_PALACE: 'ui_battle_bg_dark_palace',
  DARK_SWAMP: 'ui_battle_bg_dark_swamp',
  UNDERGROUND_PALACE: 'ui_battle_bg_underground_palace',
  ABYSS: 'ui_battle_bg_abyss',
} as const
export const DEFAULT_BATTLE_BACKGROUND_KEY = BATTLE_BACKGROUND_KEYS.FIELD
export const MAP_BATTLE_BACKGROUND_KEYS: Record<string, string> = {
  MAP_001: BATTLE_BACKGROUND_KEYS.TOWN_RUINS,
  MAP_002: BATTLE_BACKGROUND_KEYS.FIELD,
  MAP_010: BATTLE_BACKGROUND_KEYS.FOREST,
  MAP_011: BATTLE_BACKGROUND_KEYS.FOREST,
  MAP_012: BATTLE_BACKGROUND_KEYS.FOREST_ALTAR,
  MAP_030: BATTLE_BACKGROUND_KEYS.HOLY_WATER,
  MAP_031: BATTLE_BACKGROUND_KEYS.HOLY_HALL,
  MAP_040: BATTLE_BACKGROUND_KEYS.MOUNTAIN,
  MAP_041: BATTLE_BACKGROUND_KEYS.RAINBOW_PATH,
  MAP_050: BATTLE_BACKGROUND_KEYS.LIFE_SPRING,
  MAP_051: BATTLE_BACKGROUND_KEYS.AZURE_POOL,
  MAP_052: BATTLE_BACKGROUND_KEYS.TIGER_CAVE,
  MAP_053: BATTLE_BACKGROUND_KEYS.PHOENIX_GROVE,
  MAP_054: BATTLE_BACKGROUND_KEYS.BASALT_TEMPLE,
  MAP_055: BATTLE_BACKGROUND_KEYS.REINCARNATION_PATH,
  MAP_060: BATTLE_BACKGROUND_KEYS.DARK_PALACE,
  MAP_061: BATTLE_BACKGROUND_KEYS.DARK_SWAMP,
  MAP_062: BATTLE_BACKGROUND_KEYS.DARK_PALACE,
  MAP_063: BATTLE_BACKGROUND_KEYS.UNDERGROUND_PALACE,
  MAP_070: BATTLE_BACKGROUND_KEYS.ABYSS,
} as const
export const PARTY_FIELD_EVENT_CHARACTER_IDS: Record<string, string> = {
  NPC_HUIHUI: 'HUIHUI',
  NPC_A: 'A',
  NPC_SUN: 'SUN',
} as const
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
export const FOLLOWER_TRAIL_OFFSETS = [
  { x: 0, y: 1 },
  { x: 0, y: 2 },
  { x: 0, y: 3 },
] as const
export const FIELD_SPRITE_ANIMATION = {
  FRAME_DURATION_MS: 180,
  IDLE_FRAME_INDEX: 1,
  FRAME_VARIANT_COUNT: 2,
  FRAME_KEY_PAD_LENGTH: 2,
  MOVEMENT_EPSILON_PX: 0.1,
} as const
export const CHARACTER_DIRECTION_FRAME_STEMS = ['back_idle', 'side_walk', 'front_idle', 'side_walk'] as const
export const CHARACTER_DIRECTION_TEXTURE_PATTERN = /^(.*)_(front_idle|back_idle|side_walk)_0[12]$/
export const SEQUENCE_TEXTURE_FRAME_PATTERN = /^(.*)_0[12]$/

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

export const MAP_LAYER_INDEX = {
  GROUND: 0,
  OBJECTS: 1,
} as const

export const TILE_SPRITE_FOOTPRINTS: Record<string, { readonly width: number; readonly height: number }> = {
  obj_cottage: { width: 3, height: 3 },
  obj_festival_plaza: { width: 3, height: 3 },
  env_well_small: { width: 2, height: 2 },
} as const

export const MAP_ENCOUNTER_RATES = {
  NONE: 0,
  LOW: 0.04,
  STANDARD: 0.06,
  DENSE: 0.08,
  DANGEROUS: 0.1,
} as const

export const REBUILD_TILE_REPLACEMENTS = [
  { sourceTileId: 14, targetTileId: 9, minRebuildLevel: 2 },
  { sourceTileId: 13, targetTileId: 22, minRebuildLevel: 1 },
] as const

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
      NPC_A: { x: 20, y: 17, width: 1, height: 1 }, NPC_MAYOR: { x: 25, y: 10, width: 1, height: 1 },
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
      NPC_PINE: { x: 14, y: 23, width: 1, height: 1 }, NPC_MAYOR_2: { x: 25, y: 10, width: 1, height: 1 },
      NPC_BARREL_2: { x: 21, y: 19, width: 1, height: 1 }, SHOP_ITEM: { x: 34, y: 24, width: 1, height: 1 },
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

export const WORLD_MAP_BACKGROUND_LAYOUT = {
  KEY: 'ui_world_map',
  SOURCE_WIDTH: 1448,
  SOURCE_HEIGHT: 1086,
  X: GAME_WIDTH / 2,
  Y: GAME_HEIGHT / 2,
  DISPLAY_HEIGHT: GAME_HEIGHT,
  BACKDROP_COLOR: 0x1a1a2e,
  BACKDROP_ALPHA: 1,
  BACKDROP_DEPTH: 198,
  MAP_DEPTH: 199,
} as const

const WORLD_MAP_DISPLAY_SCALE = WORLD_MAP_BACKGROUND_LAYOUT.DISPLAY_HEIGHT / WORLD_MAP_BACKGROUND_LAYOUT.SOURCE_HEIGHT
export const WORLD_MAP_BACKGROUND_DISPLAY_WIDTH = WORLD_MAP_BACKGROUND_LAYOUT.SOURCE_WIDTH * WORLD_MAP_DISPLAY_SCALE
const WORLD_MAP_LEFT = WORLD_MAP_BACKGROUND_LAYOUT.X - WORLD_MAP_BACKGROUND_DISPLAY_WIDTH / 2
const WORLD_MAP_TOP = WORLD_MAP_BACKGROUND_LAYOUT.Y - WORLD_MAP_BACKGROUND_LAYOUT.DISPLAY_HEIGHT / 2
const worldMapPoint = (x: number, y: number) => ({
  x: Math.round(WORLD_MAP_LEFT + x * WORLD_MAP_DISPLAY_SCALE),
  y: Math.round(WORLD_MAP_TOP + y * WORLD_MAP_DISPLAY_SCALE),
})

export const WORLD_MAP_LOCATION_POINTS: Record<string, { readonly x: number; readonly y: number }> = {
  MAP_001: worldMapPoint(704, 362),
  MAP_002: worldMapPoint(694, 142),
  MAP_010: worldMapPoint(884, 368),
  MAP_011: worldMapPoint(1026, 252),
  MAP_012: worldMapPoint(974, 296),
  MAP_020: worldMapPoint(1268, 320),
  MAP_030: worldMapPoint(1262, 678),
  MAP_031: worldMapPoint(1280, 172),
  MAP_040: worldMapPoint(652, 590),
  MAP_041: worldMapPoint(938, 762),
  MAP_042: worldMapPoint(706, 690),
  MAP_050: worldMapPoint(384, 520),
  MAP_051: worldMapPoint(390, 470),
  MAP_052: worldMapPoint(326, 612),
  MAP_053: worldMapPoint(500, 426),
  MAP_054: worldMapPoint(282, 748),
  MAP_055: worldMapPoint(462, 660),
  MAP_060: worldMapPoint(154, 272),
  MAP_061: worldMapPoint(150, 708),
  MAP_062: worldMapPoint(160, 250),
  MAP_063: worldMapPoint(126, 340),
  MAP_070: worldMapPoint(706, 910),
} as const

export const WORLD_MAP_UI = {
  TITLE_Y: scalePx(16),
  TITLE_FONT_SIZE: scalePx(18),
  HINT_Y: GAME_HEIGHT - scalePx(55),
  HINT_FONT_SIZE: scalePx(12),
  LOCATION_LABEL_Y: GAME_HEIGHT - scalePx(30),
  LOCATION_LABEL_FONT_SIZE: scalePx(14),
  LOCATION_LABEL_PADDING_X: scalePx(14),
  LOCATION_LABEL_PADDING_Y: scalePx(7),
  LOCATION_LABEL_RADIUS: scalePx(6),
  LOCATION_LABEL_BG_COLOR: 0x111827,
  LOCATION_LABEL_BG_ALPHA: 0.82,
  LOCATION_LABEL_DEPTH: 203,
  LOCATION_MARKER_DEPTH: 204,
  LOCATION_PIN_SIZE: scalePx(12),
  LOCATION_PIN_COLOR: 0xf8c46b,
  LOCATION_PIN_STROKE_COLOR: 0x1a1a2e,
  LOCATION_PIN_STROKE_WIDTH: scalePx(2),
  LOCATION_PULSE_SIZE: scalePx(20),
  LOCATION_PULSE_ALPHA: 0.7,
  LOCATION_PULSE_SCALE: 1.85,
  LOCATION_PULSE_DURATION_MS: 1100,
} as const

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

export const DIALOGUE_TEXT_WIDTH = scalePx(720)
export const DIALOGUE_TEXT_WRAP_CHARS = 33
export const DIALOGUE_BOX = {
  x: GAME_WIDTH / 2,
  y: scalePx(440),
  width: scalePx(900),
  height: scalePx(160),
  padding: scalePx(18),
} as const
export const DIALOGUE_FACE = {
  x: scalePx(110),
  y: DIALOGUE_BOX.y,
  size: scalePx(120),
} as const
export const DIALOGUE_NAME_POSITION = {
  x: scalePx(50),
  y: DIALOGUE_BOX.y - DIALOGUE_BOX.height / 2,
} as const
export const DIALOGUE_TEXT_POSITION = {
  x: scalePx(180),
  y: scalePx(380),
} as const
export const DIALOGUE_CHOICE = {
  x: scalePx(200),
  cursorX: scalePx(190),
  cursorSize: scalePx(8),
  width: scalePx(700),
  fontSize: scalePx(15),
  minFontSize: scalePx(12),
  gap: scalePx(6),
  minGap: scalePx(2),
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

export const MAP_INPUT_CODES = {
  WORLD_MAP: 'KeyM',
} as const

export const VOICE_AUDIO_PATH = {
  DIRECTORY: 'audio/voice',
  EXTENSION: '.ogg',
} as const

export const MAP_HUD = {
  MINIMAP_X: GAME_WIDTH - scalePx(154),
  MINIMAP_Y: scalePx(18),
  MINIMAP_WIDTH: scalePx(136),
  MINIMAP_HEIGHT: scalePx(98),
  INNER_PADDING: scalePx(8),
  PANEL_ALPHA: 0.76,
  MAP_ALPHA: 0.9,
  COLLISION_ALPHA: 0.62,
  EVENT_ALPHA: 0.92,
  BORDER_ALPHA: 0.95,
  BORDER_WIDTH: scalePx(1),
  DEPTH: 140,
  MARKER_DEPTH_OFFSET: 1,
  HIT_AREA_DEPTH_OFFSET: 2,
  LABEL_DEPTH_OFFSET: 3,
  PLAYER_MARKER_SIZE: scalePx(5),
  EVENT_MARKER_MIN_SIZE: scalePx(3),
  LABEL_FONT_SIZE: scalePx(10),
  LABEL_OFFSET_X: scalePx(8),
  LABEL_OFFSET_Y: scalePx(10),
  PROMPT_TEXT: 'Space 调查/对话 | M 地图 | Esc 菜单',
  OPEN_HINT: 'M 地图',
  BACKGROUND_COLOR: COLORS.black,
  MAP_COLOR: 0x253244,
  BORDER_COLOR: 0x85b6d8,
  COLLISION_COLOR: 0x0f1720,
  PLAYER_COLOR: COLORS.tpBar,
  EVENT_COLORS: {
    npc: 0xf59e0b,
    battle: 0xef4444,
    transfer: 0x22c55e,
    chest: 0xa855f7,
    trigger: 0x38bdf8,
  },
  LABEL_COLOR: '#dbeafe',
  LABEL_FONT_FAMILY: 'sans-serif',
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
  width: scalePx(560),
  height: scalePx(510),
  overlayAlpha: 0.6,
  alpha: 0.98,
  strokeWidth: scalePx(2),
  titleY: scalePx(76),
  titleFontSize: scalePx(28),
  rowX: scalePx(220),
  rowStartY: scalePx(112),
  rowHeight: scalePx(26),
  labelFontSize: scalePx(15),
  valueFontSize: scalePx(15),
  valueX: scalePx(280),
  backOffsetY: scalePx(8),
  backFontSize: scalePx(16),
  cursorX: scalePx(200),
  cursorOffsetY: scalePx(7),
  cursorSize: scalePx(10),
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

export const ROAMING_ENCOUNTER_RESPAWN = {
  EVENT_ID_PREFIX: 'ROAM_',
  DEFEATED_FLAG_PREFIX: 'defeated_',
  DEFEATED_AT_FLAG_PREFIX: 'defeated_at_',
  COOLDOWN_MS: 120000,
} as const

export const FIELD_ENCOUNTER_RATE_THRESHOLDS = {
  DENSE: MAP_ENCOUNTER_RATES.DENSE,
  DANGEROUS: MAP_ENCOUNTER_RATES.DANGEROUS,
} as const

export const BATTLE_RESULT_PANEL = {
  x: GAME_WIDTH / 2,
  y: GAME_HEIGHT / 2,
  width: scalePx(540),
  height: scalePx(320),
  titleOffsetY: scalePx(-118),
  lineStartOffsetY: scalePx(-68),
  lineGap: scalePx(30),
  contentPaddingX: scalePx(46),
  maxLines: 6,
  confirmOffsetY: scalePx(120),
  overlayAlpha: 0.55,
  confirmPaddingX: scalePx(18),
  confirmPaddingY: scalePx(8),
} as const

export const BATTLE_TARGET_INDICATOR = {
  width: scalePx(18),
  height: scalePx(14),
  offsetY: scalePx(46),
  color: 0xf1c40f,
  depth: 330,
  tweenOffsetY: scalePx(6),
  tweenDurationMs: 360,
} as const

export const GAME_OVER_PANEL = {
  titleY: scalePx(132),
  subtitleY: scalePx(198),
  menuStartY: scalePx(290),
  menuGap: scalePx(48),
  cursorOffsetX: scalePx(112),
  cursorSize: scalePx(12),
  messageY: scalePx(484),
  messageDurationMs: 1500,
} as const

export const CONFIG_DATABASE_STORAGE_KEY = 'casktown.config.database.v1'
export const CONFIG_EDITOR_ID_FALLBACK_PREFIX = 'record'
export const CONFIG_EDITOR_JSON_INDENT = 2
export const CONFIG_EDITOR_PREVIEW = {
  MAP_CANVAS_WIDTH: 520,
  MAP_CANVAS_HEIGHT: 360,
  MAP_TILE_MAX_SIZE: 14,
  MAP_TILE_MIN_SIZE: 4,
  RECORD_LIST_LIMIT: 500,
  VALIDATION_PREVIEW_LENGTH: 160,
  STAT_BAR_MAX_VALUE: 100,
  SEARCH_DEBOUNCE_MS: 120,
  PRIMITIVE_FIELD_COUNT: 1,
} as const

export const CONFIG_EDITOR_API = {
  BASE_PATH: '/__casktown-editor',
  SPRITE_FRAME_PATH: 'sprite-frame',
  SPRITE_ATLAS_IMAGE_PATH: 'sprite-atlas-image',
} as const

export const SPRITE_CROP_DEFAULTS = {
  SOURCE_X: 0,
  SOURCE_Y: 0,
  SOURCE_WIDTH: TILE_SIZE,
  SOURCE_HEIGHT: TILE_SIZE,
  OUTPUT_WIDTH: TILE_SIZE,
  OUTPUT_HEIGHT: TILE_SIZE,
  OFFSET_X: 0,
  OFFSET_Y: 0,
  MIN_SIZE: 1,
  MAX_OUTPUT_SIZE: 512,
} as const

export const CONFIG_EDITOR_SPRITE = {
  PREVIEW_CANVAS_WIDTH: 520,
  PREVIEW_CANVAS_HEIGHT: 360,
  OUTPUT_CANVAS_SIZE: 112,
  CANVAS_PADDING: 18,
  HANDLE_SIZE: 10,
  NUMBER_INPUT_STEP: 1,
  BACKGROUND_COLOR: '#0b1118',
  GRID_COLOR: '#223246',
  IMAGE_BORDER_COLOR: '#34495f',
  CROP_STROKE_COLOR: '#5cc8ff',
  CROP_FILL_COLOR: 'rgba(92, 200, 255, 0.16)',
  HANDLE_COLOR: '#f8c46b',
  OUTPUT_BACKGROUND_COLOR: '#111c27',
  IMAGE_LOAD_ERROR: '图片加载失败',
} as const

export const CONFIG_EDITOR_TABLE_LABELS = {
  maps: '地图',
  characters: '角色',
  items: '物品',
  skills: '技能',
  enemies: '敌人',
  encounters: '战斗',
  quests: '任务',
  dialogues: '对话',
  prophecies: '预言',
  tileSprites: '图块',
  imageAssets: '图片',
  bgmTracks: '音乐',
  sfxTracks: '音效',
  mapBgm: '地图音乐',
  spriteCrops: '切图',
} as const

export const CONFIG_EDITOR_HIDDEN_TABLE_KEYS = ['tileSprites', 'mapBgm', 'spriteCrops'] as const

export const CONFIG_EDITOR_RESOURCE_GROUP_LABELS: Record<string, string> = {
  characters: '角色',
  npcs_bosses: 'NPC / Boss',
  monsters: '敌人',
  environment: '环境图块',
  world_objects: '世界物件',
  holy_temple: '神殿图块',
  dark_fantasy: '暗黑图块',
  ui: 'UI / 背景',
  backgrounds: '背景',
  misc: '通用',
  uncategorized: '未分类',
} as const

export const CONFIG_EDITOR_RESOURCE_TREE = {
  DEFAULT_OPEN_DEPTH: 1,
} as const

export const CONFIG_EDITOR_CHARACTER_IMAGE_KEYS: Record<string, string> = {
  T: 'T_front_idle_01',
  HUIHUI: 'huihui_front_idle_01',
  A: 'abo_front_idle_01',
  CONGCONG: 'congcong_front_idle_01',
  SUN: 'sun_front_idle_01',
} as const

export const CONFIG_EDITOR_EVENT_COLORS: Record<string, string> = {
  npc: '#f59e0b',
  battle: '#ef4444',
  transfer: '#22c55e',
  chest: '#a855f7',
  trigger: '#38bdf8',
} as const

export const CONFIG_EDITOR_FALLBACK_COLORS = {
  mapBackground: '#101923',
  mapGrid: '#233447',
  mapObject: '#cbd5e1',
  mapUnknownTile: '#334155',
  panelText: '#dbeafe',
  warning: '#f97316',
  danger: '#ef4444',
  success: '#22c55e',
} as const

export const CONFIG_EDITOR_TILE_COLORS: Record<string, string> = {
  env_grass_plain: '#4f8f45',
  env_dirt_plain: '#8b6847',
  env_dirt_pebbles: '#8f7660',
  env_river_vertical: '#2f8fb8',
  env_tree_round: '#2f6b3f',
  env_flowers_patch_pink: '#d47aa8',
  env_flowers_patch_white: '#e7e5d4',
  env_rock_large: '#79818a',
  env_fence_long: '#7a5436',
  env_wood_bridge: '#9b6a3c',
  obj_cottage: '#c58c5c',
  env_well_small: '#64748b',
  env_bush_round: '#3f7d43',
  env_stump_plain: '#8a5a33',
  obj_festival_plaza: '#d6b66d',
  env_signpost: '#b8864b',
  env_barrel: '#9a5f2f',
  env_campfire: '#f97316',
  env_bench: '#9a6b3f',
  env_lamp_post: '#facc15',
  env_grass_clump_01: '#5ca854',
  env_sapling: '#4d9f4f',
  env_wheat: '#d6b653',
  env_cabbage: '#7fb66c',
  env_farmland_plain: '#6d4b32',
} as const
