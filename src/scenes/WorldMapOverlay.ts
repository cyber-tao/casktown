import Phaser from 'phaser'
import { EventBus, GameEvents } from '../core/EventBus'
import { GameData } from '../core/GameData'
import { AudioManager } from '../core/AudioManager'
import { queueImageAsset } from '../core/AssetLoader'
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  WORLD_MAP_BACKGROUND_DISPLAY_WIDTH,
  WORLD_MAP_BACKGROUND_LAYOUT,
  WORLD_MAP_CONNECTION_LAYOUTS,
  WORLD_MAP_NODE_LAYOUTS,
  WORLD_MAP_TOUCH_TARGET_ALPHA,
  WORLD_MAP_TOUCH_TARGET_RADIUS,
  WORLD_MAP_UI,
} from '../utils/constants'
import { bindTouchText } from '../utils/touch'

interface MapNode {
  id: string
  name: string
  x: number
  y: number
  requires: string[]
  spawn: { x: number; y: number }
}

const MAP_NODES: MapNode[] = WORLD_MAP_NODE_LAYOUTS.map(node => ({
  ...node,
  requires: [...node.requires],
  spawn: { ...node.spawn },
}))

export class WorldMapOverlay extends Phaser.Scene {
  private cursorIndex = 0
  private nodes: { circle: Phaser.GameObjects.Arc; text: Phaser.GameObjects.Text; data: MapNode; unlocked: boolean }[] = []
  private cursorRing!: Phaser.GameObjects.Arc
  private nameText!: Phaser.GameObjects.Text

  constructor() {
    super({ key: 'WorldMapOverlay', active: false })
  }

  preload(): void {
    queueImageAsset(this, WORLD_MAP_BACKGROUND_LAYOUT.KEY)
  }

  create(): void {
    AudioManager.getInstance().setScene(this)
    const gd = GameData.getInstance()

    const bg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, WORLD_MAP_BACKGROUND_LAYOUT.BACKDROP_COLOR, WORLD_MAP_BACKGROUND_LAYOUT.BACKDROP_ALPHA)
    bg.setDepth(WORLD_MAP_BACKGROUND_LAYOUT.BACKDROP_DEPTH).setScrollFactor(0)

    const mapBackground = this.add.image(WORLD_MAP_BACKGROUND_LAYOUT.X, WORLD_MAP_BACKGROUND_LAYOUT.Y, WORLD_MAP_BACKGROUND_LAYOUT.KEY)
    mapBackground.setDisplaySize(WORLD_MAP_BACKGROUND_DISPLAY_WIDTH, WORLD_MAP_BACKGROUND_LAYOUT.DISPLAY_HEIGHT)
    mapBackground.setDepth(WORLD_MAP_BACKGROUND_LAYOUT.MAP_DEPTH).setScrollFactor(0)

    const title = this.add.text(GAME_WIDTH / 2, WORLD_MAP_UI.TITLE_Y, '世界地图 · 快速旅行', {
      fontSize: `${WORLD_MAP_UI.TITLE_FONT_SIZE}px`, color: '#f1c40f',
    })
    title.setOrigin(0.5, 0).setScrollFactor(0).setDepth(201)

    this.nameText = this.add.text(GAME_WIDTH / 2, WORLD_MAP_UI.NAME_Y, '', {
      fontSize: `${WORLD_MAP_UI.NAME_FONT_SIZE}px`, color: '#ecf0f1',
    })
    this.nameText.setOrigin(0.5).setScrollFactor(0).setDepth(201)

    const hint = this.add.text(GAME_WIDTH / 2, WORLD_MAP_UI.HINT_Y, '↑↓ 选择 | Enter 旅行 | Esc 返回', {
      fontSize: `${WORLD_MAP_UI.HINT_FONT_SIZE}px`, color: '#7f8c8d',
    })
    hint.setOrigin(0.5).setScrollFactor(0).setDepth(201)
    bindTouchText(hint, () => this.close())

    const nodeMap = new Map(MAP_NODES.map(n => [n.id, n]))
    for (const [fromId, toId] of WORLD_MAP_CONNECTION_LAYOUTS) {
      const from = nodeMap.get(fromId)
      const to = nodeMap.get(toId)
      if (from && to) {
        const line = this.add.graphics()
        line.lineStyle(WORLD_MAP_UI.CONNECTION_WIDTH, 0x34495e, 0.5)
        line.lineBetween(from.x, from.y, to.x, to.y)
        line.setDepth(200).setScrollFactor(0)
      }
    }

