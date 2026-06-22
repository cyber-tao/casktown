import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { GameData } from '../../src/core/GameData.ts'
import { InputManager } from '../../src/core/InputManager.ts'
import { SaveManager } from '../../src/core/SaveManager.ts'
import { CONTROL_MODE, SAVE_SLOTS, INITIAL_GOLD, QUICK_SAVE_SLOT } from '../../src/utils/constants.ts'

const SAVE_KEY = 'casktown_save'

class LocalStorageMock {
  private store = new Map<string, string>()
  getItem(key: string): string | null { return this.store.get(key) ?? null }
  setItem(key: string, value: string): void { this.store.set(key, value) }
  removeItem(key: string): void { this.store.delete(key) }
  clear(): void { this.store.clear() }
  get length(): number { return this.store.size }
  key(_index: number): string | null { return null }
}

describe('SaveManager', () => {
  let sm: SaveManager
  let mockStorage: LocalStorageMock

  beforeEach(() => {
    mockStorage = new LocalStorageMock()
    ;(globalThis as Record<string, unknown>).localStorage = mockStorage
    GameData.getInstance().reset()
    sm = SaveManager.getInstance()
  })

  afterEach(() => {
    mockStorage.clear()
  })

  test('save and load round-trip preserves game data', () => {
    const gd = GameData.getInstance()
    gd.addGold(500)
    const savedGold = gd.gold
    gd.setFlag('test_save_flag', true)

    expect(sm.save(1)).toBe(true)

    gd.spendGold(300)
    gd.setFlag('test_save_flag', false)

    expect(sm.load(1)).toBe(true)
    expect(gd.gold).toBe(savedGold)
    expect(gd.getFlag('test_save_flag')).toBe(true)
  })

  test('save rejects invalid slot numbers', () => {
    expect(sm.save(QUICK_SAVE_SLOT)).toBe(true) // quick save slot is valid
    expect(sm.save(-1)).toBe(false)
    expect(sm.save(SAVE_SLOTS + 2)).toBe(false) // beyond quick save slot
  })

  test('load returns false for empty slot', () => {
    expect(sm.load(1)).toBe(false)
  })

  test('hasSave returns false before saving and true after', () => {
    expect(sm.hasSave(1)).toBe(false)
    sm.save(1)
    expect(sm.hasSave(1)).toBe(true)
  })

  test('deleteSave removes saved data', () => {
    sm.save(1)
    expect(sm.hasSave(1)).toBe(true)
    expect(sm.deleteSave(1)).toBe(true)
    expect(sm.hasSave(1)).toBe(false)
  })

  test('deleteSave rejects invalid slot', () => {
    expect(sm.deleteSave(-1)).toBe(false)
  })

  test('getMeta returns metadata after save', () => {
    const gd = GameData.getInstance()
    sm.save(1)
    const meta = sm.getMeta(1)
    expect(meta).not.toBeNull()
    expect(meta!.slot).toBe(1)
    expect(meta!.currentMap).toBe(gd.currentMap)
  })

  test('getMeta returns null for empty slot', () => {
    expect(sm.getMeta(1)).toBeNull()
  })

  test('quickSave and quickLoad use the quick-save slot', () => {
    const gd = GameData.getInstance()
    gd.addGold(200)
    const savedGold = gd.gold
    expect(sm.quickSave()).toBe(true)

    gd.spendGold(50)
    expect(sm.quickLoad()).toBe(true)
    expect(gd.gold).toBe(savedGold)
  })

  test('getLatestSaveSlot returns the most recently saved slot including quick save', () => {
    sm.save(1)
    const slotOneTimestamp = sm.getMeta(1)!.timestamp
    sm.quickSave()

    const quickMeta = sm.getMeta(QUICK_SAVE_SLOT)!
    quickMeta.timestamp = slotOneTimestamp + 1
    mockStorage.setItem(`${SAVE_KEY}_meta_${QUICK_SAVE_SLOT}`, JSON.stringify(quickMeta))

    expect(sm.getLatestSaveSlot()).toBe(QUICK_SAVE_SLOT)
  })

  test('exportSave returns serialized data string', () => {
    sm.save(1)
    const exported = sm.exportSave(1)
    expect(exported).not.toBeNull()
    expect(() => JSON.parse(exported!)).not.toThrow()
  })

  test('exportSave returns null for empty slot', () => {
    expect(sm.exportSave(1)).toBeNull()
  })

  test('export and metadata helpers reject invalid slots', () => {
    expect(sm.hasSave(-1)).toBe(false)
    expect(sm.getMeta(-1)).toBeNull()
    expect(sm.exportSave(-1)).toBeNull()
  })

  test('importSave restores data from string', () => {
    const gd = GameData.getInstance()
    gd.addGold(999)
    const savedGold = gd.gold
    sm.save(1)
    const exported = sm.exportSave(1)!

    GameData.getInstance().reset()
    expect(sm.importSave(2, exported)).toBe(true)
    sm.load(2)
    expect(gd.gold).toBe(savedGold)
  })

  test('importSave syncs input bindings from imported settings', () => {
    const gd = GameData.getInstance()
    const input = InputManager.getInstance()
    input.setWASD()
    sm.save(1)
    const exported = sm.exportSave(1)!

    gd.reset()
    input.resetToDefault()
    expect(input.isWASDMode()).toBe(false)

    expect(sm.importSave(2, exported)).toBe(true)
    expect(gd.settings.controlMode).toBe(CONTROL_MODE.WASD)
    expect(input.isWASDMode()).toBe(true)
    expect(input.getBindings().confirm).toBe('Space')
  })

  test('importSave rejects invalid JSON', () => {
    expect(sm.importSave(1, 'not-json')).toBe(false)
  })

  test('importSave rejects invalid slots without changing current state', () => {
    const gd = GameData.getInstance()
    gd.addGold(999)
    sm.save(1)
    const exported = sm.exportSave(1)!
    const savedGold = gd.gold

    gd.reset()

    expect(sm.importSave(-1, exported)).toBe(false)
    expect(gd.gold).toBe(INITIAL_GOLD)
    expect(gd.gold).not.toBe(savedGold)
  })

  test('multiple saves to different slots are independent', () => {
    const gd = GameData.getInstance()
    const baseGold = gd.gold
    sm.save(1)
    gd.addGold(200)
    sm.save(2)

    sm.load(1)
    expect(gd.gold).toBe(baseGold)
    sm.load(2)
    expect(gd.gold).toBe(baseGold + 200)
  })
})
