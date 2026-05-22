import Phaser from 'phaser'
import { EventBus, GameEvents } from '../core/EventBus'
import { GameData } from '../core/GameData'
import { AudioManager } from '../core/AudioManager'
import { GAME_CONFIG_DATABASE } from '../data/configDatabase'
import { GAME_WIDTH, GAME_HEIGHT, TOUCH_INPUT, scaleFont, scalePx } from '../utils/constants'
import { bindTouchText } from '../utils/touch'
import { cleanupKeyboardOnShutdown } from '../utils/sceneLifecycle'

type CodexTab = 'monsters' | 'items' | 'story'

const STORY_BRANCH_COUNT = 10

export class CodexOverlay extends Phaser.Scene {
  private tab: CodexTab = 'monsters'
  private cursorIndex = 0
  private listItems: Phaser.GameObjects.Text[] = []
  private cursor!: Phaser.GameObjects.Rectangle
  private detailText!: Phaser.GameObjects.Text
  private tabs: Phaser.GameObjects.Text[] = []
  private discoveredEnemies: string[] = []
  private discoveredItems: string[] = []

  constructor() {
    super({ key: 'CodexOverlay', active: false })
  }

  create(): void {
    AudioManager.getInstance().setScene(this)
    this.cursorIndex = 0
    this.listItems = []
    const gd = GameData.getInstance()
    const enemies = GAME_CONFIG_DATABASE.getTable('enemies')
    const items = GAME_CONFIG_DATABASE.getTable('items')

    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.8)
    overlay.setDepth(200)
    overlay.setScrollFactor(0)

    // Title
    const title = this.add.text(GAME_WIDTH / 2, scalePx(20), '预言之书 · 图鉴', {
      fontSize: scaleFont(20), color: '#f1c40f',
    })
    title.setOrigin(0.5, 0)
    title.setScrollFactor(0)
    title.setDepth(201)

    // Tabs
    const tabNames: { key: CodexTab; label: string }[] = [
      { key: 'monsters', label: '怪物' },
      { key: 'items', label: '物品' },
      { key: 'story', label: '故事' },
    ]
    this.tabs = []
    for (let i = 0; i < tabNames.length; i++) {
      const t = tabNames[i]!
      const color = t.key === this.tab ? '#f1c40f' : '#95a5a6'
      const tab = this.add.text(scalePx(160 + i * 200), scalePx(50), t.label, {
        fontSize: scaleFont(16), color,
      })
      tab.setOrigin(0.5)
      tab.setScrollFactor(0)
      tab.setDepth(201)
      bindTouchText(tab, () => this.selectTab(t.key))
      this.tabs.push(tab)
    }

