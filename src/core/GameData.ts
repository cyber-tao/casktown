import { EventBus, GameEvents } from './EventBus'
import type { CharacterData, CharacterStats, Inventory, QuestState, GameFlags, BranchState } from '../data/types'
import { INITIAL_GOLD } from '../utils/constants'

const EQUIP_STAT_BONUSES: Record<string, { atk?: number; def?: number; matk?: number; mdef?: number; speed?: number; maxHp?: number; maxMp?: number }> = {
  fathers_sword: { atk: 10 },
  fathers_armor: { def: 8, maxHp: 20 },
  baihu_kai: { def: 15, mdef: 10, maxHp: 50 },
  zi_yue: { atk: 8, speed: 3 },
  guan_dao: { atk: 12, def: 3 },
  yufeng_jian: { atk: 9, speed: 5 },
  shenyu_juanzhou: { matk: 12, mdef: 8 },
  water_mirror: { mdef: 15, matk: 5 },
  pink_chime: { speed: 5, mdef: 3 },
  rainbow_barrel: { matk: 10, mdef: 10 },
  ring: { atk: 5, matk: 5, speed: 2 },
}

export const EQUIP_SLOT_MAP: Record<string, 'weapon' | 'armor' | 'accessory'> = {
  fathers_sword: 'weapon',
  fathers_armor: 'armor',
  baihu_kai: 'armor',
  zi_yue: 'weapon',
  guan_dao: 'weapon',
  yufeng_jian: 'weapon',
  shenyu_juanzhou: 'accessory',
  water_mirror: 'accessory',
  pink_chime: 'accessory',
  rainbow_barrel: 'accessory',
  ring: 'accessory',
}

export class GameData {
  private static instance: GameData

  playTime: number = 0
  currentMap: string = 'MAP_001'
  playerPosition: { x: number; y: number } = { x: 15, y: 12 }
  playerDirection: number = 2

  party: string[] = ['T']
  reserve: string[] = []
  characters: Map<string, CharacterData> = new Map()
  private baseStats: Map<string, CharacterStats> = new Map()
  inventory: Inventory = { items: {}, equipment: {} }
  equipment: Record<string, string[]> = {}

  quests: Map<string, QuestState> = new Map()
  flags: GameFlags = {}
  branches: BranchState = {
    trust_huihui: 0,
    trust_a: 0,
    trust_congcong: 0,
    trust_sun: 0,
    mercy_score: 0,
    rebuild_level: 0,
    prophecy_hint_mode: 'light',
    xiaoai_memory_fragments: 0,
    white_tiger_respected: false,
    answered_xiyuan_kindly: false,
    released_four_seals: false,
    normal_ending_seen: false,
    true_route_unlocked: false, xiaoai_purified: false,
  }

  rebuildLevel: number = 0
  gold: number = INITIAL_GOLD
  unlockedCodex: string[] = []
  settings = {
    textSpeed: 'normal' as const,
    battleSpeed: 'normal' as const,
    encounterRate: 'default' as const,
    difficulty: 'standard' as const,
    prophecyHint: 'light' as 'poem' | 'light' | 'clear',
    masterVolume: 1,
    musicVolume: 1,
    sfxVolume: 1,
    uiVolume: 1,
    pixelSharp: true,
    fullscreen: false,
  }

  private constructor() {}

  static getInstance(): GameData {
    if (!GameData.instance) {
      GameData.instance = new GameData()
    }
    return GameData.instance
  }

