import { beforeEach, describe, expect, test } from 'bun:test'
import { GameData } from '../../src/core/GameData.ts'
import { isProphecyConditionMet } from '../../src/core/ProphecyConditions.ts'
import { QuestSystem } from '../../src/core/QuestSystem.ts'
import { PROPHECIES } from '../../src/data/prophecies.ts'

describe('ProphecyConditions', () => {
  beforeEach(() => {
    GameData.getInstance().reset()
  })

  test('afterword prophecy unlocks from the true ending clear flag', () => {
    const afterword = PROPHECIES.find(prophecy => prophecy.id === 'P007')

    expect(afterword?.condition).toBe('game_cleared')
    expect(isProphecyConditionMet(afterword?.condition)).toBe(false)

    GameData.getInstance().setFlag('game_cleared', true)

    expect(isProphecyConditionMet(afterword?.condition)).toBe(true)
  })

  test('chapter guidance unlocks when its quest starts instead of after its objective', () => {
    const spring = PROPHECIES.find(prophecy => prophecy.id === 'P004')
    const palace = PROPHECIES.find(prophecy => prophecy.id === 'P005')
    const quests = QuestSystem.getInstance()

    expect(spring?.condition).toBe('quest_started_QST_009')
    expect(palace?.condition).toBe('quest_started_QST_012')
    expect(isProphecyConditionMet(spring?.condition)).toBe(false)
    expect(isProphecyConditionMet(palace?.condition)).toBe(false)

    quests.startQuest('QST_009')
    expect(isProphecyConditionMet(spring?.condition)).toBe(true)
    expect(isProphecyConditionMet(palace?.condition)).toBe(false)

    quests.startQuest('QST_012')
    expect(isProphecyConditionMet(palace?.condition)).toBe(true)
  })
})
