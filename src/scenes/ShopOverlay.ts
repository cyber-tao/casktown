import Phaser from 'phaser'
import { EventBus, GameEvents } from '../core/EventBus'
import { GameData } from '../core/GameData'
import { AudioManager } from '../core/AudioManager'
import { GAME_CONFIG_DATABASE } from '../data/configDatabase'
import { queueImageAssets } from '../core/AssetLoader'
import { GAME_WIDTH, GAME_HEIGHT, COLORS, FACILITY_OVERLAY_UI, MENU_OVERLAY_UI, RUNTIME_UI_ASSET_KEYS, scaleFont } from '../utils/constants'
import { bindTouchText } from '../utils/touch'
import { cleanupKeyboardOnShutdown } from '../utils/sceneLifecycle'
import { addRuntimePanel } from '../utils/runtimePanels'

interface ShopItem {
  id: string
  price: number
}

export class ShopOverlay extends Phaser.Scene {
  private selectedIndex = 0
  private shopItems: ShopItem[] = []
  private textObjects: Phaser.GameObjects.Text[] = []
  private cursor!: Phaser.GameObjects.Rectangle
  private descText!: Phaser.GameObjects.Text
  private goldText!: Phaser.GameObjects.Text
  private messageText!: Phaser.GameObjects.Text

  constructor() {
    super({ key: 'ShopOverlay', active: false })
  }

  preload(): void {
    queueImageAssets(this, Object.values(RUNTIME_UI_ASSET_KEYS))
  }

  create(): void {
    this.selectedIndex = 0
    AudioManager.getInstance().playSFX('open_menu')

    const items = GAME_CONFIG_DATABASE.getTable('items')
    this.shopItems = Object.values(items)
      .filter(item => (item.price ?? 0) > 0)
      .map(item => ({ id: item.id, price: item.price! }))

    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.black, FACILITY_OVERLAY_UI.OVERLAY_ALPHA)
    overlay.setDepth(FACILITY_OVERLAY_UI.OVERLAY_DEPTH).setScrollFactor(0)

