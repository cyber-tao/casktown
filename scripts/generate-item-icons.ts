import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { ITEMS } from '../src/data/items'
import {
  ITEM_ICON_ATLAS_CATEGORY,
  ITEM_ICON_ATLAS_IMAGE_FILE,
  ITEM_ICON_ATLAS_JSON_FILE,
  ITEM_ICON_BACKGROUND_RADIUS,
  ITEM_ICON_CELL_SIZE,
  ITEM_ICON_GRID_COLUMNS,
  ITEM_ICON_INNER_SIZE,
  ITEM_ICON_MINOR_STROKE_WIDTH,
  ITEM_ICON_PATTERN_OPACITY,
  ITEM_ICON_SHADOW_BLUR,
  ITEM_ICON_STROKE_WIDTH,
  JSON_FORMAT_SPACE_COUNT,
  POSIX_PATH_SEPARATOR,
  PROCESS_FAILURE_EXIT_CODE,
  PROCESS_SUCCESS_EXIT_CODE,
  PROJECT_ROOT_PARENT_SEGMENT,
  SOURCE_SPRITE_PACK_DIR,
  TRANSPARENT_PIXEL,
  UTF8_FILE_ENCODING,
} from './constants'
import type { ItemData } from '../src/data/types'

type IconKind =
  | 'ring'
  | 'book'
  | 'sword'
  | 'armor'
  | 'barrel'
  | 'seed'
  | 'drop'
  | 'laurel'
  | 'grass'
  | 'rice'
  | 'bell'
  | 'feather'
  | 'cookie'
  | 'wind'
  | 'amulet'
  | 'stele'
  | 'fragment'
  | 'shield'
  | 'dagger'
  | 'polearm'
  | 'blade'
  | 'scroll'
  | 'mirror'
  | 'chime'
  | 'mint'
  | 'phoenix'

interface IconProfile {
  kind: IconKind
  background: string
  primary: string
  secondary: string
  accent: string
}

interface SpriteFrame {
  frame: {
    x: number
    y: number
    w: number
    h: number
  }
  rotated: boolean
}

const scriptDir = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(scriptDir, PROJECT_ROOT_PARENT_SEGMENT)
const sourceSpritePackDir = resolve(projectRoot, SOURCE_SPRITE_PACK_DIR)

