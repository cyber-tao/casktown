import { EventBus, GameEvents } from './EventBus'
import { GameData } from './GameData'

export interface RebuildFacility {
  id: string
  name: string
  description: string
  requiredLevel: number
  flag: string
}

const REBUILD_FACILITIES: RebuildFacility[] = [
  { id: 'herb_shop', name: '药草商', description: '药草商店重新开业', requiredLevel: 1, flag: 'facility_herb_shop' },
  { id: 'item_shop', name: '杂货铺', description: '杂货铺恢复运营', requiredLevel: 1, flag: 'facility_item_shop' },
  { id: 'farm', name: '菜园', description: '菠萝大叔的菜园恢复', requiredLevel: 1, flag: 'facility_farm' },
  { id: 'plaza', name: '广场', description: '盛典广场修复', requiredLevel: 2, flag: 'facility_plaza' },
  { id: 'dock', name: '码头', description: '码头设施修复', requiredLevel: 2, flag: 'facility_dock' },
  { id: 'equipment_shop', name: '装备店', description: '武器装备店开张', requiredLevel: 2, flag: 'facility_equipment_shop' },
  { id: 'training', name: '训练场', description: '训练场开放', requiredLevel: 3, flag: 'facility_training' },
  { id: 'tower', name: '木桶塔', description: '中央木桶塔修复', requiredLevel: 3, flag: 'facility_tower' },
  { id: 'mayor', name: '镇长家', description: '镇长宅邸修缮', requiredLevel: 3, flag: 'facility_mayor' },
  { id: 'defense', name: '防御塔', description: '防御塔恢复', requiredLevel: 4, flag: 'facility_defense' },
  { id: 'quest_board', name: '任务板', description: '任务公告板启用', requiredLevel: 4, flag: 'facility_quest_board' },
  { id: 'teleport', name: '传送点', description: '传送水晶激活', requiredLevel: 5, flag: 'facility_teleport' },
]

export class RebuildSystem {
  private static instance: RebuildSystem

  static getInstance(): RebuildSystem {
    if (!RebuildSystem.instance) {
      RebuildSystem.instance = new RebuildSystem()
    }
    return RebuildSystem.instance
  }

  get level(): number {
    return GameData.getInstance().rebuildLevel
  }

  addProgress(amount: number): void {
    const gd = GameData.getInstance()
    const oldLevel = gd.rebuildLevel
    gd.rebuildLevel += amount
    gd.branches.rebuild_level = gd.rebuildLevel
    if (gd.rebuildLevel !== oldLevel) {
      EventBus.emit(GameEvents.FLAG_SET, 'rebuild_level', gd.rebuildLevel)
      this.checkFacilityUnlocks()
    }
  }

  setLevel(level: number): void {
    const gd = GameData.getInstance()
    gd.rebuildLevel = level
    gd.branches.rebuild_level = level
    EventBus.emit(GameEvents.FLAG_SET, 'rebuild_level', level)
    this.checkFacilityUnlocks()
  }

  canRebuild(requirement: number): boolean {
    return this.level >= requirement
  }

  checkFacilityUnlocks(): void {
    const gd = GameData.getInstance()
    for (const facility of REBUILD_FACILITIES) {
      if (gd.rebuildLevel >= facility.requiredLevel && !gd.getFlag(facility.flag)) {
        gd.setFlag(facility.flag, true)
      }
    }
  }

  isFacilityUnlocked(facilityId: string): boolean {
    const facility = REBUILD_FACILITIES.find(f => f.id === facilityId)
    if (!facility) return false
    return GameData.getInstance().getFlag(facility.flag) === true
  }

  getUnlockedFacilities(): RebuildFacility[] {
    return REBUILD_FACILITIES.filter(f => this.isFacilityUnlocked(f.id))
  }

  getAllFacilities(): RebuildFacility[] {
    return REBUILD_FACILITIES
  }

  getFacilitiesForLevel(level: number): RebuildFacility[] {
    return REBUILD_FACILITIES.filter(f => f.requiredLevel === level)
  }
}
