import { GameData } from './GameData'
import { InputManager } from './InputManager'
import { BATTLE_RULES, QUICK_SAVE_SLOT, SAVE_SLOT_MIN, SAVE_SLOTS, SAVE_STORAGE_KEY } from '../utils/constants'

function isSaveImportObject(data: unknown): data is object {
  return typeof data === 'object' && data !== null && !Array.isArray(data)
}

function isFiniteNumber(data: unknown): data is number {
  return typeof data === 'number' && Number.isFinite(data)
}

function isFiniteNonNegativeNumber(data: unknown): data is number {
  return isFiniteNumber(data) && data >= 0
}

function isStringArray(data: unknown): data is string[] {
  return Array.isArray(data) && data.every(value => typeof value === 'string')
}

function isNumberRecord(data: unknown): boolean {
  return isSaveImportObject(data)
    && Object.values(data as Record<string, unknown>).every(isFiniteNonNegativeNumber)
}

const CHARACTER_STAT_KEYS = [
  'hp', 'mp', 'maxHp', 'maxMp', 'atk', 'def', 'matk', 'mdef', 'speed', 'level', 'exp', 'expToNext',
] as const

function isCharacterStats(data: unknown): boolean {
  if (!isSaveImportObject(data)) return false
  const stats = data as Record<string, unknown>
  return CHARACTER_STAT_KEYS.every(key => isFiniteNonNegativeNumber(stats[key]))
    && Number(stats.maxHp) > 0
    && Number(stats.hp) <= Number(stats.maxHp)
    && Number(stats.mp) <= Number(stats.maxMp)
    && Number(stats.level) >= 1
}

function isCharacterData(data: unknown): boolean {
  if (!isSaveImportObject(data)) return false
  const character = data as Record<string, unknown>
  if (!isSaveImportObject(character.equipment)) return false
  const equipment = character.equipment as Record<string, unknown>
  const hasValidEquipment = ['weapon', 'armor', 'accessory'].every(key => {
    const itemId = equipment[key]
    return itemId === null || typeof itemId === 'string'
  })
  return typeof character.id === 'string'
    && typeof character.name === 'string'
    && isCharacterStats(character.stats)
    && isStringArray(character.skills)
    && hasValidEquipment
    && isFiniteNonNegativeNumber(character.tp)
    && character.tp <= BATTLE_RULES.MAX_TP
}

function isQuestState(data: unknown): boolean {
  if (!isSaveImportObject(data)) return false
  const quest = data as Record<string, unknown>
  return typeof quest.id === 'string'
    && ['inactive', 'active', 'completed', 'failed'].includes(quest.status as string)
    && isFiniteNonNegativeNumber(quest.progress)
    && isFiniteNonNegativeNumber(quest.maxProgress)
}

function hasValidOptionalField(
  data: Record<string, unknown>,
  key: string,
  predicate: (value: unknown) => boolean,
): boolean {
  return !(key in data) || predicate(data[key])
}

function isGameSettings(data: unknown): boolean {
  if (!isSaveImportObject(data)) return false
  const settings = data as Record<string, unknown>
  const optionValues: Record<string, readonly string[]> = {
    textSpeed: ['slow', 'normal', 'fast', 'instant'],
    battleSpeed: ['normal', 'fast', 'fastest'],
    encounterRate: ['default', 'reduced', 'none'],
    difficulty: ['story', 'standard', 'hard'],
    prophecyHint: ['poem', 'light', 'clear'],
    controlMode: ['arrows', 'wasd'],
  }
  for (const [key, values] of Object.entries(optionValues)) {
    if (!hasValidOptionalField(settings, key, value => typeof value === 'string' && values.includes(value))) return false
  }
  for (const key of ['masterVolume', 'musicVolume', 'sfxVolume', 'uiVolume']) {
    if (!hasValidOptionalField(settings, key, value => isFiniteNonNegativeNumber(value) && value <= 1)) return false
  }
  for (const key of ['pixelSharp', 'fullscreen', 'gamepad']) {
    if (!hasValidOptionalField(settings, key, value => typeof value === 'boolean')) return false
  }
  return true
}

