import { GAME_CONFIG_DATABASE } from '../data/configDatabase'
import { resolveTileSpriteKey } from '../data/tileSprites'
import type { DialogueChoice, EncounterData, EventAction, MapData, MapEvent } from '../data/types'
import { areEventConditionsMet } from '../core/EventConditions'
import { GameData } from '../core/GameData'
import { QuestSystem } from '../core/QuestSystem'
import { RebuildSystem } from '../core/RebuildSystem'
import { SkillGrowth } from '../core/SkillGrowth'
import { getBlockedMapDialogueId } from '../core/MapAccess'
import {
  DEFAULT_EVENT_ACTION_AMOUNT,
  DEFAULT_ITEM_QUANTITY,
  FIELD_EVENT_FLAGS,
  MAINLINE_QA,
  MAINLINE_QA_DIALOGUE_CHOICE_INDEXES,
  MAINLINE_QA_REQUIRED_COMPLETED_QUESTS,
  MAINLINE_QA_REQUIRED_FINAL_FLAGS,
  MAINLINE_QA_REQUIRED_PARTY,
  MAINLINE_QA_ROUTE,
  ROAMING_ENCOUNTER_RESPAWN,
} from '../utils/constants'

type MainlineQaRouteStep = typeof MAINLINE_QA_ROUTE[number]
type MainlineQaStatus = typeof MAINLINE_QA.STATUS_PASSED | typeof MAINLINE_QA.STATUS_FAILED

interface MainlineQaStepReport {
  id: string
  status: MainlineQaStatus
  notes: string[]
}

export interface MainlineQaReport {
  status: MainlineQaStatus
  errors: string[]
  warnings: string[]
  steps: MainlineQaStepReport[]
  finalState: {
    currentMap: string
    party: string[]
    reserve: string[]
    completedQuests: string[]
    activeQuests: string[]
    rebuildLevel: number
    gold: number
    flags: Record<string, unknown>
    branches: Record<string, unknown>
  }
}

class MainlineQaRunner {
  private readonly errors: string[] = []
  private readonly warnings: string[] = []
  private readonly steps: MainlineQaStepReport[] = []
  private readonly choiceUseCounts = new Map<string, number>()
  private readonly dialogueVisitCounts = new Map<string, number>()

  run(): MainlineQaReport {
    const gd = GameData.getInstance()
    gd.reset()
    gd.settings.encounterRate = 'none'

    this.validateConfig()

    for (const step of MAINLINE_QA_ROUTE) {
      this.runStep(step)
    }

    this.assertFinalState()

    return {
      status: this.errors.length > 0 ? MAINLINE_QA.STATUS_FAILED : MAINLINE_QA.STATUS_PASSED,
      errors: [...this.errors],
      warnings: [...this.warnings],
      steps: [...this.steps],
      finalState: this.getFinalState(),
    }
  }

  private runStep(step: MainlineQaRouteStep): void {
    const id = step.kind === 'dialogue' ? `dialogue:${step.dialogueId}` : `event:${step.mapId}:${step.eventId}`
    const errorCount = this.errors.length
    const warningCount = this.warnings.length
    if (step.kind === 'dialogue') {
      this.runDialogue(step.dialogueId, id)
    } else {
      this.runEvent(step.mapId, step.eventId, id)
    }
    this.steps.push({
      id,
      status: this.errors.length === errorCount ? MAINLINE_QA.STATUS_PASSED : MAINLINE_QA.STATUS_FAILED,
      notes: [...this.errors.slice(errorCount), ...this.warnings.slice(warningCount)],
    })
  }

