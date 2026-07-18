import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { GameData } from '../../src/core/GameData.ts'
import { getBattleResultFallbackScene } from '../../src/utils/battleResult.ts'
import { BATTLE_STATUS, STORY_BATTLE_FLAGS } from '../../src/utils/constants.ts'

let BattleSceneClass: typeof import('../../src/scenes/BattleScene.ts').BattleScene
let originalWindow: unknown
let originalDocument: unknown
let originalImage: unknown
let originalCanvas: unknown

type RecordedSkillAction = { type: 'skill'; skillId: string }

type ImmediateSkillHarness = {
  inSkillMenu: boolean
  skillMenuIndex: number
  actionStack: string[]
  lastPlayerAction: RecordedSkillAction | null
  getCurrentUnit: () => unknown
  getUsableSkillIds: () => string[]
  closeSkillMenu: () => void
  getLiveOpponents: () => unknown[]
  performSkill: () => boolean
  nextTurn: () => void
  log: () => void
}

type SelectSkill = (this: ImmediateSkillHarness) => void

type TargetedSkillHarness = {
  actionStack: string[]
  targetIndex: number
  inTargetSelect: boolean
  lastPlayerAction: RecordedSkillAction | null
  getCurrentUnit: () => unknown
  getSelectableTargets: () => unknown[]
  getLiveOpponents: () => unknown[]
  performSkill: () => boolean
  setCommandMenuVisible: () => void
  hideTargetIndicator: () => void
  nextTurn: () => void
  log: () => void
}

type ExecuteAction = (this: TargetedSkillHarness) => void

type StoryBattleBonusHarness = {
  units: Array<{ id: string; name: string; isPlayer: boolean; status: string[] }>
  addStatus: (unit: { status: string[] }, status: string) => boolean
  log: (message: string) => void
}

type ApplyStoryBattleBonuses = (this: StoryBattleBonusHarness) => void

beforeAll(async () => {
  const runtime = globalThis as unknown as Record<string, unknown>
  originalWindow = runtime.window
  originalDocument = runtime.document
  originalImage = runtime.Image
  originalCanvas = runtime.HTMLCanvasElement

  ;(globalThis as unknown as { window: unknown }).window = globalThis
  class FakeCanvas {
    style = {}
    parentNode: { removeChild: () => void } | null = null
    getContext(): object {
      return {
        fillRect: () => {},
        drawImage: () => {},
        getImageData: () => ({ data: new Uint8ClampedArray([0, 0, 0, 0]) }),
        putImageData: () => {},
        createImageData: () => ({ data: new Uint8ClampedArray(4) }),
      }
    }
  }
  ;(globalThis as unknown as { Image: unknown }).Image = class {
    onload: (() => void) | null = null
    set src(_value: string) {}
  }
  ;(globalThis as unknown as { HTMLCanvasElement: unknown }).HTMLCanvasElement = FakeCanvas
  ;(globalThis as unknown as { document: unknown }).document = {
    pointerLockElement: null,
    documentElement: {},
    createElement: (tagName: string) => tagName === 'audio'
      ? { canPlayType: () => '' }
      : new FakeCanvas(),
  }

  ;({ BattleScene: BattleSceneClass } = await import('../../src/scenes/BattleScene.ts'))
})

afterAll(() => {
  const runtime = globalThis as unknown as Record<string, unknown>
  if (originalWindow === undefined) delete runtime.window
  else runtime.window = originalWindow
  if (originalDocument === undefined) delete runtime.document
  else runtime.document = originalDocument
  if (originalImage === undefined) delete runtime.Image
  else runtime.Image = originalImage
  if (originalCanvas === undefined) delete runtime.HTMLCanvasElement
  else runtime.HTMLCanvasElement = originalCanvas
})

describe('BattleScene result fallback', () => {
  test('returns to map when a standalone battle ends successfully', () => {
    expect(getBattleResultFallbackScene(true, false)).toBe('MapScene')
  })

  test('returns to map when a standalone battle escape succeeds', () => {
    expect(getBattleResultFallbackScene(false, true)).toBe('MapScene')
  })

  test('opens game over when a standalone battle is lost', () => {
    expect(getBattleResultFallbackScene(false, false)).toBe('GameOverScene')
  })
})

