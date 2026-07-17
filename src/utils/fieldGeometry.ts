export interface SpriteBoundsLike {
  x: number
  y: number
  displayWidth: number
  displayHeight: number
  originX: number
  originY: number
}

export interface TilePoint {
  x: number
  y: number
}

const CARDINAL_TILE_OFFSETS: readonly TilePoint[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
]

export function getEscapeRetreatTiles(player: TilePoint, threat: TilePoint): TilePoint[] {
  return CARDINAL_TILE_OFFSETS
    .map(offset => ({ x: player.x + offset.x, y: player.y + offset.y }))
    .sort((a, b) => {
      const aDistance = (a.x - threat.x) ** 2 + (a.y - threat.y) ** 2
      const bDistance = (b.x - threat.x) ** 2 + (b.y - threat.y) ** 2
      return bDistance - aDistance
    })
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
