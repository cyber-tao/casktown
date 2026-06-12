import Phaser from 'phaser'
import { GAME_CONFIG_DATABASE } from '../data/configDatabase'
import {
  CHARACTER_SPRITE_BASE_KEYS,
  CONTINUOUS_TERRAIN_TEXTURE_KEYS,
  DEFAULT_BATTLE_BACKGROUND_KEY,
  DEFAULT_CHARACTER_SPRITE_KEY,
  DEFAULT_ENEMY_SPRITE_KEY,
  MAP_BATTLE_BACKGROUND_KEYS,
  PUBLIC_ASSET_CACHE_VERSION,
  REBUILD_TILE_REPLACEMENTS,
  RUNTIME_UI_ASSET_KEYS,
  SPRITE_CROP_DEFAULTS,
  STRETCHED_TILE_TEXTURE_KEYS,
  TILE_SIZE,
  TILE_SPRITE_FOOTPRINTS,
  TILE_TEXTURE_DETAIL_ALPHA_OVERRIDES,
  TILE_TEXTURE_INSET_OVERRIDES,
  TILE_TEXTURE_PROCESSING,
  TOWN_MAP_IDS,
} from '../utils/constants'
import type { SpriteCropConfig } from '../data/spriteCrops'
import type { EncounterData, MapData, MapEvent } from '../data/types'

const processedTileTextures = new WeakMap<Phaser.Textures.TextureManager, Set<string>>()
const processedSpriteCrops = new WeakMap<Phaser.Textures.TextureManager, Map<string, string>>()
const pendingImageLoads = new WeakMap<Phaser.Textures.TextureManager, Set<string>>()

function getProcessedTileSet(scene: Phaser.Scene): Set<string> {
  let set = processedTileTextures.get(scene.textures)
  if (!set) {
    set = new Set()
    processedTileTextures.set(scene.textures, set)
  }
  return set
}

function getProcessedSpriteCropMap(scene: Phaser.Scene): Map<string, string> {
  let map = processedSpriteCrops.get(scene.textures)
  if (!map) {
    map = new Map()
    processedSpriteCrops.set(scene.textures, map)
  }
  return map
}

function getPendingImageLoadSet(scene: Phaser.Scene): Set<string> {
  let set = pendingImageLoads.get(scene.textures)
  if (!set) {
    set = new Set()
    pendingImageLoads.set(scene.textures, set)
  }
  return set
}

function getConfiguredImageAssets(): Record<string, string> {
  return GAME_CONFIG_DATABASE.getTable('imageAssets')
}

function getConfiguredTileSprites(): Record<number, string> {
  return GAME_CONFIG_DATABASE.getTable('tileSprites')
}

function getConfiguredEncounters(): Record<string, EncounterData> {
  return GAME_CONFIG_DATABASE.getTable('encounters')
}

function getConfiguredMaps(): Record<string, MapData> {
  return GAME_CONFIG_DATABASE.getTable('maps')
}

function normalizeBattleBackgroundKey(background: string | undefined, useLegacyDefault: boolean): string | null {
  if (!background) return null
  if (getConfiguredImageAssets()[background]) return background
  if (background === 'field') return useLegacyDefault ? DEFAULT_BATTLE_BACKGROUND_KEY : null
  return null
}

export function resolveBattleBackgroundKey(encounterId: string, mapId?: string): string {
  const encounter = getConfiguredEncounters()[encounterId]
  const encounterBackgroundKey = normalizeBattleBackgroundKey(encounter?.background, false)
  if (encounterBackgroundKey) return encounterBackgroundKey

  const mapBackgroundKey = normalizeBattleBackgroundKey(mapId ? getConfiguredMaps()[mapId]?.battleBackground ?? MAP_BATTLE_BACKGROUND_KEYS[mapId] : undefined, true)
  return mapBackgroundKey ?? DEFAULT_BATTLE_BACKGROUND_KEY
}

