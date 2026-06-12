import { PROPHECY_NUMERIC_CONDITION_MIN, QUEST_COMPLETED_CONDITION_PREFIX, QUEST_STARTED_CONDITION_PREFIX } from '../utils/constants'
import { GameData } from './GameData'
import { QuestSystem } from './QuestSystem'

export function isProphecyConditionMet(condition?: string): boolean {
  if (!condition) return true
  const questSystem = QuestSystem.getInstance()
  if (condition.startsWith(QUEST_STARTED_CONDITION_PREFIX)) {
    const questId = condition.slice(QUEST_STARTED_CONDITION_PREFIX.length)
    return questSystem.isQuestActive(questId) || questSystem.isQuestCompleted(questId)
  }
  if (condition.startsWith(QUEST_COMPLETED_CONDITION_PREFIX)) {
    return questSystem.isQuestCompleted(condition.slice(QUEST_COMPLETED_CONDITION_PREFIX.length))
  }
  const conditionValue = GameData.getInstance().getFlag(condition)
  return conditionValue === true || (typeof conditionValue === 'number' && conditionValue > PROPHECY_NUMERIC_CONDITION_MIN)
}
