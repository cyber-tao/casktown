import Phaser from 'phaser'
import { GameData } from '../core/GameData'
import { SaveManager } from '../core/SaveManager'
import { EventBus, GameEvents } from '../core/EventBus'
import { AudioManager } from '../core/AudioManager'
import {
  EDITOR_PAGE_LINK,
  GAME_WIDTH,
  GAME_HEIGHT,
  PROJECT_GITHUB_URL,
  START_MAP_ID,
  TITLE_GITHUB_LINK,
  TITLE_MENU_ACTION_INDEX,
  TITLE_MENU_ITEMS,
  TITLE_MENU_LAYOUT,
  scaleFont,
  scalePx,
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

  constructor() {
    super({ key: 'TitleScene' })
  }

  create(): void {
    AudioManager.getInstance().setScene(this)
    this.menuIndex = 0
    this.menuItems = []
    this.titleBgmRequested = false

    // Background
    this.bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'ui_title_bg')
    this.bg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
    this.bg.setAlpha(0.6)

    // Dark overlay for text readability
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.3)

    // Title
    this.add.text(GAME_WIDTH / 2, scalePx(120), '木桶镇', {
      fontSize: scaleFont(64),
      color: '#e8e8f0',
      fontFamily: 'serif',
      stroke: '#1a1a2e',
      strokeThickness: scalePx(6),
    }).setOrigin(0.5)

    this.add.text(GAME_WIDTH / 2, scalePx(190), 'CaskTown', {
      fontSize: scaleFont(28),
      color: '#a0a0c0',
      fontFamily: 'sans-serif',
      stroke: '#1a1a2e',
      strokeThickness: scalePx(4),
    }).setOrigin(0.5)

    // Menu
    for (let i = 0; i < TITLE_MENU_ITEMS.length; i++) {
      const text = this.add.text(GAME_WIDTH / 2, TITLE_MENU_LAYOUT.START_Y + i * TITLE_MENU_LAYOUT.GAP_Y, TITLE_MENU_ITEMS[i]!, {
        fontSize: scaleFont(24),
        color: '#c0c0d0',
        fontFamily: 'sans-serif',
      }).setOrigin(0.5)
      bindTouchText(text, () => this.selectMenuItem(i))
      this.menuItems.push(text)
    }

    // Cursor
    this.cursor = this.add.rectangle(GAME_WIDTH / 2 - TITLE_MENU_LAYOUT.CURSOR_OFFSET_X, TITLE_MENU_LAYOUT.START_Y, TITLE_MENU_LAYOUT.CURSOR_SIZE, TITLE_MENU_LAYOUT.CURSOR_SIZE, 0xf1c40f)
    this.cursor.setOrigin(0.5)

    cleanupKeyboardOnShutdown(this)
    this.input.keyboard?.on('keydown-UP', () => this.changeMenu(-1))
    this.input.keyboard?.on('keydown-DOWN', () => this.changeMenu(1))
    this.input.keyboard?.on('keydown-ENTER', () => this.selectMenu())
    this.input.keyboard?.on('keydown-SPACE', () => this.selectMenu())

    bindTouchText(this.add.text(TITLE_GITHUB_LINK.x, TITLE_GITHUB_LINK.y, 'GitHub', {
      fontSize: `${TITLE_GITHUB_LINK.fontSize}px`,
      color: '#a0a0c0',
      fontFamily: 'sans-serif',
      stroke: '#1a1a2e',
      strokeThickness: scalePx(3),
    }).setOrigin(0.5), () => this.openGithub())

    // Fade in
    this.cameras.main.fadeIn(500)
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
    this.cameras.main.fadeOut(500)
    this.time.delayedCall(500, () => {
      this.scene.start('MapScene', { mapId: START_MAP_ID })
    })
  }

  private loadGame(): void {
    const saveManager = SaveManager.getInstance()
    if (saveManager.hasSave(1)) {
      saveManager.load(1)
      this.cameras.main.fadeOut(500)
      this.time.delayedCall(500, () => {
        this.scene.start('MapScene', { mapId: GameData.getInstance().currentMap })
      })
    } else {
      this.showMessage('无存档')
    }
  }

  private openSettings(): void {
    AudioManager.getInstance().playSFX('open_menu')
    this.scene.launch('SettingsScene', { returnTo: 'TitleScene' })
    this.scene.pause()
  }

  private showMessage(msg: string): void {
    const text = this.add.text(GAME_WIDTH / 2, scalePx(480), msg, {
      fontSize: scaleFont(20),
      color: '#e74c3c',
    }).setOrigin(0.5)
    this.time.delayedCall(1500, () => text.destroy())
  }
}
