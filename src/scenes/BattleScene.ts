import Phaser from 'phaser'
import { EventBus, GameEvents } from '../core/EventBus'
import { GameData } from '../core/GameData'
import { QuestSystem } from '../core/QuestSystem'
import { AudioManager } from '../core/AudioManager'
import { BarrelSystem } from '../core/BarrelSystem'
import type { BarrelColor } from '../core/BarrelSystem'
import { ENEMIES } from '../data/enemies'
import { ENCOUNTERS } from '../data/encounters'
import { ITEMS } from '../data/items'
import { SKILLS } from '../data/skills'
import {
  BATTLE_RESULT_PANEL,
  BATTLE_TARGET_INDICATOR,
  CHARACTER_SPRITE_BASE_KEYS,
  COMBO_TP_COST,
  DEFAULT_CHARACTER_SPRITE_KEY,
  DEFAULT_ENEMY_SPRITE_KEY,
  ELEMENT_WEAKNESS,
  GAME_HEIGHT,
  GAME_WIDTH,
} from '../utils/constants'
import type { CharacterData, EnemyData, SkillData } from '../data/types'

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
  { skillId: 'fengyuezhixi', char1: 'T', char2: 'xiaoai', flag: 'xiaoai_purified' },
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
  private mapEventId = ''
  private turnCount = 0
  private resultSummary: BattleResultSummary | null = null
  private resultPanel: Phaser.GameObjects.Container | null = null

  constructor() {
    super({ key: 'BattleScene', active: false })
  }

  create(data: { encounterId: string; mapEventId?: string }): void {
    this.units = []
    this.turnOrder = []
    this.currentTurn = 0
    this.phase = 'intro'
    this.menuIndex = 0
    this.targetIndex = 0
    this.inTargetSelect = false
    this.targetPlayers = false
    this.targetIndicator = null
    this.actionStack = []
    this.encounterId = data.encounterId
    this.mapEventId = data.mapEventId || ''
    this.turnCount = 0
    this.resultSummary = null
    this.resultPanel = null

    // Apply settings
    const gd = GameData.getInstance()
    const diff = gd.settings.difficulty as string
    if (diff === 'story') {
      this.difficultyMult = { hp: 0.7, dmg: 0.85, exp: 1.2 }
    } else if (diff === 'hard') {
      this.difficultyMult = { hp: 1.25, dmg: 1.2, exp: 1.0 }
    } else {
      this.difficultyMult = { hp: 1.0, dmg: 1.0, exp: 1.0 }
    }
    const bspd = gd.settings.battleSpeed as string
    if (bspd === 'fast') this.speedMult = 1.5
    else if (bspd === 'fastest') this.speedMult = 2.0
    else this.speedMult = 1.0

    AudioManager.getInstance().setScene(this)

    // Background image
    const bgImg = this.add.image(480, 270, 'ui_battle_bg_field')
    bgImg.setDisplaySize(960, 540)
    bgImg.setDepth(299)
    bgImg.setScrollFactor(0)

    // Background overlay
    this.bg = this.add.rectangle(480, 270, 960, 540, 0x1a1a2e, 0.3)
    this.bg.setDepth(300)
    this.bg.setScrollFactor(0)

    // Ground
    const ground = this.add.rectangle(480, 380, 960, 200, 0x2d4a22, 0.5)
    ground.setDepth(301)
    ground.setScrollFactor(0)

    this.setupEncounter(data.encounterId)

    // Determine if boss battle
    const isBoss = this.enemyData.some(e => e.isBoss)
    AudioManager.getInstance().playBattleBGM(isBoss)

    this.createUI()
    this.setupInput()

    // Calculate turn order
    this.calculateTurnOrder()

    // Battle intro transition
    const flashColor = isBoss ? 0xff0000 : 0xffffff
    const introFlash = this.add.rectangle(480, 270, 960, 540, flashColor, 1)
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
        unit.sprite.x = targetX + 200
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
    const party = gd.party

    // Spawn player units
    for (let i = 0; i < party.length; i++) {
      const char = gd.characters.get(party[i]!)
      if (!char) continue
      const x = 120 + i * 100
      const y = 320
      const baseKey = this.getCharacterSpriteBase(char.id)
      const textureKey = this.resolveTextureKey(`${baseKey}_front_idle_01`, DEFAULT_CHARACTER_SPRITE_KEY) ?? DEFAULT_CHARACTER_SPRITE_KEY
      const sprite = this.add.sprite(x, y, textureKey)
      sprite.setDisplaySize(64, 64)
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
      this.units.push(unit)
      this.createUnitUI(unit, x, y - 55)
    }

    // Spawn enemies (demo: use encounterId to pick enemies)
    const enemyIds = this.getEnemiesForEncounter(encounterId)
    for (let i = 0; i < enemyIds.length; i++) {
      const ed = ENEMIES[enemyIds[i]!]
      if (!ed) continue
      const x = 700 + i * 100
      const y = 280 + (i % 2) * 80
      const textureKey = this.resolveTextureKey(`mon_${ed.id}_01`, DEFAULT_ENEMY_SPRITE_KEY) ?? DEFAULT_ENEMY_SPRITE_KEY
      const sprite = this.add.sprite(x, y, textureKey)
      sprite.setDisplaySize(64, 64)
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
      this.units.push(unit)
      this.enemyData.push(ed)
      this.createUnitUI(unit, x, y - 55)
    }
  }

  private getEnemiesForEncounter(encounterId: string): string[] {
    const encounter = ENCOUNTERS[encounterId]
    if (!encounter) {
      console.warn(`Encounter ${encounterId} not found`)
      return ['xiao_yao']
    }
    return encounter.enemies
  }

  private getCharacterSpriteBase(characterId: string): string {
    return CHARACTER_SPRITE_BASE_KEYS[characterId] ?? characterId.toLowerCase()
  }

  private resolveTextureKey(primaryKey: string, fallbackKey: string): string | null {
    if (this.textures.exists(primaryKey)) return primaryKey
    if (this.textures.exists(fallbackKey)) return fallbackKey
    return null
  }

  private createUnitUI(unit: BattleUnit, x: number, y: number): void {
    const barWidth = 70
    const barHeight = 5
    const isPlayer = unit.isPlayer
    const barColors = isPlayer
      ? { hp: 0xe74c3c, mp: 0x3498db, tp: 0xf1c40f }
      : { hp: 0xe74c3c, mp: 0x3498db, tp: 0xf1c40f }

    // Name
    const nameText = this.add.text(x, y - 16, unit.name, {
      fontSize: '12px',
      color: '#ffffff',
    })
    nameText.setOrigin(0.5)
    nameText.setDepth(307)
    nameText.setScrollFactor(0)

    let cy = y

    // HP bar
    this.add.rectangle(x, cy, barWidth, barHeight, 0x000000).setDepth(306).setScrollFactor(0)
    const hpBar = this.add.rectangle(x - barWidth / 2 + 1, cy, barWidth - 2, barHeight - 2, barColors.hp)
    hpBar.setOrigin(0, 0.5)
    hpBar.setDepth(307)
    hpBar.setScrollFactor(0)
    unit.hpBar = hpBar
    cy += barHeight + 1

    if (isPlayer) {
      // MP bar
      this.add.rectangle(x, cy, barWidth, barHeight, 0x000000).setDepth(306).setScrollFactor(0)
      const mpBar = this.add.rectangle(x - barWidth / 2 + 1, cy, barWidth - 2, barHeight - 2, barColors.mp)
      mpBar.setOrigin(0, 0.5)
      mpBar.setDepth(307)
      mpBar.setScrollFactor(0)
      unit.mpBar = mpBar
      cy += barHeight + 1

      // TP bar
      this.add.rectangle(x, cy, barWidth, barHeight, 0x000000).setDepth(306).setScrollFactor(0)
      const tpBar = this.add.rectangle(x - barWidth / 2 + 1, cy, barWidth - 2, barHeight - 2, barColors.tp)
      tpBar.setOrigin(0, 0.5)
      tpBar.setDepth(307)
      tpBar.setScrollFactor(0)
      unit.tpBar = tpBar
      cy += barHeight + 1
    } else {
      // Break gauge for enemies
      this.add.rectangle(x, cy, barWidth, barHeight, 0x000000).setDepth(306).setScrollFactor(0)
      const breakBar = this.add.rectangle(x - barWidth / 2 + 1, cy, barWidth - 2, barHeight - 2, 0x9b59b6)
      breakBar.setOrigin(0, 0.5)
      breakBar.setDepth(307)
      breakBar.setScrollFactor(0)
      unit.tpBar = breakBar
    }
  }

  private updateUnitBars(unit: BattleUnit): void {
    if (unit.hpBar) {
      const ratio = Math.max(0.01, unit.stats.hp / unit.stats.maxHp)
      unit.hpBar.setScale(ratio, 1)
    }
    if (unit.mpBar) {
      const ratio = Math.max(0.01, unit.stats.mp / unit.stats.maxMp)
      unit.mpBar.setScale(ratio, 1)
    }
    if (unit.tpBar) {
      if (unit.isPlayer) {
        const ratio = Math.max(0.01, unit.tp / 100)
        unit.tpBar.setScale(ratio, 1)
      } else {
        const ratio = Math.max(0.01, unit.breakGauge / unit.breakMax)
        unit.tpBar.setScale(ratio, 1)
      }
    }
  }

  private createUI(): void {
    // Command menu background
    const menuBg = this.add.rectangle(800, 472, 280, 144, 0x2a2a3e, 0.95)
    menuBg.setStrokeStyle(2, 0x5a5a7e)
    menuBg.setDepth(310)
    menuBg.setScrollFactor(0)

    // Menu items
    const commands = ['攻击', '技能', '连携', '防御', '道具', '木桶', '逃跑']
    for (let i = 0; i < commands.length; i++) {
      const text = this.add.text(680, 410 + i * 24, commands[i]!, {
        fontSize: '18px',
        color: '#c0c0d0',
      })
      text.setDepth(311)
      text.setScrollFactor(0)
      this.menuItems.push(text)
    }

    this.cursor = this.add.rectangle(670, 410 + 6, 8, 8, 0xf1c40f)
    this.cursor.setDepth(312)
    this.cursor.setScrollFactor(0)

    // Battle log
    this.logText = this.add.text(20, 20, '', {
      fontSize: '14px',
      color: '#cccccc',
      backgroundColor: '#00000060',
      padding: { x: 8, y: 4 },
      wordWrap: { width: 400 },
    })
    this.logText.setDepth(310)
    this.logText.setScrollFactor(0)
  }

  private setupInput(): void {
    this.input.keyboard?.on('keydown-UP', () => {
      if (this.inSkillMenu) this.moveSkillMenu(-1)
      else if (this.inItemMenu) this.moveItemMenu(-1)
      else if (this.inBarrelMenu) this.moveBarrelMenu(-1)
      else if (this.inComboMenu) this.moveComboMenu(-1)
      else this.moveMenu(-1)
    })
    this.input.keyboard?.on('keydown-DOWN', () => {
      if (this.inSkillMenu) this.moveSkillMenu(1)
      else if (this.inItemMenu) this.moveItemMenu(1)
      else if (this.inBarrelMenu) this.moveBarrelMenu(1)
      else if (this.inComboMenu) this.moveComboMenu(1)
      else this.moveMenu(1)
    })
    this.input.keyboard?.on('keydown-ENTER', () => {
      if (this.phase === 'result') { this.finishBattleResult(); return }
      if (this.inSkillMenu) this.selectSkill()
      else if (this.inItemMenu) this.selectItem()
      else if (this.inBarrelMenu) this.selectBarrel()
      else if (this.inComboMenu) this.selectCombo()
      else this.selectMenu()
    })
    this.input.keyboard?.on('keydown-SPACE', () => {
      if (this.phase === 'result') { this.finishBattleResult(); return }
      if (this.inSkillMenu) this.selectSkill()
      else if (this.inItemMenu) this.selectItem()
      else if (this.inBarrelMenu) this.selectBarrel()
      else if (this.inComboMenu) this.selectCombo()
      else this.selectMenu()
    })
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.inSkillMenu) { this.closeSkillMenu(); return }
      if (this.inItemMenu) { this.closeItemMenu(); return }
      if (this.inBarrelMenu) { this.closeBarrelMenu(); return }
      if (this.inComboMenu) { this.closeComboMenu(); return }
      this.cancelTarget()
    })
    this.input.keyboard?.on('keydown-LEFT', () => this.moveTarget(-1))
    this.input.keyboard?.on('keydown-RIGHT', () => this.moveTarget(1))
  }

  private moveMenu(dir: number): void {
    if (this.inTargetSelect || this.phase !== 'player') return
    this.menuIndex = (this.menuIndex + dir + this.menuItems.length) % this.menuItems.length
    this.cursor.setY(this.menuItems[this.menuIndex]!.y + 6)
    AudioManager.getInstance().playSFX('cursor')
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
      if (this.actionStack[0] === 'item' && this.actionStack[1] === 'revive_feather') {
        return this.units.filter(u => u.isPlayer)
      }
      return this.units.filter(u => u.isPlayer && u.stats.hp > 0)
    }
    return this.units.filter(u => !u.isPlayer && u.stats.hp > 0)
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
    this.targetPlayers = targetPlayers
    const targets = this.getSelectableTargets()
    if (targets.length === 0) {
      this.inTargetSelect = false
      this.hideTargetIndicator()
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

  private cancelTarget(): void {
    if (this.inTargetSelect) {
      this.inTargetSelect = false
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
      this.hideTargetIndicator()
      return
    }

    if (action === 'attack') {
      this.performAttack(actor, target)
    } else if (action === 'skill') {
      const skillId = this.actionStack[1]!
      this.performSkill(actor, target, skillId)
    } else if (action === 'item') {
      const itemId = this.actionStack[1]!
      this.performItem(actor, target, itemId)
    }

    this.inTargetSelect = false
    this.hideTargetIndicator()
    this.nextTurn()
  }

  private executeDefend(): void {
    const actor = this.getCurrentUnit()
    if (!actor) return
    this.log(`${actor.name} 采取防御姿态。`)
    actor.status.push('defend')
    // TP recovery on defend
    if (actor.tp < 100) {
      actor.tp = Math.min(100, actor.tp + 15)
      this.updateUnitBars(actor)
    }
    this.nextTurn()
  }

  private skillMenuItems: Phaser.GameObjects.Text[] = []
  private skillMenuCursor!: Phaser.GameObjects.Rectangle
  private skillMenuIndex = 0
  private inSkillMenu = false
  private skillMenuBg!: Phaser.GameObjects.Rectangle

  private showSkills(): void {
    const actor = this.getCurrentUnit()
    if (!actor || !actor.isPlayer) return
    const char = actor.data as CharacterData
    const skills = char.skills.filter(s => {
      const sk = SKILLS[s]
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
    this.skillMenuBg = this.add.rectangle(560, 440, 280, 140, 0x1a1a2e, 0.95)
    this.skillMenuBg.setStrokeStyle(2, 0x5a5a7e)
    this.skillMenuBg.setDepth(320)
    this.skillMenuBg.setScrollFactor(0)

    for (let i = 0; i < skills.length; i++) {
      const sk = SKILLS[skills[i]!]!
      const cost = sk.costTp > 0 ? `TP${sk.costTp}` : `MP${sk.costMp}`
      const text = this.add.text(430, 390 + i * 22, `${sk.name} [${cost}]`, {
        fontSize: '14px',
        color: '#c0c0d0',
      })
      text.setDepth(321)
      text.setScrollFactor(0)
      this.skillMenuItems.push(text)
    }
    this.skillMenuCursor = this.add.rectangle(420, 390 + 6, 8, 8, 0xf1c40f)
    this.skillMenuCursor.setDepth(322)
    this.skillMenuCursor.setScrollFactor(0)
  }

  private moveSkillMenu(dir: number): void {
    if (!this.inSkillMenu) return
    this.skillMenuIndex = (this.skillMenuIndex + dir + this.skillMenuItems.length) % this.skillMenuItems.length
    this.skillMenuCursor.setY(this.skillMenuItems[this.skillMenuIndex]!.y + 6)
    AudioManager.getInstance().playSFX('cursor')
  }

  private selectSkill(): void {
    if (!this.inSkillMenu) return
    const actor = this.getCurrentUnit()
    if (!actor || !actor.isPlayer) return
    const char = actor.data as CharacterData
    const skills = char.skills.filter(s => {
      const sk = SKILLS[s]
      if (!sk) return false
      return char.stats.mp >= sk.costMp && actor.tp >= sk.costTp
    })
    const skillId = skills[this.skillMenuIndex]
    if (!skillId) return
    this.closeSkillMenu()
    this.actionStack = ['skill', skillId]
    const sk = SKILLS[skillId]
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
  private itemMenuBg!: Phaser.GameObjects.Rectangle

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

    this.itemMenuBg = this.add.rectangle(560, 440, 280, 140, 0x1a1a2e, 0.95)
    this.itemMenuBg.setStrokeStyle(2, 0x5a5a7e)
    this.itemMenuBg.setDepth(320)
    this.itemMenuBg.setScrollFactor(0)

    for (let i = 0; i < items.length; i++) {
      const [itemId, qty] = items[i]!
      const item = this.getItemData(itemId)
      if (!item) continue
      const text = this.add.text(430, 390 + i * 22, `${item.name} x${qty}`, {
        fontSize: '14px',
        color: '#c0c0d0',
      })
      text.setDepth(321)
      text.setScrollFactor(0)
      this.itemMenuItems.push(text)
    }
    this.itemMenuCursor = this.add.rectangle(420, 390 + 6, 8, 8, 0xf1c40f)
    this.itemMenuCursor.setDepth(322)
    this.itemMenuCursor.setScrollFactor(0)
  }

  private moveItemMenu(dir: number): void {
    if (!this.inItemMenu) return
    this.itemMenuIndex = (this.itemMenuIndex + dir + this.itemMenuItems.length) % this.itemMenuItems.length
    this.itemMenuCursor.setY(this.itemMenuItems[this.itemMenuIndex]!.y + 6)
    AudioManager.getInstance().playSFX('cursor')
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
    const targetPlayers = item ? item.effect.startsWith('heal_hp') || item.effect.includes('revive') || item.effect.includes('buff') || item.effect.includes('barrier') || item.effect.includes('cure') || item.effect.startsWith('heal_mp') : true
    this.startTargetSelect(targetPlayers)
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
  private barrelMenuBg!: Phaser.GameObjects.Rectangle
  private barrelMenuColors: BarrelColor[] = []
  private comboMenuItems: Phaser.GameObjects.Text[] = []
  private comboMenuCursor!: Phaser.GameObjects.Rectangle
  private comboMenuIndex = 0
  private inComboMenu = false
  private comboMenuBg!: Phaser.GameObjects.Rectangle
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

    this.barrelMenuBg = this.add.rectangle(560, 440, 280, 140, 0x1a1a2e, 0.95)
    this.barrelMenuBg.setStrokeStyle(2, 0x5a5a7e)
    this.barrelMenuBg.setDepth(320)
    this.barrelMenuBg.setScrollFactor(0)

    for (let i = 0; i < unlocked.length; i++) {
      const ability = bs.getAbility(unlocked[i]!)
      const text = this.add.text(430, 390 + i * 22, `${ability!.name} - ${ability!.battleDescription}`, {
        fontSize: '14px',
        color: '#c0c0d0',
      })
      text.setDepth(321)
      text.setScrollFactor(0)
      this.barrelMenuItems.push(text)
    }
    this.barrelMenuCursor = this.add.rectangle(420, 390 + 6, 8, 8, 0xf1c40f)
    this.barrelMenuCursor.setDepth(322)
    this.barrelMenuCursor.setScrollFactor(0)
  }

  private moveBarrelMenu(dir: number): void {
    if (!this.inBarrelMenu) return
    this.barrelMenuIndex = (this.barrelMenuIndex + dir + this.barrelMenuItems.length) % this.barrelMenuItems.length
    this.barrelMenuCursor.setY(this.barrelMenuItems[this.barrelMenuIndex]!.y + 6)
    AudioManager.getInstance().playSFX('cursor')
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
    const party = gd.party
    const results: { skillId: string; name: string; char1: string; char2: string }[] = []

    for (const def of COMBO_DEFS) {
      if (!party.includes(def.char1) || !party.includes(def.char2)) continue
      if (gd.getFlag(def.flag) !== true) continue

      const unit1 = this.units.find(u => u.isPlayer && u.id === def.char1)
      const unit2 = this.units.find(u => u.isPlayer && u.id === def.char2)
      if (!unit1 || !unit2 || unit1.stats.hp <= 0 || unit2.stats.hp <= 0) continue
      if (unit1.tp < COMBO_TP_COST || unit2.tp < COMBO_TP_COST) continue

      const skill = SKILLS[def.skillId]
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

    this.comboMenuBg = this.add.rectangle(560, 440, 280, 140, 0x1a1a2e, 0.95)
    this.comboMenuBg.setStrokeStyle(2, 0x5a5a7e)
    this.comboMenuBg.setDepth(320)
    this.comboMenuBg.setScrollFactor(0)

    for (let i = 0; i < combos.length; i++) {
      const combo = combos[i]!
      const char1Unit = this.units.find(u => u.isPlayer && u.id === combo.char1)
      const char2Unit = this.units.find(u => u.isPlayer && u.id === combo.char2)
      const label = `${combo.name} [${char1Unit?.name}+${char2Unit?.name}]`
      const text = this.add.text(430, 390 + i * 22, label, {
        fontSize: '14px',
        color: '#f1c40f',
      })
      text.setDepth(321)
      text.setScrollFactor(0)
      this.comboMenuItems.push(text)
    }
    this.comboMenuCursor = this.add.rectangle(420, 390 + 6, 8, 8, 0xf1c40f)
    this.comboMenuCursor.setDepth(322)
    this.comboMenuCursor.setScrollFactor(0)
  }

  private moveComboMenu(dir: number): void {
    if (!this.inComboMenu) return
    this.comboMenuIndex = (this.comboMenuIndex + dir + this.comboMenuItems.length) % this.comboMenuItems.length
    this.comboMenuCursor.setY(this.comboMenuItems[this.comboMenuIndex]!.y + 6)
    AudioManager.getInstance().playSFX('cursor')
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

    const skill = SKILLS[combo.skillId]
    if (!skill) return

    AudioManager.getInstance().playSFX('magic_cast')

    const comboText = this.add.text(480, 200, '连携！', {
      fontSize: '32px',
      color: '#ffd700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    })
    comboText.setOrigin(0.5)
    comboText.setDepth(330)
    comboText.setScrollFactor(0)
    this.tweens.add({
      targets: comboText,
      y: 150,
      alpha: 0,
      duration: Math.floor(1000 / this.speedMult),
      onComplete: () => comboText.destroy(),
    })

    if (skill.type === 'buff') {
      const party = this.units.filter(u => u.isPlayer && u.stats.hp > 0)
      for (const u of party) {
        if (!u.status.includes(skill.id)) u.status.push(skill.id)
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
        if (t.status.includes('break')) damage = Math.floor(damage * 1.3)
        damage = Math.floor(damage * (0.9 + Math.random() * 0.2))
        this.log(`${unit1.name} 与 ${unit2.name} 发动 ${skill.name}，对 ${t.name} 造成 ${damage} 点伤害！`)
        this.dealDamage(t, damage)
      }
    } else {
      const target = targets.length > 0 ? targets[0]! : targets[0]
      if (target) {
        const def = isMagic ? (target.data as EnemyData).stats.mdef : (target.data as EnemyData).stats.def
        let damage = Math.max(1, Math.floor(skill.power * stat / 10 / Math.max(1, def * 0.5)))
        if (target.status.includes('break')) damage = Math.floor(damage * 1.3)
        damage = Math.floor(damage * (0.9 + Math.random() * 0.2))
        this.log(`${unit1.name} 与 ${unit2.name} 发动 ${skill.name}，对 ${target.name} 造成 ${damage} 点伤害！`)
        this.dealDamage(target, damage)
      }
    }

    this.markComboUnitActed(unit1)
    this.markComboUnitActed(unit2)
  }

  private markComboUnitActed(unit: BattleUnit): void {
    const idx = this.turnOrder.indexOf(this.units.indexOf(unit))
    if (idx > this.currentTurn) {
      unit.status.push('combo_acted')
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
        const party = this.units.filter(u => u.isPlayer && u.stats.hp > 0)
        for (const u of party) {
          const heal = Math.floor(u.stats.maxHp * 0.3)
          u.stats.hp = Math.min(u.stats.maxHp, u.stats.hp + heal)
          u.status = u.status.filter(s => s !== 'poison')
          this.updateUnitBars(u)
        }
        this.log('全队回复30%HP，解除中毒！')
        break
      }
      case 'restore_mp': {
        actor.stats.mp = Math.min(actor.stats.maxMp, actor.stats.mp + 20)
        actor.status = actor.status.filter(s => s !== 'burn')
        this.updateUnitBars(actor)
        this.log(`${actor.name} 回复20MP，解除灼烧！`)
        break
      }
      case 'light_shield': {
        const party = this.units.filter(u => u.isPlayer && u.stats.hp > 0)
        for (const u of party) {
          u.status.push('light_shield_2')
        }
        this.log('全队获得光属性护盾，防御+50%持续2回合！')
        break
      }
      case 'immunity_poison': {
        const party = this.units.filter(u => u.isPlayer && u.stats.hp > 0)
        for (const u of party) {
          u.status.push('immunity_poison_3')
        }
        this.log('全队获得毒免疫，持续3回合！')
        break
      }
      case 'defense_up': {
        actor.status.push('defense_up_3')
        this.updateUnitBars(actor)
        this.log(`${actor.name} 防御+30%持续3回合！`)
        break
      }
      case 'fire_counter': {
        actor.status.push('fire_counter_2')
        this.updateUnitBars(actor)
        this.log(`${actor.name} 获得火属性反击，持续2回合！`)
        break
      }
      case 'taunt_damage_reduce': {
        actor.status.push('taunt')
        actor.status.push('damage_reduce_2')
        this.updateUnitBars(actor)
        this.log(`${actor.name} 发起嘲讽并减伤30%，持续2回合！`)
        break
      }
      case 'ultimate_resonance': {
        const party = this.units.filter(u => u.isPlayer && u.stats.hp > 0)
        for (const u of party) {
          u.tp = Math.min(100, u.tp + 30)
          this.updateUnitBars(u)
        }
        this.log('全队共鸣！TP+30！')
        break
      }
    }
  }

  private getItemData(itemId: string): { usableInBattle: boolean; name: string; effect: string } | null {
    const itemMap: Record<string, { usableInBattle: boolean; name: string; effect: string }> = {
      heal_grass: { usableInBattle: true, name: '回复草', effect: 'heal_hp:80' },
      pineapple_rice: { usableInBattle: true, name: '菠萝饭团', effect: 'heal_hp:150' },
      holy_drop: { usableInBattle: true, name: '神水滴', effect: 'heal_mp:60' },
      antidote: { usableInBattle: true, name: '解毒草', effect: 'cure_poison' },
      clear_bell: { usableInBattle: true, name: '清心铃', effect: 'cure_confuse_charm_fear' },
      revive_feather: { usableInBattle: true, name: '复生羽', effect: 'revive:30' },
      barrel_cookie: { usableInBattle: true, name: '木桶饼干', effect: 'heal_hp:30_all' },
      wind_pill: { usableInBattle: true, name: '风铃丸', effect: 'buff_speed' },
      amulet: { usableInBattle: true, name: '护身符', effect: 'barrier_status' },
    }
    return itemMap[itemId] || null
  }

  private performItem(actor: BattleUnit, target: BattleUnit, itemId: string): void {
    const gd = GameData.getInstance()
    const item = this.getItemData(itemId)
    if (!item) return

    if (!gd.removeItem(itemId, 1)) {
      this.log('道具不足！')
      return
    }

    AudioManager.getInstance().playSFX('item_use')
    const effect = item.effect
    if (effect.startsWith('heal_hp:')) {
      const amount = parseInt(effect.split(':')[1]!)
      if (effect.includes('_all')) {
        const targets = this.units.filter(u => u.isPlayer && u.stats.hp > 0)
        for (const t of targets) {
          t.stats.hp = Math.min(t.stats.maxHp, t.stats.hp + amount)
          this.updateUnitBars(t)
        }
        this.log(`${item.name}！全队回复 ${amount} HP！`)
      } else {
        target.stats.hp = Math.min(target.stats.maxHp, target.stats.hp + amount)
        this.updateUnitBars(target)
        this.log(`${item.name}！${target.name} 回复 ${amount} HP！`)
      }
    } else if (effect.startsWith('heal_mp:')) {
      const amount = parseInt(effect.split(':')[1]!)
      target.stats.mp = Math.min(target.stats.maxMp, target.stats.mp + amount)
      this.log(`${item.name}！${target.name} 回复 ${amount} MP！`)
    } else if (effect === 'cure_poison') {
      target.status = target.status.filter((s: string) => s !== 'poison')
      this.log(`${item.name}！${target.name} 解毒成功！`)
    } else if (effect === 'cure_confuse_charm_fear') {
      target.status = target.status.filter((s: string) => !['confuse', 'charm', 'fear'].includes(s))
      this.log(`${item.name}！${target.name} 状态恢复！`)
    } else if (effect.startsWith('revive:')) {
      const pct = parseInt(effect.split(':')[1]!)
      if (target.stats.hp <= 0) {
        target.stats.hp = Math.floor(target.stats.maxHp * pct / 100)
        target.sprite!.setAlpha(1)
        this.updateUnitBars(target)
        this.log(`${item.name}！${target.name} 复活了！`)
      } else {
        this.log(`${target.name} 还活着！`)
      }
    } else if (effect === 'buff_speed') {
      target.status.push('speed_up')
      this.log(`${item.name}！${target.name} 速度提升！`)
    } else if (effect === 'barrier_status') {
      target.status.push('status_barrier')
      this.log(`${item.name}！${target.name} 获得异常护盾！`)
    } else {
      this.log(`使用了 ${item.name}`)
    }
  }

  private tryEscape(): void {
    const success = Math.random() > 0.5
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

    if (target.status.includes('defend')) {
      damage = Math.floor(damage * 0.5)
    }
    if (target.status.includes('break')) {
      damage = Math.floor(damage * 1.3)
    }

    // Difficulty scaling
    if (!isPlayer) {
      damage = Math.floor(damage * this.difficultyMult.dmg)
    } else {
      const playerDmgMult = this.difficultyMult.dmg < 1.0 ? 1.15 : this.difficultyMult.dmg > 1.0 ? 0.9 : 1.0
      damage = Math.floor(damage * playerDmgMult)
    }

    damage = Math.floor(damage * (0.9 + Math.random() * 0.2))

    AudioManager.getInstance().playSFX('attack_slash')
    this.log(`${actor.name} 攻击 ${target.name}，造成 ${damage} 点伤害！`)
    this.dealDamage(target, damage)

    // TP generation for player
    if (isPlayer && actor.tp < 100) {
      actor.tp = Math.min(100, actor.tp + 5)
      this.updateUnitBars(actor)
    }
    // TP generation for enemy
    if (!isPlayer && actor.tp < 100) {
      actor.tp = Math.min(100, actor.tp + 3)
    }

    // Break gauge for enemies
    if (!target.isPlayer && !target.status.includes('break')) {
      target.breakGauge = Math.min(target.breakMax, target.breakGauge + 10)
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

  private performSkill(actor: BattleUnit, target: BattleUnit, skillId: string): void {
    const skill = SKILLS[skillId]
    if (!skill) {
      this.performAttack(actor, target)
      return
    }

    const isPlayer = actor.isPlayer
    const char = actor.data as CharacterData
    const enemy = actor.data as EnemyData

    if (isPlayer) {
      if (char.stats.mp < skill.costMp) {
        this.log('MP不足！')
        return
      }
      if (actor.tp < skill.costTp) {
        this.log('TP不足！')
        return
      }
      char.stats.mp -= skill.costMp
      actor.stats.mp = char.stats.mp
      actor.tp -= skill.costTp
      this.updateUnitBars(actor)
    } else {
      if (enemy.stats.mp < skill.costMp) {
        this.performAttack(actor, target)
        return
      }
      enemy.stats.mp -= skill.costMp
      actor.stats.mp = enemy.stats.mp
    }

    if (skill.type === 'heal') {
      AudioManager.getInstance().playSFX('heal')
      this.performHeal(actor, target, skill)
      return
    }

    if (skill.type === 'buff') {
      AudioManager.getInstance().playSFX('magic_cast')
      this.applyBuff(actor, target, skill)
      return
    }

    if (skill.type === 'debuff') {
      AudioManager.getInstance().playSFX('magic_cast')
      this.applyDebuff(actor, target, skill)
      return
    }

    if (skill.type === 'special') {
      AudioManager.getInstance().playSFX('magic_cast')
      this.log(`${actor.name} 使用 ${skill.name}！`)
      return
    }

    // attack / magic
    if (skill.target === 'all') {
      const targets = actor.isPlayer
        ? this.units.filter(u => !u.isPlayer && u.stats.hp > 0)
        : this.units.filter(u => u.isPlayer && u.stats.hp > 0)
      for (const t of targets) {
        this.calculateAndDealSkillDamage(actor, t, skill)
      }
    } else if (skill.target === 'random') {
      const targets = actor.isPlayer
        ? this.units.filter(u => !u.isPlayer && u.stats.hp > 0)
        : this.units.filter(u => u.isPlayer && u.stats.hp > 0)
      const t = targets[Math.floor(Math.random() * targets.length)]!
      this.calculateAndDealSkillDamage(actor, t, skill)
    } else {
      this.calculateAndDealSkillDamage(actor, target, skill)
    }
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

    let damage = Math.max(1, Math.floor(stat * skill.power / 10))

    // Buff modifiers
    if (actor.status.includes('roar')) damage = Math.floor(damage * 1.3)
    if (target.status.includes('water_curtain') || target.status.includes('wind_wall') || target.status.includes('armor_up')) {
      damage = Math.floor(damage * 0.7)
    }
    if (target.status.includes('break')) {
      damage = Math.floor(damage * 1.3)
    }

    // Difficulty scaling
    if (!isPlayer) {
      damage = Math.floor(damage * this.difficultyMult.dmg)
    } else {
      const playerDmgMult = this.difficultyMult.dmg < 1.0 ? 1.15 : this.difficultyMult.dmg > 1.0 ? 0.9 : 1.0
      damage = Math.floor(damage * playerDmgMult)
    }

    // Element weakness
    let isWeakHit = false
    const targetElement = target.isPlayer ? 'none' : (target.data as EnemyData).element
    if (ELEMENT_WEAKNESS[targetElement]?.includes(skill.element)) {
      damage = Math.floor(damage * 1.5)
      isWeakHit = true
      this.log(`弱点打击！`)
    }

    // TP generation for player
    if (actor.isPlayer && actor.tp < 100) {
      actor.tp = Math.min(100, actor.tp + 8)
      this.updateUnitBars(actor)
    }

    // Break gauge for enemies
    if (!target.isPlayer && !target.status.includes('break')) {
      const breakGain = isWeakHit ? 25 : 15
      target.breakGauge = Math.min(target.breakMax, target.breakGauge + breakGain)
      this.updateUnitBars(target)
      if (target.breakGauge >= target.breakMax) {
        target.status.push('break')
        this.log(`${target.name} 陷入破势状态！`)
        // Break lasts 2 turns
        target.status.push('break_turns_2')
      }
    }

    AudioManager.getInstance().playSFX(skill.type === 'magic' ? 'magic_cast' : 'attack_slash')
    this.log(`${actor.name} 使用 ${skill.name}，对 ${target.name} 造成 ${damage} 点伤害！`)
    this.dealDamage(target, damage)
  }

  private performHeal(actor: BattleUnit, target: BattleUnit, skill: SkillData): void {
    const isPlayer = actor.isPlayer
    const matk = isPlayer ? (actor.data as CharacterData).stats.matk : (actor.data as EnemyData).stats.matk
    const heal = Math.max(1, Math.floor(matk * skill.power / 10))
    target.stats.hp = Math.min(target.stats.maxHp, target.stats.hp + heal)
    this.updateUnitBars(target)
    this.log(`${actor.name} 使用 ${skill.name}，${target.name} 回复 ${heal} 点生命！`)
  }

  private applyBuff(actor: BattleUnit, target: BattleUnit, skill: SkillData): void {
    if (!target.status.includes(skill.id)) target.status.push(skill.id)
    this.log(`${actor.name} 使用 ${skill.name}！`)
  }

  private applyDebuff(actor: BattleUnit, target: BattleUnit, skill: SkillData): void {
    if (!target.status.includes(skill.id)) target.status.push(skill.id)
    this.log(`${actor.name} 使用 ${skill.name}，${target.name} 陷入异常！`)
  }

  private dealDamage(target: BattleUnit, damage: number): void {
    target.stats.hp = Math.max(0, target.stats.hp - damage)
    this.updateUnitBars(target)

    // Damage number popup
    const dmgText = this.add.text(target.sprite!.x, target.sprite!.y - 40, `-${damage}`, {
      fontSize: '20px',
      color: '#ff4444',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    })
    dmgText.setOrigin(0.5)
    dmgText.setDepth(310)
    dmgText.setScrollFactor(0)
    this.tweens.add({
      targets: dmgText,
      y: target.sprite!.y - 80,
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
    const flash = this.add.rectangle(target.sprite!.x, target.sprite!.y, 64, 64, 0xff0000, 0.5)
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
      if (enemy.id === 'fenghuang' && !target.status.includes('rebirth_used')) {
        target.status.push('rebirth_used')
        target.stats.hp = Math.floor(target.stats.maxHp * 0.3)
        this.updateUnitBars(target)
        this.log(`${target.name} 涅槃重生！恢复了 ${target.stats.hp} 点生命！`)
        target.sprite!.setAlpha(1)
        return
      }
      this.log(`${target.name} 倒下了！`)
      target.sprite!.setAlpha(0.5)
    }
  }

  private calculateTurnOrder(): void {
    const speeds = this.units.map((u, i) => ({ index: i, speed: u.stats.speed + Math.random() * 5 }))
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

    if (unit.status.includes('combo_acted')) {
      unit.status = unit.status.filter((s: string) => s !== 'combo_acted')
      this.nextTurn()
      return
    }

    // Clear defend status
    unit.status = unit.status.filter((s: string) => s !== 'defend')

    // Status tick - poison damage
    if (unit.status.includes('poison') && unit.stats.hp > 0) {
      const poisonDmg = Math.max(1, Math.floor(unit.stats.maxHp * 0.05))
      unit.stats.hp = Math.max(1, unit.stats.hp - poisonDmg)
      this.updateUnitBars(unit)
      this.log(`${unit.name} 受到中毒伤害 ${poisonDmg} 点！`)
    }

    // Break state countdown and removal
    const breakTurnIdx = unit.status.findIndex((s: string) => s.startsWith('break_turns_'))
    if (breakTurnIdx >= 0) {
      const turnsStr = unit.status[breakTurnIdx]!
      const turns = parseInt(turnsStr.split('_')[2]!)
      if (turns <= 1) {
        unit.status = unit.status.filter((s: string) => s !== 'break' && !s.startsWith('break_turns_'))
        unit.breakGauge = 0
        this.updateUnitBars(unit)
        this.log(`${unit.name} 从破势状态中恢复！`)
      } else {
        unit.status[breakTurnIdx] = `break_turns_${turns - 1}`
      }
    }

    // Skip turn if dead after poison
    if (unit.stats.hp <= 0) {
      unit.sprite?.setAlpha(0.5)
      this.nextTurn()
      return
    }

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
    const targets = this.units.filter(u => u.isPlayer && u.stats.hp > 0)
    if (targets.length === 0) return
    const target = targets[Math.floor(Math.random() * targets.length)]!
    const enemy = unit.data as EnemyData
    if (enemy.skills.length > 1 && Math.random() < 0.4) {
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
    const targets = this.units.filter(u => u.isPlayer && u.stats.hp > 0)
    if (targets.length === 0) return
    const target = targets[Math.floor(Math.random() * targets.length)]!
    const roll = Math.random()
    if (roll < 0.2 && !unit.status.includes('counter')) {
      this.performSkill(unit, unit, 'counter')
    } else if (roll < 0.5) {
      this.performSkill(unit, target, 'shield_bash')
    } else {
      this.performAttack(unit, target)
    }
    this.nextTurn()
  }

  private mageAI(unit: BattleUnit): void {
    const targets = this.units.filter(u => u.isPlayer && u.stats.hp > 0)
    if (targets.length === 0) return
    const target = targets[Math.floor(Math.random() * targets.length)]!
    const roll = Math.random()
    if (roll < 0.3) {
      this.performSkill(unit, target, 'magic_attack')
    } else if (roll < 0.6) {
      const skillId = (unit.data as EnemyData).skills.find(s => s !== 'magic_attack' && s !== 'normal_attack') || 'magic_attack'
      this.performSkill(unit, target, skillId)
    } else {
      this.performAttack(unit, target)
    }
    this.nextTurn()
  }

  private bossBaihuAI(unit: BattleUnit): void {
    const targets = this.units.filter(u => u.isPlayer && u.stats.hp > 0)
    if (targets.length === 0) return

    // Survival trial: baihu stops attacking after 5 turns and acknowledges player
    if (this.turnCount >= 5) {
      this.log('白虎停下了攻击……"你通过了试炼。"')
      const gd = GameData.getInstance()
      gd.setFlag('white_tiger_respected', true)
      // Deal reduced damage (demonstrating respect)
      const target = targets[Math.floor(Math.random() * targets.length)]!
      this.performAttack(unit, target)
      this.nextTurn()
      return
    }

    const target = targets[Math.floor(Math.random() * targets.length)]!
    const hpRatio = unit.stats.hp / unit.stats.maxHp
    const roll = Math.random()
    if (hpRatio < 0.3 && roll < 0.4) {
      this.performSkill(unit, target, 'heavenly_strike')
    } else if (!unit.status.includes('roar') && roll < 0.3) {
      this.performSkill(unit, unit, 'roar')
    } else {
      this.performSkill(unit, target, 'tiger_claw')
    }
    this.nextTurn()
  }

  private bossShuiyaoAI(unit: BattleUnit): void {
    const targets = this.units.filter(u => u.isPlayer && u.stats.hp > 0)
    if (targets.length === 0) return
    const allies = this.units.filter(u => !u.isPlayer && u.stats.hp > 0)
    const woundedAlly = allies.find(u => u.stats.hp / u.stats.maxHp < 0.4)
    const roll = Math.random()
    if (woundedAlly && roll < 0.5) {
      this.performSkill(unit, woundedAlly, 'heal')
    } else if (roll < 0.3 && !unit.status.includes('water_curtain')) {
      this.performSkill(unit, unit, 'water_curtain')
    } else {
      const target = targets[Math.floor(Math.random() * targets.length)]!
      this.performSkill(unit, target, 'ice_shard')
    }
    this.nextTurn()
  }

  private bossFengchiAI(unit: BattleUnit): void {
    const targets = this.units.filter(u => u.isPlayer && u.stats.hp > 0)
    if (targets.length === 0) return
    const roll = Math.random()
    if (!unit.status.includes('wind_wall') && roll < 0.25) {
      this.performSkill(unit, unit, 'wind_wall')
    } else if (roll < 0.55) {
      const target = targets[Math.floor(Math.random() * targets.length)]!
      this.performSkill(unit, target, 'gale_slash')
    } else {
      this.performSkill(unit, targets[0]!, 'feather_storm')
    }
    this.nextTurn()
  }

  private bossPhoenixAI(unit: BattleUnit): void {
    const targets = this.units.filter(u => u.isPlayer && u.stats.hp > 0)
    if (targets.length === 0) return
    const roll = Math.random()
    if (roll < 0.4) {
      this.performSkill(unit, targets[0]!, 'fire_breath')
    } else if (roll < 0.8) {
      const target = targets[Math.floor(Math.random() * targets.length)]!
      this.performSkill(unit, target, 'wind_pressure')
    } else {
      const target = targets[Math.floor(Math.random() * targets.length)]!
      this.performAttack(unit, target)
    }
    this.nextTurn()
  }

  private bossQilinAI(unit: BattleUnit): void {
    const targets = this.units.filter(u => u.isPlayer && u.stats.hp > 0)
    if (targets.length === 0) return
    const roll = Math.random()
    if (!unit.status.includes('armor_up') && roll < 0.25) {
      this.performSkill(unit, unit, 'armor_up')
    } else if (roll < 0.6) {
      this.performSkill(unit, targets[0]!, 'earthquake')
    } else {
      const target = targets[Math.floor(Math.random() * targets.length)]!
      this.performSkill(unit, target, 'flame_charge')
    }
    this.nextTurn()
  }

  private bossChiAI(unit: BattleUnit): void {
    const targets = this.units.filter(u => u.isPlayer && u.stats.hp > 0)
    if (targets.length === 0) return
    const roll = Math.random()
    if (roll < 0.35) {
      this.performSkill(unit, targets[0]!, 'poison_mist')
    } else if (roll < 0.65) {
      const target = targets[Math.floor(Math.random() * targets.length)]!
      this.performSkill(unit, target, 'venom_fang')
    } else {
      this.performSkill(unit, targets[0]!, 'toxic_burst')
    }
    this.nextTurn()
  }

  private bossMeiAI(unit: BattleUnit): void {
    const targets = this.units.filter(u => u.isPlayer && u.stats.hp > 0)
    if (targets.length === 0) return
    const roll = Math.random()
    if (roll < 0.3) {
      const target = targets[Math.floor(Math.random() * targets.length)]!
      this.performSkill(unit, target, 'charm')
    } else if (roll < 0.6) {
      const target = targets[Math.floor(Math.random() * targets.length)]!
      this.performSkill(unit, target, 'illusion_strike')
    } else {
      this.performSkill(unit, targets[0]!, 'shadow_dance')
    }
    this.nextTurn()
  }

  private bossWangAI(unit: BattleUnit): void {
    const targets = this.units.filter(u => u.isPlayer && u.stats.hp > 0)
    if (targets.length === 0) return
    const roll = Math.random()
    if (roll < 0.35) {
      this.performSkill(unit, targets[0]!, 'wind_poison')
    } else if (roll < 0.65) {
      const target = targets[Math.floor(Math.random() * targets.length)]!
      this.performSkill(unit, target, 'feather_dart')
    } else {
      const target = targets[Math.floor(Math.random() * targets.length)]!
      this.performSkill(unit, target, 'aerial_dive')
    }
    this.nextTurn()
  }

  private bossLiangAI(unit: BattleUnit): void {
    const targets = this.units.filter(u => u.isPlayer && u.stats.hp > 0)
    if (targets.length === 0) return
    const hpRatio = unit.stats.hp / unit.stats.maxHp
    const roll = Math.random()
    if (hpRatio < 0.4 && roll < 0.5) {
      this.performSkill(unit, targets[0]!, 'flame_stomp')
    } else if (roll < 0.4) {
      const target = targets[Math.floor(Math.random() * targets.length)]!
      this.performSkill(unit, target, 'rock_smash')
    } else {
      const target = targets[Math.floor(Math.random() * targets.length)]!
      this.performSkill(unit, target, 'armor_pierce')
    }
    this.nextTurn()
  }

  private bossFakeXiaoaiAI(unit: BattleUnit): void {
    const targets = this.units.filter(u => u.isPlayer && u.stats.hp > 0)
    if (targets.length === 0) return
    const roll = Math.random()
    if (roll < 0.3 && !unit.status.includes('dark_mirror')) {
      this.performSkill(unit, unit, 'dark_mirror')
    } else if (roll < 0.6) {
      const target = targets[Math.floor(Math.random() * targets.length)]!
      this.performSkill(unit, target, 'shadow_blade')
    } else {
      this.performSkill(unit, unit, 'afternoon_tea')
    }
    this.nextTurn()
  }

  private bossXiaoaiTrueAI(unit: BattleUnit): void {
    const targets = this.units.filter(u => u.isPlayer && u.stats.hp > 0)
    if (targets.length === 0) return
    const hpRatio = unit.stats.hp / unit.stats.maxHp
    const roll = Math.random()
    if (hpRatio < 0.3 && roll < 0.5) {
      this.performSkill(unit, targets[0]!, 'fallen_angel')
    } else if (roll < 0.3) {
      this.performSkill(unit, targets[0]!, 'dark_purge')
    } else if (roll < 0.6) {
      const target = targets[Math.floor(Math.random() * targets.length)]!
      this.performSkill(unit, target, 'soul_drain')
    } else {
      const target = targets[Math.floor(Math.random() * targets.length)]!
      this.performSkill(unit, target, 'wind_moon_slash')
    }
    this.nextTurn()
  }

  private bossWuxiangAI(unit: BattleUnit): void {
    const targets = this.units.filter(u => u.isPlayer && u.stats.hp > 0)
    if (targets.length === 0) return
    const hpRatio = unit.stats.hp / unit.stats.maxHp
    const roll = Math.random()
    if (hpRatio < 0.2 && roll < 0.6) {
      this.performSkill(unit, targets[0]!, 'dark_nova')
    } else if (roll < 0.25) {
      this.performSkill(unit, unit, 'copy_party')
    } else if (roll < 0.5) {
      this.performSkill(unit, targets[0]!, 'devour_prophecy')
    } else if (roll < 0.75) {
      this.performSkill(unit, targets[0]!, 'heart_void')
    } else {
      const target = targets[Math.floor(Math.random() * targets.length)]!
      this.performAttack(unit, target)
    }
    this.nextTurn()
  }

  private nextTurn(): void {
    // Check victory / defeat
    const livePlayers = this.units.filter(u => u.isPlayer && u.stats.hp > 0)
    const liveEnemies = this.units.filter(u => !u.isPlayer && u.stats.hp > 0)

    if (liveEnemies.length === 0) {
      this.phase = 'victory'
      this.log('战斗胜利！')
      this.time.delayedCall(Math.floor(1500 / this.speedMult), () => this.endBattle(true))
      return
    }
    if (livePlayers.length === 0) {
      this.phase = 'defeat'
      this.log('全队倒下……')
      this.time.delayedCall(Math.floor(1500 / this.speedMult), () => this.endBattle(false))
      return
    }

    // Dual boss synergy: shui_yao + feng_chi rage when partner falls
    if (this.encounterId === 'BTL_201' && liveEnemies.length === 1) {
      const survivor = liveEnemies[0]!
      if (!survivor.status.includes('enraged')) {
        survivor.status.push('enraged')
        survivor.stats.speed = Math.floor(survivor.stats.speed * 1.3)
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
    const summary = victory ? this.applyVictoryResult() : this.createNonVictoryResult(escaped)
    this.showBattleResult(summary)
  }

  private applyVictoryResult(): BattleResultSummary {
    AudioManager.getInstance().playVictoryBGM()
    const gd = GameData.getInstance()
    this.syncPlayerState()
    let totalExp = 0
    let totalGold = 0
    const levelUps: string[] = []
    const rewardLines: string[] = []
    const dropLines: string[] = []

    for (const ed of this.enemyData) {
      gd.setFlag(`defeated_${ed.id}`, true)
      totalExp += ed.exp
      totalGold += ed.gold
    }
    totalExp = Math.floor(totalExp * this.difficultyMult.exp)
    gd.addGold(totalGold)

    for (const id of gd.party) {
      const char = gd.characters.get(id)
      if (!char) continue
      char.stats.exp += totalExp
      if (char.stats.exp >= char.stats.expToNext) {
        char.stats.level++
        char.stats.exp -= char.stats.expToNext
        char.stats.expToNext = Math.floor(char.stats.expToNext * 1.5)
        levelUps.push(`${char.name} Lv.${char.stats.level}`)
      }
    }

    const qs = QuestSystem.getInstance()
    const encounter = ENCOUNTERS[this.encounterId]
    if (encounter?.victoryFlag) {
      gd.setFlag(encounter.victoryFlag, true)
      rewardLines.push('关键战斗标记已更新')
    }
    if (encounter?.questId && encounter.questProgress) {
      if (!qs.isQuestActive(encounter.questId) && !qs.isQuestCompleted(encounter.questId)) {
        qs.startQuest(encounter.questId)
      }
      if (encounter.questProgress === 'complete') {
        qs.completeQuest(encounter.questId)
        rewardLines.push('任务已完成')
      } else {
        qs.advanceQuest(encounter.questId)
        rewardLines.push('任务已推进')
      }
    }
    if (encounter?.rewards) {
      for (const reward of encounter.rewards) {
        if (reward.itemId) {
          gd.addItem(reward.itemId, reward.itemQty ?? 1)
          rewardLines.push(`${this.getItemName(reward.itemId)} x${reward.itemQty ?? 1}`)
        }
        if (reward.flag) {
          gd.setFlag(reward.flag, reward.value ?? true)
          rewardLines.push('剧情进度已更新')
        }
        if (reward.branch) {
          gd.updateBranch(reward.branch, reward.branchValue ?? true)
          rewardLines.push('分支状态已更新')
        }
      }
    }

    if (this.mapEventId) {
      gd.setFlag(`defeated_${this.mapEventId}`, true)
    }

    for (const ed of this.enemyData) {
      for (const drop of ed.drops) {
        if (Math.random() < drop.rate) {
          gd.addItem(drop.itemId, 1)
          dropLines.push(`${this.getItemName(drop.itemId)} x1`)
        }
      }
    }

    const lines = [`EXP +${totalExp}`, `金币 +${totalGold}`]
    if (dropLines.length > 0) lines.push(`掉落：${dropLines.join('、')}`)
    if (levelUps.length > 0) lines.push(`升级：${levelUps.join('、')}`)
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
    this.log(summary.title)

    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, BATTLE_RESULT_PANEL.overlayAlpha)
    const panel = this.add.rectangle(BATTLE_RESULT_PANEL.x, BATTLE_RESULT_PANEL.y, BATTLE_RESULT_PANEL.width, BATTLE_RESULT_PANEL.height, 0x1a1a2e, 0.96)
    panel.setStrokeStyle(2, summary.victory ? 0xf1c40f : 0x9b59b6)
    const title = this.add.text(BATTLE_RESULT_PANEL.x, BATTLE_RESULT_PANEL.y + BATTLE_RESULT_PANEL.titleOffsetY, summary.title, {
      fontSize: '28px',
      color: summary.victory ? '#f1c40f' : '#e8e8f0',
      fontFamily: 'serif',
    }).setOrigin(0.5)
    const objects: Phaser.GameObjects.GameObject[] = [overlay, panel, title]
    const visibleLines = summary.lines.slice(0, BATTLE_RESULT_PANEL.maxLines)
    for (let i = 0; i < visibleLines.length; i++) {
      const line = this.add.text(BATTLE_RESULT_PANEL.x - BATTLE_RESULT_PANEL.width / 2 + BATTLE_RESULT_PANEL.contentPaddingX, BATTLE_RESULT_PANEL.y + BATTLE_RESULT_PANEL.lineStartOffsetY + i * BATTLE_RESULT_PANEL.lineGap, visibleLines[i]!, {
        fontSize: '18px',
        color: '#e8e8f0',
        wordWrap: { width: BATTLE_RESULT_PANEL.width - BATTLE_RESULT_PANEL.contentPaddingX * 2 },
      })
      objects.push(line)
    }
    const confirmLabel = summary.victory || summary.escaped ? '继续' : 'GAME OVER'
    const confirm = this.add.text(BATTLE_RESULT_PANEL.x, BATTLE_RESULT_PANEL.y + BATTLE_RESULT_PANEL.confirmOffsetY, confirmLabel, {
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#5a5a7e',
      padding: { x: BATTLE_RESULT_PANEL.confirmPaddingX, y: BATTLE_RESULT_PANEL.confirmPaddingY },
    }).setOrigin(0.5)
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
    EventBus.emit(GameEvents.BATTLE_END, summary.victory, { escaped: summary.escaped })
    this.scene.stop()
  }

  private getItemName(itemId: string): string {
    return ITEMS[itemId]?.name ?? this.getItemData(itemId)?.name ?? itemId
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
