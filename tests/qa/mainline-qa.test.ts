import { describe, expect, test } from 'bun:test'
import { GAME_CONFIG_DATABASE } from '../../src/data/configDatabase.ts'
import { MainlineQaRunner, getMainlineQaSummaryStyle, prepareBattleVisualQa, runMainlineQa } from '../../src/qa/MainlineQaRunner.ts'
import { BarrelSystem } from '../../src/core/BarrelSystem.ts'
import { GameData } from '../../src/core/GameData.ts'
import { RebuildSystem } from '../../src/core/RebuildSystem.ts'
import {
  MAINLINE_QA,
  MAINLINE_QA_REQUIRED_BRANCH_THRESHOLDS,
  MAINLINE_QA_REQUIRED_COMPLETED_QUESTS,
  MAINLINE_QA_REQUIRED_FINAL_FLAGS,
  MAINLINE_QA_REQUIRED_FINAL_MAP,
  MAINLINE_QA_REQUIRED_FINAL_REBUILD_LEVEL,
  MAINLINE_QA_REQUIRED_NO_ACTIVE_QUESTS,
  MAINLINE_QA_REQUIRED_PARTY,
  MAINLINE_QA_ROUTE,
  START_MAP_ID,
  START_PLAYER_POSITION,
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
    for (const facility of RebuildSystem.getInstance().getAllFacilities()) {
      expect(report.finalState.flags[facility.flag]).toBe(true)
    }
    for (const questId of MAINLINE_QA_REQUIRED_COMPLETED_QUESTS) {
      expect(report.finalState.completedQuests).toContain(questId)
      expect(report.coverage.completedQuestSources[questId]?.length).toBeGreaterThan(0)
    }
    for (const step of MAINLINE_QA_ROUTE) {
      if (step.kind === 'event') {
        expect(report.coverage.mapEvents).toContain(`${step.mapId}:${step.eventId}`)
      } else {
        expect(report.coverage.dialogueIds).toContain(step.dialogueId)
      }
    }
    expect(report.coverage.mapIds).toContain(MAINLINE_QA_REQUIRED_FINAL_MAP)
    expect(report.coverage.encounterIds).toContain(MAINLINE_QA.BATTLE_FINAL_ENCOUNTER_ID)
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
      const summaryElement = elements.get(MAINLINE_QA.REPORT_SUMMARY_ELEMENT_ID)

      expect(attributes.get(MAINLINE_QA.REPORT_STATUS_ATTRIBUTE)).toBe(MAINLINE_QA.STATUS_PASSED)
      expect(reportElement?.type).toBe('application/json')
      expect(summaryElement?.textContent).toContain('Mainline QA PASSED')
      expect(summaryElement?.textContent).toContain(`Steps ${report.steps.length}`)
      const publishedReport = JSON.parse(reportElement?.textContent ?? '{}')
      expect(publishedReport.status).toBe(report.status)
      expect(publishedReport.coverage.mapIds).toContain(MAINLINE_QA_REQUIRED_FINAL_MAP)
      expect(publishedReport.coverage.encounterIds).toContain(MAINLINE_QA.BATTLE_FINAL_ENCOUNTER_ID)
      for (const questId of MAINLINE_QA_REQUIRED_COMPLETED_QUESTS) {
        expect(publishedReport.coverage.completedQuestSources[questId]?.length).toBeGreaterThan(0)
      }
    } finally {
      ;(globalThis as unknown as { document?: unknown }).document = originalDocument
    }
  })

  test('starts from the actual new-game autorun event', () => {
    expect(MAINLINE_QA_ROUTE[0]).toEqual({ kind: 'event', mapId: START_MAP_ID, eventId: 'EVT_START' })
    const startEvent = GAME_CONFIG_DATABASE.getTable('maps')[START_MAP_ID]?.events.find(event => event.id === 'EVT_START')

    expect(startEvent).toMatchObject({
      x: START_PLAYER_POSITION.x,
      y: START_PLAYER_POSITION.y,
      width: 1,
      height: 1,
      trigger: 'autorun',
    })
  })

  test('keeps browser QA summary away from mobile touch controls', () => {
    const desktopStyle = getMainlineQaSummaryStyle(false)
    const compactStyle = getMainlineQaSummaryStyle(true)

    expect(desktopStyle).toContain('bottom:max(12px')
    expect(desktopStyle).not.toContain('transform:translateX(-50%)')
    expect(compactStyle).toContain('top:max(54px')
    expect(compactStyle).toContain('left:50%')
    expect(compactStyle).not.toContain('bottom:max(12px')
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
    expect(BarrelSystem.getInstance().getUnlockedColors()).toHaveLength(8)
    expect(gd.party).not.toContain('A')
    expect(gd.reserve).not.toContain('A')
  })
})
