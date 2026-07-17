import Phaser from 'phaser'
import { EventBus, GameEvents } from '../core/EventBus'
import { GameData } from '../core/GameData'
import { AudioManager } from '../core/AudioManager'
import { InputManager } from '../core/InputManager'
import { queueImageAssets } from '../core/AssetLoader'
import { REBUILD_MILESTONES } from '../data/rebuild'
import { GAME_WIDTH, GAME_HEIGHT, COLORS, MENU_OVERLAY_UI, REBUILD_MENU, RUNTIME_UI_ASSET_KEYS, scaleFont } from '../utils/constants'
import { bindTouchText } from '../utils/touch'
import { cleanupKeyboardOnShutdown } from '../utils/sceneLifecycle'
import { addRuntimePanel } from '../utils/runtimePanels'
import { GamepadNavigationController, type GamepadNavigationAction } from '../utils/gamepadNavigation'

export class RebuildOverlay extends Phaser.Scene {
  private cursorIndex = 0
  private items: Phaser.GameObjects.Text[] = []
  private cursor!: Phaser.GameObjects.Rectangle
  private titleText!: Phaser.GameObjects.Text
  private descText!: Phaser.GameObjects.Text
  private progressText!: Phaser.GameObjects.Text
  private gamepadNavigation = new GamepadNavigationController()

  constructor() {
    super({ key: 'RebuildOverlay', active: false })
  }

  preload(): void {
    queueImageAssets(this, Object.values(RUNTIME_UI_ASSET_KEYS))
  }

  create(): void {
    this.cursorIndex = 0
    this.items = []
    this.gamepadNavigation.reset()
    AudioManager.getInstance().setScene(this)

    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.black, REBUILD_MENU.OVERLAY_ALPHA)
    overlay.setDepth(REBUILD_MENU.PANEL_DEPTH)
    overlay.setScrollFactor(0)

