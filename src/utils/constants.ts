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

export const SAVE_SLOTS = 3

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
