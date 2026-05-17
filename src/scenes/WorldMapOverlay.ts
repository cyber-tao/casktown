import Phaser from 'phaser'
import { EventBus, GameEvents } from '../core/EventBus'
import { GameData } from '../core/GameData'
import { AudioManager } from '../core/AudioManager'
import { GAME_WIDTH, GAME_HEIGHT } from '../utils/constants'

interface MapNode {
  id: string
  name: string
  x: number
  y: number
  requires: string[]
}

const MAP_NODES: MapNode[] = [
  { id: 'MAP_001', name: '木桶镇', x: 200, y: 280, requires: [] },
  { id: 'MAP_002', name: '木桶镇·广场', x: 240, y: 240, requires: ['festival_started'] },
  { id: 'MAP_010', name: '奇妙森林入口', x: 360, y: 220, requires: [] },
  { id: 'MAP_011', name: '奇妙森林围湖', x: 440, y: 180, requires: [] },
  { id: 'MAP_012', name: '千年树种祭台', x: 520, y: 160, requires: [] },
  { id: 'MAP_020', name: '码头航路', x: 200, y: 160, requires: [] },
  { id: 'MAP_030', name: '圣水殿外路', x: 120, y: 100, requires: ['has_sacred_water'] },
  { id: 'MAP_031', name: '圣水殿大厅', x: 80, y: 60, requires: ['has_sacred_water'] },
  { id: 'MAP_040', name: '神殿山路', x: 600, y: 120, requires: [] },
  { id: 'MAP_041', name: '七色路', x: 660, y: 80, requires: [] },
  { id: 'MAP_042', name: '神殿', x: 720, y: 50, requires: [] },
  { id: 'MAP_050', name: '生命之泉入口', x: 480, y: 340, requires: [] },
  { id: 'MAP_051', name: '青龙潭', x: 420, y: 380, requires: ['has_millennium_seed'] },
  { id: 'MAP_052', name: '白虎穴', x: 480, y: 400, requires: ['has_sacred_water'] },
  { id: 'MAP_053', name: '朱雀林', x: 540, y: 380, requires: ['has_divine_laurel'] },
  { id: 'MAP_054', name: '玄武殿', x: 600, y: 400, requires: ['defeated_chi_mei_wang'] },
  { id: 'MAP_055', name: '轮回道', x: 560, y: 440, requires: ['released_four_seals'] },
  { id: 'MAP_060', name: '魔宫入口', x: 720, y: 300, requires: [] },
  { id: 'MAP_061', name: '黑暗沼泽', x: 760, y: 340, requires: ['defeated_fake_xiaoai'] },
  { id: 'MAP_063', name: '地下魔宫', x: 800, y: 380, requires: ['defeated_fake_xiaoai'] },
  { id: 'MAP_070', name: '人心之渊', x: 400, y: 480, requires: ['xiaoai_purified'] },
]

export class WorldMapOverlay extends Phaser.Scene {
  private cursorIndex = 0
  private nodes: { circle: Phaser.GameObjects.Arc; text: Phaser.GameObjects.Text; data: MapNode; unlocked: boolean }[] = []
  private cursorRing!: Phaser.GameObjects.Arc
  private nameText!: Phaser.GameObjects.Text

  constructor() {
    super({ key: 'WorldMapOverlay', active: false })
  }

  create(): void {
    AudioManager.getInstance().setScene(this)
    const gd = GameData.getInstance()

    const bg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1a1a2e, 0.95)
    bg.setDepth(200).setScrollFactor(0)

    const title = this.add.text(GAME_WIDTH / 2, 16, '世界地图 · 快速旅行', {
      fontSize: '18px', color: '#f1c40f',
    })
    title.setOrigin(0.5, 0).setScrollFactor(0).setDepth(201)

    this.nameText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 30, '', {
      fontSize: '14px', color: '#ecf0f1',
    })
    this.nameText.setOrigin(0.5).setScrollFactor(0).setDepth(201)

    const hint = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 55, '↑↓ 选择 | Enter 旅行 | Esc 返回', {
      fontSize: '12px', color: '#7f8c8d',
    })
    hint.setOrigin(0.5).setScrollFactor(0).setDepth(201)

    // Draw connections
    const connections: [string, string][] = [
      ['MAP_001', 'MAP_010'], ['MAP_001', 'MAP_020'], ['MAP_001', 'MAP_050'],
      ['MAP_010', 'MAP_011'], ['MAP_011', 'MAP_012'],
      ['MAP_020', 'MAP_030'], ['MAP_030', 'MAP_031'],
      ['MAP_001', 'MAP_040'], ['MAP_040', 'MAP_041'], ['MAP_041', 'MAP_042'],
      ['MAP_050', 'MAP_051'], ['MAP_051', 'MAP_052'], ['MAP_052', 'MAP_053'],
      ['MAP_053', 'MAP_054'], ['MAP_054', 'MAP_055'],
      ['MAP_001', 'MAP_060'], ['MAP_060', 'MAP_061'], ['MAP_061', 'MAP_063'],
      ['MAP_001', 'MAP_070'],
    ]
    const nodeMap = new Map(MAP_NODES.map(n => [n.id, n]))
    for (const [fromId, toId] of connections) {
      const from = nodeMap.get(fromId)
      const to = nodeMap.get(toId)
      if (from && to) {
        const line = this.add.graphics()
        line.lineStyle(1, 0x34495e, 0.5)
        line.lineBetween(from.x, from.y, to.x, to.y)
        line.setDepth(200).setScrollFactor(0)
      }
    }

    // Draw nodes
    this.nodes = []
    this.cursorIndex = 0
    for (let i = 0; i < MAP_NODES.length; i++) {
      const n = MAP_NODES[i]!
      const unlocked = n.requires.length === 0 || n.requires.some(r => gd.getFlag(r) === true)
      const color = unlocked ? (n.id === gd.currentMap ? 0x2ecc71 : 0x3498db) : 0x7f8c8d
      const radius = unlocked ? 8 : 6

      const circle = this.add.circle(n.x, n.y, radius, color)
      circle.setDepth(201).setScrollFactor(0)
      if (!unlocked) circle.setAlpha(0.4)

      const text = this.add.text(n.x, n.y + 12, n.name, {
        fontSize: '10px', color: unlocked ? '#bdc3c7' : '#555555',
      })
      text.setOrigin(0.5).setScrollFactor(0).setDepth(201)

      this.nodes.push({ circle, text, data: n, unlocked })
      if (n.id === gd.currentMap) this.cursorIndex = i
    }

    // Cursor ring
    const cn = this.nodes[this.cursorIndex]!
    this.cursorRing = this.add.circle(cn.data.x, cn.data.y, 14)
    this.cursorRing.setStrokeStyle(2, 0xf1c40f)
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

  private travel(): void {
    const n = this.nodes[this.cursorIndex]!
    if (!n.unlocked) return
    const gd = GameData.getInstance()
    if (n.data.id === gd.currentMap) return

    AudioManager.getInstance().playSFX('warp')
    gd.currentMap = n.data.id
    gd.playerPosition = { x: 10, y: 10 }

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
