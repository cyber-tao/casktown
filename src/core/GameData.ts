import { EventBus, GameEvents } from './EventBus'
import type { CharacterData, CharacterStats, Inventory, QuestState, GameFlags, BranchState } from '../data/types'
import { GAME_CONFIG_DATABASE, cloneConfigData } from '../data/configDatabase'
import {
  INITIAL_GOLD,
  REBUILD_VISUAL_MAP_THRESHOLD,
  REBUILT_TOWN_MAP_ID,
  START_MAP_ID,
  START_INVENTORY_ITEMS,
  START_PARTY,
  START_PLAYER_DIRECTION,
  START_PLAYER_POSITION,
  TRUE_ROUTE_MIN_MERCY,
  TRUE_ROUTE_MIN_XIAOAI_MEMORY_FRAGMENTS,
} from '../utils/constants'

type EquipStats = Pick<CharacterStats, 'atk' | 'def' | 'matk' | 'mdef' | 'speed' | 'maxHp' | 'maxMp'>
type EquipmentSlot = keyof CharacterData['equipment']

const EQUIPMENT_SLOTS: EquipmentSlot[] = ['weapon', 'armor', 'accessory']

const EQUIP_STAT_BONUSES: Record<string, Partial<EquipStats>> = {
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

const BRANCH_NUMBER_KEYS = new Set<keyof BranchState>([
  'trust_huihui',
  'trust_a',
  'trust_congcong',
  'trust_sun',
  'mercy_score',
  'rebuild_level',
  'xiaoai_memory_fragments',
])

const BRANCH_KEYS = new Set<keyof BranchState>([
  ...BRANCH_NUMBER_KEYS,
  'prophecy_hint_mode',
  'white_tiger_respected',
  'answered_xiyuan_kindly',
  'released_four_seals',
  'xiaoai_purified',
  'normal_ending_seen',
  'true_route_unlocked',
])

const JOIN_FLAG_TO_CHARACTER: Record<string, string> = {
  huihui_joined: 'HUIHUI',
  a_joined: 'A',
  congcong_joined: 'CONGCONG',
  sun_joined: 'SUN',
}

function createEmptyEquipStats(): EquipStats {
  return { atk: 0, def: 0, matk: 0, mdef: 0, speed: 0, maxHp: 0, maxMp: 0 }
}

function createDefaultBranches(): BranchState {
  return {
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
    true_route_unlocked: false,
    xiaoai_purified: false,
  }
}

function createConfiguredCharacter(id: string): CharacterData {
  const base = GAME_CONFIG_DATABASE.getTable('characters')[id]
  if (!base) throw new Error(`Character ${id} not found`)
  return cloneConfigData(base)
}

export class GameData {
  private static instance: GameData

  playTime: number = 0
  currentMap: string = START_MAP_ID
  playerPosition: { x: number; y: number } = { ...START_PLAYER_POSITION }
  playerDirection: number = START_PLAYER_DIRECTION

  party: string[] = [...START_PARTY]
  reserve: string[] = []
  characters: Map<string, CharacterData> = new Map()
  private baseStats: Map<string, CharacterStats> = new Map()
  inventory: Inventory = { items: {}, equipment: {} }
  equipment: Record<string, string[]> = {}

  quests: Map<string, QuestState> = new Map()
  flags: GameFlags = {}
  branches: BranchState = createDefaultBranches()

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
    this.currentMap = START_MAP_ID
    this.playerPosition = { ...START_PLAYER_POSITION }
    this.playerDirection = START_PLAYER_DIRECTION
    this.party = [...START_PARTY]
    this.reserve = []
    this.characters = new Map(Object.keys(GAME_CONFIG_DATABASE.getTable('characters')).map(id => [id, createConfiguredCharacter(id)]))
    this.baseStats = new Map()
    this.inventory = { items: {}, equipment: {} }
    this.equipment = {}
    this.quests = new Map()
    this.flags = {}
    this.branches = createDefaultBranches()
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
    for (const item of START_INVENTORY_ITEMS) {
      this.inventory.items[item.itemId] = item.quantity
    }
    this.initializeCharacterState()
  }

  setFlag(key: string, value: unknown): void {
    this.flags[key] = value
    if (value === true && JOIN_FLAG_TO_CHARACTER[key]) {
      this.addPartyMember(JOIN_FLAG_TO_CHARACTER[key])
    }
    if (BRANCH_KEYS.has(key as keyof BranchState)) {
      this.applyBranchValue(key as keyof BranchState, value)
    }
    if (key === 'rebuild_level' && typeof value === 'number') {
      this.rebuildLevel = Math.max(this.rebuildLevel, value)
      this.branches.rebuild_level = this.rebuildLevel
      if (this.rebuildLevel >= REBUILD_VISUAL_MAP_THRESHOLD && this.currentMap === START_MAP_ID) {
        this.currentMap = REBUILT_TOWN_MAP_ID
      }
    }
    this.syncProgressionFlags()
    EventBus.emit(GameEvents.FLAG_SET, key, value)
  }

  getFlag(key: string): unknown {
    if (BRANCH_KEYS.has(key as keyof BranchState)) {
      return this.branches[key as keyof BranchState]
    }
    return this.flags[key]
  }

  hasFlag(key: string): boolean {
    return key in this.flags || BRANCH_KEYS.has(key as keyof BranchState)
  }

  updateBranch(key: keyof BranchState, value: unknown): void {
    ;(this.branches as unknown as Record<string, unknown>)[key] = value
    if (key === 'rebuild_level' && typeof value === 'number') {
      this.rebuildLevel = value
    }
    this.syncTrueRouteState()
    this.syncProgressionFlags()
  }

  private applyBranchValue(key: keyof BranchState, value: unknown): void {
    if (BRANCH_NUMBER_KEYS.has(key)) {
      const current = this.branches[key]
      const next = key === 'rebuild_level' ? value : typeof value === 'number' && typeof current === 'number' ? current + value : value
      ;(this.branches as unknown as Record<string, unknown>)[key] = next
      if (key === 'rebuild_level' && typeof next === 'number') {
        this.rebuildLevel = next
      }
    } else {
      ;(this.branches as unknown as Record<string, unknown>)[key] = value
    }
    this.syncTrueRouteState()
  }

  private syncTrueRouteState(): void {
    const unlocked =
      this.branches.xiaoai_purified &&
      this.branches.released_four_seals &&
      this.branches.white_tiger_respected &&
      this.branches.answered_xiyuan_kindly &&
      this.branches.mercy_score >= TRUE_ROUTE_MIN_MERCY &&
      this.branches.xiaoai_memory_fragments >= TRUE_ROUTE_MIN_XIAOAI_MEMORY_FRAGMENTS
    this.branches.true_route_unlocked = unlocked
    this.flags.true_route_unlocked = unlocked
  }

  private syncProgressionFlags(): void {
    if (this.flags.has_millennium_seed && this.flags.has_sacred_water && this.flags.has_divine_laurel) {
      this.flags.has_all_relics = true
    }
    if (this.flags.has_sacred_water) {
      this.flags.shuiyao_fengchi_defeated = true
    }
    if (this.flags.has_divine_laurel) {
      this.flags.phoenix_qilin_defeated = true
    }
    if (this.flags.seal_qinglong_released && this.flags.seal_baihu_released && this.flags.seal_zhuque_released) {
      this.flags.defeated_chi_mei_wang = true
    }
    if (this.flags.fake_xiaoai_defeated) {
      this.flags.defeated_fake_xiaoai = true
    }
    if (this.branches.xiaoai_purified || this.flags.xiaoai_purified) {
      this.flags.defeated_xiaoai_true = true
    }
    if (this.flags.game_cleared) {
      this.flags.defeated_wuxiang = true
    }
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

  getEquipStats(charId: string): EquipStats {
    const bonus = createEmptyEquipStats()
    const equipped = this.getEquippedItemIds(charId)
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

  initializeCharacterState(): void {
    this.syncEquipmentIndex()
    this.baseStats = new Map()
    for (const [charId, char] of this.characters) {
      this.baseStats.set(charId, { ...char.stats })
      this.applyEquipment(charId)
    }
  }

  private getEquippedItemIds(charId: string): string[] {
    const char = this.characters.get(charId)
    if (char) {
      const equipped = EQUIPMENT_SLOTS
        .map(slot => char.equipment[slot])
        .filter((itemId): itemId is string => typeof itemId === 'string' && itemId.length > 0)
      if (equipped.length > 0) return equipped
    }
    return this.equipment[charId] ?? []
  }

  private syncEquipmentIndex(fallback: Record<string, string[]> = {}): void {
    const nextEquipment: Record<string, string[]> = {}
    for (const [charId, char] of this.characters) {
      const equipped = EQUIPMENT_SLOTS
        .map(slot => char.equipment[slot])
        .filter((itemId): itemId is string => typeof itemId === 'string' && itemId.length > 0)
      if (equipped.length > 0) {
        nextEquipment[charId] = equipped
      } else if (fallback[charId]?.length) {
        nextEquipment[charId] = [...fallback[charId]]
      }
    }
    this.equipment = nextEquipment
  }

  private restoreBaseStats(serializedBaseStats: Record<string, CharacterStats> | undefined, subtractEquipmentBonuses: boolean): void {
    this.baseStats = new Map()
    if (serializedBaseStats) {
      for (const [charId, stats] of Object.entries(serializedBaseStats)) {
        this.baseStats.set(charId, { ...stats })
      }
      return
    }
    for (const [charId, char] of this.characters) {
      const bonus = subtractEquipmentBonuses ? this.getEquipStats(charId) : createEmptyEquipStats()
      this.baseStats.set(charId, {
        ...char.stats,
        atk: char.stats.atk - bonus.atk,
        def: char.stats.def - bonus.def,
        matk: char.stats.matk - bonus.matk,
        mdef: char.stats.mdef - bonus.mdef,
        speed: char.stats.speed - bonus.speed,
        maxHp: char.stats.maxHp - bonus.maxHp,
        maxMp: char.stats.maxMp - bonus.maxMp,
      })
    }
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
    const char = this.characters.get(charId)
    if (!char) return
    const currentItem = char.equipment[slot]
    if (currentItem && currentItem !== itemId) {
      this.unequipItem(charId, currentItem)
    }
    char.equipment[slot] = itemId
    this.syncEquipmentIndex()
    this.saveBaseStats(charId)
    this.applyEquipment(charId)
  }

  unequipItem(charId: string, itemId: string): void {
    const char = this.characters.get(charId)
    const equipped = this.equipment[charId]
    const slot = EQUIP_SLOT_MAP[itemId]
    if (char && slot && char.equipment[slot] === itemId) {
      char.equipment[slot] = null
    }
    if (equipped) {
      const idx = equipped.indexOf(itemId)
      if (idx >= 0) {
        equipped.splice(idx, 1)
      }
    }
    this.syncEquipmentIndex(this.equipment)
    this.saveBaseStats(charId)
    this.applyEquipment(charId)
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
    this.syncTrueRouteState()
  }

  private cloneCharacter(char: CharacterData): CharacterData {
    return {
      ...char,
      stats: { ...char.stats },
      skills: [...char.skills],
      equipment: { ...char.equipment },
    }
  }

  private cloneEquipmentIndex(equipment: Record<string, string[]>): Record<string, string[]> {
    return Object.fromEntries(Object.entries(equipment).map(([charId, itemIds]) => [charId, [...itemIds]]))
  }

  serialize(): object {
    return {
      playTime: this.playTime,
      currentMap: this.currentMap,
      playerPosition: { ...this.playerPosition },
      playerDirection: this.playerDirection,
      party: [...this.party],
      reserve: [...this.reserve],
      characters: Object.fromEntries(Array.from(this.characters.entries()).map(([id, char]) => [id, this.cloneCharacter(char)])),
      baseStats: Object.fromEntries(Array.from(this.baseStats.entries()).map(([id, stats]) => [id, { ...stats }])),
      inventory: {
        items: { ...this.inventory.items },
        equipment: { ...this.inventory.equipment },
      },
      equipment: this.cloneEquipmentIndex(this.equipment),
      quests: Object.fromEntries(Array.from(this.quests.entries()).map(([id, quest]) => [id, { ...quest }])),
      flags: { ...this.flags },
      branches: { ...this.branches },
      rebuildLevel: this.rebuildLevel,
      gold: this.gold,
      unlockedCodex: [...this.unlockedCodex],
      settings: { ...this.settings },
    }
  }

  deserialize(data: object): void {
    const d = data as Record<string, unknown>
    this.playTime = (d.playTime as number) ?? 0
    this.currentMap = (d.currentMap as string) ?? START_MAP_ID
    this.playerPosition = { ...START_PLAYER_POSITION, ...((d.playerPosition as Partial<{ x: number; y: number }>) ?? {}) }
    this.playerDirection = (d.playerDirection as number) ?? START_PLAYER_DIRECTION
    this.party = [...((d.party as string[] | undefined) ?? START_PARTY)]
    this.reserve = [...((d.reserve as string[] | undefined) ?? [])]
    const characters = d.characters as Record<string, CharacterData> | undefined
    this.characters = characters && Object.keys(characters).length > 0
      ? new Map(Object.entries(characters).map(([id, char]) => [id, this.cloneCharacter(char)]))
      : new Map(Object.keys(GAME_CONFIG_DATABASE.getTable('characters')).map(id => [id, createConfiguredCharacter(id)]))
    for (const id of [...this.party, ...this.reserve]) {
      if (!this.characters.has(id) && GAME_CONFIG_DATABASE.getTable('characters')[id]) {
        this.characters.set(id, createConfiguredCharacter(id))
      }
    }
    const inventory = (d.inventory as Partial<Inventory>) ?? {}
    this.inventory = {
      items: { ...(inventory.items ?? {}) },
      equipment: { ...(inventory.equipment ?? {}) },
    }
    const serializedEquipment = this.cloneEquipmentIndex((d.equipment as Record<string, string[]>) ?? {})
    const serializedBaseStats = d.baseStats as Record<string, CharacterStats> | undefined
    this.equipment = serializedEquipment
    this.quests = new Map(Object.entries((d.quests as Record<string, QuestState>) ?? {}).map(([id, quest]) => [id, { ...quest }]))
    this.flags = { ...((d.flags as GameFlags) ?? {}) }
    this.branches = { ...createDefaultBranches(), ...((d.branches as Partial<BranchState>) ?? {}) }
    this.rebuildLevel = (d.rebuildLevel as number) ?? this.branches.rebuild_level
    this.branches.rebuild_level = this.rebuildLevel
    this.gold = (d.gold as number) ?? INITIAL_GOLD
    this.unlockedCodex = [...((d.unlockedCodex as string[] | undefined) ?? [])]
    this.settings = { ...this.settings, ...((d.settings as Partial<typeof this.settings>) ?? {}) }
    this.syncEquipmentIndex(serializedEquipment)
    this.restoreBaseStats(serializedBaseStats, Object.keys(serializedEquipment).length > 0)
    for (const charId of this.characters.keys()) {
      this.applyEquipment(charId)
    }
    this.syncProgressionFlags()
    this.syncTrueRouteState()
  }
}
