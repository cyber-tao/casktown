import Phaser from 'phaser'
import { queueImageAssets } from '../core/AssetLoader'
import { EventBus, GameEvents } from '../core/EventBus'
import { GameData } from '../core/GameData'
import { QuestSystem } from '../core/QuestSystem'
import { SaveManager } from '../core/SaveManager'
import { AudioManager } from '../core/AudioManager'
import { GAME_CONFIG_DATABASE } from '../data/configDatabase'
import { EQUIP_SLOT_MAP, EQUIPMENT_SLOTS } from '../data/equipment'
import {
  BATTLE_RULES,
  CHARACTER_SPRITE_BASE_KEYS,
  EQUIPMENT_SLOT_LABELS,
  GAME_HEIGHT,
  GAME_WIDTH,
  INVENTORY_CATEGORY_KEYS,
  INVENTORY_CATEGORY_LABELS,
  INVENTORY_TYPE_ORDER,
  ITEM_ICON_KEY_PREFIX,
  MENU_NAV_INDEX,
  MENU_NAV_LABELS,
  MENU_OVERLAY_UI,
  SAVE_LOAD_FEEDBACK_DELAY_MS,
  SAVE_SLOTS,
  UI_FONT_FAMILY,
  UI_TITLE_FONT_FAMILY,
} from '../utils/constants'
import { bindTouchText } from '../utils/touch'
import { cleanupKeyboardOnShutdown } from '../utils/sceneLifecycle'
import type { CharacterData, ItemData } from '../data/types'
import type { EquipmentSlot } from '../data/equipment'

type MenuSubmenu = 'main' | 'prophecy' | 'party' | 'inventory' | 'inventory-target' | 'skills' | 'equipment' | 'equip-list' | 'save'
type InventoryCategory = typeof INVENTORY_CATEGORY_KEYS[number]
type DisplayItemType = Exclude<InventoryCategory, 'all'>

interface PartyMemberView {
  charId: string
  char: CharacterData
}

interface InventoryEntry {
  itemId: string
  item: ItemData
  quantity: number
}

interface PendingInventoryAction {
  itemId: string
  kind: 'use' | 'equip'
}

export class MenuOverlay extends Phaser.Scene {
  private navIndex: number = MENU_NAV_INDEX.PROPHECY
  private navTexts: Phaser.GameObjects.Text[] = []
  private navHighlight?: Phaser.GameObjects.Rectangle
  private contentArea!: Phaser.GameObjects.Container
  private submenu: MenuSubmenu = 'main'
  private inventoryCategoryIndex: number = 0
  private inventoryIndex: number = 0
  private inventoryEntries: InventoryEntry[] = []
  private pendingInventoryAction: PendingInventoryAction | null = null
  private targetIndex: number = 0
  private partyIndex: number = 0
  private skillCharIndex: number = 0
  private equipmentCharIndex: number = 0
  private equipmentSlotIndex: number = 0
  private equipSlot: EquipmentSlot | null = null
  private equipList: string[] = []
  private equipListIndex: number = 0
  private saveIndex: number = 0
  private loadMode = false
  private feedbackMessage = ''
  private feedbackEvent?: Phaser.Time.TimerEvent

  constructor() {
    super({ key: 'MenuOverlay', active: false })
  }

  preload(): void {
    const characterKeys = Object.keys(GAME_CONFIG_DATABASE.getTable('characters'))
      .map(charId => `${CHARACTER_SPRITE_BASE_KEYS[charId] ?? charId.toLowerCase()}_front_idle_01`)
    const itemKeys = Object.keys(this.getItems()).map(itemId => this.getItemIconKey(itemId))
    queueImageAssets(this, [...characterKeys, ...itemKeys])
  }

  create(): void {
    this.navIndex = MENU_NAV_INDEX.PROPHECY
    this.submenu = 'main'
    this.inventoryCategoryIndex = 0
    this.inventoryIndex = 0
    this.pendingInventoryAction = null
    this.targetIndex = 0
    this.partyIndex = 0
    this.skillCharIndex = 0
    this.equipmentCharIndex = 0
    this.equipmentSlotIndex = 0
    this.equipSlot = null
    this.equipList = []
    this.equipListIndex = 0
    this.saveIndex = 0
    this.loadMode = false
    this.feedbackMessage = ''

    AudioManager.getInstance().playSFX('open_menu')
    this.drawShell()
    this.renderNav()
    this.renderMain()
    this.setupInput()
  }

  private getItems(): Record<string, ItemData> {
    return GAME_CONFIG_DATABASE.getTable('items')
  }

  private drawShell(): void {
    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, MENU_OVERLAY_UI.OVERLAY_ALPHA)
    overlay.setDepth(MENU_OVERLAY_UI.DEPTH)
    overlay.setScrollFactor(0)

    const leftPanel = this.add.rectangle(
      MENU_OVERLAY_UI.LEFT_PANEL_X,
      MENU_OVERLAY_UI.LEFT_PANEL_Y,
      MENU_OVERLAY_UI.LEFT_PANEL_WIDTH,
      MENU_OVERLAY_UI.LEFT_PANEL_HEIGHT,
      MENU_OVERLAY_UI.COLORS.panel,
      MENU_OVERLAY_UI.PANEL_ALPHA,
    )
    leftPanel.setStrokeStyle(MENU_OVERLAY_UI.BORDER_WIDTH, MENU_OVERLAY_UI.COLORS.border)
    leftPanel.setDepth(MENU_OVERLAY_UI.DEPTH + 1)
    leftPanel.setScrollFactor(0)

    const contentPanel = this.add.rectangle(
      MENU_OVERLAY_UI.CONTENT_PANEL_X,
      MENU_OVERLAY_UI.CONTENT_PANEL_Y,
      MENU_OVERLAY_UI.CONTENT_PANEL_WIDTH,
      MENU_OVERLAY_UI.CONTENT_PANEL_HEIGHT,
      MENU_OVERLAY_UI.COLORS.panel,
      MENU_OVERLAY_UI.PANEL_ALPHA,
    )
    contentPanel.setStrokeStyle(MENU_OVERLAY_UI.BORDER_WIDTH, MENU_OVERLAY_UI.COLORS.border)
    contentPanel.setDepth(MENU_OVERLAY_UI.DEPTH + 1)
    contentPanel.setScrollFactor(0)

    this.add.text(MENU_OVERLAY_UI.NAV_TITLE_X, MENU_OVERLAY_UI.NAV_TITLE_Y, '木桶镇', {
      fontFamily: UI_TITLE_FONT_FAMILY,
      fontSize: `${MENU_OVERLAY_UI.TITLE_FONT_SIZE}px`,
      color: MENU_OVERLAY_UI.COLORS.title,
    }).setDepth(MENU_OVERLAY_UI.DEPTH + 3).setScrollFactor(0)