function isGameSaveData(data: unknown): data is object {
  if (!isSaveImportObject(data)) return false
  const save = data as Record<string, unknown>
  if (typeof save.currentMap !== 'string' || save.currentMap.length === 0) return false
  if (!isStringArray(save.party) || save.party.length === 0) return false
  if (!isSaveImportObject(save.characters)) return false
  const characterEntries = Object.entries(save.characters as Record<string, unknown>)
  if (characterEntries.length === 0 || !characterEntries.every(([id, character]) => {
    return isCharacterData(character) && (character as Record<string, unknown>).id === id
  })) return false

  if (!hasValidOptionalField(save, 'playTime', isFiniteNonNegativeNumber)) return false
  if (!hasValidOptionalField(save, 'playerDirection', value => Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 3)) return false
  if (!hasValidOptionalField(save, 'reserve', isStringArray)) return false
  if (!hasValidOptionalField(save, 'gold', isFiniteNonNegativeNumber)) return false
  if (!hasValidOptionalField(save, 'rebuildLevel', isFiniteNonNegativeNumber)) return false
  if (!hasValidOptionalField(save, 'unlockedCodex', isStringArray)) return false
  if (!hasValidOptionalField(save, 'settings', isGameSettings)) return false
  if (!hasValidOptionalField(save, 'playerPosition', value => {
    if (!isSaveImportObject(value)) return false
    const position = value as Record<string, unknown>
    return isFiniteNumber(position.x) && isFiniteNumber(position.y)
  })) return false

  if (!hasValidOptionalField(save, 'inventory', value => {
    if (!isSaveImportObject(value)) return false
    const inventory = value as Record<string, unknown>
    return hasValidOptionalField(inventory, 'items', isNumberRecord)
      && hasValidOptionalField(inventory, 'equipment', isNumberRecord)
  })) return false

  if (!hasValidOptionalField(save, 'equipment', value => isSaveImportObject(value)
    && Object.values(value as Record<string, unknown>).every(isStringArray))) return false
  if (!hasValidOptionalField(save, 'baseStats', value => isSaveImportObject(value)
    && Object.values(value as Record<string, unknown>).every(isCharacterStats))) return false
  if (!hasValidOptionalField(save, 'quests', value => isSaveImportObject(value)
    && Object.values(value as Record<string, unknown>).every(isQuestState))) return false
  if (!hasValidOptionalField(save, 'flags', isSaveImportObject)) return false
  if (!hasValidOptionalField(save, 'branches', value => {
    if (!isSaveImportObject(value)) return false
    const branches = value as Record<string, unknown>
    const trustKeys = ['trust_huihui', 'trust_a', 'trust_congcong', 'trust_sun']
    const numberKeys = ['mercy_score', 'rebuild_level', 'xiaoai_memory_fragments']
    const booleanKeys = ['white_tiger_respected', 'answered_xiyuan_kindly', 'released_four_seals', 'xiaoai_purified', 'normal_ending_seen', 'true_route_unlocked', 'true_route_reincarnation']
    return trustKeys.every(key => hasValidOptionalField(branches, key, isFiniteNumber))
      && numberKeys.every(key => hasValidOptionalField(branches, key, isFiniteNonNegativeNumber))
      && booleanKeys.every(key => hasValidOptionalField(branches, key, item => typeof item === 'boolean'))
      && hasValidOptionalField(branches, 'prophecy_hint_mode', item => typeof item === 'string')
  })) return false

  return true
}

function isSaveMeta(data: unknown, slot: number): data is SaveMeta {
  if (!isSaveImportObject(data)) return false
  const meta = data as Record<string, unknown>
  return meta.slot === slot
    && Number.isInteger(meta.slot)
    && typeof meta.timestamp === 'number'
    && Number.isFinite(meta.timestamp)
    && meta.timestamp >= 0
    && typeof meta.playTime === 'number'
    && Number.isFinite(meta.playTime)
    && meta.playTime >= 0
    && typeof meta.currentMap === 'string'
    && meta.currentMap.length > 0
    && typeof meta.preview === 'string'
}