    addRuntimePanel(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, REBUILD_MENU.PANEL_WIDTH, REBUILD_MENU.PANEL_HEIGHT, RUNTIME_UI_ASSET_KEYS.MENU_PANEL, REBUILD_MENU.PANEL_TINT, REBUILD_MENU.PANEL_ALPHA, REBUILD_MENU.PANEL_DEPTH + 1)
    const panelBorder = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, REBUILD_MENU.PANEL_WIDTH, REBUILD_MENU.PANEL_HEIGHT, COLORS.black, 0)
    panelBorder.setStrokeStyle(REBUILD_MENU.BORDER_WIDTH, REBUILD_MENU.BORDER_COLOR)
    panelBorder.setDepth(REBUILD_MENU.CONTENT_DEPTH)
    panelBorder.setScrollFactor(0)

    this.titleText = this.add.text(REBUILD_MENU.TITLE_X, REBUILD_MENU.TITLE_Y, '木桶镇重建', {
      fontSize: scaleFont(REBUILD_MENU.TITLE_FONT_SIZE), color: MENU_OVERLAY_UI.COLORS.title,
    })
    this.titleText.setScrollFactor(0)
    this.titleText.setDepth(REBUILD_MENU.CONTENT_DEPTH)

    const gd = GameData.getInstance()

    this.progressText = this.add.text(REBUILD_MENU.GOLD_X, REBUILD_MENU.GOLD_Y, `当前 Lv.${gd.rebuildLevel}`, {
      fontSize: scaleFont(REBUILD_MENU.GOLD_FONT_SIZE), color: MENU_OVERLAY_UI.COLORS.title,
    })
    this.progressText.setScrollFactor(0)
    this.progressText.setDepth(REBUILD_MENU.CONTENT_DEPTH)

    this.cursor = this.add.rectangle(REBUILD_MENU.CURSOR_X, REBUILD_MENU.OPTION_START_Y, REBUILD_MENU.CURSOR_WIDTH, REBUILD_MENU.CURSOR_HEIGHT, REBUILD_MENU.CURSOR_COLOR, REBUILD_MENU.CURSOR_ALPHA)
    this.cursor.setOrigin(0, 0.5)
    this.cursor.setDepth(REBUILD_MENU.CONTENT_DEPTH)
    this.cursor.setScrollFactor(0)

    this.items = []
    for (let i = 0; i < REBUILD_MILESTONES.length; i++) {
      const milestone = REBUILD_MILESTONES[i]!
      const reached = gd.rebuildLevel >= milestone.level
      const label = `Lv.${milestone.level} ${milestone.name} [${reached ? '已达成' : '未达成'}]`
      const color = reached ? MENU_OVERLAY_UI.COLORS.dim : MENU_OVERLAY_UI.COLORS.text
      const text = this.add.text(REBUILD_MENU.OPTION_X, REBUILD_MENU.OPTION_START_Y + i * REBUILD_MENU.OPTION_GAP_Y, label, {
        fontSize: scaleFont(REBUILD_MENU.OPTION_FONT_SIZE), color,
      })
      text.setScrollFactor(0)
      text.setDepth(REBUILD_MENU.CONTENT_DEPTH)
      bindTouchText(text, () => this.selectTouchItem(i))
      this.items.push(text)
    }

    this.descText = this.add.text(REBUILD_MENU.DESC_X, REBUILD_MENU.DESC_Y, '', {
      fontSize: scaleFont(REBUILD_MENU.DESC_FONT_SIZE), color: MENU_OVERLAY_UI.COLORS.text, wordWrap: { width: REBUILD_MENU.DESC_WRAP_WIDTH },
    })
    this.descText.setScrollFactor(0)
    this.descText.setDepth(REBUILD_MENU.CONTENT_DEPTH)

    bindTouchText(this.add.text(REBUILD_MENU.BACK_X, REBUILD_MENU.BACK_Y, '返回', {
      fontSize: scaleFont(REBUILD_MENU.BACK_FONT_SIZE),
      color: MENU_OVERLAY_UI.COLORS.text,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(REBUILD_MENU.CONTENT_DEPTH), () => this.close())

    this.updateDescription()

    cleanupKeyboardOnShutdown(this)
    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      switch (event.code) {
        case 'ArrowUp': case 'KeyW':
          this.moveCursor(-1)
          break
        case 'ArrowDown': case 'KeyS':
          this.moveCursor(1)
          break
        case 'Escape':
          this.close()
          break
      }
    })
  }

  override update(): void {
    const input = InputManager.getInstance()
    const actions = this.gamepadNavigation.poll(this.input.gamepad, input.isGamepadEnabled())
    for (const action of actions) this.handleGamepadAction(action)
  }

  private handleGamepadAction(action: GamepadNavigationAction): void {
    if (action === 'up') {
      this.moveCursor(-1)
      return
    }
    if (action === 'down') {
      this.moveCursor(1)
      return
    }
    if (action === 'cancel' || action === 'menu') this.close()
  }

  private moveCursor(dir: number): void {
    this.cursorIndex = (this.cursorIndex + dir + REBUILD_MILESTONES.length) % REBUILD_MILESTONES.length
    this.updateCursor()
  }

  private updateCursor(): void {
    this.cursor.y = REBUILD_MENU.OPTION_START_Y + this.cursorIndex * REBUILD_MENU.OPTION_GAP_Y
    this.updateDescription()
  }

  private updateDescription(): void {
    const gd = GameData.getInstance()
    const milestone = REBUILD_MILESTONES[this.cursorIndex]!
    const state = gd.rebuildLevel >= milestone.level ? '已达成' : `达成条件：${milestone.condition}`
    this.descText.setText(`${state}\n\n${milestone.description}`)
  }

  private selectTouchItem(index: number): void {
    if (index < 0 || index >= REBUILD_MILESTONES.length) return
    this.cursorIndex = index
    this.updateCursor()
  }

  private close(): void {
    AudioManager.getInstance().playSFX('close_menu')
    EventBus.emit(GameEvents.MENU_CLOSE)
    this.scene.stop()
  }
}
