import { INITIAL_CHARACTERS } from './characters'
import { ITEMS } from './items'
import { SKILLS } from './skills'
import { ENEMIES } from './enemies'
import { ENCOUNTERS } from './encounters'
import { QUESTS } from './quests'
import { DIALOGUES } from './dialogues'
import { MAPS } from './maps'
import { PROPHECIES } from './prophecies'
import { TILE_SPRITES } from './tileSprites'
import { IMAGE_ASSETS } from './assets'
import { BGM_TRACKS, MAP_BGM_MAP, SFX_TRACKS } from './audio'
import { SPRITE_CROPS } from './spriteCrops'
import { CONFIG_DATABASE_STORAGE_KEY, CONFIG_EDITOR_TABLE_LABELS } from '../utils/constants'
import type { ProphecyVerse } from './prophecies'
import type { BGMConfig, SFXConfig } from './audio'
import type { SpriteCropConfig } from './spriteCrops'
import type { CharacterData, DialogueData, EncounterData, EnemyData, ItemData, MapData, QuestDef, SkillData } from './types'

export const CONFIG_DATABASE_STORAGE_VERSION = 1

export interface GameConfigTables {
  maps: Record<string, MapData>
  characters: Record<string, CharacterData>
  items: Record<string, ItemData>
  skills: Record<string, SkillData>
  enemies: Record<string, EnemyData>
  encounters: Record<string, EncounterData>
  quests: Record<string, QuestDef>
  dialogues: Record<string, DialogueData>
  prophecies: ProphecyVerse[]
  tileSprites: Record<number, string>
  imageAssets: Record<string, string>
  bgmTracks: Record<string, BGMConfig>
  sfxTracks: Record<string, SFXConfig>
  mapBgm: Record<string, string>
  spriteCrops: Record<string, SpriteCropConfig>
}

export type GameConfigTableKey = keyof GameConfigTables
export type GameConfigRecord = Record<string, unknown> | unknown[]

export const GAME_CONFIG_TABLE_KEYS = Object.keys(CONFIG_EDITOR_TABLE_LABELS) as GameConfigTableKey[]

export const DEFAULT_GAME_CONFIG_TABLES: GameConfigTables = {
  maps: MAPS,
  characters: INITIAL_CHARACTERS,
  items: ITEMS,
  skills: SKILLS,
  enemies: ENEMIES,
  encounters: ENCOUNTERS,
  quests: QUESTS,
  dialogues: DIALOGUES,
  prophecies: PROPHECIES,
  tileSprites: TILE_SPRITES,
  imageAssets: IMAGE_ASSETS,
  bgmTracks: BGM_TRACKS,
  sfxTracks: SFX_TRACKS,
  mapBgm: MAP_BGM_MAP,
  spriteCrops: SPRITE_CROPS,
}

export function cloneConfigData<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value)) as T
}

function getLocalStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage
    return (globalThis as { localStorage?: Storage }).localStorage ?? null
  } catch (error) {
    console.warn('Local configuration storage is unavailable', error)
    return null
  }
}

function canUseLocalStorage(): boolean {
  return getLocalStorage() !== null
}

