import { describe, expect, test } from 'bun:test'
import { getBlockedMapDialogueId, resolveCanonicalMapId } from '../../src/core/MapAccess.ts'
import {
  MAP_ACCESS_REQUIREMENTS,
  REBUILD_VISUAL_MAP_THRESHOLD,
  REBUILT_TOWN_MAP_ID,
  RUINED_TOWN_MAP_ID,
} from '../../src/utils/constants.ts'

describe('MapAccess', () => {
  test('keeps rebuilt town canonical after later transfers', () => {
    expect(resolveCanonicalMapId(RUINED_TOWN_MAP_ID, REBUILD_VISUAL_MAP_THRESHOLD - 1)).toBe(RUINED_TOWN_MAP_ID)
    expect(resolveCanonicalMapId(RUINED_TOWN_MAP_ID, REBUILD_VISUAL_MAP_THRESHOLD)).toBe(REBUILT_TOWN_MAP_ID)
    expect(resolveCanonicalMapId('MAP_010', REBUILD_VISUAL_MAP_THRESHOLD)).toBe('MAP_010')
  })

  test('returns null for map without access requirement', () => {
    const readFlag = () => undefined
    expect(getBlockedMapDialogueId('MAP_001', readFlag)).toBeNull()
  })

  test('returns blocked dialogue when flag not met', () => {
    const requirement = MAP_ACCESS_REQUIREMENTS['MAP_010']
    if (!requirement) return
    const readFlag = () => undefined
    const result = getBlockedMapDialogueId('MAP_010', readFlag)
    expect(result).toBe(requirement.blockedDialogueId)
  })

  test('returns null when flag requirement is satisfied', () => {
    const requirement = MAP_ACCESS_REQUIREMENTS['MAP_010']
    if (!requirement) return
    const readFlag = (flag: string) => flag === requirement.flag ? true : undefined
    const result = getBlockedMapDialogueId('MAP_010', readFlag)
    expect(result).toBeNull()
  })

  test('handles minimum threshold for numeric flags', () => {
    const rebuildReq = Object.entries(MAP_ACCESS_REQUIREMENTS).find(
      ([, r]) => r.minimum !== undefined
    )
    if (!rebuildReq) return
    const [mapId, req] = rebuildReq
    const readFlagBelow = (flag: string) => flag === req.flag ? (req.minimum as number) - 1 : undefined
    expect(getBlockedMapDialogueId(mapId, readFlagBelow)).toBe(req.blockedDialogueId)

    const readFlagAt = (flag: string) => flag === req.flag ? req.minimum : undefined
    expect(getBlockedMapDialogueId(mapId, readFlagAt)).toBeNull()

    const readFlagAbove = (flag: string) => flag === req.flag ? (req.minimum as number) + 1 : undefined
    expect(getBlockedMapDialogueId(mapId, readFlagAbove)).toBeNull()
  })

  test('requires true route unlock for the abyss', () => {
    const requirement = MAP_ACCESS_REQUIREMENTS['MAP_070']
    expect(requirement?.flag).toBe('true_route_unlocked')

    const purifiedOnly = (flag: string) => flag === 'xiaoai_purified' ? true : false
    expect(getBlockedMapDialogueId('MAP_070', purifiedOnly)).toBe(requirement?.blockedDialogueId)

    const trueRouteUnlocked = (flag: string) => flag === 'true_route_unlocked' ? true : false
    expect(getBlockedMapDialogueId('MAP_070', trueRouteUnlocked)).toBeNull()
  })

  test('all map access requirements reference valid dialogue ids', () => {
    for (const [mapId, req] of Object.entries(MAP_ACCESS_REQUIREMENTS)) {
      expect(req.blockedDialogueId).toBeTruthy()
      expect(req.flag).toBeTruthy()
      expect(typeof req.blockedDialogueId).toBe('string')
    }
  })
})
