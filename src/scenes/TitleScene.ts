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
import { markStartupReady } from '../utils/startup'
import { formatSaveSlotLabel, getLoadSaveSlots } from '../utils/saveSlots'
import { GamepadNavigationController, type GamepadNavigationAction } from '../utils/gamepadNavigation'

type ViteImportMeta = ImportMeta & {
  readonly env: {
    readonly BASE_URL: string
  }
}

export class TitleScene extends Phaser.Scene {
  private menuIndex = 0
  private menuItems: Phaser.GameObjects.Text[] = []
  private cursor?: Phaser.GameObjects.Rectangle
  private bg!: Phaser.GameObjects.Image
  private titleBgmRequested = false
  private transitioning = false
  private isSelectingSave = false
  private saveIndex = 0
  private saveRows: Array<{ slot: number | null; label: string }> = []
  private gamepadNavigation = new GamepadNavigationController()

  constructor() {
    super({ key: 'TitleScene' })
  }

  create(): void {
    AudioManager.getInstance().setScene(this)
    this.menuIndex = 0
    this.menuItems = []
    this.titleBgmRequested = false
    this.transitioning = false
    this.isSelectingSave = false
    this.saveIndex = 0
    this.saveRows = []
    this.gamepadNavigation.reset()

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

    this.add.rectangle(
      TITLE_MENU_LAYOUT.PANEL_X,
      TITLE_MENU_LAYOUT.PANEL_Y,
      TITLE_MENU_LAYOUT.PANEL_WIDTH,
      TITLE_MENU_LAYOUT.PANEL_HEIGHT,
      TITLE_MENU_LAYOUT.PANEL_FILL_COLOR,
      TITLE_MENU_LAYOUT.PANEL_ALPHA,
    ).setStrokeStyle(
      TITLE_MENU_LAYOUT.PANEL_BORDER_WIDTH,
      TITLE_MENU_LAYOUT.PANEL_BORDER_COLOR,
      TITLE_MENU_LAYOUT.PANEL_BORDER_ALPHA,
    )

    this.renderMainMenu()

    cleanupKeyboardOnShutdown(this)
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      const action = InputManager.getInstance().getNavigationAction(event.code)
      if (action) this.handleGamepadAction(action)
    })

    bindTouchText(this.add.text(TITLE_GITHUB_LINK.x, TITLE_GITHUB_LINK.y, 'GitHub', {
      fontSize: `${TITLE_GITHUB_LINK.fontSize}px`,
      color: TITLE_MENU_LAYOUT.LINK_COLOR,
      fontFamily: UI_FONT_FAMILY,
      stroke: TITLE_MENU_LAYOUT.STROKE_COLOR,
      strokeThickness: TITLE_MENU_LAYOUT.LINK_STROKE_THICKNESS,
    }).setOrigin(0.5), () => this.openGithub())

    this.cameras.main.fadeIn(TITLE_BACKGROUND.FADE_MS)
    markStartupReady()
  }

  override update(): void {
    const input = InputManager.getInstance()
    const actions = this.gamepadNavigation.poll(this.input.gamepad, input.isGamepadEnabled())
    for (const action of actions) this.handleGamepadAction(action)
  }

  private handleGamepadAction(action: GamepadNavigationAction): void {
    if (action === 'up') {
      this.changeMenu(-1)
      return
    }
    if (action === 'down') {
      this.changeMenu(1)
      return
    }
    if (action === 'confirm') {
      this.selectMenu()
      return
    }
    if (action === 'cancel' || action === 'menu') this.handleCancel()
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
    if (this.isSelectingSave) {
      this.saveIndex = (this.saveIndex + dir + this.saveRows.length) % this.saveRows.length
      this.updateCursor()
      AudioManager.getInstance().playSFX('cursor')
      return
    }
    this.menuIndex = (this.menuIndex + dir + this.menuItems.length) % this.menuItems.length
    this.updateCursor()
  }

  private ensureTitleBGM(): void {
    if (this.titleBgmRequested) return
    this.titleBgmRequested = true
    AudioManager.getInstance().playBGM('title')
  }

  private updateCursor(): void {
    const target = this.isSelectingSave ? this.menuItems[this.saveIndex] : this.menuItems[this.menuIndex]
    if (target && this.cursor) this.cursor.setY(target.y)
  }

  private selectMenu(): void {
    if (this.transitioning) return
    if (this.isSelectingSave) {
      this.confirmSaveSelection()
      return
    }
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

  private clearMenuRows(): void {
    for (const text of this.menuItems) text.destroy()
    this.menuItems = []
    this.cursor?.destroy()
    this.cursor = undefined
  }

  private renderMainMenu(): void {
    this.isSelectingSave = false
    this.saveRows = []
    this.clearMenuRows()
    for (let i = 0; i < TITLE_MENU_ITEMS.length; i++) {
      const text = this.addTitleMenuText(TITLE_MENU_ITEMS[i]!, i, TITLE_MENU_LAYOUT.MENU_FONT_SIZE)
      bindTouchText(text, () => this.selectMenuItem(i))
      this.menuItems.push(text)
    }
    this.cursor = this.addTitleCursor(TITLE_MENU_LAYOUT.START_Y + this.menuIndex * TITLE_MENU_LAYOUT.GAP_Y)
  }

  private renderSaveSelector(): void {
    this.isSelectingSave = true
    this.saveRows = [
      ...getLoadSaveSlots(true).map(slot => ({
        slot,
        label: formatSaveSlotLabel(slot, SaveManager.getInstance().getMeta(slot), 'load'),
      })),
      { slot: null, label: '返回' },
    ]
    this.saveIndex = 0
    this.clearMenuRows()
    for (let i = 0; i < this.saveRows.length; i++) {
      const text = this.addTitleMenuText(this.saveRows[i]!.label, i, TITLE_MENU_LAYOUT.LOAD_FONT_SIZE, 'left')
      bindTouchText(text, () => {
        this.saveIndex = i
        this.updateCursor()
        this.confirmSaveSelection()
      })
      this.menuItems.push(text)
    }
    this.cursor = this.addTitleCursor(TITLE_MENU_LAYOUT.START_Y)
  }

  private addTitleMenuText(label: string, index: number, fontSize: number, align: 'center' | 'left' = 'center'): Phaser.GameObjects.Text {
    const isLeftAligned = align === 'left'
    const x = isLeftAligned
      ? TITLE_MENU_LAYOUT.PANEL_X - TITLE_MENU_LAYOUT.PANEL_WIDTH / 2 + TITLE_MENU_LAYOUT.CURSOR_OFFSET_X + TITLE_MENU_LAYOUT.CURSOR_SIZE * 2
      : TITLE_MENU_LAYOUT.MENU_X
    const text = this.add.text(x, TITLE_MENU_LAYOUT.START_Y + index * TITLE_MENU_LAYOUT.GAP_Y, label, {
      fontSize: scaleFont(fontSize),
      color: TITLE_MENU_LAYOUT.MENU_COLOR,
      fontFamily: UI_FONT_FAMILY,
      stroke: TITLE_MENU_LAYOUT.STROKE_COLOR,
      strokeThickness: TITLE_MENU_LAYOUT.MENU_STROKE_THICKNESS,
    }).setOrigin(isLeftAligned ? 0 : 0.5, 0.5)
    this.fitTitleMenuText(text, isLeftAligned
      ? TITLE_MENU_LAYOUT.PANEL_WIDTH - TITLE_MENU_LAYOUT.CURSOR_OFFSET_X - TITLE_MENU_LAYOUT.CURSOR_SIZE * 4
      : TITLE_MENU_LAYOUT.PANEL_WIDTH - TITLE_MENU_LAYOUT.CURSOR_OFFSET_X)
    return text
  }

  private addTitleCursor(y: number): Phaser.GameObjects.Rectangle {
    const cursor = this.add.rectangle(TITLE_MENU_LAYOUT.MENU_X - TITLE_MENU_LAYOUT.CURSOR_OFFSET_X, y, TITLE_MENU_LAYOUT.CURSOR_SIZE, TITLE_MENU_LAYOUT.CURSOR_SIZE, TITLE_MENU_LAYOUT.CURSOR_COLOR)
    cursor.setOrigin(0.5)
    return cursor
  }

  private fitTitleMenuText(text: Phaser.GameObjects.Text, maxWidth: number): void {
    const width = text.getBounds().width
    if (width <= maxWidth) return
    text.setScale(Math.max(0.72, maxWidth / width), 1)
  }

  private handleCancel(): void {
    if (!this.isSelectingSave) return
    AudioManager.getInstance().playSFX('cancel')
    this.renderMainMenu()
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
    gd.reset({ preserveSettings: true })
    InputManager.getInstance().syncFromGameData()
    this.startSceneAfterFade('MapScene', { mapId: START_MAP_ID })
  }

  private loadGame(): void {
    this.renderSaveSelector()
  }

  private confirmSaveSelection(): void {
    const selected = this.saveRows[this.saveIndex]
    if (!selected) return
    if (selected.slot === null) {
      AudioManager.getInstance().playSFX('cancel')
      this.renderMainMenu()
      return
    }
    const saveManager = SaveManager.getInstance()
    if (!saveManager.hasSave(selected.slot)) {
      this.showMessage('该槽位没有存档')
      return
    }
    if (!saveManager.load(selected.slot)) {
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
    const text = this.add.text(TITLE_MENU_LAYOUT.MESSAGE_X, TITLE_MENU_LAYOUT.MESSAGE_Y, msg, {
      fontSize: scaleFont(TITLE_MENU_LAYOUT.MESSAGE_FONT_SIZE),
      color: TITLE_MENU_LAYOUT.MESSAGE_COLOR,
      fontFamily: UI_FONT_FAMILY,
      stroke: TITLE_MENU_LAYOUT.STROKE_COLOR,
      strokeThickness: TITLE_MENU_LAYOUT.MENU_STROKE_THICKNESS,
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