function getConfiguredSpriteCrop(key: string, sourceWidth: number, sourceHeight: number): SpriteCropConfig | null {
  const crop = GAME_CONFIG_DATABASE.getTable('spriteCrops')[key] as Partial<SpriteCropConfig> | undefined
  if (!crop || typeof crop !== 'object') return null
  const minSize = SPRITE_CROP_DEFAULTS.MIN_SIZE
  const sourceX = clampInteger(crop.sourceX, SPRITE_CROP_DEFAULTS.SOURCE_X, 0, Math.max(0, sourceWidth - minSize))
  const sourceY = clampInteger(crop.sourceY, SPRITE_CROP_DEFAULTS.SOURCE_Y, 0, Math.max(0, sourceHeight - minSize))
  const sourceCropWidth = clampInteger(crop.sourceWidth, SPRITE_CROP_DEFAULTS.SOURCE_WIDTH, minSize, Math.max(minSize, sourceWidth - sourceX))
  const sourceCropHeight = clampInteger(crop.sourceHeight, SPRITE_CROP_DEFAULTS.SOURCE_HEIGHT, minSize, Math.max(minSize, sourceHeight - sourceY))
  const outputWidth = clampInteger(crop.outputWidth, SPRITE_CROP_DEFAULTS.OUTPUT_WIDTH, minSize, SPRITE_CROP_DEFAULTS.MAX_OUTPUT_SIZE)
  const outputHeight = clampInteger(crop.outputHeight, SPRITE_CROP_DEFAULTS.OUTPUT_HEIGHT, minSize, SPRITE_CROP_DEFAULTS.MAX_OUTPUT_SIZE)
  return {
    key,
    sourceX,
    sourceY,
    sourceWidth: sourceCropWidth,
    sourceHeight: sourceCropHeight,
    outputWidth,
    outputHeight,
    offsetX: clampInteger(crop.offsetX, SPRITE_CROP_DEFAULTS.OFFSET_X, -outputWidth, outputWidth),
    offsetY: clampInteger(crop.offsetY, SPRITE_CROP_DEFAULTS.OFFSET_Y, -outputHeight, outputHeight),
  }
}

function clampInteger(value: unknown, fallback: number, min: number, max: number): number {
  const numberValue = typeof value === 'number' && Number.isFinite(value) ? value : fallback
  return Math.max(min, Math.min(max, Math.round(numberValue)))
}

function getSpriteCropSignature(crop: SpriteCropConfig): string {
  return JSON.stringify(crop)
}

function applySpriteCrop(scene: Phaser.Scene, key: string): void {
  const texture = scene.textures.get(key)
  if (!texture || texture.key === '__MISSING') return

  const source = texture.getSourceImage() as HTMLCanvasElement | HTMLImageElement | undefined
  if (!source || source.width <= 0 || source.height <= 0) return

  const crop = getConfiguredSpriteCrop(key, source.width, source.height)
  if (!crop) return

  const signature = getSpriteCropSignature(crop)
  const processed = getProcessedSpriteCropMap(scene)
  if (processed.get(key) === signature) return

  const canvas = document.createElement('canvas')
  canvas.width = crop.outputWidth
  canvas.height = crop.outputHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    console.warn(`Failed to create sprite crop canvas for ${key}`)
    return
  }

  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, crop.outputWidth, crop.outputHeight)
  ctx.drawImage(source, crop.sourceX, crop.sourceY, crop.sourceWidth, crop.sourceHeight, crop.offsetX, crop.offsetY, crop.sourceWidth, crop.sourceHeight)
  scene.textures.remove(key)
  if (scene.textures.exists(key)) return
  scene.textures.addCanvas(key, canvas)
  processed.set(key, signature)
}

function getCharacterSpriteBase(characterId: string): string {
  return CHARACTER_SPRITE_BASE_KEYS[characterId] ?? characterId.toLowerCase()
}

function addConfiguredKey(keys: Set<string>, key: string): void {
  if (getConfiguredImageAssets()[key]) keys.add(key)
}

function addRuntimeUiImageKeys(keys: Set<string>): void {
  for (const key of Object.values(RUNTIME_UI_ASSET_KEYS)) {
    addConfiguredKey(keys, key)
  }
}

function getVersionedSpritePath(path: string): string {
  return `sprites/${path}?v=${PUBLIC_ASSET_CACHE_VERSION}`
}

function addImageKeysByPrefix(keys: Set<string>, prefix: string): void {
  const imageAssets = getConfiguredImageAssets()
  for (const key of Object.keys(imageAssets)) {
    if (key.startsWith(prefix)) keys.add(key)
  }
}

function addCharacterImageKeys(keys: Set<string>, characterId: string): void {
  addImageKeysByPrefix(keys, `${getCharacterSpriteBase(characterId)}_`)
}

function addPlayableCharacterImageKeys(keys: Set<string>): void {
  for (const characterId of Object.keys(CHARACTER_SPRITE_BASE_KEYS)) {
    addCharacterImageKeys(keys, characterId)
  }
}

function addEnemyImageKeys(keys: Set<string>, enemyId: string): void {
  addImageKeysByPrefix(keys, `mon_${enemyId}_`)
}

function addEncounterImageKeys(keys: Set<string>, encounterId: string | undefined): void {
  if (!encounterId) return
  const encounter = getConfiguredEncounters()[encounterId]
  if (!encounter) return
  for (const enemyId of encounter.enemies) {
    addEnemyImageKeys(keys, enemyId)
  }
}

