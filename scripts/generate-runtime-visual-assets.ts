import { access, copyFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { ITEMS } from '../src/data/items'
import type { ItemData } from '../src/data/types'
import {
  ALPHA_CHANNEL_OFFSET,
  DESIGN_ITEM_ICON_SOURCE_DIR,
  DESIGN_RUNTIME_ASSET_DIR,
  PNG_FILE_EXTENSION,
  PROCESS_FAILURE_EXIT_CODE,
  PROCESS_SUCCESS_EXIT_CODE,
  PROJECT_ROOT_PARENT_SEGMENT,
  RGBA_CHANNEL_COUNT,
  RGB_BACKGROUND_MAX_CHANNEL_DELTA,
  RGB_BACKGROUND_MIN_CHANNEL_VALUE,
  RUNTIME_ITEM_ICON_OUTPUT_DIR,
  RUNTIME_ITEM_ICON_SIZE_PX,
  RUNTIME_UI_IMAGE_SOURCE_DEFINITIONS,
  RUNTIME_UI_OUTPUT_DIR,
  RUNTIME_UI_SCALE_MODE,
  RUNTIME_VISUAL_ASSET_DEFINITIONS,
} from './constants'

type RuntimeUiAssetDefinition = typeof RUNTIME_VISUAL_ASSET_DEFINITIONS.ui[number]
type RuntimeUiAssetName = RuntimeUiAssetDefinition['name']
type RuntimeUiSourceDefinition = typeof RUNTIME_UI_IMAGE_SOURCE_DEFINITIONS[RuntimeUiAssetName]
type CropDefinition = NonNullable<Extract<RuntimeUiSourceDefinition, { crop: unknown }>['crop']>
type SliceDefinition = NonNullable<Extract<RuntimeUiSourceDefinition, { slice: unknown }>['slice']>

const scriptDir = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(scriptDir, PROJECT_ROOT_PARENT_SEGMENT)
const runtimeUiOutputDir = resolveInside(projectRoot, RUNTIME_UI_OUTPUT_DIR)
const designRuntimeAssetDir = resolveInside(projectRoot, DESIGN_RUNTIME_ASSET_DIR)
const runtimeItemIconOutputDir = resolveInside(projectRoot, RUNTIME_ITEM_ICON_OUTPUT_DIR)
const designItemIconSourceDir = resolveInside(projectRoot, DESIGN_ITEM_ICON_SOURCE_DIR)

type ItemIconTheme = {
  label: string
  background: string
  accent: string
  symbol: 'armor' | 'bell' | 'book' | 'bottle' | 'chime' | 'cookie' | 'drop' | 'feather' | 'fragment' | 'key' | 'laurel' | 'leaf' | 'pill' | 'ring' | 'seal' | 'shield' | 'sword'
}

const ITEM_ICON_THEMES: Record<string, ItemIconTheme> = {
  ring: { label: 'R', background: '#302250', accent: '#d9c16c', symbol: 'ring' },
  prophecy_book: { label: 'P', background: '#4a2f1b', accent: '#f0d39a', symbol: 'book' },
  fathers_sword: { label: 'T', background: '#2f3d4d', accent: '#d4e0ee', symbol: 'sword' },
  fathers_armor: { label: 'A', background: '#3b342f', accent: '#d9c2a2', symbol: 'armor' },
  rainbow_barrel: { label: '7', background: '#53335b', accent: '#f8d66d', symbol: 'key' },
  seed: { label: 'S', background: '#254327', accent: '#91d66d', symbol: 'leaf' },
  holy_water: { label: 'H', background: '#1f4b6a', accent: '#9fe7ff', symbol: 'drop' },
  laurel: { label: 'L', background: '#314b24', accent: '#d8cf66', symbol: 'laurel' },
  holy_drop: { label: 'MP', background: '#1f456b', accent: '#7fd2ff', symbol: 'drop' },
  clear_bell: { label: 'B', background: '#4b3920', accent: '#f0c96b', symbol: 'bell' },
  revive_feather: { label: 'RV', background: '#55352f', accent: '#ffb27c', symbol: 'feather' },
  barrel_cookie: { label: 'C', background: '#5a3d24', accent: '#d8944a', symbol: 'cookie' },
  wind_pill: { label: 'W', background: '#244a43', accent: '#9be6cc', symbol: 'pill' },
  amulet: { label: 'AM', background: '#3d3556', accent: '#c7a6ff', symbol: 'shield' },
  seal_qinglong: { label: 'Q', background: '#174c50', accent: '#74e4d2', symbol: 'seal' },
  seal_baihu: { label: 'B', background: '#3f4852', accent: '#f0f3e9', symbol: 'seal' },
  seal_zhuque: { label: 'Z', background: '#5a251d', accent: '#ff8b63', symbol: 'seal' },
  seal_xuanwu: { label: 'X', background: '#233044', accent: '#97b4e8', symbol: 'seal' },
  xiaoai_light: { label: 'XL', background: '#3b2c57', accent: '#f4dfff', symbol: 'fragment' },
  wuxiang_fragment: { label: 'WF', background: '#25202f', accent: '#a88bff', symbol: 'fragment' },
  baihu_kai: { label: 'BK', background: '#4d4638', accent: '#fff0c1', symbol: 'armor' },
  zi_yue: { label: 'ZY', background: '#48285d', accent: '#f1a7ff', symbol: 'sword' },
  guan_dao: { label: 'GD', background: '#563022', accent: '#ffc177', symbol: 'sword' },
  yufeng_jian: { label: 'YF', background: '#254a43', accent: '#99e9d2', symbol: 'sword' },
  shenyu_juanzhou: { label: 'SJ', background: '#2d3b67', accent: '#c8ddff', symbol: 'book' },
  healing_book: { label: 'HB', background: '#2d5131', accent: '#a5f2aa', symbol: 'book' },
  water_mirror: { label: 'WM', background: '#204c62', accent: '#a7edff', symbol: 'shield' },
  guard_charm: { label: 'GC', background: '#4c3725', accent: '#ffd18c', symbol: 'shield' },
  pink_chime: { label: 'PC', background: '#5a2f54', accent: '#ffa6dc', symbol: 'chime' },
  blue_mint: { label: 'BM', background: '#214d4b', accent: '#8ee8df', symbol: 'leaf' },
  phoenix_feather: { label: 'PF', background: '#5b2d22', accent: '#ffb16f', symbol: 'feather' },
}

const ITEM_TYPE_ICON_THEMES: Record<ItemData['type'], ItemIconTheme> = {
  key: { label: 'K', background: '#45311f', accent: '#e2bd6f', symbol: 'key' },
  consumable: { label: 'I', background: '#254426', accent: '#98d86d', symbol: 'bottle' },
  equipment: { label: 'E', background: '#2f3b4c', accent: '#d7e2f1', symbol: 'sword' },
  material: { label: 'M', background: '#3d3429', accent: '#d8a45b', symbol: 'fragment' },
}

function resolveInside(basePath: string, ...segments: string[]): string {
  const resolvedBasePath = resolve(basePath)
  const resolvedPath = resolve(resolvedBasePath, ...segments)
  const basePathWithSeparator = resolvedBasePath.endsWith(sep) ? resolvedBasePath : `${resolvedBasePath}${sep}`
  if (resolvedPath !== resolvedBasePath && !resolvedPath.startsWith(basePathWithSeparator)) {
    throw new Error(`Path escapes base directory: ${resolvedPath}`)
  }
  return resolvedPath
}

function getPngFileName(name: string): string {
  return name.endsWith(PNG_FILE_EXTENSION) ? name : `${name}${PNG_FILE_EXTENSION}`
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

function escapeSvgText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function getItemIconTheme(itemId: string, item: ItemData): ItemIconTheme {
  return ITEM_ICON_THEMES[itemId] ?? ITEM_TYPE_ICON_THEMES[item.type]
}

function renderItemIconSymbol(theme: ItemIconTheme): string {
  const { accent } = theme
  const darkStroke = '#1b1620'
  switch (theme.symbol) {
    case 'armor':
      return `<path d="M40 15 L58 23 L55 52 L40 61 L25 52 L22 23 Z" fill="${accent}" stroke="${darkStroke}" stroke-width="4"/><path d="M40 19 V57" stroke="${darkStroke}" stroke-width="3" opacity="0.45"/>`
    case 'bell':
      return `<path d="M28 48 C29 30 32 21 40 21 C48 21 51 30 52 48 L57 55 H23 Z" fill="${accent}" stroke="${darkStroke}" stroke-width="4"/><circle cx="40" cy="59" r="4" fill="${accent}" stroke="${darkStroke}" stroke-width="3"/>`
    case 'book':
      return `<path d="M21 20 H38 C42 20 44 23 44 27 V59 H27 C23 59 21 56 21 52 Z" fill="${accent}" stroke="${darkStroke}" stroke-width="4"/><path d="M44 27 C44 23 47 20 51 20 H59 V59 H44 Z" fill="#fff1bf" stroke="${darkStroke}" stroke-width="4"/><path d="M30 30 H38 M30 39 H38 M49 30 H55 M49 39 H55" stroke="${darkStroke}" stroke-width="3" opacity="0.45"/>`
    case 'bottle':
      return `<path d="M33 17 H47 V27 L53 36 V58 C53 62 50 65 46 65 H34 C30 65 27 62 27 58 V36 L33 27 Z" fill="${accent}" stroke="${darkStroke}" stroke-width="4"/><path d="M31 47 H49" stroke="${darkStroke}" stroke-width="4" opacity="0.35"/>`
    case 'chime':
      return `<path d="M27 21 H53 L48 47 H32 Z" fill="${accent}" stroke="${darkStroke}" stroke-width="4"/><path d="M40 47 V64 M30 55 H50" stroke="${accent}" stroke-width="5" stroke-linecap="round"/><path d="M40 47 V64 M30 55 H50" stroke="${darkStroke}" stroke-width="2" stroke-linecap="round"/>`
    case 'cookie':
      return `<circle cx="40" cy="42" r="24" fill="${accent}" stroke="${darkStroke}" stroke-width="4"/><circle cx="31" cy="35" r="3" fill="${darkStroke}"/><circle cx="45" cy="31" r="3" fill="${darkStroke}"/><circle cx="50" cy="47" r="3" fill="${darkStroke}"/><circle cx="35" cy="51" r="3" fill="${darkStroke}"/>`
    case 'drop':
      return `<path d="M40 15 C51 31 58 41 58 50 C58 62 50 70 40 70 C30 70 22 62 22 50 C22 41 29 31 40 15 Z" fill="${accent}" stroke="${darkStroke}" stroke-width="4"/><path d="M33 45 C35 35 40 28 44 22" stroke="#ffffff" stroke-width="4" stroke-linecap="round" opacity="0.45"/>`
    case 'feather':
      return `<path d="M25 58 C35 24 54 15 61 19 C65 32 50 55 28 63 Z" fill="${accent}" stroke="${darkStroke}" stroke-width="4"/><path d="M28 62 C38 50 48 38 59 21 M37 50 L28 47 M45 41 L35 37 M52 32 L43 29" stroke="${darkStroke}" stroke-width="3" stroke-linecap="round" opacity="0.55"/>`
    case 'fragment':
      return `<path d="M40 15 L59 33 L52 60 L28 63 L21 35 Z" fill="${accent}" stroke="${darkStroke}" stroke-width="4"/><path d="M40 15 L38 42 L52 60 M21 35 L38 42 L59 33" stroke="${darkStroke}" stroke-width="3" opacity="0.45"/>`
    case 'key':
      return `<circle cx="31" cy="34" r="13" fill="${accent}" stroke="${darkStroke}" stroke-width="4"/><path d="M43 34 H63 V45 H56 V52 H48 V43 H43 Z" fill="${accent}" stroke="${darkStroke}" stroke-width="4"/><circle cx="31" cy="34" r="5" fill="${theme.background}" stroke="${darkStroke}" stroke-width="3"/>`
    case 'laurel':
      return `<path d="M28 57 C24 42 28 27 39 17 M52 57 C56 42 52 27 41 17" fill="none" stroke="${darkStroke}" stroke-width="4"/><path d="M29 50 C18 43 20 36 31 40 M31 39 C20 31 25 25 35 32 M51 50 C62 43 60 36 49 40 M49 39 C60 31 55 25 45 32" fill="${accent}" stroke="${darkStroke}" stroke-width="3"/>`
    case 'leaf':
      return `<path d="M20 52 C26 25 48 17 62 20 C61 43 45 61 20 52 Z" fill="${accent}" stroke="${darkStroke}" stroke-width="4"/><path d="M23 52 C34 44 45 35 59 21 M34 46 C32 38 34 31 41 25 M45 37 C50 38 55 36 60 31" stroke="${darkStroke}" stroke-width="3" opacity="0.55"/>`
    case 'pill':
      return `<path d="M25 51 C18 44 18 34 25 27 C32 20 42 20 49 27 L55 33 C62 40 62 50 55 57 C48 64 38 64 31 57 Z" fill="${accent}" stroke="${darkStroke}" stroke-width="4"/><path d="M38 27 L55 44" stroke="${darkStroke}" stroke-width="4" opacity="0.45"/>`
    case 'ring':
      return `<circle cx="40" cy="43" r="22" fill="none" stroke="${accent}" stroke-width="10"/><circle cx="40" cy="43" r="13" fill="none" stroke="${darkStroke}" stroke-width="4"/><path d="M34 18 H46 L51 27 H29 Z" fill="${accent}" stroke="${darkStroke}" stroke-width="4"/>`
    case 'seal':
      return `<path d="M25 18 H55 L59 55 L40 66 L21 55 Z" fill="${accent}" stroke="${darkStroke}" stroke-width="4"/><path d="M32 29 H48 M30 40 H50 M34 51 H46" stroke="${darkStroke}" stroke-width="4" opacity="0.5"/>`
    case 'shield':
      return `<path d="M40 16 L59 24 V39 C59 53 51 63 40 68 C29 63 21 53 21 39 V24 Z" fill="${accent}" stroke="${darkStroke}" stroke-width="4"/><path d="M40 22 V62 M27 38 H53" stroke="${darkStroke}" stroke-width="3" opacity="0.45"/>`
    case 'sword':
      return `<path d="M52 14 L61 19 L42 48 L35 41 Z" fill="${accent}" stroke="${darkStroke}" stroke-width="4"/><path d="M28 50 L34 44 L41 51 L35 57 Z" fill="#d29b55" stroke="${darkStroke}" stroke-width="4"/><path d="M22 61 L33 50" stroke="${accent}" stroke-width="7" stroke-linecap="round"/><path d="M22 61 L33 50" stroke="${darkStroke}" stroke-width="3" stroke-linecap="round"/>`
  }
}

async function renderGeneratedItemIcon(itemId: string, item: ItemData): Promise<Buffer> {
  const theme = getItemIconTheme(itemId, item)
  const size = RUNTIME_ITEM_ICON_SIZE_PX
  const label = escapeSvgText(theme.label)
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="geometricPrecision">
      <rect x="2" y="2" width="76" height="76" rx="10" fill="${theme.background}" stroke="#1b1620" stroke-width="4"/>
      <rect x="7" y="7" width="66" height="66" rx="7" fill="none" stroke="#f7d994" stroke-width="2" opacity="0.45"/>
      ${renderItemIconSymbol(theme)}
      <rect x="8" y="58" width="28" height="16" rx="4" fill="#1b1620" opacity="0.78"/>
      <text x="22" y="70" text-anchor="middle" font-family="Georgia, serif" font-size="${label.length > 1 ? 10 : 12}" font-weight="700" fill="#fff4c0">${label}</text>
    </svg>
  `
  return sharp(Buffer.from(svg)).png().toBuffer()
}

async function writeItemIconAsset(itemId: string, item: ItemData): Promise<'copied' | 'generated' | 'kept'> {
  const fileName = getPngFileName(itemId)
  const runtimePath = resolveInside(runtimeItemIconOutputDir, fileName)
  if (await pathExists(runtimePath)) return 'kept'

  const sourcePath = resolveInside(designItemIconSourceDir, fileName)
  if (await pathExists(sourcePath)) {
    await copyFile(sourcePath, runtimePath)
    return 'copied'
  }

  const icon = await renderGeneratedItemIcon(itemId, item)
  await writeFile(runtimePath, icon)
  await writeFile(sourcePath, icon)
  return 'generated'
}

async function generateRuntimeItemIcons(): Promise<{ copied: number; generated: number; kept: number }> {
  await Promise.all([
    mkdir(runtimeItemIconOutputDir, { recursive: true }),
    mkdir(designItemIconSourceDir, { recursive: true }),
  ])

  const counts = { copied: 0, generated: 0, kept: 0 }
  for (const [itemId, item] of Object.entries(ITEMS)) {
    const result = await writeItemIconAsset(itemId, item)
    counts[result] += 1
  }
  return counts
}

function isFlatPreviewBackground(red: number, green: number, blue: number): boolean {
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  return min >= RGB_BACKGROUND_MIN_CHANNEL_VALUE && max - min <= RGB_BACKGROUND_MAX_CHANNEL_DELTA
}

async function readSourceCrop(sourcePath: string, crop?: CropDefinition): Promise<Buffer> {
  let image = sharp(sourcePath).ensureAlpha()
  if (crop) image = image.extract(crop)
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true })
  for (let i = 0; i < data.length; i += RGBA_CHANNEL_COUNT) {
    if (isFlatPreviewBackground(data[i]!, data[i + 1]!, data[i + 2]!)) {
      data[i + ALPHA_CHANNEL_OFFSET] = 0
    }
  }
  return sharp(data, { raw: info }).png().toBuffer()
}

async function resizeContain(source: Buffer, targetWidth: number, targetHeight: number, paddingRatio: number): Promise<Buffer> {
  const paddingX = Math.round(targetWidth * paddingRatio)
  const paddingY = Math.round(targetHeight * paddingRatio)
  const resized = await sharp(source)
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize({
      width: targetWidth - paddingX * 2,
      height: targetHeight - paddingY * 2,
      fit: 'contain',
      kernel: 'nearest',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer()
  const metadata = await sharp(resized).metadata()
  if (!metadata.width || !metadata.height) throw new Error('Invalid runtime UI contain output')
  return sharp({
    create: {
      width: targetWidth,
      height: targetHeight,
      channels: RGBA_CHANNEL_COUNT,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{
      input: resized,
      left: Math.round((targetWidth - metadata.width) / 2),
      top: Math.round((targetHeight - metadata.height) / 2),
    }])
    .png()
    .toBuffer()
}

async function resizePart(source: Buffer, crop: CropDefinition, width: number, height: number): Promise<Buffer> {
  return sharp(source)
    .extract(crop)
    .resize(width, height, {
      fit: 'fill',
      kernel: 'nearest',
    })
    .png()
    .toBuffer()
}

async function resizeNineSlice(source: Buffer, targetWidth: number, targetHeight: number, slice: SliceDefinition): Promise<Buffer> {
  const metadata = await sharp(source).metadata()
  if (!metadata.width || !metadata.height) throw new Error('Invalid runtime UI source image')

  const centerSourceWidth = metadata.width - slice.left - slice.right
  const centerSourceHeight = metadata.height - slice.top - slice.bottom
  const centerTargetWidth = targetWidth - slice.left - slice.right
  const centerTargetHeight = targetHeight - slice.top - slice.bottom
  if (centerSourceWidth <= 0 || centerSourceHeight <= 0 || centerTargetWidth <= 0 || centerTargetHeight <= 0) {
    throw new Error('Invalid runtime UI nine-slice bounds')
  }

  const composites = await Promise.all([
    { input: await resizePart(source, { left: 0, top: 0, width: slice.left, height: slice.top }, slice.left, slice.top), left: 0, top: 0 },
    { input: await resizePart(source, { left: slice.left, top: 0, width: centerSourceWidth, height: slice.top }, centerTargetWidth, slice.top), left: slice.left, top: 0 },
    { input: await resizePart(source, { left: metadata.width - slice.right, top: 0, width: slice.right, height: slice.top }, slice.right, slice.top), left: targetWidth - slice.right, top: 0 },
    { input: await resizePart(source, { left: 0, top: slice.top, width: slice.left, height: centerSourceHeight }, slice.left, centerTargetHeight), left: 0, top: slice.top },
    { input: await resizePart(source, { left: slice.left, top: slice.top, width: centerSourceWidth, height: centerSourceHeight }, centerTargetWidth, centerTargetHeight), left: slice.left, top: slice.top },
    { input: await resizePart(source, { left: metadata.width - slice.right, top: slice.top, width: slice.right, height: centerSourceHeight }, slice.right, centerTargetHeight), left: targetWidth - slice.right, top: slice.top },
    { input: await resizePart(source, { left: 0, top: metadata.height - slice.bottom, width: slice.left, height: slice.bottom }, slice.left, slice.bottom), left: 0, top: targetHeight - slice.bottom },
    { input: await resizePart(source, { left: slice.left, top: metadata.height - slice.bottom, width: centerSourceWidth, height: slice.bottom }, centerTargetWidth, slice.bottom), left: slice.left, top: targetHeight - slice.bottom },
    { input: await resizePart(source, { left: metadata.width - slice.right, top: metadata.height - slice.bottom, width: slice.right, height: slice.bottom }, slice.right, slice.bottom), left: targetWidth - slice.right, top: targetHeight - slice.bottom },
  ])

  return sharp({
    create: {
      width: targetWidth,
      height: targetHeight,
      channels: RGBA_CHANNEL_COUNT,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toBuffer()
}

async function renderRuntimeUiAsset(definition: RuntimeUiAssetDefinition): Promise<Buffer> {
  const sourceDefinition = RUNTIME_UI_IMAGE_SOURCE_DEFINITIONS[definition.name]
  const sourcePath = resolveInside(projectRoot, sourceDefinition.source)
  const source = await readSourceCrop(sourcePath, 'crop' in sourceDefinition ? sourceDefinition.crop : undefined)
  const { width, height } = definition.target

  if (sourceDefinition.mode === RUNTIME_UI_SCALE_MODE.CONTAIN) {
    return resizeContain(source, width, height, sourceDefinition.paddingRatio)
  }
  return resizeNineSlice(source, width, height, sourceDefinition.slice)
}

async function writeRuntimeUiAsset(definition: RuntimeUiAssetDefinition): Promise<void> {
  const output = await renderRuntimeUiAsset(definition)
  const fileName = getPngFileName(definition.name)
  await writeFile(resolveInside(runtimeUiOutputDir, fileName), output)
  await writeFile(resolveInside(designRuntimeAssetDir, fileName), output)
}

async function generateRuntimeVisualAssets(): Promise<void> {
  await Promise.all([
    mkdir(runtimeUiOutputDir, { recursive: true }),
    mkdir(designRuntimeAssetDir, { recursive: true }),
  ])

  for (const definition of RUNTIME_VISUAL_ASSET_DEFINITIONS.ui) {
    await writeRuntimeUiAsset(definition)
  }
  const itemIconCounts = await generateRuntimeItemIcons()

  console.info(`Generated ${RUNTIME_VISUAL_ASSET_DEFINITIONS.ui.length} runtime UI image assets`)
  console.info(`Generated ${itemIconCounts.generated} item icons, copied ${itemIconCounts.copied}, kept ${itemIconCounts.kept}`)
}

generateRuntimeVisualAssets()
  .then(() => {
    process.exitCode = PROCESS_SUCCESS_EXIT_CODE
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = PROCESS_FAILURE_EXIT_CODE
  })
