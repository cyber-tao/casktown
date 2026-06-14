import { describe, expect, test } from 'bun:test'
import { runMainlineQa } from '../../src/qa/MainlineQaRunner.ts'
import {
  MAINLINE_QA,
  MAINLINE_QA_REQUIRED_BRANCH_THRESHOLDS,
  MAINLINE_QA_REQUIRED_COMPLETED_QUESTS,
  MAINLINE_QA_REQUIRED_FINAL_FLAGS,
  MAINLINE_QA_REQUIRED_FINAL_MAP,
  MAINLINE_QA_REQUIRED_FINAL_REBUILD_LEVEL,
  MAINLINE_QA_REQUIRED_NO_ACTIVE_QUESTS,
  MAINLINE_QA_REQUIRED_PARTY,
} from '../../src/utils/constants.ts'

describe('MainlineQaRunner', () => {
  test('completes the configured main story route', () => {
    const originalInfo = console.info
    const originalError = console.error
    console.info = () => {}
    console.error = () => {}
    const runSilently = (): ReturnType<typeof runMainlineQa> => {
      try {
        return runMainlineQa()
      } finally {
        console.info = originalInfo
        console.error = originalError
      }
    }
    const report = runSilently()

    expect(report.status).toBe(MAINLINE_QA.STATUS_PASSED)
    expect(report.errors).toEqual([])
    expect(report.warnings).toEqual([])
    expect(report.finalState.currentMap).toBe(MAINLINE_QA_REQUIRED_FINAL_MAP)
    expect(report.finalState.rebuildLevel).toBeGreaterThanOrEqual(MAINLINE_QA_REQUIRED_FINAL_REBUILD_LEVEL)
    if (MAINLINE_QA_REQUIRED_NO_ACTIVE_QUESTS) {
      expect(report.finalState.activeQuests).toEqual([])
    }
    for (const { branch, min } of MAINLINE_QA_REQUIRED_BRANCH_THRESHOLDS) {
      expect(report.finalState.branches[branch]).toBeGreaterThanOrEqual(min)
    }
    for (const flag of MAINLINE_QA_REQUIRED_FINAL_FLAGS) {
      expect(report.finalState.flags[flag]).toBe(true)
    }
    for (const questId of MAINLINE_QA_REQUIRED_COMPLETED_QUESTS) {
      expect(report.finalState.completedQuests).toContain(questId)
    }
    for (const characterId of MAINLINE_QA_REQUIRED_PARTY) {
      expect([...report.finalState.party, ...report.finalState.reserve]).toContain(characterId)
    }
  })
})
