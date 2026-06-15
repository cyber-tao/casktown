import { describe, expect, test } from 'bun:test'
import { MainlineQaRunner, prepareBattleVisualQa, runMainlineQa } from '../../src/qa/MainlineQaRunner.ts'
import { GameData } from '../../src/core/GameData.ts'
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

function runMainlineQaSilently(): ReturnType<typeof runMainlineQa> {
  const originalInfo = console.info
  const originalError = console.error
  console.info = () => {}
  console.error = () => {}
  try {
    return runMainlineQa()
  } finally {
    console.info = originalInfo
    console.error = originalError
  }
}

describe('MainlineQaRunner', () => {
  test('completes the configured main story route', () => {
    const report = runMainlineQaSilently()

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
      expect(report.coverage.completedQuestSources[questId]?.length).toBeGreaterThan(0)
    }
    for (const characterId of MAINLINE_QA_REQUIRED_PARTY) {
      expect([...report.finalState.party, ...report.finalState.reserve]).toContain(characterId)
    }
  })

  test('publishes a browser-readable report for visual QA automation', () => {
    const originalDocument = (globalThis as unknown as { document?: unknown }).document
    const elements = new Map<string, { id: string; textContent: string; type?: string; setAttribute: (key: string, value: string) => void }>()
    const attributes = new Map<string, string>()
    const documentStub = {
      documentElement: {
        setAttribute: (key: string, value: string) => attributes.set(key, value),
      },
      body: {
        appendChild: (element: { id: string; textContent: string; type?: string; setAttribute: (key: string, value: string) => void }) => {
          elements.set(element.id, element)
          return element
        },
      },
      getElementById: (id: string) => elements.get(id) ?? null,
      createElement: () => ({
        id: '',
        textContent: '',
        setAttribute(key: string, value: string) {
          if (key === 'type') this.type = value
        },
      }),
    }
    ;(globalThis as unknown as { document?: unknown }).document = documentStub

    try {
      const report = runMainlineQaSilently()
      const reportElement = elements.get(MAINLINE_QA.REPORT_ELEMENT_ID)

      expect(attributes.get(MAINLINE_QA.REPORT_STATUS_ATTRIBUTE)).toBe(MAINLINE_QA.STATUS_PASSED)
      expect(reportElement?.type).toBe('application/json')
      const publishedReport = JSON.parse(reportElement?.textContent ?? '{}')
      expect(publishedReport.status).toBe(report.status)
      for (const questId of MAINLINE_QA_REQUIRED_COMPLETED_QUESTS) {
        expect(publishedReport.coverage.completedQuestSources[questId]?.length).toBeGreaterThan(0)
      }
    } finally {
      ;(globalThis as unknown as { document?: unknown }).document = originalDocument
    }
  })

  test('fails when a route step targets a locked map', () => {
    const report = new MainlineQaRunner([
      { kind: 'event', mapId: 'MAP_010', eventId: 'FOREST_TUTORIAL' },
    ]).run()

    expect(report.status).toBe(MAINLINE_QA.STATUS_FAILED)
    expect(report.errors).toContain('event:MAP_010:FOREST_TUTORIAL: Map MAP_010 is blocked by DIA_LOCKED_FOREST')
  })

  test('prepares the configured active party for battle visual QA', () => {
    prepareBattleVisualQa()

    const gd = GameData.getInstance()
    expect(gd.party).toEqual([...MAINLINE_QA.BATTLE_VISUAL_PARTY])
    for (const characterId of MAINLINE_QA.BATTLE_VISUAL_PARTY.filter(characterId => characterId !== 'T')) {
      expect(gd.getFlag(`${characterId.toLowerCase()}_joined`)).toBe(true)
    }
    expect(gd.party).not.toContain('A')
    expect(gd.reserve).not.toContain('A')
  })
})
