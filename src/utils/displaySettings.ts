import type Phaser from 'phaser'

export function applyPixelSharp(
  game: Phaser.Game,
  enabled: boolean,
  filterMode: Phaser.Textures.FilterMode,
): void {
  game.textures.each(texture => texture.setFilter(filterMode), game.textures)
  ;(game.renderer as Phaser.Renderer.Canvas.CanvasRenderer).antialias = !enabled
  game.canvas.style.imageRendering = enabled ? 'pixelated' : 'auto'
}