const ICON_PROFILES: Record<string, IconProfile> = {
  ring: { kind: 'ring', background: '#2d3550', primary: '#f2cc69', secondary: '#7447ba', accent: '#9af2df' },
  prophecy_book: { kind: 'book', background: '#2d3550', primary: '#6f4b96', secondary: '#f2cc69', accent: '#dbeafe' },
  fathers_sword: { kind: 'sword', background: '#293245', primary: '#d7dee8', secondary: '#9a6438', accent: '#f2cc69' },
  fathers_armor: { kind: 'armor', background: '#293245', primary: '#7792a7', secondary: '#3f5368', accent: '#f2cc69' },
  rainbow_barrel: { kind: 'barrel', background: '#203847', primary: '#ad6d34', secondary: '#69c8d8', accent: '#f2cc69' },
  seed: { kind: 'seed', background: '#203c30', primary: '#9fd178', secondary: '#6c4a2b', accent: '#e7d88c' },
  holy_water: { kind: 'drop', background: '#1f3d55', primary: '#63c6e8', secondary: '#d7f5ff', accent: '#f2cc69' },
  laurel: { kind: 'laurel', background: '#24422f', primary: '#8ec96e', secondary: '#f2cc69', accent: '#dff4c3' },
  heal_grass: { kind: 'grass', background: '#223f2c', primary: '#68b65e', secondary: '#d8f2a3', accent: '#f2cc69' },
  pineapple_rice: { kind: 'rice', background: '#4a3725', primary: '#f2d56b', secondary: '#f5f1d8', accent: '#6ebf63' },
  holy_drop: { kind: 'drop', background: '#203a5c', primary: '#6da8ff', secondary: '#dbeafe', accent: '#f2cc69' },
  antidote: { kind: 'grass', background: '#253f2d', primary: '#5cc271', secondary: '#9fe3a6', accent: '#a774df' },
  clear_bell: { kind: 'bell', background: '#2f334b', primary: '#d8b45d', secondary: '#f4df9b', accent: '#8fd6cf' },
  revive_feather: { kind: 'feather', background: '#4b2d34', primary: '#f0a5a5', secondary: '#f5d27a', accent: '#fff1c2' },
  barrel_cookie: { kind: 'cookie', background: '#463126', primary: '#ca8a48', secondary: '#7c4d2a', accent: '#f5db9c' },
  wind_pill: { kind: 'wind', background: '#263949', primary: '#9ee6e0', secondary: '#6eb8d9', accent: '#f2cc69' },
  amulet: { kind: 'amulet', background: '#32324c', primary: '#e2bd63', secondary: '#5cc8c0', accent: '#f5e7a0' },
  seal_qinglong: { kind: 'stele', background: '#1e4651', primary: '#5cb9b8', secondary: '#1f697b', accent: '#d7f5ff' },
  seal_baihu: { kind: 'stele', background: '#3a3f48', primary: '#cbd5de', secondary: '#7f8b98', accent: '#f2cc69' },
  seal_zhuque: { kind: 'stele', background: '#4a2f2f', primary: '#e96a55', secondary: '#9f4039', accent: '#f5d27a' },
  seal_xuanwu: { kind: 'stele', background: '#263748', primary: '#6a8fb4', secondary: '#405874', accent: '#d7f5ff' },
  xiaoai_light: { kind: 'fragment', background: '#333455', primary: '#d3c5ff', secondary: '#7d6adf', accent: '#ffffff' },
  wuxiang_fragment: { kind: 'fragment', background: '#252535', primary: '#a0a4b8', secondary: '#5c6275', accent: '#dbeafe' },
  baihu_kai: { kind: 'shield', background: '#3d3f45', primary: '#d8dee8', secondary: '#8b9aab', accent: '#f2cc69' },
  zi_yue: { kind: 'dagger', background: '#312b55', primary: '#b69cff', secondary: '#4a3e87', accent: '#f2cc69' },
  guan_dao: { kind: 'polearm', background: '#3f3327', primary: '#d5d9de', secondary: '#9a5136', accent: '#f2cc69' },
  yufeng_jian: { kind: 'blade', background: '#263949', primary: '#9ee6e0', secondary: '#d7dee8', accent: '#f2cc69' },
  shenyu_juanzhou: { kind: 'scroll', background: '#43334e', primary: '#f0dfb0', secondary: '#9c6bba', accent: '#f2cc69' },
  pineapple_seed: { kind: 'seed', background: '#3e3b22', primary: '#d3b64a', secondary: '#8ab55a', accent: '#f6e9a6' },
  healing_book: { kind: 'book', background: '#263a52', primary: '#5e9ed8', secondary: '#f1d884', accent: '#e9fbff' },
  water_mirror: { kind: 'mirror', background: '#203b52', primary: '#70c7de', secondary: '#d7f5ff', accent: '#f2cc69' },
  pink_chime: { kind: 'chime', background: '#4b2f43', primary: '#eca5c9', secondary: '#f2cc69', accent: '#fff0f7' },
  blue_mint: { kind: 'mint', background: '#1f4350', primary: '#62c7c9', secondary: '#9fe6df', accent: '#d7f5ff' },
  phoenix_feather: { kind: 'phoenix', background: '#4d2f28', primary: '#ff9d5a', secondary: '#f5d76c', accent: '#ff6b5a' },
}

function fallbackProfile(item: ItemData): IconProfile {
  if (item.type === 'equipment') {
    return { kind: 'shield', background: '#30384b', primary: '#c8d2de', secondary: '#798aa0', accent: '#f2cc69' }
  }
  if (item.type === 'key') {
    return { kind: 'fragment', background: '#2d3550', primary: '#d8caff', secondary: '#7562b8', accent: '#f2cc69' }
  }
  if (item.type === 'material') {
    return { kind: 'seed', background: '#263c2d', primary: '#82c66c', secondary: '#6c4a2b', accent: '#f2cc69' }
  }
  return { kind: 'grass', background: '#243c2b', primary: '#6ec56d', secondary: '#d8f2a3', accent: '#f2cc69' }
}

function sanitizeGradientId(itemId: string): string {
  return itemId.replace(/[^A-Za-z0-9_-]/g, '_')
}

