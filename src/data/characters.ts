import type { CharacterData } from './types'

export const INITIAL_CHARACTERS: Record<string, CharacterData> = {
  T: {
    id: 'T',
    name: 'T',
    stats: {
      hp: 120, maxHp: 120,
      mp: 40, maxMp: 40,
      atk: 15, def: 12,
      matk: 10, mdef: 10,
      speed: 12,
      level: 1, exp: 0, expToNext: 50,
    },
    skills: ['qizhijian'],
    equipment: { weapon: 'fathers_sword', armor: 'fathers_armor', accessory: null },
    tp: 0,
  },
  HUIHUI: {
    id: 'HUIHUI',
    name: '慧慧',
    stats: {
      hp: 90, maxHp: 90,
      mp: 55, maxMp: 55,
      atk: 10, def: 8,
      matk: 16, mdef: 14,
      speed: 16,
      level: 1, exp: 0, expToNext: 50,
    },
    skills: ['xiubiao'],
    equipment: { weapon: 'zi_yue', armor: null, accessory: null },
    tp: 0,
  },
  A: {
    id: 'A',
    name: '阿博',
    stats: {
      hp: 160, maxHp: 160,
      mp: 30, maxMp: 30,
      atk: 18, def: 16,
      matk: 6, mdef: 10,
      speed: 8,
      level: 1, exp: 0, expToNext: 50,
    },
    skills: ['hengzhan'],
    equipment: { weapon: 'guan_dao', armor: null, accessory: null },
    tp: 0,
  },
  CONGCONG: {
    id: 'CONGCONG',
    name: '葱葱',
    stats: {
      hp: 100, maxHp: 100,
      mp: 45, maxMp: 45,
      atk: 14, def: 9,
      matk: 12, mdef: 11,
      speed: 18,
      level: 5, exp: 0, expToNext: 80,
    },
    skills: ['yufengzhan'],
    equipment: { weapon: 'yufeng_jian', armor: null, accessory: null },
    tp: 0,
  },
  SUN: {
    id: 'SUN',
    name: 'sun',
    stats: {
      hp: 110, maxHp: 110,
      mp: 70, maxMp: 70,
      atk: 8, def: 11,
      matk: 20, mdef: 18,
      speed: 11,
      level: 10, exp: 0, expToNext: 150,
    },
    skills: ['shenyu', 'zhufu'],
    equipment: { weapon: 'shenyu_juanzhou', armor: null, accessory: null },
    tp: 0,
  },
}

export function createCharacter(id: string): CharacterData {
  const base = INITIAL_CHARACTERS[id]
  if (!base) throw new Error(`Character ${id} not found`)
  return JSON.parse(JSON.stringify(base))
}
