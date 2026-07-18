import { GameData } from './GameData'
import { DEFAULT_GAME_SETTINGS } from '../utils/constants'

export const SETTINGS_STORAGE_KEY = 'casktown_settings'
export const SETTINGS_STORAGE_VERSION = 1

type GameSettings = GameData['settings']

type PersistedGameSettings = Omit<GameSettings, 'fullscreen'>
type KeyBindingAction = 'up' | 'down' | 'left' | 'right' | 'confirm' | 'cancel' | 'menu' | 'dash'
type PersistedKeyBindings = Partial<Record<KeyBindingAction, string>>

interface SettingsStoragePayload {
  version: typeof SETTINGS_STORAGE_VERSION
  settings: PersistedGameSettings
  keyBindings?: PersistedKeyBindings
}

const TEXT_SPEEDS: readonly GameSettings['textSpeed'][] = ['slow', 'normal', 'fast', 'instant']
const BATTLE_SPEEDS: readonly GameSettings['battleSpeed'][] = ['normal', 'fast', 'fastest']
const ENCOUNTER_RATES: readonly GameSettings['encounterRate'][] = ['default', 'reduced', 'none']
const DIFFICULTIES: readonly GameSettings['difficulty'][] = ['story', 'standard', 'hard']
const PROPHECY_HINTS: readonly GameSettings['prophecyHint'][] = ['poem', 'light', 'clear']
const CONTROL_MODES: readonly GameSettings['controlMode'][] = ['arrows', 'wasd']
const KEY_BINDING_ACTIONS: readonly KeyBindingAction[] = [
  'up',
  'down',
  'left',
  'right',
  'confirm',
  'cancel',
  'menu',
  'dash',
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readOption<T extends string>(
  value: unknown,
  options: readonly T[],
  fallback: T,
): T {
  return typeof value === 'string' && options.includes(value as T) ? value as T : fallback
}

function readVolume(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
    ? value
    : fallback
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

export function normalizeStoredGameSettings(value: unknown): GameSettings {
  const settings = isRecord(value) ? value : {}
  return {
    textSpeed: readOption(settings.textSpeed, TEXT_SPEEDS, DEFAULT_GAME_SETTINGS.textSpeed),
    battleSpeed: readOption(settings.battleSpeed, BATTLE_SPEEDS, DEFAULT_GAME_SETTINGS.battleSpeed),
    encounterRate: readOption(settings.encounterRate, ENCOUNTER_RATES, DEFAULT_GAME_SETTINGS.encounterRate),
    difficulty: readOption(settings.difficulty, DIFFICULTIES, DEFAULT_GAME_SETTINGS.difficulty),
    prophecyHint: readOption(settings.prophecyHint, PROPHECY_HINTS, DEFAULT_GAME_SETTINGS.prophecyHint),
    masterVolume: readVolume(settings.masterVolume, DEFAULT_GAME_SETTINGS.masterVolume),
    musicVolume: readVolume(settings.musicVolume, DEFAULT_GAME_SETTINGS.musicVolume),
    sfxVolume: readVolume(settings.sfxVolume, DEFAULT_GAME_SETTINGS.sfxVolume),
    uiVolume: readVolume(settings.uiVolume, DEFAULT_GAME_SETTINGS.uiVolume),
    pixelSharp: readBoolean(settings.pixelSharp, DEFAULT_GAME_SETTINGS.pixelSharp),
    fullscreen: false,
    controlMode: readOption(settings.controlMode, CONTROL_MODES, DEFAULT_GAME_SETTINGS.controlMode),
    gamepad: readBoolean(settings.gamepad, DEFAULT_GAME_SETTINGS.gamepad),
  }
}

function normalizeKeyBindings(value: unknown): PersistedKeyBindings | undefined {
  if (!isRecord(value)) return undefined
  const bindings: PersistedKeyBindings = {}
  for (const action of KEY_BINDING_ACTIONS) {
    const code = value[action]
    if (typeof code === 'string' && code.length > 0) bindings[action] = code
  }
  return Object.keys(bindings).length > 0 ? bindings : undefined
}

function applyKeyBindings(gameData: GameData, value: unknown): void {
  const bindings = normalizeKeyBindings(value)
  if (bindings) {
    gameData.flags.keyBindings = bindings
  } else {
    delete gameData.flags.keyBindings
  }
}

function createPayload(gameData: GameData): SettingsStoragePayload {
  const normalized = normalizeStoredGameSettings(gameData.settings)
  const payload: SettingsStoragePayload = {
    version: SETTINGS_STORAGE_VERSION,
    settings: {
      textSpeed: normalized.textSpeed,
      battleSpeed: normalized.battleSpeed,
      encounterRate: normalized.encounterRate,
      difficulty: normalized.difficulty,
      prophecyHint: normalized.prophecyHint,
      masterVolume: normalized.masterVolume,
      musicVolume: normalized.musicVolume,
      sfxVolume: normalized.sfxVolume,
      uiVolume: normalized.uiVolume,
      pixelSharp: normalized.pixelSharp,
      controlMode: normalized.controlMode,
      gamepad: normalized.gamepad,
    },
  }
  const keyBindings = normalizeKeyBindings(gameData.getFlag('keyBindings'))
  if (keyBindings) payload.keyBindings = keyBindings
  return payload
}

export class SettingsManager {
  private static instance: SettingsManager

  static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager()
    }
    return SettingsManager.instance
  }

  private getStorage(): Storage | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) return window.localStorage
      return globalThis.localStorage ?? null
    } catch (error) {
      console.warn('Settings storage is unavailable:', error)
      return null
    }
  }

  load(): void {
    const gameData = GameData.getInstance()
    const storage = this.getStorage()
    if (!storage) {
      gameData.settings = normalizeStoredGameSettings(null)
      applyKeyBindings(gameData, null)
      return
    }

    try {
      const raw = storage.getItem(SETTINGS_STORAGE_KEY)
      if (!raw) {
        gameData.settings = normalizeStoredGameSettings(null)
        applyKeyBindings(gameData, null)
        return
      }
      const payload: unknown = JSON.parse(raw)
      if (!isRecord(payload) || payload.version !== SETTINGS_STORAGE_VERSION) {
        gameData.settings = normalizeStoredGameSettings(null)
        applyKeyBindings(gameData, null)
        return
      }
      gameData.settings = normalizeStoredGameSettings(payload.settings)
      applyKeyBindings(gameData, payload.keyBindings)
    } catch (error) {
      gameData.settings = normalizeStoredGameSettings(null)
      applyKeyBindings(gameData, null)
      console.warn('Settings load failed; defaults restored:', error)
    }
  }

  save(): boolean {
    const storage = this.getStorage()
    if (!storage) return false

    try {
      const payload = createPayload(GameData.getInstance())
      storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(payload))
      return true
    } catch (error) {
      console.error('Settings save failed:', error)
      return false
    }
  }
}
