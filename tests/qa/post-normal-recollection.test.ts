import { beforeEach, describe, expect, test } from 'bun:test'
import { applyStateEventAction, isStateEventAction } from '../../src/core/EventActionExecutor.ts'
import { areEventConditionsMet } from '../../src/core/EventConditions.ts'
import { GameData } from '../../src/core/GameData.ts'
import { QuestSystem } from '../../src/core/QuestSystem.ts'
import { DIALOGUES } from '../../src/data/dialogues.ts'
import { MAPS } from '../../src/data/maps.ts'
import { POST_NORMAL_RECOLLECTION, TRUE_ROUTE_MIN_MERCY, TRUE_ROUTE_MIN_XIAOAI_MEMORY_FRAGMENTS } from '../../src/utils/constants.ts'

describe('post-normal recollection route', () => {
  beforeEach(() => {
    GameData.getInstance().reset()
  })

  for (const initialPurified of [false, true]) {
    test(`recovers the true route after a ${initialPurified ? 'premature purification' : 'terminal attack'} ending`, () => {
      const gd = GameData.getInstance()
      const event = MAPS.MAP_002!.events.find(candidate => candidate.id === POST_NORMAL_RECOLLECTION.EVENT_ID)!
      gd.setFlag('released_four_seals', true)
      gd.setFlag('normal_ending_seen', true)
      gd.setFlag('xiaoai_purified', initialPurified)

      expect(areEventConditionsMet(event.conditions, flag => gd.getFlag(flag))).toBe(true)
      expect(event.actions).toContainEqual({ type: 'battle', encounterId: 'BTL_XIAOAI_SHADOW' })

      QuestSystem.getInstance().startQuest(POST_NORMAL_RECOLLECTION.QUEST_ID)
      const completion = DIALOGUES[POST_NORMAL_RECOLLECTION.COMPLETE_DIALOGUE_ID]!
      for (const action of completion.onComplete ?? []) {
        expect(isStateEventAction(action)).toBe(true)
        if (isStateEventAction(action)) applyStateEventAction(action)
      }

      expect(gd.getFlag(POST_NORMAL_RECOLLECTION.COMPLETED_FLAG)).toBe(true)
      expect(gd.branches.mercy_score).toBeGreaterThanOrEqual(TRUE_ROUTE_MIN_MERCY)
      expect(gd.branches.xiaoai_memory_fragments).toBe(TRUE_ROUTE_MIN_XIAOAI_MEMORY_FRAGMENTS)
      expect(gd.getFlag('true_route_unlocked')).toBe(true)
      expect(gd.inventory.items.xiaoai_light).toBe(1)
      expect(QuestSystem.getInstance().isQuestCompleted(POST_NORMAL_RECOLLECTION.QUEST_ID)).toBe(true)
      expect(areEventConditionsMet(event.conditions, flag => gd.getFlag(flag))).toBe(false)
    })
  }
})
