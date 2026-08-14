import { access, copyFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { ITEMS } from '../src/data/items'
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
type CropRect = { left: number; top: number; width: number; height: number }

const scriptDir = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(scriptDir, PROJECT_ROOT_PARENT_SEGMENT)
const runtimeUiOutputDir = resolveInside(projectRoot, RUNTIME_UI_OUTPUT_DIR)
const designRuntimeAssetDir = resolveInside(projectRoot, DESIGN_RUNTIME_ASSET_DIR)
const runtimeItemIconOutputDir = resolveInside(projectRoot, RUNTIME_ITEM_ICON_OUTPUT_DIR)
const designItemIconSourceDir = resolveInside(projectRoot, DESIGN_ITEM_ICON_SOURCE_DIR)

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

async function writeItemIconAsset(itemId: string): Promise<'copied' | 'kept'> {
  const fileName = getPngFileName(itemId)
  const runtimePath = resolveInside(runtimeItemIconOutputDir, fileName)
  const sourcePath = resolveInside(designItemIconSourceDir, fileName)

  if (await pathExists(sourcePath)) {
    await copyFile(sourcePath, runtimePath)
    return 'copied'
  }

  if (await pathExists(runtimePath)) return 'kept'

  throw new Error(`Missing item icon source asset: ${sourcePath}`)
}

async function generateRuntimeItemIcons(): Promise<{ copied: number; kept: number }> {
  await Promise.all([
    mkdir(runtimeItemIconOutputDir, { recursive: true }),
    mkdir(designItemIconSourceDir, { recursive: true }),
  ])

  const counts = { copied: 0, kept: 0 }
  for (const itemId of Object.keys(ITEMS)) {
    const result = await writeItemIconAsset(itemId)
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

async function resizePart(source: Buffer, crop: CropRect, width: number, height: number): Promise<Buffer> {
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
  console.info(`Copied ${itemIconCounts.copied} item icons, kept ${itemIconCounts.kept}`)
}

generateRuntimeVisualAssets()
  .then(() => {
    process.exitCode = PROCESS_SUCCESS_EXIT_CODE
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = PROCESS_FAILURE_EXIT_CODE
  })