    bindTouchText(this.add.text(GAME_WIDTH / 2, TOUCH_INPUT.OVERLAY_BACK_Y, '返回', {
      fontSize: `${TOUCH_INPUT.OVERLAY_BACK_FONT_SIZE}px`,
      color: '#ecf0f1',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201), () => this.close())

    // Collect discovered content
    this.discoveredEnemies = Object.keys(enemies).filter(id => {
      return gd.getFlag(`discovered_${id}`) === true || gd.getFlag(`defeated_${id}`) === true
    })
    // Always show bosses that have been encountered
    const bossEncounters: Record<string, string> = {
      barrel_fake: 'barrel_fake', baihu: 'baihu', shui_yao: 'shui_yao', feng_chi: 'feng_chi',
      fenghuang: 'fenghuang', qilin: 'qilin', chi: 'chi', mei: 'mei', wang: 'wang', liang: 'liang',
      fake_xiaoai: 'fake_xiaoai', xiaoai_true: 'xiaoai_true', wuxiang: 'wuxiang',
    }
    for (const [id, flag] of Object.entries(bossEncounters)) {
      if (enemies[id] && !this.discoveredEnemies.includes(id) && gd.getFlag(`defeated_${flag}`) === true) {
        this.discoveredEnemies.push(id)
      }
    }

    this.discoveredItems = Object.keys(items).filter(id => {
      const count = gd.getItemQuantity(id)
      return count > 0 || gd.getFlag(`found_${id}`) === true
    })

    // List area (left)
    this.cursor = this.add.rectangle(scalePx(140), scalePx(85), scalePx(260), scalePx(22), 0x3498db, 0.3)
    this.cursor.setOrigin(0, 0)
    this.cursor.setDepth(201)
    this.cursor.setScrollFactor(0)

    // Detail area (right)
    this.detailText = this.add.text(scalePx(430), scalePx(80), '', {
      fontSize: scaleFont(13), color: '#ecf0f1', wordWrap: { width: scalePx(480) },
    })
    this.detailText.setScrollFactor(0)
    this.detailText.setDepth(201)

    this.renderList()

    cleanupKeyboardOnShutdown(this)
    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      switch (event.code) {
        case 'ArrowUp': case 'KeyW':
          this.cursorIndex = Math.max(0, this.cursorIndex - 1)
          this.updateCursor()
          break
        case 'ArrowDown': case 'KeyS':
          this.cursorIndex = Math.min(this.getListCount() - 1, this.cursorIndex + 1)
          this.updateCursor()
          break
        case 'ArrowLeft': case 'KeyA':
          this.tab = tabNames[(tabNames.findIndex(t => t.key === this.tab) - 1 + tabNames.length) % tabNames.length]!.key
          this.cursorIndex = 0
          this.updateTabs()
          this.renderList()
          break
        case 'ArrowRight': case 'KeyD':
          this.tab = tabNames[(tabNames.findIndex(t => t.key === this.tab) + 1) % tabNames.length]!.key
          this.cursorIndex = 0
          this.updateTabs()
          this.renderList()
          break
        case 'Escape':
          this.close()
          break
      }
    })
  }

  private getListCount(): number {
    if (this.tab === 'monsters') return Math.max(1, this.discoveredEnemies.length)
    if (this.tab === 'items') return Math.max(1, this.discoveredItems.length)
    return STORY_BRANCH_COUNT + GAME_CONFIG_DATABASE.getTable('prophecies').length
  }

  private updateTabs(): void {
    const tabKeys: CodexTab[] = ['monsters', 'items', 'story']
    for (let i = 0; i < this.tabs.length; i++) {
      const color = tabKeys[i] === this.tab ? '#f1c40f' : '#95a5a6'
      this.tabs[i]!.setColor(color)
    }
  }

  private selectTab(tab: CodexTab): void {
    this.tab = tab
    this.cursorIndex = 0
    this.updateTabs()
    this.renderList()
  }

  private selectListItem(index: number): void {
    if (index < 0 || index >= this.getListCount()) return
    this.cursorIndex = index
    this.updateCursor()
  }

  private renderList(): void {
    for (const item of this.listItems) item.destroy()
    this.listItems = []
    const enemies = GAME_CONFIG_DATABASE.getTable('enemies')
    const items = GAME_CONFIG_DATABASE.getTable('items')
    const prophecies = GAME_CONFIG_DATABASE.getTable('prophecies')

    if (this.tab === 'monsters') {
      if (this.discoveredEnemies.length === 0) {
        const t = this.add.text(scalePx(150), scalePx(90), '尚未发现任何怪物', { fontSize: scaleFont(14), color: '#7f8c8d' })
        t.setScrollFactor(0).setDepth(201)
        this.listItems.push(t)
      }
      for (let i = 0; i < this.discoveredEnemies.length; i++) {
        const ed = enemies[this.discoveredEnemies[i]!]
        if (!ed) continue
        const t = this.add.text(scalePx(150), scalePx(90 + i * 26), `${ed.isBoss ? '★' : '·'} ${ed.name}`, {
          fontSize: scaleFont(14), color: ed.isBoss ? '#e74c3c' : '#ecf0f1',
        })
        t.setScrollFactor(0).setDepth(201)
        bindTouchText(t, () => this.selectListItem(i))
        this.listItems.push(t)
      }
    } else if (this.tab === 'items') {
      if (this.discoveredItems.length === 0) {
        const t = this.add.text(scalePx(150), scalePx(90), '尚未获得任何物品', { fontSize: scaleFont(14), color: '#7f8c8d' })
        t.setScrollFactor(0).setDepth(201)
        this.listItems.push(t)
      }
      for (let i = 0; i < this.discoveredItems.length; i++) {
        const item = items[this.discoveredItems[i]!]
        if (!item) continue
        const count = GameData.getInstance().getItemQuantity(item.id)
        const t = this.add.text(scalePx(150), scalePx(90 + i * 26), `${item.name} x${count}`, {
          fontSize: scaleFont(14), color: '#ecf0f1',
        })
        t.setScrollFactor(0).setDepth(201)
        bindTouchText(t, () => this.selectListItem(i))
        this.listItems.push(t)
      }
    } else {
      const gd = GameData.getInstance()
      const storyEntries = [
        `信任-慧慧: ${gd.branches.trust_huihui}`,
        `信任-A: ${gd.branches.trust_a}`,
        `信任-葱葱: ${gd.branches.trust_congcong}`,
        `信任-sun: ${gd.branches.trust_sun}`,
        `慈悲值: ${gd.branches.mercy_score}`,
        `重建等级: ${gd.branches.rebuild_level}`,
        `记忆碎片: ${gd.branches.xiaoai_memory_fragments}`,
        `白虎尊重: ${gd.branches.white_tiger_respected ? '是' : '否'}`,
        `四封印解放: ${gd.branches.released_four_seals ? '是' : '否'}`,
        `xiaoai净化: ${gd.branches.xiaoai_purified ? '是' : '否'}`,
      ]
      for (let i = 0; i < storyEntries.length; i++) {
        const t = this.add.text(scalePx(150), scalePx(90 + i * 26), storyEntries[i]!, {
          fontSize: scaleFont(14), color: '#ecf0f1',
        })
        t.setScrollFactor(0).setDepth(201)
        bindTouchText(t, () => this.selectListItem(i))
        this.listItems.push(t)
      }
      for (let i = 0; i < prophecies.length; i++) {
        const prophecy = prophecies[i]!
        const conditionValue = prophecy.condition ? gd.getFlag(prophecy.condition) : true
        const conditionMet = !prophecy.condition || conditionValue === true || (typeof conditionValue === 'number' && conditionValue > 0)
        const label = conditionMet ? `📖 ${prophecy.chapter}` : `??? ${prophecy.chapter}`
        const color = conditionMet ? '#f39c12' : '#5a5a5a'
        const t = this.add.text(scalePx(150), scalePx(90 + (STORY_BRANCH_COUNT + i) * 26), label, {
          fontSize: scaleFont(14), color,
        })
        t.setScrollFactor(0).setDepth(201)
        bindTouchText(t, () => this.selectListItem(STORY_BRANCH_COUNT + i))
        this.listItems.push(t)
      }
    }

    this.updateCursor()
  }

  private updateCursor(): void {
    this.cursor.y = scalePx(85 + this.cursorIndex * 26)
    this.updateDetail()
  }

  private updateDetail(): void {
    const enemies = GAME_CONFIG_DATABASE.getTable('enemies')
    const items = GAME_CONFIG_DATABASE.getTable('items')
    const prophecies = GAME_CONFIG_DATABASE.getTable('prophecies')
    if (this.tab === 'monsters' && this.discoveredEnemies.length > 0) {
      const ed = enemies[this.discoveredEnemies[this.cursorIndex]!]
      if (ed) {
        this.detailText.setText([
          `【${ed.name}】${ed.isBoss ? ' (BOSS)' : ''}`,
          ``,
          `HP: ${ed.stats.maxHp}  MP: ${ed.stats.maxMp}`,
          `攻击: ${ed.stats.atk}  防御: ${ed.stats.def}`,
          `速度: ${ed.stats.speed}  经验: ${ed.exp}`,
          `属性: ${ed.element}`,
          `弱点: ${ed.weakness.join(', ') || '无'}`,
          `抗性: ${ed.resistance.join(', ') || '无'}`,
          ``,
          `技能: ${ed.skills.join(', ')}`,
        ].join('\n'))
      }
    } else if (this.tab === 'items' && this.discoveredItems.length > 0) {
      const item = items[this.discoveredItems[this.cursorIndex]!]
      if (item) {
        this.detailText.setText([
          `【${item.name}】`,
          `类型: ${item.type}`,
          `价格: ${item.price || '-'}`,
          ``,
          item.description,
          ``,
          `效果: ${item.effect}`,
        ].join('\n'))
      }
    } else if (this.tab === 'story') {
      if (this.cursorIndex < STORY_BRANCH_COUNT) {
        this.detailText.setText([
          '故事分支记录',
          '',
          '此处记录你在旅途中所做的选择。',
          '不同的选择会影响结局走向。',
        ].join('\n'))
      } else {
        const prophecyIndex = this.cursorIndex - STORY_BRANCH_COUNT
        const prophecy = prophecies[prophecyIndex]
        if (!prophecy) {
          this.detailText.setText('')
          return
        }
        const gd = GameData.getInstance()
        const conditionMet = !prophecy.condition || gd.getFlag(prophecy.condition) === true || gd.hasFlag(prophecy.condition)
        if (!conditionMet) {
          this.detailText.setText([
            prophecy.chapter,
            '',
            '???',
            '',
            '尚未满足揭示条件。',
          ].join('\n'))
          return
        }
        const hintMode = gd.settings.prophecyHint
        let hintText: string
        if (hintMode === 'poem') {
          hintText = '（仅显示预言）'
        } else if (hintMode === 'clear') {
          hintText = prophecy.explicit
        } else {
          hintText = prophecy.hint
        }
        this.detailText.setText([
          `【${prophecy.chapter}】`,
          '',
          prophecy.verse,
          '',
          `提示：${hintText}`,
        ].join('\n'))
      }
    } else {
      this.detailText.setText('')
    }
  }

  private close(): void {
    AudioManager.getInstance().playSFX('close_menu')
    EventBus.emit(GameEvents.MENU_CLOSE)
    this.scene.stop()
  }
}
