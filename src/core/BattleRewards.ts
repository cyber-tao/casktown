import { GameData, type LevelUpResult } from './GameData'
import { QuestSystem } from './QuestSystem'
import { SkillGrowth } from './SkillGrowth'
import { GAME_CONFIG_DATABASE } from '../data/configDatabase'
import type { EncounterData, EnemyData } from '../data/types'
import { DEFAULT_ITEM_QUANTITY, ROAMING_ENCOUNTER_RESPAWN } from '../utils/constants'

export interface AppliedItemReward {
  itemId: string
  quantity: number
}

export interface EncounterVictoryRewardResult {
  encounter?: EncounterData
  missingEnemyIds: string[]
  defeatedEnemyIds: string[]
  totalExp: number
  totalGold: number
  levelUps: LevelUpResult[]
  victoryFlag?: string
  questAutoStarted: boolean
  questProgress?: 'advanced' | 'completed'
  itemRewards: AppliedItemReward[]
  flagRewards: string[]
  branchRewards: string[]
  dropRewards: AppliedItemReward[]
  mapEventDefeatedFlag?: string
  unlockedSkills: Map<string, string[]>
}

export interface EncounterVictoryRewardOptions {
  encounterId: string
  enemies?: readonly EnemyData[]
  expMultiplier?: number
  mapEventId?: string
  defeatedAtMs?: number
  rollDrop?: (rate: number) => boolean
}

function resolveEncounterEnemies(encounter: EncounterData, providedEnemies: readonly EnemyData[] | undefined): { enemies: EnemyData[]; missingEnemyIds: string[] } {
  if (providedEnemies) return { enemies: [...providedEnemies], missingEnemyIds: [] }

  const enemyTable = GAME_CONFIG_DATABASE.getTable('enemies')
  const enemies: EnemyData[] = []
  const missingEnemyIds: string[] = []
  for (const enemyId of encounter.enemies) {
    const enemy = enemyTable[enemyId]
    if (enemy) enemies.push(enemy)
    else missingEnemyIds.push(enemyId)
  }
  return { enemies, missingEnemyIds }
}

export function applyEncounterVictoryRewards(options: EncounterVictoryRewardOptions): EncounterVictoryRewardResult {
  const encounter = GAME_CONFIG_DATABASE.getTable('encounters')[options.encounterId]
  const result: EncounterVictoryRewardResult = {
    encounter,
    missingEnemyIds: [],
    defeatedEnemyIds: [],
    totalExp: 0,
    totalGold: 0,
    levelUps: [],
    questAutoStarted: false,
    itemRewards: [],
    flagRewards: [],
    branchRewards: [],
    dropRewards: [],
    unlockedSkills: new Map(),
  }
  if (!encounter) return result

  const gd = GameData.getInstance()
  const { enemies, missingEnemyIds } = resolveEncounterEnemies(encounter, options.enemies)
  result.missingEnemyIds = missingEnemyIds

  for (const enemy of enemies) {
    gd.setFlag(`defeated_${enemy.id}`, true)
    result.defeatedEnemyIds.push(enemy.id)
    result.totalExp += enemy.exp
    result.totalGold += enemy.gold
  }

  result.totalExp = Math.floor(result.totalExp * (options.expMultiplier ?? 1))
  gd.addGold(result.totalGold)
  result.levelUps = gd.gainPartyExperience(result.totalExp)

  const qs = QuestSystem.getInstance()
  if (encounter.victoryFlag) {
    gd.setFlag(encounter.victoryFlag, true)
    result.victoryFlag = encounter.victoryFlag
  }

  if (encounter.questId && encounter.questProgress) {
    if (!qs.isQuestActive(encounter.questId) && !qs.isQuestCompleted(encounter.questId)) {
      qs.startQuest(encounter.questId)
      result.questAutoStarted = true
    }
    if (encounter.questProgress === 'complete') {
      qs.completeQuest(encounter.questId)
      result.questProgress = 'completed'
    } else {
      qs.advanceQuest(encounter.questId)
      result.questProgress = 'advanced'
    }
  }

  for (const reward of encounter.rewards ?? []) {
    if (reward.itemId) {
      const quantity = reward.itemQty ?? DEFAULT_ITEM_QUANTITY
      gd.addItem(reward.itemId, quantity)
      result.itemRewards.push({ itemId: reward.itemId, quantity })
    }
    if (reward.flag) {
      gd.setFlag(reward.flag, reward.value ?? true)
      result.flagRewards.push(reward.flag)
    }
    if (reward.branch) {
      gd.updateBranch(reward.branch, reward.branchValue ?? true)
      result.branchRewards.push(reward.branch)
    }
  }

  if (options.mapEventId) {
    const defeatedFlag = `${ROAMING_ENCOUNTER_RESPAWN.DEFEATED_FLAG_PREFIX}${options.mapEventId}`
    gd.setFlag(defeatedFlag, true)
    result.mapEventDefeatedFlag = defeatedFlag
    if (options.mapEventId.startsWith(ROAMING_ENCOUNTER_RESPAWN.EVENT_ID_PREFIX)) {
      gd.setFlag(`${ROAMING_ENCOUNTER_RESPAWN.DEFEATED_AT_FLAG_PREFIX}${options.mapEventId}`, options.defeatedAtMs ?? Date.now())
    }
  }

  if (options.rollDrop) {
    for (const enemy of enemies) {
      for (const drop of enemy.drops) {
        if (!options.rollDrop(drop.rate)) continue
        gd.addItem(drop.itemId, DEFAULT_ITEM_QUANTITY)
        result.dropRewards.push({ itemId: drop.itemId, quantity: DEFAULT_ITEM_QUANTITY })
      }
    }
  }

  result.unlockedSkills = SkillGrowth.getInstance().checkAllUnlocks()
  return result
}
