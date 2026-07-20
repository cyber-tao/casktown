import { GAME_CONFIG_DATABASE } from '../data/configDatabase'
import { resolveTileSpriteKey } from '../data/tileSprites'
import type { BranchState, DialogueChoice, EncounterData, EventAction, MapData, MapEvent, QuestDef } from '../data/types'
import { areEventConditionsMet } from '../core/EventConditions'
import { getUniqueEventActions } from '../core/DialogueCompletionQueue'
import { GameData } from '../core/GameData'
import { QuestSystem } from '../core/QuestSystem'
import { SkillGrowth } from '../core/SkillGrowth'
import { getBlockedMapDialogueId } from '../core/MapAccess'
import { applyEncounterVictoryRewards } from '../core/BattleRewards'
import { getChestOpenedFlag, getFieldEventDoneFlag, isCompletableMapEvent } from '../core/MapEventState'
import { applyStateEventAction } from '../core/EventActionExecutor'
import {
  MAINLINE_QA,
  MAINLINE_QA_DIALOGUE_CHOICE_INDEXES,
  MAINLINE_QA_REQUIRED_BRANCH_THRESHOLDS,
  MAINLINE_QA_REQUIRED_COMPLETED_QUESTS,
  MAINLINE_QA_REQUIRED_FINAL_MAP,
  MAINLINE_QA_REQUIRED_FINAL_FLAGS,
  MAINLINE_QA_REQUIRED_FINAL_ITEMS,
  MAINLINE_QA_REQUIRED_FINAL_REBUILD_LEVEL,
  MAINLINE_QA_REQUIRED_FINAL_SKILLS,
  MAINLINE_QA_REQUIRED_NO_ACTIVE_QUESTS,
  MAINLINE_QA_REQUIRED_PARTY,
  MAINLINE_QA_ROUTE,
  TOUCH_INPUT,
} from '../utils/constants'

type MainlineQaRouteStep =
  | { readonly kind: 'dialogue'; readonly dialogueId: string }
  | { readonly kind: 'event'; readonly mapId: string; readonly eventId: string }
type MainlineQaStatus = typeof MAINLINE_QA.STATUS_PASSED | typeof MAINLINE_QA.STATUS_FAILED
type MainlineQaSummaryElement = Pick<HTMLElement, 'setAttribute'>
type BranchValueType = 'boolean' | 'number' | 'string'

let removeMainlineQaSummaryViewportListeners: (() => void) | null = null

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
  coverage: {
    completedQuestSources: Record<string, string[]>
    mapIds: string[]
    mapEvents: string[]
    dialogueIds: string[]
    encounterIds: string[]
  }
  finalState: {
    currentMap: string
    party: string[]
    reserve: string[]
    completedQuests: string[]
    activeQuests: string[]
    skills: Record<string, string[]>
    items: Record<string, number>
    equipment: Record<string, number>
    rebuildLevel: number
    gold: number
    flags: Record<string, unknown>
    branches: Record<string, unknown>
  }
}

export interface BattleVisualQaConfig {
  encounterId: string
  mapId: string
  flags: readonly string[]
  branches?: Partial<BranchState>
}

export class MainlineQaRunner {
  private readonly errors: string[] = []
  private readonly warnings: string[] = []
  private readonly steps: MainlineQaStepReport[] = []
  private readonly choiceUseCounts = new Map<string, number>()
  private readonly dialogueVisitCounts = new Map<string, number>()
  private readonly completedQuestSources = new Map<string, string[]>()
  private readonly visitedMapIds = new Set<string>()
  private readonly triggeredMapEvents = new Set<string>()
  private readonly completedDialogueIds = new Set<string>()
  private readonly completedEncounterIds = new Set<string>()

  constructor(private readonly route: readonly MainlineQaRouteStep[] = MAINLINE_QA_ROUTE) {}

