import { readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import sharp from 'sharp'
import {
  ACTOR_SPRITE_PACK_CATEGORIES,
  ALPHA_CHANNEL_OFFSET,
  EDGE_BLEED_MAX_PRIMARY_AREA_RATIO,
  EDGE_BLEED_ZONE_RATIO,
  EDGE_LINE_MAX_THICKNESS_RATIO,
  FRAME_BACKGROUND_MAX_PRIMARY_AREA_RATIO,
  RGB_BACKGROUND_MAX_CHANNEL_DELTA,
  RGB_BACKGROUND_MIN_CHANNEL_VALUE,
  RGBA_CHANNEL_COUNT,
  SOURCE_SPRITE_PACK_DIR,
  SPRITE_PACK_MANIFEST_FILE,
  TOP_BLEED_MAX_PRIMARY_AREA_RATIO,
  TOP_BLEED_ZONE_RATIO,
  UTF8_FILE_ENCODING,
} from './constants'

interface SpritePackManifest {
  files: SpritePackFile[]
}

interface SpritePackFile {
  image: string
  json: string
  category: string
  sprite_count?: number
}

interface SpriteAtlasMetadata {
  frames: Record<string, SpriteFrameMetadata>
}

interface SpriteFrameMetadata {
  frame: SpriteFrame
  rotated?: boolean
  trimmed?: boolean
  spriteSourceSize?: SpriteFrame
  sourceSize?: { w: number; h: number }
  pivot?: { x: number; y: number }
}

interface SpriteFrame {
  x: number
  y: number
  w: number
  h: number
}

interface FrameComponent {
  pixels: number[]
  area: number
  minX: number
  minY: number
  maxX: number
  maxY: number
}

const sourceSpritePackDir = resolve(SOURCE_SPRITE_PACK_DIR)
const manifestPath = join(sourceSpritePackDir, SPRITE_PACK_MANIFEST_FILE)
const actorSpritePackCategories = new Set<string>(ACTOR_SPRITE_PACK_CATEGORIES)

const FRAME_ALIASES: Record<string, Record<string, string>> = {
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, UTF8_FILE_ENCODING)) as T
}

function cloneFrameMetadata(metadata: SpriteFrameMetadata): SpriteFrameMetadata {
  return JSON.parse(JSON.stringify(metadata)) as SpriteFrameMetadata
}

function isBackgroundPixel(data: Buffer, offset: number): boolean {
  const alpha = data[offset + ALPHA_CHANNEL_OFFSET]!
  if (alpha === 0) return true
  const r = data[offset]!
  const g = data[offset + 1]!
  const b = data[offset + 2]!
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  return min >= RGB_BACKGROUND_MIN_CHANNEL_VALUE && max - min <= RGB_BACKGROUND_MAX_CHANNEL_DELTA
}

function getFramePixelOffset(imageWidth: number, frame: SpriteFrame, localX: number, localY: number): number {
  return ((frame.y + localY) * imageWidth + frame.x + localX) * RGBA_CHANNEL_COUNT
}

function clearConnectedBackground(data: Buffer, imageWidth: number, imageHeight: number, frame: SpriteFrame): void {
  const frameSize = frame.w * frame.h
  const visited = new Uint8Array(frameSize)
  const queue: number[] = []

  const push = (x: number, y: number): void => {
    if (x < 0 || x >= frame.w || y < 0 || y >= frame.h) return
    const localIndex = y * frame.w + x
    if (visited[localIndex]) return
    const globalX = frame.x + x
    const globalY = frame.y + y
    if (globalX < 0 || globalX >= imageWidth || globalY < 0 || globalY >= imageHeight) return
    const offset = (globalY * imageWidth + globalX) * RGBA_CHANNEL_COUNT
    if (!isBackgroundPixel(data, offset)) return
    visited[localIndex] = 1
    queue.push(localIndex)
  }

  for (let x = 0; x < frame.w; x++) {
    push(x, 0)
    push(x, frame.h - 1)
  }
  for (let y = 0; y < frame.h; y++) {
    push(0, y)
    push(frame.w - 1, y)
  }

  while (queue.length > 0) {
    const localIndex = queue.pop()!
    const x = localIndex % frame.w
    const y = Math.floor(localIndex / frame.w)
    const globalX = frame.x + x
    const globalY = frame.y + y
    data[(globalY * imageWidth + globalX) * RGBA_CHANNEL_COUNT + ALPHA_CHANNEL_OFFSET] = 0
    push(x + 1, y)
    push(x - 1, y)
    push(x, y + 1)
    push(x, y - 1)
  }
}

