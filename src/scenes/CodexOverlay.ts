import Phaser from 'phaser'
import { EventBus, GameEvents } from '../core/EventBus'
import { GameData } from '../core/GameData'
import { AudioManager } from '../core/AudioManager'
import { InputManager } from '../core/InputManager'
import { isProphecyConditionMet } from '../core/ProphecyConditions'
import { GAME_CONFIG_DATABASE } from '../data/configDatabase'
import { queueImageAssets } from '../core/AssetLoader'
import {
  CODEX_OVERLAY_UI,
  CODEX_STORY_BRANCH_COUNT,
  CODEX_TAB_DEFS,
  COLORS,
  GAME_HEIGHT,
  GAME_WIDTH,
  MENU_OVERLAY_UI,
  RUNTIME_UI_ASSET_KEYS,
  UI_FONT_FAMILY,
  UI_TITLE_FONT_FAMILY,
  scaleFont,
} from '../utils/constants'
import { bindTouchText } from '../utils/touch'
import { cleanupKeyboardOnShutdown } from '../utils/sceneLifecycle'
import { addRuntimePanel } from '../utils/runtimePanels'
import { GamepadNavigationController, type GamepadNavigationAction } from '../utils/gamepadNavigation'

type CodexTab = 'monsters' | 'items' | 'story'

export class CodexOverlay extends Phaser.Scene {
  private tab: CodexTab = 'monsters'
  private cursorIndex = 0
  private listTopIndex = 0
  private listItems: Phaser.GameObjects.Text[] = []
  private cursor!: Phaser.GameObjects.Rectangle
  private detailText!: Phaser.GameObjects.Text
  private tabs: Phaser.GameObjects.Text[] = []
  private discoveredEnemies: string[] = []
  private discoveredItems: string[] = []
  private gamepadNavigation = new GamepadNavigationController()

  constructor() {
    super({ key: 'CodexOverlay', active: false })
  }

  preload(): void {
    queueImageAssets(this, Object.values(RUNTIME_UI_ASSET_KEYS))
  }

  create(): void {
    AudioManager.getInstance().setScene(this)
    this.cursorIndex = 0
    this.listTopIndex = 0
    this.listItems = []
    this.gamepadNavigation.reset()
    const gd = GameData.getInstance()
    const enemies = GAME_CONFIG_DATABASE.getTable('enemies')
    const items = GAME_CONFIG_DATABASE.getTable('items')

    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.black, CODEX_OVERLAY_UI.OVERLAY_ALPHA)
    overlay.setDepth(CODEX_OVERLAY_UI.OVERLAY_DEPTH)
    overlay.setScrollFactor(0)