function getBattleEncounterId(event: MapEvent): string | undefined {
  return event.actions.find(action => action.type === 'battle')?.encounterId
}

export function queueImageAsset(scene: Phaser.Scene, key: string): void {
  if (scene.textures.exists(key)) {
    applySpriteCrop(scene, key)
    return
  }
  const pendingLoads = getPendingImageLoadSet(scene)
  if (pendingLoads.has(key)) return
  const path = getConfiguredImageAssets()[key]
  if (!path) {
    console.warn(`Image asset ${key} is not configured`)
    return
  }
  pendingLoads.add(key)
  const completeEvent = `filecomplete-image-${key}`
  let cleared = false
  const clearPendingLoad = (): void => {
    if (cleared) return
    cleared = true
    pendingLoads.delete(key)
    scene.load.off(completeEvent, handleComplete)
    scene.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, handleLoadError)
    scene.events.off(Phaser.Scenes.Events.SHUTDOWN, clearPendingLoad)
  }
  const handleComplete = (): void => {
    clearPendingLoad()
    applySpriteCrop(scene, key)
  }
  const handleLoadError = (file: { key?: string }): void => {
    if (file.key === key) clearPendingLoad()
  }
  scene.load.once(completeEvent, handleComplete)
  scene.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, handleLoadError)
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, clearPendingLoad)
  scene.load.image(key, getVersionedSpritePath(path))
}

export function queueImageAssets(scene: Phaser.Scene, keys: Iterable<string>): void {
  for (const key of new Set(keys)) {
    queueImageAsset(scene, key)
  }
}

export function collectMapTileTextureKeys(mapData: MapData): Set<string> {
  const keys = new Set<string>()
  const tileSprites = getConfiguredTileSprites()
  const shouldApplyRebuildTiles = (TOWN_MAP_IDS as readonly string[]).includes(mapData.id)
  addConfiguredKey(keys, 'env_dirt_plain')
  addConfiguredKey(keys, 'env_barrel')
  addConfiguredKey(keys, DEFAULT_ENEMY_SPRITE_KEY)
  for (const layer of mapData.layers) {
    for (const tileId of layer.data) {
      const key = tileSprites[tileId]
      if (key) addConfiguredKey(keys, key)
    }
  }
  if (shouldApplyRebuildTiles) {
    for (const replacement of REBUILD_TILE_REPLACEMENTS) {
      addConfiguredKey(keys, tileSprites[replacement.targetTileId] ?? '')
    }
  }
  return keys
}

export function collectMapImageKeys(mapData: MapData, partyIds: readonly string[]): Set<string> {
  const keys = collectMapTileTextureKeys(mapData)
  addRuntimeUiImageKeys(keys)
  addConfiguredKey(keys, DEFAULT_CHARACTER_SPRITE_KEY)
  addConfiguredKey(keys, DEFAULT_ENEMY_SPRITE_KEY)
  addPlayableCharacterImageKeys(keys)
  for (const characterId of partyIds) {
    addCharacterImageKeys(keys, characterId)
  }
  for (const event of mapData.events) {
    if (event.sprite) {
      addConfiguredKey(keys, event.sprite)
      addImageKeysByPrefix(keys, `${event.sprite}_`)
    }
    if (event.type === 'battle') {
      addEncounterImageKeys(keys, getBattleEncounterId(event))
    }
  }
  for (const encounterId of mapData.encounters ?? []) {
    addEncounterImageKeys(keys, encounterId)
  }
  return keys
}

export function collectBattleImageKeys(encounterId: string, partyIds: readonly string[], mapId?: string): Set<string> {
  const keys = new Set<string>()
  addRuntimeUiImageKeys(keys)
  addConfiguredKey(keys, resolveBattleBackgroundKey(encounterId, mapId))
  addConfiguredKey(keys, DEFAULT_CHARACTER_SPRITE_KEY)
  addConfiguredKey(keys, DEFAULT_ENEMY_SPRITE_KEY)
  for (const characterId of partyIds) {
    addCharacterImageKeys(keys, characterId)
  }
  addEncounterImageKeys(keys, encounterId)
  return keys
}