  run(): MainlineQaReport {
    const gd = GameData.getInstance()
    gd.reset()
    gd.settings.encounterRate = 'none'
    this.visitedMapIds.add(gd.currentMap)

    this.validateConfig()

    for (const step of this.route) {
      this.runStep(step)
    }

    this.assertFinalState()

    return {
      status: this.errors.length > 0 ? MAINLINE_QA.STATUS_FAILED : MAINLINE_QA.STATUS_PASSED,
      errors: [...this.errors],
      warnings: [...this.warnings],
      steps: [...this.steps],
      coverage: this.getCoverage(),
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

    const gd = GameData.getInstance()
    const blockedDialogueId = getBlockedMapDialogueId(mapId, flag => gd.getFlag(flag))
    if (blockedDialogueId) {
      this.addError(`${source}: Map ${mapId} is blocked by ${blockedDialogueId}`)
      return
    }

    const event = map.events.find(candidate => candidate.id === eventId)
    if (!event) {
      this.addError(`${source}: Event ${eventId} not found on ${mapId}`)
      return
    }

    gd.currentMap = mapId
    gd.playerPosition = { x: event.x, y: event.y }
    this.visitedMapIds.add(mapId)
    this.triggeredMapEvents.add(`${mapId}:${event.id}`)

    if (!areEventConditionsMet(event.conditions, flag => gd.getFlag(flag))) {
      this.addError(`${source}: Event conditions are not met`)
      return
    }

    const actionErrorCount = this.errors.length
    this.executeActions(event.actions, source, event.id)

    if (this.errors.length !== actionErrorCount) return

    if (event.type === 'chest') {
      gd.setFlag(getChestOpenedFlag(event.id), true)
    }
    if (isCompletableMapEvent(event)) {
      gd.setFlag(getFieldEventDoneFlag(event.id), true)
    }
  }

  private runDialogue(dialogueId: string, source: string, mapEventId = ''): void {
    const completionActions = this.collectDialogueCompletionActions(dialogueId, source)
    this.executeActions(getUniqueEventActions(completionActions), `${source}:onComplete`, mapEventId)
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
    this.completedDialogueIds.add(dialogueId)
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
          this.runDialogue(action.dialogueId, `${source}:dialogue:${action.dialogueId}`, mapEventId)
          break
        case 'battle':
          this.applyEncounterVictory(action.encounterId, `${source}:battle:${action.encounterId}`, mapEventId)
          break
        case 'transfer':
          this.transferMap(action.targetMap, action.targetX, action.targetY, source)
          break
        default:
          if (!this.applyStateAction(action, source)) return
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
      if (!this.applyStateAction(action, source)) return
    }
  }

  private applyStateAction(action: EventAction, source: string): boolean {
    const result = applyStateEventAction(action)
    if (result.failureReason) {
      this.addError(`${source}: State action ${action.type} failed: ${result.failureReason}`)
      return false
    }
    if (result.completedQuestId) {
      this.recordCompletedQuestSource(result.completedQuestId, source)
    } else if (!result.handled && (action.type === 'shop' || action.type === 'training' || action.type === 'rebuildMenu')) {
      this.addWarning(`${source}: Interactive action ${action.type} was skipped`)
    }
    return true
  }

  private applyEncounterVictory(encounterId: string, source: string, mapEventId = ''): void {
    const rewardResult = applyEncounterVictoryRewards({ encounterId, mapEventId, defeatedAtMs: Date.now() })
    if (!rewardResult.encounter) {
      this.addError(`${source}: Encounter ${encounterId} not found`)
      return
    }
    this.completedEncounterIds.add(encounterId)

    for (const enemyId of rewardResult.missingEnemyIds) {
      this.addError(`${source}: Enemy ${enemyId} not found`)
    }

    if (rewardResult.questAutoStarted && rewardResult.encounter.questId) {
      this.addWarning(`${source}: Encounter ${encounterId} auto-started quest ${rewardResult.encounter.questId}`)
    }
    if (
      rewardResult.questProgress === 'completed' &&
      rewardResult.encounter.questId &&
      QuestSystem.getInstance().isQuestCompleted(rewardResult.encounter.questId)
    ) {
      this.recordCompletedQuestSource(rewardResult.encounter.questId, source)
    }
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
    this.visitedMapIds.add(mapId)
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
      for (const reward of encounter.rewards ?? []) {
        this.validateEncounterReward(reward, `config:${encounterId}:rewards`)
      }
    }

