import { describe, expect, test } from 'bun:test'
import { FIELD_ENTITY_BEHAVIOR, TILE_SIZE } from '../../src/utils/constants.ts'
import { isTileInsideSpriteBounds } from '../../src/utils/fieldGeometry.ts'

function createNpcSprite(spriteX: number): Parameters<typeof isTileInsideSpriteBounds>[0] {
  return {
    x: spriteX,
    y: 5 * TILE_SIZE + TILE_SIZE / 2,
    displayWidth: TILE_SIZE,
    displayHeight: TILE_SIZE,
    originX: 0.5,
    originY: 0.5,
  }
}

describe('MapScene NPC interaction', () => {
  test('detects a moving NPC that still overlaps the faced tile', () => {
    const sprite = createNpcSprite(7 * TILE_SIZE - 2)

    expect(isTileInsideSpriteBounds(
      sprite,
      6,
      5,
      TILE_SIZE,
      FIELD_ENTITY_BEHAVIOR.NPC_INTERACTION_BOUNDS_EPSILON_PX,
    )).toBe(true)
  })

  test('ignores a moving NPC that has left the faced tile', () => {
    const sprite = createNpcSprite(8 * TILE_SIZE + TILE_SIZE / 2)

    expect(isTileInsideSpriteBounds(
      sprite,
      6,
      5,
      TILE_SIZE,
      FIELD_ENTITY_BEHAVIOR.NPC_INTERACTION_BOUNDS_EPSILON_PX,
    )).toBe(false)
  })
})
