import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { GameData } from '../../src/core/GameData.ts'
import { getBattleResultFallbackScene } from '../../src/utils/battleResult.ts'
import { BATTLE_RULES, BATTLE_STATUS, COMBO_TP_COST, STORY_BATTLE_FLAGS } from '../../src/utils/constants.ts'

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

type ComboDamageOptions = {
  sourceStat?: number
  grantTp?: boolean
  actionLabel?: string
}

type ComboDamageCall = {
  actor: unknown
  target: unknown
  skill: { id: string }
  options: ComboDamageOptions
}

type ExecuteComboHarness = {
  units: Array<{
    id: string
    name: string
    isPlayer: boolean
    tp: number
    stats: { hp: number }
    data: { stats: { atk: number; matk: number } }
  }>
  lastPlayerAction: RecordedSkillAction | null
  speedMult: number
  add: { text: () => unknown }
  tweens: { add: () => void }
  updateUnitBars: () => void
  markComboUnitActed: () => void
  calculateAndDealSkillDamage: (
    actor: unknown,
    target: unknown,
    skill: { id: string },
    options: ComboDamageOptions,
  ) => void
}

type ExecuteCombo = (
  this: ExecuteComboHarness,
  combo: { skillId: string; char1: string; char2: string },
) => void

type SkillDamageHarness = {
  difficultyMult: { dmg: number }
  applyDamageModifiers: (actor: unknown, target: unknown, damage: number, isMagic: boolean) => number
  getPlayerDamageMultiplier: () => number
  addTp: () => void
  tryEvadeAttack: (target: unknown, actor: unknown, skillId: string) => boolean
  applyDamageVariance: (damage: number) => number
  applyBreakGauge: (target: unknown, gain: number) => void
  dealDamage: (target: unknown, damage: number, source: unknown, isMagic: boolean) => number
  applyConfiguredSkillStatuses: (target: unknown, skill: unknown) => boolean
  log: (message: string) => void
}

type CalculateAndDealSkillDamage = (
  this: SkillDamageHarness,
  actor: unknown,
  target: unknown,
  skill: unknown,
  options?: ComboDamageOptions,
) => void

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

