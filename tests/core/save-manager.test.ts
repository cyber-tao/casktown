import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { GameData } from '../../src/core/GameData.ts'
import { InputManager } from '../../src/core/InputManager.ts'
import { SaveManager } from '../../src/core/SaveManager.ts'
import { BATTLE_RULES, CONTROL_MODE, SAVE_SLOTS, INITIAL_GOLD, QUICK_SAVE_SLOT } from '../../src/utils/constants.ts'

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

class FailingSetItemStorage extends LocalStorageMock {
  constructor(private readonly failingKey: string) {
    super()
  }

  setItem(key: string, value: string): void {
    if (key === this.failingKey) {
      throw new Error(`Failed to write ${key}`)
    }
    super.setItem(key, value)
  }

  seed(key: string, value: string): void {
    super.setItem(key, value)
  }
}

class FailingGetItemStorage extends LocalStorageMock {
  getItem(_key: string): string | null {
    throw new Error('Failed to read save storage')
  }
}

class FailingRemoveItemStorage extends LocalStorageMock {
  constructor(private readonly failingKey: string) {
    super()
  }

  removeItem(key: string): void {
    if (key === this.failingKey) {
      throw new Error(`Failed to remove ${key}`)
    }
    super.removeItem(key)
  }

  seed(key: string, value: string): void {
    super.setItem(key, value)
  }
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

  test('load backfills unlocked combo skills from saved progression', () => {
    const gd = GameData.getInstance()
    gd.addPartyMember('HUIHUI')
    gd.setFlag('congcong_joined', true)
    gd.characters.get('HUIHUI')!.skills = gd.characters.get('HUIHUI')!.skills.filter(skill => skill !== 'fengleisanhua')

    expect(sm.save(1)).toBe(true)
    gd.reset()
    expect(gd.characters.get('HUIHUI')!.skills).not.toContain('fengleisanhua')

    expect(sm.load(1)).toBe(true)
    expect(gd.characters.get('HUIHUI')!.skills).toContain('fengleisanhua')
  })

  test('save validation preserves legitimate negative trust values', () => {
    const gd = GameData.getInstance()
    gd.updateBranch('trust_huihui', -20)

    expect(sm.save(1)).toBe(true)
    gd.updateBranch('trust_huihui', 10)

    expect(sm.load(1)).toBe(true)
    expect(gd.branches.trust_huihui).toBe(-20)
  })

  test('negative mercy story choices remain loadable after save', () => {
    const gd = GameData.getInstance()
    gd.setFlag('mercy_score', -1)

    expect(gd.branches.mercy_score).toBe(0)
    expect(sm.save(1)).toBe(true)

    gd.updateBranch('mercy_score', 10)
    expect(sm.load(1)).toBe(true)
    expect(gd.branches.mercy_score).toBe(0)
  })

  test('save rejects invalid slot numbers', () => {
    expect(sm.save(QUICK_SAVE_SLOT)).toBe(true) // quick save slot is valid
    expect(sm.save(-1)).toBe(false)
    expect(sm.save(1.5)).toBe(false)
    expect(sm.save(SAVE_SLOTS + 2)).toBe(false) // beyond quick save slot
  })

  test('load returns false for empty slot', () => {
    expect(sm.load(1)).toBe(false)
  })

  test('load rolls back game data and input bindings when deserialization fails', () => {
    const gd = GameData.getInstance()
    const input = InputManager.getInstance()
    gd.currentMap = 'MAP_001'
    gd.addGold(999)
    input.setWASD()
    const expectedGold = gd.gold

    const corruptSave = {
      ...(gd.serialize() as Record<string, unknown>),
      currentMap: 'MAP_010',
      party: 42,
    }
    mockStorage.setItem(`${SAVE_KEY}_data_1`, JSON.stringify(corruptSave))

    const originalError = console.error
    console.error = () => {}
    try {
      expect(sm.load(1)).toBe(false)
    } finally {
      console.error = originalError
    }

    expect(gd.currentMap).toBe('MAP_001')
    expect(gd.gold).toBe(expectedGold)
    expect(gd.party).toEqual(['T'])
    expect(gd.settings.controlMode).toBe(CONTROL_MODE.WASD)
    expect(input.isWASDMode()).toBe(true)
  })

  test('load rejects non-object JSON without changing current state', () => {
    const gd = GameData.getInstance()
    gd.addGold(999)
    const expectedGold = gd.gold
    mockStorage.setItem(`${SAVE_KEY}_data_1`, '123')

    expect(sm.load(1)).toBe(false)
    expect(gd.gold).toBe(expectedGold)
  })

