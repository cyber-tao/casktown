import { GameData } from './GameData'
import { REBUILD_FACILITIES, type RebuildFacility } from '../data/rebuild'

export type { RebuildFacility }

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
    gd.setFlag('rebuild_level', gd.rebuildLevel + amount)
    if (gd.rebuildLevel !== oldLevel) {
      this.checkFacilityUnlocks()
    }
  }

  setLevel(level: number): void {
    const gd = GameData.getInstance()
    const oldLevel = gd.rebuildLevel
    gd.setFlag('rebuild_level', level)
    if (gd.rebuildLevel !== oldLevel) {
      this.checkFacilityUnlocks()
    }
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
    return [...REBUILD_FACILITIES]
  }

  getFacilitiesForLevel(level: number): RebuildFacility[] {
    return REBUILD_FACILITIES.filter(f => f.requiredLevel === level)
  }
}