    for (const [questId, quest] of Object.entries(tables.getTable('quests'))) {
      for (const reward of quest.rewards ?? []) {
        this.validateQuestReward(reward, `config:${questId}:rewards`)
      }
    }
  }

  private validateEncounterReward(reward: NonNullable<EncounterData['rewards']>[number], source: string): void {
    const tables = GAME_CONFIG_DATABASE
    if (reward.itemId && !tables.getTable('items')[reward.itemId]) {
      this.addError(`${source}: Item ${reward.itemId} not found`)
    }
    this.validatePositiveNumber(reward.itemQty, `${source}: Item quantity`, 'must be positive')
    if (reward.flag) {
      this.validateBranchBackedFlagValue(reward.flag, reward.value ?? true, `${source}:flag:${reward.flag}`)
    }
    if (reward.branch) {
      this.validateBranchValue(reward.branch, reward.branchValue ?? true, `${source}:branch:${reward.branch}`)
    }
  }

  private validateQuestReward(reward: NonNullable<QuestDef['rewards']>[number], source: string): void {
    const tables = GAME_CONFIG_DATABASE
    if (reward.itemId && !tables.getTable('items')[reward.itemId]) {
      this.addError(`${source}: Item ${reward.itemId} not found`)
    }
    this.validateNonNegativeNumber(reward.exp, `${source}: Exp reward`)
    this.validatePositiveNumber(reward.itemQty, `${source}: Item quantity`, 'must be positive')
    this.validateNonNegativeNumber(reward.rebuild, `${source}: Rebuild reward`)
    if (reward.flag) {
      this.validateBranchBackedFlagValue(reward.flag, reward.value ?? true, `${source}:flag:${reward.flag}`)
    }
  }

  private validateNonNegativeNumber(value: number | undefined, source: string): void {
    if (value === undefined) return
    if (!Number.isFinite(value) || value < 0) {
      this.addError(`${source} ${value} must be a finite non-negative number`)
    }
  }

  private validatePositiveNumber(value: number | undefined, source: string, suffix: string): void {
    if (value === undefined) return
    if (!Number.isFinite(value) || value <= 0) {
      this.addError(`${source} ${value} ${suffix}`)
    }
  }

  private validateBranchBackedFlagValue(flag: string, value: unknown, source: string): void {
    if (!(flag in GameData.getInstance().branches)) return
    this.validateBranchValue(flag, value, source)
  }

  private validateBranchValue(branch: string, value: unknown, source: string): void {
    const branches = GameData.getInstance().branches as unknown as Record<string, unknown>
    if (!(branch in branches)) {
      this.addError(`${source}: Branch ${branch} not found`)
      return
    }

    const expectedType = typeof branches[branch] as BranchValueType
    if (typeof value !== expectedType) {
      this.addError(`${source}: Branch ${branch} value must be ${expectedType}, got ${typeof value}`)
      return
    }
    if (expectedType === 'number' && !Number.isFinite(value)) {
      this.addError(`${source}: Branch ${branch} value must be finite`)
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
          if (action.type === 'questAdvance') {
            this.validatePositiveNumber(action.amount, `${source}: Quest advance amount`, 'must be positive')
          }
          break
        case 'setFlag':
          this.validateBranchBackedFlagValue(action.flag, action.value, `${source}:setFlag:${action.flag}`)
          break
        case 'setBranch':
          this.validateBranchValue(action.branch, action.value, `${source}:setBranch:${action.branch}`)
          break
        case 'startTimer':
          if (!action.timerId) this.addError(`${source}: Timer id is empty`)
          break
        case 'resolveTimer':
          if (!action.timerId || action.requiredFlags.length === 0 || action.requiredFlags.some(flag => !flag) || !action.successFlag) {
            this.addError(`${source}: Timer resolution fields are empty`)
          }
          this.validatePositiveNumber(action.maxDurationMs, `${source}: Timer duration`, 'must be positive')
          break
        case 'addItem':
          if (!tables.getTable('items')[action.itemId]) this.addError(`${source}: Item ${action.itemId} not found`)
          this.validatePositiveNumber(action.quantity, `${source}: Item quantity`, 'must be positive')
          break
        case 'removeItem':
          if (!tables.getTable('items')[action.itemId]) this.addError(`${source}: Item ${action.itemId} not found`)
          this.validatePositiveNumber(action.quantity, `${source}: Item quantity`, 'must be positive')
          break
        case 'addParty':
        case 'removeParty':
        case 'adjustTrust':
          if (!tables.getTable('characters')[action.characterId]) this.addError(`${source}: Character ${action.characterId} not found`)
          break
        case 'rebuild':
          this.validateNonNegativeNumber(action.level, `${source}: Rebuild level`)
          break
        default:
          break
      }
    }
  }

  private assertFinalState(): void {
    const gd = GameData.getInstance()
    const questSystem = QuestSystem.getInstance()
    if (gd.currentMap !== MAINLINE_QA_REQUIRED_FINAL_MAP) {
      this.addError(`final: Current map ${gd.currentMap} does not match ${MAINLINE_QA_REQUIRED_FINAL_MAP}`)
    }
    if (gd.rebuildLevel < MAINLINE_QA_REQUIRED_FINAL_REBUILD_LEVEL) {
      this.addError(`final: Rebuild level ${gd.rebuildLevel} is below ${MAINLINE_QA_REQUIRED_FINAL_REBUILD_LEVEL}`)
    }
    if (MAINLINE_QA_REQUIRED_NO_ACTIVE_QUESTS && questSystem.getActiveQuests().length > 0) {
      this.addError('final: Active quests remain after mainline route')
    }
    for (const { branch, min } of MAINLINE_QA_REQUIRED_BRANCH_THRESHOLDS) {
      const value = gd.branches[branch]
      if (typeof value !== 'number' || value < min) {
        this.addError(`final: Branch ${branch} is below required threshold ${min}`)
      }
    }
    for (const flag of MAINLINE_QA_REQUIRED_FINAL_FLAGS) {
      if (gd.getFlag(flag) !== true) this.addError(`final: Required flag ${flag} is not true`)
    }
    for (const { characterId, skillId } of MAINLINE_QA_REQUIRED_FINAL_SKILLS) {
      const skills = gd.characters.get(characterId)?.skills ?? []
      if (!skills.includes(skillId)) this.addError(`final: Character ${characterId} does not know ${skillId}`)
    }
    for (const itemId of MAINLINE_QA_REQUIRED_FINAL_ITEMS) {
      if (!gd.hasItem(itemId)) this.addError(`final: Required item ${itemId} is missing`)
    }
    for (const questId of MAINLINE_QA_REQUIRED_COMPLETED_QUESTS) {
      if (!questSystem.isQuestCompleted(questId)) {
        this.addError(`final: Quest ${questId} is not completed`)
      } else if (!this.completedQuestSources.has(questId)) {
        this.addError(`final: Quest ${questId} completed without a QA route completion source`)
      }
    }
    for (const characterId of MAINLINE_QA_REQUIRED_PARTY) {
      if (!gd.party.includes(characterId) && !gd.reserve.includes(characterId)) {
        this.addError(`final: Party member ${characterId} is missing`)
      }
    }
  }

  private recordCompletedQuestSource(questId: string, source: string): void {
    const sources = this.completedQuestSources.get(questId) ?? []
    sources.push(source)
    this.completedQuestSources.set(questId, sources)
  }

  private getCoverage(): MainlineQaReport['coverage'] {
    return {
      completedQuestSources: Object.fromEntries(
        [...this.completedQuestSources.entries()].map(([questId, sources]) => [questId, [...sources]]),
      ),
      mapIds: [...this.visitedMapIds],
      mapEvents: [...this.triggeredMapEvents],
      dialogueIds: [...this.completedDialogueIds],
      encounterIds: [...this.completedEncounterIds],
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
      skills: Object.fromEntries(Array.from(gd.characters.entries()).map(([id, character]) => [id, [...character.skills]])),
      items: { ...gd.inventory.items },
      equipment: { ...gd.inventory.equipment },
      rebuildLevel: gd.rebuildLevel,
      gold: gd.gold,
      flags: { ...gd.flags },
      branches: { ...gd.branches },
    }
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
  return getRequestedBattleVisualQaConfig() !== null
}

