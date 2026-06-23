import { beforeEach, describe, expect, test } from 'bun:test'
import { applyEncounterVictoryRewards } from '../../src/core/BattleRewards.ts'
import { GameData } from '../../src/core/GameData.ts'
import { QuestSystem } from '../../src/core/QuestSystem.ts'
import { ENCOUNTERS } from '../../src/data/encounters.ts'
import { ENEMIES } from '../../src/data/enemies.ts'
import { INITIAL_GOLD, ROAMING_ENCOUNTER_RESPAWN } from '../../src/utils/constants.ts'

describe('BattleRewards', () => {
  beforeEach(() => {
    GameData.getInstance().reset()
  })

  test('applies story battle rewards through one shared resolver', () => {
    const encounter = ENCOUNTERS.BTL_113!
    const expectedExp = encounter.enemies.reduce((sum, enemyId) => sum + ENEMIES[enemyId]!.exp, 0)
    const expectedGold = encounter.enemies.reduce((sum, enemyId) => sum + ENEMIES[enemyId]!.gold, 0)

    const result = applyEncounterVictoryRewards({
      encounterId: encounter.id,
      mapEventId: 'EVT_SEED_BOSS',
      defeatedAtMs: 123,
      rollDrop: () => false,
    })

    const gd = GameData.getInstance()
    expect(result.encounter?.id).toBe(encounter.id)
    expect(result.missingEnemyIds).toEqual([])
    expect(result.totalExp).toBe(expectedExp)
    expect(result.totalGold).toBe(expectedGold)
    expect(gd.gold).toBe(INITIAL_GOLD + expectedGold)
    expect(gd.getFlag('defeated_barrel_fake')).toBe(true)
    expect(gd.getFlag('defeated_xiao_yao')).toBe(true)
    expect(gd.getFlag('has_millennium_seed')).toBe(true)
    expect(gd.getItemQuantity('seed')).toBe(1)
    expect(QuestSystem.getInstance().isQuestCompleted('QST_004')).toBe(true)
    expect(result.questAutoStarted).toBe(true)
    expect(result.questProgress).toBe('completed')
    expect(gd.getFlag(`${ROAMING_ENCOUNTER_RESPAWN.DEFEATED_FLAG_PREFIX}EVT_SEED_BOSS`)).toBe(true)
    expect(result.dropRewards).toEqual([])
  })

  test('uses injected drop roll for deterministic battle drops', () => {
    const result = applyEncounterVictoryRewards({
      encounterId: 'ENC_FOREST_1',
      rollDrop: () => true,
    })

    expect(result.dropRewards.length).toBeGreaterThan(0)
    for (const reward of result.dropRewards) {
      expect(GameData.getInstance().getItemQuantity(reward.itemId)).toBeGreaterThanOrEqual(reward.quantity)
    }
  })

  test('reports completed when an advance battle finishes a quest', () => {
    const qs = QuestSystem.getInstance()
    qs.startQuest('QST_006')
    qs.advanceQuest('QST_006', 2)

    const result = applyEncounterVictoryRewards({
      encounterId: 'BTL_201',
      rollDrop: () => false,
    })

    expect(result.questProgress).toBe('completed')
    expect(qs.isQuestCompleted('QST_006')).toBe(true)
  })

  test('reports missing encounters without mutating rewards', () => {
    const result = applyEncounterVictoryRewards({ encounterId: 'MISSING_ENCOUNTER' })

    expect(result.encounter).toBeUndefined()
    expect(result.totalExp).toBe(0)
    expect(result.totalGold).toBe(0)
    expect(result.itemRewards).toEqual([])
    expect(GameData.getInstance().gold).toBe(INITIAL_GOLD)
  })
})
