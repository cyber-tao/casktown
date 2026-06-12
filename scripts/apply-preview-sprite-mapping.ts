import { readFile } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import sharp from 'sharp'
import {
  ALPHA_CHANNEL_OFFSET,
  JSON_FORMAT_SPACE_COUNT,
  PROCESS_FAILURE_EXIT_CODE,
  PROCESS_SUCCESS_EXIT_CODE,
  RGBA_CHANNEL_COUNT,
  SOURCE_SPRITE_PACK_DIR,
  SPRITE_MAPPING_BACKGROUND_DISTANCE_THRESHOLD,
  SPRITE_MAPPING_FRAME_INSET_PX,
  SPRITE_MAPPING_LIGHT_BACKGROUND_MAX_CHANNEL_DELTA,
  SPRITE_MAPPING_LIGHT_BACKGROUND_MIN_CHANNEL,
  SPRITE_MAPPING_OPAQUE_ALPHA,
  SPRITE_PACK_MANIFEST_FILE,
  SPRITE_PREVIEW_APPLY_CATEGORIES,
  SPRITE_PREVIEW_MAPPING_FILE,
  TRANSPARENT_PIXEL,
  UTF8_FILE_ENCODING,
} from './constants'

interface SpritePackManifest {
  files: SpritePackFile[]
}

interface SpritePackFile {
  image: string
  json: string
  category: string
}

interface SpriteAtlasMetadata {
  frames: Record<string, SpriteFrameMetadata>
}

interface SpriteFrameMetadata {
  frame: SpriteFrame
  rotated?: boolean
}

interface SpriteFrame {
  x: number
  y: number
  w: number
  h: number
}

interface PreviewMappingFile {
  sources: Record<string, PreviewSource>
  atlases: Record<string, PreviewAtlas>
}

interface PreviewSource {
  file: string
}

interface PreviewAtlas {
  frames: Record<string, PreviewFrameMapping>
}

interface PreviewFrameMapping {
  sourceId: string | null
  crop: PreviewCrop | null
  useTargetAtlas: boolean
}

interface PreviewCrop {
  x: number
  y: number
  width?: number
  height?: number
  w?: number
  h?: number
}

interface VisibleBounds {
  left: number
  top: number
  width: number
  height: number
}

type RgbColor = [number, number, number]

const sourceSpritePackDir = resolve(SOURCE_SPRITE_PACK_DIR)
const manifestPath = resolveInside(sourceSpritePackDir, SPRITE_PACK_MANIFEST_FILE)
const mappingPath = resolve(SPRITE_PREVIEW_MAPPING_FILE)
const appliedCategories = new Set<string>(SPRITE_PREVIEW_APPLY_CATEGORIES)

async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, UTF8_FILE_ENCODING)) as T
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

function getPixelOffset(width: number, x: number, y: number): number {
  return (y * width + x) * RGBA_CHANNEL_COUNT
}

function getColorDistance(data: Buffer, offset: number, background: RgbColor): number {
  const dr = data[offset]! - background[0]
  const dg = data[offset + 1]! - background[1]
  const db = data[offset + 2]! - background[2]
  return Math.sqrt(dr * dr + dg * dg + db * db)
}

function getEdgeBackgroundColor(data: Buffer, width: number, height: number): RgbColor {
  const total: RgbColor = [0, 0, 0]
  let count = 0
  const addSample = (x: number, y: number): void => {
    const offset = getPixelOffset(width, x, y)
    if (data[offset + ALPHA_CHANNEL_OFFSET]! === TRANSPARENT_PIXEL.alpha) return
    total[0] += data[offset]!
    total[1] += data[offset + 1]!
    total[2] += data[offset + 2]!
    count += 1
  }

  for (let x = 0; x < width; x += 1) {
    addSample(x, 0)
    addSample(x, height - 1)
  }
  for (let y = 1; y + 1 < height; y += 1) {
    addSample(0, y)
    addSample(width - 1, y)
  }

  if (count === 0) return [TRANSPARENT_PIXEL.r, TRANSPARENT_PIXEL.g, TRANSPARENT_PIXEL.b]
  return [
    Math.round(total[0] / count),
    Math.round(total[1] / count),
    Math.round(total[2] / count),
  ]
}

function isLightBackgroundPixel(data: Buffer, offset: number): boolean {
  const r = data[offset]!
  const g = data[offset + 1]!
  const b = data[offset + 2]!
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  return min >= SPRITE_MAPPING_LIGHT_BACKGROUND_MIN_CHANNEL && max - min <= SPRITE_MAPPING_LIGHT_BACKGROUND_MAX_CHANNEL_DELTA
}

function isBackgroundPixel(data: Buffer, offset: number, background: RgbColor): boolean {
  if (data[offset + ALPHA_CHANNEL_OFFSET]! === TRANSPARENT_PIXEL.alpha) return true
  return getColorDistance(data, offset, background) <= SPRITE_MAPPING_BACKGROUND_DISTANCE_THRESHOLD ||
    isLightBackgroundPixel(data, offset)
}

function clearConnectedBackground(data: Buffer, width: number, height: number): void {
  const background = getEdgeBackgroundColor(data, width, height)
  const visited = new Uint8Array(width * height)
  const queue: number[] = []

  const push = (x: number, y: number): void => {
    if (x < 0 || x >= width || y < 0 || y >= height) return
    const index = y * width + x
    if (visited[index]) return
    const offset = getPixelOffset(width, x, y)
    if (!isBackgroundPixel(data, offset, background)) return
    visited[index] = 1
    queue.push(index)
  }

  for (let x = 0; x < width; x += 1) {
    push(x, 0)
    push(x, height - 1)
  }
  for (let y = 1; y + 1 < height; y += 1) {
    push(0, y)
    push(width - 1, y)
  }

  while (queue.length > 0) {
    const index = queue.pop()!
    const x = index % width
    const y = Math.floor(index / width)
    data[getPixelOffset(width, x, y) + ALPHA_CHANNEL_OFFSET] = TRANSPARENT_PIXEL.alpha
    push(x + 1, y)
    push(x - 1, y)
    push(x, y + 1)
    push(x, y - 1)
  }
}

