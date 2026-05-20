import { EventBus, GameEvents } from './EventBus'
import { GameData } from './GameData'
import { RebuildSystem } from './RebuildSystem'
import { GAME_CONFIG_DATABASE } from '../data/configDatabase'
import type { QuestState } from '../data/types'

export class QuestSystem {
  private static instance: QuestSystem

  static getInstance(): QuestSystem {
    if (!QuestSystem.instance) {
      QuestSystem.instance = new QuestSystem()
    }
    return QuestSystem.instance
  }

  startQuest(questId: string): void {
    const gd = GameData.getInstance()
    const def = GAME_CONFIG_DATABASE.getTable('quests')[questId]
    if (!def) {
      console.warn(`Quest ${questId} not found`)
      return
    }
    if (gd.quests.has(questId)) {
      const state = gd.quests.get(questId)!
      if (state.status === 'active' || state.status === 'completed') return
    }
    const state: QuestState = {
      id: questId,
      status: 'active',
      progress: 0,
      maxProgress: def.objectives.length,
    }
    gd.quests.set(questId, state)
    EventBus.emit(GameEvents.QUEST_UPDATE, questId, state)
  }

  advanceQuest(questId: string, amount = 1): void {
    const gd = GameData.getInstance()
    const state = gd.quests.get(questId)
    if (!state || state.status !== 'active') return
    state.progress = Math.min(state.maxProgress, state.progress + amount)
    if (state.progress >= state.maxProgress) {
      this.completeQuest(questId)
    } else {
      EventBus.emit(GameEvents.QUEST_UPDATE, questId, state)
    }
  }

  completeQuest(questId: string): void {
    const gd = GameData.getInstance()
    const state = gd.quests.get(questId)
    if (!state) return
    if (state.status === 'completed') return
    state.status = 'completed'
    state.progress = state.maxProgress
    EventBus.emit(GameEvents.QUEST_UPDATE, questId, state)

    const def = GAME_CONFIG_DATABASE.getTable('quests')[questId]
    if (def?.rewards) {
      for (const reward of def.rewards) {
        if (reward.exp) {
          for (const id of gd.party) {
            const char = gd.characters.get(id)
            if (char) {
              char.stats.exp += reward.exp
              if (char.stats.exp >= char.stats.expToNext) {
                char.stats.level++
                char.stats.exp -= char.stats.expToNext
                char.stats.expToNext = Math.floor(char.stats.expToNext * 1.5)
              }
            }
          }
        }
        if (reward.itemId) {
          gd.addItem(reward.itemId, reward.itemQty || 1)
        }
        if (reward.flag) {
          gd.setFlag(reward.flag, reward.value ?? true)
        }
        if (reward.rebuild) {
          RebuildSystem.getInstance().addProgress(reward.rebuild)
        }
      }
    }
  }

  failQuest(questId: string): void {
    const gd = GameData.getInstance()
    const state = gd.quests.get(questId)
    if (!state || state.status !== 'active') return
    state.status = 'failed'
    EventBus.emit(GameEvents.QUEST_UPDATE, questId, state)
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
