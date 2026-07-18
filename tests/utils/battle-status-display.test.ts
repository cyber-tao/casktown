import { describe, expect, test } from 'bun:test'
import { formatBattleStatusDisplay, parseBattleStatus } from '../../src/utils/battleStatusDisplay.ts'
import { BATTLE_LAYOUT, BATTLE_RULES, BATTLE_STATUS } from '../../src/utils/constants.ts'

const timed = (status: string, duration: number): string =>
  `${status}${BATTLE_RULES.STATUS_DURATION_SEPARATOR}${duration}`

describe('battle status display', () => {
  test('parses timed status ids without splitting untimed ids that contain underscores', () => {
    expect(parseBattleStatus(timed(BATTLE_STATUS.ATTACK_UP, 3))).toEqual({
      id: BATTLE_STATUS.ATTACK_UP,
      duration: 3,
    })
    expect(parseBattleStatus(BATTLE_STATUS.ATTACK_UP)).toEqual({
      id: BATTLE_STATUS.ATTACK_UP,
      duration: null,
    })
  })

  test('hides internal markers while exposing the break countdown on its player-facing label', () => {
    expect(formatBattleStatusDisplay([
      timed(BATTLE_STATUS.ATTACK_UP, 3),
      BATTLE_STATUS.COMBO_ACTED,
      BATTLE_STATUS.REBIRTH_USED,
      BATTLE_STATUS.BREAK,
      timed(BATTLE_STATUS.BREAK_TURNS, 2),
    ])).toBe('破势·2回 攻击↑·3回')
  })

  test('prioritizes harmful statuses, summarizes overflow, and resolves authored skill labels', () => {
    expect(formatBattleStatusDisplay([
      timed(BATTLE_STATUS.ATTACK_UP, 3),
      timed(BATTLE_STATUS.DEFENSE_UP, 3),
      timed(BATTLE_STATUS.POISON, 2),
      timed(BATTLE_STATUS.SHIELD, 2),
    ], { maxVisible: 2 })).toBe('中毒·2回 攻击↑·3回 +2')

    expect(formatBattleStatusDisplay([timed('authored_aura', 2)], {
      resolveLabel: statusId => statusId === 'authored_aura' ? '剑意' : undefined,
    })).toBe('剑意·2回')
    expect(formatBattleStatusDisplay(['unknown_internal_marker'])).toBe('')
  })

  test('keeps the compact status row above player and enemy sprites', () => {
    const statusBottomForBars = (barCount: number): number =>
      -BATTLE_LAYOUT.UNIT_UI_SPRITE_GAP_Y
      + barCount * (BATTLE_LAYOUT.UNIT_BAR_HEIGHT + BATTLE_LAYOUT.UNIT_BAR_GAP_Y)
      + BATTLE_LAYOUT.UNIT_STATUS_OFFSET_Y
      + BATTLE_LAYOUT.UNIT_STATUS_FONT_SIZE

    expect(statusBottomForBars(3)).toBeLessThan(0)
    expect(statusBottomForBars(2)).toBeLessThan(0)
  })
})
