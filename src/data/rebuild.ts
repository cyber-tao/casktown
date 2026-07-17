export interface RebuildFacility {
  id: string
  name: string
  description: string
  requiredLevel: number
  flag: string
}

export interface RebuildMilestone {
  level: number
  name: string
  condition: string
  description: string
  sourceFlag: string
}

export const REBUILD_MILESTONES: readonly RebuildMilestone[] = [
  { level: 1, name: '新芽', condition: '取得千年树种', description: '草地与树苗恢复，药草商和菜园重新开放。', sourceFlag: 'has_millennium_seed' },
  { level: 2, name: '清泉', condition: '取得神水', description: '水井与河流恢复，杂货铺和码头重新运营。', sourceFlag: 'has_sacred_water' },
  { level: 3, name: '归光', condition: '完成三神物重建仪式', description: '会场与神坛恢复，开放训练场、装备店和支线板。', sourceFlag: 'rebuild_ceremony_done' },
  { level: 4, name: '守护', condition: '解放四封印', description: '防御塔与祭坛恢复，开放高级强化和传送。', sourceFlag: 'released_four_seals' },
  { level: 5, name: '心安', condition: '完成真结局', description: '居民全部返回，生命之泉光路与后日谈开放。', sourceFlag: 'game_cleared' },
]

export const REBUILD_FACILITIES: readonly RebuildFacility[] = [
  { id: 'herb_shop', name: '药草商', description: '药草商店重新开业', requiredLevel: 1, flag: 'facility_herb_shop' },
  { id: 'farm', name: '菜园', description: '菠萝大叔的菜园恢复', requiredLevel: 1, flag: 'facility_farm' },
  { id: 'item_shop', name: '杂货铺', description: '杂货铺恢复运营', requiredLevel: 2, flag: 'facility_item_shop' },
  { id: 'dock', name: '码头', description: '码头设施修复', requiredLevel: 2, flag: 'facility_dock' },
  { id: 'plaza', name: '广场', description: '盛典广场修复', requiredLevel: 3, flag: 'facility_plaza' },
  { id: 'equipment_shop', name: '装备店', description: '武器装备店开张', requiredLevel: 3, flag: 'facility_equipment_shop' },
  { id: 'training', name: '训练场', description: '训练场开放', requiredLevel: 3, flag: 'facility_training' },
  { id: 'tower', name: '木桶塔', description: '中央木桶塔修复', requiredLevel: 3, flag: 'facility_tower' },
  { id: 'mayor', name: '镇长家', description: '镇长宅邸修缮', requiredLevel: 3, flag: 'facility_mayor' },
  { id: 'quest_board', name: '任务板', description: '任务公告板启用', requiredLevel: 3, flag: 'facility_quest_board' },
  { id: 'defense', name: '防御塔', description: '防御塔恢复', requiredLevel: 4, flag: 'facility_defense' },
  { id: 'teleport', name: '传送点', description: '传送水晶激活', requiredLevel: 4, flag: 'facility_teleport' },
]
