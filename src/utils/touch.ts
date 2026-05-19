import Phaser from 'phaser'

export function bindTouchText(text: Phaser.GameObjects.Text, onPress: () => void): Phaser.GameObjects.Text {
  text.setInteractive({ useHandCursor: true })
  text.on(Phaser.Input.Events.POINTER_DOWN, onPress)
  return text
}
