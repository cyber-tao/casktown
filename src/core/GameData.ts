import { EventBus, GameEvents } from './EventBus'
import type { CharacterData, CharacterStats, Inventory, QuestState, GameFlags, BranchState, MapData } from '../data/types'
import { GAME_CONFIG_DATABASE, cloneConfigData } from '../data/configDatabase'
import { EQUIP_SLOT_MAP, EQUIP_STAT_BONUSES, EQUIPMENT_SLOTS, createEmptyEquipStats } from '../data/equipment'
import type { EquipStats, EquipmentSlot } from '../data/equipment'
import { REBUILD_FACILITIES, REBUILD_MILESTONES } from '../data/rebuild'
import { resolveCanonicalMapId } from './MapAccess'
import {
  A_RESCUED_FLAG,
  BARREL_UNLOCK_PROGRESS_FLAGS,
  BRANCH_VALUE_LIMITS,
  INITIAL_GOLD,
  LEGACY_SAVE_PROGRESS,
  LEVEL_GROWTH,
  CONTROL_MODE,
  DEFAULT_GAME_SETTINGS,
  PARTY_RULES,
  PARTNER_CALL_AVAILABLE_FLAG,
  PARTNER_CALL_MIN_TRUST,
  REBUILD_LEVEL_LIMITS,
  REBUILD_VISUAL_MAP_THRESHOLD,
  REBUILT_TOWN_MAP_ID,
  REINCARNATION_CORRECT_ANSWER_FLAGS,
  START_MAP_ID,
  START_INVENTORY_ITEMS,
  START_PARTY,
  START_PLAYER_DIRECTION,
  START_PLAYER_POSITION,
  TIME_MS_PER_SECOND,
  TRUE_ROUTE_MIN_MERCY,
  TRUE_ROUTE_MIN_XIAOAI_MEMORY_FRAGMENTS,
} from '../utils/constants'

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
  'true_route_reincarnation',
])

const JOIN_FLAG_TO_CHARACTER: Record<string, string> = {
  huihui_joined: 'HUIHUI',
  a_joined: 'A',
  congcong_joined: 'CONGCONG',
  sun_joined: 'SUN',
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
    true_route_reincarnation: false,
    xiaoai_purified: false,
  }
}

function createConfiguredCharacter(id: string): CharacterData {
  const base = GAME_CONFIG_DATABASE.getTable('characters')[id]
  if (!base) throw new Error(`Character ${id} not found`)
  return cloneConfigData(base)
}

export interface LevelUpResult {
  charId: string
  name: string
  level: number
}

type GameSettings = {
  textSpeed: 'slow' | 'normal' | 'fast' | 'instant'
  battleSpeed: 'normal' | 'fast' | 'fastest'
  encounterRate: 'default' | 'reduced' | 'none'
  difficulty: 'story' | 'standard' | 'hard'
  prophecyHint: 'poem' | 'light' | 'clear'
  masterVolume: number
  musicVolume: number
  sfxVolume: number
  uiVolume: number
  pixelSharp: boolean
  fullscreen: boolean
  controlMode: typeof CONTROL_MODE[keyof typeof CONTROL_MODE]
  gamepad: boolean
}

export class GameData {
  private static instance: GameData

  playTime: number = 0
  private playTimeSyncedAtMs: number = Date.now()
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
  settings: GameSettings = { ...DEFAULT_GAME_SETTINGS }

  private constructor() {}

  static getInstance(): GameData {
    if (!GameData.instance) {
      GameData.instance = new GameData()
    }
    return GameData.instance
  }

  private clampRebuildLevel(level: number): number {
    return Math.max(REBUILD_LEVEL_LIMITS.MIN, Math.min(REBUILD_LEVEL_LIMITS.MAX, level))
  }

  private clampBranchNumber(key: keyof BranchState, value: number): number {
    switch (key) {
      case 'trust_huihui':
      case 'trust_a':
      case 'trust_congcong':
      case 'trust_sun':
        return Math.max(BRANCH_VALUE_LIMITS.TRUST_MIN, Math.min(BRANCH_VALUE_LIMITS.TRUST_MAX, value))
      case 'mercy_score':
        return Math.max(BRANCH_VALUE_LIMITS.MERCY_MIN, Math.min(BRANCH_VALUE_LIMITS.MERCY_MAX, value))
      case 'rebuild_level':
        return this.clampRebuildLevel(value)
      case 'xiaoai_memory_fragments':
        return Math.max(0, Math.min(TRUE_ROUTE_MIN_XIAOAI_MEMORY_FRAGMENTS, value))
      default:
        return value
    }
  }

