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

function getTimerStartedFlag(timerId: string): string {
  return `timer_${timerId}_started_at_ms`
}

export function isStateEventAction(action: EventAction): action is StateEventAction {
  return action.type !== 'dialogue'
    && action.type !== 'battle'
    && action.type !== 'transfer'
    && action.type !== 'shop'
    && action.type !== 'training'
    && action.type !== 'rebuildMenu'
}

export function applyStateEventAction(action: EventAction, nowMs = Date.now()): StateEventActionResult {
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
    case 'startTimer':
      gd.setFlag(getTimerStartedFlag(action.timerId), nowMs)
      break
    case 'resolveTimer': {
      const startedAtMs = gd.getFlag(getTimerStartedFlag(action.timerId))
      const elapsedMs = typeof startedAtMs === 'number' ? nowMs - startedAtMs : Number.POSITIVE_INFINITY
      const succeeded = action.requiredFlags.length > 0
        && action.requiredFlags.every(flag => gd.getFlag(flag) === true)
        && elapsedMs >= 0
        && elapsedMs <= action.maxDurationMs
      gd.setFlag(action.successFlag, succeeded)
      break
    }
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
