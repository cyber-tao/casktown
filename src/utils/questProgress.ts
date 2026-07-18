import type { QuestDef, QuestState } from '../data/types'

export interface QuestProgressDisplay {
  objective: string
  progress: number
  maxProgress: number
}

export function resolveQuestProgressDisplay(
  quest: QuestDef,
  state: QuestState,
  getFlag: (flag: string) => unknown,
): QuestProgressDisplay {
  const fallbackObjectiveIndex = Math.min(state.progress, quest.objectives.length - 1)
  const fallback = {
    objective: quest.objectives[fallbackObjectiveIndex] ?? quest.description,
    progress: state.progress,
    maxProgress: state.maxProgress,
  }
  if (quest.objectiveFlags?.length !== quest.objectives.length) return fallback

  const completed = quest.objectiveFlags.map(flag => getFlag(flag) === true)
  const progress = completed.filter(Boolean).length
  const nextObjectiveIndex = completed.findIndex(value => !value)
  return {
    objective: quest.objectives[nextObjectiveIndex < 0 ? quest.objectives.length - 1 : nextObjectiveIndex] ?? quest.description,
    progress: state.status === 'completed' ? state.maxProgress : progress,
    maxProgress: state.maxProgress,
  }
}