function isRecordTable(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function isPlausibleTablesPayload(value: unknown): value is Partial<GameConfigTables> {
  if (!isRecordTable(value)) return false
  for (const key of GAME_CONFIG_TABLE_KEYS) {
    const table = value[key]
    if (table === undefined) continue
    if (key === 'prophecies') {
      if (!Array.isArray(table)) return false
      continue
    }
    if (!isRecordTable(table)) return false
  }
  return true
}

function isVersionedSnapshot(value: unknown): value is { version: number; tables: unknown } {
  return isRecordTable(value)
    && value.version === CONFIG_DATABASE_STORAGE_VERSION
    && isRecordTable(value.tables)
}

export class GameConfigDatabase {
  readonly defaults: GameConfigTables
  tables: GameConfigTables

  constructor(defaults: GameConfigTables) {
    this.defaults = cloneConfigData(defaults)
    this.tables = cloneConfigData(defaults)
    this.applyLocalOverrides()
  }

  getTable<K extends GameConfigTableKey>(key: K): GameConfigTables[K] {
    return this.tables[key]
  }

  setTable<K extends GameConfigTableKey>(key: K, value: GameConfigTables[K]): void {
    this.tables[key] = cloneConfigData(value)
    this.persist()
  }

  setRecord<K extends GameConfigTableKey>(key: K, recordId: string, value: unknown): void {
    const table = this.tables[key]
    if (Array.isArray(table)) {
      const next = [...table]
      const index = next.findIndex(record => isRecordTable(record) && record.id === recordId)
      if (index >= 0) next[index] = cloneConfigData(value) as never
      else next.push(cloneConfigData(value) as never)
      this.tables[key] = next as GameConfigTables[K]
      this.persist()
      return
    }
    if (!isRecordTable(table)) {
      console.warn(`Config table ${key} cannot accept record updates`)
      return
    }
    const recordTable = table as Record<string, unknown>
    recordTable[recordId] = cloneConfigData(value)
    this.persist()
  }

  deleteRecord<K extends GameConfigTableKey>(key: K, recordId: string): void {
    const table = this.tables[key]
    if (Array.isArray(table)) {
      this.tables[key] = table.filter(record => !isRecordTable(record) || record.id !== recordId) as GameConfigTables[K]
      this.persist()
      return
    }
    if (!isRecordTable(table)) {
      console.warn(`Config table ${key} cannot delete records`)
      return
    }
    const recordTable = table as Record<string, unknown>
    delete recordTable[recordId]
    this.persist()
  }

  reset(): void {
    this.tables = cloneConfigData(this.defaults)
    getLocalStorage()?.removeItem(CONFIG_DATABASE_STORAGE_KEY)
  }

  exportSnapshot(): GameConfigTables {
    return cloneConfigData(this.tables)
  }

  importSnapshot(snapshot: Partial<GameConfigTables>): void {
    this.tables = {
      ...cloneConfigData(this.defaults),
      ...cloneConfigData(snapshot),
    } as GameConfigTables
    this.persist()
  }

  persist(): void {
    const storage = getLocalStorage()
    if (!storage) return
    try {
      const snapshot = JSON.stringify({ version: CONFIG_DATABASE_STORAGE_VERSION, tables: this.tables })
      storage.setItem(CONFIG_DATABASE_STORAGE_KEY, snapshot)
    } catch (error) {
      console.error('Failed to persist configuration database', error)
    }
  }

  private ignoreCorruptOverride(raw: string): void {
    console.warn('Ignoring invalid configuration overrides; defaults restored')
    try {
      getLocalStorage()?.setItem(`${CONFIG_DATABASE_STORAGE_KEY}_corrupt_backup`, raw)
    } catch (error) {
      console.warn('Failed to back up corrupt configuration overrides', error)
    }
  }

  private applyLocalOverrides(): void {
    const storage = getLocalStorage()
    if (!storage) return
    let raw: string | null = null
    try {
      raw = storage.getItem(CONFIG_DATABASE_STORAGE_KEY)
      if (!raw) return
      const parsed: unknown = JSON.parse(raw)

      let candidate: unknown = parsed
      if (isVersionedSnapshot(parsed)) {
        candidate = parsed.tables
      } else if (isRecordTable(parsed) && parsed.version === undefined && isPlausibleTablesPayload(parsed)) {
        // 旧版裸 tables 格式：接受并在首次加载时迁移为带版本格式
        candidate = parsed
        this.persist()
      } else {
        this.ignoreCorruptOverride(raw)
        return
      }

      if (!isPlausibleTablesPayload(candidate)) {
        this.ignoreCorruptOverride(raw)
        return
      }
      this.tables = {
        ...this.tables,
        ...candidate,
      } as GameConfigTables
    } catch (error) {
      console.error('Failed to load configuration database overrides', error)
      if (raw) this.ignoreCorruptOverride(raw)
    }
  }
}

export const GAME_CONFIG_DATABASE = new GameConfigDatabase(DEFAULT_GAME_CONFIG_TABLES)