describe('BattleScene authored battle bonuses', () => {
  test('consumes the next-battle attack bonus only after applying it to T', () => {
    const gd = GameData.getInstance()
    gd.reset()
    gd.setFlag(STORY_BATTLE_FLAGS.NEXT_ATTACK_UP, true)
    const logs: string[] = []
    const target = { id: 'T', name: 'T', isPlayer: true, status: [] as string[] }
    const applyBonus = BattleSceneClass.prototype['applyStoryBattleBonuses'] as ApplyStoryBattleBonuses
    const harness = Object.assign(Object.create(BattleSceneClass.prototype), {
      units: [target],
      addStatus: (unit: { status: string[] }, status: string) => {
        unit.status.push(status)
        return true
      },
      log: (message: string) => logs.push(message),
    }) as StoryBattleBonusHarness

    applyBonus.call(harness)

    expect(target.status).toEqual([BATTLE_STATUS.ATTACK_UP])
    expect(gd.getFlag(STORY_BATTLE_FLAGS.NEXT_ATTACK_UP)).toBe(false)
    expect(logs).toEqual(['T 的决意化为力量，本场攻击提升！'])

    applyBonus.call(harness)
    expect(target.status).toEqual([BATTLE_STATUS.ATTACK_UP])
  })

  test('keeps the bonus pending if T is not present', () => {
    const gd = GameData.getInstance()
    gd.reset()
    gd.setFlag(STORY_BATTLE_FLAGS.NEXT_ATTACK_UP, true)
    const applyBonus = BattleSceneClass.prototype['applyStoryBattleBonuses'] as ApplyStoryBattleBonuses
    const harness = Object.assign(Object.create(BattleSceneClass.prototype), {
      units: [],
      addStatus: () => true,
      log: () => {},
    }) as StoryBattleBonusHarness

    applyBonus.call(harness)

    expect(gd.getFlag(STORY_BATTLE_FLAGS.NEXT_ATTACK_UP)).toBe(true)
  })
})

describe('BattleScene player skill action recording', () => {
  test('records self, all, and random skills before advancing exactly once', () => {
    const selectSkill = BattleSceneClass.prototype['selectSkill'] as SelectSkill
    for (const skillId of ['chansizhang', 'shengdun', 'zhuifengdian']) {
      let nextTurnCount = 0
      const actor = { name: 'T', isPlayer: true }
      const harness = Object.assign(Object.create(BattleSceneClass.prototype), {
        inSkillMenu: true,
        skillMenuIndex: 0,
        actionStack: [],
        lastPlayerAction: null,
        getCurrentUnit: () => actor,
        getUsableSkillIds: () => [skillId],
        closeSkillMenu: () => {},
        getLiveOpponents: () => [{}],
        performSkill: () => true,
        nextTurn: () => { nextTurnCount++ },
        log: () => {},
      }) as ImmediateSkillHarness

      selectSkill.call(harness)

      expect(harness.lastPlayerAction).toEqual({ type: 'skill', skillId })
      expect(nextTurnCount).toBe(1)
    }
  })

  test('records a targeted skill through the same successful-skill completion path', () => {
    const executeAction = BattleSceneClass.prototype['executeAction'] as ExecuteAction
    let nextTurnCount = 0
    const actor = { name: 'T', isPlayer: true }
    const target = { name: 'Enemy', isPlayer: false }
    const harness = Object.assign(Object.create(BattleSceneClass.prototype), {
      actionStack: ['skill', 'qizhijian'],
      targetIndex: 0,
      inTargetSelect: true,
      lastPlayerAction: null,
      getCurrentUnit: () => actor,
      getSelectableTargets: () => [target],
      getLiveOpponents: () => [target],
      performSkill: () => true,
      setCommandMenuVisible: () => {},
      hideTargetIndicator: () => {},
      nextTurn: () => { nextTurnCount++ },
      log: () => {},
    }) as TargetedSkillHarness

    executeAction.call(harness)

    expect(harness.lastPlayerAction).toEqual({ type: 'skill', skillId: 'qizhijian' })
    expect(nextTurnCount).toBe(1)
  })
})
