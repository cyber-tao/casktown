import { beforeEach, describe, expect, test } from 'bun:test'
import { GameData } from '../../src/core/GameData.ts'
import { RebuildSystem } from '../../src/core/RebuildSystem.ts'
import { GAME_CONFIG_DATABASE, cloneConfigData } from '../../src/data/configDatabase.ts'
import { INITIAL_CHARACTERS } from '../../src/data/characters.ts'
import {
  REBUILD_VISUAL_MAP_THRESHOLD,
  REBUILT_TOWN_MAP_ID,
  START_INVENTORY_ITEMS,
  START_MAP_ID,
  START_PARTY,
  TIME_MS_PER_SECOND,
  TRUE_ROUTE_MIN_MERCY,
  TRUE_ROUTE_MIN_XIAOAI_MEMORY_FRAGMENTS,
} from '../../src/utils/constants.ts'

describe('GameData', () => {
  beforeEach(() => {
    GameData.getInstance().reset()
  })

  test('reset creates a playable new-game state', () => {
    const gd = GameData.getInstance()

    expect(gd.currentMap).toBe(START_MAP_ID)
    expect(gd.party).toEqual([...START_PARTY])
    expect(gd.characters.size).toBe(Object.keys(INITIAL_CHARACTERS).length)

    for (const item of START_INVENTORY_ITEMS) {
      expect(gd.inventory.items[item.itemId]).toBe(item.quantity)
    }

    const hero = gd.characters.get('T')
    expect(hero).toBeDefined()
    expect(hero!.stats.atk).toBeGreaterThanOrEqual(INITIAL_CHARACTERS.T!.stats.atk)
  })

  test('join flags add initialized companions to party or reserve', () => {
    const gd = GameData.getInstance()

    gd.setFlag('huihui_joined', true)
    gd.setFlag('a_joined', true)
    gd.setFlag('congcong_joined', true)
    gd.setFlag('sun_joined', true)

    expect(gd.party).toEqual(['T', 'HUIHUI', 'A', 'CONGCONG'])
    expect(gd.reserve).toEqual(['SUN'])
    expect(gd.characters.get('SUN')?.name).toBe('sun')
  })

  test('serialize returns an isolated snapshot and deserialize restores maps', () => {
    const gd = GameData.getInstance()
    const originalHp = gd.characters.get('T')!.stats.hp
    const originalItems = gd.inventory.items.heal_grass
    const snapshot = gd.serialize()

    gd.characters.get('T')!.stats.hp = 1
    gd.inventory.items.heal_grass = 99
    gd.addPartyMember('HUIHUI')

    gd.deserialize(snapshot)

    expect(gd.characters).toBeInstanceOf(Map)
    expect(gd.quests).toBeInstanceOf(Map)
    expect(gd.characters.get('T')!.stats.hp).toBe(originalHp)
    expect(gd.inventory.items.heal_grass).toBe(originalItems)
    expect(gd.party).toEqual([...START_PARTY])
  })

  test('true route unlock syncs from branch and flag state', () => {
    const gd = GameData.getInstance()

    gd.setFlag('white_tiger_respected', true)
    gd.setFlag('answered_xiyuan_kindly', true)
    gd.setFlag('released_four_seals', true)
    gd.setFlag('xiaoai_purified', true)
    gd.updateBranch('mercy_score', TRUE_ROUTE_MIN_MERCY)
    gd.updateBranch('xiaoai_memory_fragments', TRUE_ROUTE_MIN_XIAOAI_MEMORY_FRAGMENTS)

    expect(gd.branches.true_route_unlocked).toBe(true)
    expect(gd.getFlag('true_route_unlocked')).toBe(true)
  })

  test('numeric branch flags mirror cumulative branch values', () => {
    const gd = GameData.getInstance()

    gd.setFlag('xiaoai_memory_fragments', 1)
    gd.setFlag('xiaoai_memory_fragments', 1)
    gd.setFlag('xiaoai_memory_fragments', 1)
    gd.updateBranch('mercy_score', TRUE_ROUTE_MIN_MERCY)

    const snapshot = gd.serialize() as { flags: Record<string, unknown>; branches: Record<string, unknown> }

    expect(gd.getFlag('xiaoai_memory_fragments')).toBe(TRUE_ROUTE_MIN_XIAOAI_MEMORY_FRAGMENTS)
    expect(gd.flags.xiaoai_memory_fragments).toBe(TRUE_ROUTE_MIN_XIAOAI_MEMORY_FRAGMENTS)
    expect(gd.flags.mercy_score).toBe(TRUE_ROUTE_MIN_MERCY)
    expect(snapshot.flags.xiaoai_memory_fragments).toBe(snapshot.branches.xiaoai_memory_fragments)
    expect(snapshot.flags.mercy_score).toBe(snapshot.branches.mercy_score)
  })

  test('deserialize realigns stale branch flag mirrors', () => {
    const gd = GameData.getInstance()
    const snapshot = gd.serialize() as { flags: Record<string, unknown>; branches: Record<string, unknown> }

    gd.deserialize({
      ...snapshot,
      flags: { ...snapshot.flags, xiaoai_memory_fragments: 1, mercy_score: 1 },
      branches: {
        ...snapshot.branches,
        xiaoai_memory_fragments: TRUE_ROUTE_MIN_XIAOAI_MEMORY_FRAGMENTS,
        mercy_score: TRUE_ROUTE_MIN_MERCY,
      },
    })

    expect(gd.flags.xiaoai_memory_fragments).toBe(TRUE_ROUTE_MIN_XIAOAI_MEMORY_FRAGMENTS)
    expect(gd.flags.mercy_score).toBe(TRUE_ROUTE_MIN_MERCY)
    expect(gd.getFlag('xiaoai_memory_fragments')).toBe(TRUE_ROUTE_MIN_XIAOAI_MEMORY_FRAGMENTS)
  })

  test('syncPlayTime accumulates elapsed seconds', () => {
    const gd = GameData.getInstance()
    gd.reset()
    expect(gd.playTime).toBe(0)

    gd.syncPlayTime(gd['playTimeSyncedAtMs'] + TIME_MS_PER_SECOND * 5)
    expect(gd.playTime).toBe(5)

    gd.syncPlayTime(gd['playTimeSyncedAtMs'] + TIME_MS_PER_SECOND * 3)
    expect(gd.playTime).toBe(8)
  })

  test('syncPlayTime ignores sub-second elapsed time', () => {
    const gd = GameData.getInstance()
    gd.reset()

    gd.syncPlayTime(gd['playTimeSyncedAtMs'] + TIME_MS_PER_SECOND - 1)
    expect(gd.playTime).toBe(0)
  })

  test('syncPlayTime clamps negative elapsed to zero', () => {
    const gd = GameData.getInstance()
    gd.reset()
    gd.syncPlayTime(gd['playTimeSyncedAtMs'] - 9999)
    expect(gd.playTime).toBe(0)
  })

  test('serialize calls syncPlayTime before snapshot', () => {
    const gd = GameData.getInstance()
    gd.reset()
    gd['playTimeSyncedAtMs'] = Date.now() - TIME_MS_PER_SECOND * 10

    const snapshot = gd.serialize() as Record<string, unknown>
    expect(snapshot.playTime as number).toBeGreaterThanOrEqual(10)
  })

  test('deserialize resets playTimeSyncedAtMs', () => {
    const gd = GameData.getInstance()
    gd.reset()
    const snap = gd.serialize()
    const beforeMs = gd['playTimeSyncedAtMs']

    gd.syncPlayTime(beforeMs + TIME_MS_PER_SECOND * 100)
    gd.deserialize(snap)

    expect(gd['playTimeSyncedAtMs']).toBeGreaterThanOrEqual(beforeMs)
  })

  test('hero starts with starter weapon equipped', () => {
    const gd = GameData.getInstance()
    const hero = gd.characters.get('T')!
    expect(hero.equipment.weapon).toBe('fathers_sword')
  })

  test('reset fills hp and mp when configured maxima exceed current values', () => {
    const originalHero = cloneConfigData(GAME_CONFIG_DATABASE.getTable('characters').T!)
    const overriddenHero = cloneConfigData(originalHero)
    overriddenHero.stats.hp = 1
    overriddenHero.stats.maxHp = originalHero.stats.maxHp + 100
    overriddenHero.stats.mp = 2
    overriddenHero.stats.maxMp = originalHero.stats.maxMp + 25

    try {
      GAME_CONFIG_DATABASE.setRecord('characters', 'T', overriddenHero)
      const gd = GameData.getInstance()
      gd.reset()
      const hero = gd.characters.get('T')!

      expect(hero.stats.hp).toBe(hero.stats.maxHp)
      expect(hero.stats.mp).toBe(hero.stats.maxMp)
    } finally {
      GAME_CONFIG_DATABASE.setRecord('characters', 'T', originalHero)
      GameData.getInstance().reset()
    }
  })
})

