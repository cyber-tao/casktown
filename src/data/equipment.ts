import type { CharacterData, CharacterStats } from './types'

export type EquipmentSlot = keyof CharacterData['equipment']
export type EquipStats = Pick<CharacterStats, 'atk' | 'def' | 'matk' | 'mdef' | 'speed' | 'maxHp' | 'maxMp'>

export const EQUIPMENT_SLOTS: readonly EquipmentSlot[] = ['weapon', 'armor', 'accessory']

export const EQUIP_STAT_BONUSES: Record<string, Partial<EquipStats>> = {
  fathers_sword: { atk: 10 },
  fathers_armor: { def: 8, maxHp: 20 },
  baihu_kai: { def: 15, mdef: 10, maxHp: 50 },
  zi_yue: { atk: 8, speed: 3 },
  guan_dao: { atk: 12, def: 3 },
  yufeng_jian: { atk: 9, speed: 5 },
  shenyu_juanzhou: { matk: 12, mdef: 8 },
  water_mirror: { mdef: 15, matk: 5 },
  guard_charm: { def: 8 },
  pink_chime: { speed: 5, mdef: 3 },
  rainbow_barrel: { matk: 10, mdef: 10 },
  ring: { atk: 5, matk: 5, speed: 2 },
}

export const EQUIP_SLOT_MAP: Record<string, EquipmentSlot> = {
  fathers_sword: 'weapon',
  fathers_armor: 'armor',
  baihu_kai: 'armor',
  zi_yue: 'weapon',
  guan_dao: 'weapon',
  yufeng_jian: 'weapon',
  shenyu_juanzhou: 'accessory',
  water_mirror: 'accessory',
  guard_charm: 'accessory',
  pink_chime: 'accessory',
  rainbow_barrel: 'accessory',
  ring: 'accessory',
}

export function createEmptyEquipStats(): EquipStats {
  return { atk: 0, def: 0, matk: 0, mdef: 0, speed: 0, maxHp: 0, maxMp: 0 }
}
