import Phaser from 'phaser'
import { EventBus, GameEvents } from '../core/EventBus'
import { GameData } from '../core/GameData'
import { RebuildSystem } from '../core/RebuildSystem'
import { AudioManager } from '../core/AudioManager'
import { GAME_WIDTH, GAME_HEIGHT, TOUCH_INPUT } from '../utils/constants'
import { bindTouchText } from '../utils/touch'


const REBUILD_OPTIONS = [
  { id: 'farm', name: '菜园', material: 1, desc: '恢复菠萝大叔的菜园' },
  { id: 'plaza', name: '广场', material: 2, desc: '重建盛典广场' },
  { id: 'tower', name: '木桶塔', material: 3, desc: '修复中央木桶塔' },
  { id: 'shop', name: '杂货铺', material: 1, desc: '重开杂货铺' },
  { id: 'mayor', name: '镇长家', material: 2, desc: '修缮镇长宅邸' },
  { id: 'dock', name: '码头', material: 2, desc: '修复码头设施' },
]

export class RebuildOverlay extends Phaser.Scene {
  private cursorIndex = 0
  private items: Phaser.GameObjects.Text[] = []
  private cursor!: Phaser.GameObjects.Rectangle
  private titleText!: Phaser.GameObjects.Text
  private descText!: Phaser.GameObjects.Text

  constructor() {
    super({ key: 'RebuildOverlay', active: false })
  }

  create(): void {
    AudioManager.getInstance().setScene(this)

    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7)
    overlay.setDepth(200)
    overlay.setScrollFactor(0)

    this.titleText = this.add.text(GAME_WIDTH / 2, 40, '木桶镇重建', {
      fontSize: '24px', color: '#f1c40f',
    })
    this.titleText.setOrigin(0.5)
    this.titleText.setScrollFactor(0)
    this.titleText.setDepth(201)

    const gd = GameData.getInstance()
    const matCount = gd.inventory.items['rebuild_material'] || 0

    const matText = this.add.text(GAME_WIDTH / 2, 70, `建材: ${matCount}`, {
      fontSize: '16px', color: '#ecf0f1',
    })
    matText.setOrigin(0.5)
    matText.setScrollFactor(0)
    matText.setDepth(201)

    this.cursor = this.add.rectangle(GAME_WIDTH / 2 - 160, 120, 320, 28, 0x3498db, 0.3)
    this.cursor.setOrigin(0, 0.5)
    this.cursor.setDepth(201)
    this.cursor.setScrollFactor(0)

    this.items = []
    const startY = 120
    for (let i = 0; i < REBUILD_OPTIONS.length; i++) {
      const opt = REBUILD_OPTIONS[i]!
      const built = gd.getFlag(`rebuilt_${opt.id}`) === true
      const label = built ? `${opt.name} [已完成]` : `${opt.name} (建材x${opt.material})`
      const color = built ? '#7f8c8d' : '#ecf0f1'
      const text = this.add.text(GAME_WIDTH / 2 - 140, startY + i * 36, label, {
        fontSize: '16px', color,
      })
      text.setScrollFactor(0)
      text.setDepth(201)
      bindTouchText(text, () => this.selectTouchItem(i))
      this.items.push(text)
    }

    this.descText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 80, '', {
      fontSize: '14px', color: '#bdc3c7',
    })
    this.descText.setOrigin(0.5)
    this.descText.setScrollFactor(0)
    this.descText.setDepth(201)

    bindTouchText(this.add.text(GAME_WIDTH / 2, TOUCH_INPUT.OVERLAY_BACK_Y, '返回', {
      fontSize: `${TOUCH_INPUT.OVERLAY_BACK_FONT_SIZE}px`,
      color: '#ecf0f1',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201), () => this.close())

    this.updateDescription()

    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      switch (event.code) {
        case 'ArrowUp': case 'KeyW':
          this.cursorIndex = (this.cursorIndex - 1 + REBUILD_OPTIONS.length) % REBUILD_OPTIONS.length
          this.updateCursor()
          break
        case 'ArrowDown': case 'KeyS':
          this.cursorIndex = (this.cursorIndex + 1) % REBUILD_OPTIONS.length
          this.updateCursor()
          break
        case 'Enter': case 'Space':
          this.selectItem()
          break
        case 'Escape': case 'Tab':
          this.close()
          break
      }
    })
  }

  private updateCursor(): void {
    this.cursor.y = 120 + this.cursorIndex * 36
    this.updateDescription()
  }

  private updateDescription(): void {
    const opt = REBUILD_OPTIONS[this.cursorIndex]!
    this.descText.setText(opt.desc)
  }

  private selectItem(): void {
    const gd = GameData.getInstance()
    const opt = REBUILD_OPTIONS[this.cursorIndex]!

    if (gd.getFlag(`rebuilt_${opt.id}`) === true) {
      return
    }

    const matCount = gd.inventory.items['rebuild_material'] || 0
    if (matCount < opt.material) {
      this.descText.setText('建材不足！')
      return
    }

    gd.inventory.items['rebuild_material'] = matCount - opt.material
    gd.setFlag(`rebuilt_${opt.id}`, true)
    RebuildSystem.getInstance().addProgress(1)
    AudioManager.getInstance().playSFX('open_menu')

    this.items[this.cursorIndex]!.setText(`${opt.name} [已完成]`)
    this.items[this.cursorIndex]!.setColor('#7f8c8d')

    const matText = this.titleText.scene.children.list.find(
      c => c instanceof Phaser.GameObjects.Text && c !== this.titleText && c.y === 70
    ) as Phaser.GameObjects.Text | null
    if (matText) {
      matText.setText(`建材: ${gd.inventory.items['rebuild_material'] || 0}`)
    }

    this.descText.setText(`${opt.name} 重建完成！`)
  }

  private selectTouchItem(index: number): void {
    if (index < 0 || index >= REBUILD_OPTIONS.length) return
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
