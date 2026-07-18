import { beforeEach, describe, expect, test } from 'bun:test'
import { applyEncounterVictoryRewards } from '../../src/core/BattleRewards.ts'
import { applyStateEventAction } from '../../src/core/EventActionExecutor.ts'
import { GameData } from '../../src/core/GameData.ts'
import { QuestSystem } from '../../src/core/QuestSystem.ts'
import { DIALOGUES } from '../../src/data/dialogues.ts'
import { ENCOUNTERS } from '../../src/data/encounters.ts'
import { ENEMIES } from '../../src/data/enemies.ts'
import { INITIAL_GOLD, ROAMING_ENCOUNTER_RESPAWN } from '../../src/utils/constants.ts'

const SEAL_BATTLES = [
  { encounterId: 'BTL_CHI', afterDialogueId: 'DIA_411_CHI_AFTER' },
  { encounterId: 'BTL_MEI', afterDialogueId: 'DIA_412_MEI_AFTER' },
  { encounterId: 'BTL_WANG', afterDialogueId: 'DIA_413_WANG_AFTER' },
  { encounterId: 'BTL_LIANG', afterDialogueId: 'DIA_414_LIANG_AFTER' },
] as const

function permutations<T>(values: readonly T[]): T[][] {
  if (values.length <= 1) return [[...values]]
  return values.flatMap((value, index) =>
    permutations([...values.slice(0, index), ...values.slice(index + 1)]).map(rest => [value, ...rest]),
  )
}

function applyDialogueCompletionActions(dialogueId: string): void {
  const dialogue = DIALOGUES[dialogueId]
  expect(dialogue).toBeDefined()
  for (const action of dialogue?.onComplete ?? []) {
    expect(applyStateEventAction(action).handled).toBe(true)
  }
}

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

  test('releases all four seals only after every guardian in any order', () => {
    for (const encounterOrder of permutations(SEAL_BATTLES)) {
      const gd = GameData.getInstance()
      gd.reset()
      applyDialogueCompletionActions('DIA_402_BARRIER')
      expect(QuestSystem.getInstance().isQuestActive('QST_010')).toBe(true)

      for (const [index, { encounterId, afterDialogueId }] of encounterOrder.entries()) {
        applyEncounterVictoryRewards({ encounterId, rollDrop: () => false })
        applyDialogueCompletionActions(afterDialogueId)

        const allGuardiansDefeated = index === encounterOrder.length - 1
        expect(gd.getFlag('released_four_seals')).toBe(allGuardiansDefeated)
        expect(QuestSystem.getInstance().isQuestCompleted('QST_010')).toBe(allGuardiansDefeated)
      }

      expect(gd.getFlag('seal_qinglong_released')).toBe(true)
      expect(gd.getFlag('seal_baihu_released')).toBe(true)
      expect(gd.getFlag('seal_zhuque_released')).toBe(true)
      expect(gd.getFlag('seal_xuanwu_released')).toBe(true)
      expect(gd.getFlag('released_four_seals')).toBe(true)
      expect(QuestSystem.getInstance().isQuestCompleted('QST_010')).toBe(true)
    }
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