  private runEvent(mapId: string, eventId: string, source: string): void {
    const map = GAME_CONFIG_DATABASE.getTable('maps')[mapId]
    if (!map) {
      this.addError(`${source}: Map ${mapId} not found`)
      return
    }

    const event = map.events.find(candidate => candidate.id === eventId)
    if (!event) {
      this.addError(`${source}: Event ${eventId} not found on ${mapId}`)
      return
    }

    const gd = GameData.getInstance()
    gd.currentMap = mapId
    gd.playerPosition = { x: event.x, y: event.y }

    if (!areEventConditionsMet(event.conditions, flag => gd.getFlag(flag))) {
      this.addError(`${source}: Event conditions are not met`)
      return
    }

    if (event.type === 'chest') {
      gd.setFlag(`${FIELD_EVENT_FLAGS.CHEST_OPENED_PREFIX}${event.id}`, true)
    }

    this.executeActions(event.actions, source, event.id)

    if (event.type !== 'npc' && event.type !== 'battle' && event.type !== 'transfer') {
      gd.setFlag(`${FIELD_EVENT_FLAGS.DONE_PREFIX}${event.id}`, true)
    }
  }

  private runDialogue(dialogueId: string, source: string): void {
    const completionActions = this.collectDialogueCompletionActions(dialogueId, source)
    this.executeActions(this.getUniqueActions(completionActions), `${source}:onComplete`)
  }

  private collectDialogueCompletionActions(dialogueId: string, source: string): EventAction[] {
    const visits = (this.dialogueVisitCounts.get(dialogueId) ?? 0) + 1
    this.dialogueVisitCounts.set(dialogueId, visits)
    if (visits > MAINLINE_QA.MAX_DIALOGUE_VISITS) {
      this.addError(`${source}: Dialogue ${dialogueId} exceeded visit limit`)
      return []
    }

    const dialogue = GAME_CONFIG_DATABASE.getTable('dialogues')[dialogueId]
    if (!dialogue) {
      this.addError(`${source}: Dialogue ${dialogueId} not found`)
      return []
    }

    const actions: EventAction[] = []
    for (const line of dialogue.lines) {
      const choice = this.pickChoice(dialogueId, line.choices, source)
      if (!choice) continue
      this.applyImmediateActions(choice.actions, `${source}:choice:${choice.text}`)
      if (choice.next) {
        actions.push(...this.collectDialogueCompletionActions(choice.next, `${source}->${choice.next}`))
      }
    }
    if (dialogue.onComplete) actions.push(...dialogue.onComplete)
    return actions
  }

  private pickChoice(dialogueId: string, choices: DialogueChoice[] | undefined, source: string): DialogueChoice | null {
    if (!choices || choices.length === 0) return null
    const gd = GameData.getInstance()
    const visibleChoices = choices.filter(choice => areEventConditionsMet(choice.condition ? [choice.condition] : undefined, flag => gd.getFlag(flag)))
    if (visibleChoices.length === 0) {
      this.addWarning(`${source}: Dialogue ${dialogueId} has no visible choices`)
      return null
    }

    const configuredChoices = MAINLINE_QA_DIALOGUE_CHOICE_INDEXES[dialogueId] ?? []
    const usedCount = this.choiceUseCounts.get(dialogueId) ?? 0
    this.choiceUseCounts.set(dialogueId, usedCount + 1)
    const configuredIndex = configuredChoices[usedCount] ?? configuredChoices[configuredChoices.length - 1] ?? 0
    if (configuredIndex < 0 || configuredIndex >= visibleChoices.length) {
      this.addError(`${source}: Choice index ${configuredIndex} is invalid for ${dialogueId}`)
      return visibleChoices[0] ?? null
    }
    return visibleChoices[configuredIndex] ?? null
  }

  private executeActions(actions: readonly EventAction[], source: string, mapEventId = ''): void {
    for (const action of actions) {
      switch (action.type) {
        case 'dialogue':
          this.runDialogue(action.dialogueId, `${source}:dialogue:${action.dialogueId}`)
          break
        case 'battle':
          this.applyEncounterVictory(action.encounterId, `${source}:battle:${action.encounterId}`, mapEventId)
          break
        case 'transfer':
          this.transferMap(action.targetMap, action.targetX, action.targetY, source)
          break
        default:
          this.applyStateAction(action, source)
          break
      }
    }
  }