export interface SaveMeta {
  slot: number
  timestamp: number
  playTime: number
  currentMap: string
  preview: string
}

export class SaveManager {
  private static instance: SaveManager
  private gameData: GameData

  private constructor() {
    this.gameData = GameData.getInstance()
  }

  static getInstance(): SaveManager {
    if (!SaveManager.instance) {
      SaveManager.instance = new SaveManager()
    }
    return SaveManager.instance
  }

  private isValidSlot(slot: number): boolean {
    return Number.isInteger(slot) && ((slot >= SAVE_SLOT_MIN && slot <= SAVE_SLOTS) || slot === QUICK_SAVE_SLOT)
  }

  private getStorage(): Storage | null {
    try {
      return typeof window !== 'undefined' ? window.localStorage : globalThis.localStorage ?? null
    } catch (e) {
      console.warn('Local save storage is unavailable:', e)
      return null
    }
  }

  private restoreStorageValue(storage: Storage, key: string, value: string | null): void {
    try {
      if (value === null) {
        storage.removeItem(key)
      } else {
        storage.setItem(key, value)
      }
    } catch (e) {
      console.error(`Save rollback failed for ${key}:`, e)
    }
  }

  private restoreSlot(storage: Storage, slot: number, data: string | null, meta: string | null): void {
    const dataKey = `${SAVE_STORAGE_KEY}_data_${slot}`
    const metaKey = `${SAVE_STORAGE_KEY}_meta_${slot}`
    this.restoreStorageValue(storage, dataKey, data)
    this.restoreStorageValue(storage, metaKey, meta)
  }

  private getPartyPreview(): string {
    return this.gameData.party
      .map(charId => this.gameData.characters.get(charId)?.name ?? charId)
      .join(', ')
  }

  save(slot: number): boolean {
    if (!this.isValidSlot(slot)) return false
    const storage = this.getStorage()
    if (!storage) return false
    try {
      const dataKey = `${SAVE_STORAGE_KEY}_data_${slot}`
      const metaKey = `${SAVE_STORAGE_KEY}_meta_${slot}`
      const data = this.gameData.serialize()
      const meta: SaveMeta = {
        slot,
        timestamp: Date.now(),
        playTime: this.gameData.playTime,
        currentMap: this.gameData.currentMap,
        preview: this.getPartyPreview(),
      }
      const serializedData = JSON.stringify(data)
      const serializedMeta = JSON.stringify(meta)
      const previousData = storage.getItem(dataKey)
      const previousMeta = storage.getItem(metaKey)
      try {
        storage.setItem(dataKey, serializedData)
        storage.setItem(metaKey, serializedMeta)
        return true
      } catch (e) {
        this.restoreSlot(storage, slot, previousData, previousMeta)
        console.error('Save failed:', e)
        return false
      }
    } catch (e) {
      console.error('Save failed:', e)
      return false
    }
  }

  load(slot: number): boolean {
    if (!this.isValidSlot(slot)) return false
    const storage = this.getStorage()
    if (!storage) return false
    let previousGameData: object | null = null
    const inputManager = InputManager.getInstance()
    try {
      const raw = storage.getItem(`${SAVE_STORAGE_KEY}_data_${slot}`)
      if (!raw) return false
      const data: unknown = JSON.parse(raw)
      if (!isGameSaveData(data)) return false
      previousGameData = this.gameData.serialize()
      this.gameData.deserialize(data)
      inputManager.syncFromGameData()
      return true
    } catch (e) {
      if (previousGameData) {
        try {
          this.gameData.deserialize(previousGameData)
          inputManager.syncFromGameData()
        } catch (rollbackError) {
          console.error('Load rollback failed:', rollbackError)
        }
      }
      console.error('Load failed:', e)
      return false
    }
  }

