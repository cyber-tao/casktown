import Phaser from 'phaser'

interface RuntimePanelStroke {
  readonly width: number
  readonly color: number
  readonly alpha?: number
}

interface RuntimePanelOrigin {
  readonly x: number
  readonly y: number
}

export interface RuntimePanelOptions {
  readonly depth: number
  readonly fallbackStroke?: RuntimePanelStroke
  readonly origin?: number | RuntimePanelOrigin
}

function applyOrigin(panel: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle, origin: RuntimePanelOptions['origin']): void {
  if (origin === undefined) return
  if (typeof origin === 'number') {
    panel.setOrigin(origin)
    return
  }
  panel.setOrigin(origin.x, origin.y)
}

export function addRuntimePanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  textureKey: string,
  fallbackColor: number,
  fallbackAlpha: number,
  depthOrOptions: number | RuntimePanelOptions,
): Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle {
  const options = typeof depthOrOptions === 'number' ? { depth: depthOrOptions } : depthOrOptions
  if (scene.textures.exists(textureKey)) {
    const panel = scene.add.image(x, y, textureKey)
    applyOrigin(panel, options.origin)
    panel.setDisplaySize(width, height)
    panel.setAlpha(fallbackAlpha)
    panel.setDepth(options.depth)
    panel.setScrollFactor(0)
    return panel
  }

  const panel = scene.add.rectangle(x, y, width, height, fallbackColor, fallbackAlpha)
  applyOrigin(panel, options.origin)
  if (options.fallbackStroke) {
    panel.setStrokeStyle(options.fallbackStroke.width, options.fallbackStroke.color, options.fallbackStroke.alpha)
  }
  panel.setDepth(options.depth)
  panel.setScrollFactor(0)
  return panel
}