function findFrameComponents(data: Buffer, imageWidth: number, frame: SpriteFrame): FrameComponent[] {
  const frameSize = frame.w * frame.h
  const visited = new Uint8Array(frameSize)
  const components: FrameComponent[] = []

  const pushNeighbor = (queue: number[], localIndex: number): void => {
    if (visited[localIndex]) return
    const localX = localIndex % frame.w
    const localY = Math.floor(localIndex / frame.w)
    const offset = getFramePixelOffset(imageWidth, frame, localX, localY)
    if (data[offset + ALPHA_CHANNEL_OFFSET]! === 0) return
    visited[localIndex] = 1
    queue.push(localIndex)
  }

  for (let y = 0; y < frame.h; y++) {
    for (let x = 0; x < frame.w; x++) {
      const startIndex = y * frame.w + x
      if (visited[startIndex]) continue
      const startOffset = getFramePixelOffset(imageWidth, frame, x, y)
      if (data[startOffset + ALPHA_CHANNEL_OFFSET]! === 0) continue

      const queue = [startIndex]
      const pixels: number[] = []
      let minX = x
      let minY = y
      let maxX = x
      let maxY = y
      visited[startIndex] = 1

      while (queue.length > 0) {
        const localIndex = queue.pop()!
        const localX = localIndex % frame.w
        const localY = Math.floor(localIndex / frame.w)
        pixels.push(localIndex)
        if (localX < minX) minX = localX
        if (localX > maxX) maxX = localX
        if (localY < minY) minY = localY
        if (localY > maxY) maxY = localY

        if (localX > 0) pushNeighbor(queue, localIndex - 1)
        if (localX + 1 < frame.w) pushNeighbor(queue, localIndex + 1)
        if (localY > 0) pushNeighbor(queue, localIndex - frame.w)
        if (localY + 1 < frame.h) pushNeighbor(queue, localIndex + frame.w)
      }

      components.push({
        pixels,
        area: pixels.length,
        minX,
        minY,
        maxX,
        maxY,
      })
    }
  }

  return components.sort((a, b) => b.area - a.area)
}

function isThinEdgeComponent(component: FrameComponent, frame: SpriteFrame): boolean {
  const touchesEdge = component.minX === 0 || component.minY === 0 || component.maxX === frame.w - 1 || component.maxY === frame.h - 1
  if (!touchesEdge) return false
  const maxHorizontalThickness = Math.ceil(frame.w * EDGE_LINE_MAX_THICKNESS_RATIO)
  const maxVerticalThickness = Math.ceil(frame.h * EDGE_LINE_MAX_THICKNESS_RATIO)
  return component.maxX - component.minX + 1 <= maxHorizontalThickness || component.maxY - component.minY + 1 <= maxVerticalThickness
}

function isBleedComponent(component: FrameComponent, primary: FrameComponent, frame: SpriteFrame, isActorPack: boolean): boolean {
  const bottomBleedStart = Math.floor(frame.h * (1 - EDGE_BLEED_ZONE_RATIO))
  const topBleedEnd = Math.ceil(frame.h * TOP_BLEED_ZONE_RATIO)
  const maxBottomBleedArea = primary.area * EDGE_BLEED_MAX_PRIMARY_AREA_RATIO
  const maxTopBleedArea = primary.area * TOP_BLEED_MAX_PRIMARY_AREA_RATIO

  if (component.minY >= bottomBleedStart && component.area <= maxBottomBleedArea) return true
  if (!isActorPack && component.minY <= topBleedEnd && component.maxY <= topBleedEnd && component.area <= maxTopBleedArea) return true
  if (isActorPack && (component.minX === 0 || component.maxX === frame.w - 1) && component.area <= maxTopBleedArea) return true
  return false
}

