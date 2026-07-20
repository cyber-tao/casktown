import type { GameData } from '../../core/GameData'
import type { PartyMemberView } from './types'

export function getPartyMembers(gd: GameData): PartyMemberView[] {
  return gd.party.flatMap(charId => {
    const char = gd.characters.get(charId)
    return char ? [{ charId, char }] : []
  })
}
