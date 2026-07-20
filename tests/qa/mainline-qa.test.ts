import { describe, expect, test } from 'bun:test'
import { GAME_CONFIG_DATABASE } from '../../src/data/configDatabase.ts'
import { MainlineQaRunner, STORY_QA_PROFILES, getBattleVisualQaConfig, getMainlineQaSummaryStyle, prepareBattleVisualQa, runMainlineQa } from '../../src/qa/MainlineQaRunner.ts'
import { BarrelSystem } from '../../src/core/BarrelSystem.ts'
import { GameData } from '../../src/core/GameData.ts'
import { getBlockedMapDialogueId } from '../../src/core/MapAccess.ts'
import { getFieldEventDoneFlag } from '../../src/core/MapEventState.ts'
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
  NORMAL_ENDING_QA_REQUIRED_COMPLETED_QUESTS,
  NORMAL_ENDING_QA_REQUIRED_FINAL_FLAGS,
  NORMAL_ENDING_QA_REQUIRED_FINAL_ITEMS,
  NORMAL_ENDING_QA_REQUIRED_PARTY,
  NORMAL_ENDING_QA_ROUTE,
  POST_NORMAL_RECOLLECTION,
  ROAMING_ENCOUNTER_RESPAWN,
  START_MAP_ID,
  START_PLAYER_POSITION,
  TRUE_ENDING_EPILOGUE,
} from '../../src/utils/constants.ts'
import type { StoryQaProfileId } from '../../src/qa/MainlineQaRunner.ts'

