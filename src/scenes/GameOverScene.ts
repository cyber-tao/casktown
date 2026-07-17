import Phaser from 'phaser'
import { AudioManager } from '../core/AudioManager'
import { GameData } from '../core/GameData'
import { SaveManager } from '../core/SaveManager'
import { InputManager } from '../core/InputManager'
import { queueImageAssets } from '../core/AssetLoader'
import { COLORS, GAME_HEIGHT, GAME_OVER_MENU_INDEX, GAME_OVER_MENU_LABELS, GAME_OVER_PANEL, GAME_OVER_SUBTITLE, GAME_WIDTH, MENU_OVERLAY_UI, RUNTIME_UI_ASSET_KEYS, START_MAP_ID, UI_FONT_FAMILY, UI_TITLE_FONT_FAMILY, scaleFont } from '../utils/constants'
import { bindTouchText } from '../utils/touch'
import { cleanupKeyboardOnShutdown } from '../utils/sceneLifecycle'
import { addRuntimePanel } from '../utils/runtimePanels'
import { GamepadNavigationController, type GamepadNavigationAction } from '../utils/gamepadNavigation'

export class GameOverScene extends Phaser.Scene {
  private menuIndex = 0
  private menuItems: Phaser.GameObjects.Text[] = []
  private cursor!: Phaser.GameObjects.Rectangle
  private gamepadNavigation = new GamepadNavigationController()

  constructor() {
    super({ key: 'GameOverScene' })
  }

  preload(): void {
    queueImageAssets(this, [RUNTIME_UI_ASSET_KEYS.MENU_PANEL])
  }

  create(): void {
    this.menuIndex = 0
    this.menuItems = []
    this.gamepadNavigation.reset()
    AudioManager.getInstance().setScene(this)
    AudioManager.getInstance().playGameOverBGM()

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, GAME_OVER_PANEL.backgroundColor, GAME_OVER_PANEL.backgroundAlpha)

    addRuntimePanel(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_OVER_PANEL.panelWidth, GAME_OVER_PANEL.panelHeight, RUNTIME_UI_ASSET_KEYS.MENU_PANEL, GAME_OVER_PANEL.panelTint, GAME_OVER_PANEL.panelAlpha, GAME_OVER_PANEL.panelDepth)
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_OVER_PANEL.panelWidth, GAME_OVER_PANEL.panelHeight, COLORS.black, 0)
      .setStrokeStyle(GAME_OVER_PANEL.borderWidth, GAME_OVER_PANEL.borderColor)
      .setDepth(GAME_OVER_PANEL.borderDepth)
      .setScrollFactor(0)

    this.add.text(GAME_OVER_PANEL.titleX, GAME_OVER_PANEL.titleY, 'GAME OVER', {
      fontSize: scaleFont(GAME_OVER_PANEL.titleFontSize),
      color: GAME_OVER_PANEL.titleColor,
      fontFamily: UI_TITLE_FONT_FAMILY,
    }).setOrigin(0.5).setDepth(GAME_OVER_PANEL.contentDepth).setScrollFactor(0)
    this.add.text(GAME_OVER_PANEL.subtitleX, GAME_OVER_PANEL.subtitleY, GAME_OVER_SUBTITLE, {
      fontSize: scaleFont(GAME_OVER_PANEL.subtitleFontSize),
      color: MENU_OVERLAY_UI.COLORS.text,
      fontFamily: UI_FONT_FAMILY,
      wordWrap: { width: GAME_OVER_PANEL.subtitleWrapWidth },
    }).setDepth(GAME_OVER_PANEL.contentDepth).setScrollFactor(0)

    for (let i = 0; i < GAME_OVER_MENU_LABELS.length; i++) {
      const text = this.add.text(GAME_OVER_PANEL.menuX, GAME_OVER_PANEL.menuStartY + i * GAME_OVER_PANEL.menuGap, GAME_OVER_MENU_LABELS[i]!, {
        fontSize: scaleFont(GAME_OVER_PANEL.menuFontSize),
        color: MENU_OVERLAY_UI.COLORS.text,
        fontFamily: UI_FONT_FAMILY,
      }).setOrigin(0.5).setDepth(GAME_OVER_PANEL.contentDepth).setScrollFactor(0)
      bindTouchText(text, () => this.selectMenuItem(i))
      this.menuItems.push(text)
    }

    this.cursor = this.add.rectangle(GAME_OVER_PANEL.cursorX, GAME_OVER_PANEL.menuStartY, GAME_OVER_PANEL.cursorSize, GAME_OVER_PANEL.cursorSize, MENU_OVERLAY_UI.COLORS.highlight)
    this.cursor.setOrigin(0.5)
    this.cursor.setDepth(GAME_OVER_PANEL.contentDepth)
    this.cursor.setScrollFactor(0)

    cleanupKeyboardOnShutdown(this)
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      const action = InputManager.getInstance().getNavigationAction(event.code)
      if (action) this.handleGamepadAction(action)
    })
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
    if (action === 'confirm' || action === 'menu') this.selectMenu()
  }

  private changeMenu(dir: number): void {
    this.menuIndex = (this.menuIndex + dir + this.menuItems.length) % this.menuItems.length
    this.cursor.setY(this.menuItems[this.menuIndex]!.y)
    AudioManager.getInstance().playSFX('cursor')
  }

  private selectMenu(): void {
    AudioManager.getInstance().playSFX('confirm')
    switch (this.menuIndex) {
      case GAME_OVER_MENU_INDEX.LOAD:
        this.loadGame()
        break
      case GAME_OVER_MENU_INDEX.RESTART:
        this.startNewGame()
        break
      case GAME_OVER_MENU_INDEX.TITLE:
        this.scene.start('TitleScene')
        break
    }
  }

  private selectMenuItem(index: number): void {
    this.menuIndex = index
    this.cursor.setY(this.menuItems[this.menuIndex]!.y)
    this.selectMenu()
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
    this.scene.start('MapScene', { mapId: GameData.getInstance().currentMap })
  }

  private startNewGame(): void {
    GameData.getInstance().reset({ preserveSettings: true })
    InputManager.getInstance().syncFromGameData()
    this.scene.start('MapScene', { mapId: START_MAP_ID })
  }

  private showMessage(message: string): void {
    const text = this.add.text(GAME_OVER_PANEL.messageX, GAME_OVER_PANEL.messageY, message, {
      fontSize: scaleFont(GAME_OVER_PANEL.messageFontSize),
      color: GAME_OVER_PANEL.messageColor,
      fontFamily: UI_FONT_FAMILY,
    }).setOrigin(0.5).setDepth(GAME_OVER_PANEL.contentDepth).setScrollFactor(0)
    this.time.delayedCall(GAME_OVER_PANEL.messageDurationMs, () => text.destroy())
  }
}
