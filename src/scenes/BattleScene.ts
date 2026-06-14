import Phaser from 'phaser'
import { EventBus, GameEvents } from '../core/EventBus'
import { GameData } from '../core/GameData'
import { AudioManager } from '../core/AudioManager'
import { BarrelSystem } from '../core/BarrelSystem'
import { InputManager } from '../core/InputManager'
import { applyEncounterVictoryRewards } from '../core/BattleRewards'
import type { BarrelColor } from '../core/BarrelSystem'
import { GAME_CONFIG_DATABASE } from '../data/configDatabase'
import { collectBattleImageKeys, queueImageAssets, resolveBattleBackgroundKey } from '../core/AssetLoader'
import {
  BATTLE_COMMAND_LABELS,
  BATTLE_DIFFICULTY_MULTIPLIERS,
  BATTLE_LAYOUT,
  BATTLE_RANDOM_TARGET_HITS,
  BATTLE_RESULT_PANEL,
  BATTLE_RULES,
  BATTLE_CONTROL_STATUSES,
  BATTLE_NEGATIVE_STATUSES,
  BATTLE_SKILL_STATUS_EFFECTS,
  BATTLE_SPECIAL_ENCOUNTERS,
  BATTLE_SPEED,
  BATTLE_STATUS,
  BATTLE_STATUS_DURATIONS,
  BATTLE_STATUS_LABELS,
  BATTLE_TARGET_INDICATOR,
  CHARACTER_SPRITE_BASE_KEYS,
  COLORS,
  COMBO_TP_COST,
  DEFAULT_CHARACTER_SPRITE_KEY,
  DEFAULT_ENEMY_SPRITE_KEY,
  ELEMENT_WEAKNESS,
  GAME_HEIGHT,
  GAME_WIDTH,
  LOADING_SCREEN,
  MENU_OVERLAY_UI,
  RUNTIME_UI_ASSET_KEYS,
  scaleFont,
  scalePx,
  TRUE_ENDING_SUPPORT_CHARACTER_ID,
  TRUE_ENDING_SUPPORT_ENCOUNTER_IDS,
  TRUE_ENDING_SUPPORT_FLAG,
  UI_TITLE_FONT_FAMILY,
} from '../utils/constants'
import { bindTouchText } from '../utils/touch'
import { cleanupKeyboardOnShutdown } from '../utils/sceneLifecycle'
import { showLoadingScreen } from '../utils/loadingScreen'
import type { CharacterData, EnemyData, ItemData, SkillData } from '../data/types'

interface ComboDef {
  skillId: string
  char1: string
  char2: string
  flag: string
}

const COMBO_DEFS: ComboDef[] = [
  { skillId: 'fengleisanhua', char1: 'HUIHUI', char2: 'CONGCONG', flag: 'congcong_joined' },
  { skillId: 'shouxiangshuangji', char1: 'T', char2: 'A', flag: 'defeated_baihu' },
  { skillId: 'yuexiahuixuan', char1: 'HUIHUI', char2: 'T', flag: 'has_sacred_water' },
  { skillId: 'shendunzhen', char1: 'A', char2: 'SUN', flag: 'has_millennium_seed' },
  { skillId: 'yuyanzhiren', char1: 'T', char2: 'SUN', flag: 'temple_visited' },
  { skillId: 'fengyuezhixi', char1: 'T', char2: TRUE_ENDING_SUPPORT_CHARACTER_ID, flag: TRUE_ENDING_SUPPORT_FLAG },
]

interface BattleUnit {
  id: string
  name: string
  isPlayer: boolean
  stats: { hp: number; maxHp: number; mp: number; maxMp: number; speed: number }
  sprite?: Phaser.GameObjects.Sprite
  hpBar?: Phaser.GameObjects.Rectangle
  mpBar?: Phaser.GameObjects.Rectangle
  tpBar?: Phaser.GameObjects.Rectangle
  breakGauge: number
  breakMax: number
  tp: number
  status: string[]
  data: CharacterData | EnemyData
}

interface BattleResultSummary {
  victory: boolean
  escaped: boolean
  title: string
  lines: string[]
}

export class BattleScene extends Phaser.Scene {
  private units: BattleUnit[] = []
  private turnOrder: number[] = []
  private currentTurn = 0
  private phase: 'intro' | 'player' | 'enemy' | 'victory' | 'defeat' | 'result' = 'intro'
  private enemyData: EnemyData[] = []
  private bg!: Phaser.GameObjects.Rectangle
  private logText!: Phaser.GameObjects.Text
  private commandMenuObjects: Array<Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image | Phaser.GameObjects.Text> = []
  private menuIndex = 0
  private menuItems: Phaser.GameObjects.Text[] = []
  private cursor!: Phaser.GameObjects.Rectangle
  private targetIndex = 0
  private inTargetSelect = false
  private targetPlayers = false
  private targetIndicator: Phaser.GameObjects.Triangle | null = null
  private actionStack: string[] = []
  private difficultyMult = { hp: 1.0, dmg: 1.0, exp: 1.0 }
  private speedMult = 1.0
  private encounterId = ''
  private mapId = ''
  private mapEventId = ''
  private turnCount = 0
  private resultSummary: BattleResultSummary | null = null
  private resultPanel: Phaser.GameObjects.Container | null = null

  constructor() {
    super({ key: 'BattleScene', active: false })
  }

  init(data: { encounterId: string; mapId?: string; mapEventId?: string }): void {
    this.encounterId = data.encounterId
    this.mapId = data.mapId || GameData.getInstance().currentMap
    this.mapEventId = data.mapEventId || ''
  }

  preload(): void {
    showLoadingScreen(this, LOADING_SCREEN.BATTLE_LABEL)
    queueImageAssets(this, collectBattleImageKeys(this.encounterId, this.getBattlePartyIds(GameData.getInstance().party), this.mapId))
  }

  create(data: { encounterId: string; mapId?: string; mapEventId?: string }): void {
    this.units = []
    this.turnOrder = []
    this.currentTurn = 0
    this.phase = 'intro'
    this.enemyData = []
    this.menuIndex = 0
    this.menuItems = []
    this.commandMenuObjects = []
    this.targetIndex = 0
    this.inTargetSelect = false
    this.targetPlayers = false
    this.targetIndicator = null
    this.actionStack = []
    this.skillMenuItems = []
    this.skillMenuIndex = 0
    this.inSkillMenu = false
    this.itemMenuItems = []
    this.itemMenuIndex = 0
    this.inItemMenu = false
    this.barrelMenuItems = []
    this.barrelMenuIndex = 0
    this.inBarrelMenu = false
    this.barrelMenuColors = []
    this.comboMenuItems = []
    this.comboMenuIndex = 0
    this.inComboMenu = false
    this.availableCombos = []
    this.encounterId = data.encounterId
    this.mapId = data.mapId || GameData.getInstance().currentMap
    this.mapEventId = data.mapEventId || ''
    this.turnCount = 0
    this.resultSummary = null
    this.resultPanel = null

    // Apply settings
    const gd = GameData.getInstance()
    const diff = gd.settings.difficulty as keyof typeof BATTLE_DIFFICULTY_MULTIPLIERS
    this.difficultyMult = BATTLE_DIFFICULTY_MULTIPLIERS[diff] ?? BATTLE_DIFFICULTY_MULTIPLIERS.standard
    const bspd = gd.settings.battleSpeed as keyof typeof BATTLE_SPEED
    this.speedMult = BATTLE_SPEED[bspd] ?? BATTLE_SPEED.normal

    AudioManager.getInstance().setScene(this)

    // Background image
    const bgImg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, resolveBattleBackgroundKey(this.encounterId, this.mapId))
    bgImg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
    bgImg.setDepth(299)
    bgImg.setScrollFactor(0)

