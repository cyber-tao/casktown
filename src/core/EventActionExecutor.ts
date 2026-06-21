import { GameData } from './GameData'
import { QuestSystem } from './QuestSystem'
import { RebuildSystem } from './RebuildSystem'
import { SkillGrowth } from './SkillGrowth'
import type { EventAction } from '../data/types'
import { DEFAULT_EVENT_ACTION_AMOUNT, DEFAULT_ITEM_QUANTITY } from '../utils/constants'

export type FlowEventAction = Extract<EventAction, { type: 'dialogue' | 'battle' | 'transfer' | 'shop' | 'training' | 'rebuildMenu' }>
export type StateEventAction = Exclude<EventAction, FlowEventAction>

export interface StateEventActionResult {
  handled: boolean
  completedQuestId?: string
  partyChanged: boolean
  failureReason?: string
}

export function isStateEventAction(action: EventAction): action is StateEventAction {
  return action.type !== 'dialogue'
    && action.type !== 'battle'
    && action.type !== 'transfer'
    && action.type !== 'shop'
    && action.type !== 'training'
    && action.type !== 'rebuildMenu'
}

export function applyStateEventAction(action: EventAction): StateEventActionResult {
  if (!isStateEventAction(action)) {
    return { handled: false, partyChanged: false }
  }

  const gd = GameData.getInstance()
  const qs = QuestSystem.getInstance()
  const result: StateEventActionResult = { handled: true, partyChanged: false }

  switch (action.type) {
    case 'questStart':
      qs.startQuest(action.questId)
      break
    case 'questAdvance': {
      const wasCompleted = qs.isQuestCompleted(action.questId)
      qs.advanceQuest(action.questId, action.amount ?? DEFAULT_EVENT_ACTION_AMOUNT)
      if (!wasCompleted && qs.isQuestCompleted(action.questId)) {
        result.completedQuestId = action.questId
        SkillGrowth.getInstance().checkAllUnlocks()
      }
      break
    }
    case 'questComplete': {
      const wasCompleted = qs.isQuestCompleted(action.questId)
      qs.completeQuest(action.questId)
      if (!wasCompleted && qs.isQuestCompleted(action.questId)) {
        result.completedQuestId = action.questId
      }
      SkillGrowth.getInstance().checkAllUnlocks()
      break
    }
    case 'setFlag':
      gd.setFlag(action.flag, action.value)
      SkillGrowth.getInstance().checkAllUnlocks()
      break
    case 'setBranch':
      gd.updateBranch(action.branch, action.value)
      SkillGrowth.getInstance().checkAllUnlocks()
      break
    case 'adjustTrust':
      gd.adjustTrust(action.characterId, action.amount ?? DEFAULT_EVENT_ACTION_AMOUNT)
      break
    case 'adjustMercy':
      gd.adjustMercy(action.amount ?? DEFAULT_EVENT_ACTION_AMOUNT)
      break
    case 'addItem':
      gd.addItem(action.itemId, action.quantity ?? DEFAULT_ITEM_QUANTITY)
      break
    case 'removeItem':
      if (!gd.removeItem(action.itemId, action.quantity ?? DEFAULT_ITEM_QUANTITY)) {
        result.failureReason = `Missing item ${action.itemId}`
      }
      break
    case 'addParty':
      gd.addPartyMember(action.characterId)
      result.partyChanged = true
      SkillGrowth.getInstance().checkAllUnlocks()
      break
    case 'removeParty':
      result.partyChanged = gd.removePartyMember(action.characterId)
      break
    case 'rebuild':
      RebuildSystem.getInstance().setLevel(Math.max(gd.rebuildLevel, action.level))
      SkillGrowth.getInstance().checkAllUnlocks()
      break
  }

  return result
}