  private applyImmediateActions(actions: readonly EventAction[] | undefined, source: string): void {
    for (const action of actions ?? []) {
      if (action.type === 'dialogue' || action.type === 'battle' || action.type === 'transfer' || action.type === 'shop' || action.type === 'training' || action.type === 'rebuildMenu') {
        this.addWarning(`${source}: Immediate action ${action.type} is skipped by dialogue choice handling`)
        continue
      }
      this.applyStateAction(action, source)
    }
  }

  private applyStateAction(action: EventAction, source: string): void {
    const gd = GameData.getInstance()
    const qs = QuestSystem.getInstance()

    switch (action.type) {
      case 'questStart':
        qs.startQuest(action.questId)
        break
      case 'questAdvance':
        qs.advanceQuest(action.questId, action.amount ?? DEFAULT_EVENT_ACTION_AMOUNT)
        break
      case 'questComplete':
        qs.completeQuest(action.questId)
        SkillGrowth.getInstance().checkAllUnlocks()
        break
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
      case 'addParty':
        gd.addPartyMember(action.characterId)
        SkillGrowth.getInstance().checkAllUnlocks()
        break
      case 'rebuild':
        RebuildSystem.getInstance().setLevel(Math.max(gd.rebuildLevel, action.level))
        SkillGrowth.getInstance().checkAllUnlocks()
        break
      case 'shop':
      case 'training':
      case 'rebuildMenu':
        this.addWarning(`${source}: Interactive action ${action.type} was skipped`)
        break
      default:
        break
    }
  }

  private applyEncounterVictory(encounterId: string, source: string, mapEventId = ''): void {
    const encounter = GAME_CONFIG_DATABASE.getTable('encounters')[encounterId]
    if (!encounter) {
      this.addError(`${source}: Encounter ${encounterId} not found`)
      return
    }

    const gd = GameData.getInstance()
    let totalExp = 0
    let totalGold = 0
    for (const enemyId of encounter.enemies) {
      const enemy = GAME_CONFIG_DATABASE.getTable('enemies')[enemyId]
      if (!enemy) {
        this.addError(`${source}: Enemy ${enemyId} not found`)
        continue
      }
      gd.setFlag(`defeated_${enemy.id}`, true)
      totalExp += enemy.exp
      totalGold += enemy.gold
    }
    gd.gainPartyExperience(totalExp)
    gd.addGold(totalGold)

    if (encounter.victoryFlag) {
      gd.setFlag(encounter.victoryFlag, true)
    }

    if (encounter.questId && encounter.questProgress) {
      const qs = QuestSystem.getInstance()
      if (!qs.isQuestActive(encounter.questId) && !qs.isQuestCompleted(encounter.questId)) {
        this.addWarning(`${source}: Encounter ${encounterId} auto-started quest ${encounter.questId}`)
        qs.startQuest(encounter.questId)
      }
      if (encounter.questProgress === 'complete') {
        qs.completeQuest(encounter.questId)
      } else {
        qs.advanceQuest(encounter.questId)
      }
    }

    for (const reward of encounter.rewards ?? []) {
      if (reward.itemId) gd.addItem(reward.itemId, reward.itemQty ?? DEFAULT_ITEM_QUANTITY)
      if (reward.flag) gd.setFlag(reward.flag, reward.value ?? true)
      if (reward.branch) gd.updateBranch(reward.branch, reward.branchValue ?? true)
    }

    if (mapEventId) {
      gd.setFlag(`${ROAMING_ENCOUNTER_RESPAWN.DEFEATED_FLAG_PREFIX}${mapEventId}`, true)
    }

    SkillGrowth.getInstance().checkAllUnlocks()
  }

