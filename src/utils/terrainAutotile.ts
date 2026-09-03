import { MAP_TILE_IDS } from './constants'

export const NEIGHBOR_NORTH = 1
export const NEIGHBOR_EAST = 2
export const NEIGHBOR_SOUTH = 4
export const NEIGHBOR_WEST = 8

export const SYNTHESIZED_WATER_FILL_KEYS = {
  nature: 'env_water_fill',
  holy: 'holy_water_fill',
  dark: 'dark_water_fill',
} as const

export const WATER_FILL_SOURCE_KEYS = {
  [SYNTHESIZED_WATER_FILL_KEYS.nature]: 'env_river_vertical',
  [SYNTHESIZED_WATER_FILL_KEYS.holy]: 'holy_pool_square',
  [SYNTHESIZED_WATER_FILL_KEYS.dark]: 'dark_swamp_water_01',
} as const

export interface AutotileVisual {
  readonly key: string
  readonly fallbackKey?: string
  readonly flipX?: boolean
  readonly flipY?: boolean
  readonly angle?: number
}

interface WaterAutotilePack {
  readonly interior: string
  readonly interiorFallback: string
  readonly vertical: string
  readonly horizontal: string
  readonly northEdge: string
  readonly southEdge: string
  readonly westEdge: string
  readonly eastEdge: string
  readonly corner: string
  readonly pond: string
  readonly extraKeys: readonly string[]
}

const NATURE_WATER_PACK: WaterAutotilePack = {
  interior: SYNTHESIZED_WATER_FILL_KEYS.nature,
  interiorFallback: 'env_river_vertical',
  vertical: 'env_river_vertical',
  horizontal: 'env_river_edge',
  northEdge: 'env_river_edge',
  southEdge: 'env_river_edge',
  westEdge: 'env_river_vertical',
  eastEdge: 'env_river_vertical',
  corner: 'env_river_curve_01',
  pond: 'env_pond_round',
  extraKeys: ['env_river_curve_02', 'env_fence_long'],
}

const HOLY_WATER_PACK: WaterAutotilePack = {
  interior: SYNTHESIZED_WATER_FILL_KEYS.holy,
  interiorFallback: 'holy_pool_square',
  vertical: 'holy_waterfall_vertical',
  horizontal: 'holy_waterfall_horizontal',
  northEdge: 'holy_spring_edge_01',
  southEdge: 'holy_spring_edge_02',
  westEdge: 'holy_spring_edge_01',
  eastEdge: 'holy_spring_edge_01',
  corner: 'holy_water_corner',
  pond: 'holy_pool_round',
  extraKeys: ['holy_pool_square'],
}

const DARK_WATER_PACK: WaterAutotilePack = {
  interior: SYNTHESIZED_WATER_FILL_KEYS.dark,
  interiorFallback: 'dark_swamp_water_01',
  vertical: 'dark_swamp_water_01',
  horizontal: 'dark_swamp_edge',
  northEdge: 'dark_swamp_edge',
  southEdge: 'dark_swamp_edge',
  westEdge: 'dark_swamp_edge',
  eastEdge: 'dark_swamp_edge',
  corner: 'dark_swamp_edge',
  pond: 'dark_swamp_water_02',
  extraKeys: ['dark_cliff_horizontal', 'dark_cliff_vertical', 'dark_cliff_corner'],
}

export function normalizeMapTileset(tileset: string): 'nature' | 'holy' | 'dark' {
  if (tileset === 'holy') return 'holy'
  if (tileset === 'dark') return 'dark'
  return 'nature'
}

function getWaterPack(tileset: string): WaterAutotilePack {
  const normalized = normalizeMapTileset(tileset)
  if (normalized === 'holy') return HOLY_WATER_PACK
  if (normalized === 'dark') return DARK_WATER_PACK
  return NATURE_WATER_PACK
}

export function isWaterTileId(tileId: number): boolean {
  return tileId === MAP_TILE_IDS.WATER
}

export function isFenceTileId(tileId: number, tileset: string): boolean {
  return tileId === MAP_TILE_IDS.FENCE && normalizeMapTileset(tileset) === 'nature'
}

export function buildNeighborMask(
  width: number,
  height: number,
  x: number,
  y: number,
  isSame: (neighborX: number, neighborY: number) => boolean,
): number {
  let mask = 0
  if (isSame(x, y - 1)) mask |= NEIGHBOR_NORTH
  if (isSame(x + 1, y)) mask |= NEIGHBOR_EAST
  if (isSame(x, y + 1)) mask |= NEIGHBOR_SOUTH
  if (isSame(x - 1, y)) mask |= NEIGHBOR_WEST
  return mask
}

export function sameTileOrOutOfBounds(
  layer: readonly number[],
  width: number,
  height: number,
  tileId: number,
  neighborX: number,
  neighborY: number,
): boolean {
  if (neighborX < 0 || neighborY < 0 || neighborX >= width || neighborY >= height) return true
  return (layer[neighborY * width + neighborX] ?? 0) === tileId
}

function visual(key: string, fallbackKey: string, options: Omit<AutotileVisual, 'key' | 'fallbackKey'> = {}): AutotileVisual {
  return { key, fallbackKey, ...options }
}