function isFrameBackgroundComponent(component: FrameComponent, primary: FrameComponent, frame: SpriteFrame): boolean {
  const touchedEdges = Number(component.minX === 0) +
    Number(component.minY === 0) +
    Number(component.maxX === frame.w - 1) +
    Number(component.maxY === frame.h - 1)
  return touchedEdges >= 3 && component.area <= primary.area * FRAME_BACKGROUND_MAX_PRIMARY_AREA_RATIO
}

function clearFrameComponent(data: Buffer, imageWidth: number, frame: SpriteFrame, component: FrameComponent): void {
  for (const localIndex of component.pixels) {
    const localX = localIndex % frame.w
    const localY = Math.floor(localIndex / frame.w)
    const offset = getFramePixelOffset(imageWidth, frame, localX, localY)
    data[offset + ALPHA_CHANNEL_OFFSET] = 0
  }
}

function clearEdgeContamination(data: Buffer, imageWidth: number, frame: SpriteFrame, isActorPack: boolean): void {
  const components = findFrameComponents(data, imageWidth, frame)
  const primary = components[0]
  if (!primary) return

  for (const component of components.slice(1)) {
    if (
      isThinEdgeComponent(component, frame) ||
      isBleedComponent(component, primary, frame, isActorPack) ||
      isFrameBackgroundComponent(component, primary, frame)
    ) {
      clearFrameComponent(data, imageWidth, frame, component)
    }
  }
}

function addFrameAliases(packFile: SpritePackFile, atlas: SpriteAtlasMetadata): void {
  const aliases = FRAME_ALIASES[packFile.category]
  if (!aliases) return
  for (const [alias, source] of Object.entries(aliases)) {
    if (atlas.frames[alias]) continue
    const sourceFrame = atlas.frames[source]
    if (!sourceFrame) {
      throw new Error(`Alias source frame not found: ${packFile.category}/${source}`)
    }
    atlas.frames[alias] = cloneFrameMetadata(sourceFrame)
  }
}

async function repairAtlas(packFile: SpritePackFile): Promise<void> {
  const imagePath = join(sourceSpritePackDir, packFile.image)
  const jsonPath = join(sourceSpritePackDir, packFile.json)
  const atlas = await readJsonFile<SpriteAtlasMetadata>(jsonPath)
  addFrameAliases(packFile, atlas)

  const image = sharp(imagePath).ensureAlpha()
  const metadata = await image.metadata()
  if (!metadata.width || !metadata.height) {
    throw new Error(`Invalid atlas image metadata: ${packFile.image}`)
  }

  const data = await image.raw().toBuffer()
  const isActorPack = actorSpritePackCategories.has(packFile.category)
  for (const frameMetadata of Object.values(atlas.frames)) {
    if (frameMetadata.rotated) {
      throw new Error(`Rotated frames are not supported: ${packFile.image}`)
    }
    clearConnectedBackground(data, metadata.width, metadata.height, frameMetadata.frame)
    clearEdgeContamination(data, metadata.width, frameMetadata.frame, isActorPack)
  }

  await sharp(data, {
    raw: {
      width: metadata.width,
      height: metadata.height,
      channels: 4,
    },
  }).png().toFile(imagePath)
  await writeFile(jsonPath, `${JSON.stringify(atlas, null, 2)}\n`, UTF8_FILE_ENCODING)
  packFile.sprite_count = Object.keys(atlas.frames).length
}

async function repairSpriteAtlases(): Promise<void> {
  const manifest = await readJsonFile<SpritePackManifest>(manifestPath)
  for (const packFile of manifest.files) {
    await repairAtlas(packFile)
  }
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, UTF8_FILE_ENCODING)
}

repairSpriteAtlases().catch((error: unknown) => {
  console.error('Sprite atlas repair failed:', error)
  process.exitCode = 1
})
