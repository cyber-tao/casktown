import { afterEach, describe, expect, test } from 'bun:test'
import { GameConfigDatabase, cloneConfigData, GAME_CONFIG_DATABASE, GAME_CONFIG_TABLE_KEYS } from '../../src/data/configDatabase.ts'
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
    cloned[2].x = 99
    expect(original[2].x).toBe(3)
  })
})

describe('GameConfigDatabase', () => {
  afterEach(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(CONFIG_DATABASE_STORAGE_KEY)
    }
  })

  function makeTestTables(): Record<string, Record<string, { id: string; name: string }>> {
    return {
      items: { sword: { id: 'sword', name: 'Sword' }, shield: { id: 'shield', name: 'Shield' } },
      skills: { fire: { id: 'fire', name: 'Fire' } },
    }
  }

  test('getTable returns initial data', () => {
    const tables = makeTestTables()
    const db = new GameConfigDatabase(tables as never)
    expect(db.getTable('items')).toEqual(tables.items)
  })

  test('setTable replaces table data', () => {
    const tables = makeTestTables()
    const db = new GameConfigDatabase(tables as never)
    const newItems = { bow: { id: 'bow', name: 'Bow' } }
    db.setTable('items', newItems as never)
    expect(db.getTable('items')).toEqual(newItems)
  })

  test('setRecord updates existing record in dict table', () => {
    const tables = makeTestTables()
    const db = new GameConfigDatabase(tables as never)
    db.setRecord('items', 'sword', { id: 'sword', name: 'Mega Sword' })
    expect(db.getTable('items').sword.name).toBe('Mega Sword')
  })

  test('setRecord adds new record to dict table', () => {
    const tables = makeTestTables()
    const db = new GameConfigDatabase(tables as never)
    db.setRecord('items', 'potion', { id: 'potion', name: 'Potion' })
    expect(db.getTable('items').potion).toBeDefined()
    expect(db.getTable('items').potion.name).toBe('Potion')
  })

  test('setRecord handles array tables', () => {
    const tables = { items: [{ id: 'sword', name: 'Sword' }] }
    const db = new GameConfigDatabase(tables as never)
    db.setRecord('items', 'sword', { id: 'sword', name: 'Updated Sword' })
    expect(db.getTable('items')[0].name).toBe('Updated Sword')
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
    expect(db.getTable('items').sword).toBeUndefined()
  })

  test('deleteRecord removes from array table', () => {
    const tables = { items: [{ id: 'sword', name: 'Sword' }, { id: 'shield', name: 'Shield' }] }
    const db = new GameConfigDatabase(tables as never)
    db.deleteRecord('items', 'sword')
    expect(db.getTable('items')).toHaveLength(1)
    expect(db.getTable('items')[0].id).toBe('shield')
  })

  test('reset restores defaults', () => {
    const tables = makeTestTables()
    const db = new GameConfigDatabase(tables as never)
    db.setRecord('items', 'sword', { id: 'sword', name: 'Mega Sword' })
    db.reset()
    expect(db.getTable('items').sword.name).toBe('Sword')
  })

  test('exportSnapshot returns a deep copy of current state', () => {
    const tables = makeTestTables()
    const db = new GameConfigDatabase(tables as never)
    const snap = db.exportSnapshot()
    expect(snap).toEqual(tables)
    snap.items.sword.name = 'Changed'
    expect(db.getTable('items').sword.name).toBe('Sword')
  })

  test('importSnapshot merges with defaults', () => {
    const tables = makeTestTables()
    const db = new GameConfigDatabase(tables as never)
    db.importSnapshot({ items: { bow: { id: 'bow', name: 'Bow' } } } as never)
    expect(db.getTable('items').bow).toBeDefined()
    expect(db.getTable('skills')).toEqual(tables.skills)
  })
})

describe('GAME_CONFIG_DATABASE singleton', () => {
  test('all table keys are present', () => {
    for (const key of GAME_CONFIG_TABLE_KEYS) {
      expect(GAME_CONFIG_DATABASE.getTable(key)).toBeDefined()
    }
  })
})
