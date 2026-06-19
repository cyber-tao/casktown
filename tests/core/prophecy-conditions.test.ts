import { beforeEach, describe, expect, test } from 'bun:test'
import { GameData } from '../../src/core/GameData.ts'
import { isProphecyConditionMet } from '../../src/core/ProphecyConditions.ts'
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
})
