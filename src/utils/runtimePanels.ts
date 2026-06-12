import Phaser from 'phaser'

export function addRuntimePanel(scene: Phaser.Scene, x: number, y: number, width: number, height: number, textureKey: string, fallbackColor: number, fallbackAlpha: number, depth: number): Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle {
  if (scene.textures.exists(textureKey)) {
    const panel = scene.add.image(x, y, textureKey)
    panel.setDisplaySize(width, height)
    panel.setAlpha(fallbackAlpha)
    panel.setDepth(depth)
    panel.setScrollFactor(0)
    return panel
  }

  const panel = scene.add.rectangle(x, y, width, height, fallbackColor, fallbackAlpha)
  panel.setDepth(depth)
  panel.setScrollFactor(0)
  return panel
}