    this.contentArea = this.add.container(MENU_OVERLAY_UI.CONTENT_X, MENU_OVERLAY_UI.CONTENT_Y)
    this.contentArea.setDepth(MENU_OVERLAY_UI.DEPTH + 2)
    this.contentArea.setScrollFactor(0)
  }

  private setupInput(): void {
    cleanupKeyboardOnShutdown(this)
    this.input.keyboard?.on('keydown-UP', () => this.handleUp())
    this.input.keyboard?.on('keydown-DOWN', () => this.handleDown())
    this.input.keyboard?.on('keydown-LEFT', () => this.handleLeft())
    this.input.keyboard?.on('keydown-RIGHT', () => this.handleRight())
    this.input.keyboard?.on('keydown-ENTER', () => this.handleConfirm())
    this.input.keyboard?.on('keydown-SPACE', () => this.handleConfirm())
    this.input.keyboard?.on('keydown-ESC', () => this.handleCancel())
  }

  private renderNav(): void {
    for (const text of this.navTexts) text.destroy()
    this.navTexts = []
    this.navHighlight?.destroy()

    this.navHighlight = this.add.rectangle(
      MENU_OVERLAY_UI.NAV_HIGHLIGHT_X,
      MENU_OVERLAY_UI.NAV_Y + this.navIndex * MENU_OVERLAY_UI.NAV_GAP + MENU_OVERLAY_UI.NAV_HIGHLIGHT_HEIGHT / 2,
      MENU_OVERLAY_UI.NAV_HIGHLIGHT_WIDTH,
      MENU_OVERLAY_UI.NAV_HIGHLIGHT_HEIGHT,
      MENU_OVERLAY_UI.COLORS.highlightDark,
      MENU_OVERLAY_UI.PANEL_ALPHA,
    )
    this.navHighlight.setStrokeStyle(MENU_OVERLAY_UI.THIN_BORDER_WIDTH, MENU_OVERLAY_UI.COLORS.highlight)
    this.navHighlight.setDepth(MENU_OVERLAY_UI.DEPTH + 2)
    this.navHighlight.setScrollFactor(0)

    for (let i = 0; i < MENU_NAV_LABELS.length; i++) {
      const selected = i === this.navIndex
      const text = this.add.text(MENU_OVERLAY_UI.NAV_X, MENU_OVERLAY_UI.NAV_Y + i * MENU_OVERLAY_UI.NAV_GAP, MENU_NAV_LABELS[i]!, {
        fontFamily: UI_FONT_FAMILY,
        fontSize: `${MENU_OVERLAY_UI.NAV_FONT_SIZE}px`,
        color: selected ? MENU_OVERLAY_UI.COLORS.title : MENU_OVERLAY_UI.COLORS.muted,
      })
      text.setDepth(MENU_OVERLAY_UI.DEPTH + 3)
      text.setScrollFactor(0)
      this.fitTextToWidth(text, MENU_OVERLAY_UI.NAV_HIGHLIGHT_WIDTH - MENU_OVERLAY_UI.CARD_GAP)
      bindTouchText(text, () => {
        this.navIndex = i
        this.renderNav()
        this.activateNavSelection()
      })
      this.navTexts.push(text)
    }
  }

  private renderMain(): void {
    this.submenu = 'main'
    this.pendingInventoryAction = null
    this.clearContent()
    this.renderMainPreview()
  }

  private renderMainPreview(): void {
    switch (this.navIndex) {
      case MENU_NAV_INDEX.PARTY:
        this.renderPartySummary()
        break
      case MENU_NAV_INDEX.INVENTORY:
        this.renderInventorySummary()
        break
      case MENU_NAV_INDEX.SKILLS:
        this.renderSkillsSummary()
        break
      case MENU_NAV_INDEX.EQUIPMENT:
        this.renderEquipmentSummary()
        break
      case MENU_NAV_INDEX.SAVE:
        this.renderSaveSummary()
        break
      default:
        this.renderProphecyContent()
        break
    }
  }

  private activateNavSelection(): void {
    AudioManager.getInstance().playSFX('confirm')
    switch (this.navIndex) {
      case MENU_NAV_INDEX.PROPHECY:
        this.showProphecy()
        break
      case MENU_NAV_INDEX.PARTY:
        this.showParty()
        break
      case MENU_NAV_INDEX.INVENTORY:
        this.showInventory()
        break
      case MENU_NAV_INDEX.SKILLS:
        this.showSkills()
        break
      case MENU_NAV_INDEX.EQUIPMENT:
        this.showEquipment()
        break
      case MENU_NAV_INDEX.CODEX:
        this.launchScene('CodexOverlay')
        break
      case MENU_NAV_INDEX.MAP:
        this.launchScene('WorldMapOverlay')
        break
      case MENU_NAV_INDEX.SAVE:
        this.showSave()
        break
      case MENU_NAV_INDEX.SETTINGS:
        this.showSettings()
        break
      case MENU_NAV_INDEX.CLOSE:
        this.closeMenu()
        break
    }
  }

  private handleUp(): void {
    if (this.submenu === 'main') {
      this.moveNav(-1)
      return
    }
    if (this.submenu === 'inventory') {
      this.moveInventory(-1)
      return
    }
    if (this.submenu === 'inventory-target') {
      this.moveTarget(-1)
      return
    }
    if (this.submenu === 'party') {
      this.moveParty(-1)
      return
    }
    if (this.submenu === 'skills') {
      this.moveSkillCharacter(-1)
      return
    }
    if (this.submenu === 'equipment') {
      this.moveEquipmentSlot(-1)
      return
    }
    if (this.submenu === 'equip-list') {
      this.moveEquipList(-1)
      return
    }
    if (this.submenu === 'save') {
      this.moveSave(-1)
    }
  }

  private handleDown(): void {
    if (this.submenu === 'main') {
      this.moveNav(1)
      return
    }
    if (this.submenu === 'inventory') {
      this.moveInventory(1)
      return
    }
    if (this.submenu === 'inventory-target') {
      this.moveTarget(1)
      return
    }
    if (this.submenu === 'party') {
      this.moveParty(1)
      return
    }
    if (this.submenu === 'skills') {
      this.moveSkillCharacter(1)
      return
    }
    if (this.submenu === 'equipment') {
      this.moveEquipmentSlot(1)
      return
    }
    if (this.submenu === 'equip-list') {
      this.moveEquipList(1)
      return
    }
    if (this.submenu === 'save') {
      this.moveSave(1)
    }
  }

  private handleLeft(): void {
    if (this.submenu === 'inventory') {
      this.moveInventoryCategory(-1)
      return
    }
    if (this.submenu === 'party') {
      this.moveParty(-1)
      return
    }
    if (this.submenu === 'skills') {
      this.moveSkillCharacter(-1)
      return
    }
    if (this.submenu === 'equipment') {
      this.moveEquipmentCharacter(-1)
    }
  }

  private handleRight(): void {
    if (this.submenu === 'inventory') {
      this.moveInventoryCategory(1)
      return
    }
    if (this.submenu === 'party') {
      this.moveParty(1)
      return
    }
    if (this.submenu === 'skills') {
      this.moveSkillCharacter(1)
      return
    }
    if (this.submenu === 'equipment') {
      this.moveEquipmentCharacter(1)
    }
  }

  private handleConfirm(): void {
    if (this.submenu === 'main') {
      this.activateNavSelection()
      return
    }
    if (this.submenu === 'inventory') {
      this.confirmInventory()
      return
    }
    if (this.submenu === 'inventory-target') {
      this.confirmInventoryTarget()
      return
    }
    if (this.submenu === 'party') {
      this.navIndex = MENU_NAV_INDEX.EQUIPMENT
      this.equipmentCharIndex = this.clampIndex(this.partyIndex, this.getPartyMembers().length)
      this.renderNav()
      this.showEquipment()
      return
    }
    if (this.submenu === 'equipment') {
      this.showEquipList()
      return
    }
    if (this.submenu === 'equip-list') {
      this.confirmEquipList()
      return
    }
    if (this.submenu === 'save') {
      this.confirmSave()
    }
  }

  private handleCancel(): void {
    if (this.submenu === 'inventory-target') {
      AudioManager.getInstance().playSFX('cancel')
      this.pendingInventoryAction = null
      this.submenu = 'inventory'
      this.renderInventory()
      return
    }
    if (this.submenu === 'equip-list') {
      AudioManager.getInstance().playSFX('cancel')
      this.equipSlot = null
      this.equipList = []
      this.submenu = 'equipment'
      this.renderEquipment()
      return
    }
    if (this.submenu !== 'main') {
      AudioManager.getInstance().playSFX('cancel')
      this.renderMain()
      return
    }
    this.closeMenu()
  }

  private moveNav(dir: number): void {
    this.navIndex = (this.navIndex + dir + MENU_NAV_LABELS.length) % MENU_NAV_LABELS.length
    this.renderNav()
    this.renderMain()
    AudioManager.getInstance().playSFX('cursor')
  }

  private showProphecy(): void {
    this.submenu = 'prophecy'
    this.clearContent()
    this.renderProphecyContent()
  }

  private renderProphecyContent(): void {
    const gd = GameData.getInstance()
    const active = QuestSystem.getInstance().getActiveQuests()
    this.renderHeader('预言之书', active.length > 0 ? '当前预言' : '旧梦难缠')

    if (active.length > 0) {
      const q = active[0]!
      const def = GAME_CONFIG_DATABASE.getTable('quests')[q.id]
      this.addText(0, MENU_OVERLAY_UI.LIST_Y, def?.name ?? q.id, MENU_OVERLAY_UI.TITLE_FONT_SIZE, MENU_OVERLAY_UI.COLORS.title, MENU_OVERLAY_UI.CONTENT_WIDTH)
      this.addText(0, MENU_OVERLAY_UI.LIST_Y + MENU_OVERLAY_UI.LINE_HEIGHT * 2, def?.description ?? '', MENU_OVERLAY_UI.BODY_FONT_SIZE, MENU_OVERLAY_UI.COLORS.text, MENU_OVERLAY_UI.CONTENT_WIDTH)
      if (def && q.progress < def.objectives.length) {
        this.addText(0, MENU_OVERLAY_UI.LIST_Y + MENU_OVERLAY_UI.LINE_HEIGHT * 5, def.objectives[q.progress]!, MENU_OVERLAY_UI.BODY_FONT_SIZE, MENU_OVERLAY_UI.COLORS.accent, MENU_OVERLAY_UI.CONTENT_WIDTH)
      }
    } else {
      this.addText(0, MENU_OVERLAY_UI.LIST_Y, '烟容丝淡，凌寒旧时雨。', MENU_OVERLAY_UI.TITLE_FONT_SIZE, MENU_OVERLAY_UI.COLORS.title, MENU_OVERLAY_UI.CONTENT_WIDTH)
      this.addText(0, MENU_OVERLAY_UI.LIST_Y + MENU_OVERLAY_UI.LINE_HEIGHT * 2, '元帘未卷，仙鸡催晓，终将谁人到？', MENU_OVERLAY_UI.BODY_FONT_SIZE, MENU_OVERLAY_UI.COLORS.text, MENU_OVERLAY_UI.CONTENT_WIDTH)
    }

    this.addInfoCard(0, MENU_OVERLAY_UI.LIST_Y + MENU_OVERLAY_UI.LINE_HEIGHT * 8, '重建', `Lv.${gd.rebuildLevel}`)
    this.addInfoCard(MENU_OVERLAY_UI.CARD_WIDTH + MENU_OVERLAY_UI.CARD_GAP, MENU_OVERLAY_UI.LIST_Y + MENU_OVERLAY_UI.LINE_HEIGHT * 8, '悲悯', `${gd.branches.mercy_score}`)
    this.addInfoCard((MENU_OVERLAY_UI.CARD_WIDTH + MENU_OVERLAY_UI.CARD_GAP) * 2, MENU_OVERLAY_UI.LIST_Y + MENU_OVERLAY_UI.LINE_HEIGHT * 8, '金币', `${gd.gold}`)
    this.renderFeedback()
  }

  private renderPartySummary(): void {
    this.renderHeader('队伍', '成员状态')
    this.renderPartyCards(false)
    this.renderFeedback()
  }

  private showParty(): void {
    this.submenu = 'party'
    this.partyIndex = this.clampIndex(this.partyIndex, this.getPartyMembers().length)
    this.renderParty()
  }

  private renderParty(): void {
    this.clearContent()
    this.renderHeader('队伍', '角色状态与装备概览')
    this.renderPartyCards(true)
    this.renderSelectedPartyDetail()
    this.renderFeedback()
  }

  private renderPartyCards(interactive: boolean): void {
    const members = this.getPartyMembers()
    for (let i = 0; i < members.length; i++) {
      const member = members[i]!
      const column = i % MENU_OVERLAY_UI.PARTY_CARD_COLUMNS
      const row = Math.floor(i / MENU_OVERLAY_UI.PARTY_CARD_COLUMNS)
      const x = column * (MENU_OVERLAY_UI.PARTY_CARD_WIDTH + MENU_OVERLAY_UI.CARD_GAP)
      const y = MENU_OVERLAY_UI.LIST_Y + row * (MENU_OVERLAY_UI.PARTY_CARD_HEIGHT + MENU_OVERLAY_UI.CARD_GAP)
      const selected = interactive && i === this.partyIndex
      const card = this.addContentRect(x, y, MENU_OVERLAY_UI.PARTY_CARD_WIDTH, MENU_OVERLAY_UI.PARTY_CARD_HEIGHT, selected ? MENU_OVERLAY_UI.COLORS.highlightDark : MENU_OVERLAY_UI.COLORS.panelAlt)
      card.setStrokeStyle(MENU_OVERLAY_UI.THIN_BORDER_WIDTH, selected ? MENU_OVERLAY_UI.COLORS.highlight : MENU_OVERLAY_UI.COLORS.borderMuted)
      if (interactive) {
        card.setInteractive()
        card.on('pointerdown', () => {
          this.partyIndex = i
          this.renderParty()
          this.handleConfirm()
        })
      }
      this.addCharacterPortrait(member.charId, x + MENU_OVERLAY_UI.PORTRAIT_SIZE / 2 + MENU_OVERLAY_UI.CARD_GAP, y + MENU_OVERLAY_UI.PORTRAIT_SIZE / 2 + MENU_OVERLAY_UI.CARD_GAP, MENU_OVERLAY_UI.PORTRAIT_SIZE)
      this.addText(x + MENU_OVERLAY_UI.PORTRAIT_SIZE + MENU_OVERLAY_UI.CARD_GAP * 2, y + MENU_OVERLAY_UI.CARD_GAP, member.char.name, MENU_OVERLAY_UI.BODY_FONT_SIZE, selected ? MENU_OVERLAY_UI.COLORS.title : MENU_OVERLAY_UI.COLORS.text, MENU_OVERLAY_UI.PARTY_CARD_WIDTH - MENU_OVERLAY_UI.PORTRAIT_SIZE - MENU_OVERLAY_UI.CARD_GAP * 3)
      this.addText(x + MENU_OVERLAY_UI.PORTRAIT_SIZE + MENU_OVERLAY_UI.CARD_GAP * 2, y + MENU_OVERLAY_UI.CARD_GAP + MENU_OVERLAY_UI.LINE_HEIGHT, `Lv.${member.char.stats.level}`, MENU_OVERLAY_UI.CAPTION_FONT_SIZE, MENU_OVERLAY_UI.COLORS.muted)
      this.addStatusBar(x + MENU_OVERLAY_UI.CARD_GAP, y + MENU_OVERLAY_UI.PARTY_CARD_HEIGHT - MENU_OVERLAY_UI.CARD_GAP * 2, member.char.stats.hp, member.char.stats.maxHp, MENU_OVERLAY_UI.COLORS.hp)
      this.addStatusBar(x + MENU_OVERLAY_UI.CARD_GAP, y + MENU_OVERLAY_UI.PARTY_CARD_HEIGHT - MENU_OVERLAY_UI.CARD_GAP, member.char.stats.mp, member.char.stats.maxMp, MENU_OVERLAY_UI.COLORS.mp)
    }

    const gd = GameData.getInstance()
    if (gd.reserve.length > 0) {
      const names = gd.reserve.map(id => gd.characters.get(id)?.name ?? id).join(' / ')
      this.addText(0, MENU_OVERLAY_UI.FOOTER_Y, `后备：${names}`, MENU_OVERLAY_UI.CAPTION_FONT_SIZE, MENU_OVERLAY_UI.COLORS.muted, MENU_OVERLAY_UI.CONTENT_WIDTH)
    }
  }

  private renderSelectedPartyDetail(): void {
    const member = this.getPartyMembers()[this.partyIndex]
    if (!member) return
    const y = MENU_OVERLAY_UI.LIST_Y + MENU_OVERLAY_UI.PARTY_CARD_HEIGHT * 2 + MENU_OVERLAY_UI.CARD_GAP * 3
    this.addText(0, y, `${member.char.name}  ATK ${member.char.stats.atk}  DEF ${member.char.stats.def}  MATK ${member.char.stats.matk}  MDEF ${member.char.stats.mdef}  SPD ${member.char.stats.speed}`, MENU_OVERLAY_UI.BODY_FONT_SIZE, MENU_OVERLAY_UI.COLORS.text, MENU_OVERLAY_UI.CONTENT_WIDTH)
    this.addText(0, y + MENU_OVERLAY_UI.LINE_HEIGHT, this.formatEquipmentLine(member.char), MENU_OVERLAY_UI.CAPTION_FONT_SIZE, MENU_OVERLAY_UI.COLORS.muted, MENU_OVERLAY_UI.CONTENT_WIDTH)
  }

  private renderInventorySummary(): void {
    this.renderHeader('背包', '物品与装备')
    this.inventoryEntries = this.getInventoryEntries()
    this.renderInventoryList(false)
    this.renderFeedback()
  }

  private showInventory(): void {
    this.submenu = 'inventory'
    this.pendingInventoryAction = null
    this.renderInventory()
  }

  private renderInventory(): void {
    this.clearContent()
    this.renderHeader('背包', '物品 / 装备 / 材料')
    this.renderInventoryTabs()
    this.inventoryEntries = this.getInventoryEntries()
    this.inventoryIndex = this.clampIndex(this.inventoryIndex, this.inventoryEntries.length)
    this.renderInventoryList(true)
    this.renderInventoryDetail()
    this.renderFeedback()
  }

  private renderInventoryTabs(): void {
    for (let i = 0; i < INVENTORY_CATEGORY_KEYS.length; i++) {
      const key = INVENTORY_CATEGORY_KEYS[i]!
      const selected = i === this.inventoryCategoryIndex
      const text = this.addText(i * MENU_OVERLAY_UI.TAB_GAP, MENU_OVERLAY_UI.TAB_Y, INVENTORY_CATEGORY_LABELS[key], MENU_OVERLAY_UI.CAPTION_FONT_SIZE, selected ? MENU_OVERLAY_UI.COLORS.title : MENU_OVERLAY_UI.COLORS.muted)
      bindTouchText(text, () => {
        this.inventoryCategoryIndex = i
        this.inventoryIndex = 0
        this.renderInventory()
      })
    }
  }

  private renderInventoryList(interactive: boolean): void {
    if (this.inventoryEntries.length === 0) {
      this.addText(0, MENU_OVERLAY_UI.EMPTY_STATE_Y, '背包是空的', MENU_OVERLAY_UI.BODY_FONT_SIZE, MENU_OVERLAY_UI.COLORS.muted, MENU_OVERLAY_UI.CONTENT_WIDTH)
      return
    }

    const visibleRows = MENU_OVERLAY_UI.LIST_VISIBLE_ROWS
    const pageStart = Math.floor(this.inventoryIndex / visibleRows) * visibleRows
    const pageEntries = this.inventoryEntries.slice(pageStart, pageStart + visibleRows)
    for (let i = 0; i < pageEntries.length; i++) {
      const entry = pageEntries[i]!
      const absoluteIndex = pageStart + i
      const selected = interactive && absoluteIndex === this.inventoryIndex
      const y = MENU_OVERLAY_UI.LIST_Y + i * MENU_OVERLAY_UI.LIST_ROW_HEIGHT
      const row = this.addContentRect(MENU_OVERLAY_UI.LIST_X, y, MENU_OVERLAY_UI.DETAIL_X - MENU_OVERLAY_UI.CARD_GAP, MENU_OVERLAY_UI.LIST_ROW_HEIGHT - MENU_OVERLAY_UI.CARD_GAP / 2, selected ? MENU_OVERLAY_UI.COLORS.highlightDark : MENU_OVERLAY_UI.COLORS.panelAlt)
      row.setStrokeStyle(MENU_OVERLAY_UI.THIN_BORDER_WIDTH, selected ? MENU_OVERLAY_UI.COLORS.highlight : MENU_OVERLAY_UI.COLORS.borderMuted)
      if (interactive) {
        row.setInteractive()
        row.on('pointerdown', () => {
          this.inventoryIndex = absoluteIndex
          this.renderInventory()
          this.confirmInventory()
        })
      }
      this.addItemIcon(entry.itemId, MENU_OVERLAY_UI.ICON_SIZE / 2 + MENU_OVERLAY_UI.CARD_GAP / 2, y + MENU_OVERLAY_UI.ICON_SIZE / 2 + MENU_OVERLAY_UI.CARD_GAP / 4, MENU_OVERLAY_UI.ICON_SIZE)
      this.addText(MENU_OVERLAY_UI.LIST_TEXT_X, y + MENU_OVERLAY_UI.CARD_GAP / 2, entry.item.name, MENU_OVERLAY_UI.BODY_FONT_SIZE, selected ? MENU_OVERLAY_UI.COLORS.title : MENU_OVERLAY_UI.COLORS.text, MENU_OVERLAY_UI.LIST_QTY_X - MENU_OVERLAY_UI.LIST_TEXT_X - MENU_OVERLAY_UI.CARD_GAP)
      this.addText(MENU_OVERLAY_UI.LIST_QTY_X, y + MENU_OVERLAY_UI.CARD_GAP / 2, `x${entry.quantity}`, MENU_OVERLAY_UI.CAPTION_FONT_SIZE, MENU_OVERLAY_UI.COLORS.muted)
    }

    const page = Math.floor(this.inventoryIndex / visibleRows) + 1
    const pageCount = Math.ceil(this.inventoryEntries.length / visibleRows)
    this.addText(MENU_OVERLAY_UI.PAGE_TEXT_X, MENU_OVERLAY_UI.FOOTER_Y, `${page}/${pageCount}`, MENU_OVERLAY_UI.CAPTION_FONT_SIZE, MENU_OVERLAY_UI.COLORS.dim)
  }

  private renderInventoryDetail(): void {
    const entry = this.inventoryEntries[this.inventoryIndex]
    if (!entry) return
    this.addContentRect(MENU_OVERLAY_UI.DETAIL_X, MENU_OVERLAY_UI.DETAIL_Y, MENU_OVERLAY_UI.DETAIL_WIDTH, MENU_OVERLAY_UI.LIST_ROW_HEIGHT * MENU_OVERLAY_UI.LIST_VISIBLE_ROWS - MENU_OVERLAY_UI.CARD_GAP / 2, MENU_OVERLAY_UI.COLORS.panelDeep)
      .setStrokeStyle(MENU_OVERLAY_UI.THIN_BORDER_WIDTH, MENU_OVERLAY_UI.COLORS.borderMuted)
    this.addItemIcon(entry.itemId, MENU_OVERLAY_UI.DETAIL_X + MENU_OVERLAY_UI.ICON_SIZE, MENU_OVERLAY_UI.DETAIL_Y + MENU_OVERLAY_UI.ICON_SIZE, MENU_OVERLAY_UI.ICON_SIZE * 2)
    this.addText(MENU_OVERLAY_UI.DETAIL_X + MENU_OVERLAY_UI.CARD_GAP, MENU_OVERLAY_UI.DETAIL_Y + MENU_OVERLAY_UI.ICON_SIZE * 2 + MENU_OVERLAY_UI.CARD_GAP, entry.item.name, MENU_OVERLAY_UI.BODY_FONT_SIZE, MENU_OVERLAY_UI.COLORS.title, MENU_OVERLAY_UI.DETAIL_WIDTH - MENU_OVERLAY_UI.CARD_GAP * 2)
    this.addText(MENU_OVERLAY_UI.DETAIL_X + MENU_OVERLAY_UI.CARD_GAP, MENU_OVERLAY_UI.DETAIL_Y + MENU_OVERLAY_UI.ICON_SIZE * 2 + MENU_OVERLAY_UI.LINE_HEIGHT + MENU_OVERLAY_UI.CARD_GAP, this.getItemTypeLabel(entry.itemId, entry.item), MENU_OVERLAY_UI.CAPTION_FONT_SIZE, MENU_OVERLAY_UI.COLORS.accent)
    this.addText(MENU_OVERLAY_UI.DETAIL_X + MENU_OVERLAY_UI.CARD_GAP, MENU_OVERLAY_UI.DETAIL_Y + MENU_OVERLAY_UI.ICON_SIZE * 2 + MENU_OVERLAY_UI.LINE_HEIGHT * 2 + MENU_OVERLAY_UI.CARD_GAP, entry.item.description, MENU_OVERLAY_UI.CAPTION_FONT_SIZE, MENU_OVERLAY_UI.COLORS.text, MENU_OVERLAY_UI.DETAIL_WIDTH - MENU_OVERLAY_UI.CARD_GAP * 2)
  }

  private confirmInventory(): void {
    const entry = this.inventoryEntries[this.inventoryIndex]
    if (!entry) return
    if (entry.item.type === 'consumable' && entry.item.usableInField) {
      this.pendingInventoryAction = { itemId: entry.itemId, kind: 'use' }
      this.targetIndex = 0
      this.submenu = 'inventory-target'
      this.renderInventoryTarget()
      AudioManager.getInstance().playSFX('confirm')
      return
    }
    if (this.isEquipmentItem(entry.itemId, entry.item)) {
      this.pendingInventoryAction = { itemId: entry.itemId, kind: 'equip' }
      this.targetIndex = this.clampIndex(this.equipmentCharIndex, this.getPartyMembers().length)
      this.submenu = 'inventory-target'
      this.renderInventoryTarget()
      AudioManager.getInstance().playSFX('confirm')
      return
    }
    this.setFeedback('该物品无法在菜单中使用')
  }

  private renderInventoryTarget(): void {
    this.clearContent()
    const action = this.pendingInventoryAction
    if (!action) {
      this.showInventory()
      return
    }
    const item = this.getItems()[action.itemId]
    if (!item) {
      this.showInventory()
      return
    }

    this.renderHeader(item.name, action.kind === 'equip' ? '选择穿戴角色' : '选择使用目标')
    this.addItemIcon(action.itemId, MENU_OVERLAY_UI.ICON_SIZE, MENU_OVERLAY_UI.TAB_Y + MENU_OVERLAY_UI.ICON_SIZE / 2, MENU_OVERLAY_UI.ICON_SIZE * 2)
    this.addText(MENU_OVERLAY_UI.ICON_SIZE * 2 + MENU_OVERLAY_UI.CARD_GAP, MENU_OVERLAY_UI.TAB_Y, item.description, MENU_OVERLAY_UI.BODY_FONT_SIZE, MENU_OVERLAY_UI.COLORS.text, MENU_OVERLAY_UI.CONTENT_WIDTH - MENU_OVERLAY_UI.ICON_SIZE * 3)

    const members = this.getPartyMembers()
    this.targetIndex = this.clampIndex(this.targetIndex, members.length)
    for (let i = 0; i < members.length; i++) {
      const member = members[i]!
      const selected = i === this.targetIndex
      const y = MENU_OVERLAY_UI.TARGET_Y + i * MENU_OVERLAY_UI.TARGET_ROW_HEIGHT
      const row = this.addContentRect(0, y, MENU_OVERLAY_UI.CONTENT_WIDTH, MENU_OVERLAY_UI.TARGET_ROW_HEIGHT - MENU_OVERLAY_UI.CARD_GAP, selected ? MENU_OVERLAY_UI.COLORS.highlightDark : MENU_OVERLAY_UI.COLORS.panelAlt)
      row.setStrokeStyle(MENU_OVERLAY_UI.THIN_BORDER_WIDTH, selected ? MENU_OVERLAY_UI.COLORS.highlight : MENU_OVERLAY_UI.COLORS.borderMuted)
      row.setInteractive()
      row.on('pointerdown', () => {
        this.targetIndex = i
        this.renderInventoryTarget()
        this.confirmInventoryTarget()
      })
      this.addCharacterPortrait(member.charId, MENU_OVERLAY_UI.PORTRAIT_SIZE / 2 + MENU_OVERLAY_UI.CARD_GAP, y + MENU_OVERLAY_UI.PORTRAIT_SIZE / 2 + MENU_OVERLAY_UI.CARD_GAP / 2, MENU_OVERLAY_UI.PORTRAIT_SIZE)
      this.addText(MENU_OVERLAY_UI.PORTRAIT_SIZE + MENU_OVERLAY_UI.CARD_GAP * 2, y + MENU_OVERLAY_UI.CARD_GAP / 2, member.char.name, MENU_OVERLAY_UI.BODY_FONT_SIZE, selected ? MENU_OVERLAY_UI.COLORS.title : MENU_OVERLAY_UI.COLORS.text)
      this.addText(MENU_OVERLAY_UI.PORTRAIT_SIZE + MENU_OVERLAY_UI.CARD_GAP * 2, y + MENU_OVERLAY_UI.LINE_HEIGHT + MENU_OVERLAY_UI.CARD_GAP / 2, `HP ${member.char.stats.hp}/${member.char.stats.maxHp}  MP ${member.char.stats.mp}/${member.char.stats.maxMp}`, MENU_OVERLAY_UI.CAPTION_FONT_SIZE, MENU_OVERLAY_UI.COLORS.muted)
      if (action.kind === 'equip') {
        const slot = EQUIP_SLOT_MAP[action.itemId]
        const equipped = slot ? member.char.equipment[slot] : null
        this.addText(MENU_OVERLAY_UI.DETAIL_X, y + MENU_OVERLAY_UI.CARD_GAP / 2, equipped ? this.getItemName(equipped) : '空', MENU_OVERLAY_UI.CAPTION_FONT_SIZE, MENU_OVERLAY_UI.COLORS.accent, MENU_OVERLAY_UI.DETAIL_WIDTH)
      }
    }
    this.renderFeedback()
  }

  private confirmInventoryTarget(): void {
    const action = this.pendingInventoryAction
    if (!action) return
    const member = this.getPartyMembers()[this.targetIndex]
    if (!member) return
    const item = this.getItems()[action.itemId]
    if (!item) return

    if (action.kind === 'use') {
      const applied = this.applyFieldItem(action.itemId, item, member.char)
      this.pendingInventoryAction = null
      this.submenu = 'inventory'
      this.setFeedback(applied ? `${member.char.name} 使用了 ${item.name}` : '没有可生效的目标')
      this.renderInventory()
      return
    }

    const equipped = this.equipStoredItem(member.charId, action.itemId)
    this.pendingInventoryAction = null
    this.submenu = 'inventory'
    this.setFeedback(equipped ? `${member.char.name} 装备了 ${item.name}` : '无法装备该物品')
    this.renderInventory()
  }

  private showSkills(): void {
    this.submenu = 'skills'
    this.skillCharIndex = this.clampIndex(this.skillCharIndex, this.getPartyMembers().length)
    this.renderSkills()
  }

  private renderSkillsSummary(): void {
    this.renderHeader('技能', '队伍技能')
    this.renderSkillsBody(false)
    this.renderFeedback()
  }

  private renderSkills(): void {
    this.clearContent()
    this.renderHeader('技能', '角色技能')
    this.renderSkillsBody(true)
    this.renderFeedback()
  }

  private renderSkillsBody(interactive: boolean): void {
    const members = this.getPartyMembers()
    const member = members[this.skillCharIndex]
    if (!member) {
      this.addText(0, MENU_OVERLAY_UI.EMPTY_STATE_Y, '无角色', MENU_OVERLAY_UI.BODY_FONT_SIZE, MENU_OVERLAY_UI.COLORS.muted)
      return
    }
    if (interactive) {
      this.addCharacterPortrait(member.charId, MENU_OVERLAY_UI.PORTRAIT_SIZE / 2, MENU_OVERLAY_UI.LIST_Y + MENU_OVERLAY_UI.PORTRAIT_SIZE / 2, MENU_OVERLAY_UI.PORTRAIT_SIZE)
    }
    this.addText(interactive ? MENU_OVERLAY_UI.PORTRAIT_SIZE + MENU_OVERLAY_UI.CARD_GAP : 0, MENU_OVERLAY_UI.LIST_Y, `${member.char.name} Lv.${member.char.stats.level}`, MENU_OVERLAY_UI.TITLE_FONT_SIZE, MENU_OVERLAY_UI.COLORS.title)
    let y = MENU_OVERLAY_UI.LIST_Y + MENU_OVERLAY_UI.LINE_HEIGHT * 2
    for (const skillId of member.char.skills) {
      const skill = GAME_CONFIG_DATABASE.getTable('skills')[skillId]
      if (!skill) continue
      const cost = skill.costTp > 0 ? `TP ${skill.costTp}` : `MP ${skill.costMp}`
      this.addContentRect(0, y, MENU_OVERLAY_UI.CONTENT_WIDTH, MENU_OVERLAY_UI.LIST_ROW_HEIGHT, MENU_OVERLAY_UI.COLORS.panelAlt)
        .setStrokeStyle(MENU_OVERLAY_UI.THIN_BORDER_WIDTH, MENU_OVERLAY_UI.COLORS.borderMuted)
      this.addText(MENU_OVERLAY_UI.CARD_GAP, y + MENU_OVERLAY_UI.CARD_GAP / 2, skill.name, MENU_OVERLAY_UI.BODY_FONT_SIZE, MENU_OVERLAY_UI.COLORS.text, MENU_OVERLAY_UI.DETAIL_X - MENU_OVERLAY_UI.CARD_GAP * 2)
      this.addText(MENU_OVERLAY_UI.DETAIL_X, y + MENU_OVERLAY_UI.CARD_GAP / 2, cost, MENU_OVERLAY_UI.CAPTION_FONT_SIZE, MENU_OVERLAY_UI.COLORS.accent)
      this.addText(MENU_OVERLAY_UI.CARD_GAP, y + MENU_OVERLAY_UI.LINE_HEIGHT + MENU_OVERLAY_UI.CARD_GAP / 2, skill.description, MENU_OVERLAY_UI.CAPTION_FONT_SIZE, MENU_OVERLAY_UI.COLORS.muted, MENU_OVERLAY_UI.CONTENT_WIDTH - MENU_OVERLAY_UI.CARD_GAP * 2)
      y += MENU_OVERLAY_UI.LIST_ROW_HEIGHT + MENU_OVERLAY_UI.CARD_GAP / 2
    }
  }

  private showEquipment(): void {
    this.submenu = 'equipment'
    this.equipSlot = null
    this.equipmentCharIndex = this.clampIndex(this.equipmentCharIndex, this.getPartyMembers().length)
    this.equipmentSlotIndex = this.clampIndex(this.equipmentSlotIndex, EQUIPMENT_SLOTS.length)
    this.renderEquipment()
  }

  private renderEquipmentSummary(): void {
    this.renderHeader('装备', '穿戴概览')
    this.renderEquipmentBody(false)
    this.renderFeedback()
  }

  private renderEquipment(): void {
    this.clearContent()
    this.renderHeader('装备', '角色穿戴')
    this.renderEquipmentBody(true)
    this.renderFeedback()
  }

  private renderEquipmentBody(interactive: boolean): void {
    const members = this.getPartyMembers()
    const member = members[this.equipmentCharIndex]
    if (!member) {
      this.addText(0, MENU_OVERLAY_UI.EMPTY_STATE_Y, '无角色', MENU_OVERLAY_UI.BODY_FONT_SIZE, MENU_OVERLAY_UI.COLORS.muted)
      return
    }
    this.addCharacterPortrait(member.charId, MENU_OVERLAY_UI.PORTRAIT_SIZE / 2, MENU_OVERLAY_UI.LIST_Y + MENU_OVERLAY_UI.PORTRAIT_SIZE / 2, MENU_OVERLAY_UI.PORTRAIT_SIZE)
    this.addText(MENU_OVERLAY_UI.PORTRAIT_SIZE + MENU_OVERLAY_UI.CARD_GAP, MENU_OVERLAY_UI.LIST_Y, `${member.char.name} Lv.${member.char.stats.level}`, MENU_OVERLAY_UI.TITLE_FONT_SIZE, MENU_OVERLAY_UI.COLORS.title)
    this.addText(MENU_OVERLAY_UI.PORTRAIT_SIZE + MENU_OVERLAY_UI.CARD_GAP, MENU_OVERLAY_UI.LIST_Y + MENU_OVERLAY_UI.LINE_HEIGHT * 2, `HP ${member.char.stats.hp}/${member.char.stats.maxHp}  MP ${member.char.stats.mp}/${member.char.stats.maxMp}`, MENU_OVERLAY_UI.CAPTION_FONT_SIZE, MENU_OVERLAY_UI.COLORS.muted)
    this.addText(MENU_OVERLAY_UI.PORTRAIT_SIZE + MENU_OVERLAY_UI.CARD_GAP, MENU_OVERLAY_UI.LIST_Y + MENU_OVERLAY_UI.LINE_HEIGHT * 3, `ATK ${member.char.stats.atk}  DEF ${member.char.stats.def}  MATK ${member.char.stats.matk}  MDEF ${member.char.stats.mdef}  SPD ${member.char.stats.speed}`, MENU_OVERLAY_UI.CAPTION_FONT_SIZE, MENU_OVERLAY_UI.COLORS.text, MENU_OVERLAY_UI.CONTENT_WIDTH - MENU_OVERLAY_UI.PORTRAIT_SIZE)

    let y = MENU_OVERLAY_UI.LIST_Y + MENU_OVERLAY_UI.TARGET_ROW_HEIGHT
    for (let i = 0; i < EQUIPMENT_SLOTS.length; i++) {
      const slot = EQUIPMENT_SLOTS[i]!
      const itemId = member.char.equipment[slot]
      const selected = interactive && i === this.equipmentSlotIndex
      const row = this.addContentRect(0, y, MENU_OVERLAY_UI.CONTENT_WIDTH, MENU_OVERLAY_UI.LIST_ROW_HEIGHT, selected ? MENU_OVERLAY_UI.COLORS.highlightDark : MENU_OVERLAY_UI.COLORS.panelAlt)
      row.setStrokeStyle(MENU_OVERLAY_UI.THIN_BORDER_WIDTH, selected ? MENU_OVERLAY_UI.COLORS.highlight : MENU_OVERLAY_UI.COLORS.borderMuted)
      if (interactive) {
        row.setInteractive()
        row.on('pointerdown', () => {
          this.equipmentSlotIndex = i
          this.renderEquipment()
          this.showEquipList()
        })
      }
      this.addText(MENU_OVERLAY_UI.CARD_GAP, y + MENU_OVERLAY_UI.CARD_GAP / 2, EQUIPMENT_SLOT_LABELS[slot], MENU_OVERLAY_UI.BODY_FONT_SIZE, selected ? MENU_OVERLAY_UI.COLORS.title : MENU_OVERLAY_UI.COLORS.text)
      if (itemId) {
        this.addItemIcon(itemId, MENU_OVERLAY_UI.LIST_TEXT_X + MENU_OVERLAY_UI.ICON_SIZE / 2, y + MENU_OVERLAY_UI.ICON_SIZE / 2, MENU_OVERLAY_UI.ICON_SIZE)
      }
      this.addText(MENU_OVERLAY_UI.LIST_TEXT_X + MENU_OVERLAY_UI.ICON_SIZE + MENU_OVERLAY_UI.CARD_GAP, y + MENU_OVERLAY_UI.CARD_GAP / 2, itemId ? this.getItemName(itemId) : '空', MENU_OVERLAY_UI.BODY_FONT_SIZE, MENU_OVERLAY_UI.COLORS.muted, MENU_OVERLAY_UI.CONTENT_WIDTH - MENU_OVERLAY_UI.LIST_TEXT_X)
      y += MENU_OVERLAY_UI.LIST_ROW_HEIGHT + MENU_OVERLAY_UI.CARD_GAP / 2
    }
  }

  private showEquipList(): void {
    const slot = EQUIPMENT_SLOTS[this.equipmentSlotIndex]
    if (!slot) return
    this.equipSlot = slot
    this.equipList = ['__unequip__', ...this.getEquipmentCandidates(slot)]
    this.equipListIndex = 0
    this.submenu = 'equip-list'
    this.renderEquipList()
    AudioManager.getInstance().playSFX('confirm')
  }

  private renderEquipList(): void {
    this.clearContent()
    const members = this.getPartyMembers()
    const member = members[this.equipmentCharIndex]
    if (!member || !this.equipSlot) {
      this.showEquipment()
      return
    }
    this.renderHeader(`${member.char.name} · ${EQUIPMENT_SLOT_LABELS[this.equipSlot]}`, '更换装备')
    this.equipListIndex = this.clampIndex(this.equipListIndex, this.equipList.length)
    const visibleRows = MENU_OVERLAY_UI.EQUIP_LIST_VISIBLE_ROWS
    const pageStart = Math.floor(this.equipListIndex / visibleRows) * visibleRows
    const pageItems = this.equipList.slice(pageStart, pageStart + visibleRows)
    for (let i = 0; i < pageItems.length; i++) {
      const itemId = pageItems[i]!
      const absoluteIndex = pageStart + i
      const selected = absoluteIndex === this.equipListIndex
      const y = MENU_OVERLAY_UI.LIST_Y + i * MENU_OVERLAY_UI.LIST_ROW_HEIGHT
      const row = this.addContentRect(0, y, MENU_OVERLAY_UI.CONTENT_WIDTH, MENU_OVERLAY_UI.LIST_ROW_HEIGHT - MENU_OVERLAY_UI.CARD_GAP / 2, selected ? MENU_OVERLAY_UI.COLORS.highlightDark : MENU_OVERLAY_UI.COLORS.panelAlt)
      row.setStrokeStyle(MENU_OVERLAY_UI.THIN_BORDER_WIDTH, selected ? MENU_OVERLAY_UI.COLORS.highlight : MENU_OVERLAY_UI.COLORS.borderMuted)
      row.setInteractive()
      row.on('pointerdown', () => {
        this.equipListIndex = absoluteIndex
        this.renderEquipList()
        this.confirmEquipList()
      })
      if (itemId !== '__unequip__') {
        this.addItemIcon(itemId, MENU_OVERLAY_UI.ICON_SIZE / 2 + MENU_OVERLAY_UI.CARD_GAP / 2, y + MENU_OVERLAY_UI.ICON_SIZE / 2 + MENU_OVERLAY_UI.CARD_GAP / 4, MENU_OVERLAY_UI.ICON_SIZE)
      }
      this.addText(MENU_OVERLAY_UI.LIST_TEXT_X, y + MENU_OVERLAY_UI.CARD_GAP / 2, itemId === '__unequip__' ? '卸下' : this.getItemName(itemId), MENU_OVERLAY_UI.BODY_FONT_SIZE, selected ? MENU_OVERLAY_UI.COLORS.title : MENU_OVERLAY_UI.COLORS.text, MENU_OVERLAY_UI.DETAIL_X - MENU_OVERLAY_UI.LIST_TEXT_X)
      if (itemId !== '__unequip__') {
        this.addText(MENU_OVERLAY_UI.DETAIL_X, y + MENU_OVERLAY_UI.CARD_GAP / 2, `x${this.getStoredQuantity(itemId)}`, MENU_OVERLAY_UI.CAPTION_FONT_SIZE, MENU_OVERLAY_UI.COLORS.muted)
      }
    }
    this.renderFeedback()
  }

  private confirmEquipList(): void {
    const member = this.getPartyMembers()[this.equipmentCharIndex]
    if (!member || !this.equipSlot) return
    const selectedId = this.equipList[this.equipListIndex]
    if (!selectedId) return

    if (selectedId === '__unequip__') {
      const current = member.char.equipment[this.equipSlot]
      if (current) {
        GameData.getInstance().addItem(current, 1)
        GameData.getInstance().unequipItem(member.charId, current)
        this.setFeedback(`${member.char.name} 卸下了 ${this.getItemName(current)}`)
      } else {
        this.setFeedback('该装备槽为空')
      }
    } else {
      const item = this.getItems()[selectedId]
      const equipped = item ? this.equipStoredItem(member.charId, selectedId) : false
      this.setFeedback(equipped ? `${member.char.name} 装备了 ${this.getItemName(selectedId)}` : '无法装备该物品')
    }

    this.equipSlot = null
    this.equipList = []
    this.submenu = 'equipment'
    this.renderEquipment()
  }

  private showSave(): void {
    this.submenu = 'save'
    this.loadMode = false
    this.saveIndex = 0
    this.renderSave()
  }

  private renderSaveSummary(): void {
    this.renderHeader('存档', '记录')
    this.renderSaveRows(false)
    this.renderFeedback()
  }

  private renderSave(): void {
    this.clearContent()
    this.renderHeader(this.loadMode ? '读取存档' : '保存', this.loadMode ? '选择槽位' : '保存或读取')
    this.renderSaveRows(true)
    this.renderFeedback()
  }

  private renderSaveRows(interactive: boolean): void {
    const rows = this.getSaveRows()
    this.saveIndex = this.clampIndex(this.saveIndex, rows.length)
    for (let i = 0; i < rows.length; i++) {
      const selected = interactive && i === this.saveIndex
      const y = MENU_OVERLAY_UI.SAVE_ROW_Y + i * MENU_OVERLAY_UI.SAVE_ROW_HEIGHT
      const row = this.addContentRect(0, y, MENU_OVERLAY_UI.CONTENT_WIDTH, MENU_OVERLAY_UI.SAVE_ROW_HEIGHT - MENU_OVERLAY_UI.CARD_GAP / 2, selected ? MENU_OVERLAY_UI.COLORS.highlightDark : MENU_OVERLAY_UI.COLORS.panelAlt)
      row.setStrokeStyle(MENU_OVERLAY_UI.THIN_BORDER_WIDTH, selected ? MENU_OVERLAY_UI.COLORS.highlight : MENU_OVERLAY_UI.COLORS.borderMuted)
      if (interactive) {
        row.setInteractive()
        row.on('pointerdown', () => {
          this.saveIndex = i
          this.renderSave()
          this.confirmSave()
        })
      }
      this.addText(MENU_OVERLAY_UI.CARD_GAP, y + MENU_OVERLAY_UI.CARD_GAP / 2, rows[i]!, MENU_OVERLAY_UI.BODY_FONT_SIZE, selected ? MENU_OVERLAY_UI.COLORS.title : MENU_OVERLAY_UI.COLORS.text, MENU_OVERLAY_UI.CONTENT_WIDTH - MENU_OVERLAY_UI.CARD_GAP * 2)
    }
  }

  private confirmSave(): void {
    if (this.loadMode) {
      if (this.saveIndex >= SAVE_SLOTS) {
        this.loadMode = false
        this.saveIndex = 0
        this.renderSave()
        return
      }
      this.doLoad(this.saveIndex + 1)
      return
    }

    if (this.saveIndex < SAVE_SLOTS) {
      this.doSave(this.saveIndex + 1)
      return
    }
    if (this.saveIndex === SAVE_SLOTS) {
      this.loadMode = true
      this.saveIndex = 0
      this.renderSave()
      return
    }
    this.renderMain()
  }

  private doSave(slot: number): void {
    const success = SaveManager.getInstance().save(slot)
    this.setFeedback(success ? '保存成功' : '保存失败')
    this.time.delayedCall(SAVE_LOAD_FEEDBACK_DELAY_MS, () => this.renderSave())
  }

  private doLoad(slot: number): void {
    const meta = SaveManager.getInstance().getMeta(slot)
    if (!meta) {
      this.setFeedback('该槽位没有存档')
      this.renderSave()
      return
    }
    const success = SaveManager.getInstance().load(slot)
    if (!success) {
      this.setFeedback('读取失败')
      this.renderSave()
      return
    }
    this.setFeedback('读取成功')
    this.time.delayedCall(SAVE_LOAD_FEEDBACK_DELAY_MS, () => {
      EventBus.emit(GameEvents.SAVE_LOADED)
      this.scene.stop()
    })
  }

  private getSaveRows(): string[] {
    const sm = SaveManager.getInstance()
    if (this.loadMode) {
      return [
        ...Array.from({ length: SAVE_SLOTS }, (_, i) => {
          const slot = i + 1
          const meta = sm.getMeta(slot)
          return meta ? `槽位 ${slot} · ${meta.preview} · ${this.formatTime(meta.playTime)}` : `槽位 ${slot} · 空`
        }),
        '返回',
      ]
    }
    return [
      ...Array.from({ length: SAVE_SLOTS }, (_, i) => {
        const slot = i + 1
        const meta = sm.getMeta(slot)
        return meta ? `保存到槽位 ${slot} · ${meta.preview} · ${this.formatTime(meta.playTime)}` : `保存到槽位 ${slot} · 空`
      }),
      '读取存档',
      '返回',
    ]
  }

  private moveInventory(dir: number): void {
    if (this.inventoryEntries.length === 0) return
    this.inventoryIndex = (this.inventoryIndex + dir + this.inventoryEntries.length) % this.inventoryEntries.length
    this.renderInventory()
    AudioManager.getInstance().playSFX('cursor')
  }

  private moveInventoryCategory(dir: number): void {
    this.inventoryCategoryIndex = (this.inventoryCategoryIndex + dir + INVENTORY_CATEGORY_KEYS.length) % INVENTORY_CATEGORY_KEYS.length
    this.inventoryIndex = 0
    this.renderInventory()
    AudioManager.getInstance().playSFX('cursor')
  }

  private moveTarget(dir: number): void {
    const count = this.getPartyMembers().length
    if (count === 0) return
    this.targetIndex = (this.targetIndex + dir + count) % count
    this.renderInventoryTarget()
    AudioManager.getInstance().playSFX('cursor')
  }

  private moveParty(dir: number): void {
    const count = this.getPartyMembers().length
    if (count === 0) return
    this.partyIndex = (this.partyIndex + dir + count) % count
    this.renderParty()
    AudioManager.getInstance().playSFX('cursor')
  }

  private moveSkillCharacter(dir: number): void {
    const count = this.getPartyMembers().length
    if (count === 0) return
    this.skillCharIndex = (this.skillCharIndex + dir + count) % count
    this.renderSkills()
    AudioManager.getInstance().playSFX('cursor')
  }

  private moveEquipmentCharacter(dir: number): void {
    const count = this.getPartyMembers().length
    if (count === 0) return
    this.equipmentCharIndex = (this.equipmentCharIndex + dir + count) % count
    this.renderEquipment()
    AudioManager.getInstance().playSFX('cursor')
  }

  private moveEquipmentSlot(dir: number): void {
    this.equipmentSlotIndex = (this.equipmentSlotIndex + dir + EQUIPMENT_SLOTS.length) % EQUIPMENT_SLOTS.length
    this.renderEquipment()
    AudioManager.getInstance().playSFX('cursor')
  }

  private moveEquipList(dir: number): void {
    if (this.equipList.length === 0) return
    this.equipListIndex = (this.equipListIndex + dir + this.equipList.length) % this.equipList.length
    this.renderEquipList()
    AudioManager.getInstance().playSFX('cursor')
  }

  private moveSave(dir: number): void {
    const rows = this.getSaveRows()
    this.saveIndex = (this.saveIndex + dir + rows.length) % rows.length
    this.renderSave()
    AudioManager.getInstance().playSFX('cursor')
  }

  private getPartyMembers(): PartyMemberView[] {
    const gd = GameData.getInstance()
    return gd.party.flatMap(charId => {
      const char = gd.characters.get(charId)
      return char ? [{ charId, char }] : []
    })
  }

  private getInventoryEntries(): InventoryEntry[] {
    const gd = GameData.getInstance()
    const items = this.getItems()
    const category = INVENTORY_CATEGORY_KEYS[this.inventoryCategoryIndex]!
    const entries = new Map<string, InventoryEntry>()
    const addEntry = (itemId: string, quantity: number): void => {
      if (quantity <= 0) return
      const item = items[itemId]
      if (!item) return
      const displayType = this.getDisplayItemType(itemId, item)
      if (category !== 'all' && displayType !== category) return
      const current = entries.get(itemId)
      if (current) {
        current.quantity += quantity
      } else {
        entries.set(itemId, { itemId, item, quantity })
      }
    }

    for (const [itemId, quantity] of Object.entries(gd.inventory.items)) addEntry(itemId, quantity)
    for (const [itemId, quantity] of Object.entries(gd.inventory.equipment)) addEntry(itemId, quantity)

    return [...entries.values()].sort((a, b) => {
      const typeA = this.getDisplayItemType(a.itemId, a.item)
      const typeB = this.getDisplayItemType(b.itemId, b.item)
      const orderA = INVENTORY_TYPE_ORDER[typeA]
      const orderB = INVENTORY_TYPE_ORDER[typeB]
      if (orderA !== orderB) return orderA - orderB
      return a.item.name.localeCompare(b.item.name, 'zh-Hans-CN')
    })
  }

  private getEquipmentCandidates(slot: EquipmentSlot): string[] {
    return this.getInventoryEntries()
      .filter(entry => EQUIP_SLOT_MAP[entry.itemId] === slot && this.getStoredQuantity(entry.itemId) > 0)
      .map(entry => entry.itemId)
  }

  private getStoredQuantity(itemId: string): number {
    const gd = GameData.getInstance()
    return (gd.inventory.items[itemId] ?? 0) + (gd.inventory.equipment[itemId] ?? 0)
  }

  private removeStoredItem(itemId: string): boolean {
    const gd = GameData.getInstance()
    const equipmentQty = gd.inventory.equipment[itemId] ?? 0
    if (equipmentQty > 0) {
      if (equipmentQty === 1) {
        delete gd.inventory.equipment[itemId]
      } else {
        gd.inventory.equipment[itemId] = equipmentQty - 1
      }
      return true
    }
    const itemQty = gd.inventory.items[itemId] ?? 0
    if (itemQty <= 0) return false
    if (itemQty === 1) {
      delete gd.inventory.items[itemId]
    } else {
      gd.inventory.items[itemId] = itemQty - 1
    }
    return true
  }

  private equipStoredItem(charId: string, itemId: string): boolean {
    const gd = GameData.getInstance()
    const char = gd.characters.get(charId)
    const slot = EQUIP_SLOT_MAP[itemId]
    if (!char || !slot) return false
    if (char.equipment[slot] === itemId) return false
    if (!this.removeStoredItem(itemId)) return false
    const current = char.equipment[slot]
    if (current) {
      gd.addItem(current, 1)
    }
    gd.equipItem(charId, itemId, slot)
    this.equipmentCharIndex = this.clampIndex(this.getPartyMembers().findIndex(member => member.charId === charId), this.getPartyMembers().length)
    return true
  }

  private applyFieldItem(itemId: string, item: ItemData, target: CharacterData): boolean {
    const gd = GameData.getInstance()
    const effect = item.effect
    const targets = effect.endsWith(BATTLE_RULES.ALL_TARGET_EFFECT_SUFFIX)
      ? this.getPartyMembers().map(member => member.char)
      : [target]
    const applied = targets.some(char => this.canApplyFieldEffect(effect, char))
    if (!applied) return false
    if (!gd.removeItem(itemId, 1)) return false
    for (const char of targets) {
      this.applyFieldEffect(effect, char)
    }
    AudioManager.getInstance().playSFX('item_use')
    return true
  }

  private canApplyFieldEffect(effect: string, char: CharacterData): boolean {
    if (effect.startsWith(BATTLE_RULES.HEAL_HP_EFFECT_PREFIX)) return char.stats.hp < char.stats.maxHp
    if (effect.startsWith(BATTLE_RULES.HEAL_MP_EFFECT_PREFIX)) return char.stats.mp < char.stats.maxMp
    if (effect.startsWith(BATTLE_RULES.REVIVE_EFFECT_PREFIX)) return char.stats.hp <= 0
    return false
  }

  private applyFieldEffect(effect: string, char: CharacterData): void {
    if (effect.startsWith(BATTLE_RULES.HEAL_HP_EFFECT_PREFIX)) {
      const amount = this.parseEffectAmount(effect, BATTLE_RULES.HEAL_HP_EFFECT_PREFIX)
      if (char.stats.hp < char.stats.maxHp) {
        char.stats.hp = Math.min(char.stats.maxHp, char.stats.hp + amount)
      }
      return
    }
    if (effect.startsWith(BATTLE_RULES.HEAL_MP_EFFECT_PREFIX)) {
      const amount = this.parseEffectAmount(effect, BATTLE_RULES.HEAL_MP_EFFECT_PREFIX)
      if (char.stats.mp < char.stats.maxMp) {
        char.stats.mp = Math.min(char.stats.maxMp, char.stats.mp + amount)
      }
      return
    }
    if (effect.startsWith(BATTLE_RULES.REVIVE_EFFECT_PREFIX) && char.stats.hp <= 0) {
      const percent = this.parseEffectAmount(effect, BATTLE_RULES.REVIVE_EFFECT_PREFIX)
      char.stats.hp = Math.max(1, Math.floor(char.stats.maxHp * percent / BATTLE_RULES.PERCENT_DIVISOR))
    }
  }

  private parseEffectAmount(effect: string, prefix: string): number {
    const raw = effect.slice(prefix.length).replace(BATTLE_RULES.ALL_TARGET_EFFECT_SUFFIX, '')
    const amount = Number.parseInt(raw, 10)
    return Number.isFinite(amount) ? amount : 0
  }

  private renderHeader(title: string, subtitle: string): void {
    this.addText(0, 0, title, MENU_OVERLAY_UI.TITLE_FONT_SIZE, MENU_OVERLAY_UI.COLORS.title, MENU_OVERLAY_UI.CONTENT_WIDTH, UI_TITLE_FONT_FAMILY)
    this.addText(0, MENU_OVERLAY_UI.LINE_HEIGHT + MENU_OVERLAY_UI.CARD_GAP / 2, subtitle, MENU_OVERLAY_UI.CAPTION_FONT_SIZE, MENU_OVERLAY_UI.COLORS.muted, MENU_OVERLAY_UI.CONTENT_WIDTH)
  }

  private addInfoCard(x: number, y: number, label: string, value: string): void {
    this.addContentRect(x, y, MENU_OVERLAY_UI.CARD_WIDTH, MENU_OVERLAY_UI.CARD_HEIGHT, MENU_OVERLAY_UI.COLORS.panelAlt)
      .setStrokeStyle(MENU_OVERLAY_UI.THIN_BORDER_WIDTH, MENU_OVERLAY_UI.COLORS.borderMuted)
    this.addText(x + MENU_OVERLAY_UI.CARD_GAP, y + MENU_OVERLAY_UI.CARD_GAP, label, MENU_OVERLAY_UI.CAPTION_FONT_SIZE, MENU_OVERLAY_UI.COLORS.muted, MENU_OVERLAY_UI.CARD_WIDTH - MENU_OVERLAY_UI.CARD_GAP * 2)
    this.addText(x + MENU_OVERLAY_UI.CARD_GAP, y + MENU_OVERLAY_UI.CARD_GAP + MENU_OVERLAY_UI.LINE_HEIGHT, value, MENU_OVERLAY_UI.TITLE_FONT_SIZE, MENU_OVERLAY_UI.COLORS.title, MENU_OVERLAY_UI.CARD_WIDTH - MENU_OVERLAY_UI.CARD_GAP * 2)
  }

  private addText(x: number, y: number, value: string, fontSize: number, color: string, maxWidth?: number, fontFamily = UI_FONT_FAMILY): Phaser.GameObjects.Text {
    const text = this.add.text(x, y, value, {
      fontFamily,
      fontSize: `${fontSize}px`,
      color,
      wordWrap: maxWidth ? { width: maxWidth, useAdvancedWrap: true } : undefined,
    })
    text.setScrollFactor(0)
    this.contentArea.add(text)
    if (maxWidth) this.fitTextToWidth(text, maxWidth)
    return text
  }

  private addContentRect(x: number, y: number, width: number, height: number, color: number): Phaser.GameObjects.Rectangle {
    const rect = this.add.rectangle(x, y, width, height, color, MENU_OVERLAY_UI.PANEL_ALPHA)
    rect.setOrigin(0)
    rect.setScrollFactor(0)
    this.contentArea.add(rect)
    return rect
  }

  private addItemIcon(itemId: string, x: number, y: number, size: number): void {
    const key = this.getItemIconKey(itemId)
    if (!this.textures.exists(key)) {
      this.addContentRect(x - size / 2, y - size / 2, size, size, MENU_OVERLAY_UI.COLORS.panelAlt)
      return
    }
    const image = this.add.image(x, y, key)
    image.setDisplaySize(size, size)
    image.setScrollFactor(0)
    this.contentArea.add(image)
  }

  private addCharacterPortrait(charId: string, x: number, y: number, size: number): void {
    const key = `${CHARACTER_SPRITE_BASE_KEYS[charId] ?? charId.toLowerCase()}_front_idle_01`
    this.addContentRect(x - size / 2, y - size / 2, size, size, MENU_OVERLAY_UI.COLORS.panelDeep)
      .setStrokeStyle(MENU_OVERLAY_UI.THIN_BORDER_WIDTH, MENU_OVERLAY_UI.COLORS.borderMuted)
    if (this.textures.exists(key)) {
      const image = this.add.image(x, y, key)
      image.setDisplaySize(size, size)
      image.setScrollFactor(0)
      this.contentArea.add(image)
      return
    }
    this.addText(x - size / 2, y - MENU_OVERLAY_UI.CAPTION_FONT_SIZE / 2, charId, MENU_OVERLAY_UI.CAPTION_FONT_SIZE, MENU_OVERLAY_UI.COLORS.muted, size)
  }

  private addStatusBar(x: number, y: number, value: number, maxValue: number, color: number): void {
    const ratio = maxValue > 0 ? Phaser.Math.Clamp(value / maxValue, 0, 1) : 0
    this.addContentRect(x, y, MENU_OVERLAY_UI.STATUS_BAR_WIDTH, MENU_OVERLAY_UI.STATUS_BAR_HEIGHT, MENU_OVERLAY_UI.COLORS.panelDeep)
    this.addContentRect(x, y, MENU_OVERLAY_UI.STATUS_BAR_WIDTH * ratio, MENU_OVERLAY_UI.STATUS_BAR_HEIGHT, color)
  }

  private fitTextToWidth(text: Phaser.GameObjects.Text, maxWidth: number): void {
    let fontSize = Number.parseInt(String(text.style.fontSize), 10)
    while (text.width > maxWidth && fontSize > MENU_OVERLAY_UI.SMALL_FONT_SIZE) {
      fontSize -= 1
      text.setFontSize(fontSize)
    }
  }

  private renderFeedback(): void {
    if (!this.feedbackMessage) return
    this.addText(0, MENU_OVERLAY_UI.MESSAGE_Y, this.feedbackMessage, MENU_OVERLAY_UI.BODY_FONT_SIZE, MENU_OVERLAY_UI.COLORS.accent, MENU_OVERLAY_UI.CONTENT_WIDTH)
  }

  private setFeedback(message: string): void {
    this.feedbackMessage = message
    this.feedbackEvent?.remove(false)
    this.feedbackEvent = this.time.delayedCall(MENU_OVERLAY_UI.MESSAGE_DURATION_MS, () => {
      this.feedbackMessage = ''
      this.renderActiveContent()
    })
  }

  private renderActiveContent(): void {
    if (!this.scene.isActive()) return
    if (this.submenu === 'main') this.renderMain()
    else if (this.submenu === 'prophecy') this.showProphecy()
    else if (this.submenu === 'party') this.renderParty()
    else if (this.submenu === 'inventory') this.renderInventory()
    else if (this.submenu === 'inventory-target') this.renderInventoryTarget()
    else if (this.submenu === 'skills') this.renderSkills()
    else if (this.submenu === 'equipment') this.renderEquipment()
    else if (this.submenu === 'equip-list') this.renderEquipList()
    else if (this.submenu === 'save') this.renderSave()
  }

  private clearContent(): void {
    this.contentArea.removeAll(true)
  }

  private getItemIconKey(itemId: string): string {
    return `${ITEM_ICON_KEY_PREFIX}${itemId}`
  }

  private getItemName(itemId: string): string {
    return this.getItems()[itemId]?.name ?? itemId
  }

  private getItemTypeLabel(itemId: string, item: ItemData): string {
    return INVENTORY_CATEGORY_LABELS[this.getDisplayItemType(itemId, item)]
  }

  private getDisplayItemType(itemId: string, item: ItemData): DisplayItemType {
    return this.isEquipmentItem(itemId, item) ? 'equipment' : item.type
  }

  private isEquipmentItem(itemId: string, item: ItemData): boolean {
    return item.type === 'equipment' || Boolean(EQUIP_SLOT_MAP[itemId])
  }

  private formatEquipmentLine(char: CharacterData): string {
    const weapon = char.equipment.weapon ? this.getItemName(char.equipment.weapon) : '空'
    const armor = char.equipment.armor ? this.getItemName(char.equipment.armor) : '空'
    const accessory = char.equipment.accessory ? this.getItemName(char.equipment.accessory) : '空'
    return `武器 ${weapon} / 防具 ${armor} / 饰品 ${accessory}`
  }

  private clampIndex(index: number, length: number): number {
    if (length <= 0) return 0
    return Phaser.Math.Clamp(index, 0, length - 1)
  }

  private showSettings(): void {
    this.scene.launch('SettingsScene', { returnTo: 'MenuOverlay' })
    this.scene.pause()
  }

  private launchScene(sceneKey: string): void {
    this.scene.stop('MenuOverlay')
    this.scene.launch(sceneKey)
    this.scene.pause('MapScene')
  }

  private closeMenu(): void {
    AudioManager.getInstance().playSFX('close_menu')
    EventBus.emit(GameEvents.MENU_CLOSE)
    this.scene.stop()
  }

  private formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return `${h}h${m}m`
  }
}
