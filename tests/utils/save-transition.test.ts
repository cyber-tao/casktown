import { describe, expect, test } from 'bun:test'
import { completeLoadedSaveTransition } from '../../src/utils/saveTransition.ts'

describe('loaded save transition', () => {
  test('emits and stops synchronously exactly once', () => {
    const state = { active: false }
    const calls: string[] = []

    expect(completeLoadedSaveTransition(
      state,
      () => calls.push('loaded'),
      () => calls.push('stopped'),
    )).toBe(true)
    expect(completeLoadedSaveTransition(
      state,
      () => calls.push('loaded-again'),
      () => calls.push('stopped-again'),
    )).toBe(false)

    expect(state.active).toBe(true)
    expect(calls).toEqual(['loaded', 'stopped'])
  })

  test('still stops the menu if a load listener throws', () => {
    const state = { active: false }
    let stopped = false

    expect(() => completeLoadedSaveTransition(
      state,
      () => { throw new Error('listener failed') },
      () => { stopped = true },
    )).toThrow('listener failed')

    expect(state.active).toBe(true)
    expect(stopped).toBe(true)
  })
})
