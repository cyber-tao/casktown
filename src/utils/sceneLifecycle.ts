import Phaser from 'phaser'

export function cleanupKeyboardOnShutdown(scene: Phaser.Scene): void {
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.input.keyboard?.removeAllListeners()
  })
}
