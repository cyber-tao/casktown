import { mkdir, readFile, rm } from 'node:fs/promises'
import { dirname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import {
  INITIAL_GENERATED_FILE_COUNT,
  OUTPUT_MISC_DIRECTORY,
  PNG_FILE_EXTENSION,
  POSIX_PATH_SEPARATOR,
  PROCESS_FAILURE_EXIT_CODE,
  PROCESS_SUCCESS_EXIT_CODE,
  PROJECT_ROOT_PARENT_SEGMENT,
  ALPHA_CHANNEL_OFFSET,
  FRAME_SEQUENCE_SUFFIX_PATTERN,
  RGBA_CHANNEL_COUNT,
  ROOT_FRAME_SEGMENT_COUNT,
  SOURCE_SPRITE_PACK_DIR,
  SPRITE_PACK_MANIFEST_FILE,
  TARGET_SPRITE_DIR,
  TRANSPARENT_PIXEL,
  TRIM_PADDING_PX,
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

interface VisibleBounds {
  left: number
  top: number
  width: number
  height: number
}

interface SpriteRenderPlan {
  frame: SpriteFrame
  outputPath: string
  visibleBounds: VisibleBounds
  groupKey: string
}

const scriptDir = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(scriptDir, PROJECT_ROOT_PARENT_SEGMENT)
const sourceSpritePackDir = resolve(projectRoot, SOURCE_SPRITE_PACK_DIR)
const targetSpriteDir = resolve(projectRoot, TARGET_SPRITE_DIR)
const manifestPath = resolveInside(sourceSpritePackDir, SPRITE_PACK_MANIFEST_FILE)

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

function getOutputSegments(category: string, frameName: string): string[] {
  const frameSegments = frameName.split(POSIX_PATH_SEPARATOR).filter(Boolean)
  if (!frameSegments.length) {
    throw new Error('Frame name cannot be empty')
  }

  const outputSegments = [category]
  if (frameSegments.length === ROOT_FRAME_SEGMENT_COUNT) {
    outputSegments.push(OUTPUT_MISC_DIRECTORY)
  }
  outputSegments.push(...frameSegments)

  const fileName = outputSegments.pop()
  if (!fileName) {
    throw new Error(`Invalid output path for frame: ${frameName}`)
  }
  outputSegments.push(getPngFileName(fileName))
  return outputSegments
}

function getPngFileName(fileName: string): string {
  return fileName.endsWith(PNG_FILE_EXTENSION) ? fileName : `${fileName}${PNG_FILE_EXTENSION}`
}

function getFrameGroupKey(category: string, frameName: string): string {
  const frameSegments = frameName.split(POSIX_PATH_SEPARATOR).filter(Boolean)
  if (frameSegments.length > ROOT_FRAME_SEGMENT_COUNT) {
    return `${category}${POSIX_PATH_SEPARATOR}${frameSegments[0]}`
  }
  return `${category}${POSIX_PATH_SEPARATOR}${frameName.replace(FRAME_SEQUENCE_SUFFIX_PATTERN, '')}`
}

function findVisibleBounds(data: Buffer, width: number, height: number): VisibleBounds | null {
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * RGBA_CHANNEL_COUNT
      if (data[offset + ALPHA_CHANNEL_OFFSET]! === 0) continue
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

async function readVisibleBounds(sourceImagePath: string, frameName: string, frame: SpriteFrame): Promise<VisibleBounds> {
  const extracted = await sharp(sourceImagePath)
    .extract({
      left: frame.x,
      top: frame.y,
      width: frame.w,
      height: frame.h,
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const visibleBounds = findVisibleBounds(extracted.data, extracted.info.width, extracted.info.height)
  if (!visibleBounds) {
    throw new Error(`Frame has no visible pixels: ${frameName}`)
  }
  return visibleBounds
}

async function writeCenteredSprite(sourceImagePath: string, plan: SpriteRenderPlan, side: number): Promise<void> {
  const { frame, outputPath, visibleBounds } = plan
  const leftPadding = Math.floor((side - visibleBounds.width) / 2)
  const topPadding = Math.floor((side - visibleBounds.height) / 2)

  await sharp(sourceImagePath)
    .extract({
      left: frame.x + visibleBounds.left,
      top: frame.y + visibleBounds.top,
      width: visibleBounds.width,
      height: visibleBounds.height,
    })
    .extend({
      left: leftPadding,
      right: side - visibleBounds.width - leftPadding,
      top: topPadding,
      bottom: side - visibleBounds.height - topPadding,
      background: TRANSPARENT_PIXEL,
    })
    .png()
    .toFile(outputPath)
}

async function refreshSpritePackFile(packFile: SpritePackFile): Promise<number> {
  const sourceImagePath = resolveInside(sourceSpritePackDir, packFile.image)
  const sourceJsonPath = resolveInside(sourceSpritePackDir, packFile.json)
  const targetCategoryDir = resolveInside(targetSpriteDir, packFile.category)
  const atlas = await readJsonFile<SpriteAtlasMetadata>(sourceJsonPath)
  const sourceMetadata = await sharp(sourceImagePath).metadata()
  if (!sourceMetadata.width || !sourceMetadata.height || !sourceMetadata.hasAlpha) {
    throw new Error(`Source atlas must be a transparent PNG: ${packFile.image}`)
  }

  await rm(targetCategoryDir, { recursive: true, force: true })

  const renderPlans: SpriteRenderPlan[] = []
  const groupSides = new Map<string, number>()
  for (const [frameName, metadata] of Object.entries(atlas.frames)) {
    if (metadata.rotated) {
      throw new Error(`Rotated frames are not supported: ${frameName}`)
    }
    if (
      metadata.frame.w <= 0 ||
      metadata.frame.h <= 0 ||
      metadata.frame.x < 0 ||
      metadata.frame.y < 0 ||
      metadata.frame.x + metadata.frame.w > sourceMetadata.width ||
      metadata.frame.y + metadata.frame.h > sourceMetadata.height
    ) {
      throw new Error(`Frame is outside atlas bounds: ${frameName}`)
    }

    const outputPath = resolveInside(targetSpriteDir, ...getOutputSegments(packFile.category, frameName))
    const visibleBounds = await readVisibleBounds(sourceImagePath, frameName, metadata.frame)
    const groupKey = getFrameGroupKey(packFile.category, frameName)
    const side = Math.max(visibleBounds.width, visibleBounds.height) + TRIM_PADDING_PX * 2
    groupSides.set(groupKey, Math.max(groupSides.get(groupKey) ?? INITIAL_GENERATED_FILE_COUNT, side))
    renderPlans.push({
      frame: metadata.frame,
      outputPath,
      visibleBounds,
      groupKey,
    })
  }

  let generatedFileCount = INITIAL_GENERATED_FILE_COUNT
  for (const renderPlan of renderPlans) {
    await mkdir(dirname(renderPlan.outputPath), { recursive: true })
    await writeCenteredSprite(sourceImagePath, renderPlan, groupSides.get(renderPlan.groupKey)!)
    generatedFileCount += ROOT_FRAME_SEGMENT_COUNT
  }

  console.info(`Refreshed ${packFile.category}: ${generatedFileCount} sprites`)
  return generatedFileCount
}

async function refreshSprites(): Promise<void> {
  const manifest = await readJsonFile<SpritePackManifest>(manifestPath)
  let generatedFileCount = INITIAL_GENERATED_FILE_COUNT

  for (const packFile of manifest.files) {
    generatedFileCount += await refreshSpritePackFile(packFile)
  }

  console.info(`Sprite refresh complete: ${generatedFileCount} sprites`)
}

refreshSprites()
  .then(() => {
    process.exitCode = PROCESS_SUCCESS_EXIT_CODE
  })
  .catch((error: unknown) => {
    console.error('Sprite refresh failed:', error)
    process.exitCode = PROCESS_FAILURE_EXIT_CODE
  })
