import Phaser from 'phaser'
import { EventBus, GameEvents } from '../core/EventBus'
import { GameData } from '../core/GameData'
import { AudioManager } from '../core/AudioManager'
import { GAME_CONFIG_DATABASE } from '../data/configDatabase'
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../utils/constants'
import { bindTouchText } from '../utils/touch'

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

  create(): void {
    this.selectedIndex = 0
    AudioManager.getInstance().playSFX('open_menu')

    const items = GAME_CONFIG_DATABASE.getTable('items')
    this.shopItems = Object.values(items)
      .filter(item => (item.price ?? 0) > 0)
      .map(item => ({ id: item.id, price: item.price! }))

    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.black, 0.5)
    overlay.setDepth(400).setScrollFactor(0)

    const panel = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 600, 420, COLORS.uiBg, 0.95)
    panel.setStrokeStyle(2, COLORS.uiBorder).setDepth(401).setScrollFactor(0)

    this.add.text(GAME_WIDTH / 2 - 280, GAME_HEIGHT / 2 - 195, '商店', {
      fontSize: '24px', color: COLORS.uiText,
    }).setDepth(402).setScrollFactor(0)

    this.goldText = this.add.text(GAME_WIDTH / 2 + 100, GAME_HEIGHT / 2 - 195, '', {
      fontSize: '20px', color: '#f1c40f',
    }).setDepth(402).setScrollFactor(0)
    this.updateGold()

    this.descText = this.add.text(GAME_WIDTH / 2 - 280, GAME_HEIGHT / 2 + 140, '', {
      fontSize: '14px', color: '#a0a0b0', wordWrap: { width: 540 },
    }).setDepth(402).setScrollFactor(0)

    this.messageText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 185, '', {
      fontSize: '16px', color: '#f1c40f',
    }).setOrigin(0.5).setDepth(402).setScrollFactor(0)

    bindTouchText(this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 200, '↑↓ Select | Enter Buy | Esc Back', {
      fontSize: '12px', color: '#808090',
    }).setOrigin(0.5).setDepth(402).setScrollFactor(0), () => this.close())

    this.renderList()
    if (this.shopItems.length > 0) this.updateDesc()
    this.setupInput()
  }

  private renderList(): void {
    for (const t of this.textObjects) t.destroy()
    this.textObjects = []
    this.cursor?.destroy()

    const gd = GameData.getInstance()
    const startY = GAME_HEIGHT / 2 - 145

    for (let i = 0; i < this.shopItems.length; i++) {
      const si = this.shopItems[i]!
      const def = GAME_CONFIG_DATABASE.getTable('items')[si.id]
      const owned = gd.inventory.items[si.id] || 0
      const color = i === this.selectedIndex ? '#f1c40f' : COLORS.uiText
      const label = `${(def?.name ?? si.id).padEnd(10)}  ${si.price}G  x${owned}`
      const t = this.add.text(GAME_WIDTH / 2 - 260, startY + i * 28, label, {
        fontSize: '18px', color,
      }).setDepth(402).setScrollFactor(0)
      bindTouchText(t, () => this.selectShopItem(i))
      this.textObjects.push(t)
    }

    this.cursor = this.add.rectangle(GAME_WIDTH / 2 - 275, startY + this.selectedIndex * 28 + 9, 8, 8, COLORS.tpBar)
    this.cursor.setDepth(403).setScrollFactor(0)
  }

  private updateDesc(): void {
    const si = this.shopItems[this.selectedIndex]
    if (!si) return
    this.descText.setText(GAME_CONFIG_DATABASE.getTable('items')[si.id]?.description ?? '')
  }

  private updateGold(): void {
    this.goldText.setText(`Gold: ${GameData.getInstance().gold}G`)
  }

  private setupInput(): void {
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
      this.messageText.setText('Gold not enough!')
      AudioManager.getInstance().playSFX('cancel')
      return
    }

    gd.spendGold(si.price)
    gd.addItem(si.id, 1)
    AudioManager.getInstance().playSFX('get_item')
    this.messageText.setText(`Bought ${GAME_CONFIG_DATABASE.getTable('items')[si.id]?.name ?? si.id}!`)
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
