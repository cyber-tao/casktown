import { beforeEach, describe, expect, test } from 'bun:test'
import { GameData } from '../../src/core/GameData.ts'
import { LEGACY_SAVE_PROGRESS, REINCARNATION_TIMER_ID } from '../../src/utils/constants.ts'

describe('GameData active timers', () => {
  beforeEach(() => {
    GameData.getInstance().reset()
  })

  test('startActiveTimer initializes elapsed time at zero', () => {
    const gd = GameData.getInstance()
    expect(gd.getActiveTimerElapsedMs(REINCARNATION_TIMER_ID)).toBeUndefined()

    gd.startActiveTimer(REINCARNATION_TIMER_ID)
    expect(gd.getActiveTimerElapsedMs(REINCARNATION_TIMER_ID)).toBe(0)
  })

  test('accumulateActiveTimer adds only while the timer is running', () => {
    const gd = GameData.getInstance()
    gd.accumulateActiveTimer(REINCARNATION_TIMER_ID, 10_000)
    expect(gd.getActiveTimerElapsedMs(REINCARNATION_TIMER_ID)).toBeUndefined()

    gd.startActiveTimer(REINCARNATION_TIMER_ID)
    gd.accumulateActiveTimer(REINCARNATION_TIMER_ID, 10_000)
    gd.accumulateActiveTimer(REINCARNATION_TIMER_ID, 20_000)
    expect(gd.getActiveTimerElapsedMs(REINCARNATION_TIMER_ID)).toBe(30_000)

    // 非法增量被忽略
    gd.accumulateActiveTimer(REINCARNATION_TIMER_ID, -1)
    gd.accumulateActiveTimer(REINCARNATION_TIMER_ID, Number.NaN)
    expect(gd.getActiveTimerElapsedMs(REINCARNATION_TIMER_ID)).toBe(30_000)
  })

  test('serialize and deserialize preserve accumulated active time', () => {
    const gd = GameData.getInstance()
    gd.startActiveTimer(REINCARNATION_TIMER_ID)
    gd.accumulateActiveTimer(REINCARNATION_TIMER_ID, 42_000)

    const snapshot = gd.serialize() as { activeTimers?: Record<string, number> }
    expect(snapshot.activeTimers?.[REINCARNATION_TIMER_ID]).toBe(42_000)

    gd.deserialize(snapshot as unknown as object)
    expect(gd.getActiveTimerElapsedMs(REINCARNATION_TIMER_ID)).toBe(42_000)
  })

  test('deserialize without activeTimers falls back to empty state', () => {
    const gd = GameData.getInstance()
    gd.deserialize({} as object)
    expect(gd.getActiveTimerElapsedMs(REINCARNATION_TIMER_ID)).toBeUndefined()
  })

  test('reset clears all active timers', () => {
    const gd = GameData.getInstance()
    gd.startActiveTimer(REINCARNATION_TIMER_ID)
    gd.accumulateActiveTimer(REINCARNATION_TIMER_ID, 5_000)

    gd.reset()
    expect(gd.getActiveTimerElapsedMs(REINCARNATION_TIMER_ID)).toBeUndefined()
  })

  test('legacy wall-clock timer flag is dropped when no active timer exists', () => {
    const gd = GameData.getInstance()
    const legacyFlag = LEGACY_SAVE_PROGRESS.REINCARNATION_TIMER_STARTED_FLAG
    const snapshot = gd.serialize() as Record<string, unknown>
    const flags = { ...(snapshot.flags as Record<string, unknown>), [legacyFlag]: 1_700_000_000_000 }
    gd.deserialize({ ...snapshot, flags } as object)

    expect(gd.getFlag(legacyFlag)).toBeUndefined()
    expect(gd.getActiveTimerElapsedMs(REINCARNATION_TIMER_ID)).toBeUndefined()
  })

  test('legacy wall-clock timer flag is kept when an active timer already exists', () => {
    const gd = GameData.getInstance()
    const legacyFlag = LEGACY_SAVE_PROGRESS.REINCARNATION_TIMER_STARTED_FLAG
    const snapshot = gd.serialize() as Record<string, unknown>
    const flags = { ...(snapshot.flags as Record<string, unknown>), [legacyFlag]: 1_700_000_000_000 }
    gd.deserialize({
      ...snapshot,
      flags,
      activeTimers: { [REINCARNATION_TIMER_ID]: 12_000 },
    } as object)

    expect(gd.getFlag(legacyFlag)).toBe(1_700_000_000_000)
    expect(gd.getActiveTimerElapsedMs(REINCARNATION_TIMER_ID)).toBe(12_000)
  })

  test('accumulateActiveTimers advances all currently registered active timers', () => {
    const gd = GameData.getInstance()
    gd.startActiveTimer('timer_a')
    gd.startActiveTimer('timer_b')

    gd.accumulateActiveTimers(5_000)
    expect(gd.getActiveTimerElapsedMs('timer_a')).toBe(5_000)
    expect(gd.getActiveTimerElapsedMs('timer_b')).toBe(5_000)
    expect(gd.getActiveTimerElapsedMs('unregistered')).toBeUndefined()

    // 非法增量被安全忽略
    gd.accumulateActiveTimers(-100)
    gd.accumulateActiveTimers(Number.NaN)
    expect(gd.getActiveTimerElapsedMs('timer_a')).toBe(5_000)
    expect(gd.getActiveTimerElapsedMs('timer_b')).toBe(5_000)
  })
})
