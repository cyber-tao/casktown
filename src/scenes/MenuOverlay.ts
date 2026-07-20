import Phaser from 'phaser'
import { queueImageAssets } from '../core/AssetLoader'
import { EventBus, GameEvents } from '../core/EventBus'
import { GameData } from '../core/GameData'
import { QuestSystem } from '../core/QuestSystem'
import { isProphecyConditionMet } from '../core/ProphecyConditions'
import { SaveManager } from '../core/SaveManager'
import { AudioManager } from '../core/AudioManager'
import { InputManager } from '../core/InputManager'
import { SettingsManager } from '../core/SettingsManager'
import { GAME_CONFIG_DATABASE } from '../data/configDatabase'
import { STORY_CODEX_CATEGORY_LABELS, getUnlockedStoryCodexEntries } from '../data/codex'
import { EQUIP_SLOT_MAP, EQUIPMENT_SLOTS } from '../data/equipment'
import {
  BATTLE_RULES,
  CHARACTER_SPRITE_BASE_KEYS,
  CHARACTER_STAT_LABELS,
  CODEX_STORY_BRANCH_COUNT,
  DEFAULT_ENEMY_SPRITE_KEY,
  EQUIPMENT_SLOT_LABELS,
  GAME_HEIGHT,
  GAME_WIDTH,
  INVENTORY_CATEGORY_KEYS,
  INVENTORY_CATEGORY_LABELS,
  LOADING_SCREEN,
  MENU_CODEX_TAB_KEYS,
  MENU_CODEX_TAB_LABELS,
  MENU_NAV_INDEX,
  MENU_NAV_LABELS,
  MENU_OVERLAY_UI,
  MENU_SETTINGS_OPTIONS,
  PARTY_RULES,
  SAVE_LOAD_FEEDBACK_DELAY_MS,
  RUNTIME_UI_ASSET_KEYS,
  UI_FONT_FAMILY,
  UI_TITLE_FONT_FAMILY,
} from '../utils/constants'
import { bindTouchText, cssToGamePx } from '../utils/touch'
import { cleanupKeyboardOnShutdown } from '../utils/sceneLifecycle'
import { showLoadingScreen } from '../utils/loadingScreen'
import { getLoadSaveSlots, getManualSaveSlots } from '../utils/saveSlots'
import { completeLoadedSaveTransition, type SaveLoadTransitionState } from '../utils/saveTransition'
import { canApplyConsumableEffect, resolveItemRecoveryAmount } from '../utils/itemEffects'
import { GamepadNavigationController, type GamepadNavigationAction } from '../utils/gamepadNavigation'
import { resolveQuestProgressDisplay } from '../utils/questProgress'
import type { CharacterData, ItemData } from '../data/types'
import type { EquipmentSlot } from '../data/equipment'
import {
  getCodexImageKeys as buildCodexImageKeys,
  getCodexListCount as buildCodexListCount,
  getCodexRowColor as resolveCodexRowColor,
  getCodexRowLabel as resolveCodexRowLabel,
  getCodexTab as resolveCodexTab,
  getDiscoveredEnemies as listDiscoveredEnemies,
  getDiscoveredItems as listDiscoveredItems,
  getEnemyIconKey as resolveEnemyIconKey,
} from './menu/codexHelpers'
import {
  buildInventoryEntries,
  formatEquipmentBonuses as formatItemEquipmentBonuses,
  getEquipmentCandidates as listEquipmentCandidates,
  getInventoryCategory,
  getInventoryEntryImageKeys,
  getItemIconKey as resolveItemIconKey,
  getItemName as resolveItemName,
  getItemTypeLabel as resolveItemTypeLabel,
  getOwnedItemQuantity as resolveOwnedItemQuantity,
  isEquipmentItem as checkIsEquipmentItem,
} from './menu/inventoryHelpers'
import { getPartyMembers as listPartyMembers } from './menu/partyHelpers'
import { buildSaveRows } from './menu/saveHelpers'
import {
  getSettingValueText as resolveSettingValueText,
  getSettingsLayout as resolveSettingsLayout,
} from './menu/settingsHelpers'
import type {
  InventoryEntry,
  MenuSubmenu,
  PendingInventoryAction,
  PartyMemberView,
} from './menu/types'

type CharacterStatKey = keyof typeof CHARACTER_STAT_LABELS

export class MenuOverlay extends Phaser.Scene {
  private navIndex: number = MENU_NAV_INDEX.PROPHECY
  private navTexts: Phaser.GameObjects.Text[] = []
  private navHighlight?: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image
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
  private reserveIndex: number = 0
  private equipSlot: EquipmentSlot | null = null
  private equipList: string[] = []
  private equipListIndex: number = 0
  private codexTabIndex: number = 0
  private codexIndex: number = 0
  private saveIndex: number = 0
  private settingsIndex: number = 0
  private loadMode = false
  private loadTransition: SaveLoadTransitionState = { active: false }
  private feedbackMessage = ''
  private feedbackEvent?: Phaser.Time.TimerEvent
  private gamepadNavigation = new GamepadNavigationController()

  constructor() {
    super({ key: 'MenuOverlay', active: false })
  }

