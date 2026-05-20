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
import type { DialogueScript } from '../scenes/DialogueOverlay'
import type { ProphecyVerse } from './prophecies'
import type { BGMConfig, SFXConfig } from './audio'
import type { SpriteCropConfig } from './spriteCrops'
import type { CharacterData, EncounterData, EnemyData, ItemData, MapData, QuestDef, SkillData } from './types'

export interface GameConfigTables {
  maps: Record<string, MapData>
  characters: Record<string, CharacterData>
  items: Record<string, ItemData>
  skills: Record<string, SkillData>
  enemies: Record<string, EnemyData>
  encounters: Record<string, EncounterData>
  quests: Record<string, QuestDef>
  dialogues: Record<string, DialogueScript>
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

function canUseLocalStorage(): boolean {
  try {
    return typeof window !== 'undefined' && Boolean(window.localStorage)
  } catch (error) {
    console.warn('Local configuration storage is unavailable', error)
    return false
  }
}

function isRecordTable(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
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
    if (canUseLocalStorage()) {
      window.localStorage.removeItem(CONFIG_DATABASE_STORAGE_KEY)
    }
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
    if (!canUseLocalStorage()) return
    try {
      window.localStorage.setItem(CONFIG_DATABASE_STORAGE_KEY, JSON.stringify(this.tables))
    } catch (error) {
      console.error('Failed to persist configuration database', error)
    }
  }

  private applyLocalOverrides(): void {
    if (!canUseLocalStorage()) return
    try {
      const raw = window.localStorage.getItem(CONFIG_DATABASE_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as Partial<GameConfigTables>
      this.tables = {
        ...this.tables,
        ...parsed,
      } as GameConfigTables
    } catch (error) {
      console.error('Failed to load configuration database overrides', error)
    }
  }
}

export const GAME_CONFIG_DATABASE = new GameConfigDatabase(DEFAULT_GAME_CONFIG_TABLES)
