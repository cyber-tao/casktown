import Phaser from 'phaser'

export function cleanupKeyboardOnShutdown(scene: Phaser.Scene): void {
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.input.keyboard?.removeAllListeners()
  })
}

export function isSceneAudioHostUsable(scene: Phaser.Scene | null | undefined): boolean {
  if (!scene) return false
  const sys = scene.sys
  if (!sys) return true
  const status = sys.settings?.status
  if (typeof status === 'number' && status >= Phaser.Scenes.SHUTDOWN) return false
  if (typeof sys.isActive === 'function' || typeof sys.isPaused === 'function' || typeof sys.isSleeping === 'function') {
    return Boolean(sys.isActive?.() || sys.isPaused?.() || sys.isSleeping?.())
  }
  return true
}