  private transferMap(mapId: string, x: number, y: number, source: string): void {
    const map = GAME_CONFIG_DATABASE.getTable('maps')[mapId]
    if (!map) {
      this.addError(`${source}: Transfer target map ${mapId} not found`)
      return
    }
    if (x < 0 || y < 0 || x >= map.width || y >= map.height) {
      this.addError(`${source}: Transfer target ${mapId}(${x}, ${y}) is out of bounds`)
      return
    }
    const gd = GameData.getInstance()
    const blockedDialogueId = getBlockedMapDialogueId(mapId, flag => gd.getFlag(flag))
    if (blockedDialogueId) {
      this.addError(`${source}: Transfer to ${mapId} is blocked by ${blockedDialogueId}`)
      return
    }
    gd.currentMap = mapId
    gd.playerPosition = { x, y }
  }

  private hasConfiguredImageAsset(key: string, imageAssets: Record<string, string>): boolean {
    return Boolean(imageAssets[key]) || Object.keys(imageAssets).some(assetKey => assetKey.startsWith(`${key}_`))
  }

  private validateMapPresentation(mapId: string, map: MapData): void {
    const tables = GAME_CONFIG_DATABASE
    const tileSprites = tables.getTable('tileSprites')
    const imageAssets = tables.getTable('imageAssets')
    const bgmTracks = tables.getTable('bgmTracks')
    const mapBgm = tables.getTable('mapBgm')
    if (!bgmTracks[map.bgm]) this.addError(`config:${mapId}: BGM ${map.bgm} not found`)
    const fallbackBgm = mapBgm[mapId]
    if (fallbackBgm && !bgmTracks[fallbackBgm]) this.addError(`config:${mapId}: fallback BGM ${fallbackBgm} not found`)
    if (map.battleBackground && !imageAssets[map.battleBackground]) {
      this.addError(`config:${mapId}: Battle background ${map.battleBackground} has no image asset`)
    }

    const checkedTiles = new Set<number>()
    for (const layer of map.layers) {
      for (const tileId of layer.data) {
        if (!tileId || checkedTiles.has(tileId)) continue
        checkedTiles.add(tileId)
        const spriteKey = resolveTileSpriteKey(tileSprites, map.tileset, tileId)
        if (!spriteKey) {
          this.addError(`config:${mapId}: Tile ${tileId} has no sprite mapping`)
        } else if (!imageAssets[spriteKey]) {
          this.addError(`config:${mapId}: Tile ${tileId} sprite ${spriteKey} has no image asset`)
        }
      }
    }

    for (const event of map.events) {
      if (event.sprite && !this.hasConfiguredImageAsset(event.sprite, imageAssets)) {
        this.addError(`config:${mapId}:${event.id}: Sprite ${event.sprite} has no image asset`)
      }
    }
  }

  private validateEncounterPresentation(encounterId: string, encounter: EncounterData): void {
    const tables = GAME_CONFIG_DATABASE
    const bgmTracks = tables.getTable('bgmTracks')
    const imageAssets = tables.getTable('imageAssets')
    if (!bgmTracks[encounter.bgm]) this.addError(`config:${encounterId}: BGM ${encounter.bgm} not found`)
    if (encounter.background && !imageAssets[encounter.background]) {
      this.addError(`config:${encounterId}: Battle background ${encounter.background} has no image asset`)
    }
  }

