import { describe, expect, test } from 'bun:test'
import { IMAGE_ASSETS } from '../../src/data/assets.ts'
import { MAP_TILE_IDS } from '../../src/utils/constants.ts'
import {
  NEIGHBOR_EAST,
  NEIGHBOR_NORTH,
  NEIGHBOR_SOUTH,
  NEIGHBOR_WEST,
  buildNeighborMask,
  collectAutotileTextureKeys,
  collectFootprintCoveredCells,
  collectTileRuns,
  isFenceTileId,
  isWaterTileId,
  resolveWaterAutotile,
  sameTileOrOutOfBounds,
  shouldSkipDenseStamp,
} from '../../src/utils/terrainAutotile.ts'

describe('terrain autotile', () => {
  test('treats out-of-bounds neighbors as the same terrain', () => {
    const layer = [MAP_TILE_IDS.WATER]
    expect(sameTileOrOutOfBounds(layer, 1, 1, MAP_TILE_IDS.WATER, -1, 0)).toBe(true)
    expect(sameTileOrOutOfBounds(layer, 1, 1, MAP_TILE_IDS.WATER, 0, 0)).toBe(true)
  })

  test('builds a four-neighbor water mask', () => {
    const width = 3
    const layer = [
      MAP_TILE_IDS.GRASS, MAP_TILE_IDS.WATER, MAP_TILE_IDS.GRASS,
      MAP_TILE_IDS.WATER, MAP_TILE_IDS.WATER, MAP_TILE_IDS.WATER,
      MAP_TILE_IDS.GRASS, MAP_TILE_IDS.WATER, MAP_TILE_IDS.GRASS,
    ]
    const mask = buildNeighborMask(width, 3, 1, 1, (x, y) => sameTileOrOutOfBounds(layer, width, 3, MAP_TILE_IDS.WATER, x, y))
    expect(mask).toBe(NEIGHBOR_NORTH | NEIGHBOR_EAST | NEIGHBOR_SOUTH | NEIGHBOR_WEST)
  })

  test('uses a seamless interior fill for enclosed water', () => {
    const visual = resolveWaterAutotile('environment', NEIGHBOR_NORTH | NEIGHBOR_EAST | NEIGHBOR_SOUTH | NEIGHBOR_WEST)
    expect(visual.key).toBe('env_water_fill')
    expect(visual.fallbackKey).toBe('env_river_vertical')
  })

  test('uses river art for corridors and shoreline corners', () => {
    expect(resolveWaterAutotile('nature', NEIGHBOR_NORTH | NEIGHBOR_SOUTH).key).toBe('env_river_vertical')
    expect(resolveWaterAutotile('nature', NEIGHBOR_EAST | NEIGHBOR_WEST).key).toBe('env_river_edge')
    expect(resolveWaterAutotile('nature', NEIGHBOR_EAST | NEIGHBOR_SOUTH).key).toBe('env_river_curve_01')
    expect(resolveWaterAutotile('nature', 0).key).toBe('env_pond_round')
  })

  test('selects holy and dark water packs from the tileset', () => {
    const holyInterior = resolveWaterAutotile('holy', NEIGHBOR_NORTH | NEIGHBOR_EAST | NEIGHBOR_SOUTH | NEIGHBOR_WEST)
    expect(holyInterior.key).toBe('holy_water_fill')
    const darkEdge = resolveWaterAutotile('dark', NEIGHBOR_EAST | NEIGHBOR_SOUTH | NEIGHBOR_WEST)
    expect(darkEdge.key).toBe('dark_swamp_edge')
  })

  test('identifies nature fences and water tile ids', () => {
    expect(isWaterTileId(MAP_TILE_IDS.WATER)).toBe(true)
    expect(isFenceTileId(MAP_TILE_IDS.FENCE, 'environment')).toBe(true)
    expect(isFenceTileId(MAP_TILE_IDS.FENCE, 'holy')).toBe(false)
  })

  test('collects connected fence runs instead of single cells', () => {
    const width = 5
    const layer = [
      0, 7, 7, 7, 0,
      0, 7, 0, 0, 0,
      0, 7, 0, 0, 0,
    ]
    const runs = collectTileRuns(layer, width, 3, tileId => tileId === MAP_TILE_IDS.FENCE)
    expect(runs).toEqual([
      { x: 1, y: 0, length: 3, horizontal: true },
      { x: 1, y: 1, length: 2, horizontal: false },
    ])
  })

  test('keeps footprint origins while covering the rest of the building', () => {
    const width = 4
    const layer = [
      27, 0, 0, 0,
      0, 0, 0, 0,
      0, 0, 0, 0,
      0, 0, 0, 0,
    ]
    const covered = collectFootprintCoveredCells(layer, width, 4, tileId => (
      tileId === MAP_TILE_IDS.T_HOUSE ? { width: 3, height: 3 } : undefined
    ))
    expect(covered.has(0)).toBe(false)
    expect(covered.has(1)).toBe(true)
    expect(covered.has(width + 1)).toBe(true)
    expect(covered.size).toBe(8)
  })

  test('thins dense stamp tiles on a checkerboard', () => {
    expect(shouldSkipDenseStamp(0, 0)).toBe(false)
    expect(shouldSkipDenseStamp(1, 0)).toBe(true)
  })

  test('autotile texture keys resolve to configured image assets', () => {
    const missing = ['environment', 'holy', 'dark']
      .flatMap(tileset => collectAutotileTextureKeys(tileset))
      .filter((key, index, keys) => keys.indexOf(key) === index && !IMAGE_ASSETS[key])
    expect(missing).toEqual([])
  })
})