describe('BattleScene combo damage resolution', () => {
  test('delegates a magic combo with combined MATK and no extra TP gain', () => {
    const executeCombo = BattleSceneClass.prototype['executeCombo'] as unknown as ExecuteCombo
    const damageCalls: ComboDamageCall[] = []
    const unit1 = {
      id: 'T', name: 'T', isPlayer: true, tp: 100, stats: { hp: 100 },
      data: { stats: { atk: 40, matk: 25 } },
    }
    const unit2 = {
      id: 'XIAOAI', name: 'xiaoai', isPlayer: true, tp: 100, stats: { hp: 100 },
      data: { stats: { atk: 12, matk: 35 } },
    }
    const firstEnemy = {
      id: 'enemy-1', name: '敌人甲', isPlayer: false, tp: 0, stats: { hp: 100 },
      data: { stats: { atk: 10, matk: 10 } },
    }
    const secondEnemy = {
      id: 'enemy-2', name: '敌人乙', isPlayer: false, tp: 0, stats: { hp: 100 },
      data: { stats: { atk: 10, matk: 10 } },
    }
    const comboText = {
      y: 0,
      setOrigin() { return this },
      setDepth() { return this },
      setScrollFactor() { return this },
      destroy() {},
    }
    const harness = Object.assign(Object.create(BattleSceneClass.prototype), {
      units: [unit1, unit2, firstEnemy, secondEnemy],
      lastPlayerAction: null,
      speedMult: 1,
      add: { text: () => comboText },
      tweens: { add: () => {} },
      updateUnitBars: () => {},
      markComboUnitActed: () => {},
      calculateAndDealSkillDamage: (actor: unknown, target: unknown, skill: { id: string }, options: ComboDamageOptions) => {
        damageCalls.push({ actor, target, skill, options })
      },
    }) as ExecuteComboHarness

    executeCombo.call(harness, { skillId: 'fengyuezhixi', char1: 'T', char2: 'XIAOAI' })

    expect(unit1.tp).toBe(100 - COMBO_TP_COST)
    expect(unit2.tp).toBe(100 - COMBO_TP_COST)
    expect(harness.lastPlayerAction).toEqual({ type: 'skill', skillId: 'fengyuezhixi' })
    expect(damageCalls).toHaveLength(1)
    expect(damageCalls[0]?.actor).toBe(unit1)
    expect(damageCalls[0]?.target).toBe(firstEnemy)
    expect(damageCalls[0]?.options).toEqual({
      sourceStat: 60,
      grantTp: false,
      actionLabel: 'T 与 xiaoai 发动 风月止息',
    })
  })

  test('runs combo damage through difficulty, weakness, break, evade, and status hooks', () => {
    const calculateDamage = BattleSceneClass.prototype['calculateAndDealSkillDamage'] as unknown as CalculateAndDealSkillDamage
    const calls = {
      modifier: [] as Array<{ damage: number; isMagic: boolean }>,
      evasion: [] as Array<{ actor: unknown; skillId: string }>,
      breakGain: [] as number[],
      dealt: [] as Array<{ damage: number; isMagic: boolean }>,
      statuses: 0,
      tp: 0,
      logs: [] as string[],
    }
    const actor = {
      id: 'T', name: 'T', isPlayer: true,
      stats: { hp: 100 },
      data: { stats: { atk: 10, matk: 10 } },
    }
    const target = {
      id: 'enemy', name: '火弱敌人', isPlayer: false,
      stats: { hp: 100 },
      data: {
        id: 'enemy', element: 'wood', weakness: ['fire'], resistance: [],
        stats: { def: 10, mdef: 10 },
      },
    }
    const skill = {
      id: 'combo_pipeline_test', name: '测试连携', type: 'special', target: 'single',
      element: 'fire', power: 10, costMp: 0, costTp: 0, description: '',
    }
    const harness = Object.assign(Object.create(BattleSceneClass.prototype), {
      difficultyMult: { dmg: 1 },
      applyDamageModifiers: (_actor: unknown, _target: unknown, damage: number, isMagic: boolean) => {
        calls.modifier.push({ damage, isMagic })
        return damage
      },
      getPlayerDamageMultiplier: () => 1.2,
      addTp: () => { calls.tp++ },
      tryEvadeAttack: (_target: unknown, evadeActor: unknown, skillId: string) => {
        calls.evasion.push({ actor: evadeActor, skillId })
        return false
      },
      applyDamageVariance: (damage: number) => damage,
      applyBreakGauge: (_target: unknown, gain: number) => { calls.breakGain.push(gain) },
      dealDamage: (_target: unknown, damage: number, _source: unknown, isMagic: boolean) => {
        calls.dealt.push({ damage, isMagic })
        return damage
      },
      applyConfiguredSkillStatuses: () => {
        calls.statuses++
        return true
      },
      log: (message: string) => { calls.logs.push(message) },
    }) as SkillDamageHarness

    calculateDamage.call(harness, actor, target, skill, {
      sourceStat: 20,
      grantTp: false,
      actionLabel: 'T 与 xiaoai 发动 测试连携',
    })

    expect(calls.modifier).toEqual([{ damage: 15, isMagic: true }])
    expect(calls.tp).toBe(0)
    expect(calls.evasion).toEqual([{ actor, skillId: 'combo_pipeline_test' }])
    expect(calls.breakGain).toEqual([BATTLE_RULES.WEAK_SKILL_BREAK_GAIN])
    expect(calls.dealt).toEqual([{ damage: 27, isMagic: true }])
    expect(calls.statuses).toBe(1)
    expect(calls.logs).toContain('弱点打击！')
    expect(calls.logs).toContain('T 与 xiaoai 发动 测试连携，对 火弱敌人 造成 27 点伤害！')
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
