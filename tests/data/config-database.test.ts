import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { CONFIG_DATABASE_STORAGE_VERSION, GameConfigDatabase, cloneConfigData, GAME_CONFIG_DATABASE, GAME_CONFIG_TABLE_KEYS } from '../../src/data/configDatabase.ts'
import { CONFIG_DATABASE_STORAGE_KEY } from '../../src/utils/constants.ts'

describe('cloneConfigData', () => {
  test('produces a deep copy', () => {
    const original = { a: { b: 1 }, c: [2, 3] }
    const cloned = cloneConfigData(original)
    expect(cloned).toEqual(original)
    cloned.a.b = 99
    expect(original.a.b).toBe(1)
  })

  test('handles arrays', () => {
    const original = [1, 2, { x: 3 }]
    const cloned = cloneConfigData(original)
    expect(cloned).toEqual(original)
    ;(cloned[2] as { x: number }).x = 99
    expect((original[2] as { x: number }).x).toBe(3)
  })
})

function makeTestTables(): Record<string, Record<string, { id: string; name: string }>> {
  return {
    items: { sword: { id: 'sword', name: 'Sword' }, shield: { id: 'shield', name: 'Shield' } },
    skills: { fire: { id: 'fire', name: 'Fire' } },
  }
}

describe('GameConfigDatabase', () => {
  afterEach(() => {
    if (typeof window !== 'undefined') {
      ;(globalThis as { localStorage: Storage }).localStorage.removeItem(CONFIG_DATABASE_STORAGE_KEY)
    }
  })

  test('getTable returns initial data', () => {
    const tables = makeTestTables()
    const db = new GameConfigDatabase(tables as never)
    expect(db.getTable('items')).toEqual(tables.items as never)
  })

  test('setTable replaces table data', () => {
    const tables = makeTestTables()
    const db = new GameConfigDatabase(tables as never)
    const newItems = { bow: { id: 'bow', name: 'Bow' } }
    db.setTable('items', newItems as never)
    expect(db.getTable('items')).toEqual(newItems as never)
  })

  test('setRecord updates existing record in dict table', () => {
    const tables = makeTestTables()
    const db = new GameConfigDatabase(tables as never)
    db.setRecord('items', 'sword', { id: 'sword', name: 'Mega Sword' })
    expect(db.getTable('items').sword!.name).toBe('Mega Sword')
  })

  test('setRecord adds new record to dict table', () => {
    const tables = makeTestTables()
    const db = new GameConfigDatabase(tables as never)
    db.setRecord('items', 'potion', { id: 'potion', name: 'Potion' })
    expect(db.getTable('items').potion!).toBeDefined()
    expect(db.getTable('items').potion!.name).toBe('Potion')
  })

  test('setRecord handles array tables', () => {
    const tables = { items: [{ id: 'sword', name: 'Sword' }] }
    const db = new GameConfigDatabase(tables as never)
    db.setRecord('items', 'sword', { id: 'sword', name: 'Updated Sword' })
    expect(db.getTable('items')[0]!.name).toBe('Updated Sword')
  })

  test('setRecord appends to array table if id not found', () => {
    const tables = { items: [{ id: 'sword', name: 'Sword' }] }
    const db = new GameConfigDatabase(tables as never)
    db.setRecord('items', 'potion', { id: 'potion', name: 'Potion' })
    expect(db.getTable('items')).toHaveLength(2)
  })

  test('deleteRecord removes from dict table', () => {
    const tables = makeTestTables()
    const db = new GameConfigDatabase(tables as never)
    db.deleteRecord('items', 'sword')
    expect(db.getTable('items').sword!).toBeUndefined()
  })

  test('deleteRecord removes from array table', () => {
    const tables = { items: [{ id: 'sword', name: 'Sword' }, { id: 'shield', name: 'Shield' }] }
    const db = new GameConfigDatabase(tables as never)
    db.deleteRecord('items', 'sword')
    expect(db.getTable('items')).toHaveLength(1)
    expect(db.getTable('items')[0]!.id).toBe('shield')
  })

  test('reset restores defaults', () => {
    const tables = makeTestTables()
    const db = new GameConfigDatabase(tables as never)
    db.setRecord('items', 'sword', { id: 'sword', name: 'Mega Sword' })
    db.reset()
    expect(db.getTable('items').sword!.name).toBe('Sword')
  })

  test('exportSnapshot returns a deep copy of current state', () => {
    const tables = makeTestTables()
    const db = new GameConfigDatabase(tables as never)
    const snap = db.exportSnapshot()
    expect(snap).toEqual(tables as never)
    snap.items.sword!.name = 'Changed'
    expect(db.getTable('items').sword!.name).toBe('Sword')
  })

  test('importSnapshot merges with defaults', () => {
    const tables = makeTestTables()
    const db = new GameConfigDatabase(tables as never)
    db.importSnapshot({ items: { bow: { id: 'bow', name: 'Bow' } } } as never)
    expect(db.getTable('items').bow!).toBeDefined()
    expect(db.getTable('skills')).toEqual(tables.skills as never)
  })
})

