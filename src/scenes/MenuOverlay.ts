import Phaser from 'phaser'
import { EventBus, GameEvents } from '../core/EventBus'
import { GameData, EQUIP_SLOT_MAP } from '../core/GameData'
import { QuestSystem } from '../core/QuestSystem'
import { SaveManager } from '../core/SaveManager'
import { AudioManager } from '../core/AudioManager'
import { QUESTS } from '../data/quests'
import { SKILLS } from '../data/skills'
import { ITEMS } from '../data/items'
import { GAME_WIDTH, GAME_HEIGHT, SAVE_SLOTS } from '../utils/constants'
import type { CharacterData, ItemData } from '../data/types'

export class MenuOverlay extends Phaser.Scene {
  private menuIndex = 0
  private menuItems: Phaser.GameObjects.Text[] = []
  private cursor!: Phaser.GameObjects.Rectangle
  private contentArea!: Phaser.GameObjects.Container
  private submenu = 'main' // main | party | items | save | settings | prophecy | skills | equipment
  private equipCharIndex = 0
  private equipSlot: 'weapon' | 'armor' | 'accessory' | null = null
  private equipList: string[] = []
  private equipCursorIndex = 0
  private itemCursorIndex = 0
  private itemList: [string, number][] = []
  private loadCursorIndex = 0
  private loadMode = false
  private skillCharIndex = 0

  constructor() {
    super({ key: 'MenuOverlay', active: false })
  }

  create(): void {
    this.menuIndex = 0
    this.submenu = 'main'
    this.equipCharIndex = 0
    this.equipSlot = null
    this.equipCursorIndex = 0
    this.itemCursorIndex = 0
    this.loadCursorIndex = 0
    this.skillCharIndex = 0

    AudioManager.getInstance().playSFX('open_menu')

    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.5)
    overlay.setDepth(400)
    overlay.setScrollFactor(0)

    const panel = this.add.rectangle(200, GAME_HEIGHT / 2, 240, 400, 0x2a2a3e, 0.95)
    panel.setStrokeStyle(2, 0x5a5a7e)
    panel.setDepth(401)
    panel.setScrollFactor(0)

    const contentPanel = this.add.rectangle(620, GAME_HEIGHT / 2, 520, 400, 0x2a2a3e, 0.95)
    contentPanel.setStrokeStyle(2, 0x5a5a7e)
    contentPanel.setDepth(401)
    contentPanel.setScrollFactor(0)

    this.contentArea = this.add.container(420, 80)
    this.contentArea.setDepth(402)
    this.contentArea.setScrollFactor(0)