  private validateConfig(): void {
    const tables = GAME_CONFIG_DATABASE
    for (const [mapId, map] of Object.entries(tables.getTable('maps'))) {
      const expectedTileCount = map.width * map.height
      this.validateMapPresentation(mapId, map)
      for (const layer of map.layers) {
        if (layer.data.length !== expectedTileCount) {
          this.addError(`config:${mapId}: Layer ${layer.name} has ${layer.data.length} tiles, expected ${expectedTileCount}`)
        }
      }
      for (const event of map.events) {
        this.validateEvent(mapId, event)
      }
      for (const connection of map.connections) {
        const target = tables.getTable('maps')[connection.targetMap]
        if (!target) {
          this.addError(`config:${mapId}: Connection target ${connection.targetMap} not found`)
        } else if (connection.targetX < 0 || connection.targetY < 0 || connection.targetX >= target.width || connection.targetY >= target.height) {
          this.addError(`config:${mapId}: Connection target ${connection.targetMap}(${connection.targetX}, ${connection.targetY}) is out of bounds`)
        }
      }
    }

    for (const [dialogueId, dialogue] of Object.entries(tables.getTable('dialogues'))) {
      for (const line of dialogue.lines) {
        for (const choice of line.choices ?? []) {
          if (choice.next && !tables.getTable('dialogues')[choice.next]) {
            this.addError(`config:${dialogueId}: Choice target ${choice.next} not found`)
          }
          this.validateActions(choice.actions ?? [], `config:${dialogueId}:choice:${choice.text}`)
        }
      }
      this.validateActions(dialogue.onComplete ?? [], `config:${dialogueId}:onComplete`)
    }

    for (const [encounterId, encounter] of Object.entries(tables.getTable('encounters'))) {
      this.validateEncounterPresentation(encounterId, encounter)
      for (const enemyId of encounter.enemies) {
        if (!tables.getTable('enemies')[enemyId]) this.addError(`config:${encounterId}: Enemy ${enemyId} not found`)
      }
      if (encounter.questId && !tables.getTable('quests')[encounter.questId]) {
        this.addError(`config:${encounterId}: Quest ${encounter.questId} not found`)
      }
      this.validateActions(encounter.rewards?.map(reward => reward.itemId
        ? { type: 'addItem', itemId: reward.itemId, quantity: reward.itemQty ?? DEFAULT_ITEM_QUANTITY }
        : reward.flag
          ? { type: 'setFlag', flag: reward.flag, value: reward.value ?? true }
          : { type: 'setBranch', branch: reward.branch!, value: reward.branchValue ?? true }) as EventAction[] ?? [], `config:${encounterId}:rewards`)
    }
  }

  private validateEvent(mapId: string, event: MapEvent): void {
    const map = GAME_CONFIG_DATABASE.getTable('maps')[mapId]
    if (!map) {
      this.addError(`config:${mapId}:${event.id}: Map not found`)
      return
    }
    if (event.x < 0 || event.y < 0 || event.width <= 0 || event.height <= 0 || event.x + event.width > map.width || event.y + event.height > map.height) {
      this.addError(`config:${mapId}:${event.id}: Event bounds are out of map`)
    }
    this.validateActions(event.actions, `config:${mapId}:${event.id}`)
  }

  private validateActions(actions: readonly EventAction[], source: string): void {
    const tables = GAME_CONFIG_DATABASE
    for (const action of actions) {
      switch (action.type) {
        case 'dialogue':
          if (!tables.getTable('dialogues')[action.dialogueId]) this.addError(`${source}: Dialogue ${action.dialogueId} not found`)
          break
        case 'battle':
          if (!tables.getTable('encounters')[action.encounterId]) this.addError(`${source}: Encounter ${action.encounterId} not found`)
          break
        case 'transfer': {
          const target = tables.getTable('maps')[action.targetMap]
          if (!target) {
            this.addError(`${source}: Transfer target ${action.targetMap} not found`)
          } else if (action.targetX < 0 || action.targetY < 0 || action.targetX >= target.width || action.targetY >= target.height) {
            this.addError(`${source}: Transfer target ${action.targetMap}(${action.targetX}, ${action.targetY}) is out of bounds`)
          }
          break
        }
        case 'questStart':
        case 'questAdvance':
        case 'questComplete':
          if (!tables.getTable('quests')[action.questId]) this.addError(`${source}: Quest ${action.questId} not found`)
          break
        case 'addItem':
          if (!tables.getTable('items')[action.itemId]) this.addError(`${source}: Item ${action.itemId} not found`)
          break
        case 'addParty':
        case 'adjustTrust':
          if (!tables.getTable('characters')[action.characterId]) this.addError(`${source}: Character ${action.characterId} not found`)
          break
        default:
          break
      }
    }
  }

