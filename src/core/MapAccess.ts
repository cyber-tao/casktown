import {
  MAP_ACCESS_REQUIREMENTS,
  REBUILD_VISUAL_MAP_THRESHOLD,
  REBUILT_TOWN_MAP_ID,
  RUINED_TOWN_MAP_ID,
} from '../utils/constants'

export type MapAccessFlagReader = (flag: string) => unknown

export function resolveCanonicalMapId(mapId: string, rebuildLevel: number): string {
  if (mapId !== RUINED_TOWN_MAP_ID && mapId !== REBUILT_TOWN_MAP_ID) return mapId
  return rebuildLevel >= REBUILD_VISUAL_MAP_THRESHOLD ? REBUILT_TOWN_MAP_ID : RUINED_TOWN_MAP_ID
}

export function getBlockedMapDialogueId(mapId: string, readFlag: MapAccessFlagReader): string | null {
  const requirement = MAP_ACCESS_REQUIREMENTS[mapId]
  if (!requirement) return null

  const flagValue = readFlag(requirement.flag)
  if (requirement.minimum !== undefined) {
    return typeof flagValue === 'number' && flagValue >= requirement.minimum ? null : requirement.blockedDialogueId
  }

  const expectedValue = Object.prototype.hasOwnProperty.call(requirement, 'value') ? requirement.value : true
  return flagValue === expectedValue ? null : requirement.blockedDialogueId
}