  getMeta(slot: number): SaveMeta | null {
    if (!this.isValidSlot(slot)) return null
    const storage = this.getStorage()
    if (!storage) return null
    try {
      const raw = storage.getItem(`${SAVE_STORAGE_KEY}_meta_${slot}`)
      if (!raw) return null
      const data: unknown = JSON.parse(raw)
      return isSaveMeta(data, slot) ? data : null
    } catch {
      return null
    }
  }

  hasSave(slot: number): boolean {
    if (!this.isValidSlot(slot)) return false
    const storage = this.getStorage()
    if (!storage) return false
    try {
      return storage.getItem(`${SAVE_STORAGE_KEY}_data_${slot}`) !== null
    } catch {
      return false
    }
  }

  private isLoadableSave(slot: number): boolean {
    if (!this.isValidSlot(slot)) return false
    const storage = this.getStorage()
    if (!storage) return false
    try {
      const raw = storage.getItem(`${SAVE_STORAGE_KEY}_data_${slot}`)
      if (!raw) return false
      return isGameSaveData(JSON.parse(raw) as unknown)
    } catch {
      return false
    }
  }

  getLatestSaveSlot(): number | null {
    let latestSlot: number | null = null
    let latestTimestamp = Number.NEGATIVE_INFINITY
    for (let slot = SAVE_SLOT_MIN; slot <= QUICK_SAVE_SLOT; slot++) {
      if (!this.isLoadableSave(slot)) continue
      const timestamp = this.getMeta(slot)?.timestamp ?? 0
      if (latestSlot === null || timestamp >= latestTimestamp) {
        latestSlot = slot
        latestTimestamp = timestamp
      }
    }
    return latestSlot
  }

  deleteSave(slot: number): boolean {
    if (!this.isValidSlot(slot)) return false
    const storage = this.getStorage()
    if (!storage) return false
    try {
      const dataKey = `${SAVE_STORAGE_KEY}_data_${slot}`
      const metaKey = `${SAVE_STORAGE_KEY}_meta_${slot}`
      const previousData = storage.getItem(dataKey)
      const previousMeta = storage.getItem(metaKey)
      try {
        storage.removeItem(dataKey)
        storage.removeItem(metaKey)
        return true
      } catch (e) {
        this.restoreSlot(storage, slot, previousData, previousMeta)
        console.error('Delete save failed:', e)
        return false
      }
    } catch (e) {
      console.error('Delete save failed:', e)
      return false
    }
  }

  quickSave(): boolean {
    return this.save(QUICK_SAVE_SLOT)
  }

  quickLoad(): boolean {
    return this.load(QUICK_SAVE_SLOT)
  }

  exportSave(slot: number): string | null {
    if (!this.isValidSlot(slot)) return null
    const storage = this.getStorage()
    if (!storage) return null
    try {
      const raw = storage.getItem(`${SAVE_STORAGE_KEY}_data_${slot}`)
      return raw
    } catch {
      return null
    }
  }

  importSave(slot: number, dataStr: string): boolean {
    if (!this.isValidSlot(slot)) return false
    let data: unknown
    try {
      data = JSON.parse(dataStr)
    } catch {
      return false
    }
    if (!isGameSaveData(data)) return false

    const storage = this.getStorage()
    if (!storage) return false

    const dataKey = `${SAVE_STORAGE_KEY}_data_${slot}`
    const metaKey = `${SAVE_STORAGE_KEY}_meta_${slot}`
    let previousSlotData: string | null
    let previousSlotMeta: string | null
    let previousGameData: object
    try {
      previousSlotData = storage.getItem(dataKey)
      previousSlotMeta = storage.getItem(metaKey)
      previousGameData = this.gameData.serialize()
    } catch (e) {
      console.error('Import save setup failed:', e)
      return false
    }
    const inputManager = InputManager.getInstance()

    try {
      this.gameData.deserialize(data)
      inputManager.syncFromGameData()
      if (this.save(slot)) return true
    } catch {
      // Fall through to restore the current play session below.
    }

    this.gameData.deserialize(previousGameData)
    inputManager.syncFromGameData()
    this.restoreSlot(storage, slot, previousSlotData, previousSlotMeta)
    return false
  }
}