  private assertFinalState(): void {
    const gd = GameData.getInstance()
    for (const flag of MAINLINE_QA_REQUIRED_FINAL_FLAGS) {
      if (gd.getFlag(flag) !== true) this.addError(`final: Required flag ${flag} is not true`)
    }
    for (const questId of MAINLINE_QA_REQUIRED_COMPLETED_QUESTS) {
      if (!QuestSystem.getInstance().isQuestCompleted(questId)) this.addError(`final: Quest ${questId} is not completed`)
    }
    for (const characterId of MAINLINE_QA_REQUIRED_PARTY) {
      if (!gd.party.includes(characterId) && !gd.reserve.includes(characterId)) {
        this.addError(`final: Party member ${characterId} is missing`)
      }
    }
  }

  private getFinalState(): MainlineQaReport['finalState'] {
    const gd = GameData.getInstance()
    const quests = Array.from(gd.quests.values())
    return {
      currentMap: gd.currentMap,
      party: [...gd.party],
      reserve: [...gd.reserve],
      completedQuests: quests.filter(quest => quest.status === 'completed').map(quest => quest.id),
      activeQuests: quests.filter(quest => quest.status === 'active').map(quest => quest.id),
      rebuildLevel: gd.rebuildLevel,
      gold: gd.gold,
      flags: { ...gd.flags },
      branches: { ...gd.branches },
    }
  }

  private getUniqueActions(actions: readonly EventAction[]): EventAction[] {
    const uniqueActions: EventAction[] = []
    const seen = new Set<string>()
    for (const action of actions) {
      const key = JSON.stringify(action)
      if (seen.has(key)) continue
      seen.add(key)
      uniqueActions.push(action)
    }
    return uniqueActions
  }

  private addError(message: string): void {
    this.errors.push(message)
  }

  private addWarning(message: string): void {
    this.warnings.push(message)
  }
}

export function isMainlineQaRequested(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get(MAINLINE_QA.QUERY_PARAM) === MAINLINE_QA.QUERY_VALUE
}

export function isBattleVisualQaRequested(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get(MAINLINE_QA.QUERY_PARAM) === MAINLINE_QA.BATTLE_QUERY_VALUE
}

export function prepareBattleVisualQa(): void {
  const gd = GameData.getInstance()
  gd.reset()
  gd.currentMap = MAINLINE_QA.BATTLE_VISUAL_MAP_ID
  gd.settings.encounterRate = 'none'
  gd.settings.difficulty = MAINLINE_QA.BATTLE_VISUAL_DIFFICULTY
  gd.settings.battleSpeed = MAINLINE_QA.BATTLE_VISUAL_SPEED
  for (const characterId of MAINLINE_QA.BATTLE_VISUAL_PARTY) {
    gd.addPartyMember(characterId)
  }
  for (const flag of MAINLINE_QA.BATTLE_VISUAL_FLAGS) {
    gd.setFlag(flag, true)
  }
  SkillGrowth.getInstance().checkAllUnlocks()
}

export function runMainlineQa(): MainlineQaReport {
  const report = new MainlineQaRunner().run()
  ;(globalThis as unknown as Record<string, unknown>)[MAINLINE_QA.REPORT_GLOBAL_KEY] = report
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(MAINLINE_QA.REPORT_EVENT, { detail: report }))
  }
  if (report.status === MAINLINE_QA.STATUS_FAILED) {
    console.error('CaskTown mainline QA failed', report)
  } else {
    console.info('CaskTown mainline QA passed', report)
  }
  return report
}