function shapeSvg(profile: IconProfile): string {
  const stroke = '#17202f'
  const minorStroke = '#243047'
  switch (profile.kind) {
    case 'ring':
      return `<circle cx="48" cy="51" r="22" fill="none" stroke="${profile.primary}" stroke-width="${ITEM_ICON_STROKE_WIDTH + 2}"/><circle cx="48" cy="51" r="12" fill="none" stroke="${stroke}" stroke-width="${ITEM_ICON_MINOR_STROKE_WIDTH}"/><path d="M41 27 L48 17 L56 27 Z" fill="${profile.secondary}" stroke="${profile.accent}" stroke-width="${ITEM_ICON_MINOR_STROKE_WIDTH}"/>`
    case 'book':
      return `<path d="M26 25 H62 Q70 25 70 33 V73 Q70 78 64 78 H28 Q24 78 24 73 V29 Q24 25 26 25 Z" fill="${profile.primary}" stroke="${stroke}" stroke-width="${ITEM_ICON_STROKE_WIDTH}"/><path d="M34 25 V78" stroke="${profile.secondary}" stroke-width="${ITEM_ICON_MINOR_STROKE_WIDTH}"/><path d="M42 40 H61 M42 51 H59 M42 62 H56" stroke="${profile.accent}" stroke-width="${ITEM_ICON_MINOR_STROKE_WIDTH}" stroke-linecap="round"/>`
    case 'sword':
      return `<path d="M60 16 L70 26 L42 60 L34 52 Z" fill="${profile.primary}" stroke="${stroke}" stroke-width="${ITEM_ICON_STROKE_WIDTH}" stroke-linejoin="round"/><path d="M32 53 L43 64" stroke="${profile.accent}" stroke-width="${ITEM_ICON_STROKE_WIDTH + 1}" stroke-linecap="round"/><path d="M26 72 L38 60" stroke="${profile.secondary}" stroke-width="${ITEM_ICON_STROKE_WIDTH + 3}" stroke-linecap="round"/>`
    case 'armor':
      return `<path d="M31 25 L42 20 H54 L65 25 L62 73 Q48 82 34 73 Z" fill="${profile.primary}" stroke="${stroke}" stroke-width="${ITEM_ICON_STROKE_WIDTH}" stroke-linejoin="round"/><path d="M42 22 V76 M54 22 V76 M34 42 H62" stroke="${profile.secondary}" stroke-width="${ITEM_ICON_MINOR_STROKE_WIDTH}" stroke-linecap="round"/><path d="M43 34 H53" stroke="${profile.accent}" stroke-width="${ITEM_ICON_MINOR_STROKE_WIDTH}" stroke-linecap="round"/>`
    case 'barrel':
      return `<ellipse cx="48" cy="27" rx="22" ry="9" fill="${profile.secondary}" stroke="${stroke}" stroke-width="${ITEM_ICON_MINOR_STROKE_WIDTH}"/><path d="M27 27 Q30 49 28 70 Q48 84 68 70 Q66 49 69 27 Q48 38 27 27 Z" fill="${profile.primary}" stroke="${stroke}" stroke-width="${ITEM_ICON_STROKE_WIDTH}"/><path d="M30 42 H66 M30 62 H66 M40 32 Q36 52 39 74 M56 32 Q60 52 57 74" stroke="${profile.accent}" stroke-width="${ITEM_ICON_MINOR_STROKE_WIDTH}" stroke-linecap="round"/>`
    case 'seed':
      return `<path d="M49 70 C34 58 33 38 49 24 C64 39 63 58 49 70 Z" fill="${profile.primary}" stroke="${stroke}" stroke-width="${ITEM_ICON_STROKE_WIDTH}"/><path d="M49 27 C50 42 48 55 43 66" stroke="${profile.secondary}" stroke-width="${ITEM_ICON_MINOR_STROKE_WIDTH}" stroke-linecap="round"/><path d="M49 48 C57 41 66 42 73 50 C64 55 57 55 49 48 Z" fill="${profile.accent}" stroke="${stroke}" stroke-width="${ITEM_ICON_MINOR_STROKE_WIDTH}"/>`
    case 'drop':
      return `<path d="M48 17 C63 36 69 48 69 61 C69 75 60 84 48 84 C36 84 27 75 27 61 C27 48 33 36 48 17 Z" fill="${profile.primary}" stroke="${stroke}" stroke-width="${ITEM_ICON_STROKE_WIDTH}"/><path d="M38 57 C38 47 43 39 50 29" stroke="${profile.secondary}" stroke-width="${ITEM_ICON_MINOR_STROKE_WIDTH + 1}" stroke-linecap="round"/><circle cx="57" cy="64" r="5" fill="${profile.accent}"/>`
    case 'laurel':
      return `<path d="M33 71 C24 50 30 31 45 20" fill="none" stroke="${profile.secondary}" stroke-width="${ITEM_ICON_MINOR_STROKE_WIDTH}"/><path d="M63 71 C72 50 66 31 51 20" fill="none" stroke="${profile.secondary}" stroke-width="${ITEM_ICON_MINOR_STROKE_WIDTH}"/><path d="M35 60 C25 60 24 50 34 48 C40 50 40 56 35 60 Z M39 45 C29 43 30 33 40 34 C45 38 44 43 39 45 Z M61 60 C71 60 72 50 62 48 C56 50 56 56 61 60 Z M57 45 C67 43 66 33 56 34 C51 38 52 43 57 45 Z" fill="${profile.primary}" stroke="${stroke}" stroke-width="${ITEM_ICON_MINOR_STROKE_WIDTH}"/><circle cx="48" cy="26" r="7" fill="${profile.accent}" stroke="${stroke}" stroke-width="${ITEM_ICON_MINOR_STROKE_WIDTH}"/>`
    case 'grass':
      return `<path d="M24 75 C34 55 31 39 39 24 C46 43 46 56 43 75 Z" fill="${profile.primary}" stroke="${stroke}" stroke-width="${ITEM_ICON_MINOR_STROKE_WIDTH}"/><path d="M43 75 C47 51 54 37 69 25 C69 51 60 65 50 75 Z" fill="${profile.secondary}" stroke="${stroke}" stroke-width="${ITEM_ICON_MINOR_STROKE_WIDTH}"/><path d="M27 75 H70" stroke="${profile.accent}" stroke-width="${ITEM_ICON_STROKE_WIDTH}" stroke-linecap="round"/>`
    case 'rice':
      return `<path d="M34 42 C40 26 58 26 64 42 C78 48 74 72 48 75 C22 72 18 48 34 42 Z" fill="${profile.secondary}" stroke="${stroke}" stroke-width="${ITEM_ICON_STROKE_WIDTH}"/><path d="M34 38 L48 20 L62 38 Z" fill="${profile.primary}" stroke="${stroke}" stroke-width="${ITEM_ICON_MINOR_STROKE_WIDTH}"/><path d="M42 51 H54 M37 61 H60" stroke="${profile.accent}" stroke-width="${ITEM_ICON_MINOR_STROKE_WIDTH}" stroke-linecap="round"/>`
    case 'bell':
      return `<path d="M33 62 C35 39 41 31 48 31 C55 31 61 39 63 62 L69 71 H27 Z" fill="${profile.primary}" stroke="${stroke}" stroke-width="${ITEM_ICON_STROKE_WIDTH}" stroke-linejoin="round"/><path d="M42 31 C42 23 54 23 54 31" fill="none" stroke="${profile.secondary}" stroke-width="${ITEM_ICON_MINOR_STROKE_WIDTH}"/><circle cx="48" cy="74" r="5" fill="${profile.accent}" stroke="${stroke}" stroke-width="${ITEM_ICON_MINOR_STROKE_WIDTH}"/>`
    case 'feather':
      return `<path d="M26 72 C45 29 67 18 73 25 C81 34 61 59 30 78 Z" fill="${profile.primary}" stroke="${stroke}" stroke-width="${ITEM_ICON_STROKE_WIDTH}"/><path d="M31 73 C44 57 56 43 72 25 M42 62 L34 58 M51 52 L41 47 M59 42 L50 36" stroke="${profile.secondary}" stroke-width="${ITEM_ICON_MINOR_STROKE_WIDTH}" stroke-linecap="round"/><path d="M25 79 L39 67" stroke="${profile.accent}" stroke-width="${ITEM_ICON_MINOR_STROKE_WIDTH}" stroke-linecap="round"/>`
    case 'cookie':
      return `<circle cx="48" cy="51" r="28" fill="${profile.primary}" stroke="${stroke}" stroke-width="${ITEM_ICON_STROKE_WIDTH}"/><circle cx="38" cy="43" r="4" fill="${profile.secondary}"/><circle cx="56" cy="40" r="3" fill="${profile.secondary}"/><circle cx="57" cy="61" r="4" fill="${profile.secondary}"/><circle cx="42" cy="64" r="3" fill="${profile.accent}"/>`
    case 'wind':
      return `<path d="M25 43 H56 C66 43 66 29 56 29 C51 29 48 32 47 36" fill="none" stroke="${profile.primary}" stroke-width="${ITEM_ICON_STROKE_WIDTH + 2}" stroke-linecap="round"/><path d="M24 58 H67 C77 58 77 73 66 73 C60 73 57 69 57 65" fill="none" stroke="${profile.secondary}" stroke-width="${ITEM_ICON_STROKE_WIDTH + 1}" stroke-linecap="round"/><path d="M35 72 H48" stroke="${profile.accent}" stroke-width="${ITEM_ICON_MINOR_STROKE_WIDTH}" stroke-linecap="round"/>`
    case 'amulet':
      return `<path d="M48 19 L68 34 L61 72 L48 82 L35 72 L28 34 Z" fill="${profile.primary}" stroke="${stroke}" stroke-width="${ITEM_ICON_STROKE_WIDTH}" stroke-linejoin="round"/><path d="M48 30 L58 47 L48 65 L38 47 Z" fill="${profile.secondary}" stroke="${minorStroke}" stroke-width="${ITEM_ICON_MINOR_STROKE_WIDTH}"/><circle cx="48" cy="47" r="5" fill="${profile.accent}"/>`
    case 'stele':
      return `<path d="M31 77 V34 Q31 23 48 21 Q65 23 65 34 V77 Z" fill="${profile.primary}" stroke="${stroke}" stroke-width="${ITEM_ICON_STROKE_WIDTH}" stroke-linejoin="round"/><path d="M38 41 H58 M38 52 H58 M41 63 H55" stroke="${profile.secondary}" stroke-width="${ITEM_ICON_MINOR_STROKE_WIDTH}" stroke-linecap="round"/><circle cx="48" cy="32" r="5" fill="${profile.accent}"/>`
    case 'fragment':
      return `<path d="M50 17 L70 38 L61 78 L35 72 L25 42 Z" fill="${profile.primary}" stroke="${stroke}" stroke-width="${ITEM_ICON_STROKE_WIDTH}" stroke-linejoin="round"/><path d="M50 17 L47 49 L70 38 M47 49 L35 72" fill="none" stroke="${profile.secondary}" stroke-width="${ITEM_ICON_MINOR_STROKE_WIDTH}"/><circle cx="54" cy="48" r="5" fill="${profile.accent}"/>`
    case 'shield':
      return `<path d="M48 18 L68 27 V48 C68 64 60 75 48 82 C36 75 28 64 28 48 V27 Z" fill="${profile.primary}" stroke="${stroke}" stroke-width="${ITEM_ICON_STROKE_WIDTH}" stroke-linejoin="round"/><path d="M48 25 V74 M35 41 H61" stroke="${profile.secondary}" stroke-width="${ITEM_ICON_MINOR_STROKE_WIDTH}" stroke-linecap="round"/><path d="M39 31 H57" stroke="${profile.accent}" stroke-width="${ITEM_ICON_MINOR_STROKE_WIDTH}" stroke-linecap="round"/>`
    case 'dagger':
      return `<path d="M52 20 L64 32 L43 59 L35 51 Z" fill="${profile.primary}" stroke="${stroke}" stroke-width="${ITEM_ICON_STROKE_WIDTH}" stroke-linejoin="round"/><path d="M33 51 L45 63" stroke="${profile.accent}" stroke-width="${ITEM_ICON_STROKE_WIDTH}" stroke-linecap="round"/><path d="M28 72 L38 62" stroke="${profile.secondary}" stroke-width="${ITEM_ICON_STROKE_WIDTH + 2}" stroke-linecap="round"/>`
    case 'polearm':
      return `<path d="M58 17 L72 33 L58 47 L51 36 Z" fill="${profile.primary}" stroke="${stroke}" stroke-width="${ITEM_ICON_STROKE_WIDTH}" stroke-linejoin="round"/><path d="M29 78 L58 35" stroke="${profile.secondary}" stroke-width="${ITEM_ICON_STROKE_WIDTH}" stroke-linecap="round"/><path d="M50 44 L62 52" stroke="${profile.accent}" stroke-width="${ITEM_ICON_MINOR_STROKE_WIDTH}" stroke-linecap="round"/>`
    case 'blade':
      return `<path d="M28 70 C43 39 57 23 73 19 C70 42 54 62 34 77 Z" fill="${profile.primary}" stroke="${stroke}" stroke-width="${ITEM_ICON_STROKE_WIDTH}" stroke-linejoin="round"/><path d="M35 70 C48 54 57 39 72 20" stroke="${profile.secondary}" stroke-width="${ITEM_ICON_MINOR_STROKE_WIDTH}" stroke-linecap="round"/><path d="M25 78 L38 68" stroke="${profile.accent}" stroke-width="${ITEM_ICON_STROKE_WIDTH}" stroke-linecap="round"/>`
    case 'scroll':
      return `<path d="M30 29 H63 C70 29 73 34 70 40 V73 H35 V40 C27 40 25 29 30 29 Z" fill="${profile.primary}" stroke="${stroke}" stroke-width="${ITEM_ICON_STROKE_WIDTH}"/><path d="M36 43 H62 M36 54 H60 M36 65 H55" stroke="${profile.secondary}" stroke-width="${ITEM_ICON_MINOR_STROKE_WIDTH}" stroke-linecap="round"/><circle cx="31" cy="35" r="7" fill="${profile.accent}" stroke="${stroke}" stroke-width="${ITEM_ICON_MINOR_STROKE_WIDTH}"/>`
    case 'mirror':
      return `<ellipse cx="48" cy="43" rx="21" ry="25" fill="${profile.primary}" stroke="${stroke}" stroke-width="${ITEM_ICON_STROKE_WIDTH}"/><ellipse cx="48" cy="43" rx="12" ry="15" fill="${profile.secondary}" opacity="0.85"/><path d="M48 69 V82" stroke="${profile.accent}" stroke-width="${ITEM_ICON_STROKE_WIDTH}" stroke-linecap="round"/><path d="M39 33 C43 28 50 27 56 31" stroke="#ffffff" stroke-width="${ITEM_ICON_MINOR_STROKE_WIDTH}" stroke-linecap="round" opacity="0.7"/>`
    case 'chime':
      return `<path d="M48 19 V33" stroke="${profile.secondary}" stroke-width="${ITEM_ICON_MINOR_STROKE_WIDTH}" stroke-linecap="round"/><path d="M34 35 Q48 25 62 35 V66 Q48 75 34 66 Z" fill="${profile.primary}" stroke="${stroke}" stroke-width="${ITEM_ICON_STROKE_WIDTH}"/><path d="M43 74 H53" stroke="${profile.accent}" stroke-width="${ITEM_ICON_STROKE_WIDTH}" stroke-linecap="round"/><path d="M42 44 H54 M40 55 H56" stroke="${profile.secondary}" stroke-width="${ITEM_ICON_MINOR_STROKE_WIDTH}" stroke-linecap="round"/>`
    case 'mint':
      return `<path d="M45 77 C31 62 27 43 36 27 C50 37 52 57 45 77 Z" fill="${profile.primary}" stroke="${stroke}" stroke-width="${ITEM_ICON_MINOR_STROKE_WIDTH}"/><path d="M51 76 C45 54 52 36 68 25 C73 48 65 66 51 76 Z" fill="${profile.secondary}" stroke="${stroke}" stroke-width="${ITEM_ICON_MINOR_STROKE_WIDTH}"/><path d="M45 73 C47 55 54 40 67 28" stroke="${profile.accent}" stroke-width="${ITEM_ICON_MINOR_STROKE_WIDTH}" stroke-linecap="round"/>`
    case 'phoenix':
      return `<path d="M29 73 C35 45 48 23 68 17 C62 35 73 42 67 58 C61 73 44 79 29 73 Z" fill="${profile.primary}" stroke="${stroke}" stroke-width="${ITEM_ICON_STROKE_WIDTH}"/><path d="M37 70 C48 55 56 38 68 18 M50 61 C59 60 66 55 70 47" stroke="${profile.secondary}" stroke-width="${ITEM_ICON_MINOR_STROKE_WIDTH}" stroke-linecap="round"/><path d="M29 74 C39 65 44 61 54 58" stroke="${profile.accent}" stroke-width="${ITEM_ICON_MINOR_STROKE_WIDTH}" stroke-linecap="round"/>`
  }
}

