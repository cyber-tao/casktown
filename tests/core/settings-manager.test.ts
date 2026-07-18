import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { GameData } from '../../src/core/GameData.ts'
import { InputManager } from '../../src/core/InputManager.ts'
import {
  SETTINGS_STORAGE_KEY,
  SETTINGS_STORAGE_VERSION,
  SettingsManager,
} from '../../src/core/SettingsManager.ts'
import { CONTROL_MODE, DEFAULT_GAME_SETTINGS } from '../../src/utils/constants.ts'

class LocalStorageMock {
  private store = new Map<string, string>()
  getItem(key: string): string | null { return this.store.get(key) ?? null }
  setItem(key: string, value: string): void { this.store.set(key, value) }
  removeItem(key: string): void { this.store.delete(key) }
  clear(): void { this.store.clear() }
  get length(): number { return this.store.size }
  key(index: number): string | null { return [...this.store.keys()][index] ?? null }
}

describe('SettingsManager', () => {
  const runtime = globalThis as unknown as Record<string, unknown>
  const originalLocalStorage = runtime.localStorage
  const storage = new LocalStorageMock()
  const settingsManager = SettingsManager.getInstance()
  const inputManager = InputManager.getInstance()

  beforeAll(() => {
    runtime.localStorage = storage
  })

  beforeEach(() => {
    storage.clear()
    GameData.getInstance().reset()
    inputManager.syncFromGameData()
  })

  afterAll(() => {
    if (originalLocalStorage === undefined) delete runtime.localStorage
    else runtime.localStorage = originalLocalStorage
  })

  test('restores versioned global settings and bindings after a fresh reset', () => {
    const gameData = GameData.getInstance()
    gameData.settings.textSpeed = 'fast'
    gameData.settings.masterVolume = 0.4
    gameData.settings.pixelSharp = false
    gameData.settings.fullscreen = true
    inputManager.setWASD()
    inputManager.setBindings({ confirm: 'KeyE', cancel: 'Backspace' })

    expect(settingsManager.save()).toBe(true)
    const payload = JSON.parse(storage.getItem(SETTINGS_STORAGE_KEY)!) as Record<string, unknown>
    expect(payload.version).toBe(SETTINGS_STORAGE_VERSION)
    expect((payload.settings as Record<string, unknown>).fullscreen).toBeUndefined()

    gameData.reset()
    inputManager.syncFromGameData()
    settingsManager.load()
    inputManager.syncFromGameData()

    expect(gameData.settings.textSpeed).toBe('fast')
    expect(gameData.settings.masterVolume).toBe(0.4)
    expect(gameData.settings.pixelSharp).toBe(false)
    expect(gameData.settings.fullscreen).toBe(false)
    expect(gameData.settings.controlMode).toBe(CONTROL_MODE.WASD)
    expect(inputManager.getBindings().confirm).toBe('KeyE')
    expect(inputManager.getBindings().cancel).toBe('Backspace')
  })

  test('falls back to defaults when persisted JSON is corrupt', () => {
    const gameData = GameData.getInstance()
    gameData.settings.masterVolume = 0.2
    gameData.settings.fullscreen = true
    inputManager.setBinding('confirm', 'KeyE')
    storage.setItem(SETTINGS_STORAGE_KEY, '{bad json')

    const originalWarn = console.warn
    console.warn = () => {}
    try {
      settingsManager.load()
    } finally {
      console.warn = originalWarn
    }

    expect(gameData.settings).toEqual(DEFAULT_GAME_SETTINGS)
    expect(gameData.getFlag('keyBindings')).toBeUndefined()
  })

  test('validates each persisted field and never restores fullscreen', () => {
    storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({
      version: SETTINGS_STORAGE_VERSION,
      settings: {
        textSpeed: 'turbo',
        battleSpeed: 'fastest',
        masterVolume: 2,
        musicVolume: 0.3,
        pixelSharp: false,
        fullscreen: true,
        controlMode: 'invalid',
        gamepad: false,
      },
      keyBindings: { confirm: '', cancel: 'Backspace', unknown: 'KeyQ' },
    }))

    settingsManager.load()
    inputManager.syncFromGameData()
    const gameData = GameData.getInstance()

    expect(gameData.settings.textSpeed).toBe(DEFAULT_GAME_SETTINGS.textSpeed)
    expect(gameData.settings.battleSpeed).toBe('fastest')
    expect(gameData.settings.masterVolume).toBe(DEFAULT_GAME_SETTINGS.masterVolume)
    expect(gameData.settings.musicVolume).toBe(0.3)
    expect(gameData.settings.pixelSharp).toBe(false)
    expect(gameData.settings.fullscreen).toBe(false)
    expect(gameData.settings.controlMode).toBe(DEFAULT_GAME_SETTINGS.controlMode)
    expect(gameData.settings.gamepad).toBe(false)
    expect(inputManager.getBindings().confirm).toBe('Enter')
    expect(inputManager.getBindings().cancel).toBe('Backspace')
  })

  test('persists every InputManager mutation through the global envelope', () => {
    inputManager.setBinding('confirm', 'KeyE')
    let payload = JSON.parse(storage.getItem(SETTINGS_STORAGE_KEY)!) as Record<string, unknown>
    expect((payload.keyBindings as Record<string, unknown>).confirm).toBe('KeyE')

    inputManager.setBindings({ up: 'KeyI', down: 'KeyK' })
    payload = JSON.parse(storage.getItem(SETTINGS_STORAGE_KEY)!) as Record<string, unknown>
    expect((payload.keyBindings as Record<string, unknown>).up).toBe('KeyI')
    expect((payload.keyBindings as Record<string, unknown>).down).toBe('KeyK')

    inputManager.setGamepadEnabled(false)
    payload = JSON.parse(storage.getItem(SETTINGS_STORAGE_KEY)!) as Record<string, unknown>
    expect((payload.settings as Record<string, unknown>).gamepad).toBe(false)

    inputManager.setWASD()
    payload = JSON.parse(storage.getItem(SETTINGS_STORAGE_KEY)!) as Record<string, unknown>
    expect((payload.settings as Record<string, unknown>).controlMode).toBe(CONTROL_MODE.WASD)
  })
})