  test('load rejects type-corrupt save fields without changing current state', () => {
    const gd = GameData.getInstance()
    gd.addGold(999)
    const expectedGold = gd.gold
    const validSave = gd.serialize() as Record<string, unknown>
    const corruptSaves = [
      { ...validSave, gold: 'corrupt' },
      { ...validSave, playTime: 'corrupt' },
      { ...validSave, inventory: { items: { heal_grass: 'many' }, equipment: {} } },
      {
        ...validSave,
        characters: {
          ...(validSave.characters as object),
          T: {
            ...((validSave.characters as Record<string, object>).T),
            stats: { ...((validSave.characters as Record<string, { stats: object }>).T.stats), hp: 'many' },
          },
        },
      },
      {
        ...validSave,
        characters: {
          ...(validSave.characters as object),
          T: { ...((validSave.characters as Record<string, object>).T), tp: BATTLE_RULES.MAX_TP + 1 },
        },
      },
    ]

    for (const save of corruptSaves) {
      mockStorage.setItem(`${SAVE_KEY}_data_1`, JSON.stringify(save))
      expect(sm.load(1)).toBe(false)
      expect(gd.gold).toBe(expectedGold)
    }
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

  test('deleteSave restores both records when either removal fails', () => {
    expect(sm.save(1)).toBe(true)
    const dataKey = `${SAVE_KEY}_data_1`
    const metaKey = `${SAVE_KEY}_meta_1`
    const previousData = mockStorage.getItem(dataKey)!
    const previousMeta = mockStorage.getItem(metaKey)!

    for (const failingKey of [dataKey, metaKey]) {
      const failingStorage = new FailingRemoveItemStorage(failingKey)
      failingStorage.seed(dataKey, previousData)
      failingStorage.seed(metaKey, previousMeta)
      ;(globalThis as Record<string, unknown>).localStorage = failingStorage

      const originalError = console.error
      console.error = () => {}
      try {
        expect(sm.deleteSave(1)).toBe(false)
      } finally {
        console.error = originalError
      }

      expect(failingStorage.getItem(dataKey)).toBe(previousData)
      expect(failingStorage.getItem(metaKey)).toBe(previousMeta)
    }
  })

  test('getMeta returns metadata after save', () => {
    const gd = GameData.getInstance()
    gd.addPartyMember('HUIHUI')
    sm.save(1)
    const meta = sm.getMeta(1)
    expect(meta).not.toBeNull()
    expect(meta!.slot).toBe(1)
    expect(meta!.currentMap).toBe(gd.currentMap)
    expect(meta!.preview).toBe('T, 慧慧')
  })

  test('getMeta returns null for empty slot', () => {
    expect(sm.getMeta(1)).toBeNull()
  })

  test('getMeta rejects malformed fields in valid JSON', () => {
    const validMeta = {
      slot: 1,
      timestamp: Date.now(),
      playTime: 120,
      currentMap: 'MAP_001',
      preview: 'T',
    }
    const invalidMeta = [
      { ...validMeta, slot: 2 },
      { ...validMeta, timestamp: 'now' },
      { ...validMeta, playTime: -1 },
      { ...validMeta, currentMap: '' },
      { ...validMeta, preview: ['T'] },
    ]

    for (const meta of invalidMeta) {
      mockStorage.setItem(`${SAVE_KEY}_meta_1`, JSON.stringify(meta))
      expect(sm.getMeta(1)).toBeNull()
    }
  })

  test('save restores previous data and metadata when either write fails', () => {
    const gd = GameData.getInstance()
    expect(sm.save(1)).toBe(true)
    const dataKey = `${SAVE_KEY}_data_1`
    const metaKey = `${SAVE_KEY}_meta_1`
    const previousData = mockStorage.getItem(dataKey)!
    const previousMeta = mockStorage.getItem(metaKey)!

    for (const failingKey of [dataKey, metaKey]) {
      const failingStorage = new FailingSetItemStorage(failingKey)
      failingStorage.seed(dataKey, previousData)
      failingStorage.seed(metaKey, previousMeta)
      ;(globalThis as Record<string, unknown>).localStorage = failingStorage
      gd.addGold(100)

      const originalError = console.error
      console.error = () => {}
      try {
        expect(sm.save(1)).toBe(false)
      } finally {
        console.error = originalError
      }

      expect(failingStorage.getItem(dataKey)).toBe(previousData)
      expect(failingStorage.getItem(metaKey)).toBe(previousMeta)
    }
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

  test('getLatestSaveSlot skips newer slots whose data cannot be loaded', () => {
    expect(sm.save(1)).toBe(true)
    expect(sm.save(2)).toBe(true)
    const corruptMeta = sm.getMeta(2)!
    corruptMeta.timestamp += 1_000
    mockStorage.setItem(`${SAVE_KEY}_meta_2`, JSON.stringify(corruptMeta))
    mockStorage.setItem(`${SAVE_KEY}_data_2`, '{"flags":{}}')

    expect(sm.getLatestSaveSlot()).toBe(1)
    expect(sm.load(1)).toBe(true)
    expect(sm.load(2)).toBe(false)
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

  test('load ignores legacy settings and key bindings while restoring progress', () => {
    const gd = GameData.getInstance()
    const input = InputManager.getInstance()
    const legacySave = gd.serialize() as Record<string, unknown>
    legacySave.gold = INITIAL_GOLD + 999
    legacySave.settings = { difficulty: 'nightmare', masterVolume: 0.1, fullscreen: true }
    legacySave.flags = {
      ...(legacySave.flags as Record<string, unknown>),
      keyBindings: { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', confirm: 'Space' },
    }
    mockStorage.setItem(`${SAVE_KEY}_data_1`, JSON.stringify(legacySave))

    gd.settings.masterVolume = 0.8
    gd.settings.fullscreen = true
    input.setWASD()
    input.setBinding('confirm', 'KeyE')

    expect(sm.load(1)).toBe(true)
    expect(gd.gold).toBe(INITIAL_GOLD + 999)
    expect(gd.settings.masterVolume).toBe(0.8)
    expect(gd.settings.fullscreen).toBe(true)
    expect(gd.settings.controlMode).toBe(CONTROL_MODE.WASD)
    expect(input.getBindings().confirm).toBe('KeyE')
  })

  test('importSave preserves current global settings and bindings', () => {
    const gd = GameData.getInstance()
    const input = InputManager.getInstance()
    gd.addGold(999)
    input.setWASD()
    input.setBinding('confirm', 'Space')
    gd.settings.masterVolume = 0.2
    const exported = JSON.stringify(gd.serialize())

    gd.reset()
    input.resetToDefault()
    input.setBinding('confirm', 'KeyE')
    gd.settings.masterVolume = 0.8
    expect(input.isWASDMode()).toBe(false)

    expect(sm.importSave(2, exported)).toBe(true)
    expect(gd.gold).toBe(INITIAL_GOLD + 999)
    expect(gd.settings.masterVolume).toBe(0.8)
    expect(gd.settings.controlMode).toBe(CONTROL_MODE.ARROWS)
    expect(input.isWASDMode()).toBe(false)
    expect(input.getBindings().confirm).toBe('KeyE')

    const importedSlot = JSON.parse(sm.exportSave(2)!) as Record<string, unknown>
    expect(importedSlot.settings).toBeUndefined()
    expect((importedSlot.flags as Record<string, unknown>).keyBindings).toBeUndefined()
  })

  test('importSave rejects invalid JSON', () => {
    expect(sm.importSave(1, 'not-json')).toBe(false)
  })

  test('importSave rejects non-object JSON without changing current state', () => {
    const gd = GameData.getInstance()
    gd.addGold(999)
    const currentGold = gd.gold

    expect(sm.importSave(1, '123')).toBe(false)
    expect(sm.importSave(1, '[]')).toBe(false)
    expect(gd.gold).toBe(currentGold)
  })

  test('importSave rejects objects without core save identity fields', () => {
    const gd = GameData.getInstance()
    gd.addGold(999)
    const currentGold = gd.gold
    const currentMap = gd.currentMap

    expect(sm.importSave(1, '{"flags":{}}')).toBe(false)
    expect(gd.gold).toBe(currentGold)
    expect(gd.currentMap).toBe(currentMap)
  })

  test('importSave returns false when existing slot storage cannot be read', () => {
    const gd = GameData.getInstance()
    const exported = JSON.stringify(gd.serialize())
    ;(globalThis as Record<string, unknown>).localStorage = new FailingGetItemStorage()

    const originalError = console.error
    console.error = () => {}
    try {
      expect(sm.importSave(1, exported)).toBe(false)
    } finally {
      console.error = originalError
    }
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

  test('importSave rolls back current state and partial slot writes when saving fails', () => {
    const gd = GameData.getInstance()
    const input = InputManager.getInstance()
    gd.addGold(999)
    input.setWASD()
    sm.save(1)
    const exported = sm.exportSave(1)!

    gd.reset()
    input.resetToDefault()
    expect(input.isWASDMode()).toBe(false)

    const failingStorage = new FailingSetItemStorage(`${SAVE_KEY}_meta_2`)
    ;(globalThis as Record<string, unknown>).localStorage = failingStorage

    const originalError = console.error
    console.error = () => {}
    try {
      expect(sm.importSave(2, exported)).toBe(false)
    } finally {
      console.error = originalError
    }
    expect(gd.gold).toBe(INITIAL_GOLD)
    expect(input.isWASDMode()).toBe(false)
    expect(failingStorage.getItem(`${SAVE_KEY}_data_2`)).toBeNull()
    expect(failingStorage.getItem(`${SAVE_KEY}_meta_2`)).toBeNull()
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
