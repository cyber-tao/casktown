import { beforeEach, describe, expect, test } from 'bun:test'
import { GameData } from '../../src/core/GameData.ts'
import { QuestSystem } from '../../src/core/QuestSystem.ts'
import { SkillGrowth } from '../../src/core/SkillGrowth.ts'
import { EventBus, GameEvents } from '../../src/core/EventBus.ts'
import { GAME_CONFIG_DATABASE } from '../../src/data/configDatabase.ts'
import { QUESTS } from '../../src/data/quests.ts'

describe('QuestSystem', () => {
  beforeEach(() => {
    GameData.getInstance().reset()
  })

  test('startQuest creates active quest state', () => {
    const qs = QuestSystem.getInstance()
    const questId = Object.keys(QUESTS)[0]!
    qs.startQuest(questId)

    const state = qs.getQuestState(questId)
    expect(state).toBeDefined()
    expect(state!.status).toBe('active')
    expect(state!.progress).toBe(0)
    expect(state!.maxProgress).toBe(QUESTS[questId]!.objectives.length)
  })

  test('startQuest emits QUEST_UPDATE event', () => {
    const qs = QuestSystem.getInstance()
    const questId = Object.keys(QUESTS)[0]!
    let emitted = false
    const handler = () => { emitted = true }
    EventBus.on(GameEvents.QUEST_UPDATE, handler)
    qs.startQuest(questId)
    expect(emitted).toBe(true)
    EventBus.off(GameEvents.QUEST_UPDATE, handler)
  })

  test('startQuest ignores already active quest', () => {
    const qs = QuestSystem.getInstance()
    const questId = Object.keys(QUESTS)[0]!
    qs.startQuest(questId)
    qs.startQuest(questId)

    expect(qs.isQuestActive(questId)).toBe(true)
    expect(qs.getActiveQuests().filter(q => q.id === questId)).toHaveLength(1)
  })

  test('advanceQuest increments progress', () => {
    const qs = QuestSystem.getInstance()
    const questId = Object.keys(QUESTS)[0]!
    const quest = QUESTS[questId]!
    qs.startQuest(questId)

    if (quest.objectives.length > 1) {
      qs.advanceQuest(questId)
      const state = qs.getQuestState(questId)
      expect(state!.progress).toBe(1)
      expect(state!.status).toBe('active')
    }
  })

  test('advanceQuest ignores non-positive amounts', () => {
    const qs = QuestSystem.getInstance()
    const questId = Object.keys(QUESTS)[0]!
    qs.startQuest(questId)

    qs.advanceQuest(questId, -1)
    qs.advanceQuest(questId, 0)

    const state = qs.getQuestState(questId)
    expect(state!.progress).toBe(0)
    expect(state!.status).toBe('active')
  })

  test('advanceQuest auto-completes when progress reaches max', () => {
    const qs = QuestSystem.getInstance()
    const questId = Object.keys(QUESTS)[0]!
    const quest = QUESTS[questId]
    qs.startQuest(questId)

    qs.advanceQuest(questId, quest!.objectives.length)
    expect(qs.isQuestCompleted(questId)).toBe(true)
    expect(qs.isQuestActive(questId)).toBe(false)
  })

  test('completeQuest sets status to completed', () => {
    const qs = QuestSystem.getInstance()
    const questId = Object.keys(QUESTS)[0]!
    qs.startQuest(questId)
    qs.completeQuest(questId)

    const state = qs.getQuestState(questId)
    expect(state!.status).toBe('completed')
    expect(state!.progress).toBe(state!.maxProgress)
  })

  test('completeQuest is idempotent', () => {
    const qs = QuestSystem.getInstance()
    const questId = Object.keys(QUESTS)[0]!
    qs.startQuest(questId)
    qs.completeQuest(questId)
    qs.completeQuest(questId)

    expect(qs.getCompletedQuests().filter(q => q.id === questId)).toHaveLength(1)
  })

  test('completeQuest emits quest update after rewards settle', () => {
    const gd = GameData.getInstance()
    const qs = QuestSystem.getInstance()
    let observedRewardFlag: unknown
    const handler = (questId: string) => {
      if (questId === 'QST_001') {
        observedRewardFlag = gd.getFlag('ring_awakened')
      }
    }

    EventBus.on(GameEvents.QUEST_UPDATE, handler)
    try {
      qs.startQuest('QST_001')
      qs.completeQuest('QST_001')
    } finally {
      EventBus.off(GameEvents.QUEST_UPDATE, handler)
    }

    expect(observedRewardFlag).toBe(true)
  })

  test('completeQuest unlocks skills after non-exp rewards settle', () => {
    const gd = GameData.getInstance()
    const qs = QuestSystem.getInstance()
    gd.setFlag('has_sacred_water', true)
    qs.startQuest('QST_008')
    qs.completeQuest('QST_008')

    expect(gd.rebuildLevel).toBe(3)
    expect(gd.characters.get('T')?.skills).toContain('shouxiangshi')
  })

  test('completeQuest checks skill unlocks even when a quest has no rewards', () => {
    const quests = GAME_CONFIG_DATABASE.getTable('quests')
    const originalQuest = quests.QST_001!
    const skillGrowth = SkillGrowth.getInstance()
    const originalCheckAllUnlocks = skillGrowth.checkAllUnlocks
    let checkCount = 0
    quests.QST_001 = { ...originalQuest, rewards: undefined }
    skillGrowth.checkAllUnlocks = () => {
      checkCount += 1
      return new Map()
    }

    try {
      const qs = QuestSystem.getInstance()
      qs.startQuest('QST_001')
      qs.completeQuest('QST_001')

      expect(checkCount).toBe(1)
    } finally {
      quests.QST_001 = originalQuest
      skillGrowth.checkAllUnlocks = originalCheckAllUnlocks
    }
  })

  test('failQuest sets status to failed', () => {
    const qs = QuestSystem.getInstance()
    const questId = Object.keys(QUESTS)[0]!
    qs.startQuest(questId)
    qs.failQuest(questId)

    const state = qs.getQuestState(questId)
    expect(state!.status).toBe('failed')
  })

  test('failQuest ignores non-active quest', () => {
    const qs = QuestSystem.getInstance()
    const questId = Object.keys(QUESTS)[0]!
    qs.startQuest(questId)
    qs.completeQuest(questId)
    qs.failQuest(questId)

    expect(qs.getQuestState(questId)!.status).toBe('completed')
  })

  test('getActiveQuests returns only active quests', () => {
    const qs = QuestSystem.getInstance()
    const ids = Object.keys(QUESTS).slice(0, 3)
    for (const id of ids) qs.startQuest(id)
    qs.completeQuest(ids[0]!)

    const active = qs.getActiveQuests()
    expect(active.every(q => q.status === 'active')).toBe(true)
    expect(active.map(q => q.id)).toContain(ids[1]!)
    expect(active.map(q => q.id)).toContain(ids[2]!)
  })

  test('getCompletedQuests returns only completed quests', () => {
    const qs = QuestSystem.getInstance()
    const ids = Object.keys(QUESTS).slice(0, 2)
    for (const id of ids) qs.startQuest(id)
    qs.completeQuest(ids[0]!)

    const completed = qs.getCompletedQuests()
    expect(completed.length).toBeGreaterThan(0)
    expect(completed.every(q => q.status === 'completed')).toBe(true)
  })

  test('startQuest with unknown id does nothing', () => {
    const qs = QuestSystem.getInstance()
    qs.startQuest('NONEXISTENT_QUEST')
    expect(qs.getQuestState('NONEXISTENT_QUEST')).toBeUndefined()
  })

  test('advanceQuest on non-existent quest does nothing', () => {
    const qs = QuestSystem.getInstance()
    expect(() => qs.advanceQuest('NONEXISTENT_QUEST')).not.toThrow()
  })
})