function findVisibleBounds(data: Buffer, width: number, height: number): VisibleBounds | null {
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = getPixelOffset(width, x, y)
      if (data[offset + ALPHA_CHANNEL_OFFSET]! === TRANSPARENT_PIXEL.alpha) continue
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }

  if (maxX < minX || maxY < minY) return null
  return {
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  }
}

function toExtractRegion(crop: PreviewCrop): { left: number, top: number, width: number, height: number } {
  const width = crop.width ?? crop.w
  const height = crop.height ?? crop.h
  if (!width || !height) {
    throw new Error(`Invalid preview crop: ${JSON.stringify(crop, null, JSON_FORMAT_SPACE_COUNT)}`)
  }
  return {
    left: crop.x,
    top: crop.y,
    width,
    height,
  }
}

async function extractMappedSprite(mapping: PreviewFrameMapping, sources: Record<string, PreviewSource>, frameName: string): Promise<Buffer> {
  if (!mapping.sourceId || !mapping.crop) {
    throw new Error(`Missing source mapping for frame: ${frameName}`)
  }
  const source = sources[mapping.sourceId]
  if (!source) {
    throw new Error(`Preview source not found: ${mapping.sourceId}`)
  }
  const extracted = await sharp(source.file)
    .extract(toExtractRegion(mapping.crop))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  if (extracted.info.channels !== RGBA_CHANNEL_COUNT) {
    throw new Error(`Unexpected channel count for frame: ${frameName}`)
  }

  clearConnectedBackground(extracted.data, extracted.info.width, extracted.info.height)
  for (let offset = ALPHA_CHANNEL_OFFSET; offset < extracted.data.length; offset += RGBA_CHANNEL_COUNT) {
    if (extracted.data[offset]! !== TRANSPARENT_PIXEL.alpha) {
      extracted.data[offset] = SPRITE_MAPPING_OPAQUE_ALPHA
    }
  }
  const visibleBounds = findVisibleBounds(extracted.data, extracted.info.width, extracted.info.height)
  if (!visibleBounds) {
    throw new Error(`Mapped frame has no visible pixels: ${frameName}`)
  }

  return sharp(extracted.data, {
    raw: {
      width: extracted.info.width,
      height: extracted.info.height,
      channels: RGBA_CHANNEL_COUNT,
    },
  })
    .extract({
      left: visibleBounds.left,
      top: visibleBounds.top,
      width: visibleBounds.width,
      height: visibleBounds.height,
    })
    .png()
    .toBuffer()
}

async function applyCategory(packFile: SpritePackFile, mappingFile: PreviewMappingFile): Promise<void> {
  const atlasMapping = mappingFile.atlases[packFile.category]
  if (!atlasMapping) {
    throw new Error(`Preview atlas mapping not found: ${packFile.category}`)
  }

  const imagePath = resolveInside(sourceSpritePackDir, packFile.image)
  const jsonPath = resolveInside(sourceSpritePackDir, packFile.json)
  const atlas = await readJsonFile<SpriteAtlasMetadata>(jsonPath)
  const metadata = await sharp(imagePath).metadata()
  if (!metadata.width || !metadata.height) {
    throw new Error(`Invalid atlas image metadata: ${packFile.image}`)
  }

  const composites: sharp.OverlayOptions[] = []
  for (const [frameName, frameMetadata] of Object.entries(atlas.frames)) {
    if (frameMetadata.rotated) {
      throw new Error(`Rotated frames are not supported: ${frameName}`)
    }
    const mapping = atlasMapping.frames[frameName]
    if (!mapping || mapping.useTargetAtlas) continue

    const frame = frameMetadata.frame
    const maxWidth = Math.max(1, frame.w - SPRITE_MAPPING_FRAME_INSET_PX * 2)
    const maxHeight = Math.max(1, frame.h - SPRITE_MAPPING_FRAME_INSET_PX * 2)
    const resized = await sharp(await extractMappedSprite(mapping, mappingFile.sources, frameName))
      .resize(maxWidth, maxHeight, { fit: 'inside', kernel: sharp.kernel.nearest })
      .png()
      .toBuffer({ resolveWithObject: true })
    composites.push({
      input: resized.data,
      left: frame.x + Math.round((frame.w - resized.info.width) / 2),
      top: frame.y + Math.round((frame.h - resized.info.height) / 2),
    })
  }

  await sharp({
    create: {
      width: metadata.width,
      height: metadata.height,
      channels: RGBA_CHANNEL_COUNT,
      background: TRANSPARENT_PIXEL,
    },
  })
    .composite(composites)
    .png()
    .toFile(imagePath)
  console.info(`Applied preview sprite mapping: ${packFile.category} (${composites.length} frames)`)
}

async function applyPreviewSpriteMapping(): Promise<void> {
  const manifest = await readJsonFile<SpritePackManifest>(manifestPath)
  const mappingFile = await readJsonFile<PreviewMappingFile>(mappingPath)
  for (const packFile of manifest.files) {
    if (!appliedCategories.has(packFile.category)) continue
    await applyCategory(packFile, mappingFile)
  }
}

applyPreviewSpriteMapping()
  .then(() => {
    process.exitCode = PROCESS_SUCCESS_EXIT_CODE
  })
  .catch((error: unknown) => {
    console.error('Preview sprite mapping failed:', error)
    process.exitCode = PROCESS_FAILURE_EXIT_CODE
  })