  private normalizeBranchNumbers(): void {
    for (const key of BRANCH_NUMBER_KEYS) {
      const value = this.branches[key]
      if (typeof value === 'number') {
        ;(this.branches as unknown as Record<string, unknown>)[key] = this.clampBranchNumber(key, value)
      }
    }
  }

  private syncFlagFromBranch(key: keyof BranchState): unknown {
    const value = this.branches[key]
    this.flags[key] = value
    return value
  }

  private syncPresentBranchFlags(): void {
    for (const key of BRANCH_KEYS) {
      if (key in this.flags) {
        this.syncFlagFromBranch(key)
      }
    }
  }

  private syncRebuildFacilityFlags(): void {
    for (const facility of REBUILD_FACILITIES) {
      if (this.rebuildLevel >= facility.requiredLevel && this.flags[facility.flag] !== true) {
        this.setFlag(facility.flag, true)
      }
    }
  }

  private syncRebuildMilestoneLevel(): void {
    const milestoneLevel = REBUILD_MILESTONES.reduce<number>(
      (level, milestone) => this.flags[milestone.sourceFlag] === true || this.getFlag(milestone.sourceFlag) === true
        ? Math.max(level, milestone.level)
        : level,
      REBUILD_LEVEL_LIMITS.MIN,
    )
    if (milestoneLevel <= this.rebuildLevel) return

    this.rebuildLevel = this.clampRebuildLevel(milestoneLevel)
    this.branches.rebuild_level = this.rebuildLevel
    this.flags.rebuild_level = this.rebuildLevel
    this.syncRebuildFacilityFlags()
    if (this.rebuildLevel >= REBUILD_VISUAL_MAP_THRESHOLD && this.currentMap === START_MAP_ID) {
      this.currentMap = REBUILT_TOWN_MAP_ID
    }
  }

  reset(options: { preserveSettings?: boolean } = {}): void {
    const preservedSettings = options.preserveSettings ? { ...this.settings } : null
    this.playTime = 0
    this.playTimeSyncedAtMs = Date.now()
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
    this.rebuildLevel = REBUILD_LEVEL_LIMITS.MIN
    this.gold = INITIAL_GOLD
    this.unlockedCodex = []
    this.settings = preservedSettings ?? { ...DEFAULT_GAME_SETTINGS }
    for (const item of START_INVENTORY_ITEMS) {
      this.inventory.items[item.itemId] = item.quantity
    }
    this.initializeCharacterState()
    this.syncProgressionFlags()
  }

  setFlag(key: string, value: unknown): void {
    const previousRebuildLevel = this.rebuildLevel
    const normalizedValue = key === 'rebuild_level' && typeof value === 'number' ? this.clampRebuildLevel(value) : value
    if (!BRANCH_KEYS.has(key as keyof BranchState)) {
      this.flags[key] = normalizedValue
    }
    if (normalizedValue === true && JOIN_FLAG_TO_CHARACTER[key]) {
      this.addPartyMember(JOIN_FLAG_TO_CHARACTER[key])
    }
    if (BRANCH_KEYS.has(key as keyof BranchState)) {
      if (key === 'rebuild_level' && typeof normalizedValue === 'number') {
        this.rebuildLevel = Math.max(this.rebuildLevel, normalizedValue)
        this.branches.rebuild_level = this.rebuildLevel
        this.flags.rebuild_level = this.rebuildLevel
      } else {
        this.applyBranchValue(key as keyof BranchState, normalizedValue)
        this.syncFlagFromBranch(key as keyof BranchState)
      }
    }
    if (key === 'rebuild_level' && typeof normalizedValue === 'number') {
      this.syncFlagFromBranch('rebuild_level')
      this.syncRebuildFacilityFlags()
      if (this.rebuildLevel >= REBUILD_VISUAL_MAP_THRESHOLD && this.currentMap === START_MAP_ID) {
        this.currentMap = REBUILT_TOWN_MAP_ID
      }
    }
    this.syncProgressionFlags()
    if (key !== 'rebuild_level' && this.rebuildLevel !== previousRebuildLevel) {
      EventBus.emit(GameEvents.FLAG_SET, 'rebuild_level', this.rebuildLevel)
    }
    EventBus.emit(GameEvents.FLAG_SET, key, this.getFlag(key))
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
    const normalizedValue = typeof value === 'number' ? this.clampBranchNumber(key, value) : value
    if (key === 'rebuild_level' && typeof normalizedValue === 'number') {
      this.rebuildLevel = Math.max(this.rebuildLevel, normalizedValue)
      this.branches.rebuild_level = this.rebuildLevel
      this.syncRebuildFacilityFlags()
    } else {
      ;(this.branches as unknown as Record<string, unknown>)[key] = normalizedValue
    }
    this.syncFlagFromBranch(key)
    this.syncTrueRouteState()
    this.syncProgressionFlags()
  }