export function resolveWaterAutotile(tileset: string, mask: number): AutotileVisual {
  const pack = getWaterPack(tileset)
  const fallback = pack.interiorFallback

  if (mask === (NEIGHBOR_NORTH | NEIGHBOR_SOUTH | NEIGHBOR_EAST | NEIGHBOR_WEST)) {
    return visual(pack.interior, fallback)
  }
  if (mask === (NEIGHBOR_NORTH | NEIGHBOR_SOUTH)) {
    return visual(pack.vertical, fallback)
  }
  if (mask === (NEIGHBOR_EAST | NEIGHBOR_WEST)) {
    return visual(pack.horizontal, fallback)
  }
  if (mask === 0) {
    return visual(pack.pond, fallback)
  }

  const hasNorth = (mask & NEIGHBOR_NORTH) !== 0
  const hasEast = (mask & NEIGHBOR_EAST) !== 0
  const hasSouth = (mask & NEIGHBOR_SOUTH) !== 0
  const hasWest = (mask & NEIGHBOR_WEST) !== 0
  const neighborCount = Number(hasNorth) + Number(hasEast) + Number(hasSouth) + Number(hasWest)

  if (neighborCount === 3) {
    if (!hasNorth) return visual(pack.northEdge, fallback)
    if (!hasSouth) return visual(pack.southEdge, fallback, { flipY: pack.southEdge === pack.northEdge })
    if (!hasWest) return visual(pack.westEdge, fallback, { angle: pack.westEdge === pack.horizontal ? -90 : 0 })
    return visual(pack.eastEdge, fallback, { flipX: pack.eastEdge === pack.vertical, angle: pack.eastEdge === pack.horizontal ? 90 : 0 })
  }

  if (neighborCount === 2) {
    if (hasEast && hasSouth) return visual(pack.corner, fallback)
    if (hasWest && hasSouth) return visual(pack.corner, fallback, { flipX: true })
    if (hasEast && hasNorth) return visual(pack.corner, fallback, { flipY: true })
    if (hasWest && hasNorth) return visual(pack.corner, fallback, { flipX: true, flipY: true })
  }

  if (hasSouth && !hasNorth) return visual(pack.northEdge, fallback)
  if (hasNorth && !hasSouth) return visual(pack.southEdge, fallback, { flipY: pack.southEdge === pack.northEdge })
  if (hasEast && !hasWest) return visual(pack.westEdge, fallback, { angle: pack.westEdge === pack.horizontal ? -90 : 0 })
  if (hasWest && !hasEast) return visual(pack.eastEdge, fallback, { flipX: pack.eastEdge === pack.vertical, angle: pack.eastEdge === pack.horizontal ? 90 : 0 })
  return visual(pack.interior, fallback)
}

export function collectAutotileTextureKeys(tileset: string): string[] {
  const pack = getWaterPack(tileset)
  return [
    pack.interiorFallback,
    pack.vertical,
    pack.horizontal,
    pack.northEdge,
    pack.southEdge,
    pack.westEdge,
    pack.eastEdge,
    pack.corner,
    pack.pond,
    WATER_FILL_SOURCE_KEYS[pack.interior as keyof typeof WATER_FILL_SOURCE_KEYS],
    ...pack.extraKeys,
  ].filter((key, index, keys): key is string => Boolean(key) && keys.indexOf(key) === index)
}

export function collectWaterFillSourceKey(tileset: string): string {
  const fillKey = SYNTHESIZED_WATER_FILL_KEYS[normalizeMapTileset(tileset)]
  return WATER_FILL_SOURCE_KEYS[fillKey]
}

export function collectSynthesizedWaterFillKey(tileset: string): string {
  return SYNTHESIZED_WATER_FILL_KEYS[normalizeMapTileset(tileset)]
}

export interface TileRun {
  readonly x: number
  readonly y: number
  readonly length: number
  readonly horizontal: boolean
}

export function collectTileRuns(
  layer: readonly number[],
  width: number,
  height: number,
  isRunTile: (tileId: number, x: number, y: number) => boolean,
): TileRun[] {
  const visited = new Set<number>()
  const runs: TileRun[] = []

  const indexAt = (x: number, y: number): number => y * width + x
  const matches = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= width || y >= height) return false
    return isRunTile(layer[indexAt(x, y)] ?? 0, x, y)
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = indexAt(x, y)
      if (visited.has(index) || !matches(x, y)) continue

      const canGrowEast = matches(x + 1, y)
      const horizontal = canGrowEast || !matches(x, y + 1)
      let length = 1

      if (horizontal) {
        while (matches(x + length, y)) {
          visited.add(indexAt(x + length, y))
          length += 1
        }
      } else {
        while (matches(x, y + length)) {
          visited.add(indexAt(x, y + length))
          length += 1
        }
      }

      visited.add(index)
      runs.push({ x, y, length, horizontal })
    }
  }

  return runs
}

export function collectFootprintCoveredCells(
  layer: readonly number[],
  width: number,
  height: number,
  getFootprint: (tileId: number) => { readonly width: number; readonly height: number } | undefined,
): Set<number> {
  const covered = new Set<number>()
  const origins = new Set<number>()

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x
      const footprint = getFootprint(layer[index] ?? 0)
      if (!footprint || (footprint.width <= 1 && footprint.height <= 1)) continue
      origins.add(index)
      for (let dy = 0; dy < footprint.height; dy++) {
        for (let dx = 0; dx < footprint.width; dx++) {
          if (dx === 0 && dy === 0) continue
          const nextX = x + dx
          const nextY = y + dy
          if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) continue
          covered.add(nextY * width + nextX)
        }
      }
    }
  }

  for (const origin of origins) covered.delete(origin)
  return covered
}

export function shouldSkipDenseStamp(x: number, y: number): boolean {
  return (x + y) % 2 === 1
}
