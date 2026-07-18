import Phaser from 'phaser'
import { TOUCH_INPUT } from './constants'

export function getCssToGameScale(scene: Phaser.Scene): number {
  const gameWidth = scene.scale.gameSize.width || scene.scale.width
  const gameHeight = scene.scale.gameSize.height || scene.scale.height
  const scaleX = scene.scale.displaySize.width / gameWidth
  const scaleY = scene.scale.displaySize.height / gameHeight
  return 1 / Math.max(Math.min(scaleX, scaleY), TOUCH_INPUT.MIN_DISPLAY_SCALE)
}

export function cssToGamePx(scene: Phaser.Scene, value: number): number {
  return Math.round(value * getCssToGameScale(scene))
}

function updateTouchTextHitArea(text: Phaser.GameObjects.Text): void {
  const cssToGameScale = getCssToGameScale(text.scene)
  const padding = TOUCH_INPUT.TEXT_HIT_AREA_PADDING_CSS * cssToGameScale
  const minWidth = TOUCH_INPUT.TEXT_HIT_AREA_MIN_CSS_WIDTH * cssToGameScale
  const minHeight = Math.min(
    TOUCH_INPUT.TEXT_HIT_AREA_MIN_CSS_HEIGHT * cssToGameScale,
    TOUCH_INPUT.TEXT_HIT_AREA_MAX_GAME_HEIGHT,
  )
  const width = Math.max(text.width + padding * 2, minWidth)
  const height = Math.max(text.height + padding * 2, minHeight)
  const x = (text.width - width) / 2
  const y = (text.height - height) / 2
  text.setInteractive(new Phaser.Geom.Rectangle(x, y, width, height), Phaser.Geom.Rectangle.Contains)
}

export function bindTouchText(text: Phaser.GameObjects.Text, onPress: () => void): Phaser.GameObjects.Text {
  const scale = text.scene.scale
  const updateHitArea = (): void => {
    if (!text.scene) {
      scale.off(Phaser.Scale.Events.RESIZE, updateHitArea)
      return
    }
    updateTouchTextHitArea(text)
  }
  updateHitArea()
  scale.on(Phaser.Scale.Events.RESIZE, updateHitArea)
  text.once(Phaser.GameObjects.Events.DESTROY, () => {
    scale.off(Phaser.Scale.Events.RESIZE, updateHitArea)
  })
  text.input!.cursor = 'pointer'
  text.on(Phaser.Input.Events.POINTER_DOWN, onPress)
  return text
}
