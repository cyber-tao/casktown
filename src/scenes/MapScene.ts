import Phaser from 'phaser'
import { GameData } from '../core/GameData'
import { EventBus, GameEvents } from '../core/EventBus'
import { QuestSystem } from '../core/QuestSystem'
import { AudioManager } from '../core/AudioManager'
import { InputManager } from '../core/InputManager'
import { SaveManager } from '../core/SaveManager'
import { getBlockedMapDialogueId, resolveCanonicalMapId } from '../core/MapAccess'
import { areEventConditionsMet as areConditionsMet } from '../core/EventConditions'
import { getChestOpenedFlag, getFieldEventDoneFlag, isCompletableMapEvent, isMapEventCompleted } from '../core/MapEventState'
import { applyStateEventAction } from '../core/EventActionExecutor'
import { GAME_CONFIG_DATABASE } from '../data/configDatabase'
import { resolveTileSpriteKey } from '../data/tileSprites'
import { collectMapImageKeys, collectMapTileTextureKeys, processTileTextures, queueImageAssets, unloadUnusedMapTextures } from '../core/AssetLoader'
import {
  CHARACTER_SPRITE_BASE_KEYS,
  CHARACTER_DIRECTION_FRAME_STEMS,
  CHARACTER_DIRECTION_TEXTURE_PATTERN,
  CHARACTER_SIDE_WALK_FLIP_DIRECTION,
  DEFAULT_CHARACTER_SPRITE_BASE_KEY,
  DEFAULT_CHARACTER_SPRITE_KEY,
  DEFAULT_ENEMY_SPRITE_KEY,
  DIRECTION,
  COLORS,
  FIELD_ENCOUNTER_RATE_THRESHOLDS,
  FIELD_ENCOUNTER_SPAWN_COUNTS,
  FIELD_ENTITY_BEHAVIOR,
  FIELD_ENTITY_BEHAVIOR_PRESETS,
  FIELD_SPRITE_ANIMATION,
  FOLLOWER_DEPTH,
  FOLLOWER_MAX_COUNT,
  FOLLOWER_MIN_DISTANCE_FACTOR,
  FOLLOWER_TRAIL_OFFSETS,
  MAP_GAMEPAD_INPUT,
  MAP_ENCOUNTER_RATES,
  MAP_HUD,
  MAP_INPUT_CODES,
  MAP_INPUT_GUARD,
  MAP_WEATHER_GROUPS,
  LOADING_SCREEN,
  MAP_MOVE_SPEED_TILES_PER_SECOND,
  PARTY_FIELD_EVENT_CHARACTER_IDS,
  REBUILD_VISUAL_MAP_THRESHOLD,
  REBUILD_TILE_REPLACEMENTS,
  RUNTIME_UI_ASSET_KEYS,
  REBUILT_TOWN_MAP_ID,
  QUICK_SAVE_SLOT,
  ROAMING_ENCOUNTER_RESPAWN,
  SEQUENCE_TEXTURE_FRAME_PATTERN,
  RUINED_TOWN_MAP_ID,
  TILE_SPRITE_FOOTPRINTS,
  TILE_SIZE,
  TIME_MS_PER_SECOND,
  TOWN_MAP_IDS,
  GAME_WIDTH,
  GAME_HEIGHT,
  DIRECTION_VECTORS,
  TOUCH_INPUT,
  UI_FONT_FAMILY,
  scaleFont,
  scalePx,
} from '../utils/constants'
import type { MapData, MapEvent, EventAction, FieldEntityBehavior, QuestState } from '../data/types'
import { cleanupKeyboardOnShutdown } from '../utils/sceneLifecycle'
import { showLoadingScreen } from '../utils/loadingScreen'
import { cssToGamePx } from '../utils/touch'
import { getEscapeRetreatTiles, isTileInsideSpriteBounds } from '../utils/fieldGeometry'
import { addRuntimePanel as createRuntimePanel } from '../utils/runtimePanels'
import { resolveQuestProgressDisplay } from '../utils/questProgress'

type PartyHudObject = Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image | Phaser.GameObjects.Text

interface PartyHudRow {
  charId: string
  hpBar: Phaser.GameObjects.Rectangle
  mpBar: Phaser.GameObjects.Rectangle
  hpText: Phaser.GameObjects.Text
  mpText: Phaser.GameObjects.Text
  levelText: Phaser.GameObjects.Text
  lastHp?: number
  lastMaxHp?: number
  lastMp?: number
  lastMaxMp?: number
  lastLevel?: number
}

interface MapSceneFeedback {
  text: string
  success: boolean
}

interface MapSceneStartData {
  mapId?: string
  feedback?: MapSceneFeedback
}

