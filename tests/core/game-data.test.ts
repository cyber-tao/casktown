import { beforeEach, describe, expect, test } from 'bun:test'
import { GameData } from '../../src/core/GameData.ts'
import { QuestSystem } from '../../src/core/QuestSystem.ts'
import { RebuildSystem } from '../../src/core/RebuildSystem.ts'
import { GAME_CONFIG_DATABASE, cloneConfigData } from '../../src/data/configDatabase.ts'
import { INITIAL_CHARACTERS } from '../../src/data/characters.ts'
import { EQUIP_STAT_BONUSES } from '../../src/data/equipment.ts'
import type { CharacterData, CharacterStats } from '../../src/data/types.ts'
import {
  A_RESCUED_FLAG,
  BRANCH_VALUE_LIMITS,
  INITIAL_GOLD,
  LEGACY_SAVE_PROGRESS,
  REBUILD_VISUAL_MAP_THRESHOLD,
  REBUILT_TOWN_MAP_ID,
  REINCARNATION_CORRECT_ANSWER_FLAGS,
  PARTY_RULES,
  PARTNER_CALL_AVAILABLE_FLAG,
  PARTNER_CALL_MIN_TRUST,
  START_INVENTORY_ITEMS,
  START_MAP_ID,
  START_PARTY,
  START_PLAYER_POSITION,
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

  test('new-game reset can preserve user settings', () => {
    const gd = GameData.getInstance()
    gd.settings.masterVolume = 0.4
    gd.settings.textSpeed = 'fast'
    gd.addGold(500)

    gd.reset({ preserveSettings: true })

    expect(gd.settings.masterVolume).toBe(0.4)
    expect(gd.settings.textSpeed).toBe('fast')
    expect(gd.gold).toBe(INITIAL_GOLD)
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

  test('removePartyMember removes active members and promotes reserve members', () => {
    const gd = GameData.getInstance()

    gd.setFlag('huihui_joined', true)
    gd.setFlag('a_joined', true)
    gd.setFlag('congcong_joined', true)
    gd.setFlag('sun_joined', true)

    expect(gd.removePartyMember('A')).toBe(true)
    expect(gd.party).toEqual(['T', 'HUIHUI', 'CONGCONG', 'SUN'])
    expect(gd.reserve).toEqual([])
    expect(gd.removePartyMember('A')).toBe(false)
    expect(gd.removePartyMember('T')).toBe(false)
    expect(gd.party[PARTY_RULES.LEADER_INDEX]).toBe(PARTY_RULES.LEADER_ID)
  })

  test('active companions can swap with reserves while the leader stays fixed', () => {
    const gd = GameData.getInstance()
    gd.setFlag('huihui_joined', true)
    gd.setFlag('a_joined', true)
    gd.setFlag('congcong_joined', true)
    gd.setFlag('sun_joined', true)

    const originalParty = [...gd.party]
    const originalReserve = [...gd.reserve]
    expect(gd.swapActiveWithReserve('T', 'SUN')).toBe(false)
    expect(gd.swapActiveWithReserve('A', 'MISSING')).toBe(false)
    expect(gd.swapActiveWithReserve('HUIHUI', 'A')).toBe(false)
    expect(gd.swapActiveWithReserve('SUN', 'SUN')).toBe(false)
    expect(gd.party).toEqual(originalParty)
    expect(gd.reserve).toEqual(originalReserve)
    expect(gd.swapActiveWithReserve('CONGCONG', 'SUN')).toBe(true)
    expect(gd.party).toEqual(['T', 'HUIHUI', 'A', 'SUN'])
    expect(gd.reserve).toEqual(['CONGCONG'])

    const snapshot = gd.serialize()
    gd.reset()
    gd.deserialize(snapshot)
    expect(gd.party).toEqual(['T', 'HUIHUI', 'A', 'SUN'])
    expect(gd.reserve).toEqual(['CONGCONG'])
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

  test('deserialize legacy saves without equipment indexes applies equipped bonuses once', () => {
    const gd = GameData.getInstance()
    const snapshot = gd.serialize() as Record<string, unknown>
    const savedCharacters = snapshot.characters as Record<string, CharacterData>
    const savedHeroAttack = savedCharacters.T!.stats.atk
    delete snapshot.equipment
    delete snapshot.baseStats

    gd.deserialize(snapshot)

    expect(gd.characters.get('T')!.stats.atk).toBe(savedHeroAttack)
    const normalized = gd.serialize() as { baseStats: Record<string, CharacterStats> }
    expect(normalized.baseStats.T!.atk).toBe(INITIAL_CHARACTERS.T!.stats.atk)
  })

  test('deserialize fills partial base stats before later equipment changes', () => {
    const gd = GameData.getInstance()
    const snapshot = gd.serialize() as Record<string, unknown>
    const savedCharacters = snapshot.characters as Record<string, CharacterData>
    const savedBaseStats = snapshot.baseStats as Record<string, CharacterStats>
    const savedHuihuiAttack = savedCharacters.HUIHUI!.stats.atk
    const savedHuihuiSpeed = savedCharacters.HUIHUI!.stats.speed
    snapshot.baseStats = { T: savedBaseStats.T! }

    gd.deserialize(snapshot)
    gd.equipItem('HUIHUI', 'pink_chime', 'accessory')

    expect(gd.characters.get('HUIHUI')!.stats.atk).toBe(savedHuihuiAttack)
    expect(gd.characters.get('HUIHUI')!.stats.speed).toBe(savedHuihuiSpeed + EQUIP_STAT_BONUSES.pink_chime!.speed!)
    const normalized = gd.serialize() as { baseStats: Record<string, CharacterStats> }
    expect(normalized.baseStats.HUIHUI!.atk).toBe(INITIAL_CHARACTERS.HUIHUI!.stats.atk)
  })

  test('deserialize keeps configured base stats for newly backfilled characters', () => {
    const gd = GameData.getInstance()
    const snapshot = gd.serialize() as Record<string, unknown>
    const savedCharacters = snapshot.characters as Record<string, CharacterData>
    const savedBaseStats = snapshot.baseStats as Record<string, CharacterStats>
    const savedSunMagicAttack = savedCharacters.SUN!.stats.matk
    snapshot.characters = Object.fromEntries(
      Object.entries(savedCharacters).filter(([charId]) => charId !== 'SUN'),
    )
    snapshot.baseStats = { T: savedBaseStats.T! }

    gd.deserialize(snapshot)

    expect(gd.characters.get('SUN')!.stats.matk).toBe(savedSunMagicAttack)
  })

  test('deserialize backfills rescued A only from the completed palace event', () => {
    const gd = GameData.getInstance()
    gd.addPartyMember('A')
    const snapshot = gd.serialize() as { flags: Record<string, unknown> }
    snapshot.flags[LEGACY_SAVE_PROGRESS.A_RESCUE_EVENT_DONE_FLAG] = true
    delete snapshot.flags[A_RESCUED_FLAG]

    gd.deserialize(snapshot)

    expect(gd.getFlag(A_RESCUED_FLAG)).toBe(true)
  })

  test('deserialize reopens incomplete legacy reincarnation answers at the dream entrance', () => {
    const gd = GameData.getInstance()
    const snapshot = gd.serialize() as { flags: Record<string, unknown>; branches: Record<string, unknown> }
    snapshot.flags.dream_active = true
    snapshot.flags[LEGACY_SAVE_PROGRESS.REINCARNATION_MEMORY_DONE_FLAGS[0]] = true
    snapshot.flags[LEGACY_SAVE_PROGRESS.REINCARNATION_MEMORY_DONE_FLAGS[1]] = true
    snapshot.flags[LEGACY_SAVE_PROGRESS.REINCARNATION_DREAM_START_DONE_FLAG] = true
    snapshot.flags[LEGACY_SAVE_PROGRESS.REINCARNATION_TIMER_STARTED_FLAG] = 1
    for (const flag of REINCARNATION_CORRECT_ANSWER_FLAGS) delete snapshot.flags[flag]
    snapshot.branches.true_route_reincarnation = false
    gd.deserialize(snapshot)

    for (const flag of LEGACY_SAVE_PROGRESS.REINCARNATION_MEMORY_DONE_FLAGS) {
      expect(gd.getFlag(flag)).toBeUndefined()
    }
    for (const flag of REINCARNATION_CORRECT_ANSWER_FLAGS) {
      expect(gd.getFlag(flag)).toBeUndefined()
    }
    expect(gd.getFlag(LEGACY_SAVE_PROGRESS.REINCARNATION_DREAM_START_DONE_FLAG)).toBeUndefined()
    expect(gd.getFlag(LEGACY_SAVE_PROGRESS.REINCARNATION_TIMER_STARTED_FLAG)).toBeUndefined()
    expect(gd.getFlag('dream_active')).toBe(false)
    expect(gd.getFlag('true_route_reincarnation')).toBe(false)

    gd.deserialize(gd.serialize())
    expect(gd.getFlag(LEGACY_SAVE_PROGRESS.REINCARNATION_DREAM_START_DONE_FLAG)).toBeUndefined()
    expect(gd.getFlag(LEGACY_SAVE_PROGRESS.REINCARNATION_TIMER_STARTED_FLAG)).toBeUndefined()
    expect(gd.getFlag('dream_active')).toBe(false)
  })

  test('deserialize preserves completed legacy reincarnation progress', () => {
    const gd = GameData.getInstance()
    const snapshot = gd.serialize() as { flags: Record<string, unknown>; branches: Record<string, unknown> }
    snapshot.flags.dream_active = true
    for (const flag of LEGACY_SAVE_PROGRESS.REINCARNATION_MEMORY_DONE_FLAGS) snapshot.flags[flag] = true
    for (const flag of REINCARNATION_CORRECT_ANSWER_FLAGS) delete snapshot.flags[flag]
    snapshot.branches.true_route_reincarnation = true

    gd.deserialize(snapshot)

    for (const flag of LEGACY_SAVE_PROGRESS.REINCARNATION_MEMORY_DONE_FLAGS) {
      expect(gd.getFlag(flag)).toBe(true)
    }
    expect(gd.getFlag('true_route_reincarnation')).toBe(true)
  })

  test('deserialize migrates active quests to the current objective count', () => {
    const gd = GameData.getInstance()
    const snapshot = gd.serialize() as { quests: Record<string, unknown> }
    snapshot.quests.QST_014 = { id: 'QST_014', status: 'active', progress: 0, maxProgress: 1 }

    gd.deserialize(snapshot)
    expect(gd.quests.get('QST_014')).toEqual({ id: 'QST_014', status: 'active', progress: 0, maxProgress: 2 })

    QuestSystem.getInstance().advanceQuest('QST_014')
    expect(gd.quests.get('QST_014')).toEqual({ id: 'QST_014', status: 'active', progress: 1, maxProgress: 2 })
  })

  test('deserialize preserves quest status while normalizing known progress only', () => {
    const gd = GameData.getInstance()
    const snapshot = gd.serialize() as { quests: Record<string, unknown> }
    snapshot.quests = {
      QST_014: { id: 'QST_014', status: 'completed', progress: 1, maxProgress: 1 },
      QST_013: { id: 'QST_013', status: 'failed', progress: 99, maxProgress: 99 },
      MOD_QUEST: { id: 'MOD_QUEST', status: 'active', progress: 2, maxProgress: 7 },
    }

    gd.deserialize(snapshot)

    expect(gd.quests.get('QST_014')).toEqual({ id: 'QST_014', status: 'completed', progress: 2, maxProgress: 2 })
    expect(gd.quests.get('QST_013')).toEqual({ id: 'QST_013', status: 'failed', progress: 3, maxProgress: 3 })
    expect(gd.quests.get('MOD_QUEST')).toEqual({ id: 'MOD_QUEST', status: 'active', progress: 2, maxProgress: 7 })
  })

  test('true route unlock syncs from branch and flag state', () => {
    const gd = GameData.getInstance()

    gd.setFlag('white_tiger_respected', true)
    gd.setFlag('answered_xiyuan_kindly', true)
    gd.setFlag('released_four_seals', true)
    gd.setFlag('xiaoai_purified', true)
    gd.setFlag('true_route_reincarnation', true)
    gd.updateBranch('mercy_score', TRUE_ROUTE_MIN_MERCY)
    gd.updateBranch('xiaoai_memory_fragments', TRUE_ROUTE_MIN_XIAOAI_MEMORY_FRAGMENTS)

    expect(gd.branches.true_route_unlocked).toBe(true)
    expect(gd.getFlag('true_route_unlocked')).toBe(true)
  })

  test('true route stays locked below the authored mercy threshold', () => {
    const gd = GameData.getInstance()

    gd.setFlag('white_tiger_respected', true)
    gd.setFlag('answered_xiyuan_kindly', true)
    gd.setFlag('released_four_seals', true)
    gd.setFlag('xiaoai_purified', true)
    gd.setFlag('true_route_reincarnation', true)
    gd.updateBranch('xiaoai_memory_fragments', TRUE_ROUTE_MIN_XIAOAI_MEMORY_FRAGMENTS)
    gd.updateBranch('mercy_score', TRUE_ROUTE_MIN_MERCY - 1)

    expect(gd.branches.true_route_unlocked).toBe(false)
    gd.updateBranch('mercy_score', TRUE_ROUTE_MIN_MERCY)
    expect(gd.branches.true_route_unlocked).toBe(true)
  })

  test('true route requires the successful timed reincarnation dialogue', () => {
    const gd = GameData.getInstance()
    gd.setFlag('white_tiger_respected', true)
    gd.setFlag('answered_xiyuan_kindly', true)
    gd.setFlag('released_four_seals', true)
    gd.setFlag('xiaoai_purified', true)
    gd.updateBranch('mercy_score', TRUE_ROUTE_MIN_MERCY)
    gd.updateBranch('xiaoai_memory_fragments', TRUE_ROUTE_MIN_XIAOAI_MEMORY_FRAGMENTS)

    expect(gd.branches.true_route_unlocked).toBe(false)
    gd.setFlag('true_route_reincarnation', true)
    expect(gd.branches.true_route_unlocked).toBe(true)
  })

  test('numeric branch flags mirror cumulative branch values', () => {
    const gd = GameData.getInstance()

    for (let i = 0; i < TRUE_ROUTE_MIN_XIAOAI_MEMORY_FRAGMENTS; i++) {
      gd.setFlag('xiaoai_memory_fragments', 1)
    }
    gd.updateBranch('mercy_score', TRUE_ROUTE_MIN_MERCY)

    const snapshot = gd.serialize() as { flags: Record<string, unknown>; branches: Record<string, unknown> }

    expect(gd.getFlag('xiaoai_memory_fragments')).toBe(TRUE_ROUTE_MIN_XIAOAI_MEMORY_FRAGMENTS)
    expect(gd.flags.xiaoai_memory_fragments).toBe(TRUE_ROUTE_MIN_XIAOAI_MEMORY_FRAGMENTS)
    expect(gd.flags.mercy_score).toBe(TRUE_ROUTE_MIN_MERCY)
    expect(snapshot.flags.xiaoai_memory_fragments).toBe(snapshot.branches.xiaoai_memory_fragments)
    expect(snapshot.flags.mercy_score).toBe(snapshot.branches.mercy_score)
  })

  test('choice reward flags unlock their codex entries idempotently', () => {
    const gd = GameData.getInstance()
    gd.setFlag('achieve_late', true)
    gd.setFlag('memory_robes', true)
    gd.setFlag('info_tianjiange', true)
    gd.setFlag('achieve_late', true)

    expect(gd.unlockedCodex).toEqual([
      'achievement_almost_late',
      'memory_parent_robes',
      'lore_tianjian_pavilion',
    ])
  })

  test('deserialize backfills codex rewards from legacy choice flags', () => {
    const gd = GameData.getInstance()
    const snapshot = gd.serialize() as Record<string, any>
    snapshot.flags = { ...snapshot.flags, achieve_late: true, memory_robes: true }
    delete snapshot.unlockedCodex

    gd.deserialize(snapshot)

    expect(gd.unlockedCodex).toEqual(['achievement_almost_late', 'memory_parent_robes'])
  })

  test('numeric branch mutations stay within save-compatible authored bounds', () => {
    const gd = GameData.getInstance()

    gd.setFlag('mercy_score', -1)
    gd.setFlag('trust_huihui', BRANCH_VALUE_LIMITS.TRUST_MIN - 1)
    expect(gd.branches.mercy_score).toBe(BRANCH_VALUE_LIMITS.MERCY_MIN)
    expect(gd.branches.trust_huihui).toBe(BRANCH_VALUE_LIMITS.TRUST_MIN)

    gd.updateBranch('mercy_score', BRANCH_VALUE_LIMITS.MERCY_MAX + 1)
    gd.updateBranch('trust_huihui', BRANCH_VALUE_LIMITS.TRUST_MAX + 1)
    expect(gd.branches.mercy_score).toBe(BRANCH_VALUE_LIMITS.MERCY_MAX)
    expect(gd.branches.trust_huihui).toBe(BRANCH_VALUE_LIMITS.TRUST_MAX)
  })

  test('deserialize normalizes legacy branch values outside authored bounds', () => {
    const gd = GameData.getInstance()
    const snapshot = gd.serialize() as { branches: Record<string, unknown> }
    snapshot.branches.mercy_score = -1
    snapshot.branches.trust_sun = BRANCH_VALUE_LIMITS.TRUST_MAX + 10

    gd.deserialize(snapshot)

    expect(gd.branches.mercy_score).toBe(BRANCH_VALUE_LIMITS.MERCY_MIN)
    expect(gd.branches.trust_sun).toBe(BRANCH_VALUE_LIMITS.TRUST_MAX)
  })

  test('partner call unlocks only from the authored combined trust threshold', () => {
    const gd = GameData.getInstance()

    expect(gd.getFlag(PARTNER_CALL_AVAILABLE_FLAG)).toBe(false)
    gd.updateBranch('trust_huihui', PARTNER_CALL_MIN_TRUST - 2)
    gd.updateBranch('trust_a', 1)
    expect(gd.getFlag(PARTNER_CALL_AVAILABLE_FLAG)).toBe(false)
    gd.updateBranch('trust_congcong', 1)
    expect(gd.getFlag(PARTNER_CALL_AVAILABLE_FLAG)).toBe(true)
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

  test('deserialize normalizes stale party rosters', () => {
    const gd = GameData.getInstance()
    const snapshot = gd.serialize()

    gd.deserialize({
      ...snapshot,
      party: ['HUIHUI', 'A', 'CONGCONG', 'SUN', 'MISSING_CHARACTER'],
      reserve: ['A', 'xiaoai', 'SUN', 'T'],
    })

    expect(gd.party).toHaveLength(PARTY_RULES.ACTIVE_MEMBER_LIMIT)
    expect(gd.party).toEqual(['T', 'HUIHUI', 'A', 'CONGCONG'])
    expect(gd.reserve).toEqual(['SUN', 'xiaoai'])
  })

  test('deserialize falls back from missing maps to a safe start location', () => {
    const gd = GameData.getInstance()
    const snapshot = gd.serialize()

    gd.deserialize({
      ...snapshot,
      currentMap: 'MAP_MISSING',
      playerPosition: { x: 999, y: -20 },
    })

    expect(gd.currentMap).toBe(START_MAP_ID)
    expect(gd.playerPosition).toEqual(START_PLAYER_POSITION)
  })

  test('deserialize keeps rebuilt town saves on the rebuilt map', () => {
    const gd = GameData.getInstance()
    const snapshot = gd.serialize() as Record<string, unknown>
    snapshot.currentMap = START_MAP_ID
    snapshot.rebuildLevel = REBUILD_VISUAL_MAP_THRESHOLD
    snapshot.branches = {
      ...(snapshot.branches as Record<string, unknown>),
      rebuild_level: REBUILD_VISUAL_MAP_THRESHOLD,
    }

    gd.deserialize(snapshot)

    expect(gd.currentMap).toBe(REBUILT_TOWN_MAP_ID)
  })

  test('deserialize keeps saved locations inside walkable map bounds', () => {
    const gd = GameData.getInstance()
    const snapshot = gd.serialize()
    const mapId = 'MAP_001'
    const map = GAME_CONFIG_DATABASE.getTable('maps')[mapId]!

    gd.deserialize({
      ...snapshot,
      currentMap: mapId,
      playerPosition: { x: Number.POSITIVE_INFINITY, y: map.height + 100 },
    })

    const index = gd.playerPosition.y * map.width + gd.playerPosition.x
    expect(gd.currentMap).toBe(mapId)
    expect(gd.playerPosition.x).toBeGreaterThanOrEqual(0)
    expect(gd.playerPosition.y).toBeGreaterThanOrEqual(0)
    expect(gd.playerPosition.x).toBeLessThan(map.width)
    expect(gd.playerPosition.y).toBeLessThan(map.height)
    expect(map.collisions).not.toContain(index)
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

  test('resource mutations reject non-positive amounts', () => {
    const gd = GameData.getInstance()
    const startingGold = gd.gold
    const startingGrass = gd.getItemQuantity('heal_grass')

    gd.addGold(-100)
    gd.addItem('heal_grass', -2)

    expect(gd.gold).toBe(startingGold)
    expect(gd.getItemQuantity('heal_grass')).toBe(startingGrass)
    expect(gd.spendGold(-100)).toBe(false)
    expect(gd.removeItem('heal_grass', -2)).toBe(false)
    expect(gd.gold).toBe(startingGold)
    expect(gd.getItemQuantity('heal_grass')).toBe(startingGrass)
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

  test('story milestones advance rebuild levels from one through five', () => {
    const gd = GameData.getInstance()
    const milestones = [
      ['has_millennium_seed', 1],
      ['has_sacred_water', 2],
      ['rebuild_ceremony_done', 3],
      ['released_four_seals', 4],
      ['game_cleared', 5],
    ] as const

    for (const [flag, level] of milestones) {
      gd.setFlag(flag, true)
      expect(gd.rebuildLevel).toBe(level)
      expect(gd.branches.rebuild_level).toBe(level)
      expect(gd.flags.rebuild_level).toBe(level)
    }
  })

  test('story milestones unlock only the facilities assigned to their level', () => {
    const gd = GameData.getInstance()
    const rebuildSystem = RebuildSystem.getInstance()

    gd.setFlag('has_millennium_seed', true)
    expect(rebuildSystem.getUnlockedFacilities().map(facility => facility.id)).toEqual(['herb_shop', 'farm'])

    gd.setFlag('has_sacred_water', true)
    expect(rebuildSystem.getFacilitiesForLevel(2).map(facility => facility.id)).toEqual(['item_shop', 'dock'])
    expect(gd.getFlag('facility_item_shop')).toBe(true)
    expect(gd.getFlag('facility_plaza')).not.toBe(true)

    gd.setFlag('rebuild_ceremony_done', true)
    expect(gd.getFlag('facility_equipment_shop')).toBe(true)
    expect(gd.getFlag('facility_quest_board')).toBe(true)
    expect(gd.getFlag('facility_defense')).not.toBe(true)

    gd.setFlag('released_four_seals', true)
    expect(gd.getFlag('facility_defense')).toBe(true)
    expect(gd.getFlag('facility_teleport')).toBe(true)
  })

  test('direct rebuild level flags unlock matching facilities', () => {
    const gd = GameData.getInstance()
    const rebuildSystem = RebuildSystem.getInstance()

    gd.setFlag('rebuild_level', 5)

    expect(rebuildSystem.getUnlockedFacilities()).toEqual(rebuildSystem.getAllFacilities())
    for (const facility of rebuildSystem.getAllFacilities()) {
      expect(gd.getFlag(facility.flag)).toBe(true)
    }
  })

  test('deserialize backfills facility flags from saved rebuild level', () => {
    const gd = GameData.getInstance()
    const snapshot = gd.serialize() as { flags: Record<string, unknown>; rebuildLevel: number; branches: Record<string, unknown> }

    gd.deserialize({
      ...snapshot,
      flags: { rebuild_level: 5 },
      branches: { ...snapshot.branches, rebuild_level: 5 },
      rebuildLevel: 5,
    })

    for (const facility of RebuildSystem.getInstance().getAllFacilities()) {
      expect(gd.getFlag(facility.flag)).toBe(true)
    }
  })

  test('deserialize upgrades legacy rebuild progress from story flags without downgrading newer saves', () => {
    const gd = GameData.getInstance()
    const snapshot = gd.serialize() as { flags: Record<string, unknown>; rebuildLevel: number; branches: Record<string, unknown> }

    gd.deserialize({
      ...snapshot,
      flags: { has_sacred_water: true },
      branches: { ...snapshot.branches, rebuild_level: 0 },
      rebuildLevel: 0,
    })
    expect(gd.rebuildLevel).toBe(2)
    expect(gd.getFlag('facility_item_shop')).toBe(true)

    gd.deserialize({
      ...snapshot,
      flags: {},
      branches: { ...snapshot.branches, released_four_seals: true, rebuild_level: 0 },
      rebuildLevel: 0,
    })
    expect(gd.rebuildLevel).toBe(4)
    expect(gd.getFlag('facility_teleport')).toBe(true)

    gd.deserialize({
      ...snapshot,
      flags: { has_millennium_seed: true },
      branches: { ...snapshot.branches, rebuild_level: 4 },
      rebuildLevel: 4,
    })
    expect(gd.rebuildLevel).toBe(4)
  })

  test('rebuild progression APIs do not downgrade progress', () => {
    const gd = GameData.getInstance()
    const higherLevel = REBUILD_VISUAL_MAP_THRESHOLD + 2

    RebuildSystem.getInstance().setLevel(higherLevel)
    RebuildSystem.getInstance().setLevel(REBUILD_VISUAL_MAP_THRESHOLD)
    gd.updateBranch('rebuild_level', REBUILD_VISUAL_MAP_THRESHOLD)

    expect(gd.rebuildLevel).toBe(higherLevel)
    expect(gd.branches.rebuild_level).toBe(higherLevel)
    expect(gd.flags.rebuild_level).toBe(higherLevel)
  })
})
