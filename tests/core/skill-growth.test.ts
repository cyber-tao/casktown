import { beforeEach, describe, expect, test } from 'bun:test'
import { GameData } from '../../src/core/GameData.ts'
import { SkillGrowth } from '../../src/core/SkillGrowth.ts'
import { COMBO_DEFINITIONS } from '../../src/data/combos.ts'
import { STORY_SKILL_UNLOCK_FLAGS, TRUE_ROUTE_MIN_MERCY, TRUE_ROUTE_MIN_XIAOAI_MEMORY_FRAGMENTS } from '../../src/utils/constants.ts'

describe('SkillGrowth', () => {
  beforeEach(() => {
    GameData.getInstance().reset()
  })

  test('checkUnlocksForCharacter returns empty when no conditions met', () => {
    const sg = SkillGrowth.getInstance()
    const result = sg.checkUnlocksForCharacter('T')
    expect(Array.isArray(result)).toBe(true)
  })

  test('checkUnlocksForCharacter returns empty for unknown character', () => {
    const sg = SkillGrowth.getInstance()
    const result = sg.checkUnlocksForCharacter('NONEXISTENT')
    expect(result).toEqual([])
  })

  test('checkAllUnlocks checks party and reserve members', () => {
    const sg = SkillGrowth.getInstance()
    const result = sg.checkAllUnlocks()
    expect(result).toBeInstanceOf(Map)
  })

  test('getAvailableSkills returns array for known character', () => {
    const sg = SkillGrowth.getInstance()
    const result = sg.getAvailableSkills('T')
    expect(Array.isArray(result)).toBe(true)
  })

  test('getNextUnlocks returns skills not yet learned', () => {
    const sg = SkillGrowth.getInstance()
    const result = sg.getNextUnlocks('T')
    expect(Array.isArray(result)).toBe(true)
    const hero = GameData.getInstance().characters.get('T')!
    for (const cond of result) {
      expect(hero.skills).not.toContain(cond.skillId)
    }
  })

  test('checkUnlocksForCharacter does not add skill twice', () => {
    const sg = SkillGrowth.getInstance()
    const gd = GameData.getInstance()
    const hero = gd.characters.get('T')!
    const nextUnlocks = sg.getNextUnlocks('T')
    const levelCond = nextUnlocks.find(c => c.type === 'level')
    if (levelCond) {
      hero.stats.level = levelCond.value as number
      sg.checkUnlocksForCharacter('T')
      const countAfterFirst = hero.skills.filter(s => s === levelCond.skillId).length
      sg.checkUnlocksForCharacter('T')
      const countAfterSecond = hero.skills.filter(s => s === levelCond.skillId).length
      expect(countAfterFirst).toBe(countAfterSecond)
    }
  })

  test('level condition unlocks skill when level is high enough', () => {
    const sg = SkillGrowth.getInstance()
    const gd = GameData.getInstance()
    const hero = gd.characters.get('T')!
    const nextUnlocks = sg.getNextUnlocks('T')
    const levelCond = nextUnlocks.find(c => c.type === 'level')
    if (levelCond) {
      hero.stats.level = levelCond.value as number
      expect(sg.isConditionMet(levelCond)).toBe(true)
      const unlocked = sg.checkUnlocksForCharacter('T')
      expect(unlocked).toContain(levelCond.skillId)
    }
  })

  test('flag condition unlocks skill when flag is set', () => {
    const sg = SkillGrowth.getInstance()
    const gd = GameData.getInstance()
    const nextUnlocks = sg.getNextUnlocks('T')
    const flagCond = nextUnlocks.find(c => c.type === 'flag')
    if (flagCond) {
      gd.setFlag(flagCond.value as string, true)
      expect(sg.isConditionMet(flagCond)).toBe(true)
      const unlocked = sg.checkUnlocksForCharacter('T')
      expect(unlocked).toContain(flagCond.skillId)
    }
  })

  test('quest condition unlocks skill when quest is completed', () => {
    const sg = SkillGrowth.getInstance()
    const gd = GameData.getInstance()
    const nextUnlocks = sg.getNextUnlocks('T')
    const questCond = nextUnlocks.find(c => c.type === 'quest')
    if (questCond) {
      gd.quests.set(questCond.value as string, {
        id: questCond.value as string,
        status: 'completed',
        progress: 1,
        maxProgress: 1,
      })
      expect(sg.isConditionMet(questCond)).toBe(true)
    }
  })

  test('story skill rewards use their authored branch and fragment conditions', () => {
    const sg = SkillGrowth.getInstance()
    const gd = GameData.getInstance()
    const hero = gd.characters.get('T')!
    const sun = gd.characters.get('SUN')!

    gd.setFlag('has_sacred_water', true)
    gd.setFlag('xiaoai_purified', true)
    sg.checkUnlocksForCharacter('T')
    expect(hero.skills).not.toContain('yuexiahuixuan')
    expect(hero.skills).not.toContain('fengyuezhixi')

    gd.setFlag(STORY_SKILL_UNLOCK_FLAGS.YUEXIAHUIXUAN, true)
    expect(sg.checkUnlocksForCharacter('T')).toContain('yuexiahuixuan')

    gd.updateBranch('xiaoai_memory_fragments', TRUE_ROUTE_MIN_XIAOAI_MEMORY_FRAGMENTS - 1)
    expect(sg.checkUnlocksForCharacter('T')).not.toContain('fengyuezhixi')
    gd.updateBranch('xiaoai_memory_fragments', TRUE_ROUTE_MIN_XIAOAI_MEMORY_FRAGMENTS)
    expect(sg.checkUnlocksForCharacter('T')).toContain('fengyuezhixi')

    sg.checkUnlocksForCharacter('SUN')
    expect(sun.skills).not.toContain('rendeqiyuan')
    gd.setFlag(STORY_SKILL_UNLOCK_FLAGS.RENDEQIYUAN, true)
    expect(sg.checkUnlocksForCharacter('SUN')).toContain('rendeqiyuan')
  })

  test('heart-shadow skills unlock only after their matching victory flags', () => {
    const sg = SkillGrowth.getInstance()
    const gd = GameData.getInstance()
    const unlocks = [
      { characterId: 'T', skillId: 'shouxiangxin', flag: 'heart_shadow_t_defeated' },
      { characterId: 'HUIHUI', skillId: 'butaozhiling', flag: 'heart_shadow_huihui_defeated' },
      { characterId: 'A', skillId: 'shanyuexin', flag: 'heart_shadow_a_defeated' },
      { characterId: 'CONGCONG', skillId: 'zhenfengbu', flag: 'heart_shadow_congcong_defeated' },
      { characterId: 'SUN', skillId: 'rendeqiyuan', flag: 'heart_shadow_sun_defeated' },
    ] as const

    gd.setFlag('true_route_unlocked', true)
    for (const unlock of unlocks) {
      sg.checkUnlocksForCharacter(unlock.characterId)
      expect(gd.characters.get(unlock.characterId)?.skills).not.toContain(unlock.skillId)
    }

    for (const unlock of unlocks) {
      gd.setFlag(unlock.flag, true)
      expect(sg.checkUnlocksForCharacter(unlock.characterId)).toContain(unlock.skillId)
    }
  })

  test('five-god summons unlock from their matching seal and true-route flags', () => {
    const sg = SkillGrowth.getInstance()
    const gd = GameData.getInstance()
    const sun = gd.characters.get('SUN')!
    const unlocks = [
      ['seal_qinglong_released', 'wushenzhaohuan_qing'],
      ['seal_baihu_released', 'wushenzhaohuan_bai'],
      ['seal_zhuque_released', 'wushenzhaohuan_zhu'],
      ['seal_xuanwu_released', 'wushenzhaohuan_xuan'],
      ['true_route_unlocked', 'wushenzhaohuan_si'],
    ] as const

    sg.checkUnlocksForCharacter('SUN')
    for (const [, skillId] of unlocks) expect(sun.skills).not.toContain(skillId)

    for (const [flag, skillId] of unlocks.slice(0, 4)) {
      gd.setFlag(flag, true)
      expect(sg.checkUnlocksForCharacter('SUN')).toContain(skillId)
    }

    gd.setFlag('white_tiger_respected', true)
    gd.setFlag('answered_xiyuan_kindly', true)
    gd.setFlag('xiaoai_purified', true)
    gd.setFlag('true_route_reincarnation', true)
    gd.updateBranch('mercy_score', TRUE_ROUTE_MIN_MERCY)
    gd.updateBranch('xiaoai_memory_fragments', TRUE_ROUTE_MIN_XIAOAI_MEMORY_FRAGMENTS)
    expect(sg.checkUnlocksForCharacter('SUN')).toContain('wushenzhaohuan_si')
  })

  test('combo definitions unlock through the shared skill growth source', () => {
    const sg = SkillGrowth.getInstance()
    const gd = GameData.getInstance()

    for (const definition of COMBO_DEFINITIONS) {
      if (definition.unlockCondition.type === 'flag') {
        gd.setFlag(definition.unlockCondition.value, true)
      } else {
        gd.updateBranch('xiaoai_memory_fragments', definition.unlockCondition.threshold)
      }
      expect(sg.checkUnlocksForCharacter(definition.unlockCharacterId)).toContain(definition.skillId)
    }
  })
})