export function getBattleVisualQaConfig(queryValue: string | null): BattleVisualQaConfig | null {
  switch (queryValue) {
    case MAINLINE_QA.BATTLE_QUERY_VALUE:
      return {
        encounterId: MAINLINE_QA.BATTLE_VISUAL_ENCOUNTER_ID,
        mapId: MAINLINE_QA.BATTLE_VISUAL_MAP_ID,
        flags: MAINLINE_QA.BATTLE_VISUAL_FLAGS,
      }
    case MAINLINE_QA.BATTLE_FINAL_QUERY_VALUE:
      return {
        encounterId: MAINLINE_QA.BATTLE_FINAL_ENCOUNTER_ID,
        mapId: MAINLINE_QA.BATTLE_FINAL_VISUAL_MAP_ID,
        flags: MAINLINE_QA.BATTLE_FINAL_VISUAL_FLAGS,
        branches: MAINLINE_QA.BATTLE_FINAL_VISUAL_BRANCHES,
      }
    default:
      return null
  }
}

export function getRequestedBattleVisualQaConfig(): BattleVisualQaConfig | null {
  if (typeof window === 'undefined') return null
  const queryValue = new URLSearchParams(window.location.search).get(MAINLINE_QA.QUERY_PARAM)
  return getBattleVisualQaConfig(queryValue)
}

