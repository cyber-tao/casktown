import Phaser from 'phaser'
import { EventBus, GameEvents } from '../core/EventBus'
import { GameData } from '../core/GameData'
import { RebuildSystem } from '../core/RebuildSystem'
import { AudioManager } from '../core/AudioManager'
import { queueImageAssets } from '../core/AssetLoader'
import { GAME_WIDTH, GAME_HEIGHT, COLORS, MENU_OVERLAY_UI, REBUILD_MENU, RUNTIME_UI_ASSET_KEYS, scaleFont } from '../utils/constants'
import { bindTouchText } from '../utils/touch'
import { cleanupKeyboardOnShutdown } from '../utils/sceneLifecycle'
import { addRuntimePanel } from '../utils/runtimePanels'

export class RebuildOverlay extends Phaser.Scene {
  private cursorIndex = 0
  private items: Phaser.GameObjects.Text[] = []
  private cursor!: Phaser.GameObjects.Rectangle
  private titleText!: Phaser.GameObjects.Text
  private descText!: Phaser.GameObjects.Text
  private goldText!: Phaser.GameObjects.Text

  constructor() {
    super({ key: 'RebuildOverlay', active: false })
  }

  preload(): void {
    queueImageAssets(this, Object.values(RUNTIME_UI_ASSET_KEYS))
  }

  create(): void {
    this.cursorIndex = 0
    this.items = []
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

    this.goldText = this.add.text(REBUILD_MENU.GOLD_X, REBUILD_MENU.GOLD_Y, `${REBUILD_MENU.GOLD_COST_LABEL}: ${gd.gold}G`, {
      fontSize: scaleFont(REBUILD_MENU.GOLD_FONT_SIZE), color: MENU_OVERLAY_UI.COLORS.title,
    })
    this.goldText.setScrollFactor(0)
    this.goldText.setDepth(REBUILD_MENU.CONTENT_DEPTH)

    this.cursor = this.add.rectangle(REBUILD_MENU.CURSOR_X, REBUILD_MENU.OPTION_START_Y, REBUILD_MENU.CURSOR_WIDTH, REBUILD_MENU.CURSOR_HEIGHT, REBUILD_MENU.CURSOR_COLOR, REBUILD_MENU.CURSOR_ALPHA)
    this.cursor.setOrigin(0, 0.5)
    this.cursor.setDepth(REBUILD_MENU.CONTENT_DEPTH)
    this.cursor.setScrollFactor(0)

    this.items = []
    for (let i = 0; i < REBUILD_MENU.OPTIONS.length; i++) {
      const opt = REBUILD_MENU.OPTIONS[i]!
      const built = gd.getFlag(`${REBUILD_MENU.BUILT_FLAG_PREFIX}${opt.id}`) === true
      const label = built ? `${opt.name} [已完成]` : `${opt.name} (${opt.goldCost}G)`
      const color = built ? MENU_OVERLAY_UI.COLORS.dim : MENU_OVERLAY_UI.COLORS.text
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
          this.cursorIndex = (this.cursorIndex - 1 + REBUILD_MENU.OPTIONS.length) % REBUILD_MENU.OPTIONS.length
          this.updateCursor()
          break
        case 'ArrowDown': case 'KeyS':
          this.cursorIndex = (this.cursorIndex + 1) % REBUILD_MENU.OPTIONS.length
          this.updateCursor()
          break
        case 'Enter': case 'Space':
          this.selectItem()
          break
        case 'Escape':
          this.close()
          break
      }
    })
  }

  private updateCursor(): void {
    this.cursor.y = REBUILD_MENU.OPTION_START_Y + this.cursorIndex * REBUILD_MENU.OPTION_GAP_Y
    this.updateDescription()
  }

  private updateDescription(): void {
    const opt = REBUILD_MENU.OPTIONS[this.cursorIndex]!
    this.descText.setText(opt.desc)
  }

  private selectItem(): void {
    const gd = GameData.getInstance()
    const opt = REBUILD_MENU.OPTIONS[this.cursorIndex]!
    const builtFlag = `${REBUILD_MENU.BUILT_FLAG_PREFIX}${opt.id}`

    if (gd.getFlag(builtFlag) === true) {
      return
    }

    if (!gd.spendGold(opt.goldCost)) {
      this.descText.setText('金币不足！')
      AudioManager.getInstance().playSFX('cancel')
      return
    }
    gd.setFlag(builtFlag, true)
    RebuildSystem.getInstance().addProgress(1)
    AudioManager.getInstance().playSFX('open_menu')

    this.items[this.cursorIndex]!.setText(`${opt.name} [已完成]`)
    this.items[this.cursorIndex]!.setColor(MENU_OVERLAY_UI.COLORS.dim)
    this.goldText.setText(`${REBUILD_MENU.GOLD_COST_LABEL}: ${gd.gold}G`)

    this.descText.setText(`${opt.name} 重建完成！`)
  }

  private selectTouchItem(index: number): void {
    if (index < 0 || index >= REBUILD_MENU.OPTIONS.length) return
    this.cursorIndex = index
    this.updateCursor()
    this.selectItem()
  }

  private close(): void {
    AudioManager.getInstance().playSFX('close_menu')
    EventBus.emit(GameEvents.MENU_CLOSE)
    this.scene.stop()
  }
}
