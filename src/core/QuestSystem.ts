import { EventBus, GameEvents } from './EventBus'
import { GameData } from './GameData'
import { RebuildSystem } from './RebuildSystem'
import { SkillGrowth } from './SkillGrowth'
import { GAME_CONFIG_DATABASE } from '../data/configDatabase'
import type { QuestState } from '../data/types'
import { DEFAULT_ITEM_QUANTITY } from '../utils/constants'

export type QuestMutationResult =
  | { ok: true; questId: string; state?: QuestState }
  | { ok: false; questId: string; reason: string }

export class QuestSystem {
  private static instance: QuestSystem

  static getInstance(): QuestSystem {
    if (!QuestSystem.instance) {
      QuestSystem.instance = new QuestSystem()
    }
    return QuestSystem.instance
  }

  startQuest(questId: string): QuestMutationResult {
    const gd = GameData.getInstance()
    const def = GAME_CONFIG_DATABASE.getTable('quests')[questId]
    if (!def) {
      console.warn(`Quest ${questId} not found`)
      return { ok: false, questId, reason: 'Quest definition not found' }
    }
    if (gd.quests.has(questId)) {
      const state = gd.quests.get(questId)!
      if (state.status === 'active' || state.status === 'completed') {
        return { ok: true, questId, state }
      }
    }
    const state: QuestState = {
      id: questId,
      status: 'active',
      progress: 0,
      maxProgress: def.objectives.length,
    }
    gd.quests.set(questId, state)
    EventBus.emit(GameEvents.QUEST_UPDATE, questId, state)
    return { ok: true, questId, state }
  }

  advanceQuest(questId: string, amount = 1): QuestMutationResult {
    if (!Number.isFinite(amount) || amount <= 0) {
      console.warn(`Cannot advance quest ${questId}: invalid amount ${amount}`)
      return { ok: false, questId, reason: 'Invalid advance amount' }
    }
    const gd = GameData.getInstance()
    const state = gd.quests.get(questId)
    if (!state || state.status !== 'active') {
      console.warn(`Cannot advance quest ${questId}: not active`)
      return { ok: false, questId, reason: 'Quest is not active' }
    }
    state.progress = Math.min(state.maxProgress, state.progress + amount)
    if (state.progress >= state.maxProgress) {
      return this.completeQuest(questId)
    }
    EventBus.emit(GameEvents.QUEST_UPDATE, questId, state)
    return { ok: true, questId, state }
  }

  completeQuest(questId: string): QuestMutationResult {
    const gd = GameData.getInstance()
    const state = gd.quests.get(questId)
    if (!state) {
      console.warn(`Cannot complete quest ${questId}: missing state`)
      return { ok: false, questId, reason: 'Quest state missing' }
    }
    if (state.status === 'completed') {
      return { ok: true, questId, state }
    }
    state.status = 'completed'
    state.progress = state.maxProgress

    const def = GAME_CONFIG_DATABASE.getTable('quests')[questId]
    if (def?.rewards) {
      for (const reward of def.rewards) {
        if (reward.exp) {
          gd.gainPartyExperience(reward.exp)
        }
        if (reward.itemId) {
          gd.addItem(reward.itemId, reward.itemQty ?? DEFAULT_ITEM_QUANTITY)
        }
        if (reward.flag) {
          gd.setFlag(reward.flag, reward.value ?? true)
        }
        if (reward.rebuild) {
          RebuildSystem.getInstance().setLevel(reward.rebuild)
        }
      }
    }
    SkillGrowth.getInstance().checkAllUnlocks()
    EventBus.emit(GameEvents.QUEST_UPDATE, questId, state)
    return { ok: true, questId, state }
  }

  failQuest(questId: string): QuestMutationResult {
    const gd = GameData.getInstance()
    const state = gd.quests.get(questId)
    if (!state || state.status !== 'active') {
      console.warn(`Cannot fail quest ${questId}: not active`)
      return { ok: false, questId, reason: 'Quest is not active' }
    }
    state.status = 'failed'
    EventBus.emit(GameEvents.QUEST_UPDATE, questId, state)
    return { ok: true, questId, state }
  }

  getActiveQuests(): QuestState[] {
    const gd = GameData.getInstance()
    return Array.from(gd.quests.values()).filter(q => q.status === 'active')
  }

  getCompletedQuests(): QuestState[] {
    const gd = GameData.getInstance()
    return Array.from(gd.quests.values()).filter(q => q.status === 'completed')
  }

  isQuestActive(questId: string): boolean {
    const gd = GameData.getInstance()
    const state = gd.quests.get(questId)
    return state?.status === 'active'
  }

  isQuestCompleted(questId: string): boolean {
    const gd = GameData.getInstance()
    const state = gd.quests.get(questId)
    return state?.status === 'completed'
  }

  getQuestState(questId: string): QuestState | undefined {
    return GameData.getInstance().quests.get(questId)
  }
}
