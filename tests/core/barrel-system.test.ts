import { beforeEach, describe, expect, test } from 'bun:test'
import { GameData } from '../../src/core/GameData.ts'
import { BarrelSystem } from '../../src/core/BarrelSystem.ts'

describe('BarrelSystem', () => {
  beforeEach(() => {
    GameData.getInstance().reset()
  })

  test('getUnlockedColors returns empty initially', () => {
    const bs = BarrelSystem.getInstance()
    expect(bs.getUnlockedColors()).toEqual([])
  })

  test('unlock sets flag and returns color in getUnlockedColors', () => {
    const bs = BarrelSystem.getInstance()
    bs.unlock('green')
    expect(bs.getUnlockedColors()).toContain('green')
    expect(bs.isUnlocked('green')).toBe(true)
  })

  test('unlock sets the barrel flag', () => {
    BarrelSystem.getInstance().unlock('blue')
    expect(GameData.getInstance().getFlag('barrel_blue')).toBe(true)
    expect(BarrelSystem.getInstance().isUnlocked('blue')).toBe(true)
  })

  test('isUnlocked returns false for locked color', () => {
    const bs = BarrelSystem.getInstance()
    expect(bs.isUnlocked('gold')).toBe(false)
  })

  test('getAbility returns ability definition for known color', () => {
    const bs = BarrelSystem.getInstance()
    const ability = bs.getAbility('green')
    expect(ability).toBeDefined()
    expect(ability!.color).toBe('green')
    expect(ability!.name).toBeTruthy()
    expect(ability!.battleEffect).toBeTruthy()
    expect(ability!.mapEffect).toBeTruthy()
  })

  test('getAbility returns undefined for unknown color', () => {
    const bs = BarrelSystem.getInstance()
    expect(bs.getAbility('nonexistent' as never)).toBeUndefined()
  })

  test('getAllAbilities returns all 8 barrel colors', () => {
    const bs = BarrelSystem.getInstance()
    expect(bs.getAllAbilities()).toHaveLength(8)
  })

  test('useBattleBarrel returns success when unlocked', () => {
    const bs = BarrelSystem.getInstance()
    bs.unlock('green')
    const result = bs.useBattleBarrel('green')
    expect(result.success).toBe(true)
    expect(result.effect).toBeTruthy()
  })

  test('useBattleBarrel returns failure when locked', () => {
    const bs = BarrelSystem.getInstance()
    const result = bs.useBattleBarrel('green')
    expect(result.success).toBe(false)
    expect(result.effect).toBe('')
  })

  test('canEscapeDungeon returns false when no barrels unlocked', () => {
    const bs = BarrelSystem.getInstance()
    expect(bs.canEscapeDungeon('MAP_010')).toBe(false)
  })

  test('canEscapeDungeon returns true when barrels unlocked for normal map', () => {
    const bs = BarrelSystem.getInstance()
    bs.unlock('green')
    expect(bs.canEscapeDungeon('MAP_010')).toBe(true)
  })

  test('canEscapeDungeon returns false for no-escape maps', () => {
    const bs = BarrelSystem.getInstance()
    bs.unlock('green')
    expect(bs.canEscapeDungeon('MAP_055')).toBe(false)
    expect(bs.canEscapeDungeon('MAP_063')).toBe(false)
  })

  test('getDungeonEntrance returns correct entrance map', () => {
    const bs = BarrelSystem.getInstance()
    expect(bs.getDungeonEntrance('MAP_010')).toBe('MAP_001')
    expect(bs.getDungeonEntrance('MAP_030')).toBe('MAP_020')
    expect(bs.getDungeonEntrance('MAP_051')).toBe('MAP_050')
  })

  test('getDungeonEntrance returns null for non-dungeon map', () => {
    const bs = BarrelSystem.getInstance()
    expect(bs.getDungeonEntrance('MAP_001')).toBeNull()
  })
})
