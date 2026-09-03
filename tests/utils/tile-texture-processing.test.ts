import { describe, expect, test } from 'bun:test'
import { findWaterPixelBounds, insetRect, isWaterPixel } from '../../src/utils/tileTextureProcessing.ts'

describe('tile texture processing', () => {
  test('detects blue and swamp water pixels', () => {
    expect(isWaterPixel(40, 80, 160, 255)).toBe(true)
    expect(isWaterPixel(40, 90, 70, 255)).toBe(true)
    expect(isWaterPixel(180, 160, 90, 255)).toBe(false)
    expect(isWaterPixel(40, 80, 160, 0)).toBe(false)
  })

  test('insets a crop without collapsing it', () => {
    expect(insetRect(0, 0, 100, 80, 0.2, 0.25)).toEqual({ x: 20, y: 20, width: 60, height: 40 })
    expect(insetRect(4, 6, 3, 3, 0.4, 0.4)).toEqual({ x: 5, y: 7, width: 1, height: 1 })
  })

  test('finds the opaque water region inside a buffer', () => {
    const width = 3
    const data = new Uint8ClampedArray(width * 3 * 4)
    const paint = (x: number, y: number, r: number, g: number, b: number): void => {
      const index = (y * width + x) * 4
      data[index] = r
      data[index + 1] = g
      data[index + 2] = b
      data[index + 3] = 255
    }
    paint(0, 0, 120, 90, 40)
    paint(1, 1, 30, 70, 170)
    paint(2, 1, 28, 68, 165)
    const bounds = findWaterPixelBounds(data, width, 0, 0, 2, 2)
    expect(bounds.count).toBe(2)
    expect(bounds).toMatchObject({ minX: 1, minY: 1, maxX: 2, maxY: 1 })
  })
})