    // Draw nodes
    this.nodes = []
    this.cursorIndex = 0
    for (let i = 0; i < MAP_NODES.length; i++) {
      const n = MAP_NODES[i]!
      const unlocked = n.requires.length === 0 || n.requires.every(r => gd.getFlag(r) === true)
      const color = unlocked ? (n.id === gd.currentMap ? 0x2ecc71 : 0x3498db) : 0x7f8c8d
      const radius = unlocked ? WORLD_MAP_UI.NODE_UNLOCKED_RADIUS : WORLD_MAP_UI.NODE_LOCKED_RADIUS

      const circle = this.add.circle(n.x, n.y, radius, color)
      circle.setDepth(201).setScrollFactor(0)
      if (!unlocked) circle.setAlpha(0.4)
      const touchTarget = this.add.circle(n.x, n.y, WORLD_MAP_TOUCH_TARGET_RADIUS, 0x000000, WORLD_MAP_TOUCH_TARGET_ALPHA)
      touchTarget.setDepth(203).setScrollFactor(0).setInteractive()
      touchTarget.on(Phaser.Input.Events.POINTER_DOWN, () => this.selectNode(i))

      const text = this.add.text(n.x, n.y + WORLD_MAP_UI.NODE_LABEL_OFFSET_Y, n.name, {
        fontSize: `${WORLD_MAP_UI.NODE_LABEL_FONT_SIZE}px`, color: unlocked ? '#bdc3c7' : '#555555',
      })
      text.setOrigin(0.5).setScrollFactor(0).setDepth(201)
      bindTouchText(text, () => this.selectNode(i))

      this.nodes.push({ circle, text, data: n, unlocked })
      if (n.id === gd.currentMap) this.cursorIndex = i
    }

    // Cursor ring
    const cn = this.nodes[this.cursorIndex]!
    this.cursorRing = this.add.circle(cn.data.x, cn.data.y, WORLD_MAP_UI.CURSOR_RING_RADIUS)
    this.cursorRing.setStrokeStyle(WORLD_MAP_UI.CURSOR_RING_WIDTH, 0xf1c40f)
    this.cursorRing.setFillStyle(0x000000, 0)
    this.cursorRing.setDepth(202).setScrollFactor(0)

    this.updateName()

    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      switch (event.code) {
        case 'ArrowUp': case 'KeyW':
          this.cursorIndex = (this.cursorIndex - 1 + this.nodes.length) % this.nodes.length
          this.updateCursor()
          break
        case 'ArrowDown': case 'KeyS':
          this.cursorIndex = (this.cursorIndex + 1) % this.nodes.length
          this.updateCursor()
          break
        case 'ArrowLeft': case 'KeyA':
          this.cursorIndex = (this.cursorIndex - 1 + this.nodes.length) % this.nodes.length
          this.updateCursor()
          break
        case 'ArrowRight': case 'KeyD':
          this.cursorIndex = (this.cursorIndex + 1) % this.nodes.length
          this.updateCursor()
          break
        case 'Enter': case 'Space':
          this.travel()
          break
        case 'Escape': case 'Tab':
          this.close()
          break
      }
    })
  }

  private updateCursor(): void {
    const n = this.nodes[this.cursorIndex]!
    this.cursorRing.setPosition(n.data.x, n.data.y)
    this.updateName()
  }

  private updateName(): void {
    const n = this.nodes[this.cursorIndex]!
    const status = n.unlocked ? (n.data.id === GameData.getInstance().currentMap ? ' [当前位置]' : ' [可前往]') : ' [未解锁]'
    this.nameText.setText(`${n.data.name}${status}`)
  }

  private selectNode(index: number): void {
    if (index < 0 || index >= this.nodes.length) return
    this.cursorIndex = index
    this.updateCursor()
    this.travel()
  }

  private travel(): void {
    const n = this.nodes[this.cursorIndex]!
    if (!n.unlocked) return
    const gd = GameData.getInstance()
    if (n.data.id === gd.currentMap) return

    AudioManager.getInstance().playSFX('warp')
    gd.currentMap = n.data.id
    gd.playerPosition = { ...n.data.spawn }

    this.scene.stop('WorldMapOverlay')
    this.scene.stop('MapScene')
    this.scene.start('MapScene', { mapId: n.data.id })
  }

  private close(): void {
    AudioManager.getInstance().playSFX('close_menu')
    EventBus.emit(GameEvents.MENU_CLOSE)
    this.scene.stop()
  }
}