  preload(): void {
    showLoadingScreen(this, LOADING_SCREEN.MENU_LABEL)
    queueImageAssets(this, [...this.getPartyCharacterImageKeys(), ...Object.values(RUNTIME_UI_ASSET_KEYS)])
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
    this.reserveIndex = 0
    this.equipSlot = null
    this.equipList = []
    this.equipListIndex = 0
    this.codexTabIndex = 0
    this.codexIndex = 0
    this.saveIndex = 0
    this.settingsIndex = 0
    this.loadMode = false
    this.loadTransition.active = false
    this.feedbackMessage = ''
    this.gamepadNavigation.reset()

    AudioManager.getInstance().playSFX('open_menu')
    this.drawShell()
    this.renderNav()
    this.renderMain()
    this.setupInput()
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleSettingsResize, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.handleSettingsResize, this)
    })
  }

  override update(): void {
    const input = InputManager.getInstance()
    const actions = this.gamepadNavigation.poll(this.input.gamepad, input.isGamepadEnabled())
    for (const action of actions) this.handleGamepadAction(action)
  }

  private getItems(): Record<string, ItemData> {
    return GAME_CONFIG_DATABASE.getTable('items')
  }

  private getPartyCharacterImageKeys(): string[] {
    const gd = GameData.getInstance()
    return [...gd.party, ...gd.reserve].map(charId => `${CHARACTER_SPRITE_BASE_KEYS[charId] ?? charId.toLowerCase()}_front_idle_01`)
  }

  private getCodexImageKeys(): string[] {
    const gd = GameData.getInstance()
    const tab = resolveCodexTab(this.codexTabIndex)
    return buildCodexImageKeys(
      tab,
      listDiscoveredItems(gd, this.getItems(), listPartyMembers(gd)),
      listDiscoveredEnemies(gd),
    )
  }

  private queueDynamicImageAssets(keys: Iterable<string>): void {
    const imageAssets = GAME_CONFIG_DATABASE.getTable('imageAssets')
    const missingKeys = [...new Set(keys)].filter(key => Boolean(imageAssets[key]) && !this.textures.exists(key))
    if (missingKeys.length === 0) return
    queueImageAssets(this, missingKeys)
    if (this.load.isLoading()) return
    this.load.once(Phaser.Loader.Events.COMPLETE, () => this.renderActiveContent())
    this.load.start()
  }

  private addShellPanel(x: number, y: number, width: number, height: number, textureKey: string): Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle {
    if (this.textures.exists(textureKey)) {
      const panel = this.add.image(x, y, textureKey)
      panel.setDisplaySize(width, height)
      panel.setAlpha(MENU_OVERLAY_UI.PANEL_ALPHA)
      panel.setDepth(MENU_OVERLAY_UI.DEPTH + 1)
      panel.setScrollFactor(0)
      return panel
    }

    const panel = this.add.rectangle(x, y, width, height, MENU_OVERLAY_UI.COLORS.panel, MENU_OVERLAY_UI.PANEL_ALPHA)
    panel.setDepth(MENU_OVERLAY_UI.DEPTH + 1)
    panel.setScrollFactor(0)
    return panel
  }

  private drawShell(): void {
    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, MENU_OVERLAY_UI.OVERLAY_ALPHA)
    overlay.setDepth(MENU_OVERLAY_UI.DEPTH)
    overlay.setScrollFactor(0)

    this.addShellPanel(
      MENU_OVERLAY_UI.LEFT_PANEL_X,
      MENU_OVERLAY_UI.LEFT_PANEL_Y,
      MENU_OVERLAY_UI.LEFT_PANEL_WIDTH,
      MENU_OVERLAY_UI.LEFT_PANEL_HEIGHT,
      RUNTIME_UI_ASSET_KEYS.MENU_SIDEBAR,
    )

    this.addShellPanel(
      MENU_OVERLAY_UI.CONTENT_PANEL_X,
      MENU_OVERLAY_UI.CONTENT_PANEL_Y,
      MENU_OVERLAY_UI.CONTENT_PANEL_WIDTH,
      MENU_OVERLAY_UI.CONTENT_PANEL_HEIGHT,
      RUNTIME_UI_ASSET_KEYS.MENU_PANEL,
    )

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
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      const action = InputManager.getInstance().getNavigationAction(event.code)
      if (action) this.handleGamepadAction(action)
    })
  }

  private handleGamepadAction(action: GamepadNavigationAction): void {
    if (this.loadTransition.active) return
    if (action === 'up') {
      this.handleUp()
      return
    }
    if (action === 'down') {
      this.handleDown()
      return
    }
    if (action === 'left') {
      this.handleLeft()
      return
    }
    if (action === 'right') {
      this.handleRight()
      return
    }
    if (action === 'confirm') {
      this.handleConfirm()
      return
    }
    if (action === 'cancel' || action === 'menu') this.handleCancel()
  }

  private renderNav(): void {
    for (const text of this.navTexts) text.destroy()
    this.navTexts = []
    this.navHighlight?.destroy()

    const highlightY = MENU_OVERLAY_UI.NAV_Y + this.navIndex * MENU_OVERLAY_UI.NAV_GAP + MENU_OVERLAY_UI.NAV_HIGHLIGHT_HEIGHT / 2
    if (this.textures.exists(RUNTIME_UI_ASSET_KEYS.BUTTON_SELECTED)) {
      const highlight = this.add.image(MENU_OVERLAY_UI.NAV_HIGHLIGHT_X, highlightY, RUNTIME_UI_ASSET_KEYS.BUTTON_SELECTED)
      highlight.setDisplaySize(MENU_OVERLAY_UI.NAV_HIGHLIGHT_WIDTH, MENU_OVERLAY_UI.NAV_HIGHLIGHT_HEIGHT)
      highlight.setAlpha(MENU_OVERLAY_UI.PANEL_ALPHA)
      this.navHighlight = highlight
    } else {
      const highlight = this.add.rectangle(
        MENU_OVERLAY_UI.NAV_HIGHLIGHT_X,
        highlightY,
        MENU_OVERLAY_UI.NAV_HIGHLIGHT_WIDTH,
        MENU_OVERLAY_UI.NAV_HIGHLIGHT_HEIGHT,
        MENU_OVERLAY_UI.COLORS.highlightDark,
        MENU_OVERLAY_UI.PANEL_ALPHA,
      )
      highlight.setStrokeStyle(MENU_OVERLAY_UI.THIN_BORDER_WIDTH, MENU_OVERLAY_UI.COLORS.highlight)
      this.navHighlight = highlight
    }
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
      case MENU_NAV_INDEX.CODEX:
        this.renderCodexSummary()
        break
      case MENU_NAV_INDEX.SAVE:
        this.renderSaveSummary()
        break
      case MENU_NAV_INDEX.SETTINGS:
        this.renderSettingsSummary()
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
      case MENU_NAV_INDEX.CODEX:
        this.showCodex()
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
      this.moveEquipmentSlot(-1)
      return
    }
    if (this.submenu === 'skills') {
      this.moveSkillCharacter(-1)
      return
    }
    if (this.submenu === 'equip-list') {
      this.moveEquipList(-1)
      return
    }
    if (this.submenu === 'codex') {
      this.moveCodex(-1)
      return
    }
    if (this.submenu === 'save') {
      this.moveSave(-1)
      return
    }
    if (this.submenu === 'settings') {
      this.moveSettings(-1)
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
      this.moveEquipmentSlot(1)
      return
    }
    if (this.submenu === 'skills') {
      this.moveSkillCharacter(1)
      return
    }
    if (this.submenu === 'equip-list') {
      this.moveEquipList(1)
      return
    }
    if (this.submenu === 'codex') {
      this.moveCodex(1)
      return
    }
    if (this.submenu === 'save') {
      this.moveSave(1)
      return
    }
    if (this.submenu === 'settings') {
      this.moveSettings(1)
    }
  }

  private handleLeft(): void {
    if (this.submenu === 'inventory') {
      this.moveInventoryCategory(-1)
      return
    }
    if (this.submenu === 'party') {
      if (this.isPartyFormationSelected()) this.moveReserve(-1)
      else this.moveParty(-1)
      return
    }
    if (this.submenu === 'skills') {
      this.moveSkillCharacter(-1)
      return
    }
    if (this.submenu === 'codex') {
      this.moveCodexTab(-1)
      return
    }
    if (this.submenu === 'settings') {
      this.changeSetting(-1)
    }
  }

  private handleRight(): void {
    if (this.submenu === 'inventory') {
      this.moveInventoryCategory(1)
      return
    }
    if (this.submenu === 'party') {
      if (this.isPartyFormationSelected()) this.moveReserve(1)
      else this.moveParty(1)
      return
    }
    if (this.submenu === 'skills') {
      this.moveSkillCharacter(1)
      return
    }
    if (this.submenu === 'codex') {
      this.moveCodexTab(1)
      return
    }
    if (this.submenu === 'settings') {
      this.changeSetting(1)
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
      if (this.isPartyFormationSelected()) {
        this.confirmPartyFormation()
        return
      }
      this.equipmentCharIndex = this.clampIndex(this.partyIndex, this.getPartyMembers().length)
      this.showEquipList()
      return
    }
    if (this.submenu === 'equip-list') {
      this.confirmEquipList()
      return
    }
    if (this.submenu === 'settings') {
      this.confirmSetting()
      return
    }
    if (this.submenu === 'save') {
      this.confirmSave()
    }
  }

  private handleCancel(): void {
    if (this.loadTransition.active) return
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
      this.submenu = 'party'
      this.renderParty()
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
      this.addText(0, MENU_OVERLAY_UI.LIST_Y, def?.name ?? q.id, MENU_OVERLAY_UI.TITLE_FONT_SIZE, MENU_OVERLAY_UI.COLORS.title, MENU_OVERLAY_UI.PAGE_LEFT_WIDTH)
      this.addText(0, MENU_OVERLAY_UI.LIST_Y + MENU_OVERLAY_UI.LINE_HEIGHT * 2, def?.description ?? '', MENU_OVERLAY_UI.BODY_FONT_SIZE, MENU_OVERLAY_UI.COLORS.text, MENU_OVERLAY_UI.PAGE_LEFT_WIDTH)
      if (def) {
        const display = resolveQuestProgressDisplay(def, q, flag => gd.getFlag(flag))
        this.addText(0, MENU_OVERLAY_UI.LIST_Y + MENU_OVERLAY_UI.LINE_HEIGHT * 5, `${display.objective}（${display.progress}/${display.maxProgress}）`, MENU_OVERLAY_UI.BODY_FONT_SIZE, MENU_OVERLAY_UI.COLORS.accent, MENU_OVERLAY_UI.PAGE_LEFT_WIDTH)
      }
    } else {
      this.addText(0, MENU_OVERLAY_UI.LIST_Y, '烟容丝淡，凌寒旧时雨。', MENU_OVERLAY_UI.TITLE_FONT_SIZE, MENU_OVERLAY_UI.COLORS.title, MENU_OVERLAY_UI.PAGE_LEFT_WIDTH)
      this.addText(0, MENU_OVERLAY_UI.LIST_Y + MENU_OVERLAY_UI.LINE_HEIGHT * 2, '元帘未卷，仙鸡催晓，终将谁人到？', MENU_OVERLAY_UI.BODY_FONT_SIZE, MENU_OVERLAY_UI.COLORS.text, MENU_OVERLAY_UI.PAGE_LEFT_WIDTH)
    }

    const infoCards = [
      ['重建', `Lv.${gd.rebuildLevel}`],
      ['悲悯', `${gd.branches.mercy_score}`],
      ['金币', `${gd.gold}`],
    ] as const
    const infoGroupHeight = infoCards.length * MENU_OVERLAY_UI.CARD_HEIGHT + (infoCards.length - 1) * MENU_OVERLAY_UI.CARD_GAP
    const infoStartY = Math.round((MENU_OVERLAY_UI.CONTENT_HEIGHT - infoGroupHeight) / 2)
    infoCards.forEach(([label, value], index) => {
      this.addInfoCard(MENU_OVERLAY_UI.PAGE_RIGHT_X, infoStartY + index * (MENU_OVERLAY_UI.CARD_HEIGHT + MENU_OVERLAY_UI.CARD_GAP), label, value)
    })
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
    this.normalizePartyDetailSelection()
    this.renderParty()
  }

  private renderParty(): void {
    this.normalizePartyDetailSelection()
    this.clearContent()
    this.renderHeader('队伍', '角色状态与装备概览')
    this.renderPartyCards(true)
    this.renderSelectedPartyDetail()
    this.renderFeedback()
  }

  private renderPartyCards(interactive: boolean): void {
    this.queueDynamicImageAssets(this.getPartyCharacterImageKeys())
    const members = this.getPartyMembers()
    const cardsPerPage = Math.ceil(members.length / MENU_OVERLAY_UI.PARTY_CARD_PAGES)
    for (let i = 0; i < members.length; i++) {
      const member = members[i]!
      const page = interactive ? 0 : Math.floor(i / cardsPerPage)
      const row = interactive ? i : i % cardsPerPage
      const x = page === 0 ? MENU_OVERLAY_UI.LIST_X : MENU_OVERLAY_UI.PAGE_RIGHT_X
      const y = MENU_OVERLAY_UI.LIST_Y + row * (MENU_OVERLAY_UI.PARTY_CARD_HEIGHT + MENU_OVERLAY_UI.CARD_GAP)
      const selected = interactive && i === this.partyIndex
      const card = this.addContentRect(x, y, MENU_OVERLAY_UI.PARTY_CARD_WIDTH, MENU_OVERLAY_UI.PARTY_CARD_HEIGHT, selected ? MENU_OVERLAY_UI.COLORS.highlightDark : MENU_OVERLAY_UI.COLORS.panelAlt)
      card.setStrokeStyle(MENU_OVERLAY_UI.THIN_BORDER_WIDTH, selected ? MENU_OVERLAY_UI.COLORS.highlight : MENU_OVERLAY_UI.COLORS.borderMuted)
      if (interactive) {
        card.setInteractive()
        card.on('pointerdown', () => {
          this.partyIndex = i
          this.equipmentCharIndex = i
          this.normalizePartyDetailSelection()
          this.renderParty()
        })
      }
      this.addCharacterPortrait(member.charId, x + MENU_OVERLAY_UI.PARTY_CARD_PORTRAIT_SIZE / 2 + MENU_OVERLAY_UI.CARD_GAP, y + MENU_OVERLAY_UI.PARTY_CARD_PORTRAIT_SIZE / 2 + MENU_OVERLAY_UI.CARD_GAP, MENU_OVERLAY_UI.PARTY_CARD_PORTRAIT_SIZE)
      const textX = x + MENU_OVERLAY_UI.PARTY_CARD_PORTRAIT_SIZE + MENU_OVERLAY_UI.CARD_GAP * 2
      const textWidth = MENU_OVERLAY_UI.PARTY_CARD_WIDTH - MENU_OVERLAY_UI.PARTY_CARD_PORTRAIT_SIZE - MENU_OVERLAY_UI.CARD_GAP * 3
      const textY = y + MENU_OVERLAY_UI.CARD_GAP / 2
      const barY = y + MENU_OVERLAY_UI.PARTY_CARD_HEIGHT - MENU_OVERLAY_UI.STATUS_BAR_HEIGHT * 2 - MENU_OVERLAY_UI.CARD_GAP / 2
      this.addText(textX, textY, member.char.name, MENU_OVERLAY_UI.BODY_FONT_SIZE, selected ? MENU_OVERLAY_UI.COLORS.title : MENU_OVERLAY_UI.COLORS.text, textWidth)
      this.addText(textX, textY + MENU_OVERLAY_UI.LINE_HEIGHT - MENU_OVERLAY_UI.CARD_GAP / 2, `Lv.${member.char.stats.level}`, MENU_OVERLAY_UI.CAPTION_FONT_SIZE, MENU_OVERLAY_UI.COLORS.muted)
      this.addStatusBar(textX, barY, member.char.stats.hp, member.char.stats.maxHp, MENU_OVERLAY_UI.COLORS.hp, textWidth)
      this.addStatusBar(textX, barY + MENU_OVERLAY_UI.STATUS_BAR_HEIGHT + MENU_OVERLAY_UI.CARD_GAP / 4, member.char.stats.mp, member.char.stats.maxMp, MENU_OVERLAY_UI.COLORS.mp, textWidth)
    }

    const gd = GameData.getInstance()
    if (!interactive && gd.reserve.length > 0) {
      const names = gd.reserve.map(id => gd.characters.get(id)?.name ?? id).join(' / ')
      this.addText(0, MENU_OVERLAY_UI.FOOTER_Y, `后备：${names}`, MENU_OVERLAY_UI.CAPTION_FONT_SIZE, MENU_OVERLAY_UI.COLORS.muted, MENU_OVERLAY_UI.CONTENT_WIDTH)
    }
  }

  private renderSelectedPartyDetail(): void {
    const member = this.getPartyMembers()[this.partyIndex]
    if (!member) return
    this.equipmentCharIndex = this.partyIndex
    const x = MENU_OVERLAY_UI.PARTY_DETAIL_X
    const y = MENU_OVERLAY_UI.DETAIL_Y
    this.addContentRect(x, y, MENU_OVERLAY_UI.PARTY_DETAIL_WIDTH, MENU_OVERLAY_UI.PARTY_DETAIL_HEIGHT, MENU_OVERLAY_UI.COLORS.panelDeep)
      .setStrokeStyle(MENU_OVERLAY_UI.THIN_BORDER_WIDTH, MENU_OVERLAY_UI.COLORS.borderMuted)
    this.addCharacterPortrait(member.charId, x + MENU_OVERLAY_UI.PORTRAIT_LARGE_SIZE / 2 + MENU_OVERLAY_UI.CARD_GAP, y + MENU_OVERLAY_UI.PORTRAIT_LARGE_SIZE / 2 + MENU_OVERLAY_UI.CARD_GAP, MENU_OVERLAY_UI.PORTRAIT_LARGE_SIZE)
    this.addText(x + MENU_OVERLAY_UI.PORTRAIT_LARGE_SIZE + MENU_OVERLAY_UI.CARD_GAP * 2, y + MENU_OVERLAY_UI.CARD_GAP, `${member.char.name} Lv.${member.char.stats.level}`, MENU_OVERLAY_UI.BODY_FONT_SIZE, MENU_OVERLAY_UI.COLORS.title, MENU_OVERLAY_UI.PARTY_DETAIL_WIDTH - MENU_OVERLAY_UI.PORTRAIT_LARGE_SIZE - MENU_OVERLAY_UI.CARD_GAP * 3)
    this.renderCharacterResources(member.char, x + MENU_OVERLAY_UI.PORTRAIT_LARGE_SIZE + MENU_OVERLAY_UI.CARD_GAP * 2, y + MENU_OVERLAY_UI.LINE_HEIGHT * 2, MENU_OVERLAY_UI.PARTY_DETAIL_WIDTH - MENU_OVERLAY_UI.PORTRAIT_LARGE_SIZE - MENU_OVERLAY_UI.CARD_GAP * 3, false)
    this.renderCharacterStatCards(member.char, x + MENU_OVERLAY_UI.CARD_GAP, y + MENU_OVERLAY_UI.PORTRAIT_LARGE_SIZE + MENU_OVERLAY_UI.CARD_GAP * 2)
    const equipmentY = y + MENU_OVERLAY_UI.PORTRAIT_LARGE_SIZE + MENU_OVERLAY_UI.STAT_CARD_HEIGHT * 2 + MENU_OVERLAY_UI.CARD_GAP * 3
    const rowX = x + MENU_OVERLAY_UI.CARD_GAP
    const rowWidth = MENU_OVERLAY_UI.PARTY_DETAIL_WIDTH - MENU_OVERLAY_UI.CARD_GAP * 2
    this.renderEquipmentSlotRows(member.char, rowX, equipmentY, rowWidth, true)
    this.renderPartyFormationRow(member, rowX, equipmentY + EQUIPMENT_SLOTS.length * (MENU_OVERLAY_UI.EQUIPMENT_SLOT_CARD_HEIGHT + MENU_OVERLAY_UI.CARD_GAP / 2), rowWidth)
  }

  private renderPartyFormationRow(member: PartyMemberView, x: number, y: number, width: number): void {
    const gd = GameData.getInstance()
    const canSwap = this.canSwapSelectedPartyMember()
    const selected = canSwap && this.isPartyFormationSelected()
    const row = this.addContentRect(x, y, width, MENU_OVERLAY_UI.PARTY_FORMATION_CARD_HEIGHT, selected ? MENU_OVERLAY_UI.COLORS.highlightDark : MENU_OVERLAY_UI.COLORS.panelAlt)
    row.setStrokeStyle(MENU_OVERLAY_UI.THIN_BORDER_WIDTH, selected ? MENU_OVERLAY_UI.COLORS.highlight : MENU_OVERLAY_UI.COLORS.borderMuted)
    const textY = y + (MENU_OVERLAY_UI.PARTY_FORMATION_CARD_HEIGHT - MENU_OVERLAY_UI.CAPTION_FONT_SIZE) / 2

    if (this.partyIndex === PARTY_RULES.LEADER_INDEX) {
      this.addText(x + MENU_OVERLAY_UI.CARD_GAP, textY, `队首固定 · ${member.char.name}`, MENU_OVERLAY_UI.CAPTION_FONT_SIZE, MENU_OVERLAY_UI.COLORS.dim, width - MENU_OVERLAY_UI.CARD_GAP * 2)
      return
    }
    if (!canSwap) {
      this.addText(x + MENU_OVERLAY_UI.CARD_GAP, textY, '暂无后备成员', MENU_OVERLAY_UI.CAPTION_FONT_SIZE, MENU_OVERLAY_UI.COLORS.dim, width - MENU_OVERLAY_UI.CARD_GAP * 2)
      return
    }

    const reserveId = gd.reserve[this.reserveIndex]!
    const reserveName = gd.characters.get(reserveId)?.name ?? reserveId
    const arrowWidth = MENU_OVERLAY_UI.RESOURCE_LABEL_WIDTH
    const color = selected ? MENU_OVERLAY_UI.COLORS.title : MENU_OVERLAY_UI.COLORS.text
    const previous = this.addText(x + arrowWidth / 2, textY, '◀', MENU_OVERLAY_UI.CAPTION_FONT_SIZE, color, arrowWidth).setOrigin(0.5, 0)
    const label = this.addText(x + width / 2, textY, `换入 ${reserveName}`, MENU_OVERLAY_UI.CAPTION_FONT_SIZE, color, width - arrowWidth * 2).setOrigin(0.5, 0)
    const next = this.addText(x + width - arrowWidth / 2, textY, '▶', MENU_OVERLAY_UI.CAPTION_FONT_SIZE, color, arrowWidth).setOrigin(0.5, 0)
    bindTouchText(previous, () => {
      this.equipmentSlotIndex = EQUIPMENT_SLOTS.length
      this.moveReserve(-1)
    })
    bindTouchText(label, () => {
      this.equipmentSlotIndex = EQUIPMENT_SLOTS.length
      this.confirmPartyFormation()
    })
    bindTouchText(next, () => {
      this.equipmentSlotIndex = EQUIPMENT_SLOTS.length
      this.moveReserve(1)
    })
  }

  private renderInventorySummary(): void {
    this.renderHeader('背包', '物品与装备')
    this.inventoryEntries = this.getInventoryEntries()
    this.queueDynamicImageAssets(getInventoryEntryImageKeys(this.inventoryEntries))
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
    this.queueDynamicImageAssets(getInventoryEntryImageKeys(this.inventoryEntries))
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
      const row = this.addContentRect(MENU_OVERLAY_UI.LIST_X, y, MENU_OVERLAY_UI.LIST_PANEL_WIDTH, MENU_OVERLAY_UI.LIST_ROW_HEIGHT - MENU_OVERLAY_UI.CARD_GAP / 2, selected ? MENU_OVERLAY_UI.COLORS.highlightDark : MENU_OVERLAY_UI.COLORS.panelAlt)
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
      const qtyX = MENU_OVERLAY_UI.LIST_QTY_X
      const qtyY = y + MENU_OVERLAY_UI.CARD_GAP / 2
      this.addContentRect(qtyX, qtyY, MENU_OVERLAY_UI.INVENTORY_QTY_BADGE_WIDTH, MENU_OVERLAY_UI.INVENTORY_QTY_BADGE_HEIGHT, MENU_OVERLAY_UI.COLORS.panelDeep)
        .setStrokeStyle(MENU_OVERLAY_UI.THIN_BORDER_WIDTH, MENU_OVERLAY_UI.COLORS.borderMuted)
      this.addText(qtyX + MENU_OVERLAY_UI.CARD_GAP / 2, qtyY + MENU_OVERLAY_UI.CARD_GAP / 4, `x${entry.quantity}`, MENU_OVERLAY_UI.CAPTION_FONT_SIZE, MENU_OVERLAY_UI.COLORS.accent, MENU_OVERLAY_UI.INVENTORY_QTY_BADGE_WIDTH - MENU_OVERLAY_UI.CARD_GAP)
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
    const bonuses = this.formatEquipmentBonuses(entry.itemId)
    if (bonuses) {
      this.addText(MENU_OVERLAY_UI.DETAIL_X + MENU_OVERLAY_UI.CARD_GAP, MENU_OVERLAY_UI.EQUIPMENT_BONUS_Y, bonuses, MENU_OVERLAY_UI.CAPTION_FONT_SIZE, MENU_OVERLAY_UI.COLORS.success, MENU_OVERLAY_UI.DETAIL_WIDTH - MENU_OVERLAY_UI.CARD_GAP * 2)
    }
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
    this.queueDynamicImageAssets(this.getPartyCharacterImageKeys())
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
    this.addText(MENU_OVERLAY_UI.PAGE_RIGHT_X, MENU_OVERLAY_UI.TAB_Y, item.description, MENU_OVERLAY_UI.BODY_FONT_SIZE, MENU_OVERLAY_UI.COLORS.text, MENU_OVERLAY_UI.PAGE_RIGHT_WIDTH)

    const members = this.getPartyMembers()
    this.targetIndex = this.clampIndex(this.targetIndex, members.length)
    for (let i = 0; i < members.length; i++) {
      const member = members[i]!
      const selected = i === this.targetIndex
      const y = MENU_OVERLAY_UI.TARGET_Y + i * MENU_OVERLAY_UI.TARGET_ROW_HEIGHT
      const row = this.addContentRect(MENU_OVERLAY_UI.LIST_X, y, MENU_OVERLAY_UI.LIST_PANEL_WIDTH, MENU_OVERLAY_UI.TARGET_ROW_HEIGHT - MENU_OVERLAY_UI.CARD_GAP, selected ? MENU_OVERLAY_UI.COLORS.highlightDark : MENU_OVERLAY_UI.COLORS.panelAlt)
      row.setStrokeStyle(MENU_OVERLAY_UI.THIN_BORDER_WIDTH, selected ? MENU_OVERLAY_UI.COLORS.highlight : MENU_OVERLAY_UI.COLORS.borderMuted)
      row.setInteractive()
      row.on('pointerdown', () => {
        this.targetIndex = i
        this.renderInventoryTarget()
        this.confirmInventoryTarget()
      })
      this.addCharacterPortrait(member.charId, MENU_OVERLAY_UI.PORTRAIT_SIZE / 2 + MENU_OVERLAY_UI.CARD_GAP, y + MENU_OVERLAY_UI.PORTRAIT_SIZE / 2 + MENU_OVERLAY_UI.CARD_GAP / 2, MENU_OVERLAY_UI.PORTRAIT_SIZE)
      this.addText(MENU_OVERLAY_UI.PORTRAIT_SIZE + MENU_OVERLAY_UI.CARD_GAP * 2, y + MENU_OVERLAY_UI.CARD_GAP / 2, member.char.name, MENU_OVERLAY_UI.BODY_FONT_SIZE, selected ? MENU_OVERLAY_UI.COLORS.title : MENU_OVERLAY_UI.COLORS.text)
      this.addText(MENU_OVERLAY_UI.PORTRAIT_SIZE + MENU_OVERLAY_UI.CARD_GAP * 2, y + MENU_OVERLAY_UI.LINE_HEIGHT + MENU_OVERLAY_UI.CARD_GAP / 2, `HP ${member.char.stats.hp}/${member.char.stats.maxHp}`, MENU_OVERLAY_UI.CAPTION_FONT_SIZE, MENU_OVERLAY_UI.COLORS.muted, MENU_OVERLAY_UI.LIST_PANEL_WIDTH - MENU_OVERLAY_UI.PORTRAIT_SIZE - MENU_OVERLAY_UI.CARD_GAP * 3)
      this.addText(MENU_OVERLAY_UI.PORTRAIT_SIZE + MENU_OVERLAY_UI.CARD_GAP * 2, y + MENU_OVERLAY_UI.LINE_HEIGHT * 2 + MENU_OVERLAY_UI.CARD_GAP / 2, `MP ${member.char.stats.mp}/${member.char.stats.maxMp}`, MENU_OVERLAY_UI.CAPTION_FONT_SIZE, MENU_OVERLAY_UI.COLORS.muted, MENU_OVERLAY_UI.LIST_PANEL_WIDTH - MENU_OVERLAY_UI.PORTRAIT_SIZE - MENU_OVERLAY_UI.CARD_GAP * 3)
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
    this.renderSkillCharacterCards(interactive)
    const x = MENU_OVERLAY_UI.SKILL_LIST_X
    this.addCharacterPortrait(member.charId, x + MENU_OVERLAY_UI.PORTRAIT_SIZE / 2, MENU_OVERLAY_UI.LIST_Y + MENU_OVERLAY_UI.PORTRAIT_SIZE / 2, MENU_OVERLAY_UI.PORTRAIT_SIZE)
    this.addText(x + MENU_OVERLAY_UI.PORTRAIT_SIZE + MENU_OVERLAY_UI.CARD_GAP, MENU_OVERLAY_UI.LIST_Y, `${member.char.name} Lv.${member.char.stats.level}`, MENU_OVERLAY_UI.TITLE_FONT_SIZE, MENU_OVERLAY_UI.COLORS.title, MENU_OVERLAY_UI.SKILL_LIST_WIDTH - MENU_OVERLAY_UI.PORTRAIT_SIZE - MENU_OVERLAY_UI.CARD_GAP)
    this.addText(x + MENU_OVERLAY_UI.CARD_GAP, MENU_OVERLAY_UI.LIST_Y + MENU_OVERLAY_UI.PORTRAIT_SIZE + MENU_OVERLAY_UI.CARD_GAP / 2, `HP ${member.char.stats.hp}/${member.char.stats.maxHp}  MP ${member.char.stats.mp}/${member.char.stats.maxMp}  TP ${member.char.tp}/${BATTLE_RULES.MAX_TP}`, MENU_OVERLAY_UI.CAPTION_FONT_SIZE, MENU_OVERLAY_UI.COLORS.muted, MENU_OVERLAY_UI.SKILL_LIST_WIDTH - MENU_OVERLAY_UI.CARD_GAP * 2)
    let y = MENU_OVERLAY_UI.LIST_Y + MENU_OVERLAY_UI.PORTRAIT_SIZE + MENU_OVERLAY_UI.LINE_HEIGHT + MENU_OVERLAY_UI.CARD_GAP
    for (const skillId of member.char.skills.slice(0, MENU_OVERLAY_UI.SKILL_VISIBLE_ROWS)) {
      const skill = GAME_CONFIG_DATABASE.getTable('skills')[skillId]
      if (!skill) continue
      const cost = skill.costTp > 0 ? `TP ${skill.costTp}` : `MP ${skill.costMp}`
      this.addContentRect(x, y, MENU_OVERLAY_UI.SKILL_LIST_WIDTH, MENU_OVERLAY_UI.SKILL_ROW_HEIGHT, MENU_OVERLAY_UI.COLORS.panelAlt)
        .setStrokeStyle(MENU_OVERLAY_UI.THIN_BORDER_WIDTH, MENU_OVERLAY_UI.COLORS.borderMuted)
      this.addText(x + MENU_OVERLAY_UI.CARD_GAP, y + MENU_OVERLAY_UI.CARD_GAP / 2, skill.name, MENU_OVERLAY_UI.BODY_FONT_SIZE, MENU_OVERLAY_UI.COLORS.text, MENU_OVERLAY_UI.SKILL_LIST_WIDTH - MENU_OVERLAY_UI.INVENTORY_QTY_BADGE_WIDTH - MENU_OVERLAY_UI.CARD_GAP * 3)
      this.addText(x + MENU_OVERLAY_UI.SKILL_LIST_WIDTH - MENU_OVERLAY_UI.INVENTORY_QTY_BADGE_WIDTH, y + MENU_OVERLAY_UI.CARD_GAP / 2, cost, MENU_OVERLAY_UI.CAPTION_FONT_SIZE, MENU_OVERLAY_UI.COLORS.accent, MENU_OVERLAY_UI.INVENTORY_QTY_BADGE_WIDTH)
      this.addText(x + MENU_OVERLAY_UI.CARD_GAP, y + MENU_OVERLAY_UI.LINE_HEIGHT + MENU_OVERLAY_UI.CARD_GAP / 2, skill.description, MENU_OVERLAY_UI.CAPTION_FONT_SIZE, MENU_OVERLAY_UI.COLORS.muted, MENU_OVERLAY_UI.SKILL_LIST_WIDTH - MENU_OVERLAY_UI.CARD_GAP * 2)
      y += MENU_OVERLAY_UI.SKILL_ROW_HEIGHT + MENU_OVERLAY_UI.CARD_GAP / 2
    }
  }

  private renderSkillCharacterCards(interactive: boolean): void {
    const members = this.getPartyMembers()
    for (let i = 0; i < members.length; i++) {
      const member = members[i]!
      const y = MENU_OVERLAY_UI.LIST_Y + i * (MENU_OVERLAY_UI.PARTY_CARD_HEIGHT + MENU_OVERLAY_UI.CARD_GAP / 2)
      const selected = interactive && i === this.skillCharIndex
      const card = this.addContentRect(MENU_OVERLAY_UI.LIST_X, y, MENU_OVERLAY_UI.LIST_PANEL_WIDTH, MENU_OVERLAY_UI.PARTY_CARD_HEIGHT, selected ? MENU_OVERLAY_UI.COLORS.highlightDark : MENU_OVERLAY_UI.COLORS.panelAlt)
      card.setStrokeStyle(MENU_OVERLAY_UI.THIN_BORDER_WIDTH, selected ? MENU_OVERLAY_UI.COLORS.highlight : MENU_OVERLAY_UI.COLORS.borderMuted)
      if (interactive) {
        card.setInteractive()
        card.on('pointerdown', () => {
          this.skillCharIndex = i
          this.renderSkills()
        })
      }
      this.addCharacterPortrait(member.charId, MENU_OVERLAY_UI.PARTY_CARD_PORTRAIT_SIZE / 2 + MENU_OVERLAY_UI.CARD_GAP, y + MENU_OVERLAY_UI.PARTY_CARD_PORTRAIT_SIZE / 2 + MENU_OVERLAY_UI.CARD_GAP, MENU_OVERLAY_UI.PARTY_CARD_PORTRAIT_SIZE)
      this.addText(MENU_OVERLAY_UI.PARTY_CARD_PORTRAIT_SIZE + MENU_OVERLAY_UI.CARD_GAP * 2, y + MENU_OVERLAY_UI.CARD_GAP, member.char.name, MENU_OVERLAY_UI.BODY_FONT_SIZE, selected ? MENU_OVERLAY_UI.COLORS.title : MENU_OVERLAY_UI.COLORS.text, MENU_OVERLAY_UI.LIST_PANEL_WIDTH - MENU_OVERLAY_UI.PARTY_CARD_PORTRAIT_SIZE - MENU_OVERLAY_UI.CARD_GAP * 3)
      this.addText(MENU_OVERLAY_UI.PARTY_CARD_PORTRAIT_SIZE + MENU_OVERLAY_UI.CARD_GAP * 2, y + MENU_OVERLAY_UI.LINE_HEIGHT + MENU_OVERLAY_UI.CARD_GAP, `技能 ${member.char.skills.length}`, MENU_OVERLAY_UI.CAPTION_FONT_SIZE, MENU_OVERLAY_UI.COLORS.muted)
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
    this.equipmentCharIndex = this.clampIndex(this.partyIndex, members.length)
    const member = members[this.equipmentCharIndex]
    if (!member || !this.equipSlot) {
      this.showParty()
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
      const row = this.addContentRect(MENU_OVERLAY_UI.LIST_X, y, MENU_OVERLAY_UI.LIST_PANEL_WIDTH, MENU_OVERLAY_UI.LIST_ROW_HEIGHT - MENU_OVERLAY_UI.CARD_GAP / 2, selected ? MENU_OVERLAY_UI.COLORS.highlightDark : MENU_OVERLAY_UI.COLORS.panelAlt)
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
      this.addText(MENU_OVERLAY_UI.LIST_TEXT_X, y + MENU_OVERLAY_UI.CARD_GAP / 2, itemId === '__unequip__' ? '卸下' : this.getItemName(itemId), MENU_OVERLAY_UI.BODY_FONT_SIZE, selected ? MENU_OVERLAY_UI.COLORS.title : MENU_OVERLAY_UI.COLORS.text, MENU_OVERLAY_UI.LIST_PANEL_WIDTH - MENU_OVERLAY_UI.LIST_TEXT_X - MENU_OVERLAY_UI.CARD_GAP)
      if (itemId !== '__unequip__') {
        this.addText(MENU_OVERLAY_UI.LIST_QTY_X, y + MENU_OVERLAY_UI.CARD_GAP / 2, `x${this.getStoredQuantity(itemId)}`, MENU_OVERLAY_UI.CAPTION_FONT_SIZE, MENU_OVERLAY_UI.COLORS.muted)
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
    this.submenu = 'party'
    this.renderParty()
  }

  private showCodex(): void {
    this.submenu = 'codex'
    this.codexIndex = this.clampIndex(this.codexIndex, this.getCodexListCount())
    this.renderCodex()
  }

  private renderCodexSummary(): void {
    this.renderHeader('图鉴', '怪物 / 物品 / 故事')
    this.renderCodexContent(false)
    this.renderFeedback()
  }

  private renderCodex(): void {
    this.clearContent()
    this.renderHeader('图鉴', '记录已发现的信息')
    this.renderCodexContent(true)
    this.renderFeedback()
  }

  private renderCodexContent(interactive: boolean): void {
    this.renderCodexTabs(interactive)
    this.codexIndex = this.clampIndex(this.codexIndex, this.getCodexListCount())
    this.queueDynamicImageAssets(this.getCodexImageKeys())
    this.renderCodexList(interactive)
    this.renderCodexDetail()
  }

  private renderCodexTabs(interactive: boolean): void {
    for (let i = 0; i < MENU_CODEX_TAB_KEYS.length; i++) {
      const key = MENU_CODEX_TAB_KEYS[i]!
      const selected = i === this.codexTabIndex
      const text = this.addText(i * MENU_OVERLAY_UI.TAB_GAP, MENU_OVERLAY_UI.TAB_Y, MENU_CODEX_TAB_LABELS[key], MENU_OVERLAY_UI.CAPTION_FONT_SIZE, selected ? MENU_OVERLAY_UI.COLORS.title : MENU_OVERLAY_UI.COLORS.muted)
      if (interactive) {
        bindTouchText(text, () => {
          this.codexTabIndex = i
          this.codexIndex = 0
          this.renderCodex()
        })
      }
    }
  }

  private renderCodexList(interactive: boolean): void {
    const visibleRows = MENU_OVERLAY_UI.CODEX_VISIBLE_ROWS
    const pageStart = Math.floor(this.codexIndex / visibleRows) * visibleRows
    const pageCount = this.getCodexListCount()
    for (let i = 0; i < Math.min(visibleRows, pageCount - pageStart); i++) {
      const index = pageStart + i
      const selected = interactive && index === this.codexIndex
      const y = MENU_OVERLAY_UI.LIST_Y + i * MENU_OVERLAY_UI.CODEX_ROW_HEIGHT
      const row = this.addContentRect(MENU_OVERLAY_UI.LIST_X, y, MENU_OVERLAY_UI.LIST_PANEL_WIDTH, MENU_OVERLAY_UI.CODEX_ROW_HEIGHT - MENU_OVERLAY_UI.CARD_GAP / 2, selected ? MENU_OVERLAY_UI.COLORS.highlightDark : MENU_OVERLAY_UI.COLORS.panelAlt)
      row.setStrokeStyle(MENU_OVERLAY_UI.THIN_BORDER_WIDTH, selected ? MENU_OVERLAY_UI.COLORS.highlight : MENU_OVERLAY_UI.COLORS.borderMuted)
      if (interactive) {
        row.setInteractive()
        row.on('pointerdown', () => {
          this.codexIndex = index
          this.renderCodex()
        })
      }
      const tab = this.getCodexTab()
      const itemId = tab === 'items' ? this.getDiscoveredItems()[index] : undefined
      const enemyId = tab === 'monsters' ? this.getDiscoveredEnemies()[index] : undefined
      if (itemId) {
        this.addItemIcon(itemId, MENU_OVERLAY_UI.ICON_SIZE / 2 + MENU_OVERLAY_UI.CARD_GAP / 2, y + MENU_OVERLAY_UI.ICON_SIZE / 2, MENU_OVERLAY_UI.ICON_SIZE)
      } else if (enemyId) {
        this.addEnemyIcon(enemyId, MENU_OVERLAY_UI.CODEX_ENEMY_ICON_SIZE / 2 + MENU_OVERLAY_UI.CARD_GAP / 2, y + MENU_OVERLAY_UI.CODEX_ENEMY_ICON_SIZE / 2 + MENU_OVERLAY_UI.CARD_GAP / 4, MENU_OVERLAY_UI.CODEX_ENEMY_ICON_SIZE)
      }
      this.addText(itemId || enemyId ? MENU_OVERLAY_UI.LIST_TEXT_X : MENU_OVERLAY_UI.CARD_GAP, y + MENU_OVERLAY_UI.CARD_GAP / 2, this.getCodexRowLabel(index), MENU_OVERLAY_UI.CAPTION_FONT_SIZE, selected ? MENU_OVERLAY_UI.COLORS.title : this.getCodexRowColor(index), MENU_OVERLAY_UI.LIST_PANEL_WIDTH - MENU_OVERLAY_UI.LIST_TEXT_X - MENU_OVERLAY_UI.CARD_GAP)
    }
  }

  private renderCodexDetail(): void {
    this.addContentRect(MENU_OVERLAY_UI.DETAIL_X, MENU_OVERLAY_UI.CODEX_DETAIL_Y, MENU_OVERLAY_UI.DETAIL_WIDTH, MENU_OVERLAY_UI.CODEX_ROW_HEIGHT * MENU_OVERLAY_UI.CODEX_VISIBLE_ROWS - MENU_OVERLAY_UI.CARD_GAP / 2, MENU_OVERLAY_UI.COLORS.panelDeep)
      .setStrokeStyle(MENU_OVERLAY_UI.THIN_BORDER_WIDTH, MENU_OVERLAY_UI.COLORS.borderMuted)
    const tab = this.getCodexTab()
    if (tab === 'monsters') {
      this.renderCodexEnemyDetail()
      return
    }
    if (tab === 'items') {
      this.renderCodexItemDetail()
      return
    }
    this.renderCodexStoryDetail()
  }

  private renderCodexEnemyDetail(): void {
    const enemyId = this.getDiscoveredEnemies()[this.codexIndex]
    const enemy = enemyId ? GAME_CONFIG_DATABASE.getTable('enemies')[enemyId] : undefined
    if (!enemyId || !enemy) {
      this.addText(MENU_OVERLAY_UI.DETAIL_X + MENU_OVERLAY_UI.CARD_GAP, MENU_OVERLAY_UI.CODEX_DETAIL_Y + MENU_OVERLAY_UI.CARD_GAP, '尚未发现怪物', MENU_OVERLAY_UI.CAPTION_FONT_SIZE, MENU_OVERLAY_UI.COLORS.muted, MENU_OVERLAY_UI.DETAIL_WIDTH - MENU_OVERLAY_UI.CARD_GAP * 2)
      return
    }
    this.addEnemyIcon(enemyId, MENU_OVERLAY_UI.DETAIL_X + MENU_OVERLAY_UI.DETAIL_WIDTH / 2, MENU_OVERLAY_UI.CODEX_DETAIL_Y + MENU_OVERLAY_UI.CODEX_ENEMY_IMAGE_SIZE / 2 + MENU_OVERLAY_UI.CARD_GAP, MENU_OVERLAY_UI.CODEX_ENEMY_IMAGE_SIZE)
    const textY = MENU_OVERLAY_UI.CODEX_DETAIL_Y + MENU_OVERLAY_UI.CODEX_ENEMY_IMAGE_SIZE + MENU_OVERLAY_UI.CARD_GAP * 2
    this.addText(MENU_OVERLAY_UI.DETAIL_X + MENU_OVERLAY_UI.CARD_GAP, textY, enemy.name, MENU_OVERLAY_UI.BODY_FONT_SIZE, enemy.isBoss ? MENU_OVERLAY_UI.COLORS.danger : MENU_OVERLAY_UI.COLORS.title, MENU_OVERLAY_UI.DETAIL_WIDTH - MENU_OVERLAY_UI.CARD_GAP * 2)
    this.addText(MENU_OVERLAY_UI.DETAIL_X + MENU_OVERLAY_UI.CARD_GAP, textY + MENU_OVERLAY_UI.LINE_HEIGHT, `HP ${enemy.stats.maxHp} / MP ${enemy.stats.maxMp}`, MENU_OVERLAY_UI.CAPTION_FONT_SIZE, MENU_OVERLAY_UI.COLORS.text, MENU_OVERLAY_UI.DETAIL_WIDTH - MENU_OVERLAY_UI.CARD_GAP * 2)
    this.addText(MENU_OVERLAY_UI.DETAIL_X + MENU_OVERLAY_UI.CARD_GAP, textY + MENU_OVERLAY_UI.LINE_HEIGHT * 2, `ATK ${enemy.stats.atk}  DEF ${enemy.stats.def}`, MENU_OVERLAY_UI.CAPTION_FONT_SIZE, MENU_OVERLAY_UI.COLORS.text, MENU_OVERLAY_UI.DETAIL_WIDTH - MENU_OVERLAY_UI.CARD_GAP * 2)
    this.addText(MENU_OVERLAY_UI.DETAIL_X + MENU_OVERLAY_UI.CARD_GAP, textY + MENU_OVERLAY_UI.LINE_HEIGHT * 3, `属性 ${enemy.element}`, MENU_OVERLAY_UI.CAPTION_FONT_SIZE, MENU_OVERLAY_UI.COLORS.accent, MENU_OVERLAY_UI.DETAIL_WIDTH - MENU_OVERLAY_UI.CARD_GAP * 2)
    this.addText(MENU_OVERLAY_UI.DETAIL_X + MENU_OVERLAY_UI.CARD_GAP, textY + MENU_OVERLAY_UI.LINE_HEIGHT * 4, `弱点 ${enemy.weakness.join(' / ') || '无'}`, MENU_OVERLAY_UI.CAPTION_FONT_SIZE, MENU_OVERLAY_UI.COLORS.success, MENU_OVERLAY_UI.DETAIL_WIDTH - MENU_OVERLAY_UI.CARD_GAP * 2)
  }

  private renderCodexItemDetail(): void {
    const itemId = this.getDiscoveredItems()[this.codexIndex]
    const item = itemId ? this.getItems()[itemId] : undefined
    if (!item || !itemId) {
      this.addText(MENU_OVERLAY_UI.DETAIL_X + MENU_OVERLAY_UI.CARD_GAP, MENU_OVERLAY_UI.CODEX_DETAIL_Y + MENU_OVERLAY_UI.CARD_GAP, '尚未获得物品', MENU_OVERLAY_UI.CAPTION_FONT_SIZE, MENU_OVERLAY_UI.COLORS.muted, MENU_OVERLAY_UI.DETAIL_WIDTH - MENU_OVERLAY_UI.CARD_GAP * 2)
      return
    }
    this.addItemIcon(itemId, MENU_OVERLAY_UI.DETAIL_X + MENU_OVERLAY_UI.ICON_SIZE, MENU_OVERLAY_UI.CODEX_DETAIL_Y + MENU_OVERLAY_UI.ICON_SIZE, MENU_OVERLAY_UI.ICON_SIZE * 2)
    this.addText(MENU_OVERLAY_UI.DETAIL_X + MENU_OVERLAY_UI.CARD_GAP, MENU_OVERLAY_UI.CODEX_DETAIL_Y + MENU_OVERLAY_UI.ICON_SIZE * 2 + MENU_OVERLAY_UI.CARD_GAP, item.name, MENU_OVERLAY_UI.BODY_FONT_SIZE, MENU_OVERLAY_UI.COLORS.title, MENU_OVERLAY_UI.DETAIL_WIDTH - MENU_OVERLAY_UI.CARD_GAP * 2)
    this.addText(MENU_OVERLAY_UI.DETAIL_X + MENU_OVERLAY_UI.CARD_GAP, MENU_OVERLAY_UI.CODEX_DETAIL_Y + MENU_OVERLAY_UI.ICON_SIZE * 2 + MENU_OVERLAY_UI.LINE_HEIGHT + MENU_OVERLAY_UI.CARD_GAP, this.getItemTypeLabel(itemId, item), MENU_OVERLAY_UI.CAPTION_FONT_SIZE, MENU_OVERLAY_UI.COLORS.accent)
    this.addText(MENU_OVERLAY_UI.DETAIL_X + MENU_OVERLAY_UI.CARD_GAP, MENU_OVERLAY_UI.CODEX_DETAIL_Y + MENU_OVERLAY_UI.ICON_SIZE * 2 + MENU_OVERLAY_UI.LINE_HEIGHT * 2 + MENU_OVERLAY_UI.CARD_GAP, item.description, MENU_OVERLAY_UI.CAPTION_FONT_SIZE, MENU_OVERLAY_UI.COLORS.text, MENU_OVERLAY_UI.DETAIL_WIDTH - MENU_OVERLAY_UI.CARD_GAP * 2)
    const bonuses = this.formatEquipmentBonuses(itemId)
    if (bonuses) {
      this.addText(MENU_OVERLAY_UI.DETAIL_X + MENU_OVERLAY_UI.CARD_GAP, MENU_OVERLAY_UI.EQUIPMENT_BONUS_Y, bonuses, MENU_OVERLAY_UI.CAPTION_FONT_SIZE, MENU_OVERLAY_UI.COLORS.success, MENU_OVERLAY_UI.DETAIL_WIDTH - MENU_OVERLAY_UI.CARD_GAP * 2)
    }
  }

  private renderCodexStoryDetail(): void {
    const prophecies = GAME_CONFIG_DATABASE.getTable('prophecies')
    if (this.codexIndex < CODEX_STORY_BRANCH_COUNT) {
      this.addText(MENU_OVERLAY_UI.DETAIL_X + MENU_OVERLAY_UI.CARD_GAP, MENU_OVERLAY_UI.CODEX_DETAIL_Y + MENU_OVERLAY_UI.CARD_GAP, '故事分支记录', MENU_OVERLAY_UI.BODY_FONT_SIZE, MENU_OVERLAY_UI.COLORS.title, MENU_OVERLAY_UI.DETAIL_WIDTH - MENU_OVERLAY_UI.CARD_GAP * 2)
      this.addText(MENU_OVERLAY_UI.DETAIL_X + MENU_OVERLAY_UI.CARD_GAP, MENU_OVERLAY_UI.CODEX_DETAIL_Y + MENU_OVERLAY_UI.LINE_HEIGHT * 2, '这里记录旅途选择对信任、慈悲与结局路线的影响。', MENU_OVERLAY_UI.CAPTION_FONT_SIZE, MENU_OVERLAY_UI.COLORS.text, MENU_OVERLAY_UI.DETAIL_WIDTH - MENU_OVERLAY_UI.CARD_GAP * 2)
      return
    }
    const codexEntries = getUnlockedStoryCodexEntries(GameData.getInstance().unlockedCodex)
    const codexEntryIndex = this.codexIndex - CODEX_STORY_BRANCH_COUNT
    const codexEntry = codexEntries[codexEntryIndex]
    if (codexEntry) {
      this.addText(MENU_OVERLAY_UI.DETAIL_X + MENU_OVERLAY_UI.CARD_GAP, MENU_OVERLAY_UI.CODEX_DETAIL_Y + MENU_OVERLAY_UI.CARD_GAP, codexEntry.title, MENU_OVERLAY_UI.BODY_FONT_SIZE, MENU_OVERLAY_UI.COLORS.title, MENU_OVERLAY_UI.DETAIL_WIDTH - MENU_OVERLAY_UI.CARD_GAP * 2)
      this.addText(MENU_OVERLAY_UI.DETAIL_X + MENU_OVERLAY_UI.CARD_GAP, MENU_OVERLAY_UI.CODEX_DETAIL_Y + MENU_OVERLAY_UI.LINE_HEIGHT * 2, STORY_CODEX_CATEGORY_LABELS[codexEntry.category], MENU_OVERLAY_UI.CAPTION_FONT_SIZE, MENU_OVERLAY_UI.COLORS.accent, MENU_OVERLAY_UI.DETAIL_WIDTH - MENU_OVERLAY_UI.CARD_GAP * 2)
      this.addText(MENU_OVERLAY_UI.DETAIL_X + MENU_OVERLAY_UI.CARD_GAP, MENU_OVERLAY_UI.CODEX_DETAIL_Y + MENU_OVERLAY_UI.LINE_HEIGHT * 4, codexEntry.description, MENU_OVERLAY_UI.CAPTION_FONT_SIZE, MENU_OVERLAY_UI.COLORS.text, MENU_OVERLAY_UI.DETAIL_WIDTH - MENU_OVERLAY_UI.CARD_GAP * 2)
      return
    }
    const prophecy = prophecies[codexEntryIndex - codexEntries.length]
    if (!prophecy) return
    const gd = GameData.getInstance()
    const conditionMet = isProphecyConditionMet(prophecy.condition)
    this.addText(MENU_OVERLAY_UI.DETAIL_X + MENU_OVERLAY_UI.CARD_GAP, MENU_OVERLAY_UI.CODEX_DETAIL_Y + MENU_OVERLAY_UI.CARD_GAP, prophecy.chapter, MENU_OVERLAY_UI.BODY_FONT_SIZE, conditionMet ? MENU_OVERLAY_UI.COLORS.title : MENU_OVERLAY_UI.COLORS.muted, MENU_OVERLAY_UI.DETAIL_WIDTH - MENU_OVERLAY_UI.CARD_GAP * 2)
    if (!conditionMet) {
      this.addText(MENU_OVERLAY_UI.DETAIL_X + MENU_OVERLAY_UI.CARD_GAP, MENU_OVERLAY_UI.CODEX_DETAIL_Y + MENU_OVERLAY_UI.LINE_HEIGHT * 2, '尚未满足揭示条件。', MENU_OVERLAY_UI.CAPTION_FONT_SIZE, MENU_OVERLAY_UI.COLORS.muted, MENU_OVERLAY_UI.DETAIL_WIDTH - MENU_OVERLAY_UI.CARD_GAP * 2)
      return
    }
    const hintMode = gd.settings.prophecyHint
    const hintText = hintMode === 'poem' ? '仅显示预言' : hintMode === 'clear' ? prophecy.explicit : prophecy.hint
    this.addText(MENU_OVERLAY_UI.DETAIL_X + MENU_OVERLAY_UI.CARD_GAP, MENU_OVERLAY_UI.CODEX_DETAIL_Y + MENU_OVERLAY_UI.LINE_HEIGHT * 2, prophecy.verse, MENU_OVERLAY_UI.CAPTION_FONT_SIZE, MENU_OVERLAY_UI.COLORS.text, MENU_OVERLAY_UI.DETAIL_WIDTH - MENU_OVERLAY_UI.CARD_GAP * 2)
    this.addText(MENU_OVERLAY_UI.DETAIL_X + MENU_OVERLAY_UI.CARD_GAP, MENU_OVERLAY_UI.CODEX_DETAIL_Y + MENU_OVERLAY_UI.LINE_HEIGHT * 6, `提示：${hintText}`, MENU_OVERLAY_UI.CAPTION_FONT_SIZE, MENU_OVERLAY_UI.COLORS.accent, MENU_OVERLAY_UI.DETAIL_WIDTH - MENU_OVERLAY_UI.CARD_GAP * 2)
  }

  private showSettings(): void {
    this.submenu = 'settings'
    this.settingsIndex = this.clampIndex(this.settingsIndex, MENU_SETTINGS_OPTIONS.length)
    this.renderSettings()
  }

  private renderSettingsSummary(): void {
    this.renderHeader('设置', '游戏参数')
    this.renderSettingsContent(false)
    this.renderFeedback()
  }

  private renderSettings(): void {
    this.clearContent()
    this.renderHeader('设置', '调整游戏参数')
    this.renderSettingsContent(true)
    this.renderFeedback()
  }

  private renderSettingsContent(interactive: boolean): void {
    const { fontSize, rowHeight, visibleRows } = this.getSettingsLayout()
    const pageStart = Math.floor(this.settingsIndex / visibleRows) * visibleRows
    const start = interactive ? pageStart : 0
    const end = Math.min(MENU_SETTINGS_OPTIONS.length, start + visibleRows)
    for (let i = start; i < end; i++) {
      const config = MENU_SETTINGS_OPTIONS[i]!
      const selected = interactive && i === this.settingsIndex
      const rowIndex = i - start
      const y = MENU_OVERLAY_UI.SETTINGS_ROW_Y + rowIndex * rowHeight
      const rowPanelHeight = rowHeight - MENU_OVERLAY_UI.CARD_GAP / 2
      const textY = y + Math.max(MENU_OVERLAY_UI.CARD_GAP / 3, (rowHeight - fontSize) / 2)
      const labelRow = this.addContentRect(0, y, MENU_OVERLAY_UI.SETTINGS_LABEL_PANEL_WIDTH, rowPanelHeight, selected ? MENU_OVERLAY_UI.COLORS.highlightDark : MENU_OVERLAY_UI.COLORS.panelAlt)
      const valueRow = this.addContentRect(MENU_OVERLAY_UI.SETTINGS_VALUE_PANEL_X, y, MENU_OVERLAY_UI.SETTINGS_VALUE_PANEL_WIDTH, rowPanelHeight, selected ? MENU_OVERLAY_UI.COLORS.highlightDark : MENU_OVERLAY_UI.COLORS.panelAlt)
      for (const row of [labelRow, valueRow]) {
        row.setStrokeStyle(MENU_OVERLAY_UI.THIN_BORDER_WIDTH, selected ? MENU_OVERLAY_UI.COLORS.highlight : MENU_OVERLAY_UI.COLORS.borderMuted)
        if (interactive) {
          row.setInteractive()
          const activationEvent = config.key === 'fullscreen'
            ? Phaser.Input.Events.POINTER_UP
            : Phaser.Input.Events.POINTER_DOWN
          row.on(activationEvent, () => {
            this.settingsIndex = i
            this.renderSettings()
            this.confirmSetting()
          })
        }
      }
      this.addText(MENU_OVERLAY_UI.CARD_GAP, textY, config.label, fontSize, selected ? MENU_OVERLAY_UI.COLORS.title : MENU_OVERLAY_UI.COLORS.text, MENU_OVERLAY_UI.SETTINGS_LABEL_PANEL_WIDTH - MENU_OVERLAY_UI.CARD_GAP * 2)
      this.addText(MENU_OVERLAY_UI.SETTINGS_VALUE_X, textY, this.getSettingValueText(config), fontSize, MENU_OVERLAY_UI.COLORS.accent, MENU_OVERLAY_UI.CONTENT_WIDTH - MENU_OVERLAY_UI.SETTINGS_VALUE_X - MENU_OVERLAY_UI.CARD_GAP)
      if (config.type === 'slider') {
        this.renderSettingSlider(config.key, y, rowHeight, fontSize)
      }
    }
    if (MENU_SETTINGS_OPTIONS.length > visibleRows) {
      this.addText(MENU_OVERLAY_UI.SETTINGS_PAGE_TEXT_X, MENU_OVERLAY_UI.FOOTER_Y, `${start + 1}-${end}/${MENU_SETTINGS_OPTIONS.length}`, fontSize, MENU_OVERLAY_UI.COLORS.dim)
        .setOrigin(0.5, 0)
      if (interactive) {
        const previous = this.addText(MENU_OVERLAY_UI.SETTINGS_PAGE_PREVIOUS_X, MENU_OVERLAY_UI.FOOTER_Y, '‹', fontSize, MENU_OVERLAY_UI.COLORS.accent)
          .setOrigin(0.5, 0)
        const next = this.addText(MENU_OVERLAY_UI.SETTINGS_PAGE_NEXT_X, MENU_OVERLAY_UI.FOOTER_Y, '›', fontSize, MENU_OVERLAY_UI.COLORS.accent)
          .setOrigin(0.5, 0)
        bindTouchText(previous, () => this.moveSettingsPage(-1))
        bindTouchText(next, () => this.moveSettingsPage(1))
      }
    }
  }

  private showSave(): void {
    this.submenu = 'save'
    this.loadMode = false
    this.saveIndex = 0
    this.renderSave()
  }

  private renderSaveSummary(): void {
    this.renderHeader('存读档', '保存 / 读取')
    this.renderSaveRows(false)
    this.renderFeedback()
  }

  private renderSave(): void {
    this.clearContent()
    this.renderHeader(this.loadMode ? '读取存档' : '保存存档', this.loadMode ? '选择槽位或快速存档' : '选择槽位，或切换读取')
    this.renderSaveRows(true)
    this.renderFeedback()
  }

  private renderSaveRows(interactive: boolean): void {
    const rows = this.getSaveRows()
    this.saveIndex = this.clampIndex(this.saveIndex, rows.length)
    for (let i = 0; i < rows.length; i++) {
      const selected = interactive && i === this.saveIndex
      const y = MENU_OVERLAY_UI.SAVE_ROW_Y + i * MENU_OVERLAY_UI.SAVE_ROW_HEIGHT
      const row = this.addContentRect(MENU_OVERLAY_UI.LIST_X, y, MENU_OVERLAY_UI.LIST_PANEL_WIDTH, MENU_OVERLAY_UI.SAVE_ROW_HEIGHT - MENU_OVERLAY_UI.CARD_GAP / 2, selected ? MENU_OVERLAY_UI.COLORS.highlightDark : MENU_OVERLAY_UI.COLORS.panelAlt)
      row.setStrokeStyle(MENU_OVERLAY_UI.THIN_BORDER_WIDTH, selected ? MENU_OVERLAY_UI.COLORS.highlight : MENU_OVERLAY_UI.COLORS.borderMuted)
      if (interactive) {
        row.setInteractive()
        row.on('pointerdown', () => {
          this.saveIndex = i
          this.renderSave()
          this.confirmSave()
        })
      }
      this.addText(MENU_OVERLAY_UI.CARD_GAP, y + MENU_OVERLAY_UI.CARD_GAP / 2, rows[i]!, MENU_OVERLAY_UI.BODY_FONT_SIZE, selected ? MENU_OVERLAY_UI.COLORS.title : MENU_OVERLAY_UI.COLORS.text, MENU_OVERLAY_UI.LIST_PANEL_WIDTH - MENU_OVERLAY_UI.CARD_GAP * 2)
    }
  }

  private confirmSave(): void {
    if (this.loadMode) {
      const loadSlots = getLoadSaveSlots(true)
      const selectedSlot = loadSlots[this.saveIndex]
      if (!selectedSlot) {
        this.loadMode = false
        this.saveIndex = 0
        this.renderSave()
        return
      }
      this.doLoad(selectedSlot)
      return
    }

    const manualSaveSlots = getManualSaveSlots()
    const selectedSlot = manualSaveSlots[this.saveIndex]
    if (selectedSlot) {
      this.doSave(selectedSlot)
      return
    }
    if (this.saveIndex === manualSaveSlots.length) {
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
    if (this.loadTransition.active) return
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
    this.completeSuccessfulLoadTransition()
  }

  private completeSuccessfulLoadTransition(): void {
    completeLoadedSaveTransition(
      this.loadTransition,
      () => EventBus.emit(GameEvents.SAVE_LOADED),
      () => this.scene.stop(),
    )
  }

  private getSaveRows(): string[] {
    const sm = SaveManager.getInstance()
    return buildSaveRows(this.loadMode, slot => sm.getMeta(slot))
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
    this.equipmentCharIndex = this.partyIndex
    this.normalizePartyDetailSelection()
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

  private moveEquipmentSlot(dir: number): void {
    const count = this.getPartyDetailActionCount()
    this.equipmentSlotIndex = (this.equipmentSlotIndex + dir + count) % count
    this.renderParty()
    AudioManager.getInstance().playSFX('cursor')
  }

  private moveReserve(dir: number): void {
    const count = GameData.getInstance().reserve.length
    if (count === 0) return
    this.reserveIndex = (this.reserveIndex + dir + count) % count
    this.renderParty()
    AudioManager.getInstance().playSFX('cursor')
  }

  private confirmPartyFormation(): void {
    const gd = GameData.getInstance()
    const activeId = gd.party[this.partyIndex]
    const reserveId = gd.reserve[this.reserveIndex]
    if (!activeId || !reserveId || !gd.swapActiveWithReserve(activeId, reserveId)) {
      this.setFeedback('当前成员不能调整编队')
      this.renderParty()
      AudioManager.getInstance().playSFX('cancel')
      return
    }

    const activeName = gd.characters.get(activeId)?.name ?? activeId
    const reserveName = gd.characters.get(reserveId)?.name ?? reserveId
    this.reserveIndex = this.clampIndex(this.reserveIndex, gd.reserve.length)
    this.setFeedback(`${reserveName} 换入队伍，${activeName} 转为后备`)
    this.renderParty()
    AudioManager.getInstance().playSFX('confirm')
  }

  private canSwapSelectedPartyMember(): boolean {
    const gd = GameData.getInstance()
    return this.partyIndex > PARTY_RULES.LEADER_INDEX && gd.reserve.length > 0
  }

  private isPartyFormationSelected(): boolean {
    return this.canSwapSelectedPartyMember() && this.equipmentSlotIndex === EQUIPMENT_SLOTS.length
  }

  private getPartyDetailActionCount(): number {
    return EQUIPMENT_SLOTS.length + (this.canSwapSelectedPartyMember() ? 1 : 0)
  }

  private normalizePartyDetailSelection(): void {
    this.equipmentSlotIndex = this.clampIndex(this.equipmentSlotIndex, this.getPartyDetailActionCount())
    this.reserveIndex = this.clampIndex(this.reserveIndex, GameData.getInstance().reserve.length)
  }

  private moveEquipList(dir: number): void {
    if (this.equipList.length === 0) return
    this.equipListIndex = (this.equipListIndex + dir + this.equipList.length) % this.equipList.length
    this.renderEquipList()
    AudioManager.getInstance().playSFX('cursor')
  }

  private moveCodex(dir: number): void {
    const count = this.getCodexListCount()
    if (count === 0) return
    this.codexIndex = (this.codexIndex + dir + count) % count
    this.renderCodex()
    AudioManager.getInstance().playSFX('cursor')
  }

  private moveCodexTab(dir: number): void {
    this.codexTabIndex = (this.codexTabIndex + dir + MENU_CODEX_TAB_KEYS.length) % MENU_CODEX_TAB_KEYS.length
    this.codexIndex = 0
    this.renderCodex()
    AudioManager.getInstance().playSFX('cursor')
  }

  private moveSave(dir: number): void {
    const rows = this.getSaveRows()
    this.saveIndex = (this.saveIndex + dir + rows.length) % rows.length
    this.renderSave()
    AudioManager.getInstance().playSFX('cursor')
  }

  private moveSettings(dir: number): void {
    this.settingsIndex = (this.settingsIndex + dir + MENU_SETTINGS_OPTIONS.length) % MENU_SETTINGS_OPTIONS.length
    this.renderSettings()
    AudioManager.getInstance().playSFX('cursor')
  }

  private moveSettingsPage(dir: number): void {
    const { visibleRows } = this.getSettingsLayout()
    const pageCount = Math.ceil(MENU_SETTINGS_OPTIONS.length / visibleRows)
    const currentPage = Math.floor(this.settingsIndex / visibleRows)
    const nextPage = (currentPage + dir + pageCount) % pageCount
    this.settingsIndex = Math.min(nextPage * visibleRows, MENU_SETTINGS_OPTIONS.length - 1)
    this.renderSettings()
    AudioManager.getInstance().playSFX('cursor')
  }

  private changeSetting(dir: number): void {
    const config = MENU_SETTINGS_OPTIONS[this.settingsIndex]
    if (!config) return
    if (config.key === 'controlMode' || config.key === 'gamepad' || config.key === 'resetKeys') return
    const settings = GameData.getInstance().settings as Record<string, unknown>
    if (config.type === 'select') {
      const options = config.options as readonly string[]
      const currentIndex = options.indexOf(settings[config.key] as string)
      const nextIndex = (currentIndex + dir + options.length) % options.length
      settings[config.key] = options[nextIndex]!
      SettingsManager.getInstance().save()
      this.renderSettings()
      AudioManager.getInstance().playSFX('cursor')
      return
    }
    if (config.type === 'slider') {
      const current = typeof settings[config.key] === 'number' ? settings[config.key] as number : config.min
      const next = Phaser.Math.Clamp(current + dir * config.step, config.min, config.max)
      settings[config.key] = Math.round(next * MENU_OVERLAY_UI.SETTINGS_SLIDER_DECIMAL_FACTOR) / MENU_OVERLAY_UI.SETTINGS_SLIDER_DECIMAL_FACTOR
      SettingsManager.getInstance().save()
      AudioManager.getInstance().updateVolume()
      this.renderSettings()
      AudioManager.getInstance().playSFX('cursor')
    }
  }

  private confirmSetting(): void {
    const config = MENU_SETTINGS_OPTIONS[this.settingsIndex]
    if (!config) return
    if (config.key === 'controlMode') {
      const input = InputManager.getInstance()
      if (input.isWASDMode()) {
        input.resetToDefault()
      } else {
        input.setWASD()
      }
      this.renderSettings()
      AudioManager.getInstance().playSFX('confirm')
      return
    }
    if (config.key === 'gamepad') {
      const input = InputManager.getInstance()
      input.setGamepadEnabled(!input.isGamepadEnabled())
      this.renderSettings()
      AudioManager.getInstance().playSFX('confirm')
      return
    }
    if (config.key === 'resetKeys') {
      InputManager.getInstance().resetToDefault()
      this.renderSettings()
      AudioManager.getInstance().playSFX('confirm')
      return
    }
    if (config.type === 'toggle') {
      const settings = GameData.getInstance().settings as Record<string, unknown>
      const enabled = !settings[config.key]
      settings[config.key] = enabled
      SettingsManager.getInstance().save()
      if (config.key === 'fullscreen') {
        if (enabled) {
          this.scale.startFullscreen()
        } else {
          this.scale.stopFullscreen()
        }
      }
      this.renderSettings()
      AudioManager.getInstance().playSFX('confirm')
      return
    }
    this.changeSetting(1)
  }

  private getPartyMembers(): PartyMemberView[] {
    return listPartyMembers(GameData.getInstance())
  }

  private getInventoryEntries(): InventoryEntry[] {
    return buildInventoryEntries(
      GameData.getInstance(),
      this.getItems(),
      getInventoryCategory(this.inventoryCategoryIndex),
    )
  }

  private getCodexTab() {
    return resolveCodexTab(this.codexTabIndex)
  }

  private getCodexListCount(): number {
    const gd = GameData.getInstance()
    return buildCodexListCount(
      gd,
      this.getCodexTab(),
      this.getDiscoveredEnemies(),
      this.getDiscoveredItems(),
    )
  }

  private getDiscoveredEnemies(): string[] {
    return listDiscoveredEnemies(GameData.getInstance())
  }

  private getDiscoveredItems(): string[] {
    const gd = GameData.getInstance()
    return listDiscoveredItems(gd, this.getItems(), listPartyMembers(gd))
  }

  private getCodexRowLabel(index: number): string {
    const gd = GameData.getInstance()
    return resolveCodexRowLabel({
      gd,
      tab: this.getCodexTab(),
      index,
      discoveredEnemies: this.getDiscoveredEnemies(),
      discoveredItems: this.getDiscoveredItems(),
      items: this.getItems(),
      partyMembers: listPartyMembers(gd),
    })
  }

  private getCodexRowColor(index: number): string {
    return resolveCodexRowColor(this.getCodexTab(), index, this.getDiscoveredEnemies())
  }

  private getOwnedItemQuantity(itemId: string): number {
    return resolveOwnedItemQuantity(GameData.getInstance(), this.getPartyMembers(), itemId)
  }

  private getEquipmentCandidates(slot: EquipmentSlot): string[] {
    return listEquipmentCandidates(
      this.getInventoryEntries(),
      itemId => this.getStoredQuantity(itemId),
      slot,
    )
  }

  private getStoredQuantity(itemId: string): number {
    return GameData.getInstance().getItemQuantity(itemId)
  }

  private removeStoredItem(itemId: string): boolean {
    return GameData.getInstance().removeItem(itemId, 1)
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
      this.applyFieldEffect(itemId, effect, char)
    }
    AudioManager.getInstance().playSFX('item_use')
    return true
  }

  private canApplyFieldEffect(effect: string, char: CharacterData): boolean {
    return canApplyConsumableEffect(effect, [{
      hp: char.stats.hp,
      maxHp: char.stats.maxHp,
      mp: char.stats.mp,
      maxMp: char.stats.maxMp,
    }])
  }

  private applyFieldEffect(itemId: string, effect: string, char: CharacterData): void {
    if (effect.startsWith(BATTLE_RULES.HEAL_HP_EFFECT_PREFIX)) {
      const baseAmount = this.parseEffectAmount(effect, BATTLE_RULES.HEAL_HP_EFFECT_PREFIX)
      const amount = resolveItemRecoveryAmount(itemId, char.id, baseAmount)
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

  private renderCharacterResources(char: CharacterData, x: number, y: number, width: number, includeExtendedMeters = true): void {
    this.addLabeledStatusBar(x, y, 'HP', char.stats.hp, char.stats.maxHp, MENU_OVERLAY_UI.COLORS.hp, width)
    this.addLabeledStatusBar(x, y + MENU_OVERLAY_UI.RESOURCE_ROW_HEIGHT, 'MP', char.stats.mp, char.stats.maxMp, MENU_OVERLAY_UI.COLORS.mp, width)
    if (!includeExtendedMeters) return
    this.addLabeledStatusBar(x, y + MENU_OVERLAY_UI.RESOURCE_ROW_HEIGHT * 2, 'TP', char.tp, BATTLE_RULES.MAX_TP, MENU_OVERLAY_UI.COLORS.exp, width)
    this.addLabeledStatusBar(x, y + MENU_OVERLAY_UI.RESOURCE_ROW_HEIGHT * 3, 'EXP', char.stats.exp, char.stats.expToNext, MENU_OVERLAY_UI.COLORS.accentBar, width)
  }

  private renderCharacterStatCards(char: CharacterData, x: number, y: number): void {
    const entries = Object.entries(CHARACTER_STAT_LABELS) as [CharacterStatKey, string][]
    for (let i = 0; i < entries.length; i++) {
      const [key, label] = entries[i]!
      const column = i % MENU_OVERLAY_UI.STAT_CARD_COLUMNS
      const row = Math.floor(i / MENU_OVERLAY_UI.STAT_CARD_COLUMNS)
      const cardX = x + column * (MENU_OVERLAY_UI.STAT_CARD_WIDTH + MENU_OVERLAY_UI.STAT_CARD_GAP)
      const cardY = y + row * (MENU_OVERLAY_UI.STAT_CARD_HEIGHT + MENU_OVERLAY_UI.STAT_CARD_GAP)
      this.addContentRect(cardX, cardY, MENU_OVERLAY_UI.STAT_CARD_WIDTH, MENU_OVERLAY_UI.STAT_CARD_HEIGHT, MENU_OVERLAY_UI.COLORS.panelAlt)
        .setStrokeStyle(MENU_OVERLAY_UI.THIN_BORDER_WIDTH, MENU_OVERLAY_UI.COLORS.borderMuted)
      this.addText(cardX + MENU_OVERLAY_UI.CARD_GAP / 2, cardY + MENU_OVERLAY_UI.CARD_GAP / 3, label, MENU_OVERLAY_UI.SMALL_FONT_SIZE, MENU_OVERLAY_UI.COLORS.muted, MENU_OVERLAY_UI.STAT_CARD_WIDTH - MENU_OVERLAY_UI.CARD_GAP)
      this.addText(cardX + MENU_OVERLAY_UI.CARD_GAP / 2, cardY + MENU_OVERLAY_UI.LINE_HEIGHT, `${char.stats[key]}`, MENU_OVERLAY_UI.BODY_FONT_SIZE, MENU_OVERLAY_UI.COLORS.title, MENU_OVERLAY_UI.STAT_CARD_WIDTH - MENU_OVERLAY_UI.CARD_GAP)
    }
  }

  private renderEquipmentSlotRows(char: CharacterData, x: number, y: number, width: number, interactive: boolean): void {
    for (let i = 0; i < EQUIPMENT_SLOTS.length; i++) {
      const slot = EQUIPMENT_SLOTS[i]!
      const itemId = char.equipment[slot]
      const selected = interactive && i === this.equipmentSlotIndex
      const rowY = y + i * (MENU_OVERLAY_UI.EQUIPMENT_SLOT_CARD_HEIGHT + MENU_OVERLAY_UI.CARD_GAP / 2)
      const row = this.addContentRect(x, rowY, width, MENU_OVERLAY_UI.EQUIPMENT_SLOT_CARD_HEIGHT, selected ? MENU_OVERLAY_UI.COLORS.highlightDark : MENU_OVERLAY_UI.COLORS.panelAlt)
      row.setStrokeStyle(MENU_OVERLAY_UI.THIN_BORDER_WIDTH, selected ? MENU_OVERLAY_UI.COLORS.highlight : MENU_OVERLAY_UI.COLORS.borderMuted)
      if (interactive) {
        row.setInteractive()
        row.on('pointerdown', () => {
          this.equipmentSlotIndex = i
          this.equipmentCharIndex = this.partyIndex
          this.showEquipList()
        })
      }
      this.addText(x + MENU_OVERLAY_UI.CARD_GAP, rowY + MENU_OVERLAY_UI.CARD_GAP / 2, EQUIPMENT_SLOT_LABELS[slot], MENU_OVERLAY_UI.CAPTION_FONT_SIZE, selected ? MENU_OVERLAY_UI.COLORS.title : MENU_OVERLAY_UI.COLORS.muted, MENU_OVERLAY_UI.RESOURCE_LABEL_WIDTH)
      if (itemId) {
        this.addItemIcon(itemId, x + MENU_OVERLAY_UI.RESOURCE_LABEL_WIDTH + MENU_OVERLAY_UI.EQUIPMENT_SLOT_ICON_SIZE / 2, rowY + MENU_OVERLAY_UI.EQUIPMENT_SLOT_CARD_HEIGHT / 2, MENU_OVERLAY_UI.EQUIPMENT_SLOT_ICON_SIZE)
      }
      this.addText(x + MENU_OVERLAY_UI.RESOURCE_LABEL_WIDTH + MENU_OVERLAY_UI.EQUIPMENT_SLOT_ICON_SIZE + MENU_OVERLAY_UI.CARD_GAP, rowY + MENU_OVERLAY_UI.CARD_GAP / 2, itemId ? this.getItemName(itemId) : '空', MENU_OVERLAY_UI.CAPTION_FONT_SIZE, MENU_OVERLAY_UI.COLORS.text, width - MENU_OVERLAY_UI.RESOURCE_LABEL_WIDTH - MENU_OVERLAY_UI.EQUIPMENT_SLOT_ICON_SIZE - MENU_OVERLAY_UI.CARD_GAP * 2)
    }
  }

  private getSettingValueText(config: typeof MENU_SETTINGS_OPTIONS[number]): string {
    const input = InputManager.getInstance()
    return resolveSettingValueText(
      config,
      GameData.getInstance().settings as Record<string, unknown>,
      {
        isWASDMode: input.isWASDMode(),
        isGamepadEnabled: input.isGamepadEnabled(),
      },
    )
  }

  private renderSettingSlider(configKey: string, y: number, rowHeight: number, fontSize: number): void {
    const config = MENU_SETTINGS_OPTIONS.find(option => option.key === configKey)
    if (!config || config.type !== 'slider') return
    const value = (GameData.getInstance().settings as Record<string, unknown>)[config.key]
    const numberValue = typeof value === 'number' ? value : config.min
    const ratio = (numberValue - config.min) / (config.max - config.min)
    const valueColumnWidth = Math.max(
      MENU_OVERLAY_UI.RESOURCE_LABEL_WIDTH,
      fontSize * MENU_OVERLAY_UI.SETTINGS_SLIDER_VALUE_COLUMN_EM,
    )
    const x = MENU_OVERLAY_UI.SETTINGS_VALUE_X + valueColumnWidth
    const barY = y + rowHeight / 2
    this.addContentRect(x, barY, MENU_OVERLAY_UI.SETTINGS_BAR_WIDTH, MENU_OVERLAY_UI.SETTINGS_BAR_HEIGHT, MENU_OVERLAY_UI.COLORS.panelDeep)
    this.addContentRect(x, barY, MENU_OVERLAY_UI.SETTINGS_BAR_WIDTH * Phaser.Math.Clamp(ratio, 0, 1), MENU_OVERLAY_UI.SETTINGS_BAR_HEIGHT, MENU_OVERLAY_UI.COLORS.accentBar)
  }

  private renderHeader(title: string, subtitle: string): void {
    this.addText(0, MENU_OVERLAY_UI.HEADER_Y, title, MENU_OVERLAY_UI.TITLE_FONT_SIZE, MENU_OVERLAY_UI.COLORS.title, MENU_OVERLAY_UI.PAGE_LEFT_WIDTH, UI_TITLE_FONT_FAMILY)
    this.addText(0, MENU_OVERLAY_UI.HEADER_Y + MENU_OVERLAY_UI.LINE_HEIGHT + MENU_OVERLAY_UI.CARD_GAP / 2, subtitle, MENU_OVERLAY_UI.CAPTION_FONT_SIZE, MENU_OVERLAY_UI.COLORS.muted, MENU_OVERLAY_UI.PAGE_LEFT_WIDTH)
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
    const shouldUseTexturedPanel = this.textures.exists(RUNTIME_UI_ASSET_KEYS.CARD)
      && width >= MENU_OVERLAY_UI.TEXTURED_RECT_MIN_WIDTH
      && height >= MENU_OVERLAY_UI.TEXTURED_RECT_MIN_HEIGHT
    if (shouldUseTexturedPanel) {
      const image = this.add.image(x, y, RUNTIME_UI_ASSET_KEYS.CARD)
      image.setOrigin(0)
      image.setDisplaySize(width, height)
      image.setAlpha(MENU_OVERLAY_UI.PANEL_ALPHA)
      image.setScrollFactor(0)
      this.contentArea.add(image)
    }

    const rect = this.add.rectangle(x, y, width, height, color, shouldUseTexturedPanel ? MENU_OVERLAY_UI.TEXTURED_RECT_OVERLAY_ALPHA : MENU_OVERLAY_UI.PANEL_ALPHA)
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

  private addEnemyIcon(enemyId: string, x: number, y: number, size: number): void {
    const key = this.getEnemyIconKey(enemyId)
    const textureKey = this.textures.exists(key) ? key : this.textures.exists(DEFAULT_ENEMY_SPRITE_KEY) ? DEFAULT_ENEMY_SPRITE_KEY : null
    this.addContentRect(x - size / 2, y - size / 2, size, size, MENU_OVERLAY_UI.COLORS.panelDeep)
      .setStrokeStyle(MENU_OVERLAY_UI.THIN_BORDER_WIDTH, MENU_OVERLAY_UI.COLORS.borderMuted)
    if (!textureKey) return
    const image = this.add.image(x, y, textureKey)
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

  private addStatusBar(x: number, y: number, value: number, maxValue: number, color: number, width = MENU_OVERLAY_UI.STATUS_BAR_WIDTH): void {
    const ratio = maxValue > 0 ? Phaser.Math.Clamp(value / maxValue, 0, 1) : 0
    this.addContentRect(x, y, width, MENU_OVERLAY_UI.STATUS_BAR_HEIGHT, MENU_OVERLAY_UI.COLORS.panelDeep)
    this.addContentRect(x, y, width * ratio, MENU_OVERLAY_UI.STATUS_BAR_HEIGHT, color)
  }

  private addLabeledStatusBar(x: number, y: number, label: string, value: number, maxValue: number, color: number, width: number): void {
    const barX = x + MENU_OVERLAY_UI.RESOURCE_LABEL_WIDTH + MENU_OVERLAY_UI.RESOURCE_VALUE_WIDTH + MENU_OVERLAY_UI.CARD_GAP / 2
    const barWidth = Math.max(0, width - MENU_OVERLAY_UI.RESOURCE_LABEL_WIDTH - MENU_OVERLAY_UI.RESOURCE_VALUE_WIDTH - MENU_OVERLAY_UI.CARD_GAP / 2)
    this.addText(x, y - MENU_OVERLAY_UI.CARD_GAP / 4, label, MENU_OVERLAY_UI.SMALL_FONT_SIZE, MENU_OVERLAY_UI.COLORS.muted, MENU_OVERLAY_UI.RESOURCE_LABEL_WIDTH)
    this.addText(x + MENU_OVERLAY_UI.RESOURCE_LABEL_WIDTH, y - MENU_OVERLAY_UI.CARD_GAP / 4, `${value}/${maxValue}`, MENU_OVERLAY_UI.SMALL_FONT_SIZE, MENU_OVERLAY_UI.COLORS.text, MENU_OVERLAY_UI.RESOURCE_VALUE_WIDTH)
    this.addStatusBar(barX, y, value, maxValue, color, barWidth)
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
    else if (this.submenu === 'equip-list') this.renderEquipList()
    else if (this.submenu === 'codex') this.renderCodex()
    else if (this.submenu === 'save') this.renderSave()
    else if (this.submenu === 'settings') this.renderSettings()
  }

  private getSettingsLayout() {
    return resolveSettingsLayout(cssPx => cssToGamePx(this, cssPx))
  }

  private handleSettingsResize(): void {
    if (!this.scene.isActive()) return
    if (this.submenu === 'settings') {
      this.renderSettings()
      return
    }
    if (this.submenu === 'main' && this.navIndex === MENU_NAV_INDEX.SETTINGS) {
      this.clearContent()
      this.renderSettingsSummary()
    }
  }

  private clearContent(): void {
    this.contentArea.removeAll(true)
  }

  private getItemIconKey(itemId: string): string {
    return resolveItemIconKey(itemId)
  }

  private getEnemyIconKey(enemyId: string): string {
    return resolveEnemyIconKey(enemyId)
  }

  private getItemName(itemId: string): string {
    return resolveItemName(this.getItems(), itemId)
  }

  private getItemTypeLabel(itemId: string, item: ItemData): string {
    return resolveItemTypeLabel(itemId, item)
  }

  private isEquipmentItem(itemId: string, item: ItemData): boolean {
    return checkIsEquipmentItem(itemId, item)
  }

  private formatEquipmentBonuses(itemId: string): string {
    return formatItemEquipmentBonuses(itemId)
  }

  private clampIndex(index: number, length: number): number {
    if (length <= 0) return 0
    return Phaser.Math.Clamp(index, 0, length - 1)
  }

  private closeMenu(): void {
    if (this.loadTransition.active) return
    AudioManager.getInstance().playSFX('close_menu')
    EventBus.emit(GameEvents.MENU_CLOSE)
    this.scene.stop()
  }
}
