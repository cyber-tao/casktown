import { describe, expect, test } from 'bun:test'
import { DialogueCompletionQueue, getUniqueEventActions } from '../../src/core/DialogueCompletionQueue.ts'
import type { DialogueData } from '../../src/data/types.ts'

function script(id: string, onComplete: DialogueData['onComplete']): DialogueData {
  return { id, lines: [{ speaker: 'T', text: id }], onComplete }
}

describe('DialogueCompletionQueue', () => {
  test('keeps child completion actions before terminal parent actions', () => {
    const queue = new DialogueCompletionQueue()
    const parent = script('PARENT', [{ type: 'questStart', questId: 'QST_001' }])
    const child = script('CHILD', [{ type: 'setFlag', flag: 'child_done', value: true }])

    queue.deferTerminalParent(parent)
    queue.completeScript(child)

    expect(queue.finalize()).toEqual([
      { type: 'setFlag', flag: 'child_done', value: true },
      { type: 'questStart', questId: 'QST_001' },
    ])
  })

  test('does not emit the same script completion twice', () => {
    const queue = new DialogueCompletionQueue()
    const dialogue = script('DIA_REPEAT', [{ type: 'setFlag', flag: 'repeat_done', value: true }])

    queue.completeScript(dialogue)
    queue.completeScript(dialogue)

    expect(queue.finalize()).toEqual([{ type: 'setFlag', flag: 'repeat_done', value: true }])
  })

  test('deduplicates mirrored parent and child completion actions', () => {
    const queue = new DialogueCompletionQueue()
    const action = { type: 'battle' as const, encounterId: 'BTL_101' }
    const parent = script('PARENT', [action])
    const child = script('CHILD', [action])

    queue.deferTerminalParent(parent)
    queue.completeScript(child)

    expect(queue.finalize()).toEqual([action])
  })
})

describe('getUniqueEventActions', () => {
  test('preserves first occurrence order', () => {
    expect(getUniqueEventActions([
      { type: 'addItem', itemId: 'heal_grass', quantity: 1 },
      { type: 'setFlag', flag: 'done', value: true },
      { type: 'addItem', itemId: 'heal_grass', quantity: 1 },
    ])).toEqual([
      { type: 'addItem', itemId: 'heal_grass', quantity: 1 },
      { type: 'setFlag', flag: 'done', value: true },
    ])
  })
})