  private applyBranchValue(key: keyof BranchState, value: unknown): void {
    if (BRANCH_NUMBER_KEYS.has(key)) {
      const current = this.branches[key]
      let next = key === 'rebuild_level'
        ? (typeof value === 'number' ? this.clampRebuildLevel(value) : current)
        : typeof value === 'number' && typeof current === 'number' ? current + value : value
      if (typeof next === 'number') {
        next = this.clampBranchNumber(key, next)
      }
      ;(this.branches as unknown as Record<string, unknown>)[key] = next
      if (key === 'rebuild_level' && typeof next === 'number') {
        this.rebuildLevel = next
        this.flags.rebuild_level = next
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
      this.branches.true_route_reincarnation &&
      this.branches.mercy_score >= TRUE_ROUTE_MIN_MERCY &&
      this.branches.xiaoai_memory_fragments >= TRUE_ROUTE_MIN_XIAOAI_MEMORY_FRAGMENTS
    this.branches.true_route_unlocked = unlocked
    this.flags.true_route_unlocked = unlocked
  }

  private syncProgressionFlags(): void {
    for (const { sourceFlag, unlockFlag } of BARREL_UNLOCK_PROGRESS_FLAGS) {
      if (this.flags[sourceFlag] === true) {
        this.flags[unlockFlag] = true
      }
    }
    if (this.flags.has_millennium_seed && this.flags.has_sacred_water && this.flags.has_divine_laurel) {
      this.flags.has_all_relics = true
    }
    this.flags[PARTNER_CALL_AVAILABLE_FLAG] =
      this.branches.trust_huihui + this.branches.trust_a + this.branches.trust_congcong >= PARTNER_CALL_MIN_TRUST
    if (this.flags.has_sacred_water) {
      this.flags.shuiyao_fengchi_defeated = true
    }
    if (this.flags.has_divine_laurel) {
      this.flags.phoenix_qilin_defeated = true
    }
    if (this.flags.seal_qinglong_released && this.flags.seal_baihu_released && this.flags.seal_zhuque_released && this.flags.seal_xuanwu_released) {
      this.flags.defeated_chi_mei_wang = true
      this.flags.released_four_seals = true
      this.branches.released_four_seals = true
    }
    if (this.flags.fake_xiaoai_defeated) {
      this.flags.defeated_fake_xiaoai = true
    }
    if (this.branches.xiaoai_purified || this.flags.xiaoai_purified) {
      this.branches.xiaoai_purified = true
      this.flags.defeated_xiaoai_true = true
    }
    if (this.flags.normal_ending_seen) {
      this.branches.normal_ending_seen = true
    }
    if (this.flags.game_cleared) {
      this.flags.defeated_wuxiang = true
    }
    this.syncRebuildMilestoneLevel()
    this.syncPresentBranchFlags()
    this.syncTrueRouteState()
  }

  private migrateLegacyProgressionFlags(): void {
    const hasAInRoster = this.party.includes('A') || this.reserve.includes('A')
    if (
      this.flags[A_RESCUED_FLAG] !== true &&
      this.flags[LEGACY_SAVE_PROGRESS.A_RESCUE_EVENT_DONE_FLAG] === true &&
      hasAInRoster
    ) {
      this.flags[A_RESCUED_FLAG] = true
    }

    const hasNewAnswerState = REINCARNATION_CORRECT_ANSWER_FLAGS.some(flag =>
      Object.prototype.hasOwnProperty.call(this.flags, flag),
    )
    const hasLegacyMemoryProgress = LEGACY_SAVE_PROGRESS.REINCARNATION_MEMORY_DONE_FLAGS.some(
      flag => this.flags[flag] === true,
    )
    if (
      this.flags.dream_active === true &&
      !hasNewAnswerState &&
      !this.branches.true_route_reincarnation &&
      hasLegacyMemoryProgress
    ) {
      for (const flag of LEGACY_SAVE_PROGRESS.REINCARNATION_MEMORY_DONE_FLAGS) {
        delete this.flags[flag]
      }
      delete this.flags[LEGACY_SAVE_PROGRESS.REINCARNATION_DREAM_START_DONE_FLAG]
      delete this.flags[LEGACY_SAVE_PROGRESS.REINCARNATION_TIMER_STARTED_FLAG]
      this.flags.dream_active = false
    }
  }

  addItem(itemId: string, quantity: number = 1): void {
    if (!Number.isFinite(quantity) || quantity <= 0) return
    const item = GAME_CONFIG_DATABASE.getTable('items')[itemId]
    const bag = item?.type === 'equipment' ? this.inventory.equipment : this.inventory.items
    const current = bag[itemId] || 0
    bag[itemId] = current + quantity
    EventBus.emit(GameEvents.ITEM_GET, itemId, quantity)
  }

  getItemQuantity(itemId: string): number {
    const item = GAME_CONFIG_DATABASE.getTable('items')[itemId]
    const bag = item?.type === 'equipment' ? this.inventory.equipment : this.inventory.items
    return bag[itemId] || 0
  }

  removeItem(itemId: string, quantity: number = 1): boolean {
    if (!Number.isFinite(quantity) || quantity <= 0) return false
    const item = GAME_CONFIG_DATABASE.getTable('items')[itemId]
    const bag = item?.type === 'equipment' ? this.inventory.equipment : this.inventory.items
    const current = bag[itemId] || 0
    if (current < quantity) return false
    bag[itemId] = current - quantity
    if (bag[itemId] <= 0) {
      delete bag[itemId]
    }
    return true
  }

  hasItem(itemId: string, quantity: number = 1): boolean {
    return this.getItemQuantity(itemId) >= quantity
  }

  addGold(amount: number): void {
    if (!Number.isFinite(amount) || amount <= 0) return
    this.gold += amount
  }

  spendGold(amount: number): boolean {
    if (!Number.isFinite(amount) || amount <= 0) return false
    if (this.gold < amount) return false
    this.gold -= amount
    return true
  }

  addPartyMember(charId: string): void {
    if (!this.party.includes(charId) && !this.reserve.includes(charId)) {
      if (this.party.length < PARTY_RULES.ACTIVE_MEMBER_LIMIT) {
        this.party.push(charId)
      } else {
        this.reserve.push(charId)
      }
    }
  }

  removePartyMember(charId: string): boolean {
    const partyIndex = this.party.indexOf(charId)
    if (partyIndex >= 0) {
      this.party.splice(partyIndex, 1)
      const promoted = this.reserve.shift()
      if (promoted && !this.party.includes(promoted)) {
        this.party.push(promoted)
      }
      return true
    }

    const reserveIndex = this.reserve.indexOf(charId)
    if (reserveIndex >= 0) {
      this.reserve.splice(reserveIndex, 1)
      return true
    }

    return false
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
      char.stats.hp = char.stats.maxHp
      char.stats.mp = char.stats.maxMp
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

  private restoreBaseStats(
    serializedBaseStats: Record<string, CharacterStats> | undefined,
    serializedCharacterIds: ReadonlySet<string>,
  ): void {
    this.baseStats = new Map()
    for (const [charId, char] of this.characters) {
      const serializedStats = serializedBaseStats?.[charId]
      if (serializedStats) {
        this.baseStats.set(charId, { ...serializedStats })
        continue
      }
      const bonus = serializedCharacterIds.has(charId) ? this.getEquipStats(charId) : createEmptyEquipStats()
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

  private getBaseStatsForProgression(charId: string, char: CharacterData): CharacterStats {
    const existing = this.baseStats.get(charId)
    if (existing) return existing
    const bonus = this.getEquipStats(charId)
    const base = {
      ...char.stats,
      atk: char.stats.atk - bonus.atk,
      def: char.stats.def - bonus.def,
      matk: char.stats.matk - bonus.matk,
      mdef: char.stats.mdef - bonus.mdef,
      speed: char.stats.speed - bonus.speed,
      maxHp: char.stats.maxHp - bonus.maxHp,
      maxMp: char.stats.maxMp - bonus.maxMp,
    }
    this.baseStats.set(charId, base)
    return base
  }

  gainCharacterExperience(charId: string, amount: number): LevelUpResult[] {
    if (amount <= 0) return []
    const char = this.characters.get(charId)
    if (!char) return []

    const base = this.getBaseStatsForProgression(charId, char)
    const currentHp = char.stats.hp
    const currentMp = char.stats.mp
    const levelUps: LevelUpResult[] = []
    base.exp += amount

    while (base.expToNext > 0 && base.exp >= base.expToNext) {
      base.exp -= base.expToNext
      base.level++
      base.expToNext = Math.floor(base.expToNext * LEVEL_GROWTH.EXP_TO_NEXT_MULTIPLIER)
      base.maxHp += LEVEL_GROWTH.MAX_HP_BASE_GAIN + base.level * LEVEL_GROWTH.MAX_HP_LEVEL_GAIN
      base.maxMp += LEVEL_GROWTH.MAX_MP_BASE_GAIN + base.level * LEVEL_GROWTH.MAX_MP_LEVEL_GAIN
      base.atk += LEVEL_GROWTH.ATK_GAIN
      base.def += LEVEL_GROWTH.DEF_GAIN
      base.matk += LEVEL_GROWTH.MATK_GAIN
      base.mdef += LEVEL_GROWTH.MDEF_GAIN
      base.speed += LEVEL_GROWTH.SPEED_GAIN
      levelUps.push({ charId, name: char.name, level: base.level })
    }

    char.stats.level = base.level
    char.stats.exp = base.exp
    char.stats.expToNext = base.expToNext
    this.applyEquipment(charId)

    if (levelUps.length > 0) {
      char.stats.hp = char.stats.maxHp
      char.stats.mp = char.stats.maxMp
      EventBus.emit(GameEvents.LEVEL_UP, { charId, level: char.stats.level })
    } else {
      char.stats.hp = Math.min(currentHp, char.stats.maxHp)
      char.stats.mp = Math.min(currentMp, char.stats.maxMp)
    }

    return levelUps
  }

  gainPartyExperience(amount: number): LevelUpResult[] {
    return this.party.flatMap(charId => this.gainCharacterExperience(charId, amount))
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
    char.stats.hp = Math.min(char.stats.hp, char.stats.maxHp)
    char.stats.mp = Math.min(char.stats.mp, char.stats.maxMp)
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
    this.updateBranch(key, current + amount)
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
    this.branches.mercy_score = this.clampBranchNumber('mercy_score', this.branches.mercy_score + amount)
    this.syncFlagFromBranch('mercy_score')
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

  private normalizePartyRoster(): void {
    const nextParty: string[] = []
    const nextReserve: string[] = []
    const seen = new Set<string>()
    const addMember = (charId: string): void => {
      if (seen.has(charId) || !this.characters.has(charId)) return
      seen.add(charId)
      if (nextParty.length < PARTY_RULES.ACTIVE_MEMBER_LIMIT) {
        nextParty.push(charId)
      } else {
        nextReserve.push(charId)
      }
    }

    for (const charId of [...this.party, ...this.reserve]) {
      addMember(charId)
    }
    if (nextParty.length === 0) {
      for (const charId of START_PARTY) addMember(charId)
    }

    this.party = nextParty
    this.reserve = nextReserve
  }

  private normalizeQuestState(questId: string, state: QuestState): QuestState {
    const definition = GAME_CONFIG_DATABASE.getTable('quests')[questId]
    if (!definition) return { ...state }
    const maxProgress = definition.objectives.length
    const progress = state.status === 'completed'
      ? maxProgress
      : Math.max(0, Math.min(maxProgress, state.progress))
    return { ...state, id: questId, progress, maxProgress }
  }

  private isWalkableSavedPosition(map: MapData, x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= map.width || y >= map.height) return false
    return !map.collisions.includes(y * map.width + x)
  }

  private findNearestWalkableSavedPosition(map: MapData, target: { x: number; y: number }): { x: number; y: number } | null {
    const fallbackX = Number.isFinite(target.x) ? Math.floor(target.x) : START_PLAYER_POSITION.x
    const fallbackY = Number.isFinite(target.y) ? Math.floor(target.y) : START_PLAYER_POSITION.y
    const centerX = Math.max(0, Math.min(map.width - 1, fallbackX))
    const centerY = Math.max(0, Math.min(map.height - 1, fallbackY))
    if (this.isWalkableSavedPosition(map, centerX, centerY)) return { x: centerX, y: centerY }

    const maxRadius = Math.max(map.width, map.height)
    for (let radius = 1; radius <= maxRadius; radius++) {
      for (let y = centerY - radius; y <= centerY + radius; y++) {
        for (let x = centerX - radius; x <= centerX + radius; x++) {
          if (Math.abs(x - centerX) !== radius && Math.abs(y - centerY) !== radius) continue
          if (this.isWalkableSavedPosition(map, x, y)) return { x, y }
        }
      }
    }
    return null
  }

  private normalizeCurrentLocation(): void {
    const maps = GAME_CONFIG_DATABASE.getTable('maps')
    this.currentMap = resolveCanonicalMapId(this.currentMap, this.rebuildLevel)
    let map = maps[this.currentMap]
    if (!map) {
      this.currentMap = START_MAP_ID
      map = maps[START_MAP_ID]
      this.playerPosition = { ...START_PLAYER_POSITION }
    }
    if (!map) return

    const walkable = this.findNearestWalkableSavedPosition(map, this.playerPosition)
    this.playerPosition = walkable ?? { x: 0, y: 0 }
  }

  serialize(): object {
    this.syncPlayTime()
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
    this.playTimeSyncedAtMs = Date.now()
    this.currentMap = (d.currentMap as string) ?? START_MAP_ID
    this.playerPosition = { ...START_PLAYER_POSITION, ...((d.playerPosition as Partial<{ x: number; y: number }>) ?? {}) }
    this.playerDirection = (d.playerDirection as number) ?? START_PLAYER_DIRECTION
    this.party = [...((d.party as string[] | undefined) ?? START_PARTY)]
    this.reserve = [...((d.reserve as string[] | undefined) ?? [])]
    const characters = d.characters as Record<string, CharacterData> | undefined
    const serializedCharacterIds = new Set(Object.keys(characters ?? {}))
    this.characters = characters && Object.keys(characters).length > 0
      ? new Map(Object.entries(characters).map(([id, char]) => [id, this.cloneCharacter(char)]))
      : new Map(Object.keys(GAME_CONFIG_DATABASE.getTable('characters')).map(id => [id, createConfiguredCharacter(id)]))
    for (const id of Object.keys(GAME_CONFIG_DATABASE.getTable('characters'))) {
      if (!this.characters.has(id)) {
        this.characters.set(id, createConfiguredCharacter(id))
      }
    }
    this.normalizePartyRoster()
    const inventory = (d.inventory as Partial<Inventory>) ?? {}
    this.inventory = {
      items: { ...(inventory.items ?? {}) },
      equipment: { ...(inventory.equipment ?? {}) },
    }
    const serializedEquipment = this.cloneEquipmentIndex((d.equipment as Record<string, string[]>) ?? {})
    const serializedBaseStats = d.baseStats as Record<string, CharacterStats> | undefined
    this.equipment = serializedEquipment
    this.quests = new Map(Object.entries((d.quests as Record<string, QuestState>) ?? {})
      .map(([id, quest]) => [id, this.normalizeQuestState(id, quest)]))
    this.flags = { ...((d.flags as GameFlags) ?? {}) }
    this.branches = { ...createDefaultBranches(), ...((d.branches as Partial<BranchState>) ?? {}) }
    this.normalizeBranchNumbers()
    this.migrateLegacyProgressionFlags()
    const serializedRebuildLevel = typeof d.rebuildLevel === 'number' ? d.rebuildLevel : this.branches.rebuild_level
    this.rebuildLevel = this.clampRebuildLevel(serializedRebuildLevel)
    this.branches.rebuild_level = this.rebuildLevel
    this.flags.rebuild_level = this.rebuildLevel
    this.gold = (d.gold as number) ?? INITIAL_GOLD
    this.unlockedCodex = [...((d.unlockedCodex as string[] | undefined) ?? [])]
    this.settings = { ...DEFAULT_GAME_SETTINGS, ...((d.settings as Partial<GameSettings>) ?? {}) }
    this.syncEquipmentIndex(serializedEquipment)
    this.restoreBaseStats(serializedBaseStats, serializedCharacterIds)
    for (const charId of this.characters.keys()) {
      this.applyEquipment(charId)
    }
    this.syncTrueRouteState()
    this.syncProgressionFlags()
    this.syncRebuildFacilityFlags()
    this.normalizeCurrentLocation()
  }

  syncPlayTime(nowMs = Date.now()): void {
    const elapsedMs = Math.max(0, nowMs - this.playTimeSyncedAtMs)
    const elapsedSeconds = Math.floor(elapsedMs / TIME_MS_PER_SECOND)
    if (elapsedSeconds <= 0) return
    this.playTime += elapsedSeconds
    this.playTimeSyncedAtMs += elapsedSeconds * TIME_MS_PER_SECOND
  }
}
