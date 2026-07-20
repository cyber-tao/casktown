import { describe, expect, test } from 'bun:test'
import { ENEMIES } from '../../src/data/enemies.ts'
import { ENCOUNTERS } from '../../src/data/encounters.ts'
import { IMAGE_ASSETS } from '../../src/data/assets.ts'
import { SKILLS } from '../../src/data/skills.ts'
import {
  HEART_SHADOW_ENEMY_IDS,
  isHeartShadowEvasionCounter,
  isHeartShadowDoppelganger,
  isHeartShadowShieldDispel,
  resolveHeartShadowBreakMax,
  resolveHeartShadowCopyAction,
  resolveHeartShadowHuihuiSkill,
  shouldHeartShadowSunCastShield,
} from '../../src/utils/battleRules.ts'

describe('heart-shadow battles', () => {
  test('BTL701-705 use their authored heart-shadow enemies', () => {
    expect(ENCOUNTERS.BTL_701.enemies).toEqual([HEART_SHADOW_ENEMY_IDS.T])
    expect(ENCOUNTERS.BTL_702.enemies).toEqual([HEART_SHADOW_ENEMY_IDS.HUIHUI, HEART_SHADOW_ENEMY_IDS.WORRY_CHAIN])
    expect(ENCOUNTERS.BTL_703.enemies).toEqual([HEART_SHADOW_ENEMY_IDS.A])
    expect(ENCOUNTERS.BTL_704.enemies).toEqual([HEART_SHADOW_ENEMY_IDS.CONGCONG])
    expect(ENCOUNTERS.BTL_705.enemies).toEqual([HEART_SHADOW_ENEMY_IDS.SUN])
  })

  test('heart shadows render as dark counterparts instead of the default rock', () => {
    const shadowPaths = {
      [HEART_SHADOW_ENEMY_IDS.T]: 'enemies/heart_shadows/heart_shadow_t.png',
      [HEART_SHADOW_ENEMY_IDS.HUIHUI]: 'enemies/heart_shadows/heart_shadow_huihui.png',
      [HEART_SHADOW_ENEMY_IDS.A]: 'enemies/heart_shadows/heart_shadow_a.png',
      [HEART_SHADOW_ENEMY_IDS.CONGCONG]: 'enemies/heart_shadows/heart_shadow_congcong.png',
      [HEART_SHADOW_ENEMY_IDS.SUN]: 'enemies/heart_shadows/heart_shadow_sun.png',
    }
    for (const [enemyId, path] of Object.entries(shadowPaths)) {
      expect(IMAGE_ASSETS[`mon_${enemyId}_01`]).toBe(path)
      expect(IMAGE_ASSETS[`mon_${enemyId}_01`]).not.toContain('characters/')
      expect(isHeartShadowDoppelganger(enemyId)).toBe(true)
    }
    expect(IMAGE_ASSETS[`mon_${HEART_SHADOW_ENEMY_IDS.WORRY_CHAIN}_01`]).toBe('dark_fantasy/misc/chain_hook.png')
    expect(isHeartShadowDoppelganger(HEART_SHADOW_ENEMY_IDS.WORRY_CHAIN)).toBe(false)
  })

  test('T copies reliable skills and falls back by action type', () => {
    expect(resolveHeartShadowCopyAction({ type: 'skill', skillId: 'qizhijian' }, SKILLS)).toEqual({ type: 'skill', skillId: 'qizhijian' })
    expect(resolveHeartShadowCopyAction({ type: 'skill', skillId: 'shanbeng' }, SKILLS)).toEqual({ type: 'skill', skillId: 'shadow_blade' })
    expect(resolveHeartShadowCopyAction({ type: 'defend' }, SKILLS)).toEqual({ type: 'defend' })
    expect(resolveHeartShadowCopyAction({ type: 'item' }, SKILLS)).toEqual({ type: 'skill', skillId: 'heal' })
  })

  test('Huihui mends the living worry chain and stops after it breaks', () => {
    expect(SKILLS.worry_mend.type).toBe('heal')
    expect(resolveHeartShadowHuihuiSkill(true)).toBe('worry_mend')
    expect(resolveHeartShadowHuihuiSkill(false)).toBe('shadow_blade')
  })

  test('A has high defense but a shortened break threshold', () => {
    expect(ENEMIES.heart_shadow_a.stats.def).toBeGreaterThanOrEqual(60)
    expect(resolveHeartShadowBreakMax(HEART_SHADOW_ENEMY_IDS.A, 200)).toBe(100)
  })

  test('Huihui hidden weapons and sun oracle counter Congcong evasion', () => {
    expect(ENEMIES.heart_shadow_congcong.skills).toContain('tiefengbu')
    expect(isHeartShadowEvasionCounter(HEART_SHADOW_ENEMY_IDS.CONGCONG, 'HUIHUI', 'xiubiao')).toBe(true)
    expect(isHeartShadowEvasionCounter(HEART_SHADOW_ENEMY_IDS.CONGCONG, 'SUN', 'shenyu')).toBe(true)
    expect(isHeartShadowEvasionCounter(HEART_SHADOW_ENEMY_IDS.CONGCONG, 'T', 'qizhijian')).toBe(false)
  })

  test('sun raises a periodic shield that only ring-light purification dispels', () => {
    expect(ENEMIES.heart_shadow_sun.skills).toContain('shengdun')
    expect(shouldHeartShadowSunCastShield(0, false)).toBe(true)
    expect(shouldHeartShadowSunCastShield(1, false)).toBe(false)
    expect(shouldHeartShadowSunCastShield(3, false)).toBe(true)
    expect(shouldHeartShadowSunCastShield(3, true)).toBe(false)
    expect(isHeartShadowShieldDispel(HEART_SHADOW_ENEMY_IDS.SUN, 'jieguangjinghua')).toBe(true)
    expect(isHeartShadowShieldDispel(HEART_SHADOW_ENEMY_IDS.SUN, 'qizhijian')).toBe(false)
  })
})
