import Phaser from 'phaser'
import { GameData } from '../core/GameData'
import { SaveManager } from '../core/SaveManager'
import { InputManager } from '../core/InputManager'
import { EventBus, GameEvents } from '../core/EventBus'
import { AudioManager } from '../core/AudioManager'
import {
  EDITOR_PAGE_LINK,
  GAME_WIDTH,
  GAME_HEIGHT,
  PROJECT_GITHUB_URL,
  START_MAP_ID,
  STARTUP_LOADING,
  TITLE_BACKGROUND,
  TITLE_GITHUB_LINK,
  TITLE_MENU_ACTION_INDEX,
  TITLE_MENU_ITEMS,
  TITLE_MENU_LAYOUT,
  UI_FONT_FAMILY,
  UI_TITLE_FONT_FAMILY,
  scaleFont,
} from '../utils/constants'
import { bindTouchText } from '../utils/touch'
import { cleanupKeyboardOnShutdown } from '../utils/sceneLifecycle'

type ViteImportMeta = ImportMeta & {
  readonly env: {
    readonly BASE_URL: string
  }
}

export class TitleScene extends Phaser.Scene {
  private menuIndex = 0
  private menuItems: Phaser.GameObjects.Text[] = []
  private cursor!: Phaser.GameObjects.Rectangle
  private bg!: Phaser.GameObjects.Image
  private titleBgmRequested = false
  private transitioning = false

  constructor() {
    super({ key: 'TitleScene' })
  }

  create(): void {
    AudioManager.getInstance().setScene(this)
    this.menuIndex = 0
    this.menuItems = []
    this.titleBgmRequested = false
    this.transitioning = false

    this.createBackground()

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, TITLE_BACKGROUND.OVERLAY_COLOR, TITLE_BACKGROUND.OVERLAY_ALPHA)

    this.add.text(GAME_WIDTH / 2, TITLE_MENU_LAYOUT.TITLE_Y, '木桶镇', {
      fontSize: scaleFont(TITLE_MENU_LAYOUT.TITLE_FONT_SIZE),
      color: TITLE_MENU_LAYOUT.TITLE_COLOR,
      fontFamily: UI_TITLE_FONT_FAMILY,
      stroke: TITLE_MENU_LAYOUT.STROKE_COLOR,
      strokeThickness: TITLE_MENU_LAYOUT.TITLE_STROKE_THICKNESS,
    }).setOrigin(0.5)

    this.add.text(GAME_WIDTH / 2, TITLE_MENU_LAYOUT.SUBTITLE_Y, 'CaskTown', {
      fontSize: scaleFont(TITLE_MENU_LAYOUT.SUBTITLE_FONT_SIZE),
      color: TITLE_MENU_LAYOUT.SUBTITLE_COLOR,
      fontFamily: UI_FONT_FAMILY,
      stroke: TITLE_MENU_LAYOUT.STROKE_COLOR,
      strokeThickness: TITLE_MENU_LAYOUT.SUBTITLE_STROKE_THICKNESS,
    }).setOrigin(0.5)

    for (let i = 0; i < TITLE_MENU_ITEMS.length; i++) {
      const text = this.add.text(GAME_WIDTH / 2, TITLE_MENU_LAYOUT.START_Y + i * TITLE_MENU_LAYOUT.GAP_Y, TITLE_MENU_ITEMS[i]!, {
        fontSize: scaleFont(TITLE_MENU_LAYOUT.MENU_FONT_SIZE),
        color: TITLE_MENU_LAYOUT.MENU_COLOR,
        fontFamily: UI_FONT_FAMILY,
      }).setOrigin(0.5)
      bindTouchText(text, () => this.selectMenuItem(i))
      this.menuItems.push(text)
    }

    this.cursor = this.add.rectangle(GAME_WIDTH / 2 - TITLE_MENU_LAYOUT.CURSOR_OFFSET_X, TITLE_MENU_LAYOUT.START_Y, TITLE_MENU_LAYOUT.CURSOR_SIZE, TITLE_MENU_LAYOUT.CURSOR_SIZE, TITLE_MENU_LAYOUT.CURSOR_COLOR)
    this.cursor.setOrigin(0.5)

    cleanupKeyboardOnShutdown(this)
    this.input.keyboard?.on('keydown-UP', () => this.changeMenu(-1))
    this.input.keyboard?.on('keydown-DOWN', () => this.changeMenu(1))
    this.input.keyboard?.on('keydown-ENTER', () => this.selectMenu())
    this.input.keyboard?.on('keydown-SPACE', () => this.selectMenu())

    bindTouchText(this.add.text(TITLE_GITHUB_LINK.x, TITLE_GITHUB_LINK.y, 'GitHub', {
      fontSize: `${TITLE_GITHUB_LINK.fontSize}px`,
      color: TITLE_MENU_LAYOUT.LINK_COLOR,
      fontFamily: UI_FONT_FAMILY,
      stroke: TITLE_MENU_LAYOUT.STROKE_COLOR,
      strokeThickness: TITLE_MENU_LAYOUT.LINK_STROKE_THICKNESS,
    }).setOrigin(0.5), () => this.openGithub())