  reset(): void {
    this.playTime = 0
    this.currentMap = 'MAP_001'
    this.playerPosition = { x: 15, y: 12 }
    this.playerDirection = 2
    this.party = ['T']
    this.reserve = []
    this.characters = new Map()
    this.baseStats = new Map()
    this.inventory = { items: {}, equipment: {} }
    this.equipment = {}
    this.quests = new Map()
    this.flags = {}
    this.branches = {
      trust_huihui: 0,
      trust_a: 0,
      trust_congcong: 0,
      trust_sun: 0,
      mercy_score: 0,
      rebuild_level: 0,
      prophecy_hint_mode: 'light',
      xiaoai_memory_fragments: 0,
      white_tiger_respected: false,
      answered_xiyuan_kindly: false,
      released_four_seals: false,
      normal_ending_seen: false,
      true_route_unlocked: false, xiaoai_purified: false,
    }
    this.rebuildLevel = 0
    this.gold = INITIAL_GOLD
    this.unlockedCodex = []
    this.settings = {
      textSpeed: 'normal',
      battleSpeed: 'normal',
      encounterRate: 'default',
      difficulty: 'standard',
      prophecyHint: 'light',
      masterVolume: 1,
      musicVolume: 1,
      sfxVolume: 1,
      uiVolume: 1,
      pixelSharp: true,
      fullscreen: false,
    }
  }

  setFlag(key: string, value: unknown): void {
    this.flags[key] = value
    EventBus.emit(GameEvents.FLAG_SET, key, value)
  }

  getFlag(key: string): unknown {
    return this.flags[key]
  }

  hasFlag(key: string): boolean {
    return key in this.flags
  }

  updateBranch(key: keyof BranchState, value: unknown): void {
    ;(this.branches as unknown as Record<string, unknown>)[key] = value
  }

  addItem(itemId: string, quantity: number = 1): void {
    const current = this.inventory.items[itemId] || 0
    this.inventory.items[itemId] = current + quantity
    EventBus.emit(GameEvents.ITEM_GET, itemId, quantity)
  }

  removeItem(itemId: string, quantity: number = 1): boolean {
    const current = this.inventory.items[itemId] || 0
    if (current < quantity) return false
    this.inventory.items[itemId] = current - quantity
    if (this.inventory.items[itemId] <= 0) {
      delete this.inventory.items[itemId]
    }
    return true
  }

  hasItem(itemId: string, quantity: number = 1): boolean {
    return (this.inventory.items[itemId] || 0) >= quantity
  }

  addGold(amount: number): void {
    this.gold += amount
  }

  spendGold(amount: number): boolean {
    if (this.gold < amount) return false
    this.gold -= amount
    return true
  }

  addPartyMember(charId: string): void {
    if (!this.party.includes(charId) && !this.reserve.includes(charId)) {
      if (this.party.length < 4) {
        this.party.push(charId)
      } else {
        this.reserve.push(charId)
      }
    }
  }

  getEquipStats(charId: string): { atk: number; def: number; matk: number; mdef: number; speed: number; maxHp: number; maxMp: number } {
    const bonus = { atk: 0, def: 0, matk: 0, mdef: 0, speed: 0, maxHp: 0, maxMp: 0 }
    const equipped = this.equipment[charId]
    if (!equipped) return bonus
    for (const itemId of equipped) {
      const stats = EQUIP_STAT_BONUSES[itemId]
      if (stats) {
        bonus.atk += stats.atk || 0
        bonus.def += stats.def || 0
        bonus.matk += stats.matk || 0
        bonus.mdef += stats.mdef || 0
        bonus.speed += stats.speed || 0
        bonus.maxHp += stats.maxHp || 0
        bonus.maxMp += stats.maxMp || 0
      }
    }
    return bonus
  }

  private saveBaseStats(charId: string): void {
    const char = this.characters.get(charId)
    if (!char) return
    if (!this.baseStats.has(charId)) {
      this.baseStats.set(charId, { ...char.stats })
    }
  }

  applyEquipment(charId: string): void {
    const char = this.characters.get(charId)
    if (!char) return
    const base = this.baseStats.get(charId)
    if (!base) return
    const bonus = this.getEquipStats(charId)
    char.stats.atk = base.atk + bonus.atk
    char.stats.def = base.def + bonus.def
    char.stats.matk = base.matk + bonus.matk
    char.stats.mdef = base.mdef + bonus.mdef
    char.stats.speed = base.speed + bonus.speed
    char.stats.maxHp = base.maxHp + bonus.maxHp
    char.stats.maxMp = base.maxMp + bonus.maxMp
  }