export function prepareBattleVisualQa(config: BattleVisualQaConfig = getBattleVisualQaConfig(MAINLINE_QA.BATTLE_QUERY_VALUE)!): void {
  const gd = GameData.getInstance()
  gd.reset()
  gd.currentMap = config.mapId
  gd.party = []
  gd.reserve = []
  gd.settings.encounterRate = 'none'
  gd.settings.difficulty = MAINLINE_QA.BATTLE_VISUAL_DIFFICULTY
  gd.settings.battleSpeed = MAINLINE_QA.BATTLE_VISUAL_SPEED
  for (const characterId of MAINLINE_QA.BATTLE_VISUAL_PARTY) {
    gd.addPartyMember(characterId)
  }
  for (const flag of config.flags) {
    gd.setFlag(flag, true)
  }
  for (const [branch, value] of Object.entries(config.branches ?? {}) as Array<[keyof BranchState, BranchState[keyof BranchState]]>) {
    gd.updateBranch(branch, value)
  }
  SkillGrowth.getInstance().checkAllUnlocks()
}

function publishMainlineQaReport(report: MainlineQaReport): void {
  ;(globalThis as unknown as Record<string, unknown>)[MAINLINE_QA.REPORT_GLOBAL_KEY] = report

  if (typeof document === 'undefined') return

  document.documentElement.setAttribute(MAINLINE_QA.REPORT_STATUS_ATTRIBUTE, report.status)

  let reportElement = document.getElementById(MAINLINE_QA.REPORT_ELEMENT_ID)
  if (!reportElement) {
    reportElement = document.createElement('script')
    reportElement.id = MAINLINE_QA.REPORT_ELEMENT_ID
    reportElement.setAttribute('type', 'application/json')
    document.body?.appendChild(reportElement)
  }
  reportElement.textContent = JSON.stringify(report)

  let summaryElement = document.getElementById(MAINLINE_QA.REPORT_SUMMARY_ELEMENT_ID)
  if (!summaryElement) {
    summaryElement = document.createElement('aside')
    summaryElement.id = MAINLINE_QA.REPORT_SUMMARY_ELEMENT_ID
    summaryElement.setAttribute('role', 'status')
    summaryElement.setAttribute('aria-live', 'polite')
    document.body?.appendChild(summaryElement)
  }
  summaryElement.setAttribute('data-status', report.status)
  summaryElement.textContent = [
    `Mainline QA ${report.status.toUpperCase()}`,
    `Steps ${report.steps.length}`,
    `Maps ${report.coverage.mapIds.length}`,
    `Battles ${report.coverage.encounterIds.length}`,
    `Quests ${Object.keys(report.coverage.completedQuestSources).length}`,
    `Errors ${report.errors.length}`,
  ].join(' | ')
  updateMainlineQaSummaryStyle(summaryElement)
  bindMainlineQaSummaryViewportListeners(summaryElement)
}

