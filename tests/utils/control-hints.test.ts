import { describe, expect, test } from 'bun:test'
import { getFacilityControlHints } from '../../src/utils/controlHints.ts'

describe('facility control hints', () => {
  test('uses the active binding labels and keeps back separate', () => {
    const labels = { up: 'W', down: 'S', confirm: 'E', cancel: 'Backspace' }
    const hints = getFacilityControlHints(action => labels[action], '购买')

    expect(hints).toEqual({
      action: 'W/S 选择 | E 购买',
      back: 'Backspace 返回',
    })
  })
})