    // Background overlay
    this.bg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, BATTLE_LAYOUT.BACKGROUND_OVERLAY_COLOR, BATTLE_LAYOUT.BACKGROUND_OVERLAY_ALPHA)
    this.bg.setDepth(300)
    this.bg.setScrollFactor(0)

    // Ground
    const ground = this.add.ellipse(GAME_WIDTH / 2, BATTLE_LAYOUT.GROUND_Y, BATTLE_LAYOUT.GROUND_WIDTH, BATTLE_LAYOUT.GROUND_HEIGHT, BATTLE_LAYOUT.GROUND_COLOR, BATTLE_LAYOUT.GROUND_ALPHA)
    ground.setDepth(301)
    ground.setScrollFactor(0)

    this.setupEncounter(data.encounterId)

    // Determine if boss battle
    const isBoss = this.enemyData.some(e => e.isBoss)
    this.playEncounterBGM(isBoss)

    this.createUI()
    this.setupInput()

    // Calculate turn order
    this.calculateTurnOrder()

    // Battle intro transition
    const flashColor = isBoss ? BATTLE_LAYOUT.INTRO_FLASH_BOSS_COLOR : BATTLE_LAYOUT.INTRO_FLASH_NORMAL_COLOR
    const introFlash = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, flashColor, BATTLE_LAYOUT.INTRO_FLASH_ALPHA)
    introFlash.setDepth(400)
    introFlash.setScrollFactor(0)
    this.tweens.add({
      targets: introFlash,
      alpha: 0,
      duration: Math.floor(600 / this.speedMult),
      delay: Math.floor(200 / this.speedMult),
      onComplete: () => introFlash.destroy(),
    })

    // Slide-in animation for enemies
    for (const unit of this.units) {
      if (!unit.isPlayer && unit.sprite) {
        const targetX = unit.sprite.x
        unit.sprite.x = targetX + scalePx(200)
        this.tweens.add({
          targets: unit.sprite,
          x: targetX,
          duration: Math.floor(400 / this.speedMult),
          ease: 'Back.easeOut',
        })
      }
    }

    // Intro animation
    this.time.delayedCall(Math.floor(800 / this.speedMult), () => {
      this.phase = 'player'
      this.startTurn()
    })
  }

  private setupEncounter(encounterId: string): void {
    const gd = GameData.getInstance()
    const party = this.getBattlePartyIds(gd.party)

    // Spawn player units
    for (let i = 0; i < party.length; i++) {
      const char = gd.characters.get(party[i]!)
      if (!char) continue
      const x = BATTLE_LAYOUT.PLAYER_START_X + i * BATTLE_LAYOUT.PLAYER_GAP_X
      const y = BATTLE_LAYOUT.PLAYER_Y
      const baseKey = this.getCharacterSpriteBase(char.id)
      const textureKey = this.resolveTextureKey(`${baseKey}_front_idle_01`, DEFAULT_CHARACTER_SPRITE_KEY) ?? DEFAULT_CHARACTER_SPRITE_KEY
      const sprite = this.add.sprite(x, y, textureKey)
      sprite.setDisplaySize(BATTLE_LAYOUT.UNIT_SPRITE_SIZE, BATTLE_LAYOUT.UNIT_SPRITE_SIZE)
      sprite.setDepth(305)
      sprite.setScrollFactor(0)

      const unit: BattleUnit = {
        id: char.id,
        name: char.name,
        isPlayer: true,
        stats: {
          hp: char.stats.hp,
          maxHp: char.stats.maxHp,
          mp: char.stats.mp,
          maxMp: char.stats.maxMp,
          speed: char.stats.speed,
        },
        sprite,
        tp: char.tp,
        breakGauge: 0,
        breakMax: 100,
        status: [],
        data: char,
      }
      sprite.setInteractive({ useHandCursor: true })
      sprite.on(Phaser.Input.Events.POINTER_DOWN, () => this.selectTarget(unit))
      this.units.push(unit)
      this.createUnitUI(unit, x, y - BATTLE_LAYOUT.UNIT_UI_OFFSET_Y)
    }

    // Spawn enemies (demo: use encounterId to pick enemies)
    const enemies = GAME_CONFIG_DATABASE.getTable('enemies')
    const enemyIds = this.getEnemiesForEncounter(encounterId)
    for (let i = 0; i < enemyIds.length; i++) {
      const ed = enemies[enemyIds[i]!]
      if (!ed) continue
      const x = BATTLE_LAYOUT.ENEMY_START_X + (i % BATTLE_LAYOUT.ENEMY_COLUMNS) * BATTLE_LAYOUT.ENEMY_GAP_X
      const y = BATTLE_LAYOUT.ENEMY_START_Y + Math.floor(i / BATTLE_LAYOUT.ENEMY_COLUMNS) * BATTLE_LAYOUT.ENEMY_ROW_GAP_Y
      const textureKey = this.resolveTextureKey(`mon_${ed.id}_01`, DEFAULT_ENEMY_SPRITE_KEY) ?? DEFAULT_ENEMY_SPRITE_KEY
      const sprite = this.add.sprite(x, y, textureKey)
      sprite.setDisplaySize(BATTLE_LAYOUT.UNIT_SPRITE_SIZE, BATTLE_LAYOUT.UNIT_SPRITE_SIZE)
      sprite.setDepth(305)
      sprite.setScrollFactor(0)

      const scaledHp = Math.floor(ed.stats.maxHp * this.difficultyMult.hp)
      const unit: BattleUnit = {
        id: `enemy_${i}`,
        name: ed.name,
        isPlayer: false,
        stats: {
          hp: scaledHp,
          maxHp: scaledHp,
          mp: ed.stats.mp,
          maxMp: ed.stats.maxMp,
          speed: ed.stats.speed,
        },
        sprite,
        tp: 0,
        breakGauge: 0,
        breakMax: ed.isBoss ? 200 : 100,
        status: [],
        data: ed,
      }
      sprite.setInteractive({ useHandCursor: true })
      sprite.on(Phaser.Input.Events.POINTER_DOWN, () => this.selectTarget(unit))
      this.units.push(unit)
      this.enemyData.push(ed)
      this.createUnitUI(unit, x, y - BATTLE_LAYOUT.UNIT_UI_OFFSET_Y)
    }
  }

  private getBattlePartyIds(party: readonly string[]): string[] {
    const ids = [...party]
    const hasTrueEndingSupport = TRUE_ENDING_SUPPORT_ENCOUNTER_IDS.includes(this.encounterId as typeof TRUE_ENDING_SUPPORT_ENCOUNTER_IDS[number]) &&
      GameData.getInstance().getFlag(TRUE_ENDING_SUPPORT_FLAG) === true
    if (hasTrueEndingSupport && !ids.includes(TRUE_ENDING_SUPPORT_CHARACTER_ID)) {
      ids.push(TRUE_ENDING_SUPPORT_CHARACTER_ID)
    }
    return ids
  }

  private getEnemiesForEncounter(encounterId: string): string[] {
    const encounter = GAME_CONFIG_DATABASE.getTable('encounters')[encounterId]
    if (!encounter) {
      console.warn(`Encounter ${encounterId} not found`)
      return ['xiao_yao']
    }
    return encounter.enemies
  }

  private playEncounterBGM(isBoss: boolean): void {
    const encounter = GAME_CONFIG_DATABASE.getTable('encounters')[this.encounterId]
    if (encounter?.bgm) {
      AudioManager.getInstance().playBGM(encounter.bgm)
      return
    }
    AudioManager.getInstance().playBattleBGM(isBoss)
  }

  private getCharacterSpriteBase(characterId: string): string {
    return CHARACTER_SPRITE_BASE_KEYS[characterId] ?? characterId.toLowerCase()
  }

  private resolveTextureKey(primaryKey: string, fallbackKey: string): string | null {
    if (this.textures.exists(primaryKey)) return primaryKey
    if (this.textures.exists(fallbackKey)) return fallbackKey
    return null
  }

  private getLivePlayers(): BattleUnit[] {
    return this.units.filter(u => u.isPlayer && u.stats.hp > 0)
  }

  private getLiveEnemies(): BattleUnit[] {
    return this.units.filter(u => !u.isPlayer && u.stats.hp > 0)
  }

  private getLiveAllies(actor: BattleUnit): BattleUnit[] {
    return actor.isPlayer ? this.getLivePlayers() : this.getLiveEnemies()
  }

  private getLiveOpponents(actor: BattleUnit): BattleUnit[] {
    return actor.isPlayer ? this.getLiveEnemies() : this.getLivePlayers()
  }

  private pickRandomTarget(targets: BattleUnit[]): BattleUnit | null {
    const tauntingTargets = targets.filter(target => this.hasStatus(target, BATTLE_STATUS.TAUNT))
    const pool = tauntingTargets.length > 0 ? tauntingTargets : targets
    return pool[Math.floor(Math.random() * pool.length)] ?? null
  }

  private getRandomHitCount(skillId: string): number {
    const hits = BATTLE_RANDOM_TARGET_HITS[skillId]
    if (!hits) return 1
    return hits.min + Math.floor(Math.random() * (hits.max - hits.min + 1))
  }

  private applyDamageVariance(damage: number): number {
    return Math.max(1, Math.floor(damage * (BATTLE_RULES.DAMAGE_VARIANCE_MIN + Math.random() * BATTLE_RULES.DAMAGE_VARIANCE_RANGE)))
  }

  private getPlayerDamageMultiplier(): number {
    if (this.difficultyMult.dmg < 1.0) return BATTLE_RULES.STORY_PLAYER_DAMAGE_MULTIPLIER
    if (this.difficultyMult.dmg > 1.0) return BATTLE_RULES.HARD_PLAYER_DAMAGE_MULTIPLIER
    return 1.0
  }

  private parseStatus(status: string): { base: string; duration: number | null } {
    const separatorIndex = status.lastIndexOf(BATTLE_RULES.STATUS_DURATION_SEPARATOR)
    if (separatorIndex < 0) return { base: status, duration: null }
    const duration = Number(status.slice(separatorIndex + 1))
    if (!Number.isInteger(duration)) return { base: status, duration: null }
    return { base: status.slice(0, separatorIndex), duration }
  }

  private formatTimedStatus(status: string, duration: number): string {
    return `${status}${BATTLE_RULES.STATUS_DURATION_SEPARATOR}${duration}`
  }

  private hasStatus(unit: BattleUnit, status: string): boolean {
    return unit.status.some(current => current === status || this.parseStatus(current).base === status)
  }

  private removeStatus(unit: BattleUnit, status: string): void {
    unit.status = unit.status.filter(current => current !== status && this.parseStatus(current).base !== status)
  }

  private isNegativeStatus(status: string): boolean {
    return (BATTLE_NEGATIVE_STATUSES as readonly string[]).includes(status)
  }

  private addStatus(unit: BattleUnit, status: string, duration?: number, announce = true): boolean {
    const label = BATTLE_STATUS_LABELS[status] ?? status
    if (this.isNegativeStatus(status)) {
      if (status === BATTLE_STATUS.POISON && this.hasStatus(unit, BATTLE_STATUS.IMMUNITY_POISON)) {
        if (announce) this.log(`${unit.name} 免疫中毒。`)
        return false
      }
      if (this.hasStatus(unit, BATTLE_STATUS.STATUS_BARRIER)) {
        this.removeStatus(unit, BATTLE_STATUS.STATUS_BARRIER)
        if (announce) this.log(`${unit.name} 的异常护盾抵消了${label}。`)
        return false
      }
    }

    this.removeStatus(unit, status)
    unit.status.push(duration ? this.formatTimedStatus(status, duration) : status)
    if (announce) this.log(`${unit.name} 获得${label}。`)
    return true
  }

  private applyConfiguredSkillStatuses(target: BattleUnit, skill: SkillData): boolean {
    const effects = BATTLE_SKILL_STATUS_EFFECTS[skill.id as keyof typeof BATTLE_SKILL_STATUS_EFFECTS]
    if (!effects) return false
    for (const effect of effects) {
      if (Math.random() <= effect.chance) {
        this.addStatus(target, effect.status, effect.duration)
      }
    }
    return true
  }

  private tickStatusDurations(unit: BattleUnit): void {
    let breakExpired = false
    const nextStatuses: string[] = []

    for (const status of unit.status) {
      const parsed = this.parseStatus(status)
      if (parsed.duration === null) {
        nextStatuses.push(status)
        continue
      }
      if (parsed.duration > 1) {
        nextStatuses.push(this.formatTimedStatus(parsed.base, parsed.duration - 1))
        continue
      }
      if (parsed.base === BATTLE_STATUS.BREAK_TURNS) {
        breakExpired = true
      }
    }

    unit.status = breakExpired ? nextStatuses.filter(status => status !== BATTLE_STATUS.BREAK) : nextStatuses
    if (breakExpired) {
      unit.breakGauge = 0
      this.updateUnitBars(unit)
      this.log(`${unit.name} 从破势状态中恢复！`)
    }
  }

  private getEffectiveSpeed(unit: BattleUnit): number {
    let speed = unit.stats.speed
    if (this.hasStatus(unit, BATTLE_STATUS.SPEED_UP)) speed *= BATTLE_RULES.SPEED_UP_MULTIPLIER
    if (this.hasStatus(unit, BATTLE_STATUS.SPEED_DOWN)) speed *= BATTLE_RULES.SPEED_DOWN_MULTIPLIER
    return speed
  }

  private applyDamageModifiers(actor: BattleUnit, target: BattleUnit, damage: number, isMagic: boolean): number {
    let adjusted = damage
    if (this.hasStatus(actor, BATTLE_STATUS.ROAR)) adjusted *= BATTLE_RULES.ROAR_DAMAGE_MULTIPLIER
    if (this.hasStatus(actor, BATTLE_STATUS.ATTACK_UP)) adjusted *= BATTLE_RULES.ATTACK_UP_DAMAGE_MULTIPLIER
    if (this.hasStatus(target, BATTLE_STATUS.DEFEND)) adjusted *= BATTLE_RULES.DEFEND_DAMAGE_MULTIPLIER
    if (this.hasStatus(target, BATTLE_STATUS.WATER_CURTAIN) || this.hasStatus(target, BATTLE_STATUS.WIND_WALL) || this.hasStatus(target, BATTLE_STATUS.ARMOR_UP) || this.hasStatus(target, BATTLE_STATUS.DEFENSE_UP) || this.hasStatus(target, BATTLE_STATUS.SHIELD)) {
      adjusted *= BATTLE_RULES.BARRIER_DAMAGE_MULTIPLIER
    }
    if (this.hasStatus(target, BATTLE_STATUS.LIGHT_SHIELD)) adjusted *= BATTLE_RULES.STRONG_BARRIER_DAMAGE_MULTIPLIER
    if (isMagic && this.hasStatus(target, BATTLE_STATUS.MAGIC_SHIELD)) adjusted *= BATTLE_RULES.STRONG_BARRIER_DAMAGE_MULTIPLIER
    if (this.hasStatus(target, BATTLE_STATUS.DAMAGE_REDUCE)) adjusted *= BATTLE_RULES.DAMAGE_REDUCE_MULTIPLIER
    if (this.hasStatus(target, BATTLE_STATUS.BREAK)) adjusted *= BATTLE_RULES.BREAK_DAMAGE_MULTIPLIER
    if (this.hasStatus(target, BATTLE_STATUS.WEAKNESS_EXPOSED)) adjusted *= BATTLE_RULES.WEAKNESS_EXPOSED_DAMAGE_MULTIPLIER
    return Math.max(1, Math.floor(adjusted))
  }

  private getControlTargets(unit: BattleUnit): BattleUnit[] {
    const allies = unit.isPlayer ? this.getLivePlayers() : this.getLiveEnemies()
    return allies.filter(target => target !== unit)
  }

  private tryResolveControlStatus(unit: BattleUnit): boolean {
    if (this.hasStatus(unit, BATTLE_STATUS.FEAR) && Math.random() < BATTLE_RULES.FEAR_SKIP_CHANCE) {
      this.log(`${unit.name} 因恐惧无法行动。`)
      this.nextTurn()
      return true
    }
    const controlStatus = (BATTLE_CONTROL_STATUSES as readonly string[]).find(status => this.hasStatus(unit, status))
    if (!controlStatus) return false
    const targets = this.getControlTargets(unit)
    const target = this.pickRandomTarget(targets)
    if (!target) return false
    this.log(`${unit.name} 受${BATTLE_STATUS_LABELS[controlStatus]}影响攻击了同伴！`)
    this.performAttack(unit, target)
    this.nextTurn()
    return true
  }

  private healUnit(unit: BattleUnit, amount: number): number {
    const heal = Math.max(1, Math.floor(amount))
    const before = unit.stats.hp
    unit.stats.hp = Math.min(unit.stats.maxHp, unit.stats.hp + heal)
    if (unit.stats.hp > 0) unit.sprite?.setAlpha(1)
    this.updateUnitBars(unit)
    return unit.stats.hp - before
  }

  private resolveRetaliation(target: BattleUnit, source: BattleUnit | undefined, damageTaken: number, isMagic: boolean): void {
    if (!source || source === target || source.stats.hp <= 0 || target.stats.hp <= 0 || damageTaken <= 0) return

    if (this.hasStatus(target, BATTLE_STATUS.DARK_MIRROR)) {
      const reflectDamage = Math.max(1, Math.floor(damageTaken * BATTLE_RULES.DARK_MIRROR_DAMAGE_RATIO))
      this.log(`${target.name} 的暗镜反射了 ${reflectDamage} 点伤害！`)
      this.dealDamage(source, reflectDamage, target, isMagic, false)
    }

    if (!isMagic && source.stats.hp > 0 && this.hasStatus(target, BATTLE_STATUS.COUNTER)) {
      const counterDamage = Math.max(1, Math.floor(damageTaken * BATTLE_RULES.COUNTER_DAMAGE_RATIO))
      this.log(`${target.name} 反击 ${source.name}，造成 ${counterDamage} 点伤害！`)
      this.dealDamage(source, counterDamage, target, false, false)
    }

    if (source.stats.hp > 0 && this.hasStatus(target, BATTLE_STATUS.FIRE_COUNTER)) {
      const fireDamage = Math.max(1, Math.floor(damageTaken * BATTLE_RULES.FIRE_COUNTER_DAMAGE_RATIO))
      this.log(`${target.name} 的火焰反击灼伤 ${source.name}，造成 ${fireDamage} 点伤害！`)
      this.dealDamage(source, fireDamage, target, false, false)
    }
  }

  private isBaihuTrialEncounter(): boolean {
    return this.encounterId === BATTLE_SPECIAL_ENCOUNTERS.BAIHU_TRIAL
  }

  private isFestivalDefenseEncounter(): boolean {
    return this.encounterId === BATTLE_SPECIAL_ENCOUNTERS.FESTIVAL_DEFENSE
  }

  private hasFestivalDefenseSucceeded(): boolean {
    return this.isFestivalDefenseEncounter() && this.turnCount >= BATTLE_RULES.FESTIVAL_DEFENSE_SURVIVE_TURNS
  }

  private completeFestivalDefense(message: string): boolean {
    if (!this.isFestivalDefenseEncounter()) return false
    if (this.phase === 'victory' || this.phase === 'result') return true
    this.phase = 'victory'
    this.log(message)
    this.time.delayedCall(Math.floor(1500 / this.speedMult), () => this.endBattle(true))
    return true
  }

  private recoverPlayersAfterFestivalDefenseLoss(): void {
    for (const unit of this.units) {
      if (!unit.isPlayer) continue
      if (unit.stats.hp <= 0) {
        unit.stats.hp = Math.max(1, Math.floor(unit.stats.maxHp * BATTLE_RULES.FESTIVAL_DEFENSE_RECOVERY_HP_RATIO))
        unit.sprite?.setAlpha(1)
        this.updateUnitBars(unit)
      }
    }
  }

  private getBaihuTrialUnit(liveEnemies = this.getLiveEnemies()): BattleUnit | undefined {
    if (!this.isBaihuTrialEncounter()) return undefined
    return liveEnemies.find(unit => (unit.data as EnemyData).id === BATTLE_RULES.BAIHU_TRIAL_ENEMY_ID)
  }

  private hasBaihuTrialSucceeded(liveEnemies = this.getLiveEnemies()): boolean {
    const baihu = this.getBaihuTrialUnit(liveEnemies)
    if (!baihu) return false
    return this.turnCount >= BATTLE_RULES.BAIHU_TRIAL_SURVIVE_TURNS || baihu.stats.hp / baihu.stats.maxHp <= BATTLE_RULES.BAIHU_TRIAL_HP_RATIO
  }

  private completeBaihuTrial(message: string): boolean {
    if (!this.isBaihuTrialEncounter()) return false
    if (this.phase === 'victory' || this.phase === 'result') return true
    this.phase = 'victory'
    this.log(message)
    this.time.delayedCall(Math.floor(1500 / this.speedMult), () => this.endBattle(true))
    return true
  }

  private recoverPlayersAfterBaihuTrialLoss(): void {
    for (const unit of this.units) {
      if (!unit.isPlayer) continue
      if (unit.stats.hp <= 0) {
        unit.stats.hp = Math.max(1, Math.floor(unit.stats.maxHp * BATTLE_RULES.BAIHU_TRIAL_RECOVERY_HP_RATIO))
        unit.sprite?.setAlpha(1)
        this.updateUnitBars(unit)
      }
    }
  }

  private addTp(unit: BattleUnit, amount: number): void {
    if (unit.tp >= BATTLE_RULES.MAX_TP) return
    unit.tp = Math.min(BATTLE_RULES.MAX_TP, unit.tp + amount)
    this.updateUnitBars(unit)
  }

  private isReviveEffect(effect: string): boolean {
    return effect.startsWith(BATTLE_RULES.REVIVE_EFFECT_PREFIX)
  }

  private isAllTargetItemEffect(effect: string): boolean {
    return effect.includes(BATTLE_RULES.ALL_TARGET_EFFECT_SUFFIX)
  }

  private getSkillTargets(actor: BattleUnit, selectedTarget: BattleUnit, skill: SkillData): BattleUnit[] {
    if (skill.target === 'self') return [actor]
    if (skill.target === 'all') {
      const targetsAllies = skill.type === 'heal' || skill.type === 'buff' || (skill.type === 'special' && skill.power <= 0)
      return targetsAllies ? this.getLiveAllies(actor) : this.getLiveOpponents(actor)
    }
    if (skill.target === 'random') return this.getLiveOpponents(actor)
    return [selectedTarget]
  }

  private createUnitUI(unit: BattleUnit, x: number, y: number): void {
    const barWidth = BATTLE_LAYOUT.UNIT_BAR_WIDTH
    const barHeight = BATTLE_LAYOUT.UNIT_BAR_HEIGHT
    const isPlayer = unit.isPlayer
    const barColors = {
      hp: BATTLE_LAYOUT.UNIT_HP_COLOR,
      mp: BATTLE_LAYOUT.UNIT_MP_COLOR,
      tp: BATTLE_LAYOUT.UNIT_TP_COLOR,
    }

    // Name
    const nameText = this.add.text(x, y - BATTLE_LAYOUT.UNIT_NAME_OFFSET_Y, unit.name, {
      fontSize: `${BATTLE_LAYOUT.UNIT_NAME_FONT_SIZE}px`,
      color: BATTLE_LAYOUT.UNIT_NAME_COLOR,
      fontFamily: BATTLE_LAYOUT.UNIT_NAME_FONT_FAMILY,
      stroke: BATTLE_LAYOUT.UNIT_NAME_STROKE_COLOR,
      strokeThickness: BATTLE_LAYOUT.UNIT_NAME_STROKE_THICKNESS,
    })
    if (nameText.width > BATTLE_LAYOUT.UNIT_NAME_MAX_WIDTH) {
      nameText.setScale(BATTLE_LAYOUT.UNIT_NAME_MAX_WIDTH / nameText.width)
    }
    nameText.setOrigin(0.5)
    nameText.setDepth(307)
    nameText.setScrollFactor(0)

    let cy = y

    // HP bar
    this.add.rectangle(x, cy, barWidth, barHeight, BATTLE_LAYOUT.UNIT_BAR_BACKGROUND_COLOR).setDepth(306).setScrollFactor(0)
    const hpBar = this.add.rectangle(x - barWidth / 2 + BATTLE_LAYOUT.UNIT_BAR_INSET, cy, barWidth - BATTLE_LAYOUT.UNIT_BAR_INSET * 2, barHeight - BATTLE_LAYOUT.UNIT_BAR_INSET * 2, barColors.hp)
    hpBar.setOrigin(0, 0.5)
    hpBar.setDepth(307)
    hpBar.setScrollFactor(0)
    unit.hpBar = hpBar
    cy += barHeight + BATTLE_LAYOUT.UNIT_BAR_GAP_Y

    if (isPlayer) {
      // MP bar
      this.add.rectangle(x, cy, barWidth, barHeight, BATTLE_LAYOUT.UNIT_BAR_BACKGROUND_COLOR).setDepth(306).setScrollFactor(0)
      const mpBar = this.add.rectangle(x - barWidth / 2 + BATTLE_LAYOUT.UNIT_BAR_INSET, cy, barWidth - BATTLE_LAYOUT.UNIT_BAR_INSET * 2, barHeight - BATTLE_LAYOUT.UNIT_BAR_INSET * 2, barColors.mp)
      mpBar.setOrigin(0, 0.5)
      mpBar.setDepth(307)
      mpBar.setScrollFactor(0)
      unit.mpBar = mpBar
      cy += barHeight + BATTLE_LAYOUT.UNIT_BAR_GAP_Y

      // TP bar
      this.add.rectangle(x, cy, barWidth, barHeight, BATTLE_LAYOUT.UNIT_BAR_BACKGROUND_COLOR).setDepth(306).setScrollFactor(0)
      const tpBar = this.add.rectangle(x - barWidth / 2 + BATTLE_LAYOUT.UNIT_BAR_INSET, cy, barWidth - BATTLE_LAYOUT.UNIT_BAR_INSET * 2, barHeight - BATTLE_LAYOUT.UNIT_BAR_INSET * 2, barColors.tp)
      tpBar.setOrigin(0, 0.5)
      tpBar.setDepth(307)
      tpBar.setScrollFactor(0)
      unit.tpBar = tpBar
      cy += barHeight + BATTLE_LAYOUT.UNIT_BAR_GAP_Y
    } else {
      // Break gauge for enemies
      this.add.rectangle(x, cy, barWidth, barHeight, BATTLE_LAYOUT.UNIT_BAR_BACKGROUND_COLOR).setDepth(306).setScrollFactor(0)
      const breakBar = this.add.rectangle(x - barWidth / 2 + BATTLE_LAYOUT.UNIT_BAR_INSET, cy, barWidth - BATTLE_LAYOUT.UNIT_BAR_INSET * 2, barHeight - BATTLE_LAYOUT.UNIT_BAR_INSET * 2, BATTLE_LAYOUT.UNIT_BREAK_COLOR)
      breakBar.setOrigin(0, 0.5)
      breakBar.setDepth(307)
      breakBar.setScrollFactor(0)
      unit.tpBar = breakBar
    }
    this.updateUnitBars(unit)
  }

  private updateUnitBars(unit: BattleUnit): void {
    if (unit.hpBar) {
      unit.hpBar.setScale(this.getBarRatio(unit.stats.hp, unit.stats.maxHp), 1)
    }
    if (unit.mpBar) {
      unit.mpBar.setScale(this.getBarRatio(unit.stats.mp, unit.stats.maxMp), 1)
    }
    if (unit.tpBar) {
      if (unit.isPlayer) {
        unit.tpBar.setScale(this.getBarRatio(unit.tp, BATTLE_RULES.MAX_TP), 1)
      } else {
        unit.tpBar.setScale(this.getBarRatio(unit.breakGauge, unit.breakMax), 1)
      }
    }
  }

  private getBarRatio(current: number, max: number): number {
    if (max <= 0) return BATTLE_RULES.MIN_BAR_RATIO
    return Math.min(BATTLE_RULES.MAX_BAR_RATIO, Math.max(BATTLE_RULES.MIN_BAR_RATIO, current / max))
  }

  private addRuntimePanel(x: number, y: number, width: number, height: number, textureKey: string, fallbackColor: number, fallbackAlpha: number, depth: number): Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle {
    if (this.textures.exists(textureKey)) {
      const panel = this.add.image(x, y, textureKey)
      panel.setDisplaySize(width, height)
      panel.setAlpha(fallbackAlpha)
      panel.setDepth(depth)
      panel.setScrollFactor(0)
      return panel
    }

    const panel = this.add.rectangle(x, y, width, height, fallbackColor, fallbackAlpha)
    panel.setStrokeStyle(BATTLE_LAYOUT.COMMAND_PANEL_STROKE_WIDTH, BATTLE_LAYOUT.COMMAND_PANEL_STROKE_COLOR)
    panel.setDepth(depth)
    panel.setScrollFactor(0)
    return panel
  }

  private createUI(): void {
    // Command menu background
    const menuBg = this.addRuntimePanel(BATTLE_LAYOUT.COMMAND_PANEL_X, BATTLE_LAYOUT.COMMAND_PANEL_Y, BATTLE_LAYOUT.COMMAND_PANEL_WIDTH, BATTLE_LAYOUT.COMMAND_PANEL_HEIGHT, RUNTIME_UI_ASSET_KEYS.BATTLE_COMMAND, BATTLE_LAYOUT.COMMAND_PANEL_COLOR, BATTLE_LAYOUT.COMMAND_PANEL_ALPHA, 310)
    this.commandMenuObjects.push(menuBg)

    // Menu items
    for (let i = 0; i < BATTLE_COMMAND_LABELS.length; i++) {
      const text = this.add.text(BATTLE_LAYOUT.COMMAND_ITEM_X, BATTLE_LAYOUT.COMMAND_ITEM_START_Y + i * BATTLE_LAYOUT.COMMAND_ITEM_GAP_Y, BATTLE_COMMAND_LABELS[i]!, {
        fontSize: `${BATTLE_LAYOUT.COMMAND_ITEM_FONT_SIZE}px`,
        color: BATTLE_LAYOUT.COMMAND_ITEM_COLOR,
        fontFamily: BATTLE_LAYOUT.COMMAND_ITEM_FONT_FAMILY,
      })
      text.setDepth(311)
      text.setScrollFactor(0)
      bindTouchText(text, () => this.selectBattleMenuItem(i))
      this.menuItems.push(text)
      this.commandMenuObjects.push(text)
    }

    this.cursor = this.add.rectangle(BATTLE_LAYOUT.COMMAND_CURSOR_X, BATTLE_LAYOUT.COMMAND_ITEM_START_Y + BATTLE_LAYOUT.COMMAND_CURSOR_Y_OFFSET, BATTLE_LAYOUT.COMMAND_CURSOR_SIZE, BATTLE_LAYOUT.COMMAND_CURSOR_SIZE, BATTLE_LAYOUT.COMMAND_CURSOR_COLOR)
    this.cursor.setDepth(312)
    this.cursor.setScrollFactor(0)
    this.commandMenuObjects.push(this.cursor)

    // Battle log
    this.logText = this.add.text(BATTLE_LAYOUT.LOG_X, BATTLE_LAYOUT.LOG_Y, '', {
      fontSize: `${BATTLE_LAYOUT.LOG_FONT_SIZE}px`,
      color: BATTLE_LAYOUT.LOG_TEXT_COLOR,
      fontFamily: BATTLE_LAYOUT.LOG_FONT_FAMILY,
      backgroundColor: BATTLE_LAYOUT.LOG_BACKGROUND_COLOR,
      padding: { x: BATTLE_LAYOUT.LOG_PADDING_X, y: BATTLE_LAYOUT.LOG_PADDING_Y },
      wordWrap: { width: BATTLE_LAYOUT.LOG_WRAP_WIDTH },
    })
    this.logText.setDepth(310)
    this.logText.setScrollFactor(0)
  }

  private setupInput(): void {
    cleanupKeyboardOnShutdown(this)
    this.input.keyboard?.on('keydown', this.handleKeydown, this)
  }

  private handleKeydown(event: KeyboardEvent): void {
    const input = InputManager.getInstance()
    const direction = input.isDirection(event.code)
    if (direction === 'up') {
      this.moveActiveMenu(-1)
      return
    }
    if (direction === 'down') {
      this.moveActiveMenu(1)
      return
    }
    if (direction === 'left') {
      this.moveTarget(-1)
      return
    }
    if (direction === 'right') {
      this.moveTarget(1)
      return
    }
    if (input.isConfirm(event.code)) {
      this.confirmActiveMenu()
      return
    }
    if (input.isCancel(event.code)) {
      this.cancelActiveMenu()
    }
  }

  private moveActiveMenu(dir: number): void {
    if (this.inSkillMenu) this.moveSkillMenu(dir)
    else if (this.inItemMenu) this.moveItemMenu(dir)
    else if (this.inBarrelMenu) this.moveBarrelMenu(dir)
    else if (this.inComboMenu) this.moveComboMenu(dir)
    else this.moveMenu(dir)
  }

  private confirmActiveMenu(): void {
    if (this.phase === 'result') { this.finishBattleResult(); return }
    if (this.inSkillMenu) this.selectSkill()
    else if (this.inItemMenu) this.selectItem()
    else if (this.inBarrelMenu) this.selectBarrel()
    else if (this.inComboMenu) this.selectCombo()
    else this.selectMenu()
  }

  private cancelActiveMenu(): void {
    if (this.inSkillMenu) { this.closeSkillMenu(); return }
    if (this.inItemMenu) { this.closeItemMenu(); return }
    if (this.inBarrelMenu) { this.closeBarrelMenu(); return }
    if (this.inComboMenu) { this.closeComboMenu(); return }
    this.cancelTarget()
  }

  private moveMenu(dir: number): void {
    if (this.inTargetSelect || this.phase !== 'player') return
    this.menuIndex = (this.menuIndex + dir + this.menuItems.length) % this.menuItems.length
    this.cursor.setY(this.menuItems[this.menuIndex]!.y + scalePx(6))
    AudioManager.getInstance().playSFX('cursor')
  }

  private selectBattleMenuItem(index: number): void {
    if (this.inTargetSelect || this.phase !== 'player' || index >= this.menuItems.length) return
    const cursorOffsetY = this.cursor.y - this.menuItems[this.menuIndex]!.y
    this.menuIndex = index
    this.cursor.setY(this.menuItems[this.menuIndex]!.y + cursorOffsetY)
    this.selectMenu()
  }

  private selectMenu(): void {
    if (this.phase !== 'player') return

    if (this.inTargetSelect) {
      this.executeAction()
      return
    }

    AudioManager.getInstance().playSFX('confirm')
    switch (this.menuIndex) {
      case 0:
        this.actionStack = ['attack']
        this.startTargetSelect(false)
        break
      case 1:
        this.showSkills()
        break
      case 2:
        this.showCombos()
        break
      case 3:
        this.executeDefend()
        break
      case 4:
        this.showItems()
        break
      case 5:
        this.showBarrels()
        break
      case 6:
        this.tryEscape()
        break
    }
  }

  private getSelectableTargets(): BattleUnit[] {
    if (this.targetPlayers) {
      if (this.actionStack[0] === 'item') {
        const item = this.actionStack[1] ? this.getItemData(this.actionStack[1]) : null
        if (item && this.isReviveEffect(item.effect)) {
          return this.units.filter(u => u.isPlayer && u.stats.hp <= 0)
        }
      }
      return this.getLivePlayers()
    }
    return this.getLiveEnemies()
  }

  private updateTargetIndicator(target: BattleUnit): void {
    if (!target.sprite) return
    if (!this.targetIndicator) {
      this.targetIndicator = this.add.triangle(
        target.sprite.x,
        target.sprite.y - BATTLE_TARGET_INDICATOR.offsetY,
        0,
        0,
        BATTLE_TARGET_INDICATOR.width,
        0,
        BATTLE_TARGET_INDICATOR.width / 2,
        BATTLE_TARGET_INDICATOR.height,
        BATTLE_TARGET_INDICATOR.color,
      )
      this.targetIndicator.setOrigin(0.5)
      this.targetIndicator.setDepth(BATTLE_TARGET_INDICATOR.depth)
      this.targetIndicator.setScrollFactor(0)
    }
    this.targetIndicator.setVisible(true)
    this.targetIndicator.setPosition(target.sprite.x, target.sprite.y - BATTLE_TARGET_INDICATOR.offsetY)
    this.tweens.killTweensOf(this.targetIndicator)
    this.tweens.add({
      targets: this.targetIndicator,
      y: this.targetIndicator.y - BATTLE_TARGET_INDICATOR.tweenOffsetY,
      duration: Math.floor(BATTLE_TARGET_INDICATOR.tweenDurationMs / this.speedMult),
      yoyo: true,
      repeat: -1,
    })
  }

  private hideTargetIndicator(): void {
    if (this.targetIndicator) {
      this.tweens.killTweensOf(this.targetIndicator)
    }
    this.targetIndicator?.setVisible(false)
  }

  private startTargetSelect(targetPlayers: boolean): void {
    this.inTargetSelect = true
    this.setCommandMenuVisible(false)
    this.targetPlayers = targetPlayers
    const targets = this.getSelectableTargets()
    if (targets.length === 0) {
      this.inTargetSelect = false
      this.setCommandMenuVisible(true)
      this.hideTargetIndicator()
      this.log('没有有效目标')
      return
    }
    this.targetIndex = 0
    this.log(`选择目标: ${targets[0]!.name}`)
    this.updateTargetIndicator(targets[0]!)
  }

  private moveTarget(dir: number): void {
    if (!this.inTargetSelect) return
    const targets = this.getSelectableTargets()
    if (targets.length === 0) return
    this.targetIndex = (this.targetIndex + dir + targets.length) % targets.length
    this.log(`选择目标: ${targets[this.targetIndex]!.name}`)
    this.updateTargetIndicator(targets[this.targetIndex]!)
  }

  private selectTarget(unit: BattleUnit): void {
    if (!this.inTargetSelect) return
    const targets = this.getSelectableTargets()
    const index = targets.indexOf(unit)
    if (index < 0) return
    this.targetIndex = index
    this.log(`选择目标: ${unit.name}`)
    this.updateTargetIndicator(unit)
    this.executeAction()
  }

  private cancelTarget(): void {
    if (this.inTargetSelect) {
      this.inTargetSelect = false
      this.setCommandMenuVisible(true)
      this.hideTargetIndicator()
      this.log('取消选择')
      AudioManager.getInstance().playSFX('cancel')
    }
  }

  private executeAction(): void {
    const actor = this.getCurrentUnit()
    if (!actor) return

    const action = this.actionStack[0]
    const targets = this.getSelectableTargets()
    const target = targets[this.targetIndex]

    if (!target) {
      this.inTargetSelect = false
      this.setCommandMenuVisible(true)
      this.hideTargetIndicator()
      return
    }

    let actionConsumed = false
    if (action === 'attack') {
      this.performAttack(actor, target)
      actionConsumed = true
    } else if (action === 'skill') {
      const skillId = this.actionStack[1]!
      actionConsumed = this.performSkill(actor, target, skillId)
    } else if (action === 'item') {
      const itemId = this.actionStack[1]!
      actionConsumed = this.performItem(actor, target, itemId)
    }

    this.inTargetSelect = false
    this.setCommandMenuVisible(true)
    this.hideTargetIndicator()
    if (actionConsumed) {
      this.nextTurn()
    }
  }

  private setCommandMenuVisible(visible: boolean): void {
    for (const object of this.commandMenuObjects) object.setVisible(visible)
  }

  private executeDefend(): void {
    const actor = this.getCurrentUnit()
    if (!actor) return
    this.log(`${actor.name} 采取防御姿态。`)
    this.addStatus(actor, BATTLE_STATUS.DEFEND)
    // TP recovery on defend
    this.addTp(actor, BATTLE_RULES.DEFEND_TP_GAIN)
    this.nextTurn()
  }

  private skillMenuItems: Phaser.GameObjects.Text[] = []
  private skillMenuCursor!: Phaser.GameObjects.Rectangle
  private skillMenuIndex = 0
  private inSkillMenu = false
  private skillMenuBg!: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image

  private showSkills(): void {
    const actor = this.getCurrentUnit()
    if (!actor || !actor.isPlayer) return
    const char = actor.data as CharacterData
    const skillDefs = GAME_CONFIG_DATABASE.getTable('skills')
    const skills = char.skills.filter(s => {
      const sk = skillDefs[s]
      if (!sk) return false
      return char.stats.mp >= sk.costMp && actor.tp >= sk.costTp
    })
    if (skills.length === 0) {
      this.log('没有可用技能')
      return
    }
    this.inSkillMenu = true
    this.skillMenuIndex = 0
    this.skillMenuItems = []

    // Skill menu panel
    this.skillMenuBg = this.addRuntimePanel(scalePx(560), scalePx(440), scalePx(280), scalePx(140), RUNTIME_UI_ASSET_KEYS.BATTLE_COMMAND, BATTLE_LAYOUT.COMMAND_PANEL_COLOR, BATTLE_LAYOUT.COMMAND_PANEL_ALPHA, 320)

    for (let i = 0; i < skills.length; i++) {
      const sk = skillDefs[skills[i]!]!
      const cost = sk.costTp > 0 ? `TP${sk.costTp}` : `MP${sk.costMp}`
      const text = this.add.text(scalePx(430), scalePx(390 + i * 22), `${sk.name} [${cost}]`, {
        fontSize: scaleFont(14),
        color: BATTLE_LAYOUT.COMMAND_ITEM_COLOR,
      })
      text.setDepth(321)
      text.setScrollFactor(0)
      bindTouchText(text, () => this.selectSkillMenuItem(i))
      this.skillMenuItems.push(text)
    }
    this.skillMenuCursor = this.add.rectangle(scalePx(420), scalePx(390 + 6), scalePx(8), scalePx(8), BATTLE_LAYOUT.COMMAND_CURSOR_COLOR)
    this.skillMenuCursor.setDepth(322)
    this.skillMenuCursor.setScrollFactor(0)
  }

  private moveSkillMenu(dir: number): void {
    if (!this.inSkillMenu) return
    this.skillMenuIndex = (this.skillMenuIndex + dir + this.skillMenuItems.length) % this.skillMenuItems.length
    this.skillMenuCursor.setY(this.skillMenuItems[this.skillMenuIndex]!.y + scalePx(6))
    AudioManager.getInstance().playSFX('cursor')
  }

  private selectSkillMenuItem(index: number): void {
    if (!this.inSkillMenu || index >= this.skillMenuItems.length) return
    const cursorOffsetY = this.skillMenuCursor.y - this.skillMenuItems[this.skillMenuIndex]!.y
    this.skillMenuIndex = index
    this.skillMenuCursor.setY(this.skillMenuItems[this.skillMenuIndex]!.y + cursorOffsetY)
    this.selectSkill()
  }

  private selectSkill(): void {
    if (!this.inSkillMenu) return
    const actor = this.getCurrentUnit()
    if (!actor || !actor.isPlayer) return
    const char = actor.data as CharacterData
    const skillDefs = GAME_CONFIG_DATABASE.getTable('skills')
    const skills = char.skills.filter(s => {
      const sk = skillDefs[s]
      if (!sk) return false
      return char.stats.mp >= sk.costMp && actor.tp >= sk.costTp
    })
    const skillId = skills[this.skillMenuIndex]
    if (!skillId) return
    this.closeSkillMenu()
    this.actionStack = ['skill', skillId]
    const sk = skillDefs[skillId]
    if (sk && (sk.target === 'self' || sk.target === 'all' || sk.target === 'random')) {
      if (this.performSkill(actor, actor, skillId)) {
        this.nextTurn()
      }
      return
    }
    const targetPlayers = sk?.target === 'self' || sk?.type === 'heal' || sk?.type === 'buff'
    this.startTargetSelect(targetPlayers)
  }

  private closeSkillMenu(): void {
    this.inSkillMenu = false
    this.skillMenuBg?.destroy()
    for (const item of this.skillMenuItems) item.destroy()
    this.skillMenuItems = []
    this.skillMenuCursor?.destroy()
  }

  private itemMenuItems: Phaser.GameObjects.Text[] = []
  private itemMenuCursor!: Phaser.GameObjects.Rectangle
  private itemMenuIndex = 0
  private inItemMenu = false
  private itemMenuBg!: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image

  private showItems(): void {
    const gd = GameData.getInstance()
    const items = Object.entries(gd.inventory.items).filter(([itemId]) => {
      const item = this.getItemData(itemId)
      return item && item.usableInBattle
    })

    if (items.length === 0) {
      this.log('没有可使用的道具')
      return
    }

    this.inItemMenu = true
    this.itemMenuIndex = 0
    this.itemMenuItems = []

    this.itemMenuBg = this.addRuntimePanel(scalePx(560), scalePx(440), scalePx(280), scalePx(140), RUNTIME_UI_ASSET_KEYS.BATTLE_COMMAND, BATTLE_LAYOUT.COMMAND_PANEL_COLOR, BATTLE_LAYOUT.COMMAND_PANEL_ALPHA, 320)

    for (let i = 0; i < items.length; i++) {
      const [itemId, qty] = items[i]!
      const item = this.getItemData(itemId)
      if (!item) continue
      const text = this.add.text(scalePx(430), scalePx(390 + i * 22), `${item.name} x${qty}`, {
        fontSize: scaleFont(14),
        color: BATTLE_LAYOUT.COMMAND_ITEM_COLOR,
      })
      text.setDepth(321)
      text.setScrollFactor(0)
      bindTouchText(text, () => this.selectItemMenuItem(i))
      this.itemMenuItems.push(text)
    }
    this.itemMenuCursor = this.add.rectangle(scalePx(420), scalePx(390 + 6), scalePx(8), scalePx(8), BATTLE_LAYOUT.COMMAND_CURSOR_COLOR)
    this.itemMenuCursor.setDepth(322)
    this.itemMenuCursor.setScrollFactor(0)
  }

  private moveItemMenu(dir: number): void {
    if (!this.inItemMenu) return
    this.itemMenuIndex = (this.itemMenuIndex + dir + this.itemMenuItems.length) % this.itemMenuItems.length
    this.itemMenuCursor.setY(this.itemMenuItems[this.itemMenuIndex]!.y + scalePx(6))
    AudioManager.getInstance().playSFX('cursor')
  }

  private selectItemMenuItem(index: number): void {
    if (!this.inItemMenu || index >= this.itemMenuItems.length) return
    const cursorOffsetY = this.itemMenuCursor.y - this.itemMenuItems[this.itemMenuIndex]!.y
    this.itemMenuIndex = index
    this.itemMenuCursor.setY(this.itemMenuItems[this.itemMenuIndex]!.y + cursorOffsetY)
    this.selectItem()
  }

  private selectItem(): void {
    if (!this.inItemMenu) return
    const gd = GameData.getInstance()
    const items = Object.entries(gd.inventory.items).filter(([itemId]) => {
      const item = this.getItemData(itemId)
      return item && item.usableInBattle
    })
    const [itemId] = items[this.itemMenuIndex]!
    if (!itemId) return
    this.closeItemMenu()
    this.actionStack = ['item', itemId]
    const item = this.getItemData(itemId)
    const actor = this.getCurrentUnit()
    if (item && this.isAllTargetItemEffect(item.effect)) {
      if (actor && this.performItem(actor, actor, itemId)) {
        this.nextTurn()
      }
      return
    }
    const targetPlayers = item ? this.isPlayerTargetItemEffect(item.effect) : true
    this.startTargetSelect(targetPlayers)
  }

  private isPlayerTargetItemEffect(effect: string): boolean {
    return effect.startsWith(BATTLE_RULES.HEAL_HP_EFFECT_PREFIX)
      || effect.startsWith(BATTLE_RULES.HEAL_MP_EFFECT_PREFIX)
      || this.isReviveEffect(effect)
      || BATTLE_RULES.PLAYER_TARGET_ITEM_EFFECT_MARKERS.some(marker => effect.includes(marker))
  }

  private closeItemMenu(): void {
    this.inItemMenu = false
    this.itemMenuBg?.destroy()
    for (const item of this.itemMenuItems) item.destroy()
    this.itemMenuItems = []
    this.itemMenuCursor?.destroy()
  }

  private barrelMenuItems: Phaser.GameObjects.Text[] = []
  private barrelMenuCursor!: Phaser.GameObjects.Rectangle
  private barrelMenuIndex = 0
  private inBarrelMenu = false
  private barrelMenuBg!: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image
  private barrelMenuColors: BarrelColor[] = []
  private comboMenuItems: Phaser.GameObjects.Text[] = []
  private comboMenuCursor!: Phaser.GameObjects.Rectangle
  private comboMenuIndex = 0
  private inComboMenu = false
  private comboMenuBg!: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image
  private availableCombos: { skillId: string; name: string; char1: string; char2: string }[] = []

  private showBarrels(): void {
    const bs = BarrelSystem.getInstance()
    const unlocked = bs.getUnlockedColors()

    if (unlocked.length === 0) {
      this.log('没有可用的木桶')
      return
    }

    this.inBarrelMenu = true
    this.barrelMenuIndex = 0
    this.barrelMenuItems = []
    this.barrelMenuColors = unlocked

    this.barrelMenuBg = this.addRuntimePanel(scalePx(560), scalePx(440), scalePx(280), scalePx(140), RUNTIME_UI_ASSET_KEYS.BATTLE_COMMAND, BATTLE_LAYOUT.COMMAND_PANEL_COLOR, BATTLE_LAYOUT.COMMAND_PANEL_ALPHA, 320)

    for (let i = 0; i < unlocked.length; i++) {
      const ability = bs.getAbility(unlocked[i]!)
      const text = this.add.text(scalePx(430), scalePx(390 + i * 22), `${ability!.name} - ${ability!.battleDescription}`, {
        fontSize: scaleFont(14),
        color: BATTLE_LAYOUT.COMMAND_ITEM_COLOR,
      })
      text.setDepth(321)
      text.setScrollFactor(0)
      bindTouchText(text, () => this.selectBarrelMenuItem(i))
      this.barrelMenuItems.push(text)
    }
    this.barrelMenuCursor = this.add.rectangle(scalePx(420), scalePx(390 + 6), scalePx(8), scalePx(8), BATTLE_LAYOUT.COMMAND_CURSOR_COLOR)
    this.barrelMenuCursor.setDepth(322)
    this.barrelMenuCursor.setScrollFactor(0)
  }

  private moveBarrelMenu(dir: number): void {
    if (!this.inBarrelMenu) return
    this.barrelMenuIndex = (this.barrelMenuIndex + dir + this.barrelMenuItems.length) % this.barrelMenuItems.length
    this.barrelMenuCursor.setY(this.barrelMenuItems[this.barrelMenuIndex]!.y + scalePx(6))
    AudioManager.getInstance().playSFX('cursor')
  }

  private selectBarrelMenuItem(index: number): void {
    if (!this.inBarrelMenu || index >= this.barrelMenuItems.length) return
    const cursorOffsetY = this.barrelMenuCursor.y - this.barrelMenuItems[this.barrelMenuIndex]!.y
    this.barrelMenuIndex = index
    this.barrelMenuCursor.setY(this.barrelMenuItems[this.barrelMenuIndex]!.y + cursorOffsetY)
    this.selectBarrel()
  }

  private selectBarrel(): void {
    if (!this.inBarrelMenu) return
    const color = this.barrelMenuColors[this.barrelMenuIndex]
    if (!color) return
    this.closeBarrelMenu()

    const actor = this.getCurrentUnit()
    if (!actor) return

    this.performBarrel(actor, color)
    this.nextTurn()
  }

  private closeBarrelMenu(): void {
    this.inBarrelMenu = false
    this.barrelMenuBg?.destroy()
    for (const item of this.barrelMenuItems) item.destroy()
    this.barrelMenuItems = []
    this.barrelMenuCursor?.destroy()
    this.barrelMenuColors = []
  }

  private getAvailableCombos(): { skillId: string; name: string; char1: string; char2: string }[] {
    const gd = GameData.getInstance()
    const playerIds = new Set(this.units.filter(unit => unit.isPlayer).map(unit => unit.id))
    const skillDefs = GAME_CONFIG_DATABASE.getTable('skills')
    const results: { skillId: string; name: string; char1: string; char2: string }[] = []

    for (const def of COMBO_DEFS) {
      if (!playerIds.has(def.char1) || !playerIds.has(def.char2)) continue
      if (gd.getFlag(def.flag) !== true) continue

      const unit1 = this.units.find(u => u.isPlayer && u.id === def.char1)
      const unit2 = this.units.find(u => u.isPlayer && u.id === def.char2)
      if (!unit1 || !unit2 || unit1.stats.hp <= 0 || unit2.stats.hp <= 0) continue
      if (unit1.tp < COMBO_TP_COST || unit2.tp < COMBO_TP_COST) continue

      const skill = skillDefs[def.skillId]
      if (!skill) continue

      results.push({ skillId: def.skillId, name: skill.name, char1: def.char1, char2: def.char2 })
    }
    return results
  }

  private showCombos(): void {
    const combos = this.getAvailableCombos()
    if (combos.length === 0) {
      this.log('无可用连携技')
      return
    }

    this.inComboMenu = true
    this.comboMenuIndex = 0
    this.comboMenuItems = []
    this.availableCombos = combos

    this.comboMenuBg = this.addRuntimePanel(scalePx(560), scalePx(440), scalePx(280), scalePx(140), RUNTIME_UI_ASSET_KEYS.BATTLE_COMMAND, BATTLE_LAYOUT.COMMAND_PANEL_COLOR, BATTLE_LAYOUT.COMMAND_PANEL_ALPHA, 320)

    for (let i = 0; i < combos.length; i++) {
      const combo = combos[i]!
      const char1Unit = this.units.find(u => u.isPlayer && u.id === combo.char1)
      const char2Unit = this.units.find(u => u.isPlayer && u.id === combo.char2)
      const label = `${combo.name} [${char1Unit?.name}+${char2Unit?.name}]`
      const text = this.add.text(scalePx(430), scalePx(390 + i * 22), label, {
        fontSize: scaleFont(14),
        color: BATTLE_LAYOUT.COMBO_ITEM_COLOR,
      })
      text.setDepth(321)
      text.setScrollFactor(0)
      bindTouchText(text, () => this.selectComboMenuItem(i))
      this.comboMenuItems.push(text)
    }
    this.comboMenuCursor = this.add.rectangle(scalePx(420), scalePx(390 + 6), scalePx(8), scalePx(8), BATTLE_LAYOUT.COMMAND_CURSOR_COLOR)
    this.comboMenuCursor.setDepth(322)
    this.comboMenuCursor.setScrollFactor(0)
  }

  private moveComboMenu(dir: number): void {
    if (!this.inComboMenu) return
    this.comboMenuIndex = (this.comboMenuIndex + dir + this.comboMenuItems.length) % this.comboMenuItems.length
    this.comboMenuCursor.setY(this.comboMenuItems[this.comboMenuIndex]!.y + scalePx(6))
    AudioManager.getInstance().playSFX('cursor')
  }

  private selectComboMenuItem(index: number): void {
    if (!this.inComboMenu || index >= this.comboMenuItems.length) return
    const cursorOffsetY = this.comboMenuCursor.y - this.comboMenuItems[this.comboMenuIndex]!.y
    this.comboMenuIndex = index
    this.comboMenuCursor.setY(this.comboMenuItems[this.comboMenuIndex]!.y + cursorOffsetY)
    this.selectCombo()
  }

  private selectCombo(): void {
    if (!this.inComboMenu) return
    const combo = this.availableCombos[this.comboMenuIndex]
    if (!combo) return
    this.closeComboMenu()
    this.executeCombo(combo)
    this.nextTurn()
  }

  private closeComboMenu(): void {
    this.inComboMenu = false
    this.comboMenuBg?.destroy()
    for (const item of this.comboMenuItems) item.destroy()
    this.comboMenuItems = []
    this.comboMenuCursor?.destroy()
    this.availableCombos = []
  }

  private executeCombo(combo: { skillId: string; char1: string; char2: string }): void {
    const unit1 = this.units.find(u => u.isPlayer && u.id === combo.char1)!
    const unit2 = this.units.find(u => u.isPlayer && u.id === combo.char2)!

    unit1.tp -= COMBO_TP_COST
    unit2.tp -= COMBO_TP_COST
    this.updateUnitBars(unit1)
    this.updateUnitBars(unit2)

    const skill = GAME_CONFIG_DATABASE.getTable('skills')[combo.skillId]
    if (!skill) return

    AudioManager.getInstance().playSFX('magic_cast')

    const comboText = this.add.text(GAME_WIDTH / 2, scalePx(200), '连携！', {
      fontSize: scaleFont(32),
      color: BATTLE_LAYOUT.COMBO_TEXT_COLOR,
      fontStyle: 'bold',
      stroke: BATTLE_LAYOUT.COMBO_TEXT_STROKE_COLOR,
      strokeThickness: scalePx(4),
    })
    comboText.setOrigin(0.5)
    comboText.setDepth(330)
    comboText.setScrollFactor(0)
    this.tweens.add({
      targets: comboText,
      y: scalePx(150),
      alpha: 0,
      duration: Math.floor(1000 / this.speedMult),
      onComplete: () => comboText.destroy(),
    })

    if (skill.type === 'buff') {
      const party = this.getLivePlayers()
      for (const u of party) {
        if (!this.applyConfiguredSkillStatuses(u, skill)) this.addStatus(u, skill.id)
        this.updateUnitBars(u)
      }
      this.log(`${unit1.name} 与 ${unit2.name} 发动 ${skill.name}！`)
      return
    }

    const char1 = unit1.data as CharacterData
    const char2 = unit2.data as CharacterData
    const combinedAtk = char1.stats.atk + char2.stats.atk
    const combinedMatk = char1.stats.matk + char2.stats.matk

    const targets = this.units.filter(u => !u.isPlayer && u.stats.hp > 0)
    const isMagic = skill.type === 'magic'
    const stat = isMagic ? combinedMatk : combinedAtk

    if (skill.target === 'all') {
      for (const t of targets) {
        const def = isMagic ? (t.data as EnemyData).stats.mdef : (t.data as EnemyData).stats.def
        let damage = Math.max(1, Math.floor(skill.power * stat / 10 / Math.max(1, def * 0.5)))
        damage = this.applyDamageModifiers(unit1, t, damage, isMagic)
        damage = this.applyDamageVariance(damage)
        this.log(`${unit1.name} 与 ${unit2.name} 发动 ${skill.name}，对 ${t.name} 造成 ${damage} 点伤害！`)
        this.dealDamage(t, damage, unit1, isMagic)
      }
    } else {
      const target = targets.length > 0 ? targets[0]! : targets[0]
      if (target) {
        const def = isMagic ? (target.data as EnemyData).stats.mdef : (target.data as EnemyData).stats.def
        let damage = Math.max(1, Math.floor(skill.power * stat / 10 / Math.max(1, def * 0.5)))
        damage = this.applyDamageModifiers(unit1, target, damage, isMagic)
        damage = this.applyDamageVariance(damage)
        this.log(`${unit1.name} 与 ${unit2.name} 发动 ${skill.name}，对 ${target.name} 造成 ${damage} 点伤害！`)
        this.dealDamage(target, damage, unit1, isMagic)
      }
    }

    this.markComboUnitActed(unit1)
    this.markComboUnitActed(unit2)
  }

  private markComboUnitActed(unit: BattleUnit): void {
    const idx = this.turnOrder.indexOf(this.units.indexOf(unit))
    if (idx > this.currentTurn) {
      this.addStatus(unit, BATTLE_STATUS.COMBO_ACTED, undefined, false)
    }
  }

  private performBarrel(actor: BattleUnit, color: BarrelColor): void {
    const bs = BarrelSystem.getInstance()
    const result = bs.useBattleBarrel(color)
    if (!result.success) {
      this.log('无法使用该木桶')
      return
    }

    const ability = bs.getAbility(color)!
    AudioManager.getInstance().playSFX('magic_cast')
    this.log(`${actor.name} 使用 ${ability.name}！`)

    switch (result.effect) {
      case 'heal_poison': {
        const party = this.getLivePlayers()
        for (const u of party) {
          this.healUnit(u, u.stats.maxHp * BATTLE_RULES.BARREL_HEAL_HP_RATIO)
          this.removeStatus(u, BATTLE_STATUS.POISON)
        }
        this.log('全队回复30%HP，解除中毒！')
        break
      }
      case 'restore_mp': {
        actor.stats.mp = Math.min(actor.stats.maxMp, actor.stats.mp + BATTLE_RULES.BARREL_RESTORE_MP_AMOUNT)
        this.removeStatus(actor, BATTLE_STATUS.BURN)
        this.updateUnitBars(actor)
        this.log(`${actor.name} 回复${BATTLE_RULES.BARREL_RESTORE_MP_AMOUNT}MP，解除灼烧！`)
        break
      }
      case 'light_shield': {
        const party = this.getLivePlayers()
        for (const u of party) {
          this.addStatus(u, BATTLE_STATUS.LIGHT_SHIELD, BATTLE_STATUS_DURATIONS.SHORT)
        }
        this.log('全队获得光属性护盾，防御+50%持续2回合！')
        break
      }
      case 'immunity_poison': {
        const party = this.getLivePlayers()
        for (const u of party) {
          this.addStatus(u, BATTLE_STATUS.IMMUNITY_POISON, BATTLE_STATUS_DURATIONS.STANDARD)
        }
        this.log('全队获得毒免疫，持续3回合！')
        break
      }
      case 'defense_up': {
        this.addStatus(actor, BATTLE_STATUS.DEFENSE_UP, BATTLE_STATUS_DURATIONS.STANDARD)
        this.updateUnitBars(actor)
        this.log(`${actor.name} 防御+30%持续3回合！`)
        break
      }
      case 'fire_counter': {
        this.addStatus(actor, BATTLE_STATUS.FIRE_COUNTER, BATTLE_STATUS_DURATIONS.SHORT)
        this.updateUnitBars(actor)
        this.log(`${actor.name} 获得火属性反击，持续2回合！`)
        break
      }
      case 'taunt_damage_reduce': {
        this.addStatus(actor, BATTLE_STATUS.TAUNT, BATTLE_STATUS_DURATIONS.SHORT)
        this.addStatus(actor, BATTLE_STATUS.DAMAGE_REDUCE, BATTLE_STATUS_DURATIONS.SHORT)
        this.updateUnitBars(actor)
        this.log(`${actor.name} 发起嘲讽并减伤30%，持续2回合！`)
        break
      }
      case 'ultimate_resonance': {
        const party = this.getLivePlayers()
        for (const u of party) {
          u.tp = Math.min(BATTLE_RULES.MAX_TP, u.tp + BATTLE_RULES.BARREL_RESONANCE_TP_GAIN)
          this.updateUnitBars(u)
        }
        this.log(`全队共鸣！TP+${BATTLE_RULES.BARREL_RESONANCE_TP_GAIN}！`)
        break
      }
    }
  }

  private getItemData(itemId: string): ItemData | null {
    const item = GAME_CONFIG_DATABASE.getTable('items')[itemId]
    return item?.usableInBattle && item.type === 'consumable' ? item : null
  }

  private performItem(actor: BattleUnit, target: BattleUnit, itemId: string): boolean {
    const gd = GameData.getInstance()
    const item = this.getItemData(itemId)
    if (!item) return false

    if (this.isReviveEffect(item.effect) && target.stats.hp > 0) {
      this.log(`${target.name} 还活着！`)
      return false
    }
    if (!gd.removeItem(itemId, 1)) {
      this.log('道具不足！')
      return false
    }

    AudioManager.getInstance().playSFX('item_use')
    const effect = item.effect
    if (effect.startsWith(BATTLE_RULES.HEAL_HP_EFFECT_PREFIX)) {
      const amount = parseInt(effect.split(':')[1]!)
      if (this.isAllTargetItemEffect(effect)) {
        const targets = this.getLivePlayers()
        for (const t of targets) {
          this.healUnit(t, amount)
        }
        this.log(`${item.name}！全队回复 ${amount} HP！`)
      } else {
        this.healUnit(target, amount)
        this.log(`${item.name}！${target.name} 回复 ${amount} HP！`)
      }
    } else if (effect.startsWith(BATTLE_RULES.HEAL_MP_EFFECT_PREFIX)) {
      const amount = parseInt(effect.split(':')[1]!)
      target.stats.mp = Math.min(target.stats.maxMp, target.stats.mp + amount)
      this.log(`${item.name}！${target.name} 回复 ${amount} MP！`)
    } else if (effect === 'cure_poison') {
      this.removeStatus(target, BATTLE_STATUS.POISON)
      this.log(`${item.name}！${target.name} 解毒成功！`)
    } else if (effect === 'cure_confuse_charm_fear') {
      this.removeStatus(target, BATTLE_STATUS.CONFUSE)
      this.removeStatus(target, BATTLE_STATUS.CHARM)
      this.removeStatus(target, BATTLE_STATUS.FEAR)
      this.log(`${item.name}！${target.name} 状态恢复！`)
    } else if (effect.startsWith(BATTLE_RULES.REVIVE_EFFECT_PREFIX)) {
      const pct = parseInt(effect.split(':')[1]!)
      target.stats.hp = Math.floor(target.stats.maxHp * pct / BATTLE_RULES.PERCENT_DIVISOR)
      target.sprite!.setAlpha(1)
      this.updateUnitBars(target)
      this.log(`${item.name}！${target.name} 复活了！`)
    } else if (effect === 'buff_speed') {
      this.addStatus(target, BATTLE_STATUS.SPEED_UP, BATTLE_STATUS_DURATIONS.SHORT)
      this.log(`${item.name}！${target.name} 速度提升！`)
    } else if (effect === 'barrier_status') {
      this.addStatus(target, BATTLE_STATUS.STATUS_BARRIER, BATTLE_STATUS_DURATIONS.STANDARD)
      this.log(`${item.name}！${target.name} 获得异常护盾！`)
    } else {
      this.log(`使用了 ${item.name}`)
    }
    return true
  }

  private tryEscape(): void {
    const success = Math.random() < BATTLE_RULES.ESCAPE_SUCCESS_RATE
    if (success) {
      this.log('成功逃跑了！')
      this.time.delayedCall(Math.floor(1000 / this.speedMult), () => this.endBattle(false, true))
    } else {
      this.log('逃跑失败！')
      this.nextTurn()
    }
  }

  private performAttack(actor: BattleUnit, target: BattleUnit): void {
    const isPlayer = actor.isPlayer
    const atk = isPlayer ? (actor.data as CharacterData).stats.atk : (actor.data as EnemyData).stats.atk
    const def = target.isPlayer ? (target.data as CharacterData).stats.def : (target.data as EnemyData).stats.def
    let damage = Math.max(1, Math.floor(atk * 1.5 - def * 0.5))
    damage = this.applyDamageModifiers(actor, target, damage, false)

    // Difficulty scaling
    if (!isPlayer) {
      damage = Math.floor(damage * this.difficultyMult.dmg)
    } else {
      damage = Math.floor(damage * this.getPlayerDamageMultiplier())
    }

    damage = this.applyDamageVariance(damage)

    AudioManager.getInstance().playSFX('attack_slash')
    this.log(`${actor.name} 攻击 ${target.name}，造成 ${damage} 点伤害！`)
    this.dealDamage(target, damage, actor, false)

    // TP generation for player
    if (isPlayer) {
      this.addTp(actor, BATTLE_RULES.PLAYER_ATTACK_TP_GAIN)
    }
    // TP generation for enemy
    if (!isPlayer) {
      this.addTp(actor, BATTLE_RULES.ENEMY_ATTACK_TP_GAIN)
    }

    // Break gauge for enemies
    if (!target.isPlayer && !this.hasStatus(target, BATTLE_STATUS.BREAK)) {
      target.breakGauge = Math.min(target.breakMax, target.breakGauge + BATTLE_RULES.NORMAL_BREAK_GAIN)
      this.updateUnitBars(target)
    }

    // Animation
    this.tweens.add({
      targets: actor.sprite,
      x: actor.sprite!.x + (target.sprite!.x - actor.sprite!.x) * 0.3,
      duration: Math.floor(150 / this.speedMult),
      yoyo: true,
    })
  }

  private performSkill(actor: BattleUnit, target: BattleUnit, skillId: string): boolean {
    const skill = GAME_CONFIG_DATABASE.getTable('skills')[skillId]
    if (!skill) {
      this.performAttack(actor, target)
      return true
    }

    const isPlayer = actor.isPlayer
    const targets = this.getSkillTargets(actor, target, skill).filter(t => t.stats.hp > 0)
    if (targets.length === 0) {
      this.log('没有有效目标')
      return false
    }

    if (actor.stats.mp < skill.costMp) {
      if (isPlayer) {
        this.log('MP不足！')
      }
      if (!isPlayer) {
        this.performAttack(actor, target)
        return true
      }
      return false
    }
    if (actor.tp < skill.costTp) {
      this.log('TP不足！')
      return false
    }

    actor.stats.mp -= skill.costMp
    if (isPlayer) {
      ;(actor.data as CharacterData).stats.mp = actor.stats.mp
    }
    actor.tp -= skill.costTp
    this.updateUnitBars(actor)

    if (skill.type === 'heal') {
      AudioManager.getInstance().playSFX('heal')
      for (const currentTarget of targets) {
        this.performHeal(actor, currentTarget, skill)
      }
      return true
    }

    if (skill.type === 'buff') {
      AudioManager.getInstance().playSFX('magic_cast')
      for (const currentTarget of targets) {
        this.applyBuff(actor, currentTarget, skill)
      }
      return true
    }

    if (skill.type === 'debuff') {
      AudioManager.getInstance().playSFX('magic_cast')
      for (const currentTarget of targets) {
        this.applyDebuff(actor, currentTarget, skill)
      }
      return true
    }

    if (skill.type === 'special') {
      AudioManager.getInstance().playSFX('magic_cast')
      this.log(`${actor.name} 使用 ${skill.name}！`)
      if (this.performSpecialSkill(actor, targets, skill)) return true
      if (skill.power > 0) {
        for (const currentTarget of targets) {
          this.calculateAndDealSkillDamage(actor, currentTarget, skill)
        }
      } else {
        for (const currentTarget of targets) {
          if (!this.applyConfiguredSkillStatuses(currentTarget, skill)) this.addStatus(currentTarget, skill.id)
        }
      }
      return true
    }

    if (skill.target === 'random') {
      const hitCount = this.getRandomHitCount(skill.id)
      for (let i = 0; i < hitCount; i++) {
        const randomTarget = this.pickRandomTarget(this.getLiveOpponents(actor))
        if (!randomTarget) break
        this.calculateAndDealSkillDamage(actor, randomTarget, skill)
      }
      return true
    }

    for (const currentTarget of targets) {
      this.calculateAndDealSkillDamage(actor, currentTarget, skill)
    }
    return true
  }

  private performSpecialSkill(actor: BattleUnit, targets: BattleUnit[], skill: SkillData): boolean {
    if (skill.id === 'afternoon_tea') {
      const healed = this.healUnit(actor, actor.stats.maxHp * BATTLE_RULES.AFTERNOON_TEA_HEAL_RATIO)
      this.addStatus(actor, BATTLE_STATUS.ATTACK_UP, BATTLE_STATUS_DURATIONS.SHORT)
      this.log(`${actor.name} 悠闲地喝下午茶，回复 ${healed} HP。`)
      return true
    }
    if (skill.id === 'copy_party') {
      this.addStatus(actor, BATTLE_STATUS.ATTACK_UP, BATTLE_STATUS_DURATIONS.STANDARD)
      this.addStatus(actor, BATTLE_STATUS.DEFENSE_UP, BATTLE_STATUS_DURATIONS.STANDARD)
      this.log(`${actor.name} 复制了队伍的战意。`)
      return true
    }
    if (skill.id === 'shouxiangxin') {
      this.addStatus(actor, BATTLE_STATUS.SHIELD, BATTLE_STATUS_DURATIONS.STANDARD)
      this.addStatus(actor, BATTLE_STATUS.ATTACK_UP, BATTLE_STATUS_DURATIONS.STANDARD)
      this.log(`${actor.name} 凝聚守乡心。`)
      return true
    }
    if (skill.id === 'rendeqiyuan') {
      for (const target of targets) {
        this.healUnit(target, target.stats.maxHp * BATTLE_RULES.PARTY_PRAYER_HEAL_RATIO)
        this.addStatus(target, BATTLE_STATUS.ATTACK_UP, BATTLE_STATUS_DURATIONS.SHORT)
      }
      this.log(`${actor.name} 让众人的祈愿回应了战场。`)
      return true
    }
    return false
  }

  private calculateAndDealSkillDamage(actor: BattleUnit, target: BattleUnit, skill: SkillData): void {
    const isPlayer = actor.isPlayer
    const char = actor.data as CharacterData
    const enemy = actor.data as EnemyData

    let stat = 0
    if (skill.type === 'attack') {
      stat = isPlayer ? char.stats.atk : enemy.stats.atk
    } else {
      stat = isPlayer ? char.stats.matk : enemy.stats.matk
    }

    const isMagic = skill.type === 'magic'
    const def = target.isPlayer
      ? (isMagic ? (target.data as CharacterData).stats.mdef : (target.data as CharacterData).stats.def)
      : (isMagic ? (target.data as EnemyData).stats.mdef : (target.data as EnemyData).stats.def)

    let damage = Math.max(1, Math.floor((stat * skill.power / 10) - def * 0.5))

    // Buff modifiers
    damage = this.applyDamageModifiers(actor, target, damage, isMagic)

    // Difficulty scaling
    if (!isPlayer) {
      damage = Math.floor(damage * this.difficultyMult.dmg)
    } else {
      damage = Math.floor(damage * this.getPlayerDamageMultiplier())
    }

    // Element weakness
    let isWeakHit = false
    const targetElement = target.isPlayer ? 'none' : (target.data as EnemyData).element
    if (ELEMENT_WEAKNESS[targetElement]?.includes(skill.element)) {
      damage = Math.floor(damage * 1.5)
      isWeakHit = true
      this.log(`弱点打击！`)
    }

    damage = this.applyDamageVariance(damage)

    // TP generation for player
    if (actor.isPlayer) {
      this.addTp(actor, BATTLE_RULES.PLAYER_SKILL_TP_GAIN)
    }

    // Break gauge for enemies
    if (!target.isPlayer && !this.hasStatus(target, BATTLE_STATUS.BREAK)) {
      const breakGain = isWeakHit ? BATTLE_RULES.WEAK_SKILL_BREAK_GAIN : BATTLE_RULES.SKILL_BREAK_GAIN
      target.breakGauge = Math.min(target.breakMax, target.breakGauge + breakGain)
      this.updateUnitBars(target)
      if (target.breakGauge >= target.breakMax) {
        this.addStatus(target, BATTLE_STATUS.BREAK, undefined, false)
        this.log(`${target.name} 陷入破势状态！`)
        // Break lasts 2 turns
        this.addStatus(target, BATTLE_STATUS.BREAK_TURNS, BATTLE_STATUS_DURATIONS.SHORT, false)
      }
    }

    AudioManager.getInstance().playSFX(skill.type === 'magic' ? 'magic_cast' : 'attack_slash')
    this.log(`${actor.name} 使用 ${skill.name}，对 ${target.name} 造成 ${damage} 点伤害！`)
    const damageDealt = this.dealDamage(target, damage, actor, isMagic)
    if (skill.id === 'soul_drain' && damageDealt > 0 && actor.stats.hp > 0) {
      const healed = this.healUnit(actor, damageDealt * BATTLE_RULES.SOUL_DRAIN_HEAL_RATIO)
      this.log(`${actor.name} 吸取了 ${healed} HP！`)
    }
    if (target.stats.hp > 0) {
      this.applyConfiguredSkillStatuses(target, skill)
    }
  }

  private performHeal(actor: BattleUnit, target: BattleUnit, skill: SkillData): void {
    const isPlayer = actor.isPlayer
    const matk = isPlayer ? (actor.data as CharacterData).stats.matk : (actor.data as EnemyData).stats.matk
    const heal = Math.max(1, Math.floor(matk * skill.power / 10))
    const healed = skill.power > 0 ? this.healUnit(target, heal) : 0
    this.applyConfiguredSkillStatuses(target, skill)
    if (skill.id === 'qingxinling') {
      this.removeStatus(target, BATTLE_STATUS.CONFUSE)
      this.removeStatus(target, BATTLE_STATUS.CHARM)
      this.removeStatus(target, BATTLE_STATUS.FEAR)
    }
    this.log(healed > 0 ? `${actor.name} 使用 ${skill.name}，${target.name} 回复 ${healed} 点生命！` : `${actor.name} 使用 ${skill.name}，${target.name} 状态恢复！`)
  }

  private applyBuff(actor: BattleUnit, target: BattleUnit, skill: SkillData): void {
    if (!this.applyConfiguredSkillStatuses(target, skill)) this.addStatus(target, skill.id)
    this.log(`${actor.name} 使用 ${skill.name}！`)
  }

  private applyDebuff(actor: BattleUnit, target: BattleUnit, skill: SkillData): void {
    if (!this.applyConfiguredSkillStatuses(target, skill)) this.addStatus(target, skill.id)
    this.log(`${actor.name} 使用 ${skill.name}！`)
  }

  private dealDamage(target: BattleUnit, damage: number, source?: BattleUnit, isMagic = false, allowRetaliation = true): number {
    const beforeHp = target.stats.hp
    target.stats.hp = Math.max(0, target.stats.hp - damage)
    const damageTaken = beforeHp - target.stats.hp
    this.updateUnitBars(target)

    // Damage number popup
    const dmgText = this.add.text(target.sprite!.x, target.sprite!.y - scalePx(40), `-${damage}`, {
      fontSize: scaleFont(20),
      color: BATTLE_LAYOUT.DAMAGE_TEXT_COLOR,
      fontStyle: 'bold',
      stroke: BATTLE_LAYOUT.DAMAGE_TEXT_STROKE_COLOR,
      strokeThickness: scalePx(3),
    })
    dmgText.setOrigin(0.5)
    dmgText.setDepth(310)
    dmgText.setScrollFactor(0)
    this.tweens.add({
      targets: dmgText,
      y: target.sprite!.y - scalePx(80),
      alpha: 0,
      duration: Math.floor(800 / this.speedMult),
      onComplete: () => dmgText.destroy(),
    })

    this.tweens.add({
      targets: target.sprite,
      alpha: 0.3,
      duration: Math.floor(100 / this.speedMult),
      yoyo: true,
      repeat: 2,
    })

    // Flash red
    const flash = this.add.rectangle(target.sprite!.x, target.sprite!.y, scalePx(64), scalePx(64), BATTLE_LAYOUT.DAMAGE_FLASH_COLOR, BATTLE_LAYOUT.DAMAGE_FLASH_ALPHA)
    flash.setDepth(308)
    flash.setScrollFactor(0)
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: Math.floor(300 / this.speedMult),
      onComplete: () => flash.destroy(),
    })

    if (target.stats.hp <= 0) {
      const enemy = target.data as EnemyData
      if (enemy.id === 'fenghuang' && !this.hasStatus(target, BATTLE_STATUS.REBIRTH_USED)) {
        this.addStatus(target, BATTLE_STATUS.REBIRTH_USED, undefined, false)
        target.stats.hp = Math.floor(target.stats.maxHp * BATTLE_RULES.PHOENIX_REBIRTH_HP_RATIO)
        this.updateUnitBars(target)
        this.log(`${target.name} 涅槃重生！恢复了 ${target.stats.hp} 点生命！`)
        target.sprite!.setAlpha(1)
        return beforeHp
      }
      this.log(`${target.name} 倒下了！`)
      target.sprite!.setAlpha(0.5)
      return beforeHp
    }

    if (allowRetaliation) this.resolveRetaliation(target, source, damageTaken, isMagic)
    return damageTaken
  }

  private calculateTurnOrder(): void {
    const speeds = this.units.map((u, i) => ({ index: i, speed: this.getEffectiveSpeed(u) + Math.random() * BATTLE_RULES.TURN_ORDER_RANDOM_RANGE }))
    speeds.sort((a, b) => b.speed - a.speed)
    this.turnOrder = speeds.map(s => s.index)
  }

  private startTurn(): void {
    if (this.currentTurn === 0) this.turnCount++
    const unitIdx = this.turnOrder[this.currentTurn]!
    const unit = this.units[unitIdx]

    if (!unit || unit.stats.hp <= 0) {
      this.nextTurn()
      return
    }

    if (this.hasStatus(unit, BATTLE_STATUS.COMBO_ACTED)) {
      this.removeStatus(unit, BATTLE_STATUS.COMBO_ACTED)
      this.nextTurn()
      return
    }

    if (this.hasFestivalDefenseSucceeded()) {
      this.completeFestivalDefense('无名戒指发出白光，黑暗小妖被迫退开。')
      return
    }

    if (this.hasBaihuTrialSucceeded()) {
      this.completeBaihuTrial('白虎停下了攻击……它终于愿意听你们解释。')
      return
    }

    // Clear defend status
    this.removeStatus(unit, BATTLE_STATUS.DEFEND)

    // Status tick - poison damage
    if (this.hasStatus(unit, BATTLE_STATUS.POISON) && unit.stats.hp > 0) {
      const poisonDmg = Math.max(1, Math.floor(unit.stats.maxHp * BATTLE_RULES.POISON_DAMAGE_RATIO))
      unit.stats.hp = Math.max(1, unit.stats.hp - poisonDmg)
      this.updateUnitBars(unit)
      this.log(`${unit.name} 受到中毒伤害 ${poisonDmg} 点！`)
    }

    // Break state countdown and removal
    this.tickStatusDurations(unit)

    // Skip turn if dead after poison
    if (unit.stats.hp <= 0) {
      unit.sprite?.setAlpha(0.5)
      this.nextTurn()
      return
    }

    if (this.tryResolveControlStatus(unit)) return

    if (unit.isPlayer) {
      this.phase = 'player'
      this.log(`轮到 ${unit.name} 行动。`)
    } else {
      this.phase = 'enemy'
      this.time.delayedCall(Math.floor(800 / this.speedMult), () => this.enemyAI(unit))
    }
  }

  private enemyAI(unit: BattleUnit): void {
    const aiType = (unit.data as EnemyData).aiType
    switch (aiType) {
      case 'defensive': this.defensiveAI(unit); break
      case 'mage': this.mageAI(unit); break
      case 'boss_baihu': this.bossBaihuAI(unit); break
      case 'boss_shuiyao': this.bossShuiyaoAI(unit); break
      case 'boss_fengchi': this.bossFengchiAI(unit); break
      case 'boss_phoenix': this.bossPhoenixAI(unit); break
      case 'boss_qilin': this.bossQilinAI(unit); break
      case 'boss_chi': this.bossChiAI(unit); break
      case 'boss_mei': this.bossMeiAI(unit); break
      case 'boss_wang': this.bossWangAI(unit); break
      case 'boss_liang': this.bossLiangAI(unit); break
      case 'boss_fake_xiaoai': this.bossFakeXiaoaiAI(unit); break
      case 'boss_xiaoai_true': this.bossXiaoaiTrueAI(unit); break
      case 'boss_wuxiang': this.bossWuxiangAI(unit); break
      default: this.basicAI(unit); break
    }
  }

  private basicAI(unit: BattleUnit): void {
    const targets = this.getLivePlayers()
    if (targets.length === 0) return
    const target = this.pickRandomTarget(targets)!
    const enemy = unit.data as EnemyData
    if (enemy.skills.length > 1 && Math.random() < BATTLE_RULES.BASIC_AI_SKILL_CHANCE) {
      const skillId = enemy.skills[Math.floor(Math.random() * enemy.skills.length)]!
      if (skillId !== 'normal_attack') {
        this.performSkill(unit, target, skillId)
        this.nextTurn()
        return
      }
    }
    this.performAttack(unit, target)
    this.nextTurn()
  }

  private defensiveAI(unit: BattleUnit): void {
    const targets = this.getLivePlayers()
    if (targets.length === 0) return
    const target = this.pickRandomTarget(targets)!
    const roll = Math.random()
    if (roll < BATTLE_RULES.DEFENSIVE_AI_COUNTER_CHANCE && !this.hasStatus(unit, BATTLE_STATUS.COUNTER)) {
      this.performSkill(unit, unit, 'counter')
    } else if (roll < BATTLE_RULES.DEFENSIVE_AI_SHIELD_BASH_CHANCE) {
      this.performSkill(unit, target, 'shield_bash')
    } else {
      this.performAttack(unit, target)
    }
    this.nextTurn()
  }

  private mageAI(unit: BattleUnit): void {
    const targets = this.getLivePlayers()
    if (targets.length === 0) return
    const target = this.pickRandomTarget(targets)!
    const roll = Math.random()
    if (roll < BATTLE_RULES.MAGE_AI_MAGIC_ATTACK_CHANCE) {
      this.performSkill(unit, target, 'magic_attack')
    } else if (roll < BATTLE_RULES.MAGE_AI_SPECIAL_SKILL_CHANCE) {
      const skillId = (unit.data as EnemyData).skills.find(s => s !== 'magic_attack' && s !== 'normal_attack') || 'magic_attack'
      this.performSkill(unit, target, skillId)
    } else {
      this.performAttack(unit, target)
    }
    this.nextTurn()
  }

  private bossBaihuAI(unit: BattleUnit): void {
    const targets = this.getLivePlayers()
    if (targets.length === 0) return

    const target = this.pickRandomTarget(targets)!
    const hpRatio = unit.stats.hp / unit.stats.maxHp
    const roll = Math.random()
    if (hpRatio < BATTLE_RULES.BAIHU_LOW_HP_RATIO && roll < BATTLE_RULES.BAIHU_HEAVENLY_STRIKE_CHANCE) {
      this.performSkill(unit, target, 'heavenly_strike')
    } else if (!this.hasStatus(unit, BATTLE_STATUS.ROAR) && roll < BATTLE_RULES.BAIHU_ROAR_CHANCE) {
      this.performSkill(unit, unit, 'roar')
    } else {
      this.performSkill(unit, target, 'tiger_claw')
    }
    this.nextTurn()
  }

  private bossShuiyaoAI(unit: BattleUnit): void {
    const targets = this.getLivePlayers()
    if (targets.length === 0) return
    const allies = this.units.filter(u => !u.isPlayer && u.stats.hp > 0)
    const woundedAlly = allies.find(u => u.stats.hp / u.stats.maxHp < BATTLE_RULES.SHUIYAO_WOUNDED_ALLY_HP_RATIO)
    const roll = Math.random()
    if (woundedAlly && roll < BATTLE_RULES.SHUIYAO_HEAL_CHANCE) {
      this.performSkill(unit, woundedAlly, 'heal')
    } else if (roll < BATTLE_RULES.SHUIYAO_WATER_CURTAIN_CHANCE && !this.hasStatus(unit, BATTLE_STATUS.WATER_CURTAIN)) {
      this.performSkill(unit, unit, 'water_curtain')
    } else {
      const target = this.pickRandomTarget(targets)!
      this.performSkill(unit, target, 'ice_shard')
    }
    this.nextTurn()
  }

  private bossFengchiAI(unit: BattleUnit): void {
    const targets = this.getLivePlayers()
    if (targets.length === 0) return
    const roll = Math.random()
    if (!this.hasStatus(unit, BATTLE_STATUS.WIND_WALL) && roll < BATTLE_RULES.FENGCHI_WIND_WALL_CHANCE) {
      this.performSkill(unit, unit, 'wind_wall')
    } else if (roll < BATTLE_RULES.FENGCHI_GALE_SLASH_CHANCE) {
      const target = this.pickRandomTarget(targets)!
      this.performSkill(unit, target, 'gale_slash')
    } else {
      this.performSkill(unit, targets[0]!, 'feather_storm')
    }
    this.nextTurn()
  }

  private bossPhoenixAI(unit: BattleUnit): void {
    const targets = this.getLivePlayers()
    if (targets.length === 0) return
    const roll = Math.random()
    if (roll < BATTLE_RULES.PHOENIX_FIRE_BREATH_CHANCE) {
      this.performSkill(unit, targets[0]!, 'fire_breath')
    } else if (roll < BATTLE_RULES.PHOENIX_WIND_PRESSURE_CHANCE) {
      const target = this.pickRandomTarget(targets)!
      this.performSkill(unit, target, 'wind_pressure')
    } else {
      const target = this.pickRandomTarget(targets)!
      this.performAttack(unit, target)
    }
    this.nextTurn()
  }

  private bossQilinAI(unit: BattleUnit): void {
    const targets = this.getLivePlayers()
    if (targets.length === 0) return
    const roll = Math.random()
    if (!this.hasStatus(unit, BATTLE_STATUS.ARMOR_UP) && roll < BATTLE_RULES.QILIN_ARMOR_UP_CHANCE) {
      this.performSkill(unit, unit, 'armor_up')
    } else if (roll < BATTLE_RULES.QILIN_EARTHQUAKE_CHANCE) {
      this.performSkill(unit, targets[0]!, 'earthquake')
    } else {
      const target = this.pickRandomTarget(targets)!
      this.performSkill(unit, target, 'flame_charge')
    }
    this.nextTurn()
  }

  private bossChiAI(unit: BattleUnit): void {
    const targets = this.getLivePlayers()
    if (targets.length === 0) return
    const roll = Math.random()
    if (roll < BATTLE_RULES.CHI_POISON_MIST_CHANCE) {
      this.performSkill(unit, targets[0]!, 'poison_mist')
    } else if (roll < BATTLE_RULES.CHI_VENOM_FANG_CHANCE) {
      const target = this.pickRandomTarget(targets)!
      this.performSkill(unit, target, 'venom_fang')
    } else {
      this.performSkill(unit, targets[0]!, 'toxic_burst')
    }
    this.nextTurn()
  }

  private bossMeiAI(unit: BattleUnit): void {
    const targets = this.getLivePlayers()
    if (targets.length === 0) return
    const roll = Math.random()
    if (roll < BATTLE_RULES.MEI_CHARM_CHANCE) {
      const target = this.pickRandomTarget(targets)!
      this.performSkill(unit, target, 'charm')
    } else if (roll < BATTLE_RULES.MEI_ILLUSION_STRIKE_CHANCE) {
      const target = this.pickRandomTarget(targets)!
      this.performSkill(unit, target, 'illusion_strike')
    } else {
      this.performSkill(unit, targets[0]!, 'shadow_dance')
    }
    this.nextTurn()
  }

  private bossWangAI(unit: BattleUnit): void {
    const targets = this.getLivePlayers()
    if (targets.length === 0) return
    const roll = Math.random()
    if (roll < BATTLE_RULES.WANG_WIND_POISON_CHANCE) {
      this.performSkill(unit, targets[0]!, 'wind_poison')
    } else if (roll < BATTLE_RULES.WANG_FEATHER_DART_CHANCE) {
      const target = this.pickRandomTarget(targets)!
      this.performSkill(unit, target, 'feather_dart')
    } else {
      const target = this.pickRandomTarget(targets)!
      this.performSkill(unit, target, 'aerial_dive')
    }
    this.nextTurn()
  }

  private bossLiangAI(unit: BattleUnit): void {
    const targets = this.getLivePlayers()
    if (targets.length === 0) return
    const hpRatio = unit.stats.hp / unit.stats.maxHp
    const roll = Math.random()
    if (hpRatio < BATTLE_RULES.LIANG_LOW_HP_RATIO && roll < BATTLE_RULES.LIANG_FLAME_STOMP_CHANCE) {
      this.performSkill(unit, targets[0]!, 'flame_stomp')
    } else if (roll < BATTLE_RULES.LIANG_ROCK_SMASH_CHANCE) {
      const target = this.pickRandomTarget(targets)!
      this.performSkill(unit, target, 'rock_smash')
    } else {
      const target = this.pickRandomTarget(targets)!
      this.performSkill(unit, target, 'armor_pierce')
    }
    this.nextTurn()
  }

  private bossFakeXiaoaiAI(unit: BattleUnit): void {
    const targets = this.getLivePlayers()
    if (targets.length === 0) return
    const roll = Math.random()
    if (roll < BATTLE_RULES.FAKE_XIAOAI_DARK_MIRROR_CHANCE && !this.hasStatus(unit, BATTLE_STATUS.DARK_MIRROR)) {
      this.performSkill(unit, unit, 'dark_mirror')
    } else if (roll < BATTLE_RULES.FAKE_XIAOAI_SHADOW_BLADE_CHANCE) {
      const target = this.pickRandomTarget(targets)!
      this.performSkill(unit, target, 'shadow_blade')
    } else {
      this.performSkill(unit, unit, 'afternoon_tea')
    }
    this.nextTurn()
  }

  private bossXiaoaiTrueAI(unit: BattleUnit): void {
    const targets = this.getLivePlayers()
    if (targets.length === 0) return
    const hpRatio = unit.stats.hp / unit.stats.maxHp
    const roll = Math.random()
    if (hpRatio < BATTLE_RULES.XIAOAI_TRUE_LOW_HP_RATIO && roll < BATTLE_RULES.XIAOAI_TRUE_FALLEN_ANGEL_CHANCE) {
      this.performSkill(unit, targets[0]!, 'fallen_angel')
    } else if (roll < BATTLE_RULES.XIAOAI_TRUE_DARK_PURGE_CHANCE) {
      this.performSkill(unit, targets[0]!, 'dark_purge')
    } else if (roll < BATTLE_RULES.XIAOAI_TRUE_SOUL_DRAIN_CHANCE) {
      const target = this.pickRandomTarget(targets)!
      this.performSkill(unit, target, 'soul_drain')
    } else {
      const target = this.pickRandomTarget(targets)!
      this.performSkill(unit, target, 'wind_moon_slash')
    }
    this.nextTurn()
  }

  private bossWuxiangAI(unit: BattleUnit): void {
    const targets = this.getLivePlayers()
    if (targets.length === 0) return
    const hpRatio = unit.stats.hp / unit.stats.maxHp
    const roll = Math.random()
    if (hpRatio < BATTLE_RULES.WUXIANG_LOW_HP_RATIO && roll < BATTLE_RULES.WUXIANG_DARK_NOVA_CHANCE) {
      this.performSkill(unit, targets[0]!, 'dark_nova')
    } else if (roll < BATTLE_RULES.WUXIANG_COPY_PARTY_CHANCE) {
      this.performSkill(unit, unit, 'copy_party')
    } else if (roll < BATTLE_RULES.WUXIANG_DEVOUR_PROPHECY_CHANCE) {
      this.performSkill(unit, targets[0]!, 'devour_prophecy')
    } else if (roll < BATTLE_RULES.WUXIANG_HEART_VOID_CHANCE) {
      this.performSkill(unit, targets[0]!, 'heart_void')
    } else {
      const target = this.pickRandomTarget(targets)!
      this.performAttack(unit, target)
    }
    this.nextTurn()
  }

  private nextTurn(): void {
    // Check victory / defeat
    const livePlayers = this.getLivePlayers()
    const liveEnemies = this.getLiveEnemies()

    if (this.hasFestivalDefenseSucceeded()) {
      this.completeFestivalDefense('无名戒指发出白光，黑暗小妖被迫退开。')
      return
    }

    if (this.hasBaihuTrialSucceeded(liveEnemies)) {
      this.completeBaihuTrial('白虎停下了攻击……它终于愿意听你们解释。')
      return
    }
    if (liveEnemies.length === 0) {
      this.phase = 'victory'
      this.log('战斗胜利！')
      this.time.delayedCall(Math.floor(1500 / this.speedMult), () => this.endBattle(true))
      return
    }
    if (livePlayers.length === 0) {
      if (this.isFestivalDefenseEncounter()) {
        this.recoverPlayersAfterFestivalDefenseLoss()
        this.completeFestivalDefense('T 倒下前，无名戒指的光挡住了黑暗。')
        return
      }
      if (this.isBaihuTrialEncounter()) {
        this.recoverPlayersAfterBaihuTrialLoss()
        this.completeBaihuTrial('白虎击倒了队伍，但戒指的光让它停手。')
        return
      }
      this.phase = 'defeat'
      this.log('全队倒下……')
      this.time.delayedCall(Math.floor(1500 / this.speedMult), () => this.endBattle(false))
      return
    }

    // Dual boss synergy: shui_yao + feng_chi rage when partner falls
    if (this.encounterId === BATTLE_SPECIAL_ENCOUNTERS.SHUIYAO_FENGCHI_DUO && liveEnemies.length === 1) {
      const survivor = liveEnemies[0]!
      if (!this.hasStatus(survivor, BATTLE_STATUS.ENRAGED)) {
        this.addStatus(survivor, BATTLE_STATUS.ENRAGED, undefined, false)
        survivor.stats.speed = Math.floor(survivor.stats.speed * BATTLE_RULES.DUAL_BOSS_ENRAGE_SPEED_MULTIPLIER)
        this.log(`${survivor.name} 因搭档倒下而狂暴！速度大幅提升！`)
      }
    }

    // Mid-battle dialogue triggers
    this.checkMidBattleDialogue(liveEnemies)

    this.currentTurn++
    if (this.currentTurn >= this.turnOrder.length) {
      this.currentTurn = 0
      this.calculateTurnOrder()
    }
    this.startTurn()
  }

  private checkMidBattleDialogue(liveEnemies: BattleUnit[]): void {
    const gd = GameData.getInstance()
    const midBattleMap: Record<string, { hpThreshold: number; flag: string; dialogueId: string }[]> = {
      baihu: [{ hpThreshold: 0.5, flag: 'mid_baihu_50', dialogueId: 'DIA_102_TIGER' }],
      xiaoai_true: [{ hpThreshold: 0.3, flag: 'mid_xiaoai_true_30', dialogueId: 'DIA_503_FAKE_XIAOAI' }],
      wuxiang: [
        { hpThreshold: 0.7, flag: 'mid_wuxiang_70', dialogueId: 'DIA_601_WUXIANG' },
        { hpThreshold: 0.3, flag: 'mid_wuxiang_30', dialogueId: 'DIA_601_WUXIANG' },
      ],
    }
    for (const enemy of liveEnemies) {
      const ed = enemy.data as EnemyData
      const triggers = midBattleMap[ed.id]
      if (!triggers) continue
      const hpRatio = enemy.stats.hp / enemy.stats.maxHp
      for (const t of triggers) {
        if (hpRatio <= t.hpThreshold && gd.getFlag(t.flag) !== true) {
          gd.setFlag(t.flag, true)
          this.log(ed.name + '似乎有什么话要说……')
          return
        }
      }
    }
  }

  private getCurrentUnit(): BattleUnit | null {
    const idx = this.turnOrder[this.currentTurn]!
    return this.units[idx] || null
  }

  private endBattle(victory: boolean, escaped = false): void {
    if (this.phase === 'result') return
    this.syncPlayerState()
    const summary = victory ? this.applyVictoryResult() : this.createNonVictoryResult(escaped)
    this.showBattleResult(summary)
  }

  private applyVictoryResult(): BattleResultSummary {
    AudioManager.getInstance().playVictoryBGM()
    const gd = GameData.getInstance()
    const levelUps: string[] = []
    const rewardLines: string[] = []
    const dropLines: string[] = []

    const rewardResult = applyEncounterVictoryRewards({
      encounterId: this.encounterId,
      enemies: this.enemyData,
      expMultiplier: this.difficultyMult.exp,
      mapEventId: this.mapEventId,
      defeatedAtMs: Date.now(),
      rollDrop: rate => Math.random() < rate,
    })

    levelUps.push(...rewardResult.levelUps.map(result => `${result.name} Lv.${result.level}`))

    if (rewardResult.victoryFlag) {
      rewardLines.push('关键战斗标记已更新')
    }

    if (rewardResult.questProgress === 'completed') {
      rewardLines.push('任务已完成')
    } else if (rewardResult.questProgress === 'advanced') {
      rewardLines.push('任务已推进')
    }

    for (const reward of rewardResult.itemRewards) {
      rewardLines.push(`${this.getItemName(reward.itemId)} x${reward.quantity}`)
    }
    rewardLines.push(...rewardResult.flagRewards.map(() => '剧情进度已更新'))
    rewardLines.push(...rewardResult.branchRewards.map(() => '分支状态已更新'))
    for (const drop of rewardResult.dropRewards) {
      dropLines.push(`${this.getItemName(drop.itemId)} x${drop.quantity}`)
    }

    const lines = [`EXP +${rewardResult.totalExp}`, `金币 +${rewardResult.totalGold}`]
    if (dropLines.length > 0) lines.push(`掉落：${dropLines.join('、')}`)
    if (levelUps.length > 0) lines.push(`升级：${levelUps.join('、')}`)
    if (rewardResult.unlockedSkills.size > 0) {
      const skillNames = GAME_CONFIG_DATABASE.getTable('skills')
      const unlockLines = Array.from(rewardResult.unlockedSkills.entries()).map(([charId, skillIds]) => {
        const charName = gd.characters.get(charId)?.name ?? charId
        return `${charName}: ${skillIds.map(skillId => skillNames[skillId]?.name ?? skillId).join('、')}`
      })
      lines.push(`习得：${unlockLines.join('；')}`)
    }
    if (rewardLines.length > 0) lines.push(...rewardLines)
    return { victory: true, escaped: false, title: '战斗结算', lines }
  }

  private createNonVictoryResult(escaped: boolean): BattleResultSummary {
    if (escaped) {
      return { victory: false, escaped: true, title: '撤退成功', lines: ['没有获得经验、金币或掉落。'] }
    }
    AudioManager.getInstance().playGameOverBGM()
    return { victory: false, escaped: false, title: '队伍全灭', lines: ['全队倒下，冒险暂时中断。'] }
  }

  private showBattleResult(summary: BattleResultSummary): void {
    this.phase = 'result'
    this.resultSummary = summary
    this.inTargetSelect = false
    this.setCommandMenuVisible(false)
    this.hideTargetIndicator()
    this.log(summary.title)

    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.black, BATTLE_RESULT_PANEL.overlayAlpha)
    const panel = this.addRuntimePanel(BATTLE_RESULT_PANEL.x, BATTLE_RESULT_PANEL.y, BATTLE_RESULT_PANEL.width, BATTLE_RESULT_PANEL.height, RUNTIME_UI_ASSET_KEYS.MENU_PANEL, BATTLE_LAYOUT.COMMAND_PANEL_COLOR, BATTLE_LAYOUT.COMMAND_PANEL_ALPHA, 0)
    const panelBorder = this.add.rectangle(BATTLE_RESULT_PANEL.x, BATTLE_RESULT_PANEL.y, BATTLE_RESULT_PANEL.width, BATTLE_RESULT_PANEL.height, COLORS.black, 0)
    panelBorder.setStrokeStyle(BATTLE_RESULT_PANEL.borderWidth, summary.victory ? BATTLE_RESULT_PANEL.victoryBorderColor : BATTLE_RESULT_PANEL.defeatBorderColor)
    const title = this.add.text(BATTLE_RESULT_PANEL.titleX, BATTLE_RESULT_PANEL.y + BATTLE_RESULT_PANEL.titleOffsetY, summary.title, {
      fontSize: scaleFont(BATTLE_RESULT_PANEL.titleFontSize),
      color: MENU_OVERLAY_UI.COLORS.title,
      fontFamily: UI_TITLE_FONT_FAMILY,
    }).setOrigin(0.5)
    const objects: Phaser.GameObjects.GameObject[] = [overlay, panel, panelBorder, title]
    const hiddenLineCount = Math.max(0, summary.lines.length - BATTLE_RESULT_PANEL.maxLines + 1)
    const visibleLines = hiddenLineCount > 0
      ? [...summary.lines.slice(0, BATTLE_RESULT_PANEL.maxLines - 1), `另有 ${hiddenLineCount} 条结算记录`]
      : summary.lines.slice(0, BATTLE_RESULT_PANEL.maxLines)
    const summaryText = this.add.text(BATTLE_RESULT_PANEL.contentX, BATTLE_RESULT_PANEL.y + BATTLE_RESULT_PANEL.lineStartOffsetY, visibleLines.join('\n'), {
      fontSize: scaleFont(BATTLE_RESULT_PANEL.lineFontSize),
      color: MENU_OVERLAY_UI.COLORS.text,
      wordWrap: { width: BATTLE_RESULT_PANEL.contentWrapWidth },
      lineSpacing: BATTLE_RESULT_PANEL.lineSpacing,
    })
    objects.push(summaryText)
    const confirmLabel = summary.victory || summary.escaped ? '继续' : 'GAME OVER'
    const confirm = this.add.text(BATTLE_RESULT_PANEL.confirmX, BATTLE_RESULT_PANEL.y + BATTLE_RESULT_PANEL.confirmOffsetY, confirmLabel, {
      fontSize: scaleFont(BATTLE_RESULT_PANEL.confirmFontSize),
      color: BATTLE_RESULT_PANEL.confirmTextColor,
      backgroundColor: BATTLE_RESULT_PANEL.confirmBackgroundColor,
      padding: { x: BATTLE_RESULT_PANEL.confirmPaddingX, y: BATTLE_RESULT_PANEL.confirmPaddingY },
    }).setOrigin(0.5)
    bindTouchText(confirm, () => this.finishBattleResult())
    objects.push(confirm)
    this.resultPanel = this.add.container(0, 0, objects)
    this.resultPanel.setDepth(500)
    this.resultPanel.setScrollFactor(0)
  }

  private finishBattleResult(): void {
    if (!this.resultSummary) return
    const summary = this.resultSummary
    this.resultPanel?.destroy()
    this.resultPanel = null
    this.resultSummary = null
    this.scene.stop()
    EventBus.emit(GameEvents.BATTLE_END, summary.victory, { escaped: summary.escaped })
  }

  private getItemName(itemId: string): string {
    return GAME_CONFIG_DATABASE.getTable('items')[itemId]?.name ?? this.getItemData(itemId)?.name ?? itemId
  }

  private syncPlayerState(): void {
    for (const unit of this.units) {
      if (!unit.isPlayer) continue
      const char = unit.data as CharacterData
      char.stats.hp = unit.stats.hp
      char.stats.mp = unit.stats.mp
      char.tp = unit.tp
    }
  }

  private log(msg: string): void {
    this.logText.setText(msg)
  }
}