  equipItem(charId: string, itemId: string, slot: 'weapon' | 'armor' | 'accessory'): void {
    if (!this.equipment[charId]) this.equipment[charId] = []
    this.equipment[charId]!.push(itemId)
    this.saveBaseStats(charId)
    this.applyEquipment(charId)
  }

  unequipItem(charId: string, itemId: string): void {
    const equipped = this.equipment[charId]
    if (!equipped) return
    const idx = equipped.indexOf(itemId)
    if (idx >= 0) {
      equipped.splice(idx, 1)
      this.saveBaseStats(charId)
      this.applyEquipment(charId)
    }
  }

  adjustTrust(charId: string, amount: number): void {
    const trustMap: Record<string, keyof BranchState> = {
      'HUIHUI': 'trust_huihui',
      'A': 'trust_a',
      'CONGCONG': 'trust_congcong',
      'SUN': 'trust_sun',
    }
    const key = trustMap[charId]
    if (!key) return
    const current = this.branches[key] as number
    this.updateBranch(key, Math.max(-100, Math.min(100, current + amount)))
  }

  getTrustLevel(charId: string): number {
    const trustMap: Record<string, keyof BranchState> = {
      'HUIHUI': 'trust_huihui',
      'A': 'trust_a',
      'CONGCONG': 'trust_congcong',
      'SUN': 'trust_sun',
    }
    const key = trustMap[charId]
    if (!key) return 0
    return this.branches[key] as number
  }

  isTrustHigh(charId: string, threshold: number = 30): boolean {
    return this.getTrustLevel(charId) >= threshold
  }

  adjustMercy(amount: number): void {
    this.branches.mercy_score = Math.max(0, Math.min(100, this.branches.mercy_score + amount))
  }

  serialize(): object {
    return {
      playTime: this.playTime,
      currentMap: this.currentMap,
      playerPosition: this.playerPosition,
      playerDirection: this.playerDirection,
      party: this.party,
      reserve: this.reserve,
      characters: Object.fromEntries(this.characters),
      inventory: this.inventory,
      equipment: this.equipment,
      quests: Object.fromEntries(this.quests),
      flags: this.flags,
      branches: this.branches,
      rebuildLevel: this.rebuildLevel,
      gold: this.gold,
      unlockedCodex: this.unlockedCodex,
      settings: this.settings,
    }
  }

  deserialize(data: object): void {
    const d = data as Record<string, unknown>
    this.playTime = (d.playTime as number) || 0
    this.currentMap = (d.currentMap as string) || 'MAP_001'
    this.playerPosition = (d.playerPosition as { x: number; y: number }) || { x: 15, y: 12 }
    this.playerDirection = (d.playerDirection as number) || 2
    this.party = (d.party as string[]) || ['T']
    this.reserve = (d.reserve as string[]) || []
    this.characters = new Map(Object.entries((d.characters as Record<string, CharacterData>) || {}))
    this.inventory = (d.inventory as Inventory) || { items: {}, equipment: {} }
    this.equipment = (d.equipment as Record<string, string[]>) || {}
    this.quests = new Map(Object.entries((d.quests as Record<string, QuestState>) || {}))
    this.flags = (d.flags as GameFlags) || {}
    this.branches = (d.branches as BranchState) || {
      trust_huihui: 0, trust_a: 0, trust_congcong: 0, trust_sun: 0,
      mercy_score: 0, rebuild_level: 0, prophecy_hint_mode: 'light',
      xiaoai_memory_fragments: 0, white_tiger_respected: false,
      answered_xiyuan_kindly: false, released_four_seals: false,
      normal_ending_seen: false, true_route_unlocked: false, xiaoai_purified: false,
    }
    this.rebuildLevel = (d.rebuildLevel as number) || 0
    this.branches.rebuild_level = this.rebuildLevel
    this.gold = (d.gold as number) || INITIAL_GOLD
    this.unlockedCodex = (d.unlockedCodex as string[]) || []
    this.settings = (d.settings as typeof this.settings) || this.settings
  }
}