    addRuntimePanel(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, FACILITY_OVERLAY_UI.PANEL_WIDTH, FACILITY_OVERLAY_UI.PANEL_HEIGHT, RUNTIME_UI_ASSET_KEYS.MENU_PANEL, COLORS.uiBg, FACILITY_OVERLAY_UI.PANEL_ALPHA, FACILITY_OVERLAY_UI.PANEL_DEPTH)
    const panelBorder = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, FACILITY_OVERLAY_UI.PANEL_WIDTH, FACILITY_OVERLAY_UI.PANEL_HEIGHT, COLORS.black, 0)
    panelBorder.setStrokeStyle(FACILITY_OVERLAY_UI.BORDER_WIDTH, COLORS.uiBorder).setDepth(FACILITY_OVERLAY_UI.BORDER_DEPTH).setScrollFactor(0)

    this.add.text(FACILITY_OVERLAY_UI.TITLE_X, FACILITY_OVERLAY_UI.TITLE_Y, '商店', {
      fontSize: scaleFont(FACILITY_OVERLAY_UI.TITLE_FONT_SIZE), color: MENU_OVERLAY_UI.COLORS.title,
    }).setDepth(FACILITY_OVERLAY_UI.CONTENT_DEPTH).setScrollFactor(0)

    this.goldText = this.add.text(FACILITY_OVERLAY_UI.GOLD_X, FACILITY_OVERLAY_UI.GOLD_Y, '', {
      fontSize: scaleFont(FACILITY_OVERLAY_UI.GOLD_FONT_SIZE), color: MENU_OVERLAY_UI.COLORS.title,
    }).setDepth(FACILITY_OVERLAY_UI.CONTENT_DEPTH).setScrollFactor(0)
    this.updateGold()

    this.descText = this.add.text(FACILITY_OVERLAY_UI.DESC_X, FACILITY_OVERLAY_UI.DESC_Y, '', {
      fontSize: scaleFont(FACILITY_OVERLAY_UI.DETAIL_FONT_SIZE), color: MENU_OVERLAY_UI.COLORS.muted, wordWrap: { width: FACILITY_OVERLAY_UI.DESC_WRAP_WIDTH },
    }).setDepth(FACILITY_OVERLAY_UI.CONTENT_DEPTH).setScrollFactor(0)

    this.messageText = this.add.text(FACILITY_OVERLAY_UI.MESSAGE_X, FACILITY_OVERLAY_UI.MESSAGE_Y, '', {
      fontSize: scaleFont(FACILITY_OVERLAY_UI.MESSAGE_FONT_SIZE), color: MENU_OVERLAY_UI.COLORS.title, wordWrap: { width: FACILITY_OVERLAY_UI.MESSAGE_WRAP_WIDTH },
    }).setOrigin(0.5).setDepth(FACILITY_OVERLAY_UI.CONTENT_DEPTH).setScrollFactor(0)

    bindTouchText(this.add.text(FACILITY_OVERLAY_UI.FOOTER_X, FACILITY_OVERLAY_UI.FOOTER_Y, '↑↓ 选择 | Enter 购买 | Esc 返回', {
      fontSize: scaleFont(FACILITY_OVERLAY_UI.FOOTER_FONT_SIZE), color: MENU_OVERLAY_UI.COLORS.text,
    }).setOrigin(0.5).setDepth(FACILITY_OVERLAY_UI.CONTENT_DEPTH).setScrollFactor(0), () => this.close())

    this.renderList()
    if (this.shopItems.length > 0) this.updateDesc()
    this.setupInput()
  }

  private renderList(): void {
    for (const t of this.textObjects) t.destroy()
    this.textObjects = []
    this.cursor?.destroy()

    const gd = GameData.getInstance()
    const startY = FACILITY_OVERLAY_UI.LIST_START_Y

    for (let i = 0; i < this.shopItems.length; i++) {
      const si = this.shopItems[i]!
      const def = GAME_CONFIG_DATABASE.getTable('items')[si.id]
      const owned = gd.getItemQuantity(si.id)
      const color = i === this.selectedIndex ? MENU_OVERLAY_UI.COLORS.title : MENU_OVERLAY_UI.COLORS.text
      const rowY = startY + i * FACILITY_OVERLAY_UI.SHOP_ROW_GAP_Y
      const nameText = this.add.text(FACILITY_OVERLAY_UI.LIST_X, rowY, def?.name ?? si.id, {
        fontSize: scaleFont(FACILITY_OVERLAY_UI.BODY_FONT_SIZE), color,
      }).setDepth(FACILITY_OVERLAY_UI.CONTENT_DEPTH).setScrollFactor(0)
      const priceText = this.add.text(FACILITY_OVERLAY_UI.SHOP_PRICE_X, rowY, `${si.price}G`, {
        fontSize: scaleFont(FACILITY_OVERLAY_UI.BODY_FONT_SIZE), color,
      }).setDepth(FACILITY_OVERLAY_UI.CONTENT_DEPTH).setScrollFactor(0)
      const ownedText = this.add.text(FACILITY_OVERLAY_UI.SHOP_OWNED_X, rowY, `x${owned}`, {
        fontSize: scaleFont(FACILITY_OVERLAY_UI.BODY_FONT_SIZE), color,
      }).setDepth(FACILITY_OVERLAY_UI.CONTENT_DEPTH).setScrollFactor(0)
      bindTouchText(nameText, () => this.selectShopItem(i))
      bindTouchText(priceText, () => this.selectShopItem(i))
      bindTouchText(ownedText, () => this.selectShopItem(i))
      this.textObjects.push(nameText, priceText, ownedText)
    }

    this.cursor = this.add.rectangle(FACILITY_OVERLAY_UI.CURSOR_X, startY + this.selectedIndex * FACILITY_OVERLAY_UI.SHOP_ROW_GAP_Y + FACILITY_OVERLAY_UI.CURSOR_OFFSET_Y, FACILITY_OVERLAY_UI.CURSOR_SIZE, FACILITY_OVERLAY_UI.CURSOR_SIZE, COLORS.tpBar)
    this.cursor.setDepth(FACILITY_OVERLAY_UI.CONTENT_DEPTH).setScrollFactor(0)
  }

  private updateDesc(): void {
    const si = this.shopItems[this.selectedIndex]
    if (!si) return
    this.descText.setText(GAME_CONFIG_DATABASE.getTable('items')[si.id]?.description ?? '')
  }

  private updateGold(): void {
    this.goldText.setText(`金币: ${GameData.getInstance().gold}G`)
  }

  private setupInput(): void {
    cleanupKeyboardOnShutdown(this)
    this.input.keyboard?.on('keydown-UP', () => this.move(-1))
    this.input.keyboard?.on('keydown-DOWN', () => this.move(1))
    this.input.keyboard?.on('keydown-ENTER', () => this.buy())
    this.input.keyboard?.on('keydown-SPACE', () => this.buy())
    this.input.keyboard?.on('keydown-ESC', () => this.close())
  }

  private move(dir: number): void {
    if (this.shopItems.length === 0) return
    this.selectedIndex = (this.selectedIndex + dir + this.shopItems.length) % this.shopItems.length
    AudioManager.getInstance().playSFX('cursor')
    this.renderList()
    this.updateDesc()
    this.messageText.setText('')
  }

  private buy(): void {
    if (this.shopItems.length === 0) return
    const si = this.shopItems[this.selectedIndex]!
    const gd = GameData.getInstance()

    if (gd.gold < si.price) {
      this.messageText.setText('金币不足！')
      AudioManager.getInstance().playSFX('cancel')
      return
    }

    gd.spendGold(si.price)
    gd.addItem(si.id, 1)
    AudioManager.getInstance().playSFX('get_item')
    this.messageText.setText(`已购买 ${GAME_CONFIG_DATABASE.getTable('items')[si.id]?.name ?? si.id}`)
    this.updateGold()
    this.renderList()
  }

  private selectShopItem(index: number): void {
    if (index < 0 || index >= this.shopItems.length) return
    this.selectedIndex = index
    this.updateDesc()
    this.buy()
  }

  private close(): void {
    AudioManager.getInstance().playSFX('close_menu')
    EventBus.emit(GameEvents.MENU_CLOSE)
    this.scene.stop()
  }
}
