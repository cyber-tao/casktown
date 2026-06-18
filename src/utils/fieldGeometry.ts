export interface SpriteBoundsLike {
  x: number
  y: number
  displayWidth: number
  displayHeight: number
  originX: number
  originY: number
}

export function isTileInsideSpriteBounds(
  sprite: SpriteBoundsLike,
  tileX: number,
  tileY: number,
  tileSize: number,
  epsilonPx: number,
): boolean {
  const tileLeft = tileX * tileSize
  const tileTop = tileY * tileSize
  const tileRight = tileLeft + tileSize
  const tileBottom = tileTop + tileSize
  const spriteLeft = sprite.x - sprite.displayWidth * sprite.originX
  const spriteTop = sprite.y - sprite.displayHeight * sprite.originY
  const spriteRight = spriteLeft + sprite.displayWidth
  const spriteBottom = spriteTop + sprite.displayHeight
  return tileLeft < spriteRight - epsilonPx &&
    tileRight > spriteLeft + epsilonPx &&
    tileTop < spriteBottom - epsilonPx &&
    tileBottom > spriteTop + epsilonPx
}