    this.cameras.main.fadeIn(TITLE_BACKGROUND.FADE_MS)
    window.dispatchEvent(new CustomEvent(STARTUP_LOADING.READY_EVENT))
  }

  private createBackground(): void {
    this.bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, TITLE_BACKGROUND.IMAGE_KEY)
    this.bg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
    this.bg.setAlpha(TITLE_BACKGROUND.IMAGE_ALPHA)

    if (!this.cache.video.exists(TITLE_BACKGROUND.VIDEO_KEY)) return

    const video = this.add.video(GAME_WIDTH / 2, GAME_HEIGHT / 2, TITLE_BACKGROUND.VIDEO_KEY)
    video.setVisible(false)
    const videoElement = video.video
    if (videoElement) {
      videoElement.muted = TITLE_BACKGROUND.VIDEO_MUTED
      videoElement.defaultMuted = TITLE_BACKGROUND.VIDEO_MUTED
      videoElement.playsInline = TITLE_BACKGROUND.VIDEO_PLAYS_INLINE
    }
    video.setLoop(TITLE_BACKGROUND.VIDEO_LOOP)

    const fitVideo = (): void => {
      video.setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
      video.setVisible(true)
    }
    const playVideo = (): void => {
      video.setMute(TITLE_BACKGROUND.VIDEO_MUTED)
      video.play(TITLE_BACKGROUND.VIDEO_LOOP)
    }

    video.once(Phaser.GameObjects.Events.VIDEO_CREATED, fitVideo)
    playVideo()
    this.input.once('pointerdown', playVideo)
    this.input.keyboard?.once('keydown', playVideo)
  }

  private changeMenu(dir: number): void {
    this.ensureTitleBGM()
    this.menuIndex = (this.menuIndex + dir + this.menuItems.length) % this.menuItems.length
    this.updateCursor()
  }

  private ensureTitleBGM(): void {
    if (this.titleBgmRequested) return
    this.titleBgmRequested = true
    AudioManager.getInstance().playBGM('title')
  }

  private updateCursor(): void {
    const target = this.menuItems[this.menuIndex]!
    this.cursor.setY(target.y)
  }

  private selectMenu(): void {
    if (this.transitioning) return
    switch (this.menuIndex) {
      case TITLE_MENU_ACTION_INDEX.NEW_GAME:
        this.startNewGame()
        break
      case TITLE_MENU_ACTION_INDEX.LOAD_GAME:
        this.loadGame()
        break
      case TITLE_MENU_ACTION_INDEX.EDITOR:
        this.openEditor()
        break
      case TITLE_MENU_ACTION_INDEX.SETTINGS:
        this.openSettings()
        break
      case TITLE_MENU_ACTION_INDEX.EXIT:
        this.showMessage('浏览器中无法直接退出')
        break
    }
  }

  private selectMenuItem(index: number): void {
    this.menuIndex = index
    this.updateCursor()
    this.selectMenu()
  }

  private openGithub(): void {
    const githubWindow = window.open(PROJECT_GITHUB_URL, TITLE_GITHUB_LINK.target, TITLE_GITHUB_LINK.features)
    if (!githubWindow) console.warn('Failed to open project GitHub link')
  }

  private openEditor(): void {
    const editorUrl = this.getEditorUrl()
    const editorWindow = window.open(editorUrl, EDITOR_PAGE_LINK.target)
    if (editorWindow) {
      editorWindow.opener = null
      return
    }

    try {
      window.location.assign(editorUrl)
    } catch {
      console.warn('Failed to open configuration editor')
    }
  }

  private getEditorUrl(): string {
    const baseUrl = new URL((import.meta as ViteImportMeta).env.BASE_URL, window.location.href)
    return new URL(EDITOR_PAGE_LINK.url, baseUrl).toString()
  }

  private startNewGame(): void {
    const gd = GameData.getInstance()
    gd.reset()
    InputManager.getInstance().syncFromGameData()
    this.startSceneAfterFade('MapScene', { mapId: START_MAP_ID })
  }

  private loadGame(): void {
    const saveManager = SaveManager.getInstance()
    const slot = saveManager.getLatestSaveSlot()
    if (!slot) {
      this.showMessage('无存档')
      return
    }
    if (!saveManager.load(slot)) {
      this.showMessage('读取失败')
      return
    }
    this.startSceneAfterFade('MapScene', { mapId: GameData.getInstance().currentMap })
  }

  private openSettings(): void {
    AudioManager.getInstance().playSFX('open_menu')
    this.scene.launch('SettingsScene', { returnTo: 'TitleScene' })
    this.scene.pause()
  }

  private showMessage(msg: string): void {
    const text = this.add.text(GAME_WIDTH / 2, TITLE_MENU_LAYOUT.MESSAGE_Y, msg, {
      fontSize: scaleFont(TITLE_MENU_LAYOUT.MESSAGE_FONT_SIZE),
      color: TITLE_MENU_LAYOUT.MESSAGE_COLOR,
      fontFamily: UI_FONT_FAMILY,
    }).setOrigin(0.5)
    this.time.delayedCall(TITLE_MENU_LAYOUT.MESSAGE_DURATION_MS, () => text.destroy())
  }

  private startSceneAfterFade(sceneKey: string, data?: object): void {
    if (this.transitioning) return
    this.transitioning = true
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(sceneKey, data)
    })
    this.cameras.main.fadeOut(TITLE_BACKGROUND.FADE_MS)
  }
}
