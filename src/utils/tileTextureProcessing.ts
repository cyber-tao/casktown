export function isWaterPixel(red: number, green: number, blue: number, alpha: number): boolean {
  if (alpha < 32) return false
  if (blue > red + 12 && blue > green && blue > 64) return true
  if (green >= red && blue >= red && green + blue > red * 2 + 20 && red < 96 && green < 150) return true
  return false
}

export function findWaterPixelBounds(
  data: ArrayLike<number>,
  sourceWidth: number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): { minX: number; minY: number; maxX: number; maxY: number; count: number } {
  let waterMinX = maxX
  let waterMinY = maxY
  let waterMaxX = minX
  let waterMaxY = minY
  let count = 0

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const index = (y * sourceWidth + x) * 4
      const red = data[index] ?? 0
      const green = data[index + 1] ?? 0
      const blue = data[index + 2] ?? 0
      const alpha = data[index + 3] ?? 0
      if (!isWaterPixel(red, green, blue, alpha)) continue
      count += 1
      if (x < waterMinX) waterMinX = x
      if (y < waterMinY) waterMinY = y
      if (x > waterMaxX) waterMaxX = x
      if (y > waterMaxY) waterMaxY = y
    }
  }

  return { minX: waterMinX, minY: waterMinY, maxX: waterMaxX, maxY: waterMaxY, count }
}

export function insetRect(
  minX: number,
  minY: number,
  width: number,
  height: number,
  insetRatioX: number,
  insetRatioY: number,
): { x: number; y: number; width: number; height: number } {
  const insetX = Math.floor(width * insetRatioX)
  const insetY = Math.floor(height * insetRatioY)
  return {
    x: minX + insetX,
    y: minY + insetY,
    width: Math.max(1, width - insetX * 2),
    height: Math.max(1, height - insetY * 2),
  }
}
