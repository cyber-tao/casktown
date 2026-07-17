import { describe, expect, test } from 'bun:test'
import type Phaser from 'phaser'
import { applyPixelSharp } from '../../src/utils/displaySettings.ts'

function createGameTarget() {
  const appliedFilters: number[] = []
  const game = {
    textures: {
      each(callback: (texture: { setFilter: (filterMode: number) => void }) => void) {
        callback({ setFilter: filterMode => appliedFilters.push(filterMode) })
        callback({ setFilter: filterMode => appliedFilters.push(filterMode) })
      },
    },
    renderer: { antialias: false },
    canvas: { style: { imageRendering: '' } },
  }
  return { game: game as unknown as Phaser.Game, appliedFilters, renderer: game.renderer, canvas: game.canvas }
}

describe('display settings', () => {
  test('enables nearest-neighbor rendering for pixel sharp mode', () => {
    const target = createGameTarget()

    applyPixelSharp(target.game, true, 1 as Phaser.Textures.FilterMode)

    expect(target.appliedFilters).toEqual([1, 1])
    expect(target.renderer.antialias).toBe(false)
    expect(target.canvas.style.imageRendering).toBe('pixelated')
  })

  test('restores linear rendering when pixel sharp mode is disabled', () => {
    const target = createGameTarget()

    applyPixelSharp(target.game, false, 0 as Phaser.Textures.FilterMode)

    expect(target.appliedFilters).toEqual([0, 0])
    expect(target.renderer.antialias).toBe(true)
    expect(target.canvas.style.imageRendering).toBe('auto')
  })
})