export class MapScene extends Phaser.Scene {
  private mapData!: MapData
  private player!: Phaser.GameObjects.Sprite
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key }
  private actionKeys!: { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key }
  private actionKeySignature = ''
  private isMoving = false
  private moveStart = { x: 0, y: 0 }
  private moveTarget = { x: 0, y: 0 }
  private moveElapsed = 0
  private moveDuration = 0
  private moveSpeed = MAP_MOVE_SPEED_TILES_PER_SECOND
  private currentDir: number = DIRECTION.DOWN
  private tileSprites: Phaser.GameObjects.Image[][] = []
  private npcs: Map<string, Phaser.GameObjects.Sprite> = new Map()
  private eventObjects: Phaser.GameObjects.Rectangle[] = []
  private collisionGrid: boolean[][] = []
  private inEvent = false
  private uiTexts: Phaser.GameObjects.Text[] = []
  private partyHudObjects: PartyHudObject[] = []
  private partyHudRows: PartyHudRow[] = []
  private partyHudPartyKey = ''
  private questHudObjects: PartyHudObject[] = []
  private questHudKey = ''
  private mapNameText?: Phaser.GameObjects.Text
  private mapFeedbackText?: Phaser.GameObjects.Text
  private promptText?: Phaser.GameObjects.Text
  private initialFeedback: MapSceneFeedback | null = null
  private feedbackToken = 0

  private followers: Phaser.GameObjects.Sprite[] = []
  private followerMemberIds: string[] = []
  private followerPositions: { x: number; y: number }[] = []
  private gpConfirmPrev = false
  private gpCancelPrev = false
  private gpMenuPrev = false
  private battleEnemies: Map<string, Phaser.GameObjects.Sprite> = new Map()
  private battleEnemyEvents: Map<string, MapEvent> = new Map()
  private fieldEntityBehaviors: Map<string, FieldEntityBehavior> = new Map()
  private fieldEntityOrigins: Map<string, { x: number; y: number }> = new Map()
  private fieldEntityDirections: Map<string, number> = new Map()
  private enemyPatrolTimers: Map<string, Phaser.Time.TimerEvent> = new Map()
  private battleEnemyReentryBlockedUntilMs: Map<string, number> = new Map()
  private pendingActions: EventAction[] = []
  private pendingMapEventId = ''
  private pendingMapRestartId = ''
  private restartingMap = false
  private loadedImageKeys = new Set<string>()
  private inputResumeBlockedUntilMs = 0
  private animationTimeMs = 0
  private touchDirection: { dx: number; dy: number; dir: number; pointerId: number } | null = null
  private touchControls: Phaser.GameObjects.GameObject[] = []
  private touchLayoutActive = false
  private minimapGraphics?: Phaser.GameObjects.Graphics
  private minimapDynamicGraphics?: Phaser.GameObjects.Graphics
  private minimapPlayerMarker?: Phaser.GameObjects.Rectangle

  constructor() {
    super({ key: 'MapScene' })
  }

  private handleQuickSave = (): void => {
    if (!this.isGameplayInputActive()) return
    if (!this.canUseQuickSaveLoad()) {
      this.showMapFeedback(MAP_HUD.QUICK_ACTION_BLOCKED_TEXT, false)
      AudioManager.getInstance().playSFX('cancel')
      return
    }

    const success = SaveManager.getInstance().quickSave()
    this.showMapFeedback(success ? MAP_HUD.QUICK_SAVE_SUCCESS_TEXT : MAP_HUD.QUICK_SAVE_FAILED_TEXT, success)
    AudioManager.getInstance().playSFX(success ? 'confirm' : 'cancel')
  }

  private handleQuickLoad = (): void => {
    if (!this.isGameplayInputActive()) return
    if (!this.canUseQuickSaveLoad()) {
      this.showMapFeedback(MAP_HUD.QUICK_ACTION_BLOCKED_TEXT, false)
      AudioManager.getInstance().playSFX('cancel')
      return
    }

    const saveManager = SaveManager.getInstance()
    const hadQuickSave = saveManager.hasSave(QUICK_SAVE_SLOT)
    if (saveManager.quickLoad()) {
      AudioManager.getInstance().playSFX('confirm')
      this.requestMapRestart(GameData.getInstance().currentMap, { text: MAP_HUD.QUICK_LOAD_SUCCESS_TEXT, success: true })
      return
    }

    this.showMapFeedback(hadQuickSave ? MAP_HUD.QUICK_LOAD_FAILED_TEXT : MAP_HUD.QUICK_LOAD_EMPTY_TEXT, false)
    AudioManager.getInstance().playSFX('cancel')
  }

  private handleSaveLoaded = (): void => {
    this.pendingActions = []
    this.pendingMapEventId = ''
    this.inEvent = false
    this.requestMapRestart(GameData.getInstance().currentMap)
  }

  private handleQuestUpdate = (): void => {
    this.createQuestHud()
    this.refreshMinimapStatic()
  }

  private handleFlagSet = (key: string, value: unknown): void => {
    this.syncConditionalBattleEnemies()
    this.refreshMinimapStatic()

    if (value === true && this.isJoinFlag(key)) {
      this.removeSuppressedFieldEventSprites()
      this.refreshFollowers()
      this.createPartyHud()
    }

    if (key !== 'rebuild_level' || typeof value !== 'number') return
    if (!TOWN_MAP_IDS.some(mapId => mapId === this.mapData.id)) return

    const gd = GameData.getInstance()
    const nextMapId = value >= REBUILD_VISUAL_MAP_THRESHOLD ? REBUILT_TOWN_MAP_ID : RUINED_TOWN_MAP_ID
    gd.currentMap = nextMapId
    if (this.shouldDeferMapRestart()) {
      this.pendingMapRestartId = nextMapId
      return
    }
    this.requestMapRestart(nextMapId)
  }

  private isJoinFlag(key: string): boolean {
    return key.endsWith('_joined')
  }

  private getCharacterSpriteBase(characterId: string): string {
    return CHARACTER_SPRITE_BASE_KEYS[characterId] ?? characterId.toLowerCase()
  }

  private hasPartyMember(characterId: string): boolean {
    const gd = GameData.getInstance()
    return gd.party.includes(characterId) || gd.reserve.includes(characterId)
  }

  private isSuppressedFieldEvent(event: MapEvent): boolean {
    const characterId = PARTY_FIELD_EVENT_CHARACTER_IDS[event.id]
    return characterId ? this.hasPartyMember(characterId) : false
  }

  private getBattleDefeatedFlag(eventId: string): string {
    return `${ROAMING_ENCOUNTER_RESPAWN.DEFEATED_FLAG_PREFIX}${eventId}`
  }

  private getRoamingDefeatedAtFlag(eventId: string): string {
    return `${ROAMING_ENCOUNTER_RESPAWN.DEFEATED_AT_FLAG_PREFIX}${eventId}`
  }

  private isRoamingBattleEvent(eventId: string): boolean {
    return eventId.startsWith(ROAMING_ENCOUNTER_RESPAWN.EVENT_ID_PREFIX)
  }

  private isBattleEventDefeated(event: MapEvent): boolean {
    const gd = GameData.getInstance()
    const defeatedFlag = this.getBattleDefeatedFlag(event.id)
    if (gd.getFlag(defeatedFlag) !== true) return false
    if (!this.isRoamingBattleEvent(event.id)) return true

    const defeatedAt = gd.getFlag(this.getRoamingDefeatedAtFlag(event.id))
    if (typeof defeatedAt !== 'number') {
      gd.setFlag(defeatedFlag, false)
      return false
    }
    if (Date.now() - defeatedAt < ROAMING_ENCOUNTER_RESPAWN.COOLDOWN_MS) return true

    gd.setFlag(defeatedFlag, false)
    gd.setFlag(this.getRoamingDefeatedAtFlag(event.id), false)
    return false
  }

  private isCompletableFieldEvent(event: MapEvent): boolean {
    return isCompletableMapEvent(event)
  }

  private isFieldEventCompleted(event: MapEvent): boolean {
    return isMapEventCompleted(event, flag => GameData.getInstance().getFlag(flag))
  }

  private getFieldEventDoneFlag(eventId: string): string {
    return getFieldEventDoneFlag(eventId)
  }

  private getChestOpenedFlag(eventId: string): string {
    return getChestOpenedFlag(eventId)
  }

  private markFieldEventCompleted(eventId?: string): void {
    if (!eventId) return
    const event = this.mapData.events.find(candidate => candidate.id === eventId)
      ?? this.battleEnemyEvents.get(eventId)
    if (!event || !this.isCompletableFieldEvent(event)) return
    const gd = GameData.getInstance()
    if (event.type === 'chest') {
      gd.setFlag(this.getChestOpenedFlag(event.id), true)
    }
    gd.setFlag(this.getFieldEventDoneFlag(event.id), true)
  }

  private shouldDeferMapRestart(): boolean {
    if (this.scene.isPaused()) return true
    const blockingScenes = [
      'DialogueOverlay',
      'BattleScene',
      'MenuOverlay',
      'ShopOverlay',
      'TrainingOverlay',
      'RebuildOverlay',
      'WorldMapOverlay',
      'CodexOverlay',
      'SettingsScene',
    ] as const
    return blockingScenes.some(sceneKey => this.scene.isActive(sceneKey))
  }

  private isSpriteUsable(sprite: Phaser.GameObjects.Sprite): boolean {
    return Boolean(sprite.active && sprite.scene)
  }

  init(data: MapSceneStartData = {}): void {
    const gd = GameData.getInstance()
    const mapId = resolveCanonicalMapId(data.mapId || gd.currentMap, gd.rebuildLevel)
    const maps = GAME_CONFIG_DATABASE.getTable('maps')
    this.mapData = maps[mapId] || maps.MAP_001!
    this.initialFeedback = data.feedback ?? null
    gd.currentMap = this.mapData.id
  }

  preload(): void {
    showLoadingScreen(this, LOADING_SCREEN.MAP_LABEL)
    const party = GameData.getInstance().party
    const nextKeys = collectMapImageKeys(this.mapData, party)
    if (this.loadedImageKeys.size > 0) {
      unloadUnusedMapTextures(this, this.loadedImageKeys, nextKeys, party)
    }
    this.loadedImageKeys = nextKeys
    queueImageAssets(this, nextKeys)
  }

  create(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this)
    this.inEvent = false
    this.isMoving = false
    this.tileSprites = []
    this.npcs = new Map()
    this.eventObjects = []
    this.uiTexts = []
    this.partyHudObjects = []
    this.partyHudRows = []
    this.partyHudPartyKey = ''
    this.questHudObjects = []
    this.questHudKey = ''
    this.battleEnemies = new Map()
    this.battleEnemyEvents = new Map()
    this.fieldEntityBehaviors = new Map()
    this.fieldEntityOrigins = new Map()
    this.fieldEntityDirections = new Map()
    this.enemyPatrolTimers = new Map()
    this.battleEnemyReentryBlockedUntilMs = new Map()
    this.npcTimers = []
    this.pendingActions = []
    this.pendingMapEventId = ''
    this.pendingMapRestartId = ''
    this.restartingMap = false
    this.inputResumeBlockedUntilMs = 0
    this.feedbackToken = 0
    this.promptText = undefined
    this.touchLayoutActive = this.shouldShowTouchControls()
    this.weatherEmitter = null
    this.minimapGraphics = undefined
    this.minimapDynamicGraphics = undefined
    this.minimapPlayerMarker = undefined

    this.cameras.main.setBackgroundColor('#2d4a22')
    this.cameras.main.setBounds(0, 0, this.mapData.width * TILE_SIZE, this.mapData.height * TILE_SIZE)

    processTileTextures(this, collectMapTileTextureKeys(this.mapData))
    this.buildCollisionGrid()
    this.renderMap()
    this.spawnPlayer()
    this.spawnNPCs()
    this.createEvents()
    this.setupInput()
    this.createUI()
    this.createMinimap()
    this.createTouchControls()

    // Show map name
    this.showMapName()
    if (this.initialFeedback) {
      this.showMapFeedback(this.initialFeedback.text, this.initialFeedback.success)
      this.initialFeedback = null
    }
    this.createWeather()
    this.startNPCMovement()

    // Play area BGM
    AudioManager.getInstance().setScene(this)
    AudioManager.getInstance().playBGMForMap(this.mapData.id)

    // Listen for dialogue end
    EventBus.on(GameEvents.DIALOGUE_END, this.onDialogueEnd, this)
    EventBus.on(GameEvents.BATTLE_END, this.onBattleEnd, this)
    EventBus.on(GameEvents.MENU_CLOSE, this.onMenuClose, this)
    EventBus.on(GameEvents.FLAG_SET, this.handleFlagSet, this)
    EventBus.on(GameEvents.QUEST_UPDATE, this.handleQuestUpdate, this)
    EventBus.on(GameEvents.SAVE_LOADED, this.handleSaveLoaded, this)
    window.addEventListener('game-quicksave', this.handleQuickSave)
    window.addEventListener('game-quickload', this.handleQuickLoad)

    // Autorun events
    this.checkAutorunEvents()
  }

  override update(time: number, delta: number): void {
    this.animationTimeMs = time
    this.syncDirectionalActionKeys()
    this.updatePartyHud()
    if (this.inEvent) {
      this.updateMinimapPlayerMarker()
      return
    }

    this.updateBattleEnemyBehavior(delta)
    if (!this.isMoving && this.checkBattleEnemyTouch()) return

    this.pollGamepadButtons()

    if (this.isMoving) {
      this.updateMovement(delta)
    } else {
      this.handleInput()
      this.updatePrompt()
    }
    this.updateMinimapDynamicMarkers()
    this.updateMinimapPlayerMarker()
  }

  private buildCollisionGrid(): void {
    for (let y = 0; y < this.mapData.height; y++) {
      this.collisionGrid[y] = []
      for (let x = 0; x < this.mapData.width; x++) {
        this.collisionGrid[y]![x] = false
      }
    }
    for (const idx of this.mapData.collisions) {
      const x = idx % this.mapData.width
      const y = Math.floor(idx / this.mapData.width)
      if (y >= 0 && y < this.mapData.height && x >= 0 && x < this.mapData.width) {
        this.collisionGrid[y]![x] = true
      }
    }
  }

  private renderMap(): void {
    const gd = GameData.getInstance()
    const tileSprites = GAME_CONFIG_DATABASE.getTable('tileSprites')
    const shouldApplyRebuildTiles = (TOWN_MAP_IDS as readonly string[]).includes(this.mapData.id)
    const resolveTile = (idx: number): number => {
      if (!shouldApplyRebuildTiles) return idx
      const replacement = REBUILD_TILE_REPLACEMENTS.find(rule => rule.sourceTileId === idx && gd.rebuildLevel >= rule.minRebuildLevel)
      if (replacement) return replacement.targetTileId
      return idx
    }

    const ground = this.mapData.layers[0]!
    for (let y = 0; y < this.mapData.height; y++) {
      this.tileSprites[y] = []
      for (let x = 0; x < this.mapData.width; x++) {
        const idx = resolveTile(ground.data[y * this.mapData.width + x] ?? 0)
        const spriteKey = resolveTileSpriteKey(tileSprites, this.mapData.tileset, idx) || 'env_dirt_plain'
        const img = this.add.image(x * TILE_SIZE, y * TILE_SIZE, spriteKey)
        img.setOrigin(0, 0)
        img.setDisplaySize(TILE_SIZE, TILE_SIZE)
        img.setDepth(0)
        this.tileSprites[y]![x] = img
      }
    }

    // Object layer
    const objects = this.mapData.layers[1]!
    for (let y = 0; y < this.mapData.height; y++) {
      for (let x = 0; x < this.mapData.width; x++) {
        const raw = objects.data[y * this.mapData.width + x]
        if (raw && raw > 0) {
          const idx = resolveTile(raw)
          const spriteKey = resolveTileSpriteKey(tileSprites, this.mapData.tileset, idx)
          if (spriteKey) {
            const footprint = TILE_SPRITE_FOOTPRINTS[spriteKey]
            const widthTiles = footprint?.width ?? 1
            const heightTiles = footprint?.height ?? 1
            const img = this.add.image(x * TILE_SIZE, y * TILE_SIZE, spriteKey)
            img.setOrigin(0, 0)
            img.setDisplaySize(widthTiles * TILE_SIZE, heightTiles * TILE_SIZE)
            img.setDepth(1)
          }
        }
      }
    }
  }

  private spawnPlayer(): void {
    const gd = GameData.getInstance()
    const px = gd.playerPosition.x
    const py = gd.playerPosition.y
    const leader = gd.party[0] || 'T'
    const leaderBase = this.getCharacterSpriteBase(leader)
    const spriteKey = this.resolveTextureKey(`${leaderBase}_front_idle_01`, DEFAULT_CHARACTER_SPRITE_KEY) ?? DEFAULT_CHARACTER_SPRITE_KEY

    this.player = this.add.sprite(px * TILE_SIZE + TILE_SIZE / 2, py * TILE_SIZE + TILE_SIZE / 2, spriteKey)
    this.player.setDisplaySize(TILE_SIZE, TILE_SIZE)
    this.player.setDepth(10)
    this.currentDir = gd.playerDirection
    this.updatePlayerFrame(false)
    this.refreshFollowers()

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)
    this.cameras.main.setFollowOffset(0, 0)
  }

  private refreshFollowers(): void {
    if (!this.player) return
    for (const follower of this.followers) {
      this.tweens.killTweensOf(follower)
      follower.destroy()
    }
    this.followers = []
    this.followerMemberIds = []
    this.followerPositions = []
    const gd = GameData.getInstance()
    const px = Math.floor(this.player.x / TILE_SIZE)
    const py = Math.floor(this.player.y / TILE_SIZE)
    for (let i = 1; i < gd.party.length && i <= FOLLOWER_MAX_COUNT; i++) {
      const memberId = gd.party[i]!
      const memberBase = this.getCharacterSpriteBase(memberId)
      const key = this.resolveTextureKey(`${memberBase}_front_idle_01`, DEFAULT_CHARACTER_SPRITE_KEY) ?? DEFAULT_CHARACTER_SPRITE_KEY
      const offset = FOLLOWER_TRAIL_OFFSETS[i - 1]!
      const fx = (px - offset.x) * TILE_SIZE + TILE_SIZE / 2
      const fy = (py - offset.y) * TILE_SIZE + TILE_SIZE / 2
      const follower = this.add.sprite(fx, fy, key)
      follower.setDisplaySize(TILE_SIZE, TILE_SIZE)
      follower.setDepth(FOLLOWER_DEPTH)
      this.followers.push(follower)
      this.followerMemberIds.push(memberBase)
      this.followerPositions.push({ x: fx, y: fy })
      this.updateDirectionalCharacterFrame(follower, memberBase, this.currentDir, false)
    }
  }

  private spawnNPCs(): void {
    for (const event of this.mapData.events) {
      if ((event.type === 'npc' || event.type === 'trigger') && event.sprite) {
        if (this.isFieldEventCompleted(event)) continue
        if (this.isSuppressedFieldEvent(event) || !this.areEventConditionsMet(event)) continue
        const sx = event.x * TILE_SIZE + TILE_SIZE / 2
        const sy = event.y * TILE_SIZE + TILE_SIZE / 2
        const npc = this.add.sprite(sx, sy, event.sprite)
        npc.setDisplaySize(TILE_SIZE, TILE_SIZE)
        npc.setDepth(10)
        this.npcs.set(event.id, npc)
        if (event.type === 'npc') {
          this.fieldEntityBehaviors.set(event.id, this.getNpcFieldBehavior(event))
        }
        this.fieldEntityOrigins.set(event.id, { x: sx, y: sy })
        this.updateFieldEntityFrame(event.id, npc, event.direction ?? DIRECTION.DOWN, false)
      }
    }

    for (const event of this.mapData.events) {
      if (event.type !== 'battle') continue
      this.spawnBattleEnemy(event)
    }

    this.spawnRoamingBattleEnemies()
  }

  private removeSuppressedFieldEventSprites(): void {
    for (const event of this.mapData.events) {
      if (!this.isSuppressedFieldEvent(event)) continue
      const npc = this.npcs.get(event.id)
      if (npc) {
        this.tweens.killTweensOf(npc)
        npc.destroy()
        this.npcs.delete(event.id)
      }
      this.fieldEntityBehaviors.delete(event.id)
      this.fieldEntityOrigins.delete(event.id)
      this.fieldEntityDirections.delete(event.id)
    }
  }

  private spawnBattleEnemy(event: MapEvent): void {
    if (this.isBattleEventDefeated(event)) return
    if (!this.areEventConditionsMet(event)) return

    const sx = event.x * TILE_SIZE + event.width * TILE_SIZE / 2
    const sy = event.y * TILE_SIZE + event.height * TILE_SIZE / 2
    const encounterId = this.getBattleEncounterId(event)
    const spriteKey = event.sprite ?? this.getEnemySpriteKey(encounterId)
    const textureKey = this.textures.exists(spriteKey) ? spriteKey : DEFAULT_ENEMY_SPRITE_KEY
    const enemySprite = this.add.sprite(sx, sy, textureKey)
    const displaySize = this.getBattleEnemyDisplaySize(event)
    enemySprite.setDisplaySize(displaySize.width, displaySize.height)
    enemySprite.setDepth(10)
    this.battleEnemies.set(event.id, enemySprite)
    this.battleEnemyEvents.set(event.id, event)
    this.fieldEntityOrigins.set(event.id, { x: sx, y: sy })
    this.updateFieldEntityFrame(event.id, enemySprite, event.direction ?? DIRECTION.DOWN, false)

    const behavior = this.getBattleFieldBehavior(event)
    this.fieldEntityBehaviors.set(event.id, behavior)
    const patrolTimer = this.scheduleFieldPatrol(event.id, enemySprite, behavior)
    if (patrolTimer) this.enemyPatrolTimers.set(event.id, patrolTimer)
  }

  private syncConditionalBattleEnemies(): void {
    for (const event of this.mapData.events) {
      if (event.type !== 'battle') continue
      const sprite = this.battleEnemies.get(event.id)
      const shouldExist = !this.isBattleEventDefeated(event) && this.areEventConditionsMet(event)

      if (sprite && (!shouldExist || !this.isSpriteUsable(sprite))) {
        this.removeBattleEnemy(event.id, sprite)
      }
      if (shouldExist && !this.battleEnemies.has(event.id)) {
        this.spawnBattleEnemy(event)
      }
    }
  }

  private spawnRoamingBattleEnemies(): void {
    if (!this.mapData.encounters || this.mapData.encounters.length === 0) return

    const count = this.getRoamingEncounterSpawnCount()
    for (let i = 0; i < count; i++) {
      const encounterId = this.mapData.encounters[i % this.mapData.encounters.length]!
      const tile = this.findRoamingEncounterSpawnTile()
      if (!tile) continue
      const event: MapEvent = {
        id: `ROAM_${this.mapData.id}_${i}_${encounterId}`,
        x: tile.x,
        y: tile.y,
        width: 1,
        height: 1,
        type: 'battle',
        trigger: 'touch',
        actions: [{ type: 'battle', encounterId }],
      }
      this.spawnBattleEnemy(event)
    }
  }

  private getRoamingEncounterSpawnCount(): number {
    const gd = GameData.getInstance()
    const setting = gd.settings.encounterRate as string
    if (this.mapData.encounterRate <= MAP_ENCOUNTER_RATES.NONE) return FIELD_ENCOUNTER_SPAWN_COUNTS.NONE
    if (setting === 'none') return FIELD_ENCOUNTER_SPAWN_COUNTS.NONE
    if (setting === 'reduced') return FIELD_ENCOUNTER_SPAWN_COUNTS.REDUCED
    if (this.mapData.encounterRate >= FIELD_ENCOUNTER_RATE_THRESHOLDS.DANGEROUS) return FIELD_ENCOUNTER_SPAWN_COUNTS.DANGEROUS
    if (this.mapData.encounterRate >= FIELD_ENCOUNTER_RATE_THRESHOLDS.DENSE) return FIELD_ENCOUNTER_SPAWN_COUNTS.DENSE
    return FIELD_ENCOUNTER_SPAWN_COUNTS.DEFAULT
  }

  private findRoamingEncounterSpawnTile(): { x: number; y: number } | null {
    const margin = FIELD_ENTITY_BEHAVIOR.SPAWN_MARGIN_TILES
    const minX = Math.min(margin, this.mapData.width - 1)
    const minY = Math.min(margin, this.mapData.height - 1)
    const maxX = Math.max(minX, this.mapData.width - margin - 1)
    const maxY = Math.max(minY, this.mapData.height - margin - 1)
    const playerX = Math.floor(this.player.x / TILE_SIZE)
    const playerY = Math.floor(this.player.y / TILE_SIZE)

    for (let i = 0; i < FIELD_ENTITY_BEHAVIOR.SPAWN_TARGET_ATTEMPTS; i++) {
      const x = Phaser.Math.Between(minX, maxX)
      const y = Phaser.Math.Between(minY, maxY)
      const dist = Phaser.Math.Distance.Between(playerX, playerY, x, y)
      if (dist < FIELD_ENTITY_BEHAVIOR.PLAYER_SPAWN_CLEAR_RADIUS_TILES) continue
      if (!this.canFieldEntityOccupyTile(x, y)) continue
      if (this.isTileReservedByEvent(x, y)) continue
      return { x, y }
    }
    return null
  }

  private isTileReservedByEvent(x: number, y: number): boolean {
    for (const event of this.mapData.events) {
      if (this.isFieldEventCompleted(event)) continue
      if (this.isSuppressedFieldEvent(event)) continue
      if (!this.areEventConditionsMet(event)) continue
      if (this.checkEventCollision(event, x, y)) return true
    }
    for (const sprite of this.battleEnemies.values()) {
      if (Math.floor(sprite.x / TILE_SIZE) === x && Math.floor(sprite.y / TILE_SIZE) === y) return true
    }
    return false
  }

  private getNpcFieldBehavior(event: MapEvent): FieldEntityBehavior {
    const preset = event.sprite?.startsWith('env_')
      ? FIELD_ENTITY_BEHAVIOR_PRESETS.NPC_IDLE
      : FIELD_ENTITY_BEHAVIOR_PRESETS.NPC_WANDER
    return { ...preset, ...event.fieldBehavior } as FieldEntityBehavior
  }

  private getBattleFieldBehavior(event: MapEvent): FieldEntityBehavior {
    if (event.trigger === 'action') {
      return { ...FIELD_ENTITY_BEHAVIOR_PRESETS.NPC_IDLE, ...event.fieldBehavior } as FieldEntityBehavior
    }

    const encounterId = this.getBattleEncounterId(event)
    const encounters = GAME_CONFIG_DATABASE.getTable('encounters')
    const enemyDefs = GAME_CONFIG_DATABASE.getTable('enemies')
    const enemyIds = encounterId ? encounters[encounterId]?.enemies ?? [] : []
    const enemies = enemyIds.map(id => enemyDefs[id]).filter(Boolean)
    const hasBoss = enemies.some(enemy => enemy!.isBoss)
    const hasAmbush = enemies.some(enemy => enemy!.id === 'barrel_fake')
    const hasGuardian = enemies.some(enemy => enemy!.aiType === 'defensive')
    const hasFastEnemy = enemies.some(enemy => enemy!.stats.speed >= FIELD_ENTITY_BEHAVIOR.FAST_ENEMY_SPEED_MIN)
    const preset = hasBoss
      ? FIELD_ENTITY_BEHAVIOR_PRESETS.BOSS
      : hasAmbush
        ? FIELD_ENTITY_BEHAVIOR_PRESETS.AMBUSH
        : hasGuardian
          ? FIELD_ENTITY_BEHAVIOR_PRESETS.GUARDIAN
          : hasFastEnemy
            ? FIELD_ENTITY_BEHAVIOR_PRESETS.FAST_MONSTER
            : FIELD_ENTITY_BEHAVIOR_PRESETS.MONSTER
    return { ...preset, ...event.fieldBehavior } as FieldEntityBehavior
  }

  private getBattleEnemyDisplaySize(event: MapEvent): { width: number; height: number } {
    if (!event.sprite) return { width: TILE_SIZE, height: TILE_SIZE }
    const width = event.width * TILE_SIZE
    const height = event.height * TILE_SIZE
    const maxSize = FIELD_ENTITY_BEHAVIOR.BATTLE_SPRITE_MAX_SIZE_TILES * TILE_SIZE
    const scale = Math.min(1, maxSize / Math.max(width, height))
    return {
      width: Math.round(width * scale),
      height: Math.round(height * scale),
    }
  }

  private scheduleFieldPatrol(id: string, sprite: Phaser.GameObjects.Sprite, behavior: FieldEntityBehavior): Phaser.Time.TimerEvent | undefined {
    if (behavior.patrolRangeTiles <= 0 || behavior.idleMaxMs <= 0) return undefined
    const timer = this.time.addEvent({
      delay: Phaser.Math.Between(behavior.idleMinMs, behavior.idleMaxMs),
      loop: true,
      callback: () => {
        if (this.inEvent) return
        if (!this.isSpriteUsable(sprite)) return
        if (this.isBattleEnemyChasing(id, sprite, behavior)) return
        this.moveFieldEntityWithinPatrol(id, sprite, behavior)
      },
    })
    return timer
  }

  private moveFieldEntityWithinPatrol(id: string, sprite: Phaser.GameObjects.Sprite, behavior: FieldEntityBehavior): void {
    if (!this.isSpriteUsable(sprite)) return
    const origin = this.fieldEntityOrigins.get(id)
    if (!origin) return
    const range = behavior.patrolRangeTiles * TILE_SIZE
    for (let i = 0; i < FIELD_ENTITY_BEHAVIOR.PATROL_TARGET_ATTEMPTS; i++) {
      const nx = Phaser.Math.Between(origin.x - range, origin.x + range)
      const ny = Phaser.Math.Between(origin.y - range, origin.y + range)
      if (!this.canFieldEntityOccupyPixel(nx, ny)) continue
      const direction = this.getDirectionFromDelta(nx - sprite.x, ny - sprite.y, this.fieldEntityDirections.get(id) ?? DIRECTION.DOWN)
      this.tweens.add({
        targets: sprite,
        x: nx,
        y: ny,
        duration: behavior.moveDurationMs,
        ease: 'Linear',
        onStart: () => this.updateFieldEntityFrame(id, sprite, direction, true),
        onUpdate: () => this.updateFieldEntityFrame(id, sprite, direction, true),
        onComplete: () => this.updateFieldEntityFrame(id, sprite, direction, false),
      })
      return
    }
  }

  private updateBattleEnemyBehavior(delta: number): void {
    for (const [id, sprite] of this.battleEnemies) {
      if (!this.isSpriteUsable(sprite)) {
        this.battleEnemies.delete(id)
        continue
      }
      const behavior = this.fieldEntityBehaviors.get(id)
      if (!behavior || behavior.chaseDistanceTiles <= 0) continue
      if (this.isBattleEnemyReentryBlocked(id)) {
        this.updateFieldEntityFrame(id, sprite, this.fieldEntityDirections.get(id) ?? DIRECTION.DOWN, false)
        continue
      }
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, sprite.x, sprite.y)
      const currentDirection = this.fieldEntityDirections.get(id) ?? DIRECTION.DOWN
      if (dist > behavior.chaseDistanceTiles * TILE_SIZE) {
        this.updateFieldEntityFrame(id, sprite, currentDirection, false)
        continue
      }
      if (dist <= behavior.interactionDistanceTiles * TILE_SIZE) {
        this.updateFieldEntityFrame(id, sprite, currentDirection, false)
        continue
      }
      this.tweens.killTweensOf(sprite)
      const angle = Phaser.Math.Angle.Between(sprite.x, sprite.y, this.player.x, this.player.y)
      const step = FIELD_ENTITY_BEHAVIOR.CHASE_SPEED_TILES_PER_SECOND * TILE_SIZE * delta / TIME_MS_PER_SECOND
      const moveX = Math.cos(angle) * Math.min(step, dist)
      const moveY = Math.sin(angle) * Math.min(step, dist)
      const nx = sprite.x + moveX
      const ny = sprite.y + moveY
      if (this.canFieldEntityOccupyPixel(nx, ny)) {
        sprite.x = nx
        sprite.y = ny
        this.updateFieldEntityFrame(id, sprite, this.getDirectionFromDelta(moveX, moveY, currentDirection), true)
      } else {
        this.updateFieldEntityFrame(id, sprite, currentDirection, false)
      }
    }
  }

  private isBattleEnemyChasing(id: string, sprite: Phaser.GameObjects.Sprite, behavior: FieldEntityBehavior): boolean {
    if (!this.isSpriteUsable(sprite)) return false
    if (!this.battleEnemies.has(id) || behavior.chaseDistanceTiles <= 0) return false
    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, sprite.x, sprite.y)
    return dist <= behavior.chaseDistanceTiles * TILE_SIZE
  }

  private checkBattleEnemyTouch(): boolean {
    for (const [id, sprite] of this.battleEnemies) {
      if (!this.isSpriteUsable(sprite)) {
        this.battleEnemies.delete(id)
        continue
      }
      const event = this.battleEnemyEvents.get(id)
      if (!event) continue
      if (!this.areEventConditionsMet(event)) {
        this.removeBattleEnemy(id, sprite)
        continue
      }
      if (event.trigger !== 'touch') continue
      if (this.isBattleEnemyReentryBlocked(id)) continue
      const behavior = this.fieldEntityBehaviors.get(id) ?? this.getBattleFieldBehavior(event)
      const dist = this.getSpriteBoundsDistance(sprite, this.player.x, this.player.y)
      if (dist <= behavior.interactionDistanceTiles * TILE_SIZE) {
        this.triggerEvent(event)
        return true
      }
    }
    return false
  }

  private removeBattleEnemy(eventId: string, sprite: Phaser.GameObjects.Sprite): void {
    this.tweens.killTweensOf(sprite)
    sprite.destroy()
    this.enemyPatrolTimers.get(eventId)?.remove(false)
    this.enemyPatrolTimers.delete(eventId)
    this.battleEnemies.delete(eventId)
    this.battleEnemyEvents.delete(eventId)
    this.fieldEntityBehaviors.delete(eventId)
    this.fieldEntityOrigins.delete(eventId)
    this.fieldEntityDirections.delete(eventId)
    this.battleEnemyReentryBlockedUntilMs.delete(eventId)
  }

  private isBattleEnemyReentryBlocked(eventId: string): boolean {
    const blockedUntilMs = this.battleEnemyReentryBlockedUntilMs.get(eventId)
    if (blockedUntilMs === undefined) return false
    if (this.time.now < blockedUntilMs) return true
    this.battleEnemyReentryBlockedUntilMs.delete(eventId)
    return false
  }

  private retreatFromEscapedTouchBattle(event: MapEvent): void {
    const enemy = this.battleEnemies.get(event.id)
    this.battleEnemyReentryBlockedUntilMs.set(event.id, this.time.now + FIELD_ENTITY_BEHAVIOR.ESCAPE_REENTRY_GUARD_MS)
    if (!enemy) return

    const playerTile = {
      x: Math.floor(this.player.x / TILE_SIZE),
      y: Math.floor(this.player.y / TILE_SIZE),
    }
    const threatTile = {
      x: enemy.x / TILE_SIZE,
      y: enemy.y / TILE_SIZE,
    }
    const retreatTile = getEscapeRetreatTiles(playerTile, threatTile).find(tile => this.canMoveTo(tile.x, tile.y))
    if (retreatTile) {
      this.player.x = retreatTile.x * TILE_SIZE + TILE_SIZE / 2
      this.player.y = retreatTile.y * TILE_SIZE + TILE_SIZE / 2
    }

    const origin = this.fieldEntityOrigins.get(event.id)
    if (origin && this.canFieldEntityOccupyPixel(origin.x, origin.y)) {
      this.tweens.killTweensOf(enemy)
      enemy.x = origin.x
      enemy.y = origin.y
      this.updateFieldEntityFrame(event.id, enemy, this.fieldEntityDirections.get(event.id) ?? DIRECTION.DOWN, false)
    }
    this.savePosition()
  }

  private canFieldEntityOccupyPixel(x: number, y: number): boolean {
    return this.canFieldEntityOccupyTile(Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE))
  }

  private canFieldEntityOccupyTile(x: number, y: number): boolean {
    if (x < 0 || x >= this.mapData.width || y < 0 || y >= this.mapData.height) return false
    return !this.collisionGrid[y]![x]
  }

  private getBattleEncounterId(event: MapEvent): string | undefined {
    const directBattle = event.actions.find(action => action.type === 'battle')
    if (directBattle?.type === 'battle') return directBattle.encounterId
    const dialogues = GAME_CONFIG_DATABASE.getTable('dialogues')
    for (const action of event.actions) {
      if (action.type !== 'dialogue') continue
      const dialogueBattle = dialogues[action.dialogueId]?.onComplete?.find(completeAction => completeAction.type === 'battle')
      if (dialogueBattle?.type === 'battle') return dialogueBattle.encounterId
    }
    return undefined
  }

  private createEvents(): void {
    for (const event of this.mapData.events) {
      if (this.isSuppressedFieldEvent(event) || !this.areEventConditionsMet(event)) continue
      if (this.isFieldEventCompleted(event)) continue
      if (event.type === 'chest') {
        const img = this.add.image(
          event.x * TILE_SIZE, event.y * TILE_SIZE, 'env_barrel'
        )
        img.setOrigin(0, 0)
        img.setDisplaySize(TILE_SIZE, TILE_SIZE)
        img.setDepth(8)
      }

      const rect = this.add.rectangle(
        event.x * TILE_SIZE + event.width * TILE_SIZE / 2,
        event.y * TILE_SIZE + event.height * TILE_SIZE / 2,
        event.width * TILE_SIZE,
        event.height * TILE_SIZE,
        0xff0000, 0
      )
      rect.setDepth(20)
      rect.setData('event', event)
      this.eventObjects.push(rect)
    }
  }

  private setupInput(): void {
    cleanupKeyboardOnShutdown(this)
    const kb = this.input.keyboard!
    this.cursors = kb.createCursorKeys()
    this.wasd = {
      W: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    }
    this.syncDirectionalActionKeys(true)
    kb.on('keydown', (event: KeyboardEvent) => {
      if (this.time.now < this.inputResumeBlockedUntilMs) return
      const input = InputManager.getInstance()
      if (event.code === MAP_INPUT_CODES.WORLD_MAP) {
        this.openWorldMap()
      } else if (input.isConfirm(event.code)) {
        this.interact()
      } else if (input.isMenu(event.code) || input.isCancel(event.code)) {
        this.openMenu()
      }
    })

    this.input.on(Phaser.Input.Events.POINTER_UP, this.clearTouchDirectionForPointer, this)
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.clearTouchDirectionForPointer, this)
    this.scale.on(Phaser.Scale.Events.RESIZE, this.syncTouchControls, this)
  }

  private syncDirectionalActionKeys(force = false): void {
    const kb = this.input.keyboard
    if (!kb) return
    const input = InputManager.getInstance()
    const keyNames = {
      up: input.getPhaserKeyName('up'),
      down: input.getPhaserKeyName('down'),
      left: input.getPhaserKeyName('left'),
      right: input.getPhaserKeyName('right'),
    }
    const signature = `${keyNames.up}:${keyNames.down}:${keyNames.left}:${keyNames.right}`
    if (!force && signature === this.actionKeySignature) return
    this.actionKeySignature = signature
    this.actionKeys = {
      up: kb.addKey(keyNames.up),
      down: kb.addKey(keyNames.down),
      left: kb.addKey(keyNames.left),
      right: kb.addKey(keyNames.right),
    }
  }

  private shouldShowTouchControls(): boolean {
    return this.sys.game.device.input.touch
      || navigator.maxTouchPoints > 0
      || window.matchMedia(TOUCH_INPUT.DEVICE_MEDIA_QUERY).matches
      || window.innerWidth <= TOUCH_INPUT.MOBILE_VIEWPORT_MAX_WIDTH
  }

  private createTouchControls(): void {
    if (this.touchControls.length > 0 || !this.shouldShowTouchControls()) return

    this.createTouchDirectionButton(TOUCH_INPUT.DPAD_CENTER_X, TOUCH_INPUT.DPAD_CENTER_Y - TOUCH_INPUT.DPAD_BUTTON_OFFSET, '▲', 0, -1, DIRECTION.UP)
    this.createTouchDirectionButton(TOUCH_INPUT.DPAD_CENTER_X, TOUCH_INPUT.DPAD_CENTER_Y + TOUCH_INPUT.DPAD_BUTTON_OFFSET, '▼', 0, 1, DIRECTION.DOWN)
    this.createTouchDirectionButton(TOUCH_INPUT.DPAD_CENTER_X - TOUCH_INPUT.DPAD_BUTTON_OFFSET, TOUCH_INPUT.DPAD_CENTER_Y, '◀', -1, 0, DIRECTION.LEFT)
    this.createTouchDirectionButton(TOUCH_INPUT.DPAD_CENTER_X + TOUCH_INPUT.DPAD_BUTTON_OFFSET, TOUCH_INPUT.DPAD_CENTER_Y, '▶', 1, 0, DIRECTION.RIGHT)
    this.createTouchActionButton(TOUCH_INPUT.ACTION_BUTTON_X - TOUCH_INPUT.ACTION_BUTTON_SPACING, TOUCH_INPUT.ACTION_BUTTON_Y, '菜单', () => this.openMenu())
    this.createTouchActionButton(TOUCH_INPUT.ACTION_BUTTON_X, TOUCH_INPUT.ACTION_BUTTON_Y, '行动', () => this.interact())
  }

  private destroyTouchControls(): void {
    for (const control of this.touchControls) control.destroy()
    this.touchControls = []
    this.touchDirection = null
  }

  private syncTouchControls(): void {
    const shouldShowTouchControls = this.shouldShowTouchControls()
    if (shouldShowTouchControls !== this.touchLayoutActive) {
      this.touchLayoutActive = shouldShowTouchControls
      this.rebuildResponsiveHudForInputMode()
    }

    if (shouldShowTouchControls) {
      if (this.touchControls.length > 0) this.destroyTouchControls()
      this.createTouchControls()
      return
    }

    this.destroyTouchControls()
  }

  private rebuildResponsiveHudForInputMode(): void {
    this.feedbackToken++
    this.createPartyHud()
    this.destroyQuestHud()
    this.createQuestHud()
    this.recreatePrompt()
  }

  private getTouchSize(baseGamePx: number, minCssPx: number): number {
    return Math.max(baseGamePx, cssToGamePx(this, minCssPx))
  }

  private createTouchDirectionButton(x: number, y: number, label: string, dx: number, dy: number, dir: number): void {
    const buttonSize = this.getTouchSize(TOUCH_INPUT.DPAD_BUTTON_SIZE, TOUCH_INPUT.CONTROL_MIN_CSS_SIZE)
    const labelFontSize = this.getTouchSize(TOUCH_INPUT.DPAD_LABEL_FONT_SIZE, TOUCH_INPUT.DPAD_LABEL_MIN_CSS_FONT_SIZE)
    const button = this.add.rectangle(x, y, buttonSize, buttonSize, COLORS.black, TOUCH_INPUT.POINTER_ALPHA)
    button.setStrokeStyle(TOUCH_INPUT.POINTER_STROKE_WIDTH, COLORS.white, TOUCH_INPUT.POINTER_ALPHA)
    button.setDepth(TOUCH_INPUT.CONTROLS_DEPTH)
    button.setScrollFactor(0)
    button.setInteractive({ useHandCursor: true })

    const text = this.add.text(x, y, label, {
      fontSize: `${labelFontSize}px`,
      color: TOUCH_INPUT.LABEL_COLOR,
      fontFamily: TOUCH_INPUT.LABEL_FONT_FAMILY,
    }).setOrigin(0.5)
    text.setDepth(TOUCH_INPUT.CONTROLS_DEPTH + TOUCH_INPUT.LABEL_DEPTH_OFFSET)
    text.setScrollFactor(0)
    text.setInteractive({ useHandCursor: true })

    const activate = (pointer: Phaser.Input.Pointer): void => {
      this.setTouchDirection(pointer, dx, dy, dir)
      button.setAlpha(TOUCH_INPUT.POINTER_HOVER_ALPHA)
    }
    const release = (pointer: Phaser.Input.Pointer): void => {
      this.clearTouchDirectionForPointer(pointer)
      button.setAlpha(TOUCH_INPUT.POINTER_ALPHA)
    }

    button.on(Phaser.Input.Events.POINTER_DOWN, activate)
    button.on(Phaser.Input.Events.POINTER_UP, release)
    button.on(Phaser.Input.Events.POINTER_OUT, release)
    text.on(Phaser.Input.Events.POINTER_DOWN, activate)
    text.on(Phaser.Input.Events.POINTER_UP, release)
    text.on(Phaser.Input.Events.POINTER_OUT, release)
    this.touchControls.push(button, text)
  }

  private createTouchActionButton(x: number, y: number, label: string, onPress: () => void): void {
    const buttonSize = this.getTouchSize(TOUCH_INPUT.ACTION_BUTTON_SIZE, TOUCH_INPUT.CONTROL_MIN_CSS_SIZE)
    const labelFontSize = this.getTouchSize(TOUCH_INPUT.ACTION_LABEL_FONT_SIZE, TOUCH_INPUT.ACTION_LABEL_MIN_CSS_FONT_SIZE)
    const button = this.add.rectangle(x, y, buttonSize, buttonSize, COLORS.black, TOUCH_INPUT.POINTER_ALPHA)
    button.setStrokeStyle(TOUCH_INPUT.POINTER_STROKE_WIDTH, COLORS.white, TOUCH_INPUT.POINTER_ALPHA)
    button.setDepth(TOUCH_INPUT.CONTROLS_DEPTH)
    button.setScrollFactor(0)
    button.setInteractive({ useHandCursor: true })

    const text = this.add.text(x, y, label, {
      fontSize: `${labelFontSize}px`,
      color: TOUCH_INPUT.LABEL_COLOR,
      fontFamily: TOUCH_INPUT.LABEL_FONT_FAMILY,
    }).setOrigin(0.5)
    text.setDepth(TOUCH_INPUT.CONTROLS_DEPTH + TOUCH_INPUT.LABEL_DEPTH_OFFSET)
    text.setScrollFactor(0)
    text.setInteractive({ useHandCursor: true })

    const activate = (): void => {
      button.setAlpha(TOUCH_INPUT.POINTER_HOVER_ALPHA)
      onPress()
    }
    const release = (): void => {
      button.setAlpha(TOUCH_INPUT.POINTER_ALPHA)
    }

    button.on(Phaser.Input.Events.POINTER_DOWN, activate)
    button.on(Phaser.Input.Events.POINTER_UP, release)
    button.on(Phaser.Input.Events.POINTER_OUT, release)
    text.on(Phaser.Input.Events.POINTER_DOWN, activate)
    text.on(Phaser.Input.Events.POINTER_UP, release)
    text.on(Phaser.Input.Events.POINTER_OUT, release)
    this.touchControls.push(button, text)
  }

  private setTouchDirection(pointer: Phaser.Input.Pointer, dx: number, dy: number, dir: number): void {
    this.touchDirection = { dx, dy, dir, pointerId: pointer.id }
  }

  private clearTouchDirectionForPointer(pointer: Phaser.Input.Pointer): void {
    if (this.touchDirection?.pointerId === pointer.id) this.touchDirection = null
  }

  private canUseQuickSaveLoad(): boolean {
    return this.isGameplayInputActive() && !this.inEvent && !this.restartingMap
  }

  private isGameplayInputActive(): boolean {
    return this.scene.isActive() === true
  }

  private showMapFeedback(text: string, success: boolean): void {
    const token = ++this.feedbackToken
    const feedbackColor = success ? MAP_HUD.FEEDBACK_SUCCESS_COLOR : MAP_HUD.FEEDBACK_ERROR_COLOR
    if (this.promptText) {
      this.promptText.setText(text)
      this.promptText.setColor(feedbackColor)
      this.promptText.setBackgroundColor(MAP_HUD.FEEDBACK_BACKGROUND_COLOR)
      this.time.delayedCall(MAP_HUD.FEEDBACK_HOLD_MS, () => {
        if (this.feedbackToken !== token || !this.promptText) return
        this.promptText.setText(this.formatDefaultPrompt())
        this.promptText.setColor(MAP_HUD.PROMPT_COLOR)
        this.promptText.setBackgroundColor(MAP_HUD.PROMPT_BACKGROUND_COLOR)
      })
    }

    this.mapFeedbackText?.destroy()
    const feedback = this.add.text(GAME_WIDTH / 2, MAP_HUD.FEEDBACK_Y, text, {
      fontSize: `${MAP_HUD.FEEDBACK_FONT_SIZE}px`,
      color: feedbackColor,
      fontFamily: UI_FONT_FAMILY,
      backgroundColor: MAP_HUD.FEEDBACK_BACKGROUND_COLOR,
      padding: { x: MAP_HUD.FEEDBACK_PADDING_X, y: MAP_HUD.FEEDBACK_PADDING_Y },
    })
    feedback.setOrigin(0.5)
    feedback.setScrollFactor(0)
    feedback.setDepth(MAP_HUD.FEEDBACK_DEPTH)
    this.mapFeedbackText = feedback
    this.time.delayedCall(MAP_HUD.FEEDBACK_HOLD_MS, () => {
      if (this.mapFeedbackText !== feedback) return
      this.tweens.add({
        targets: feedback,
        alpha: 0,
        duration: MAP_HUD.FEEDBACK_FADE_MS,
        onComplete: () => {
          if (this.mapFeedbackText === feedback) this.mapFeedbackText = undefined
          feedback.destroy()
        },
      })
    })
  }

  private createUI(): void {
    this.createPartyHud()
    this.createQuestHud()
    this.createPrompt()
  }

  private createPrompt(): void {
    const touchControls = this.shouldShowTouchControls()
    const promptYOffset = touchControls ? MAP_HUD.TOUCH_PROMPT_Y_OFFSET : MAP_HUD.PROMPT_Y_OFFSET
    const promptFontSize = touchControls
      ? this.getTouchSize(MAP_HUD.TOUCH_PROMPT_FONT_SIZE, TOUCH_INPUT.PROMPT_MIN_CSS_FONT_SIZE)
      : MAP_HUD.PROMPT_FONT_SIZE
    const promptPaddingX = touchControls ? MAP_HUD.TOUCH_PROMPT_PADDING_X : MAP_HUD.PROMPT_PADDING_X
    const promptPaddingY = touchControls ? MAP_HUD.TOUCH_PROMPT_PADDING_Y : MAP_HUD.PROMPT_PADDING_Y
    const promptText = touchControls ? MAP_HUD.TOUCH_PROMPT_TEXT : this.formatDefaultPrompt()
    const prompt = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - promptYOffset, promptText, {
      fontSize: `${promptFontSize}px`,
      color: MAP_HUD.PROMPT_COLOR,
      fontFamily: UI_FONT_FAMILY,
      backgroundColor: MAP_HUD.PROMPT_BACKGROUND_COLOR,
      padding: { x: promptPaddingX, y: promptPaddingY },
    })
    prompt.setOrigin(0.5)
    prompt.setScrollFactor(0)
    prompt.setDepth(MAP_HUD.PROMPT_DEPTH)
    this.promptText = prompt
    this.uiTexts.push(prompt)
  }

  private recreatePrompt(): void {
    if (this.promptText) {
      const prompt = this.promptText
      this.uiTexts = this.uiTexts.filter(text => text !== prompt)
      prompt.destroy()
      this.promptText = undefined
    }
    this.createPrompt()
  }

  private updatePrompt(): void {
    if (!this.promptText) return
    const event = this.getActionEventAhead()
    const nextText = event ? this.formatActionPrompt(event) : this.formatDefaultPrompt()
    if (this.promptText.text !== nextText) {
      this.promptText.setText(nextText)
    }
  }

  private getActionEventAhead(): MapEvent | null {
    const px = Math.floor(this.player.x / TILE_SIZE)
    const py = Math.floor(this.player.y / TILE_SIZE)
    const dx = DIRECTION_VECTORS[this.currentDir]!.x
    const dy = DIRECTION_VECTORS[this.currentDir]!.y
    const fx = px + dx
    const fy = py + dy

    for (const event of this.mapData.events) {
      if (this.isSuppressedFieldEvent(event)) continue
      if (this.isFieldEventCompleted(event)) continue
      if (event.trigger !== 'action') continue
      if (!this.areEventConditionsMet(event)) continue
      if (this.canInteractWithEvent(event, px, py, fx, fy)) return event
    }
    return null
  }

  private formatActionPrompt(event: MapEvent): string {
    const label = this.getPromptActionLabel(event)
    if (this.shouldShowTouchControls()) {
      return `${MAP_HUD.TOUCH_PROMPT_ACTION_PREFIX}${label}`
    }
    return `${this.getPromptConfirmPrefix()}${label}${MAP_HUD.PROMPT_COMMAND_SEPARATOR}${MAP_HUD.OPEN_HINT}${MAP_HUD.PROMPT_COMMAND_SEPARATOR}${MAP_HUD.PROMPT_MENU_TEXT}`
  }

  private formatDefaultPrompt(): string {
    if (this.shouldShowTouchControls()) return MAP_HUD.TOUCH_PROMPT_TEXT
    return `${this.getPromptConfirmPrefix()}调查/对话${MAP_HUD.PROMPT_COMMAND_SEPARATOR}${MAP_HUD.OPEN_HINT}${MAP_HUD.PROMPT_COMMAND_SEPARATOR}${MAP_HUD.PROMPT_MENU_TEXT}`
  }

  private getPromptConfirmPrefix(): string {
    const confirmKey = InputManager.getInstance().getActionName('confirm')
    const promptKey = confirmKey === MAP_HUD.PROMPT_CONFIRM_FALLBACK
      ? confirmKey
      : `${confirmKey}${MAP_HUD.PROMPT_KEY_JOIN}${MAP_HUD.PROMPT_CONFIRM_FALLBACK}`
    return `${promptKey}${MAP_HUD.PROMPT_CONFIRM_PREFIX_SUFFIX}`
  }

  private getPromptActionLabel(event: MapEvent): string {
    const labels = MAP_HUD.PROMPT_ACTION_LABELS
    if (event.actions.some(action => action.type === 'shop')) return labels.shop
    if (event.actions.some(action => action.type === 'training')) return labels.training
    if (event.actions.some(action => action.type === 'rebuildMenu')) return labels.rebuildMenu
    return labels[event.type]
  }

  private addRuntimePanel(x: number, y: number, width: number, height: number, textureKey: string, fallbackColor: number, fallbackAlpha: number): Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle {
    return createRuntimePanel(this, x, y, width, height, textureKey, fallbackColor, fallbackAlpha, {
      depth: MAP_HUD.DEPTH,
      origin: { x: 0, y: 0 },
    })
  }

  private createPartyHud(): void {
    this.destroyPartyHud()
    const gd = GameData.getInstance()
    const members = this.getPartyHudMembers()
    this.partyHudPartyKey = this.getPartyHudKey(members)
    const touchControls = this.shouldShowTouchControls()
    const nameFontSize = touchControls
      ? this.getTouchSize(MAP_HUD.PARTY_NAME_FONT_SIZE, MAP_HUD.TOUCH_PARTY_NAME_MIN_CSS_FONT_SIZE)
      : MAP_HUD.PARTY_NAME_FONT_SIZE
    const levelFontSize = touchControls
      ? this.getTouchSize(MAP_HUD.PARTY_LEVEL_FONT_SIZE, MAP_HUD.TOUCH_PARTY_LEVEL_MIN_CSS_FONT_SIZE)
      : MAP_HUD.PARTY_LEVEL_FONT_SIZE
    const statusFontSize = touchControls
      ? this.getTouchSize(MAP_HUD.PARTY_STATUS_FONT_SIZE, MAP_HUD.TOUCH_PARTY_STATUS_MIN_CSS_FONT_SIZE)
      : MAP_HUD.PARTY_STATUS_FONT_SIZE
    const showNumericValues = !touchControls || MAP_HUD.TOUCH_PARTY_SHOW_NUMERIC_VALUES

    for (const [index, charId] of members.entries()) {
      const char = gd.characters.get(charId)
      if (!char) continue

      const rowX = MAP_HUD.PARTY_X
      const rowY = MAP_HUD.PARTY_Y + index * (MAP_HUD.PARTY_ROW_HEIGHT + MAP_HUD.PARTY_ROW_GAP)
      const panel = this.addRuntimePanel(rowX, rowY, MAP_HUD.PARTY_ROW_WIDTH, MAP_HUD.PARTY_ROW_HEIGHT, RUNTIME_UI_ASSET_KEYS.CARD, MAP_HUD.PARTY_BACKGROUND_COLOR, MAP_HUD.PARTY_PANEL_ALPHA)
      this.addPartyHudObject(panel)
      const panelBorder = this.add.rectangle(rowX, rowY, MAP_HUD.PARTY_ROW_WIDTH, MAP_HUD.PARTY_ROW_HEIGHT, COLORS.black, 0)
      panelBorder.setOrigin(0, 0)
      panelBorder.setStrokeStyle(
        MAP_HUD.BORDER_WIDTH,
        index === MAP_HUD.PARTY_LEADER_INDEX ? COLORS.uiHighlight : COLORS.uiBorder,
        index === MAP_HUD.PARTY_LEADER_INDEX ? MAP_HUD.PARTY_LEADER_BORDER_ALPHA : MAP_HUD.PARTY_BORDER_ALPHA,
      )
      this.addPartyHudObject(panelBorder)

      const portraitX = rowX + MAP_HUD.PARTY_INNER_PADDING
      const portraitY = rowY + MAP_HUD.PARTY_INNER_PADDING
      const portraitFrame = this.add.rectangle(portraitX, portraitY, MAP_HUD.PARTY_PORTRAIT_SIZE, MAP_HUD.PARTY_PORTRAIT_SIZE, COLORS.black, MAP_HUD.PARTY_PORTRAIT_BG_ALPHA)
      portraitFrame.setOrigin(0, 0)
      portraitFrame.setStrokeStyle(MAP_HUD.BORDER_WIDTH, COLORS.uiBorder, MAP_HUD.PARTY_BORDER_ALPHA)
      this.addPartyHudObject(portraitFrame)

      const spriteBase = this.getCharacterSpriteBase(charId)
      const spriteKey = this.resolveTextureKey(`${spriteBase}_front_idle_01`, DEFAULT_CHARACTER_SPRITE_KEY)
      if (spriteKey) {
        const portrait = this.add.image(portraitX + MAP_HUD.PARTY_PORTRAIT_CENTER_OFFSET, portraitY + MAP_HUD.PARTY_PORTRAIT_CENTER_OFFSET, spriteKey)
        portrait.setDisplaySize(MAP_HUD.PARTY_PORTRAIT_IMAGE_SIZE, MAP_HUD.PARTY_PORTRAIT_IMAGE_SIZE)
        this.addPartyHudObject(portrait)
      }

      const textX = rowX + MAP_HUD.PARTY_TEXT_OFFSET_X
      const levelX = rowX + MAP_HUD.PARTY_ROW_WIDTH - MAP_HUD.PARTY_LEVEL_RIGHT
      const nameText = this.add.text(textX, rowY + MAP_HUD.PARTY_NAME_Y, char.name, {
        fontSize: `${nameFontSize}px`,
        color: MAP_HUD.PARTY_NAME_COLOR,
        fontFamily: UI_FONT_FAMILY,
        fixedWidth: MAP_HUD.PARTY_NAME_WIDTH,
        maxLines: MAP_HUD.PARTY_NAME_MAX_LINES,
      })
      this.addPartyHudObject(nameText)

      const levelText = this.add.text(levelX, rowY + MAP_HUD.PARTY_NAME_Y, '', {
        fontSize: `${levelFontSize}px`,
        color: MAP_HUD.PARTY_LEVEL_COLOR,
        fontFamily: UI_FONT_FAMILY,
      })
      levelText.setOrigin(1, 0)
      this.addPartyHudObject(levelText)

      const hpRow = this.createPartyHudBar(rowX, rowY + MAP_HUD.PARTY_HP_BAR_Y, MAP_HUD.PARTY_HP_LABEL, COLORS.hpBar, statusFontSize, showNumericValues)
      const mpRow = this.createPartyHudBar(rowX, rowY + MAP_HUD.PARTY_MP_BAR_Y, MAP_HUD.PARTY_MP_LABEL, COLORS.mpBar, statusFontSize, showNumericValues)
      this.partyHudRows.push({ charId, hpBar: hpRow.bar, mpBar: mpRow.bar, hpText: hpRow.text, mpText: mpRow.text, levelText })
    }

    this.updatePartyHud()
  }

  private createPartyHudBar(rowX: number, barY: number, label: string, color: number, fontSize: number, showNumericValue: boolean): { bar: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text } {
    const labelX = rowX + MAP_HUD.PARTY_TEXT_OFFSET_X
    const barX = labelX + MAP_HUD.PARTY_BAR_LABEL_WIDTH
    const valueX = barX + MAP_HUD.PARTY_BAR_WIDTH + MAP_HUD.PARTY_BAR_VALUE_GAP
    const labelText = this.add.text(labelX, barY, label, {
      fontSize: `${fontSize}px`,
      color: MAP_HUD.PARTY_STATUS_COLOR,
      fontFamily: UI_FONT_FAMILY,
    })
    labelText.setOrigin(0, 0.5)
    this.addPartyHudObject(labelText)

    const bg = this.add.rectangle(barX, barY, MAP_HUD.PARTY_BAR_WIDTH, MAP_HUD.PARTY_BAR_HEIGHT, COLORS.black, MAP_HUD.PARTY_BAR_BG_ALPHA)
    bg.setOrigin(0, 0.5)
    this.addPartyHudObject(bg)

    const bar = this.add.rectangle(barX, barY, MAP_HUD.PARTY_BAR_WIDTH, MAP_HUD.PARTY_BAR_HEIGHT, color, MAP_HUD.PARTY_BAR_ALPHA)
    bar.setOrigin(0, 0.5)
    this.addPartyHudObject(bar)

    const valueText = this.add.text(valueX, barY, '', {
      fontSize: `${fontSize}px`,
      color: MAP_HUD.PARTY_STATUS_COLOR,
      fontFamily: UI_FONT_FAMILY,
    })
    valueText.setOrigin(0, 0.5)
    valueText.setVisible(showNumericValue)
    this.addPartyHudObject(valueText)
    return { bar, text: valueText }
  }

  private addPartyHudObject<T extends PartyHudObject>(object: T): T {
    object.setScrollFactor(0)
    object.setDepth(MAP_HUD.DEPTH)
    this.partyHudObjects.push(object)
    return object
  }

  private destroyPartyHud(): void {
    for (const object of this.partyHudObjects) object.destroy()
    this.partyHudObjects = []
    this.partyHudRows = []
    this.partyHudPartyKey = ''
  }

  private updatePartyHud(): void {
    const members = this.getPartyHudMembers()
    const partyKey = this.getPartyHudKey(members)
    if (partyKey !== this.partyHudPartyKey) {
      this.createPartyHud()
      return
    }

    const gd = GameData.getInstance()
    for (const row of this.partyHudRows) {
      const char = gd.characters.get(row.charId)
      if (!char) continue

      if (row.lastLevel !== char.stats.level) {
        row.levelText.setText(`${MAP_HUD.PARTY_LEVEL_PREFIX}${char.stats.level}`)
        row.lastLevel = char.stats.level
      }

      if (row.lastHp !== char.stats.hp || row.lastMaxHp !== char.stats.maxHp) {
        row.hpText.setText(`${char.stats.hp}/${char.stats.maxHp}`)
        this.updatePartyHudBar(row.hpBar, this.getPartyHudStatRatio(char.stats.hp, char.stats.maxHp))
        row.lastHp = char.stats.hp
        row.lastMaxHp = char.stats.maxHp
      }

      if (row.lastMp !== char.stats.mp || row.lastMaxMp !== char.stats.maxMp) {
        row.mpText.setText(`${char.stats.mp}/${char.stats.maxMp}`)
        this.updatePartyHudBar(row.mpBar, this.getPartyHudStatRatio(char.stats.mp, char.stats.maxMp))
        row.lastMp = char.stats.mp
        row.lastMaxMp = char.stats.maxMp
      }
    }
  }

  private updatePartyHudBar(bar: Phaser.GameObjects.Rectangle, ratio: number): void {
    bar.setDisplaySize(MAP_HUD.PARTY_BAR_WIDTH * ratio, MAP_HUD.PARTY_BAR_HEIGHT)
    bar.setVisible(ratio > MAP_HUD.PARTY_RATIO_MIN)
  }

  private getPartyHudStatRatio(value: number, max: number): number {
    if (max <= MAP_HUD.PARTY_EMPTY_STAT_MAX) return MAP_HUD.PARTY_RATIO_MIN
    return Phaser.Math.Clamp(value / max, MAP_HUD.PARTY_RATIO_MIN, MAP_HUD.PARTY_RATIO_MAX)
  }

  private getPartyHudMembers(): string[] {
    return GameData.getInstance().party.slice(MAP_HUD.PARTY_LEADER_INDEX, MAP_HUD.PARTY_MAX_ROWS)
  }

  private getPartyHudKey(members: string[]): string {
    return members.join(MAP_HUD.PARTY_KEY_SEPARATOR)
  }

  private createQuestHud(): void {
    const states = QuestSystem.getInstance().getActiveQuests().slice(0, MAP_HUD.QUEST_VISIBLE_COUNT)
    const nextKey = this.getQuestHudKey(states)
    if (nextKey === this.questHudKey) return

    this.destroyQuestHud()
    this.questHudKey = nextKey
    if (states.length === 0) return

    const panel = this.addRuntimePanel(MAP_HUD.QUEST_X, MAP_HUD.QUEST_Y, MAP_HUD.QUEST_WIDTH, MAP_HUD.QUEST_HEIGHT, RUNTIME_UI_ASSET_KEYS.QUEST, MAP_HUD.BACKGROUND_COLOR, MAP_HUD.QUEST_PANEL_ALPHA)
    this.addQuestHudObject(panel)
    const panelBorder = this.add.rectangle(MAP_HUD.QUEST_X, MAP_HUD.QUEST_Y, MAP_HUD.QUEST_WIDTH, MAP_HUD.QUEST_HEIGHT, COLORS.black, 0)
    panelBorder.setOrigin(0, 0)
    panelBorder.setStrokeStyle(MAP_HUD.BORDER_WIDTH, MAP_HUD.BORDER_COLOR, MAP_HUD.QUEST_BORDER_ALPHA)
    this.addQuestHudObject(panelBorder)

    const touchControls = this.shouldShowTouchControls()
    const titleFontSize = touchControls
      ? this.getTouchSize(MAP_HUD.QUEST_TITLE_FONT_SIZE, MAP_HUD.TOUCH_QUEST_TITLE_MIN_CSS_FONT_SIZE)
      : MAP_HUD.QUEST_TITLE_FONT_SIZE
    const nameFontSize = touchControls
      ? this.getTouchSize(MAP_HUD.QUEST_NAME_FONT_SIZE, MAP_HUD.TOUCH_QUEST_NAME_MIN_CSS_FONT_SIZE)
      : MAP_HUD.QUEST_NAME_FONT_SIZE
    const bodyFontSize = touchControls
      ? this.getTouchSize(MAP_HUD.QUEST_BODY_FONT_SIZE, MAP_HUD.TOUCH_QUEST_BODY_MIN_CSS_FONT_SIZE)
      : MAP_HUD.QUEST_BODY_FONT_SIZE
    const progressFontSize = touchControls
      ? this.getTouchSize(MAP_HUD.QUEST_PROGRESS_FONT_SIZE, MAP_HUD.TOUCH_QUEST_PROGRESS_MIN_CSS_FONT_SIZE)
      : MAP_HUD.QUEST_PROGRESS_FONT_SIZE

    const title = this.add.text(MAP_HUD.QUEST_X + MAP_HUD.QUEST_PADDING_X, MAP_HUD.QUEST_Y + MAP_HUD.QUEST_TITLE_Y, MAP_HUD.QUEST_TITLE_TEXT, {
      fontSize: `${titleFontSize}px`,
      color: MAP_HUD.QUEST_TITLE_COLOR,
      fontFamily: UI_FONT_FAMILY,
    })
    this.addQuestHudObject(title)

    const state = states[MAP_HUD.QUEST_FALLBACK_OBJECTIVE_INDEX]!
    const quest = GAME_CONFIG_DATABASE.getTable('quests')[state.id]
    const display = quest
      ? resolveQuestProgressDisplay(quest, state, flag => GameData.getInstance().getFlag(flag))
      : { objective: state.id, progress: state.progress, maxProgress: state.maxProgress }

    const name = this.add.text(MAP_HUD.QUEST_X + MAP_HUD.QUEST_PADDING_X, MAP_HUD.QUEST_Y + MAP_HUD.QUEST_NAME_Y, quest?.name ?? state.id, {
      fontSize: `${nameFontSize}px`,
      color: MAP_HUD.QUEST_NAME_COLOR,
      fontFamily: UI_FONT_FAMILY,
      fixedWidth: MAP_HUD.QUEST_TEXT_WIDTH,
      maxLines: MAP_HUD.QUEST_NAME_MAX_LINES,
    })
    this.addQuestHudObject(name)

    const body = this.add.text(MAP_HUD.QUEST_X + MAP_HUD.QUEST_PADDING_X, MAP_HUD.QUEST_Y + MAP_HUD.QUEST_OBJECTIVE_Y, display.objective, {
      fontSize: `${bodyFontSize}px`,
      color: MAP_HUD.QUEST_TEXT_COLOR,
      fontFamily: UI_FONT_FAMILY,
      fixedWidth: MAP_HUD.QUEST_TEXT_WIDTH,
      wordWrap: { width: MAP_HUD.QUEST_TEXT_WIDTH, useAdvancedWrap: true },
      maxLines: MAP_HUD.QUEST_BODY_MAX_LINES,
    })
    this.addQuestHudObject(body)

    const progress = this.add.text(MAP_HUD.QUEST_X + MAP_HUD.QUEST_PADDING_X, MAP_HUD.QUEST_Y + MAP_HUD.QUEST_PROGRESS_Y, `${MAP_HUD.QUEST_PROGRESS_PREFIX} ${display.progress}/${display.maxProgress}`, {
      fontSize: `${progressFontSize}px`,
      color: MAP_HUD.QUEST_PROGRESS_COLOR,
      fontFamily: UI_FONT_FAMILY,
    })
    this.addQuestHudObject(progress)
  }

  private addQuestHudObject<T extends PartyHudObject>(object: T): T {
    object.setScrollFactor(0)
    object.setDepth(MAP_HUD.DEPTH)
    this.questHudObjects.push(object)
    return object
  }

  private destroyQuestHud(): void {
    for (const object of this.questHudObjects) object.destroy()
    this.questHudObjects = []
    this.questHudKey = ''
  }

  private getQuestHudKey(states: QuestState[]): string {
    return states.map(state => `${state.id}:${state.status}:${state.progress}:${state.maxProgress}`).join(MAP_HUD.QUEST_KEY_SEPARATOR)
  }

  private createMinimap(): void {
    const panel = this.addRuntimePanel(MAP_HUD.MINIMAP_X, MAP_HUD.MINIMAP_Y, MAP_HUD.MINIMAP_WIDTH, MAP_HUD.MINIMAP_HEIGHT, RUNTIME_UI_ASSET_KEYS.MINIMAP, MAP_HUD.BACKGROUND_COLOR, MAP_HUD.PANEL_ALPHA)
    panel.setScrollFactor(0)
    panel.setDepth(MAP_HUD.DEPTH - MAP_HUD.MARKER_DEPTH_OFFSET)

    const graphics = this.add.graphics()
    graphics.setScrollFactor(0)
    graphics.setDepth(MAP_HUD.DEPTH)
    this.minimapGraphics = graphics
    this.drawMinimapStatic(graphics)

    const dynamicGraphics = this.add.graphics()
    dynamicGraphics.setScrollFactor(0)
    dynamicGraphics.setDepth(MAP_HUD.DEPTH + MAP_HUD.MARKER_DEPTH_OFFSET)
    this.minimapDynamicGraphics = dynamicGraphics
    this.updateMinimapDynamicMarkers()

    const geometry = this.getMinimapGeometry()
    this.minimapPlayerMarker = this.add.rectangle(geometry.offsetX, geometry.offsetY, MAP_HUD.PLAYER_MARKER_SIZE, MAP_HUD.PLAYER_MARKER_SIZE, MAP_HUD.PLAYER_COLOR)
    this.minimapPlayerMarker.setScrollFactor(0)
    this.minimapPlayerMarker.setDepth(MAP_HUD.DEPTH + MAP_HUD.MARKER_DEPTH_OFFSET)

    const hitArea = this.add.rectangle(MAP_HUD.MINIMAP_X, MAP_HUD.MINIMAP_Y, MAP_HUD.MINIMAP_WIDTH, MAP_HUD.MINIMAP_HEIGHT, MAP_HUD.BACKGROUND_COLOR, 0)
    hitArea.setOrigin(0, 0)
    hitArea.setScrollFactor(0)
    hitArea.setDepth(MAP_HUD.DEPTH + MAP_HUD.HIT_AREA_DEPTH_OFFSET)
    hitArea.setInteractive({ useHandCursor: true })
    hitArea.on(Phaser.Input.Events.POINTER_DOWN, () => this.openWorldMap())

    const label = this.add.text(MAP_HUD.MINIMAP_X + MAP_HUD.MINIMAP_WIDTH - MAP_HUD.LABEL_OFFSET_X, MAP_HUD.MINIMAP_Y + MAP_HUD.MINIMAP_HEIGHT - MAP_HUD.LABEL_OFFSET_Y, MAP_HUD.OPEN_HINT, {
      fontSize: `${MAP_HUD.LABEL_FONT_SIZE}px`,
      color: MAP_HUD.LABEL_COLOR,
      fontFamily: MAP_HUD.LABEL_FONT_FAMILY,
    })
    label.setOrigin(1, 0.5)
    label.setScrollFactor(0)
    label.setDepth(MAP_HUD.DEPTH + MAP_HUD.LABEL_DEPTH_OFFSET)
    this.updateMinimapPlayerMarker()
  }

  private drawMinimapStatic(graphics: Phaser.GameObjects.Graphics): void {
    const geometry = this.getMinimapGeometry()
    graphics.clear()
    graphics.fillStyle(MAP_HUD.BACKGROUND_COLOR, MAP_HUD.PANEL_ALPHA)
    graphics.fillRect(MAP_HUD.MINIMAP_X, MAP_HUD.MINIMAP_Y, MAP_HUD.MINIMAP_WIDTH, MAP_HUD.MINIMAP_HEIGHT)
    graphics.fillStyle(MAP_HUD.MAP_COLOR, MAP_HUD.MAP_ALPHA)
    graphics.fillRect(geometry.offsetX, geometry.offsetY, geometry.width, geometry.height)
    graphics.fillStyle(MAP_HUD.COLLISION_COLOR, MAP_HUD.COLLISION_ALPHA)
    for (const index of this.mapData.collisions) {
      const x = index % this.mapData.width
      const y = Math.floor(index / this.mapData.width)
      graphics.fillRect(geometry.offsetX + x * geometry.scale, geometry.offsetY + y * geometry.scale, geometry.scale, geometry.scale)
    }
    for (const event of this.mapData.events) {
      if (!this.isMinimapEventVisible(event)) continue
      if (this.isDynamicMinimapEvent(event)) continue
      const color = MAP_HUD.EVENT_COLORS[event.type] ?? MAP_HUD.EVENT_COLORS.trigger
      const width = Math.max(MAP_HUD.EVENT_MARKER_MIN_SIZE, event.width * geometry.scale)
      const height = Math.max(MAP_HUD.EVENT_MARKER_MIN_SIZE, event.height * geometry.scale)
      graphics.fillStyle(color, MAP_HUD.EVENT_ALPHA)
      graphics.fillRect(geometry.offsetX + event.x * geometry.scale, geometry.offsetY + event.y * geometry.scale, width, height)
    }
    graphics.lineStyle(MAP_HUD.BORDER_WIDTH, MAP_HUD.BORDER_COLOR, MAP_HUD.BORDER_ALPHA)
    graphics.strokeRect(MAP_HUD.MINIMAP_X, MAP_HUD.MINIMAP_Y, MAP_HUD.MINIMAP_WIDTH, MAP_HUD.MINIMAP_HEIGHT)
    graphics.strokeRect(geometry.offsetX, geometry.offsetY, geometry.width, geometry.height)
  }

  private refreshMinimapStatic(): void {
    if (!this.minimapGraphics) return
    this.drawMinimapStatic(this.minimapGraphics)
  }

  private isMinimapEventVisible(event: MapEvent): boolean {
    if (this.isSuppressedFieldEvent(event)) return false
    if (!this.areEventConditionsMet(event)) return false
    if (event.type === 'battle') return this.battleEnemies.has(event.id)
    return !this.isFieldEventCompleted(event)
  }

  private isDynamicMinimapEvent(event: MapEvent): boolean {
    return (event.type === 'npc' && this.npcs.has(event.id)) ||
      (event.type === 'battle' && this.battleEnemies.has(event.id))
  }

  private updateMinimapDynamicMarkers(): void {
    if (!this.minimapDynamicGraphics) return
    const graphics = this.minimapDynamicGraphics
    const geometry = this.getMinimapGeometry()
    graphics.clear()

    for (const event of this.mapData.events) {
      if (!this.isMinimapEventVisible(event)) continue
      if (!this.isDynamicMinimapEvent(event)) continue
      const sprite = event.type === 'battle' ? this.battleEnemies.get(event.id) : this.npcs.get(event.id)
      if (!sprite || !this.isSpriteUsable(sprite)) continue
      const color = MAP_HUD.EVENT_COLORS[event.type] ?? MAP_HUD.EVENT_COLORS.trigger
      this.drawDynamicMinimapMarker(graphics, geometry, sprite, color)
    }

    for (const [eventId, sprite] of this.battleEnemies) {
      if (this.mapData.events.some(event => event.id === eventId)) continue
      if (!this.isSpriteUsable(sprite)) continue
      this.drawDynamicMinimapMarker(graphics, geometry, sprite, MAP_HUD.EVENT_COLORS.battle)
    }
  }

  private drawDynamicMinimapMarker(
    graphics: Phaser.GameObjects.Graphics,
    geometry: ReturnType<MapScene['getMinimapGeometry']>,
    sprite: Phaser.GameObjects.Sprite,
    color: number,
  ): void {
    const width = Math.max(MAP_HUD.EVENT_MARKER_MIN_SIZE, (sprite.displayWidth / TILE_SIZE) * geometry.scale)
    const height = Math.max(MAP_HUD.EVENT_MARKER_MIN_SIZE, (sprite.displayHeight / TILE_SIZE) * geometry.scale)
    graphics.fillStyle(color, MAP_HUD.EVENT_ALPHA)
    graphics.fillRect(
      geometry.offsetX + (sprite.x / TILE_SIZE) * geometry.scale - width / 2,
      geometry.offsetY + (sprite.y / TILE_SIZE) * geometry.scale - height / 2,
      width,
      height,
    )
  }

  private getMinimapGeometry(): { scale: number; offsetX: number; offsetY: number; width: number; height: number } {
    const innerWidth = MAP_HUD.MINIMAP_WIDTH - MAP_HUD.INNER_PADDING * 2
    const innerHeight = MAP_HUD.MINIMAP_HEIGHT - MAP_HUD.INNER_PADDING * 2
    const scale = Math.min(innerWidth / this.mapData.width, innerHeight / this.mapData.height)
    const width = this.mapData.width * scale
    const height = this.mapData.height * scale
    return {
      scale,
      offsetX: MAP_HUD.MINIMAP_X + MAP_HUD.INNER_PADDING + (innerWidth - width) / 2,
      offsetY: MAP_HUD.MINIMAP_Y + MAP_HUD.INNER_PADDING + (innerHeight - height) / 2,
      width,
      height,
    }
  }

  private updateMinimapPlayerMarker(): void {
    if (!this.minimapPlayerMarker || !this.player) return
    const geometry = this.getMinimapGeometry()
    this.minimapPlayerMarker.setPosition(
      geometry.offsetX + (this.player.x / TILE_SIZE) * geometry.scale,
      geometry.offsetY + (this.player.y / TILE_SIZE) * geometry.scale,
    )
  }

  private showMapName(): void {
    const mapNameText = this.add.text(GAME_WIDTH / 2, scalePx(40), this.mapData.name, {
      fontSize: scaleFont(24),
      color: '#ffffff',
      backgroundColor: '#00000060',
      padding: { x: scalePx(12), y: scalePx(6) },
    })
    this.mapNameText = mapNameText
    mapNameText.setOrigin(0.5)
    mapNameText.setScrollFactor(0)
    mapNameText.setDepth(100)
    mapNameText.setAlpha(0)

    this.tweens.add({
      targets: mapNameText,
      alpha: 1,
      duration: 500,
      onComplete: () => {
        this.time.delayedCall(2000, () => {
          if (!mapNameText.active) return
          this.tweens.add({
            targets: mapNameText,
            alpha: 0,
            duration: 500,
          })
        })
      },
    })
  }

  private clearMapNameText(): void {
    if (!this.mapNameText) return
    this.tweens.killTweensOf(this.mapNameText)
    this.mapNameText.destroy()
    this.mapNameText = undefined
  }

  private handleInput(): void {
    let dx = 0
    let dy = 0
    let dir = this.currentDir

    if (!!this.cursors.up?.isDown || this.wasd.W.isDown || this.actionKeys.up.isDown) {
      dy = -1
      dir = DIRECTION.UP
    } else if (!!this.cursors.down?.isDown || this.wasd.S.isDown || this.actionKeys.down.isDown) {
      dy = 1
      dir = DIRECTION.DOWN
    } else if (!!this.cursors.left?.isDown || this.wasd.A.isDown || this.actionKeys.left.isDown) {
      dx = -1
      dir = DIRECTION.LEFT
    } else if (!!this.cursors.right?.isDown || this.wasd.D.isDown || this.actionKeys.right.isDown) {
      dx = 1
      dir = DIRECTION.RIGHT
    }

    if (dx === 0 && dy === 0 && this.touchDirection) {
      dx = this.touchDirection.dx
      dy = this.touchDirection.dy
      dir = this.touchDirection.dir
    }

    if (dx === 0 && dy === 0 && InputManager.getInstance().isGamepadEnabled()) {
      const gp = this.pollGamepadAxes()
      if (gp) {
        if (gp.dy < -MAP_GAMEPAD_INPUT.AXIS_ACTIVATION_THRESHOLD) { dy = -1; dir = DIRECTION.UP }
        else if (gp.dy > MAP_GAMEPAD_INPUT.AXIS_ACTIVATION_THRESHOLD) { dy = 1; dir = DIRECTION.DOWN }
        else if (gp.dx < -MAP_GAMEPAD_INPUT.AXIS_ACTIVATION_THRESHOLD) { dx = -1; dir = DIRECTION.LEFT }
        else if (gp.dx > MAP_GAMEPAD_INPUT.AXIS_ACTIVATION_THRESHOLD) { dx = 1; dir = DIRECTION.RIGHT }
      }
    }

    if (dx !== 0 || dy !== 0) {
      const gx = Math.floor(this.player.x / TILE_SIZE)
      const gy = Math.floor(this.player.y / TILE_SIZE)
      const tx = gx + dx
      const ty = gy + dy

      if (this.canMoveTo(tx, ty)) {
        this.startMove(tx, ty, dir)
      } else {
        this.currentDir = dir
        this.updatePlayerFrame(false)
      }
    }
  }

  private pollGamepadAxes(): { dx: number; dy: number } | null {
    if (!this.input.gamepad || this.input.gamepad.total === 0) return null
    const pad = this.input.gamepad.getPad(0)
    if (!pad) return null

    const axisX = pad.leftStick?.x || 0
    const axisY = pad.leftStick?.y || 0
    const dLeft = pad.left ? 1 : 0
    const dRight = pad.right ? 1 : 0
    const dUp = pad.up ? 1 : 0
    const dDown = pad.down ? 1 : 0
    const dx = axisX || (dRight - dLeft)
    const dy = axisY || (dDown - dUp)

    if (Math.abs(dx) < MAP_GAMEPAD_INPUT.AXIS_DEAD_ZONE && Math.abs(dy) < MAP_GAMEPAD_INPUT.AXIS_DEAD_ZONE) return null
    return { dx, dy }
  }

  private pollGamepadButtons(): void {
    if (!InputManager.getInstance().isGamepadEnabled()) return
    if (!this.input.gamepad || this.input.gamepad.total === 0) return
    const pad = this.input.gamepad.getPad(0)
    if (!pad) return

    const aPressed = !!pad.A
    const bPressed = !!pad.B
    const startPressed = !!(pad.buttons && pad.buttons[9]?.pressed)
    if (this.time.now < this.inputResumeBlockedUntilMs) {
      this.gpConfirmPrev = aPressed
      this.gpCancelPrev = bPressed
      this.gpMenuPrev = startPressed
      return
    }

    if (aPressed && !this.gpConfirmPrev) {
      this.interact()
    }
    this.gpConfirmPrev = aPressed

    if (bPressed && !this.gpCancelPrev) {
      this.openMenu()
    }
    this.gpCancelPrev = bPressed

    if (startPressed && !this.gpMenuPrev) {
      this.openMenu()
    }
    this.gpMenuPrev = startPressed
  }

  private canMoveTo(x: number, y: number): boolean {
    if (x < 0 || x >= this.mapData.width || y < 0 || y >= this.mapData.height) return false
    if (this.collisionGrid[y]![x]) return false
    for (const npc of this.npcs.values()) {
      if (Math.floor(npc.x / TILE_SIZE) === x && Math.floor(npc.y / TILE_SIZE) === y) return false
    }
    for (const event of this.battleEnemyEvents.values()) {
      if (event.trigger === 'action' && this.checkEventCollision(event, x, y)) return false
    }
    return true
  }

  private startMove(tx: number, ty: number, dir: number): void {
    this.isMoving = true
    this.moveStart = { x: this.player.x, y: this.player.y }
    this.moveTarget = { x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + TILE_SIZE / 2 }
    this.moveElapsed = 0
    const distance = Phaser.Math.Distance.Between(this.moveStart.x, this.moveStart.y, this.moveTarget.x, this.moveTarget.y)
    this.moveDuration = distance / (this.moveSpeed * TILE_SIZE)
    this.currentDir = dir
    this.updatePlayerFrame(true)
  }

  private updateMovement(delta: number): void {
    const dt = delta / TIME_MS_PER_SECOND
    this.moveElapsed += dt

    const prevPx = this.player.x
    const prevPy = this.player.y
    const progress = this.moveDuration > 0 ? Math.min(1, this.moveElapsed / this.moveDuration) : 1

    this.player.x = Phaser.Math.Linear(this.moveStart.x, this.moveTarget.x, progress)
    this.player.y = Phaser.Math.Linear(this.moveStart.y, this.moveTarget.y, progress)
    this.updatePlayerFrame(progress < 1)

    if (progress >= 1) {
      this.isMoving = false
      this.updatePlayerFrame(false)
      this.savePosition()
      this.checkTouchEvents()
    }

    if (this.followers.length > 0) {
      let leadX = prevPx
      let leadY = prevPy
      for (let i = 0; i < this.followers.length; i++) {
        const follower = this.followers[i]!
        const memberId = this.followerMemberIds[i]
        const fPrevX = follower.x
        const fPrevY = follower.y
        const dist = Phaser.Math.Distance.Between(follower.x, follower.y, leadX, leadY)
        if (dist > TILE_SIZE * FOLLOWER_MIN_DISTANCE_FACTOR) {
          const angle = Phaser.Math.Angle.Between(follower.x, follower.y, leadX, leadY)
          const step = Math.min(dist, this.moveSpeed * TILE_SIZE * dt)
          const moveX = Math.cos(angle) * step
          const moveY = Math.sin(angle) * step
          follower.x += moveX
          follower.y += moveY
          if (memberId) {
            this.updateDirectionalCharacterFrame(follower, memberId, this.getDirectionFromDelta(moveX, moveY, this.currentDir), true)
          }
        } else if (memberId) {
          this.updateDirectionalCharacterFrame(follower, memberId, this.currentDir, false)
        }
        leadX = fPrevX
        leadY = fPrevY
      }
    }
  }

  private getAnimationFrameIndex(): number {
    return (
      Math.floor(this.animationTimeMs / FIELD_SPRITE_ANIMATION.FRAME_DURATION_MS) %
      FIELD_SPRITE_ANIMATION.FRAME_VARIANT_COUNT
    ) + FIELD_SPRITE_ANIMATION.IDLE_FRAME_INDEX
  }

  private formatFrameIndex(frameIndex: number): string {
    return String(frameIndex).padStart(FIELD_SPRITE_ANIMATION.FRAME_KEY_PAD_LENGTH, '0')
  }

  private resolveTextureKey(primaryKey: string, fallbackKey: string): string | null {
    if (this.textures.exists(primaryKey)) return primaryKey
    if (this.textures.exists(fallbackKey)) return fallbackKey
    return null
  }

  private getDirectionFromDelta(dx: number, dy: number, fallback: number): number {
    if (Math.abs(dx) <= FIELD_SPRITE_ANIMATION.MOVEMENT_EPSILON_PX && Math.abs(dy) <= FIELD_SPRITE_ANIMATION.MOVEMENT_EPSILON_PX) {
      return fallback
    }
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? DIRECTION.RIGHT : DIRECTION.LEFT
    return dy > 0 ? DIRECTION.DOWN : DIRECTION.UP
  }

  private updateDirectionalCharacterFrame(sprite: Phaser.GameObjects.Sprite, baseKey: string, direction: number, moving: boolean): boolean {
    if (!this.isSpriteUsable(sprite)) return false
    const frameStem = CHARACTER_DIRECTION_FRAME_STEMS[direction] ?? CHARACTER_DIRECTION_FRAME_STEMS[DIRECTION.DOWN]
    const frameIndex = moving ? this.getAnimationFrameIndex() : FIELD_SPRITE_ANIMATION.IDLE_FRAME_INDEX
    const frameSuffix = this.formatFrameIndex(frameIndex)
    const idleSuffix = this.formatFrameIndex(FIELD_SPRITE_ANIMATION.IDLE_FRAME_INDEX)
    const textureKey = this.resolveTextureKey(`${baseKey}_${frameStem}_${frameSuffix}`, `${baseKey}_${frameStem}_${idleSuffix}`)
    if (!textureKey) return false
    sprite.setTexture(textureKey)
    sprite.setFlipX(direction === CHARACTER_SIDE_WALK_FLIP_DIRECTION)
    return true
  }

  private getDirectionalCharacterBase(textureKey: string): string | null {
    const match = textureKey.match(CHARACTER_DIRECTION_TEXTURE_PATTERN)
    return match?.[1] ? match[1] : null
  }

  private updateSequenceFrame(sprite: Phaser.GameObjects.Sprite, moving: boolean): void {
    if (!this.isSpriteUsable(sprite)) return
    const match = sprite.texture.key.match(SEQUENCE_TEXTURE_FRAME_PATTERN)
    const baseKey = match?.[1]
    if (!baseKey) return
    const frameIndex = moving ? this.getAnimationFrameIndex() : FIELD_SPRITE_ANIMATION.IDLE_FRAME_INDEX
    const textureKey = `${baseKey}_${this.formatFrameIndex(frameIndex)}`
    if (this.textures.exists(textureKey)) {
      sprite.setTexture(textureKey)
    }
  }

  private updateFieldEntityFrame(id: string, sprite: Phaser.GameObjects.Sprite, direction: number, moving: boolean): void {
    if (!this.isSpriteUsable(sprite)) return
    this.fieldEntityDirections.set(id, direction)
    const directionalBase = this.getDirectionalCharacterBase(sprite.texture.key)
    if (directionalBase && this.updateDirectionalCharacterFrame(sprite, directionalBase, direction, moving)) {
      return
    }
    this.updateSequenceFrame(sprite, moving)
    if (direction === DIRECTION.LEFT || direction === DIRECTION.RIGHT) {
      sprite.setFlipX(direction === CHARACTER_SIDE_WALK_FLIP_DIRECTION)
    }
  }

  private updatePlayerFrame(moving: boolean): void {
    const leader = GameData.getInstance().party[0] || 'T'
    this.updateDirectionalCharacterFrame(this.player, this.getCharacterSpriteBase(leader), this.currentDir, moving)
  }

  private savePosition(): void {
    const gd = GameData.getInstance()
    gd.playerPosition = {
      x: Math.floor(this.player.x / TILE_SIZE),
      y: Math.floor(this.player.y / TILE_SIZE),
    }
    gd.playerDirection = this.currentDir
  }

  private checkTouchEvents(): void {
    const px = Math.floor(this.player.x / TILE_SIZE)
    const py = Math.floor(this.player.y / TILE_SIZE)

    if (this.checkBattleEnemyTouch()) return

    for (const event of this.mapData.events) {
      if (this.isSuppressedFieldEvent(event)) continue
      if (this.isFieldEventCompleted(event)) continue
      if (event.type === 'battle') continue
      if (event.trigger !== 'touch' && event.trigger !== 'autorun') continue
      if (!this.areEventConditionsMet(event)) continue
      if (this.checkEventCollision(event, px, py)) {
        this.triggerEvent(event)
        return
      }
    }
  }

  private interact(): void {
    if (this.inEvent) return
    const event = this.getActionEventAhead()
    if (event) this.triggerEvent(event)
  }

  private canInteractWithEvent(event: MapEvent, px: number, py: number, fx: number, fy: number): boolean {
    if (this.isSuppressedFieldEvent(event)) return false
    const sprite = event.type === 'npc' ? this.npcs.get(event.id) : event.type === 'battle' ? this.battleEnemies.get(event.id) : undefined
    if (sprite) {
      if (event.type === 'npc') return this.isNpcReachableByTile(sprite, px, py, fx, fy)

      const behavior = this.fieldEntityBehaviors.get(event.id)
      const distanceTiles = behavior?.interactionDistanceTiles ?? FIELD_ENTITY_BEHAVIOR.NPC_INTERACTION_DISTANCE_TILES
      const facingX = fx * TILE_SIZE + TILE_SIZE / 2
      const facingY = fy * TILE_SIZE + TILE_SIZE / 2
      const playerDist = this.getSpriteBoundsDistance(sprite, this.player.x, this.player.y)
      const facingDist = this.getSpriteBoundsDistance(sprite, facingX, facingY)
      if (playerDist <= distanceTiles * TILE_SIZE || facingDist <= distanceTiles * TILE_SIZE) return true
      return false
    }
    return this.checkEventCollision(event, fx, fy) || this.checkEventCollision(event, px, py)
  }

  private isNpcReachableByTile(sprite: Phaser.GameObjects.Sprite, px: number, py: number, fx: number, fy: number): boolean {
    return isTileInsideSpriteBounds(sprite, fx, fy, TILE_SIZE, FIELD_ENTITY_BEHAVIOR.NPC_INTERACTION_BOUNDS_EPSILON_PX) ||
      isTileInsideSpriteBounds(sprite, px, py, TILE_SIZE, FIELD_ENTITY_BEHAVIOR.NPC_INTERACTION_BOUNDS_EPSILON_PX)
  }

  private getSpriteBoundsDistance(sprite: Phaser.GameObjects.Sprite, x: number, y: number): number {
    const left = sprite.x - sprite.displayWidth * sprite.originX
    const top = sprite.y - sprite.displayHeight * sprite.originY
    const right = left + sprite.displayWidth
    const bottom = top + sprite.displayHeight
    const closestX = Math.max(left, Math.min(x, right))
    const closestY = Math.max(top, Math.min(y, bottom))
    return Phaser.Math.Distance.Between(x, y, closestX, closestY)
  }

  private checkEventCollision(event: MapEvent, x: number, y: number): boolean {
    return x >= event.x && x < event.x + event.width &&
           y >= event.y && y < event.y + event.height
  }

  private areEventConditionsMet(event: MapEvent): boolean {
    const gd = GameData.getInstance()
    return areConditionsMet(event.conditions, flag => gd.getFlag(flag))
  }

  private checkAutorunEvents(): void {
    const gd = GameData.getInstance()
    const px = Math.floor(this.player.x / TILE_SIZE)
    const py = Math.floor(this.player.y / TILE_SIZE)

    for (const event of this.mapData.events) {
      if (this.isSuppressedFieldEvent(event)) continue
      if (!this.areEventConditionsMet(event)) continue
      if (event.trigger === 'autorun' && this.checkEventCollision(event, px, py)) {
        if (this.isCompletableFieldEvent(event) && gd.getFlag(this.getFieldEventDoneFlag(event.id)) === true) continue
        this.triggerEvent(event)
        return
      }
    }
  }

  private triggerEvent(event: MapEvent): void {
    if (this.isSuppressedFieldEvent(event)) return
    this.inEvent = true
    const gd = GameData.getInstance()
    const completionEventId = this.isCompletableFieldEvent(event) ? event.id : undefined

    if (event.type === 'chest') {
      if (gd.getFlag(this.getChestOpenedFlag(event.id)) === true) {
        this.inEvent = false
        return
      }
    }

    if (completionEventId) {
      if (this.isFieldEventCompleted(event)) {
        this.inEvent = false
        return
      }
    }

    if (event.type === 'battle') {
      if (this.isBattleEventDefeated(event)) {
        this.inEvent = false
        return
      }
    }

    if (!this.areEventConditionsMet(event)) {
      this.inEvent = false
      return
    }

    this.executeActions(event.actions, event.type === 'battle' ? event.id : completionEventId)
  }

  private startDialogue(dialogueId: string): void {
    this.clearMapNameText()
    this.scene.launch('DialogueOverlay', { dialogueId })
    this.scene.pause()
  }

  private startBattle(encounterId: string, mapEventId?: string): void {
    this.clearMapNameText()
    EventBus.emit(GameEvents.BATTLE_START, encounterId)
    this.scene.launch('BattleScene', { encounterId, mapId: this.mapData.id, mapEventId })
    this.scene.pause()
  }

  private transferMap(mapId: string, x: number, y: number, beforeRestart?: () => void): boolean {
    const gd = GameData.getInstance()
    const targetMapId = resolveCanonicalMapId(mapId, gd.rebuildLevel)
    const blockedDialogueId = getBlockedMapDialogueId(targetMapId, flag => gd.getFlag(flag))
    if (blockedDialogueId) {
      AudioManager.getInstance().playSFX('cancel')
      this.startDialogue(blockedDialogueId)
      return false
    }

    beforeRestart?.()
    AudioManager.getInstance().playSFX('warp')
    gd.currentMap = targetMapId
    gd.playerPosition = { x, y }
    this.requestMapRestart(targetMapId)
    return true
  }

  private requestMapRestart(mapId: string, feedback?: MapSceneFeedback): void {
    if (this.restartingMap) return
    this.restartingMap = true
    this.scene.restart({ mapId, feedback })
  }

  private flushPendingMapRestart(): void {
    const mapId = this.pendingMapRestartId
    if (!mapId) return
    this.pendingMapRestartId = ''
    this.requestMapRestart(mapId)
  }

  private openMenu(): void {
    if (this.inEvent) return
    this.clearMapNameText()
    AudioManager.getInstance().playSFX('open_menu')
    this.inEvent = true
    this.promptText?.setVisible(false)
    this.scene.launch('MenuOverlay')
    this.scene.pause()
  }

  private openWorldMap(): void {
    if (this.inEvent) return
    this.clearMapNameText()
    AudioManager.getInstance().playSFX('open_menu')
    this.inEvent = true
    this.scene.launch('WorldMapOverlay')
    this.scene.pause()
  }

  private onDialogueEnd(data?: { actions?: EventAction[]; missing?: boolean }): void {
    this.scene.resume()
    const mapEventId = this.pendingMapEventId

    if (data?.missing) {
      this.pendingActions = []
      this.pendingMapEventId = ''
      this.inEvent = false
      AudioManager.getInstance().playSFX('cancel')
      this.showMapFeedback(MAP_HUD.DIALOGUE_MISSING_TEXT, false)
      this.flushPendingMapRestart()
      return
    }

    const pending = [...(data?.actions || []), ...this.pendingActions]
    this.pendingActions = []
    this.pendingMapEventId = ''

    if (pending.length > 0) {
      this.inEvent = true
      this.executeActions(pending, mapEventId)
      return
    }
    this.markFieldEventCompleted(mapEventId)
    this.inEvent = false
    this.flushPendingMapRestart()
  }

  private executeActions(actions: EventAction[], mapEventId = ''): void {
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i]!
      switch (action.type) {
        case 'dialogue':
          this.pendingActions = actions.slice(i + 1)
          this.pendingMapEventId = mapEventId
          this.startDialogue(action.dialogueId)
          return
        case 'battle':
          this.pendingActions = actions.slice(i + 1)
          this.pendingMapEventId = mapEventId
          this.startBattle(action.encounterId, mapEventId)
          return
        case 'transfer':
          this.pendingActions = []
          this.pendingMapEventId = ''
          this.transferMap(action.targetMap, action.targetX, action.targetY, () => this.markFieldEventCompleted(mapEventId))
          return
        case 'shop':
          this.pendingActions = actions.slice(i + 1)
          this.pendingMapEventId = mapEventId
          this.scene.launch('ShopOverlay')
          this.scene.pause()
          return
        case 'training':
          this.pendingActions = actions.slice(i + 1)
          this.pendingMapEventId = mapEventId
          this.scene.launch('TrainingOverlay')
          this.scene.pause()
          return
        case 'rebuildMenu':
          this.pendingActions = actions.slice(i + 1)
          this.pendingMapEventId = mapEventId
          this.scene.launch('RebuildOverlay')
          this.scene.pause()
          return
        default: {
          const result = applyStateEventAction(action)
          if (result.failureReason) {
            this.handleStateActionFailure(result.failureReason)
            return
          }
          if (!result.handled) break
          if (!result.partyChanged) break
          this.removeSuppressedFieldEventSprites()
          this.refreshFollowers()
          this.createPartyHud()
          break
        }
      }
    }
    this.pendingActions = []
    this.pendingMapEventId = ''
    this.markFieldEventCompleted(mapEventId)
    this.inEvent = false
  }

  private handleStateActionFailure(reason: string): void {
    console.warn(`Map event action failed: ${reason}`)
    AudioManager.getInstance().playSFX('cancel')
    this.pendingActions = []
    this.pendingMapEventId = ''
    this.showMapFeedback(MAP_HUD.ACTION_FAILED_TEXT, false)
    this.inEvent = false
  }

  private onBattleEnd(victory: boolean, result?: { escaped?: boolean }): void {
    if (!victory && !result?.escaped) {
      this.pendingActions = []
      this.pendingMapEventId = ''
      this.inEvent = false
      EventBus.emit(GameEvents.GAME_OVER)
      this.scene.start('GameOverScene')
      return
    }

    this.scene.resume()
    AudioManager.getInstance().setScene(this)
    AudioManager.getInstance().playBGMForMap(this.mapData.id)
    this.removeSuppressedFieldEventSprites()

    const battleEvent = this.pendingMapEventId
      ? this.battleEnemyEvents.get(this.pendingMapEventId) ?? this.mapData.events.find(event => event.id === this.pendingMapEventId)
      : undefined
    if (result?.escaped && battleEvent?.trigger === 'touch') {
      this.retreatFromEscapedTouchBattle(battleEvent)
    }
    this.refreshFollowers()

    for (const [eventId, sprite] of this.battleEnemies) {
      const event = this.battleEnemyEvents.get(eventId)
      if (event && (this.isBattleEventDefeated(event) || !this.areEventConditionsMet(event))) {
        this.removeBattleEnemy(eventId, sprite)
      }
    }

    const pending = this.pendingActions
    const mapEventId = this.pendingMapEventId
    this.pendingActions = []
    this.pendingMapEventId = ''
    if (victory && pending.length > 0) {
      this.inEvent = true
      this.executeActions(pending, mapEventId)
      return
    }
    if (victory) this.markFieldEventCompleted(mapEventId)
    this.inEvent = false
    this.flushPendingMapRestart()
  }

  private onMenuClose(): void {
    this.inputResumeBlockedUntilMs = this.time.now + MAP_INPUT_GUARD.RESUME_LOCK_MS
    this.promptText?.setVisible(true)
    this.scene.resume()
    AudioManager.getInstance().setScene(this)
    this.refreshFollowers()
    this.createPartyHud()
    const pending = this.pendingActions
    const mapEventId = this.pendingMapEventId
    this.pendingActions = []
    this.pendingMapEventId = ''
    if (pending.length > 0) {
      this.inEvent = true
      this.executeActions(pending, mapEventId)
      return
    }
    this.markFieldEventCompleted(mapEventId)
    this.inEvent = false
    this.flushPendingMapRestart()
  }


  private weatherEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null


  private npcTimers: Phaser.Time.TimerEvent[] = []

  private startNPCMovement(): void {
    for (const event of this.mapData.events) {
      if (event.type !== 'npc' || !event.sprite) continue
      const npc = this.npcs.get(event.id)
      if (!npc) continue
      const behavior = this.fieldEntityBehaviors.get(event.id) ?? this.getNpcFieldBehavior(event)
      const patrolTimer = this.scheduleFieldPatrol(event.id, npc, behavior)
      if (patrolTimer) this.npcTimers.push(patrolTimer)
    }
  }

  private getEnemySpriteKey(encounterId?: string): string {
    if (!encounterId) return DEFAULT_ENEMY_SPRITE_KEY
    const enemyId = GAME_CONFIG_DATABASE.getTable('encounters')[encounterId]?.enemies[0]
    return enemyId ? `mon_${enemyId}_01` : DEFAULT_ENEMY_SPRITE_KEY
  }

  private createWeather(): void {
    if ((MAP_WEATHER_GROUPS.rain as readonly string[]).includes(this.mapData.id)) {
      this.startRain()
    } else if ((MAP_WEATHER_GROUPS.snow as readonly string[]).includes(this.mapData.id)) {
      this.startSnow()
    }
  }

  private createWeatherEmitZone(x: number, y: number, width: number, height: number): Phaser.Types.GameObjects.Particles.ParticleEmitterRandomZoneConfig {
    return {
      type: 'random',
      source: {
        getRandomPoint: point => {
          point.x = Phaser.Math.FloatBetween(x, x + width)
          point.y = Phaser.Math.FloatBetween(y, y + height)
        },
      },
    }
  }

  private setWeatherEmitter(particles: Phaser.GameObjects.Particles.ParticleEmitter): void {
    particles.setDepth(90)
    particles.setScrollFactor(0)
    this.weatherEmitter = particles
  }

  private startRain(): void {
    const particles = this.add.particles(0, 0, 'env_dirt_pebbles', {
      speed: { min: 200, max: 400 },
      angle: 260,
      gravityY: 300,
      lifespan: 800,
      quantity: 3,
      scale: { start: 0.1, end: 0 },
      alpha: { start: 0.3, end: 0 },
      emitZone: this.createWeatherEmitZone(scalePx(-200), scalePx(-50), GAME_WIDTH + scalePx(400), scalePx(10)),
    })
    this.setWeatherEmitter(particles)
  }

  private startSnow(): void {
    const particles = this.add.particles(0, 0, 'env_flowers_patch_white', {
      speed: { min: 20, max: 60 },
      angle: 270,
      gravityY: 20,
      lifespan: 4000,
      quantity: 1,
      scale: { start: 0.05, end: 0 },
      alpha: { start: 0.5, end: 0 },
      emitZone: this.createWeatherEmitZone(scalePx(-100), scalePx(-50), GAME_WIDTH + scalePx(200), scalePx(10)),
    })
    this.setWeatherEmitter(particles)
  }

  shutdown(): void {
    EventBus.off(GameEvents.DIALOGUE_END, this.onDialogueEnd, this)
    EventBus.off(GameEvents.BATTLE_END, this.onBattleEnd, this)
    EventBus.off(GameEvents.MENU_CLOSE, this.onMenuClose, this)
    EventBus.off(GameEvents.FLAG_SET, this.handleFlagSet, this)
    EventBus.off(GameEvents.QUEST_UPDATE, this.handleQuestUpdate, this)
    EventBus.off(GameEvents.SAVE_LOADED, this.handleSaveLoaded, this)
    window.removeEventListener('game-quicksave', this.handleQuickSave)
    window.removeEventListener('game-quickload', this.handleQuickLoad)
    this.input.off(Phaser.Input.Events.POINTER_UP, this.clearTouchDirectionForPointer, this)
    this.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.clearTouchDirectionForPointer, this)
    this.scale.off(Phaser.Scale.Events.RESIZE, this.syncTouchControls, this)
    this.destroyTouchControls()
    this.destroyPartyHud()
    this.destroyQuestHud()
    this.mapFeedbackText?.destroy()
    this.mapFeedbackText = undefined
    this.promptText = undefined
    for (const timer of this.enemyPatrolTimers.values()) timer.remove(false)
    for (const timer of this.npcTimers) timer.remove(false)
    this.enemyPatrolTimers.clear()
    this.npcTimers = []
  }
}