function isCompactMainlineQaViewport(): boolean {
  if (typeof window === 'undefined') return false
  const coarsePointer = window.matchMedia?.(TOUCH_INPUT.DEVICE_MEDIA_QUERY).matches ?? false
  const touchDevice = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0
  return coarsePointer
    || touchDevice
    || window.innerWidth <= TOUCH_INPUT.MOBILE_VIEWPORT_MAX_WIDTH
    || window.innerHeight <= MAINLINE_QA.COMPACT_VIEWPORT_MAX_HEIGHT
}

function updateMainlineQaSummaryStyle(summaryElement: MainlineQaSummaryElement): void {
  summaryElement.setAttribute('style', getMainlineQaSummaryStyle(isCompactMainlineQaViewport()))
}

function bindMainlineQaSummaryViewportListeners(summaryElement: MainlineQaSummaryElement): void {
  if (typeof window === 'undefined') return
  removeMainlineQaSummaryViewportListeners?.()

  const update = (): void => updateMainlineQaSummaryStyle(summaryElement)
  window.addEventListener('resize', update)
  window.addEventListener('orientationchange', update)
  removeMainlineQaSummaryViewportListeners = () => {
    window.removeEventListener('resize', update)
    window.removeEventListener('orientationchange', update)
  }
}

export function getMainlineQaSummaryStyle(compactViewport: boolean): string {
  const position = compactViewport
    ? [
        'right:max(12px, env(safe-area-inset-right))',
        'top:max(126px, calc(env(safe-area-inset-top) + 126px))',
        'max-width:min(240px, calc(100vw - 24px))',
        'padding:5px 7px',
        'font:600 9px/1.3 "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
      ]
    : [
        'right:max(12px, env(safe-area-inset-right))',
        'bottom:max(12px, env(safe-area-inset-bottom))',
        'max-width:min(440px, calc(100vw - 24px))',
        'padding:8px 10px',
        'font:600 12px/1.45 "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
      ]

  return [
    'position:fixed',
    ...position,
    'z-index:20',
    'box-sizing:border-box',
    'border:1px solid rgba(241,196,106,0.72)',
    'border-radius:6px',
    'background:rgba(7,16,26,0.86)',
    'color:#eef6f3',
    'letter-spacing:0',
    'text-shadow:0 1px 3px rgba(0,0,0,0.72)',
    'pointer-events:none',
  ].join(';')
}

export function runMainlineQa(): MainlineQaReport {
  const report = new MainlineQaRunner().run()
  publishMainlineQaReport(report)
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
