import { beforeEach, describe, expect, test } from 'bun:test'
import { applyStateEventAction, isStateEventAction } from '../../src/core/EventActionExecutor.ts'
import { GameData } from '../../src/core/GameData.ts'
import { QuestSystem } from '../../src/core/QuestSystem.ts'

describe('EventActionExecutor', () => {
  beforeEach(() => {
    GameData.getInstance().reset()
  })

  test('rejects scene flow actions so scenes own transitions', () => {
    expect(isStateEventAction({ type: 'dialogue', dialogueId: 'DIA_001_START' })).toBe(false)
    expect(applyStateEventAction({ type: 'shop' })).toEqual({ handled: false, partyChanged: false })
  })

  test('applies inventory add and remove actions consistently', () => {
    const gd = GameData.getInstance()

    expect(applyStateEventAction({ type: 'addItem', itemId: 'blue_mint', quantity: 2 }).handled).toBe(true)
    expect(gd.getItemQuantity('blue_mint')).toBe(2)

    expect(applyStateEventAction({ type: 'removeItem', itemId: 'blue_mint' }).handled).toBe(true)
    expect(gd.getItemQuantity('blue_mint')).toBe(1)
  })

  test('reports failed item removal without mutating inventory', () => {
    const result = applyStateEventAction({ type: 'removeItem', itemId: 'blue_mint' })

    expect(result.handled).toBe(true)
    expect(result.failureReason).toBe('Missing item blue_mint')
    expect(GameData.getInstance().getItemQuantity('blue_mint')).toBe(0)
  })

  test('reports quest completion source for route QA', () => {
    const qs = QuestSystem.getInstance()
    applyStateEventAction({ type: 'questStart', questId: 'QST_001' })

    const result = applyStateEventAction({ type: 'questAdvance', questId: 'QST_001', amount: 3 })

    expect(result.completedQuestId).toBe('QST_001')
    expect(qs.isQuestCompleted('QST_001')).toBe(true)
  })

  test('reports party changes for map HUD refreshes', () => {
    const addResult = applyStateEventAction({ type: 'addParty', characterId: 'HUIHUI' })
    expect(addResult.partyChanged).toBe(true)
    expect(GameData.getInstance().party).toContain('HUIHUI')

    const removeResult = applyStateEventAction({ type: 'removeParty', characterId: 'HUIHUI' })
    expect(removeResult.partyChanged).toBe(true)
    expect(GameData.getInstance().party).not.toContain('HUIHUI')
  })
})