export function processTileTextures(scene: Phaser.Scene, keys: Iterable<string>): void {
  const processed = getProcessedTileSet(scene)
  const groundTiles = new Set<string>(CONTINUOUS_TERRAIN_TEXTURE_KEYS)
  const stretchObjects = new Set<string>(STRETCHED_TILE_TEXTURE_KEYS)

  for (const key of new Set(keys)) {
    if (processed.has(key) || TILE_SPRITE_FOOTPRINTS[key]) continue

    const texture = scene.textures.get(key)
    if (!texture || texture.key === '__MISSING') continue

    const source = texture.getSourceImage() as HTMLImageElement
    if (!source || source.width === 0 || source.height === 0) continue

    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = source.width
    tempCanvas.height = source.height
    const tempCtx = tempCanvas.getContext('2d')
    if (!tempCtx) {
      console.warn(`Failed to process tile texture ${key}`)
      continue
    }
    tempCtx.drawImage(source, 0, 0)

    const imageData = tempCtx.getImageData(0, 0, source.width, source.height)
    const data = imageData.data

    let minX = source.width
    let minY = source.height
    let maxX = 0
    let maxY = 0
    for (let y = 0; y < source.height; y++) {
      for (let x = 0; x < source.width; x++) {
        const alpha = data[(y * source.width + x) * 4 + 3]!
        if (alpha > 0) {
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }

    if (minX > maxX || minY > maxY) continue

    const cropW = maxX - minX + 1
    const cropH = maxY - minY + 1

    const canvas = document.createElement('canvas')
    canvas.width = TILE_SIZE
    canvas.height = TILE_SIZE
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      console.warn(`Failed to create processed texture canvas for ${key}`)
      continue
    }
    ctx.imageSmoothingEnabled = false

    const isGround = groundTiles.has(key)

    if (isGround) {
      let r = 0
      let g = 0
      let b = 0
      let count = 0
      const insetOverride = TILE_TEXTURE_INSET_OVERRIDES[key]
      const terrainInsetX = Math.floor(cropW * (insetOverride?.x ?? TILE_TEXTURE_PROCESSING.TERRAIN_INSET_RATIO))
      const terrainInsetY = Math.floor(cropH * (insetOverride?.y ?? TILE_TEXTURE_PROCESSING.TERRAIN_INSET_RATIO))
      const terrainSourceX = minX + terrainInsetX
      const terrainSourceY = minY + terrainInsetY
      const terrainSourceW = Math.max(1, cropW - terrainInsetX * 2)
      const terrainSourceH = Math.max(1, cropH - terrainInsetY * 2)
      const sampleInsetX = Math.floor(terrainSourceW * TILE_TEXTURE_PROCESSING.TERRAIN_SAMPLE_INSET_RATIO)
      const sampleInsetY = Math.floor(terrainSourceH * TILE_TEXTURE_PROCESSING.TERRAIN_SAMPLE_INSET_RATIO)
      const cx = terrainSourceX + sampleInsetX
      const cy = terrainSourceY + sampleInsetY
      const cw = Math.max(1, terrainSourceW - sampleInsetX * 2)
      const ch = Math.max(1, terrainSourceH - sampleInsetY * 2)
      for (let y = cy; y < cy + ch; y++) {
        for (let x = cx; x < cx + cw; x++) {
          const idx = (y * source.width + x) * 4
          if (data[idx + 3]! > 0) {
            r += data[idx]!
            g += data[idx + 1]!
            b += data[idx + 2]!
            count++
          }
        }
      }
      if (count > 0) {
        ctx.fillStyle = `rgb(${Math.floor(r / count)}, ${Math.floor(g / count)}, ${Math.floor(b / count)})`
        ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE)
      }
      ctx.globalAlpha = TILE_TEXTURE_DETAIL_ALPHA_OVERRIDES[key] ?? TILE_TEXTURE_PROCESSING.TERRAIN_DETAIL_ALPHA
      ctx.drawImage(source, terrainSourceX, terrainSourceY, terrainSourceW, terrainSourceH, 0, 0, TILE_SIZE, TILE_SIZE)
      ctx.globalAlpha = 1
    } else if (stretchObjects.has(key)) {
      ctx.drawImage(source, minX, minY, cropW, cropH, 0, 0, TILE_SIZE, TILE_SIZE)
    } else {
      const margin = TILE_TEXTURE_PROCESSING.OBJECT_MARGIN_PX
      const maxSize = TILE_SIZE - margin * 2
      const aspect = cropW / cropH
      let drawW: number
      let drawH: number
      if (aspect >= 1) {
        drawW = maxSize
        drawH = Math.round(maxSize / aspect)
      } else {
        drawH = maxSize
        drawW = Math.round(maxSize * aspect)
      }
      const drawX = Math.floor((TILE_SIZE - drawW) / 2)
      const drawY = Math.floor((TILE_SIZE - drawH) / 2)
      ctx.drawImage(source, minX, minY, cropW, cropH, drawX, drawY, drawW, drawH)
    }

    scene.textures.remove(key)
    if (scene.textures.exists(key)) {
      processed.add(key)
      continue
    }
    scene.textures.addCanvas(key, canvas)
    processed.add(key)
  }
}
