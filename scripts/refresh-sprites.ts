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
  ROOT_FRAME_SEGMENT_COUNT,
  SOURCE_SPRITE_PACK_DIR,
  SPRITE_PACK_MANIFEST_FILE,
  TARGET_SPRITE_DIR,
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

  let generatedFileCount = INITIAL_GENERATED_FILE_COUNT
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
    await mkdir(dirname(outputPath), { recursive: true })
    await sharp(sourceImagePath)
      .extract({
        left: metadata.frame.x,
        top: metadata.frame.y,
        width: metadata.frame.w,
        height: metadata.frame.h,
      })
      .png()
      .toFile(outputPath)
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