    addRuntimePanel(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, CODEX_OVERLAY_UI.PANEL_WIDTH, CODEX_OVERLAY_UI.PANEL_HEIGHT, RUNTIME_UI_ASSET_KEYS.MENU_PANEL, COLORS.uiBg, CODEX_OVERLAY_UI.PANEL_ALPHA, CODEX_OVERLAY_UI.PANEL_DEPTH)
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, CODEX_OVERLAY_UI.PANEL_WIDTH, CODEX_OVERLAY_UI.PANEL_HEIGHT, COLORS.black, 0)
      .setStrokeStyle(CODEX_OVERLAY_UI.BORDER_WIDTH, COLORS.uiBorder)
      .setDepth(CODEX_OVERLAY_UI.BORDER_DEPTH)
      .setScrollFactor(0)

    const title = this.add.text(CODEX_OVERLAY_UI.TITLE_X, CODEX_OVERLAY_UI.TITLE_Y, '预言之书 · 图鉴', {
      fontSize: scaleFont(CODEX_OVERLAY_UI.TITLE_FONT_SIZE),
      color: MENU_OVERLAY_UI.COLORS.title,
      fontFamily: UI_TITLE_FONT_FAMILY,
    })
    title.setOrigin(0.5)
    title.setScrollFactor(0)
    title.setDepth(CODEX_OVERLAY_UI.CONTENT_DEPTH)

    this.tabs = []
    for (let i = 0; i < CODEX_TAB_DEFS.length; i++) {
      const t = CODEX_TAB_DEFS[i]!
      const color = t.key === this.tab ? MENU_OVERLAY_UI.COLORS.title : MENU_OVERLAY_UI.COLORS.muted
      const tab = this.add.text(CODEX_OVERLAY_UI.TAB_START_X + i * CODEX_OVERLAY_UI.TAB_GAP_X, CODEX_OVERLAY_UI.TAB_Y, t.label, {
        fontSize: scaleFont(CODEX_OVERLAY_UI.TAB_FONT_SIZE),
        color,
        fontFamily: UI_FONT_FAMILY,
      })
      tab.setOrigin(0.5)
      tab.setScrollFactor(0)
      tab.setDepth(CODEX_OVERLAY_UI.CONTENT_DEPTH)
      bindTouchText(tab, () => this.selectTab(t.key))
      this.tabs.push(tab)
    }

    bindTouchText(this.add.text(CODEX_OVERLAY_UI.BACK_X, CODEX_OVERLAY_UI.BACK_Y, '返回', {
      fontSize: scaleFont(CODEX_OVERLAY_UI.BACK_FONT_SIZE),
      color: MENU_OVERLAY_UI.COLORS.text,
      fontFamily: UI_FONT_FAMILY,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(CODEX_OVERLAY_UI.CONTENT_DEPTH), () => this.close())

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

    this.cursor = this.add.rectangle(CODEX_OVERLAY_UI.CURSOR_X, CODEX_OVERLAY_UI.LIST_START_Y, CODEX_OVERLAY_UI.CURSOR_WIDTH, CODEX_OVERLAY_UI.CURSOR_HEIGHT, COLORS.tpBar, CODEX_OVERLAY_UI.CURSOR_ALPHA)
    this.cursor.setOrigin(0, 0)
    this.cursor.setDepth(CODEX_OVERLAY_UI.CONTENT_DEPTH)
    this.cursor.setScrollFactor(0)

    this.detailText = this.add.text(CODEX_OVERLAY_UI.DETAIL_X, CODEX_OVERLAY_UI.DETAIL_Y, '', {
      fontSize: scaleFont(CODEX_OVERLAY_UI.DETAIL_FONT_SIZE),
      color: MENU_OVERLAY_UI.COLORS.text,
      fontFamily: UI_FONT_FAMILY,
      wordWrap: { width: CODEX_OVERLAY_UI.DETAIL_WRAP_WIDTH },
    })
    this.detailText.setScrollFactor(0)
    this.detailText.setDepth(CODEX_OVERLAY_UI.CONTENT_DEPTH)

    this.renderList()

    cleanupKeyboardOnShutdown(this)
    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      switch (event.code) {
        case 'ArrowUp': case 'KeyW':
          this.moveCursor(-1)
          break
        case 'ArrowDown': case 'KeyS':
          this.moveCursor(1)
          break
        case 'ArrowLeft': case 'KeyA':
          this.changeTab(-1)
          break
        case 'ArrowRight': case 'KeyD':
          this.changeTab(1)
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
    if (action === 'left') {
      this.changeTab(-1)
      return
    }
    if (action === 'right') {
      this.changeTab(1)
      return
    }
    if (action === 'cancel' || action === 'menu') this.close()
  }

  private moveCursor(dir: number): void {
    this.cursorIndex = Phaser.Math.Clamp(this.cursorIndex + dir, 0, this.getListCount() - 1)
    this.updateCursor()
  }

  private changeTab(dir: number): void {
    const currentIndex = CODEX_TAB_DEFS.findIndex(t => t.key === this.tab)
    this.tab = CODEX_TAB_DEFS[(currentIndex + dir + CODEX_TAB_DEFS.length) % CODEX_TAB_DEFS.length]!.key
    this.cursorIndex = 0
    this.listTopIndex = 0
    this.updateTabs()
    this.renderList()
  }

  private getListCount(): number {
    if (this.tab === 'monsters') return Math.max(1, this.discoveredEnemies.length)
    if (this.tab === 'items') return Math.max(1, this.discoveredItems.length)
    return CODEX_STORY_BRANCH_COUNT + GAME_CONFIG_DATABASE.getTable('prophecies').length
  }

  private syncListWindow(): void {
    const maxTop = Math.max(0, this.getListCount() - CODEX_OVERLAY_UI.VISIBLE_ROWS)
    this.listTopIndex = Phaser.Math.Clamp(this.listTopIndex, 0, maxTop)
    if (this.cursorIndex < this.listTopIndex) {
      this.listTopIndex = this.cursorIndex
    } else if (this.cursorIndex >= this.listTopIndex + CODEX_OVERLAY_UI.VISIBLE_ROWS) {
      this.listTopIndex = Math.min(maxTop, this.cursorIndex - CODEX_OVERLAY_UI.VISIBLE_ROWS + 1)
    }
  }

  private updateTabs(): void {
    for (let i = 0; i < this.tabs.length; i++) {
      const color = CODEX_TAB_DEFS[i]?.key === this.tab ? MENU_OVERLAY_UI.COLORS.title : MENU_OVERLAY_UI.COLORS.muted
      this.tabs[i]!.setColor(color)
    }
  }

  private selectTab(tab: CodexTab): void {
    this.tab = tab
    this.cursorIndex = 0
    this.listTopIndex = 0
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
    this.syncListWindow()

    const addListText = (index: number, label: string, color: string): void => {
      const visibleIndex = index - this.listTopIndex
      const text = this.add.text(CODEX_OVERLAY_UI.LIST_X, CODEX_OVERLAY_UI.LIST_START_Y + visibleIndex * CODEX_OVERLAY_UI.LIST_ROW_GAP_Y, label, {
        fontSize: scaleFont(CODEX_OVERLAY_UI.LIST_FONT_SIZE),
        color,
        fontFamily: UI_FONT_FAMILY,
        wordWrap: { width: CODEX_OVERLAY_UI.LIST_WRAP_WIDTH },
      })
      text.setScrollFactor(0).setDepth(CODEX_OVERLAY_UI.CONTENT_DEPTH)
      bindTouchText(text, () => this.selectListItem(index))
      this.listItems.push(text)
    }

    if (this.tab === 'monsters') {
      if (this.discoveredEnemies.length === 0) {
        addListText(0, '尚未发现任何怪物', MENU_OVERLAY_UI.COLORS.dim)
      }
      for (let i = this.listTopIndex; i < Math.min(this.discoveredEnemies.length, this.listTopIndex + CODEX_OVERLAY_UI.VISIBLE_ROWS); i++) {
        const ed = enemies[this.discoveredEnemies[i]!]
        if (!ed) continue
        addListText(i, `${ed.isBoss ? '[BOSS]' : '-'} ${ed.name}`, ed.isBoss ? MENU_OVERLAY_UI.COLORS.danger : MENU_OVERLAY_UI.COLORS.text)
      }
    } else if (this.tab === 'items') {
      if (this.discoveredItems.length === 0) {
        addListText(0, '尚未获得任何物品', MENU_OVERLAY_UI.COLORS.dim)
      }
      for (let i = this.listTopIndex; i < Math.min(this.discoveredItems.length, this.listTopIndex + CODEX_OVERLAY_UI.VISIBLE_ROWS); i++) {
        const item = items[this.discoveredItems[i]!]
        if (!item) continue
        const count = GameData.getInstance().getItemQuantity(item.id)
        addListText(i, `${item.name} x${count}`, MENU_OVERLAY_UI.COLORS.text)
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
      const total = storyEntries.length + prophecies.length
      for (let i = this.listTopIndex; i < Math.min(total, this.listTopIndex + CODEX_OVERLAY_UI.VISIBLE_ROWS); i++) {
        if (i < storyEntries.length) {
          addListText(i, storyEntries[i]!, MENU_OVERLAY_UI.COLORS.text)
          continue
        }
        const prophecy = prophecies[i - storyEntries.length]
        if (!prophecy) continue
        const conditionMet = isProphecyConditionMet(prophecy.condition)
        const label = conditionMet ? `预言 ${prophecy.chapter}` : `??? ${prophecy.chapter}`
        addListText(i, label, conditionMet ? MENU_OVERLAY_UI.COLORS.accent : MENU_OVERLAY_UI.COLORS.dim)
      }
    }

    this.cursor.y = CODEX_OVERLAY_UI.LIST_START_Y + (this.cursorIndex - this.listTopIndex) * CODEX_OVERLAY_UI.LIST_ROW_GAP_Y
    this.updateDetail()
  }

  private updateCursor(): void {
    const previousTopIndex = this.listTopIndex
    this.syncListWindow()
    if (previousTopIndex !== this.listTopIndex) {
      this.renderList()
      return
    }
    this.cursor.y = CODEX_OVERLAY_UI.LIST_START_Y + (this.cursorIndex - this.listTopIndex) * CODEX_OVERLAY_UI.LIST_ROW_GAP_Y
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
      if (this.cursorIndex < CODEX_STORY_BRANCH_COUNT) {
        this.detailText.setText([
          '故事分支记录',
          '',
          '此处记录你在旅途中所做的选择。',
          '不同的选择会影响结局走向。',
        ].join('\n'))
      } else {
        const prophecyIndex = this.cursorIndex - CODEX_STORY_BRANCH_COUNT
        const prophecy = prophecies[prophecyIndex]
        if (!prophecy) {
          this.detailText.setText('')
          return
        }
        const gd = GameData.getInstance()
        const conditionMet = isProphecyConditionMet(prophecy.condition)
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
