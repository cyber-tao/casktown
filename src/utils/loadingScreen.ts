import Phaser from 'phaser'
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  LOADING_SCREEN,
  UI_FONT_FAMILY,
  UI_TITLE_FONT_FAMILY,
} from './constants'

export function showLoadingScreen(scene: Phaser.Scene, label: string = LOADING_SCREEN.DEFAULT_LABEL): void {
  const container = scene.add.container(0, 0)
  container.setDepth(LOADING_SCREEN.DEPTH)

  const background = scene.textures.exists(LOADING_SCREEN.BACKGROUND_KEY)
    ? scene.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, LOADING_SCREEN.BACKGROUND_KEY).setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
    : scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, LOADING_SCREEN.FALLBACK_COLOR)
  background.setScrollFactor(0)
  container.add(background)

  container.add(scene.add.rectangle(
    GAME_WIDTH / 2,
    GAME_HEIGHT / 2,
    GAME_WIDTH,
    GAME_HEIGHT,
    LOADING_SCREEN.OVERLAY_COLOR,
    LOADING_SCREEN.OVERLAY_ALPHA,
  ).setScrollFactor(0))

  container.add(scene.add.text(GAME_WIDTH / 2, LOADING_SCREEN.TITLE_Y, LOADING_SCREEN.TITLE_TEXT, {
    fontSize: `${LOADING_SCREEN.TITLE_FONT_SIZE}px`,
    color: LOADING_SCREEN.TITLE_COLOR,
    fontFamily: UI_TITLE_FONT_FAMILY,
    stroke: LOADING_SCREEN.TEXT_STROKE_COLOR,
    strokeThickness: LOADING_SCREEN.TITLE_STROKE_THICKNESS,
  }).setOrigin(0.5).setScrollFactor(0))

  container.add(scene.add.text(GAME_WIDTH / 2, LOADING_SCREEN.LABEL_Y, label, {
    fontSize: `${LOADING_SCREEN.LABEL_FONT_SIZE}px`,
    color: LOADING_SCREEN.LABEL_COLOR,
    fontFamily: UI_FONT_FAMILY,
    stroke: LOADING_SCREEN.TEXT_STROKE_COLOR,
    strokeThickness: LOADING_SCREEN.LABEL_STROKE_THICKNESS,
  }).setOrigin(0.5).setScrollFactor(0))

  const progressBackground = scene.add.graphics()
  progressBackground.setScrollFactor(0)
  progressBackground.fillStyle(LOADING_SCREEN.PROGRESS_BACKGROUND_COLOR, LOADING_SCREEN.PROGRESS_BACKGROUND_ALPHA)
  progressBackground.fillRoundedRect(
    GAME_WIDTH / 2 - LOADING_SCREEN.PROGRESS_WIDTH / 2,
    LOADING_SCREEN.PROGRESS_Y - LOADING_SCREEN.PROGRESS_HEIGHT / 2,
    LOADING_SCREEN.PROGRESS_WIDTH,
    LOADING_SCREEN.PROGRESS_HEIGHT,
    LOADING_SCREEN.PROGRESS_RADIUS,
  )
  progressBackground.lineStyle(LOADING_SCREEN.PROGRESS_BORDER_WIDTH, LOADING_SCREEN.PROGRESS_BORDER_COLOR, LOADING_SCREEN.PROGRESS_BORDER_ALPHA)
  progressBackground.strokeRoundedRect(
    GAME_WIDTH / 2 - LOADING_SCREEN.PROGRESS_WIDTH / 2,
    LOADING_SCREEN.PROGRESS_Y - LOADING_SCREEN.PROGRESS_HEIGHT / 2,
    LOADING_SCREEN.PROGRESS_WIDTH,
    LOADING_SCREEN.PROGRESS_HEIGHT,
    LOADING_SCREEN.PROGRESS_RADIUS,
  )
  container.add(progressBackground)

  const progressFill = scene.add.graphics()
  progressFill.setScrollFactor(0)
  container.add(progressFill)

  const percentText = scene.add.text(GAME_WIDTH / 2, LOADING_SCREEN.PERCENT_Y, '0%', {
    fontSize: `${LOADING_SCREEN.PERCENT_FONT_SIZE}px`,
    color: LOADING_SCREEN.PERCENT_COLOR,
    fontFamily: UI_FONT_FAMILY,
  }).setOrigin(0.5).setScrollFactor(0)
  container.add(percentText)

  const dotStartX = GAME_WIDTH / 2 - ((LOADING_SCREEN.DOT_COUNT - 1) * LOADING_SCREEN.DOT_GAP) / 2
  for (let index = 0; index < LOADING_SCREEN.DOT_COUNT; index++) {
    const dot = scene.add.circle(
      dotStartX + index * LOADING_SCREEN.DOT_GAP,
      LOADING_SCREEN.DOT_Y,
      LOADING_SCREEN.DOT_RADIUS,
      LOADING_SCREEN.PROGRESS_FILL_COLOR,
      LOADING_SCREEN.DOT_ALPHA_MAX,
    )
    dot.setScrollFactor(0)
    container.add(dot)
    scene.tweens.add({
      targets: dot,
      alpha: LOADING_SCREEN.DOT_ALPHA_MIN,
      scale: LOADING_SCREEN.DOT_SCALE,
      duration: LOADING_SCREEN.DOT_TWEEN_MS,
      delay: index * LOADING_SCREEN.DOT_STAGGER_MS,
      yoyo: true,
      repeat: LOADING_SCREEN.DOT_TWEEN_REPEAT,
    })
  }

  const updateProgress = (progress: number): void => {
    const width = Math.max(LOADING_SCREEN.PROGRESS_MIN_WIDTH, LOADING_SCREEN.PROGRESS_WIDTH * progress)
    progressFill.clear()
    progressFill.fillStyle(LOADING_SCREEN.PROGRESS_FILL_COLOR, LOADING_SCREEN.PROGRESS_FILL_ALPHA)
    progressFill.fillRoundedRect(
      GAME_WIDTH / 2 - LOADING_SCREEN.PROGRESS_WIDTH / 2,
      LOADING_SCREEN.PROGRESS_Y - LOADING_SCREEN.PROGRESS_HEIGHT / 2,
      width,
      LOADING_SCREEN.PROGRESS_HEIGHT,
      Math.min(LOADING_SCREEN.PROGRESS_RADIUS, width / 2),
    )
    percentText.setText(`${Math.round(progress * LOADING_SCREEN.PERCENT_SCALE)}%`)
  }

  let cleaned = false
  const cleanup = (): void => {
    if (cleaned) return
    cleaned = true
    scene.load.off(Phaser.Loader.Events.PROGRESS, updateProgress)
    scene.load.off(Phaser.Loader.Events.COMPLETE, cleanup)
    scene.events.off(Phaser.Scenes.Events.CREATE, cleanup)
    scene.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanup)
    scene.tweens.killTweensOf(container)
    container.destroy(true)
  }

  updateProgress(0)
  scene.load.on(Phaser.Loader.Events.PROGRESS, updateProgress)
  scene.load.once(Phaser.Loader.Events.COMPLETE, cleanup)
  scene.events.once(Phaser.Scenes.Events.CREATE, cleanup)
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup)
}
