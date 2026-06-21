import { describe, expect, test } from 'bun:test'
import { GAME_CONFIG_DATABASE } from '../../src/data/configDatabase.ts'
import { MainlineQaRunner, getBattleVisualQaConfig, getMainlineQaSummaryStyle, prepareBattleVisualQa, runMainlineQa } from '../../src/qa/MainlineQaRunner.ts'
import { BarrelSystem } from '../../src/core/BarrelSystem.ts'
import { GameData } from '../../src/core/GameData.ts'
import { getBlockedMapDialogueId } from '../../src/core/MapAccess.ts'
import { RebuildSystem } from '../../src/core/RebuildSystem.ts'
import {
  BLUE_MINT_SIDE_QUEST,
  MAINLINE_QA,
  MAINLINE_QA_REQUIRED_BRANCH_THRESHOLDS,
  MAINLINE_QA_REQUIRED_COMPLETED_QUESTS,
  MAINLINE_QA_REQUIRED_FINAL_FLAGS,
  MAINLINE_QA_REQUIRED_FINAL_ITEMS,
  MAINLINE_QA_REQUIRED_FINAL_MAP,
  MAINLINE_QA_REQUIRED_FINAL_REBUILD_LEVEL,
  MAINLINE_QA_REQUIRED_FINAL_SKILLS,
  MAINLINE_QA_REQUIRED_NO_ACTIVE_QUESTS,
  MAINLINE_QA_REQUIRED_PARTY,
  MAINLINE_QA_ROUTE,
  ROAMING_ENCOUNTER_RESPAWN,
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
    for (const { characterId, skillId } of MAINLINE_QA_REQUIRED_FINAL_SKILLS) {
      expect(report.finalState.skills[characterId]).toContain(skillId)
    }
    for (const itemId of MAINLINE_QA_REQUIRED_FINAL_ITEMS) {
      expect(report.finalState.items[itemId] ?? report.finalState.equipment[itemId]).toBeGreaterThan(0)
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
    expect(report.finalState.flags[`${ROAMING_ENCOUNTER_RESPAWN.DEFEATED_FLAG_PREFIX}EVT_TIGER`]).toBe(true)
    for (const characterId of MAINLINE_QA_REQUIRED_PARTY) {
      expect([...report.finalState.party, ...report.finalState.reserve]).toContain(characterId)
    }
    expect(GameData.getInstance().hasItem(BLUE_MINT_SIDE_QUEST.ITEM_ID)).toBe(false)
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

    expect(desktopStyle).toContain('right:max(12px')
    expect(desktopStyle).toContain('bottom:max(12px')
    expect(desktopStyle).not.toContain('left:max(12px')
    expect(desktopStyle).not.toContain('transform:translateX(-50%)')
    expect(compactStyle).toContain('top:max(8px')
    expect(compactStyle).toContain('left:50%')
    expect(compactStyle).not.toContain('bottom:max(12px')
  })

  test('repositions browser QA summary after compact viewport resize', () => {
    const originalDocument = (globalThis as unknown as { document?: unknown }).document
    const originalWindow = (globalThis as unknown as { window?: unknown }).window
    type TestElement = {
      id: string
      textContent: string
      type?: string
      attributes: Map<string, string>
      setAttribute: (key: string, value: string) => void
    }
    const elements = new Map<string, TestElement>()
    const attributes = new Map<string, string>()
    const listeners = new Map<string, Array<() => void>>()
    const createElement = (): TestElement => ({
      id: '',
      textContent: '',
      attributes: new Map<string, string>(),
      setAttribute(key: string, value: string) {
        this.attributes.set(key, value)
        if (key === 'type') this.type = value
      },
    })
    const documentStub = {
      documentElement: {
        setAttribute: (key: string, value: string) => attributes.set(key, value),
      },
      body: {
        appendChild: (element: TestElement) => {
          elements.set(element.id, element)
          return element
        },
      },
      getElementById: (id: string) => elements.get(id) ?? null,
      createElement,
    }
    const viewport = { width: 1280, height: 720 }
    const windowStub = {
      get innerWidth() {
        return viewport.width
      },
      get innerHeight() {
        return viewport.height
      },
      matchMedia: () => ({ matches: false }),
      addEventListener: (type: string, listener: () => void) => {
        const handlers = listeners.get(type) ?? []
        handlers.push(listener)
        listeners.set(type, handlers)
      },
      removeEventListener: (type: string, listener: () => void) => {
        listeners.set(type, (listeners.get(type) ?? []).filter(handler => handler !== listener))
      },
      dispatchEvent: () => true,
    }

    ;(globalThis as unknown as { document?: unknown }).document = documentStub
    ;(globalThis as unknown as { window?: unknown }).window = windowStub

    try {
      runMainlineQaSilently()
      const summaryElement = elements.get(MAINLINE_QA.REPORT_SUMMARY_ELEMENT_ID)

      expect(summaryElement?.attributes.get('style')).toContain('right:max(12px')
      expect(summaryElement?.attributes.get('style')).toContain('bottom:max(12px')
      viewport.width = 844
      viewport.height = 390
      for (const listener of listeners.get('resize') ?? []) listener()

      expect(summaryElement?.attributes.get('style')).toContain('top:max(8px')
      expect(summaryElement?.attributes.get('style')).toContain('left:50%')
      expect(summaryElement?.attributes.get('style')).not.toContain('bottom:max(12px')
    } finally {
      ;(globalThis as unknown as { document?: unknown }).document = originalDocument
      ;(globalThis as unknown as { window?: unknown }).window = originalWindow
    }
  })

  test('fails when a route step targets a locked map', () => {
    const report = new MainlineQaRunner([
      { kind: 'event', mapId: 'MAP_010', eventId: 'FOREST_TUTORIAL' },
    ]).run()

    expect(report.status).toBe(MAINLINE_QA.STATUS_FAILED)
    expect(report.errors).toContain('event:MAP_010:FOREST_TUTORIAL: Map MAP_010 is blocked by DIA_LOCKED_FOREST')
  })

  test('fails when a route step cannot consume a required turn-in item', () => {
    const report = new MainlineQaRunner([
      { kind: 'dialogue', dialogueId: BLUE_MINT_SIDE_QUEST.DIALOGUES.TURN_IN },
    ]).run()

    expect(report.status).toBe(MAINLINE_QA.STATUS_FAILED)
    expect(report.errors).toContain(`dialogue:${BLUE_MINT_SIDE_QUEST.DIALOGUES.TURN_IN}:onComplete: State action removeItem failed: Missing item ${BLUE_MINT_SIDE_QUEST.ITEM_ID}`)
    expect(report.finalState.flags[BLUE_MINT_SIDE_QUEST.FLAGS.DELIVERED]).toBeUndefined()
    expect(report.finalState.completedQuests).not.toContain(BLUE_MINT_SIDE_QUEST.QUEST_ID)
  })

  test('validates every field in encounter rewards', () => {
    const encounters = GAME_CONFIG_DATABASE.getTable('encounters')
    const originalEncounter = encounters.BTL_001!
    encounters.BTL_001 = {
      ...originalEncounter,
      rewards: [
        { itemId: 'missing_item', itemQty: 0, branch: 'missing_branch' as never, branchValue: true },
        { flag: 'rebuild_level', value: true },
        { branch: 'mercy_score', branchValue: true },
      ],
    }

    try {
      const report = new MainlineQaRunner([]).run()
      expect(report.errors).toContain('config:BTL_001:rewards: Item missing_item not found')
      expect(report.errors).toContain('config:BTL_001:rewards: Item quantity 0 must be positive')
      expect(report.errors).toContain('config:BTL_001:rewards:branch:missing_branch: Branch missing_branch not found')
      expect(report.errors).toContain('config:BTL_001:rewards:flag:rebuild_level: Branch rebuild_level value must be number, got boolean')
      expect(report.errors).toContain('config:BTL_001:rewards:branch:mercy_score: Branch mercy_score value must be number, got boolean')
    } finally {
      encounters.BTL_001 = originalEncounter
    }
  })

  test('validates every field in quest rewards', () => {
    const quests = GAME_CONFIG_DATABASE.getTable('quests')
    const originalQuest = quests.QST_001!
    quests.QST_001 = {
      ...originalQuest,
      rewards: [{ exp: -1, itemId: 'missing_item', itemQty: 0, rebuild: -1, flag: 'rebuild_level', value: true }],
    }

    try {
      const report = new MainlineQaRunner([]).run()
      expect(report.errors).toContain('config:QST_001:rewards: Item missing_item not found')
      expect(report.errors).toContain('config:QST_001:rewards: Exp reward -1 must be a finite non-negative number')
      expect(report.errors).toContain('config:QST_001:rewards: Item quantity 0 must be positive')
      expect(report.errors).toContain('config:QST_001:rewards: Rebuild reward -1 must be a finite non-negative number')
      expect(report.errors).toContain('config:QST_001:rewards:flag:rebuild_level: Branch rebuild_level value must be number, got boolean')
    } finally {
      quests.QST_001 = originalQuest
    }
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

  test('prepares final battle visual QA against the true ending encounter', () => {
    const config = getBattleVisualQaConfig(MAINLINE_QA.BATTLE_FINAL_QUERY_VALUE)
    expect(config).toEqual({
      encounterId: MAINLINE_QA.BATTLE_FINAL_ENCOUNTER_ID,
      mapId: MAINLINE_QA.BATTLE_FINAL_VISUAL_MAP_ID,
      flags: MAINLINE_QA.BATTLE_FINAL_VISUAL_FLAGS,
      branches: MAINLINE_QA.BATTLE_FINAL_VISUAL_BRANCHES,
    })

    prepareBattleVisualQa(config!)

    const gd = GameData.getInstance()
    expect(gd.currentMap).toBe(MAINLINE_QA.BATTLE_FINAL_VISUAL_MAP_ID)
    expect(gd.getFlag('released_four_seals')).toBe(true)
    expect(gd.getFlag('xiaoai_purified')).toBe(true)
    expect(gd.getFlag('true_route_unlocked')).toBe(true)
    expect(gd.branches.mercy_score).toBeGreaterThanOrEqual(MAINLINE_QA.BATTLE_FINAL_VISUAL_BRANCHES.mercy_score)
    expect(gd.branches.xiaoai_memory_fragments).toBeGreaterThanOrEqual(MAINLINE_QA.BATTLE_FINAL_VISUAL_BRANCHES.xiaoai_memory_fragments)
    expect(gd.branches.white_tiger_respected).toBe(true)
    expect(gd.branches.answered_xiyuan_kindly).toBe(true)
    expect(getBlockedMapDialogueId(MAINLINE_QA.BATTLE_FINAL_VISUAL_MAP_ID, flag => gd.getFlag(flag))).toBeNull()
    expect(gd.getFlag('a_joined')).toBe(true)
    expect([...gd.party, ...gd.reserve]).toContain('A')
    expect(BarrelSystem.getInstance().getUnlockedColors()).toHaveLength(8)
  })
})