    this.showMainMenu()
    this.setupInput()
  }

  private showMainMenu(): void {
    this.clearMenu()
    this.submenu = 'main'
    const items = ['预言之书', '队伍', '背包', '技能', '装备', '图鉴', '地图', '存档', '设置', '返回游戏']
    const startY = 100
    for (let i = 0; i < items.length; i++) {
      const text = this.add.text(100, startY + i * 44, items[i]!, {
        fontSize: '20px',
        color: '#c0c0d0',
      })
      text.setDepth(402)
      text.setScrollFactor(0)
      this.menuItems.push(text)
    }
    this.cursor = this.add.rectangle(85, startY + 10, 10, 10, 0xf1c40f)
    this.cursor.setDepth(403)
    this.cursor.setScrollFactor(0)
    this.menuIndex = 0
    this.updateContent()
  }

  private clearMenu(): void {
    for (const item of this.menuItems) item.destroy()
    this.menuItems = []
    this.cursor?.destroy()
    this.contentArea.removeAll(true)
  }

  private setupInput(): void {
    this.input.keyboard?.on('keydown-UP', () => this.handleUp())
    this.input.keyboard?.on('keydown-DOWN', () => this.handleDown())
    this.input.keyboard?.on('keydown-ENTER', () => this.handleConfirm())
    this.input.keyboard?.on('keydown-SPACE', () => this.handleConfirm())
    this.input.keyboard?.on('keydown-ESC', () => this.handleCancel())
    this.input.keyboard?.on('keydown-LEFT', () => this.handleLeft())
    this.input.keyboard?.on('keydown-RIGHT', () => this.handleRight())
  }

  private handleUp(): void {
    if (this.submenu === 'equipment' && this.equipSlot) {
      this.equipCursorIndex = (this.equipCursorIndex - 1 + this.equipList.length) % this.equipList.length
      this.refreshEquipListCursor()
      AudioManager.getInstance().playSFX('cursor')
      return
    }
    if (this.submenu === 'items-use') {
      this.itemCursorIndex = (this.itemCursorIndex - 1 + this.menuItems.length) % this.menuItems.length
      this.refreshItemCursor()
      AudioManager.getInstance().playSFX('cursor')
      return
    }
    if (this.submenu === 'load') {
      const count = this.getSaveLoadMenuCount()
      this.loadCursorIndex = (this.loadCursorIndex - 1 + count) % count
      this.refreshLoadCursor()
      AudioManager.getInstance().playSFX('cursor')
      return
    }
    this.menuIndex = (this.menuIndex - 1 + this.menuItems.length) % this.menuItems.length
    this.cursor.setY(this.menuItems[this.menuIndex]!.y + 10)
    AudioManager.getInstance().playSFX('cursor')
    this.updateContent()
  }

  private handleDown(): void {
    if (this.submenu === 'equipment' && this.equipSlot) {
      this.equipCursorIndex = (this.equipCursorIndex + 1) % this.equipList.length
      this.refreshEquipListCursor()
      AudioManager.getInstance().playSFX('cursor')
      return
    }
    if (this.submenu === 'items-use') {
      this.itemCursorIndex = (this.itemCursorIndex + 1) % this.menuItems.length
      this.refreshItemCursor()
      AudioManager.getInstance().playSFX('cursor')
      return
    }
    if (this.submenu === 'load') {
      const count = this.getSaveLoadMenuCount()
      this.loadCursorIndex = (this.loadCursorIndex + 1) % count
      this.refreshLoadCursor()
      AudioManager.getInstance().playSFX('cursor')
      return
    }
    this.menuIndex = (this.menuIndex + 1 + this.menuItems.length) % this.menuItems.length
    this.cursor.setY(this.menuItems[this.menuIndex]!.y + 10)
    AudioManager.getInstance().playSFX('cursor')
    this.updateContent()
  }

  private handleLeft(): void {
    if (this.submenu === 'equipment' && !this.equipSlot) {
      this.equipCharIndex = (this.equipCharIndex - 1 + this.getPartyCount()) % this.getPartyCount()
      this.refreshEquipmentView()
      AudioManager.getInstance().playSFX('cursor')
      return
    }
    if (this.submenu === 'skills') {
      this.skillCharIndex = (this.skillCharIndex - 1 + this.getPartyCount()) % this.getPartyCount()
      this.refreshSkillsView()
      AudioManager.getInstance().playSFX('cursor')
      return
    }
  }

  private handleRight(): void {
    if (this.submenu === 'equipment' && !this.equipSlot) {
      this.equipCharIndex = (this.equipCharIndex + 1) % this.getPartyCount()
      this.refreshEquipmentView()
      AudioManager.getInstance().playSFX('cursor')
      return
    }
    if (this.submenu === 'skills') {
      this.skillCharIndex = (this.skillCharIndex + 1) % this.getPartyCount()
      this.refreshSkillsView()
      AudioManager.getInstance().playSFX('cursor')
      return
    }
  }

  private getPartyCount(): number {
    return GameData.getInstance().party.length
  }

  private handleConfirm(): void {
    if (this.submenu === 'main') {
      this.selectMenu()
      return
    }
    if (this.submenu === 'items') {
      if (this.menuIndex === 0) {
        this.showItemUseList()
      } else {
        this.showMainMenu()
      }
      AudioManager.getInstance().playSFX('confirm')
      return
    }
    if (this.submenu === 'equipment' && !this.equipSlot) {
      if (this.menuIndex >= 3) {
        this.showMainMenu()
        return
      }
      const slots: ('weapon' | 'armor' | 'accessory')[] = ['weapon', 'armor', 'accessory']
      const slot = slots[this.menuIndex]
      if (!slot) return
      this.equipSlot = slot
      this.showEquipList()
      AudioManager.getInstance().playSFX('confirm')
      return
    }
    if (this.submenu === 'equipment' && this.equipSlot) {
      this.equipSelectedItem()
      AudioManager.getInstance().playSFX('confirm')
      return
    }
    if (this.submenu === 'skills') {
      this.showMainMenu()
      AudioManager.getInstance().playSFX('confirm')
      return
    }
    if (this.submenu === 'items-use') {
      this.useSelectedItem()
      AudioManager.getInstance().playSFX('confirm')
      return
    }
    if (this.submenu === 'load') {
      const maxIdx = this.getSaveLoadMenuCount() - 1
      if (this.loadCursorIndex > maxIdx) {
        this.showMainMenu()
        return
      }
      if (this.loadMode) {
        this.doLoad(this.loadCursorIndex)
      } else {
        this.doSave(this.loadCursorIndex)
      }
      AudioManager.getInstance().playSFX('confirm')
      return
    }
  }

  private handleCancel(): void {
    if (this.submenu === 'equipment' && this.equipSlot) {
      this.equipSlot = null
      this.equipList = []
      this.showEquipment()
      AudioManager.getInstance().playSFX('cancel')
      return
    }
    if (this.submenu === 'items-use') {
      this.showItems()
      AudioManager.getInstance().playSFX('cancel')
      return
    }
    if (this.submenu !== 'main') {
      AudioManager.getInstance().playSFX('cancel')
      this.showMainMenu()
      return
    }
    this.closeMenu()
  }

  private selectMenu(): void {
    AudioManager.getInstance().playSFX('confirm')
    switch (this.menuIndex) {
      case 0: this.showProphecyBook(); break
      case 1: this.showParty(); break
      case 2: this.showItems(); break
      case 3: this.showSkills(); break
      case 4: this.showEquipment(); break
      case 5: this.launchScene('CodexOverlay'); break
      case 6: this.launchScene('WorldMapOverlay'); break
      case 7: this.showSaveLoad(); break
      case 8: this.showSettings(); break
      case 9: this.closeMenu(); break
    }
  }

  private updateContent(): void {
    this.contentArea.removeAll(true)
    if (this.submenu !== 'main') return

    const gd = GameData.getInstance()
    switch (this.menuIndex) {
      case 0: {
        const qs = QuestSystem.getInstance()
        const active = qs.getActiveQuests()
        this.addContentText('当前任务：', 0)
        if (active.length === 0) {
          this.addContentText('（无）', 30)
        } else {
          let qy = 30
          for (const q of active) {
            const def = QUESTS[q.id]
            this.addContentText(`${def?.name || q.id} (${q.progress}/${q.maxProgress})`, qy)
            qy += 24
            if (def && q.progress < def.objectives.length) {
              this.addContentText(`  -> ${def.objectives[q.progress]}`, qy)
              qy += 24
            }
          }
        }
        this.addContentText(`重建等级: Lv.${gd.rebuildLevel}`, 140)
        this.addContentText(`悲悯值: ${gd.branches.mercy_score}`, 170)
        this.addContentText(`金币: ${gd.gold}`, 200)
        break
      }
      case 1: {
        let y = 0
        for (const id of gd.party) {
          const char = gd.characters.get(id)
          if (char) {
            this.addContentText(`${char.name} Lv.${char.stats.level}`, y)
            this.addContentText(`HP ${char.stats.hp}/${char.stats.maxHp} MP ${char.stats.mp}/${char.stats.maxMp}`, y + 24)
            y += 70
          }
        }
        break
      }
      case 2: {
        this.addContentText('持有道具：', 0)
        let iy = 30
        for (const [itemId, qty] of Object.entries(gd.inventory.items)) {
          const item = ITEMS[itemId]
          this.addContentText(`${item?.name || itemId} x${qty}`, iy)
          iy += 24
        }
        if (iy === 30) this.addContentText('（无）', iy)
        break
      }
      case 7: {
        this.addContentText('按确认键进入存档/读档', 0)
        const sm = SaveManager.getInstance()
        for (let i = 1; i <= 3; i++) {
          const meta = sm.getMeta(i)
          const text = meta
            ? `槽位${i}: ${meta.preview} ${this.formatTime(meta.playTime)}`
            : `槽位${i}: 空`
          this.addContentText(text, 30 + (i - 1) * 30)
        }
        break
      }
    }
  }

  private addContentText(text: string, y: number): void {
    const t = this.add.text(0, y, text, {
      fontSize: '16px',
      color: '#e8e8f0',
    })
    t.setDepth(402)
    this.contentArea.add(t)
  }

  private addMenuText(text: string, y: number): Phaser.GameObjects.Text {
    const t = this.add.text(100, y, text, {
      fontSize: '18px',
      color: '#c0c0d0',
    })
    t.setDepth(402)
    t.setScrollFactor(0)
    this.menuItems.push(t)
    return t
  }

  private showProphecyBook(): void {
    this.submenu = 'prophecy'
    this.clearMenu()
    const gd = GameData.getInstance()
    const qs = QuestSystem.getInstance()
    const active = qs.getActiveQuests()

    this.addContentText('预言之书', 0)
    this.addContentText('', 30)

    // Dynamic prophecy content based on current quest
    if (active.length > 0) {
      const q = active[0]!
      const def = QUESTS[q.id]
      if (def) {
        this.addContentText(`当前预言：${def.name}`, 50)
        this.addContentText(`「${def.description}」`, 80)
        if (q.progress < def.objectives.length) {
          this.addContentText(`目标：${def.objectives[q.progress]}`, 120)
        }
      }
    } else {
      this.addContentText('当前预言：旧梦难缠，烟容丝淡...', 50)
      this.addContentText('烟容丝淡，凌寒旧时雨。', 80)
      this.addContentText('元帘未卷，仙鸡催晓，终将谁人到？', 110)
    }

    this.addContentText('', 160)
    this.addContentText(`重建等级: Lv.${gd.rebuildLevel}`, 180)
    this.addContentText(`悲悯值: ${gd.branches.mercy_score}`, 210)
    this.addContentText(`信赖 - 慧慧:${gd.branches.trust_huihui} A:${gd.branches.trust_a} 葱葱:${gd.branches.trust_congcong} sun:${gd.branches.trust_sun}`, 240)

    this.addContentText('', 280)
    this.addContentText('按 ESC 返回', 310)
  }

  private showParty(): void {
    this.submenu = 'party'
    this.clearMenu()
    const gd = GameData.getInstance()
    let y = 0
    for (const id of gd.party) {
      const char = gd.characters.get(id)
      if (!char) continue
      this.addContentText(`${char.name} Lv.${char.stats.level}`, y)
      this.addContentText(`HP ${char.stats.hp}/${char.stats.maxHp} MP ${char.stats.mp}/${char.stats.maxMp}`, y + 24)
      this.addContentText(`ATK ${char.stats.atk} DEF ${char.stats.def}`, y + 48)
      this.addContentText(`MATK ${char.stats.matk} MDEF ${char.stats.mdef} SPD ${char.stats.speed}`, y + 72)
      y += 120
    }
    if (gd.reserve.length > 0) {
      this.addContentText(`后备: ${gd.reserve.map(id => gd.characters.get(id)?.name || id).join(', ')}`, y)
    }
    this.addContentText('按 ESC 返回', 340)
  }

  private showItems(): void {
    this.submenu = 'items'
    this.clearMenu()
    const gd = GameData.getInstance()

    this.menuItems = []
    const items = ['使用道具', '返回']
    for (let i = 0; i < items.length; i++) {
      this.addMenuText(items[i]!, 100 + i * 44)
    }
    this.cursor = this.add.rectangle(85, 100 + 10, 10, 10, 0xf1c40f)
    this.cursor.setDepth(403)
    this.cursor.setScrollFactor(0)
    this.menuIndex = 0

    this.contentArea.removeAll(true)
    this.addContentText('背包', 0)
    let y = 30
    for (const [itemId, qty] of Object.entries(gd.inventory.items)) {
      const item = ITEMS[itemId]
      if (item) {
        this.addContentText(`${item.name} x${qty} - ${item.description}`, y)
        y += 24
      }
    }
    if (y === 30) this.addContentText('（空）', y)
  }

  private showItemUseList(): void {
    this.submenu = 'items-use'
    this.clearMenu()
    const gd = GameData.getInstance()

    this.itemList = Object.entries(gd.inventory.items).filter(([itemId]) => {
      const item = ITEMS[itemId]
      return item && item.type === 'consumable' && item.usableInField
    })

    this.menuItems = []
    for (let i = 0; i < this.itemList.length; i++) {
      const [itemId, qty] = this.itemList[i]!
      const item = ITEMS[itemId]
      this.addMenuText(`${item?.name || itemId} x${qty}`, 100 + i * 36)
    }
    if (this.itemList.length === 0) {
      this.addMenuText('（无可用道具）', 100)
    }
    this.addMenuText('返回', 100 + this.itemList.length * 36 + 10)

    this.itemCursorIndex = 0
    this.cursor = this.add.rectangle(85, 100 + 10, 10, 10, 0xf1c40f)
    this.cursor.setDepth(403)
    this.cursor.setScrollFactor(0)

    this.contentArea.removeAll(true)
    this.addContentText('选择要使用的道具', 0)
  }

  private showSkills(): void {
    this.submenu = 'skills'
    this.clearMenu()
    this.refreshSkillsView()

    this.menuItems = []
    this.addMenuText('返回', 100)
    this.cursor = this.add.rectangle(85, 100 + 10, 10, 10, 0xf1c40f)
    this.cursor.setDepth(403)
    this.cursor.setScrollFactor(0)
    this.menuIndex = 0
  }

  private refreshSkillsView(): void {
    this.contentArea.removeAll(true)
    const gd = GameData.getInstance()
    const charId = gd.party[this.skillCharIndex]
    const char = charId ? gd.characters.get(charId) : undefined
    if (!char) {
      this.addContentText('无角色', 0)
      return
    }
    this.addContentText(`${char.name} Lv.${char.stats.level} 的技能`, 0)
    let y = 30
    for (const skillId of char.skills) {
      const skill = SKILLS[skillId]
      if (skill) {
        const cost = skill.costTp > 0 ? `TP${skill.costTp}` : `MP${skill.costMp}`
        this.addContentText(`${skill.name} [${cost}] - ${skill.description}`, y)
        y += 22
      }
    }
  }

  private showEquipment(): void {
    this.submenu = 'equipment'
    this.clearMenu()
    this.refreshEquipmentView()
  }

  private refreshEquipmentView(): void {
    this.clearMenu()
    const gd = GameData.getInstance()
    const charId = gd.party[this.equipCharIndex]
    const char = charId ? gd.characters.get(charId) : undefined
    if (!char) return

    this.menuItems = []
    const w = char.equipment.weapon ? ITEMS[char.equipment.weapon]?.name || char.equipment.weapon : '无'
    const a = char.equipment.armor ? ITEMS[char.equipment.armor]?.name || char.equipment.armor : '无'
    const acc = char.equipment.accessory ? ITEMS[char.equipment.accessory]?.name || char.equipment.accessory : '无'
    this.addMenuText(`武器: ${w}`, 100)
    this.addMenuText(`防具: ${a}`, 144)
    this.addMenuText(`饰品: ${acc}`, 188)
    this.addMenuText('返回', 232)

    this.cursor = this.add.rectangle(85, 100 + 10, 10, 10, 0xf1c40f)
    this.cursor.setDepth(403)
    this.cursor.setScrollFactor(0)
    this.menuIndex = 0

    this.contentArea.removeAll(true)
    this.addContentText(`${char.name} Lv.${char.stats.level}`, 0)
    this.addContentText(`HP ${char.stats.hp}/${char.stats.maxHp} MP ${char.stats.mp}/${char.stats.maxMp}`, 24)
    this.addContentText(`ATK ${char.stats.atk} DEF ${char.stats.def} SPD ${char.stats.speed}`, 48)
    this.addContentText(`MATK ${char.stats.matk} MDEF ${char.stats.mdef}`, 72)
    this.addContentText(`TP ${char.tp}/100`, 96)
    this.addContentText('', 120)
    this.addContentText('选择装备槽进行更换', 140)
    this.addContentText('左右切换角色', 164)
  }

  private showEquipList(): void {
    this.clearMenu()
    this.menuItems = []
    const gd = GameData.getInstance()
    const charId = gd.party[this.equipCharIndex]
    const char = charId ? gd.characters.get(charId) : undefined
    if (!char || !this.equipSlot) return

    this.equipList = Object.entries(gd.inventory.equipment)
      .filter(([itemId]) => {
        const item = ITEMS[itemId]
        if (!item || item.type !== 'equipment') return false
        const slot = EQUIP_SLOT_MAP[itemId]
        return slot === this.equipSlot
      })
      .map(([itemId]) => itemId)

    this.equipList.unshift('__unequip__')

    for (let i = 0; i < this.equipList.length; i++) {
      const itemId = this.equipList[i]!
      const label = itemId === '__unequip__' ? '（卸下）' : (ITEMS[itemId]?.name || itemId)
      this.addMenuText(label, 100 + i * 36)
    }

    this.equipCursorIndex = 0
    this.cursor = this.add.rectangle(85, 100 + 10, 10, 10, 0xf1c40f)
    this.cursor.setDepth(403)
    this.cursor.setScrollFactor(0)

    this.contentArea.removeAll(true)
    this.addContentText(`为 ${char.name} 选择${this.equipSlot === 'weapon' ? '武器' : this.equipSlot === 'armor' ? '防具' : '饰品'}`, 0)
    this.addContentText('按 ESC 返回', 340)
  }

  private refreshEquipListCursor(): void {
    if (!this.cursor || this.equipList.length === 0) return
    const y = 100 + this.equipCursorIndex * 36 + 10
    this.cursor.setY(y)
  }

  private equipSelectedItem(): void {
    const gd = GameData.getInstance()
    const charId = gd.party[this.equipCharIndex]
    if (!charId) return
    const char = gd.characters.get(charId)
    if (!char || !this.equipSlot) return

    const selectedId = this.equipList[this.equipCursorIndex]
    if (!selectedId) return

    const currentEquip = char.equipment[this.equipSlot]

    if (currentEquip) {
      gd.inventory.equipment[currentEquip] = (gd.inventory.equipment[currentEquip] || 0) + 1
      gd.unequipItem(charId, currentEquip)
    }

    if (selectedId !== '__unequip__') {
      char.equipment[this.equipSlot] = selectedId
      const newQty = (gd.inventory.equipment[selectedId] || 0) - 1
      if (newQty <= 0) {
        delete gd.inventory.equipment[selectedId]
      } else {
        gd.inventory.equipment[selectedId] = newQty
      }
      gd.equipItem(charId, selectedId, this.equipSlot)
    } else {
      char.equipment[this.equipSlot] = null
    }

    this.equipSlot = null
    this.equipList = []
    this.showEquipment()
  }

  

  

  private showSaveLoad(): void {
    this.submenu = 'load'
    this.loadMode = false
    this.clearMenu()
    this.menuItems = []

    const sm = SaveManager.getInstance()
    const items = [
      ...Array.from({ length: SAVE_SLOTS }, (_, i) => `保存到槽位${i + 1}`),
      '读取存档',
      '返回',
    ]
    for (let i = 0; i < items.length; i++) {
      this.addMenuText(items[i]!, 100 + i * 44)
    }

    this.loadCursorIndex = 0
    this.cursor = this.add.rectangle(85, 100 + 10, 10, 10, 0xf1c40f)
    this.cursor.setDepth(403)
    this.cursor.setScrollFactor(0)

    this.contentArea.removeAll(true)
    for (let i = 1; i <= SAVE_SLOTS; i++) {
      const meta = sm.getMeta(i)
      const text = meta
        ? `槽位${i}: ${meta.preview} ${this.formatTime(meta.playTime)}`
        : `槽位${i}: 空`
      this.addContentText(text, (i - 1) * 30)
    }
  }

  private refreshLoadCursor(): void {
    if (!this.cursor) return
    this.cursor.setY(100 + this.loadCursorIndex * 44 + 10)
  }

  private doSave(slot: number): void {
    const sm = SaveManager.getInstance()
    if (slot === SAVE_SLOTS) {
      this.showLoadSlots()
      return
    }
    if (slot > SAVE_SLOTS) {
      this.showMainMenu()
      return
    }
    const success = sm.save(slot + 1)
    this.contentArea.removeAll(true)
    this.addContentText(success ? '保存成功！' : '保存失败', 0)
    this.time.delayedCall(1000, () => {
      this.contentArea.removeAll(true)
      const sm2 = SaveManager.getInstance()
      for (let i = 1; i <= SAVE_SLOTS; i++) {
        const meta = sm2.getMeta(i)
        const text = meta
          ? `槽位${i}: ${meta.preview} ${this.formatTime(meta.playTime)}`
          : `槽位${i}: 空`
        this.addContentText(text, (i - 1) * 30)
      }
    })
  }

  private showLoadSlots(): void {
    this.submenu = 'load'
    this.loadMode = true
    this.clearMenu()
    this.menuItems = []

    const sm = SaveManager.getInstance()
    for (let i = 1; i <= SAVE_SLOTS; i++) {
      const meta = sm.getMeta(i)
      const label = meta ? `读取槽位${i}` : `槽位${i} (空)`
      this.addMenuText(label, 100 + (i - 1) * 44)
    }
    this.addMenuText('返回', 100 + SAVE_SLOTS * 44)

    this.loadCursorIndex = 0
    this.cursor = this.add.rectangle(85, 100 + 10, 10, 10, 0xf1c40f)
    this.cursor.setDepth(403)
    this.cursor.setScrollFactor(0)

    this.contentArea.removeAll(true)
    this.addContentText('选择要读取的存档', 0)
  }

  private doLoad(slot: number): void {
    const sm = SaveManager.getInstance()
    if (slot >= SAVE_SLOTS) {
      this.showSaveLoad()
      return
    }
    const slotNum = slot + 1
    const meta = sm.getMeta(slotNum)
    if (!meta) {
      this.contentArea.removeAll(true)
      this.addContentText('该槽位没有存档', 0)
      return
    }
    const success = sm.load(slotNum)
    if (success) {
      EventBus.emit(GameEvents.SAVE_LOADED)
      this.contentArea.removeAll(true)
      this.addContentText('读取成功！', 0)
      this.time.delayedCall(1000, () => {
        this.closeMenu()
        EventBus.emit(GameEvents.MENU_CLOSE)
        this.scene.stop()
      })
    } else {
      this.contentArea.removeAll(true)
      this.addContentText('读取失败', 0)
    }
  }

  private getSaveLoadMenuCount(): number {
    return SAVE_SLOTS + (this.loadMode ? 1 : 2)
  }

  private useSelectedItem(): void {
    // Check if "return" was selected (last item)
    if (this.itemCursorIndex >= this.itemList.length) {
      this.showItems()
      return
    }

    const gd = GameData.getInstance()
    const entry = this.itemList[this.itemCursorIndex]
    if (!entry) return
    const [itemId] = entry
    const item = ITEMS[itemId]
    if (!item) return

    if (!gd.removeItem(itemId, 1)) {
      this.contentArea.removeAll(true)
      this.addContentText('道具不足', 0)
      return
    }

    AudioManager.getInstance().playSFX('item_use')

    // Apply effect to first party member with need
    const effect = item.effect
    let applied = false
    for (const charId of gd.party) {
      const char = gd.characters.get(charId)
      if (!char) continue

      if (effect.startsWith('heal_hp:')) {
        const amount = parseInt(effect.split(':')[1]!)
        if (char.stats.hp < char.stats.maxHp) {
          char.stats.hp = Math.min(char.stats.maxHp, char.stats.hp + amount)
          applied = true
          break
        }
      } else if (effect.startsWith('heal_mp:')) {
        const amount = parseInt(effect.split(':')[1]!)
        if (char.stats.mp < char.stats.maxMp) {
          char.stats.mp = Math.min(char.stats.maxMp, char.stats.mp + amount)
          applied = true
          break
        }
      }
    }

    if (!applied) {
      // Give item back if no effect
      gd.addItem(itemId, 1)
    }

    this.showItems()
    this.contentArea.removeAll(true)
    this.addContentText(applied ? `使用了 ${item.name}` : '没有需要使用的目标', 0)
  }

  private refreshItemCursor(): void {
    if (!this.cursor || this.itemList.length === 0) return
    this.cursor.setY(100 + this.itemCursorIndex * 36 + 10)
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