describe('RebuildSystem', () => {
  beforeEach(() => {
    GameData.getInstance().reset()
  })

  test('setLevel syncs branch, flags, facilities, and rebuilt town map', () => {
    const gd = GameData.getInstance()
    gd.currentMap = START_MAP_ID

    RebuildSystem.getInstance().setLevel(REBUILD_VISUAL_MAP_THRESHOLD)

    expect(gd.rebuildLevel).toBe(REBUILD_VISUAL_MAP_THRESHOLD)
    expect(gd.branches.rebuild_level).toBe(REBUILD_VISUAL_MAP_THRESHOLD)
    expect(gd.currentMap).toBe(REBUILT_TOWN_MAP_ID)
    expect(RebuildSystem.getInstance().getUnlockedFacilities().length).toBeGreaterThan(0)
  })

  test('setLevel does not downgrade rebuild progress', () => {
    const gd = GameData.getInstance()
    const higherLevel = REBUILD_VISUAL_MAP_THRESHOLD + 2

    RebuildSystem.getInstance().setLevel(higherLevel)
    RebuildSystem.getInstance().setLevel(REBUILD_VISUAL_MAP_THRESHOLD)

    expect(gd.rebuildLevel).toBe(higherLevel)
    expect(gd.branches.rebuild_level).toBe(higherLevel)
    expect(gd.flags.rebuild_level).toBe(higherLevel)
  })
})
