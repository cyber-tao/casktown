import { readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import sharp from 'sharp'
import {
  SOURCE_SPRITE_PACK_DIR,
  SPRITE_PACK_MANIFEST_FILE,
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

const sourceSpritePackDir = resolve(SOURCE_SPRITE_PACK_DIR)
const manifestPath = join(sourceSpritePackDir, SPRITE_PACK_MANIFEST_FILE)

const FRAME_ALIASES: Record<string, Record<string, string>> = {
  monsters: {
    chi_01: 'horned_wraith_01',
    chi_02: 'horned_wraith_02',
    mei_01: 'charm_spirit_01',
    mei_02: 'charm_spirit_02',
    wang_01: 'feather_spirit_01',
    wang_02: 'feather_spirit_02',
    liang_01: 'fire_qilin_cub_01',
    liang_02: 'fire_qilin_cub_02',
    fake_xiaoai_01: 'mask_minion_01',
    fake_xiaoai_02: 'mask_minion_02',
    xiaoai_true_01: 'mask_minion_03',
    xiaoai_true_02: 'mask_minion_04',
    wuxiang_01: 'dark_swamp_01',
    wuxiang_02: 'dark_swamp_02',
  },
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, UTF8_FILE_ENCODING)) as T
}

function cloneFrameMetadata(metadata: SpriteFrameMetadata): SpriteFrameMetadata {
  return JSON.parse(JSON.stringify(metadata)) as SpriteFrameMetadata
}

function isBackgroundPixel(data: Buffer, offset: number): boolean {
  const alpha = data[offset + 3]!
  if (alpha === 0) return true
  const r = data[offset]!
  const g = data[offset + 1]!
  const b = data[offset + 2]!
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  return min >= 218 && max - min <= 24
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
    const offset = (globalY * imageWidth + globalX) * 4
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
    data[(globalY * imageWidth + globalX) * 4 + 3] = 0
    push(x + 1, y)
    push(x - 1, y)
    push(x, y + 1)
    push(x, y - 1)
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
  for (const frameMetadata of Object.values(atlas.frames)) {
    if (frameMetadata.rotated) {
      throw new Error(`Rotated frames are not supported: ${packFile.image}`)
    }
    clearConnectedBackground(data, metadata.width, metadata.height, frameMetadata.frame)
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