function runMainlineQaSilently(profileId: StoryQaProfileId = 'mainline'): ReturnType<typeof runMainlineQa> {
  const originalInfo = console.info
  const originalError = console.error
  console.info = () => {}
  console.error = () => {}
  try {
    return runMainlineQa(profileId)
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
    for (const encounterId of ['BTL_510', 'BTL_511', 'BTL_512', 'BTL_701', 'BTL_702', 'BTL_703', 'BTL_704', 'BTL_705']) {
      expect(report.coverage.encounterIds).toContain(encounterId)
    }
    expect(report.finalState.flags[`${ROAMING_ENCOUNTER_RESPAWN.DEFEATED_FLAG_PREFIX}EVT_TIGER`]).toBe(true)
    for (const characterId of MAINLINE_QA_REQUIRED_PARTY) {
      expect([...report.finalState.party, ...report.finalState.reserve]).toContain(characterId)
    }
    expect(GameData.getInstance().hasItem(BLUE_MINT_SIDE_QUEST.ITEM_ID)).toBe(false)
  })

  test('publishes a browser-readable report for visual QA automation', () => {
    const originalDocument = (globalThis as unknown as { document?: unknown }).document
    const globalReports = globalThis as unknown as Record<string, unknown>
    const originalGlobalReport = globalReports[MAINLINE_QA.REPORT_GLOBAL_KEY]
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
      expect(globalReports[MAINLINE_QA.REPORT_GLOBAL_KEY]).toBe(report)
      for (const questId of MAINLINE_QA_REQUIRED_COMPLETED_QUESTS) {
        expect(publishedReport.coverage.completedQuestSources[questId]?.length).toBeGreaterThan(0)
      }
    } finally {
      ;(globalThis as unknown as { document?: unknown }).document = originalDocument
      if (originalGlobalReport === undefined) {
        delete globalReports[MAINLINE_QA.REPORT_GLOBAL_KEY]
      } else {
        globalReports[MAINLINE_QA.REPORT_GLOBAL_KEY] = originalGlobalReport
      }
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

  test('runs the A side story only after the palace rescue', () => {
    const rescueIndex = MAINLINE_QA_ROUTE.findIndex(step => step.kind === 'event' && step.eventId === 'EVT_FAKE_XIAOAI')
    const sideStartIndex = MAINLINE_QA_ROUTE.findIndex(step => step.kind === 'event' && step.eventId === 'SIDE_A_START')
    const sideAfterIndex = MAINLINE_QA_ROUTE.findIndex(step => step.kind === 'event' && step.eventId === 'SIDE_A_AFTER')

    expect(rescueIndex).toBeGreaterThanOrEqual(0)
    expect(sideStartIndex).toBeGreaterThan(rescueIndex)
    expect(sideAfterIndex).toBeGreaterThan(sideStartIndex)
  })

  test('continues from Wuxiang into the town epilogue and postgame conversations', () => {
    const finalBattleIndex = MAINLINE_QA_ROUTE.findIndex(step => step.kind === 'event' && step.eventId === 'EVT_WUXIANG')
    const endingIndex = MAINLINE_QA_ROUTE.findIndex(step => step.kind === 'event' && step.eventId === TRUE_ENDING_EPILOGUE.EVENT_ID)
    const postgameIndexes = Object.values(TRUE_ENDING_EPILOGUE.POSTGAME).map(postgame =>
      MAINLINE_QA_ROUTE.findIndex(step => step.kind === 'event' && step.eventId === postgame.EVENT_ID),
    )

    expect(endingIndex).toBeGreaterThan(finalBattleIndex)
    expect(postgameIndexes.every(index => index > endingIndex)).toBe(true)
  })

  test('keeps browser QA summary away from mobile map titles and touch controls', () => {
    const desktopStyle = getMainlineQaSummaryStyle(false)
    const compactStyle = getMainlineQaSummaryStyle(true)

    expect(desktopStyle).toContain('right:max(12px')
    expect(desktopStyle).toContain('bottom:max(12px')
    expect(desktopStyle).not.toContain('left:max(12px')
    expect(desktopStyle).not.toContain('transform:translateX(-50%)')
    expect(compactStyle).toContain('right:max(12px')
    expect(compactStyle).toContain('top:max(126px')
    expect(compactStyle).not.toContain('left:50%')
    expect(compactStyle).not.toContain('transform:translateX(-50%)')
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

      expect(summaryElement?.attributes.get('style')).toContain('right:max(12px')
      expect(summaryElement?.attributes.get('style')).toContain('top:max(126px')
      expect(summaryElement?.attributes.get('style')).not.toContain('left:50%')
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

  test('does not mark a failed field event as completed', () => {
    const maps = GAME_CONFIG_DATABASE.getTable('maps')
    const originalMap = maps.MAP_001!
    const failedEventId = 'QA_FAILED_FIELD_EVENT'
    maps.MAP_001 = {
      ...originalMap,
      events: [
        ...originalMap.events,
        {
          id: failedEventId,
          x: START_PLAYER_POSITION.x,
          y: START_PLAYER_POSITION.y,
          width: 1,
          height: 1,
          type: 'trigger',
          trigger: 'action',
          actions: [{ type: 'removeItem', itemId: BLUE_MINT_SIDE_QUEST.ITEM_ID, quantity: 1 }],
        },
      ],
    }

    try {
      const report = new MainlineQaRunner([
        { kind: 'event', mapId: START_MAP_ID, eventId: failedEventId },
      ]).run()

      expect(report.status).toBe(MAINLINE_QA.STATUS_FAILED)
      expect(report.errors).toContain(`event:${START_MAP_ID}:${failedEventId}: State action removeItem failed: Missing item ${BLUE_MINT_SIDE_QUEST.ITEM_ID}`)
      expect(report.finalState.flags[getFieldEventDoneFlag(failedEventId)]).toBeUndefined()
    } finally {
      maps.MAP_001 = originalMap
    }
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

  test('completes the normal ending route and post-normal recollection', () => {
    const report = runMainlineQaSilently('normal')

    expect(report.status).toBe(MAINLINE_QA.STATUS_PASSED)
    expect(report.errors).toEqual([])
    expect(report.finalState.currentMap).toBe(MAINLINE_QA_REQUIRED_FINAL_MAP)
    expect(report.finalState.flags.normal_ending_seen).toBe(true)
    expect(report.finalState.flags[POST_NORMAL_RECOLLECTION.COMPLETED_FLAG]).toBe(true)
    expect(report.finalState.flags.true_route_unlocked).toBe(true)
    expect(report.finalState.flags.game_cleared).not.toBe(true)
    expect(report.coverage.mapEvents).toContain(`${MAINLINE_QA_REQUIRED_FINAL_MAP}:${POST_NORMAL_RECOLLECTION.EVENT_ID}`)
    expect(report.coverage.mapEvents).not.toContain(`MAP_070:EVT_WUXIANG`)
    expect(report.coverage.encounterIds).toContain('BTL_XIAOAI_SHADOW')
    for (const flag of NORMAL_ENDING_QA_REQUIRED_FINAL_FLAGS) {
      expect(report.finalState.flags[flag] ?? report.finalState.branches[flag]).toBe(true)
    }
    for (const itemId of NORMAL_ENDING_QA_REQUIRED_FINAL_ITEMS) {
      expect(report.finalState.items[itemId] ?? report.finalState.equipment[itemId]).toBeGreaterThan(0)
    }
    for (const questId of NORMAL_ENDING_QA_REQUIRED_COMPLETED_QUESTS) {
      expect(report.finalState.completedQuests).toContain(questId)
      expect(report.coverage.completedQuestSources[questId]?.length).toBeGreaterThan(0)
    }
    for (const characterId of NORMAL_ENDING_QA_REQUIRED_PARTY) {
      expect([...report.finalState.party, ...report.finalState.reserve]).toContain(characterId)
    }
    expect(report.finalState.party).not.toContain('xiaoai')
    expect(report.finalState.reserve).not.toContain('xiaoai')
    for (const step of NORMAL_ENDING_QA_ROUTE) {
      if (step.kind === 'event') {
        expect(report.coverage.mapEvents).toContain(`${step.mapId}:${step.eventId}`)
      }
    }
    expect(STORY_QA_PROFILES.normal.choiceIndexes.DIA_530_CHOICE).toEqual([0])
  })

  test('prepares heart-shadow battle visual QA', () => {
    const config = getBattleVisualQaConfig(MAINLINE_QA.BATTLE_HEART_QUERY_VALUE)
    expect(config).toEqual({
      encounterId: MAINLINE_QA.BATTLE_HEART_ENCOUNTER_ID,
      mapId: MAINLINE_QA.BATTLE_HEART_VISUAL_MAP_ID,
      flags: MAINLINE_QA.BATTLE_HEART_VISUAL_FLAGS,
      branches: MAINLINE_QA.BATTLE_FINAL_VISUAL_BRANCHES,
    })
    prepareBattleVisualQa(config!)
    expect(GameData.getInstance().currentMap).toBe(MAINLINE_QA.BATTLE_HEART_VISUAL_MAP_ID)
  })
})