function createIconSvg(itemId: string, item: ItemData): string {
  const profile = ICON_PROFILES[itemId] ?? fallbackProfile(item)
  const gradientId = `bg_${sanitizeGradientId(itemId)}`
  const offset = (ITEM_ICON_CELL_SIZE - ITEM_ICON_INNER_SIZE) / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ITEM_ICON_CELL_SIZE}" height="${ITEM_ICON_CELL_SIZE}" viewBox="0 0 ${ITEM_ICON_CELL_SIZE} ${ITEM_ICON_CELL_SIZE}">
<defs>
<linearGradient id="${gradientId}" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="${profile.background}"/>
<stop offset="1" stop-color="#0b111b"/>
</linearGradient>
<filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
<feDropShadow dx="0" dy="3" stdDeviation="${ITEM_ICON_SHADOW_BLUR}" flood-color="#000000" flood-opacity="0.35"/>
</filter>
</defs>
<rect x="${offset}" y="${offset}" width="${ITEM_ICON_INNER_SIZE}" height="${ITEM_ICON_INNER_SIZE}" rx="${ITEM_ICON_BACKGROUND_RADIUS}" fill="url(#${gradientId})" stroke="#6ba4b8" stroke-width="${ITEM_ICON_MINOR_STROKE_WIDTH}" filter="url(#shadow)"/>
<path d="M26 25 L70 69 M70 25 L26 69" stroke="#ffffff" stroke-width="${ITEM_ICON_MINOR_STROKE_WIDTH}" opacity="${ITEM_ICON_PATTERN_OPACITY}"/>
${shapeSvg(profile)}
</svg>`
}

async function generateItemIcons(): Promise<void> {
  await mkdir(sourceSpritePackDir, { recursive: true })
  const entries = Object.entries(ITEMS).sort(([a], [b]) => a.localeCompare(b))
  const rows = Math.ceil(entries.length / ITEM_ICON_GRID_COLUMNS)
  const width = ITEM_ICON_GRID_COLUMNS * ITEM_ICON_CELL_SIZE
  const height = rows * ITEM_ICON_CELL_SIZE
  const frames: Record<string, SpriteFrame> = {}
  const composites: sharp.OverlayOptions[] = []

  for (let index = 0; index < entries.length; index++) {
    const [itemId, item] = entries[index]!
    const x = index % ITEM_ICON_GRID_COLUMNS * ITEM_ICON_CELL_SIZE
    const y = Math.floor(index / ITEM_ICON_GRID_COLUMNS) * ITEM_ICON_CELL_SIZE
    const input = await sharp(Buffer.from(createIconSvg(itemId, item))).png().toBuffer()
    composites.push({ input, left: x, top: y })
    frames[itemId] = {
      frame: { x, y, w: ITEM_ICON_CELL_SIZE, h: ITEM_ICON_CELL_SIZE },
      rotated: false,
    }
  }

  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: TRANSPARENT_PIXEL,
    },
  })
    .composite(composites)
    .png()
    .toFile(resolve(sourceSpritePackDir, ITEM_ICON_ATLAS_IMAGE_FILE))

  await writeFile(
    resolve(sourceSpritePackDir, ITEM_ICON_ATLAS_JSON_FILE),
    `${JSON.stringify({ frames, meta: { category: ITEM_ICON_ATLAS_CATEGORY, image: ITEM_ICON_ATLAS_IMAGE_FILE } }, null, JSON_FORMAT_SPACE_COUNT)}\n`,
    UTF8_FILE_ENCODING,
  )

  console.info(`Generated ${entries.length} item icons at ${ITEM_ICON_ATLAS_CATEGORY}${POSIX_PATH_SEPARATOR}${ITEM_ICON_ATLAS_IMAGE_FILE}`)
}

generateItemIcons()
  .then(() => {
    process.exitCode = PROCESS_SUCCESS_EXIT_CODE
  })
  .catch((error: unknown) => {
    console.error('Item icon generation failed:', error)
    process.exitCode = PROCESS_FAILURE_EXIT_CODE
  })