describe('GAME_CONFIG_DATABASE singleton', () => {
  test('all table keys are present', () => {
    for (const key of GAME_CONFIG_TABLE_KEYS) {
      expect(GAME_CONFIG_DATABASE.getTable(key)).toBeDefined()
    }
  })
})

describe('versioned persistence', () => {
  const originalLocalStorage = (globalThis as { localStorage?: unknown }).localStorage
  const mockStorage = new Map<string, string>()

  beforeEach(() => {
    mockStorage.clear()
    const storage: Storage = {
      get length() { return mockStorage.size },
      clear() { mockStorage.clear() },
      getItem(key: string): string | null { return mockStorage.get(key) ?? null },
      key(index: number): string | null { return [...mockStorage.keys()][index] ?? null },
      removeItem(key: string): void { mockStorage.delete(key) },
      setItem(key: string, value: string): void { mockStorage.set(key, value) },
    }
    ;(globalThis as Record<string, unknown>).localStorage = storage
  })

  afterEach(() => {
    if (originalLocalStorage === undefined) {
      delete (globalThis as Record<string, unknown>).localStorage
    } else {
      ;(globalThis as Record<string, unknown>).localStorage = originalLocalStorage
    }
    mockStorage.clear()
  })

  function seedStorage(value: unknown): void {
    ;(globalThis as { localStorage: Storage }).localStorage.setItem(CONFIG_DATABASE_STORAGE_KEY, JSON.stringify(value))
  }

  test('persist writes a versioned snapshot', () => {
    const tables = makeTestTables()
    const db = new GameConfigDatabase(tables as never)
    db.setRecord('items', 'potion', { id: 'potion', name: 'Potion' })

    const stored = JSON.parse((globalThis as { localStorage: Storage }).localStorage.getItem(CONFIG_DATABASE_STORAGE_KEY)!) as {
      version: number
      tables: Record<string, unknown>
    }
    expect(stored.version).toBe(CONFIG_DATABASE_STORAGE_VERSION)
    expect((stored.tables.items as Record<string, unknown>).potion).toBeDefined()
  })

  test('applies valid versioned overrides on construction', () => {
    seedStorage({
      version: CONFIG_DATABASE_STORAGE_VERSION,
      tables: { items: { sword: { id: 'sword', name: 'Override Sword' } } },
    })
    const db = new GameConfigDatabase(makeTestTables() as never)
    expect(db.getTable('items').sword!.name).toBe('Override Sword')
    expect(db.getTable('skills')).toEqual(makeTestTables().skills as never)
  })

  test('migrates legacy unversioned payloads and rewrites them', () => {
    seedStorage({ items: { sword: { id: 'sword', name: 'Legacy Sword' } } })
    const db = new GameConfigDatabase(makeTestTables() as never)
    expect(db.getTable('items').sword!.name).toBe('Legacy Sword')

    const stored = JSON.parse((globalThis as { localStorage: Storage }).localStorage.getItem(CONFIG_DATABASE_STORAGE_KEY)!) as { version?: number }
    expect(stored.version).toBe(CONFIG_DATABASE_STORAGE_VERSION)
  })

  test('ignores corrupt JSON and keeps a backup', () => {
    (globalThis as { localStorage: Storage }).localStorage.setItem(CONFIG_DATABASE_STORAGE_KEY, '{not json')
    const tables = makeTestTables()
    const db = new GameConfigDatabase(tables as never)
    expect(db.getTable('items')).toEqual(tables.items as never)
    expect((globalThis as { localStorage: Storage }).localStorage.getItem(`${CONFIG_DATABASE_STORAGE_KEY}_corrupt_backup`)).toBe('{not json')
  })

  test('ignores mismatched versions and keeps a backup', () => {
    const raw = JSON.stringify({ version: 999, tables: { items: { sword: { id: 'sword', name: 'Future' } } } })
    seedStorage(JSON.parse(raw))
    const db = new GameConfigDatabase(makeTestTables() as never)
    expect(db.getTable('items').sword!.name).toBe('Sword')
    expect((globalThis as { localStorage: Storage }).localStorage.getItem(`${CONFIG_DATABASE_STORAGE_KEY}_corrupt_backup`)).toBe(raw)
  })

  test('ignores structurally invalid tables and keeps a backup', () => {
    const raw = JSON.stringify({ version: CONFIG_DATABASE_STORAGE_VERSION, tables: { maps: 'garbage', items: null } })
    seedStorage(JSON.parse(raw))
    const db = new GameConfigDatabase(makeTestTables() as never)
    expect(db.getTable('items').sword!.name).toBe('Sword')
    expect((globalThis as { localStorage: Storage }).localStorage.getItem(`${CONFIG_DATABASE_STORAGE_KEY}_corrupt_backup`)).toBe(raw)
  })
})