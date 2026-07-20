import { GAME_CONFIG_DATABASE } from '../../data/configDatabase'
import type { EnemyData } from '../../data/types'
import {
  BATTLE_RULES,
  BATTLE_STATUS,
} from '../../utils/constants'
import {
  HEART_SHADOW_ENEMY_IDS,
  resolveHeartShadowCopyAction,
  resolveHeartShadowHuihuiSkill,
  shouldHeartShadowSunCastShield,
  type RecordedPlayerAction,
} from '../../utils/battleRules'
import type { BattleUnit } from './BattleUnit'

export interface BattleAiHost {
  units: BattleUnit[]
  completedRoundCount: number
  lastPlayerAction: RecordedPlayerAction | null
  getLivePlayers(): BattleUnit[]
  getLiveEnemies(): BattleUnit[]
  pickRandomTarget(targets: BattleUnit[]): BattleUnit | null | undefined
  hasStatus(unit: BattleUnit, status: string): boolean
  addStatus(unit: BattleUnit, status: string): void
  performAttack(attacker: BattleUnit, target: BattleUnit): void
  performSkill(caster: BattleUnit, target: BattleUnit, skillId: string): void
  log(message: string): void
  nextTurn(): void
}

export function runEnemyAi(host: BattleAiHost, unit: BattleUnit): void {
  const aiType = (unit.data as EnemyData).aiType
  switch (aiType) {
    case 'defensive': defensiveAI(host, unit); break
    case 'mage': mageAI(host, unit); break
    case 'boss_baihu': bossBaihuAI(host, unit); break
    case 'boss_shuiyao': bossShuiyaoAI(host, unit); break
    case 'boss_fengchi': bossFengchiAI(host, unit); break
    case 'boss_phoenix': bossPhoenixAI(host, unit); break
    case 'boss_qilin': bossQilinAI(host, unit); break
    case 'boss_chi': bossChiAI(host, unit); break
    case 'boss_mei': bossMeiAI(host, unit); break
    case 'boss_wang': bossWangAI(host, unit); break
    case 'boss_liang': bossLiangAI(host, unit); break
    case 'boss_fake_xiaoai': bossFakeXiaoaiAI(host, unit); break
    case 'boss_xiaoai_true': bossXiaoaiTrueAI(host, unit); break
    case 'boss_wuxiang': bossWuxiangAI(host, unit); break
    case 'heart_shadow_t': heartShadowTAI(host, unit); break
    case 'heart_shadow_huihui': heartShadowHuihuiAI(host, unit); break
    case 'heart_shadow_congcong': heartShadowCongcongAI(host, unit); break
    case 'heart_shadow_sun': heartShadowSunAI(host, unit); break
    default: basicAI(host, unit); break
  }
}

function basicAI(host: BattleAiHost, unit: BattleUnit): void {
  const targets = host.getLivePlayers()
  if (targets.length === 0) return
  const target = host.pickRandomTarget(targets)!
  const enemy = unit.data as EnemyData
  if (enemy.skills.length > 1 && Math.random() < BATTLE_RULES.BASIC_AI_SKILL_CHANCE) {
    const skillId = enemy.skills[Math.floor(Math.random() * enemy.skills.length)]!
    if (skillId !== 'normal_attack') {
      host.performSkill(unit, target, skillId)
      host.nextTurn()
      return
    }
  }
  host.performAttack(unit, target)
  host.nextTurn()
}

function defensiveAI(host: BattleAiHost, unit: BattleUnit): void {
  const targets = host.getLivePlayers()
  if (targets.length === 0) return
  const target = host.pickRandomTarget(targets)!
  const roll = Math.random()
  if (roll < BATTLE_RULES.DEFENSIVE_AI_COUNTER_CHANCE && !host.hasStatus(unit, BATTLE_STATUS.COUNTER)) {
    host.performSkill(unit, unit, 'counter')
  } else if (roll < BATTLE_RULES.DEFENSIVE_AI_SHIELD_BASH_CHANCE) {
    host.performSkill(unit, target, 'shield_bash')
  } else {
    host.performAttack(unit, target)
  }
  host.nextTurn()
}

function mageAI(host: BattleAiHost, unit: BattleUnit): void {
  const targets = host.getLivePlayers()
  if (targets.length === 0) return
  const target = host.pickRandomTarget(targets)!
  const roll = Math.random()
  if (roll < BATTLE_RULES.MAGE_AI_MAGIC_ATTACK_CHANCE) {
    host.performSkill(unit, target, 'magic_attack')
  } else if (roll < BATTLE_RULES.MAGE_AI_SPECIAL_SKILL_CHANCE) {
    const skillId = (unit.data as EnemyData).skills.find(s => s !== 'magic_attack' && s !== 'normal_attack') || 'magic_attack'
    host.performSkill(unit, target, skillId)
  } else {
    host.performAttack(unit, target)
  }
  host.nextTurn()
}

function heartShadowTAI(host: BattleAiHost, unit: BattleUnit): void {
  const target = host.pickRandomTarget(host.getLivePlayers())
  if (!target) return
  const action = resolveHeartShadowCopyAction(host.lastPlayerAction, GAME_CONFIG_DATABASE.getTable('skills'))
  if (action.type === 'attack') {
    host.performAttack(unit, target)
  } else if (action.type === 'defend') {
    host.addStatus(unit, BATTLE_STATUS.DEFEND)
    host.log(`${unit.name} 复制了防御姿态。`)
  } else {
    const skill = GAME_CONFIG_DATABASE.getTable('skills')[action.skillId]
    const skillTarget = skill && (skill.target === 'self' || skill.type === 'heal' || skill.type === 'buff') ? unit : target
    host.log(`${unit.name} 映照了上一项行动。`)
    host.performSkill(unit, skillTarget, action.skillId)
  }
  host.nextTurn()
}

function heartShadowHuihuiAI(host: BattleAiHost, unit: BattleUnit): void {
  const chain = host.getLiveEnemies().find(enemy => (enemy.data as EnemyData).id === HEART_SHADOW_ENEMY_IDS.WORRY_CHAIN)
  const skillId = resolveHeartShadowHuihuiSkill(Boolean(chain))
  const target = chain ?? host.pickRandomTarget(host.getLivePlayers())
  if (!target) return
  host.performSkill(unit, target, skillId)
  host.nextTurn()
}

function heartShadowCongcongAI(host: BattleAiHost, unit: BattleUnit): void {
  const target = host.pickRandomTarget(host.getLivePlayers())
  if (!target) return
  if (!host.hasStatus(unit, BATTLE_STATUS.EVASION_UP)) {
    host.performSkill(unit, unit, 'tiefengbu')
  } else {
    host.performSkill(unit, target, 'jingyuezhan')
  }
  host.nextTurn()
}

function heartShadowSunAI(host: BattleAiHost, unit: BattleUnit): void {
  const target = host.pickRandomTarget(host.getLivePlayers())
  if (!target) return
  if (shouldHeartShadowSunCastShield(host.completedRoundCount, host.hasStatus(unit, BATTLE_STATUS.SHIELD))) {
    host.performSkill(unit, unit, 'shengdun')
  } else {
    host.performSkill(unit, target, 'illusion_strike')
  }
  host.nextTurn()
}

function bossBaihuAI(host: BattleAiHost, unit: BattleUnit): void {
  const targets = host.getLivePlayers()
  if (targets.length === 0) return

  const target = host.pickRandomTarget(targets)!
  const hpRatio = unit.stats.hp / unit.stats.maxHp
  const roll = Math.random()
  if (hpRatio < BATTLE_RULES.BAIHU_LOW_HP_RATIO && roll < BATTLE_RULES.BAIHU_HEAVENLY_STRIKE_CHANCE) {
    host.performSkill(unit, target, 'heavenly_strike')
  } else if (!host.hasStatus(unit, BATTLE_STATUS.ROAR) && roll < BATTLE_RULES.BAIHU_ROAR_CHANCE) {
    host.performSkill(unit, unit, 'roar')
  } else {
    host.performSkill(unit, target, 'tiger_claw')
  }
  host.nextTurn()
}

function bossShuiyaoAI(host: BattleAiHost, unit: BattleUnit): void {
  const targets = host.getLivePlayers()
  if (targets.length === 0) return
  const allies = host.units.filter(u => !u.isPlayer && u.stats.hp > 0)
  const woundedAlly = allies.find(u => u.stats.hp / u.stats.maxHp < BATTLE_RULES.SHUIYAO_WOUNDED_ALLY_HP_RATIO)
  const roll = Math.random()
  if (woundedAlly && roll < BATTLE_RULES.SHUIYAO_HEAL_CHANCE) {
    host.performSkill(unit, woundedAlly, 'heal')
  } else if (roll < BATTLE_RULES.SHUIYAO_WATER_CURTAIN_CHANCE && !host.hasStatus(unit, BATTLE_STATUS.WATER_CURTAIN)) {
    host.performSkill(unit, unit, 'water_curtain')
  } else {
    const target = host.pickRandomTarget(targets)!
    host.performSkill(unit, target, 'ice_shard')
  }
  host.nextTurn()
}

function bossFengchiAI(host: BattleAiHost, unit: BattleUnit): void {
  const targets = host.getLivePlayers()
  if (targets.length === 0) return
  const roll = Math.random()
  if (!host.hasStatus(unit, BATTLE_STATUS.WIND_WALL) && roll < BATTLE_RULES.FENGCHI_WIND_WALL_CHANCE) {
    host.performSkill(unit, unit, 'wind_wall')
  } else if (roll < BATTLE_RULES.FENGCHI_GALE_SLASH_CHANCE) {
    const target = host.pickRandomTarget(targets)!
    host.performSkill(unit, target, 'gale_slash')
  } else {
    host.performSkill(unit, targets[0]!, 'feather_storm')
  }
  host.nextTurn()
}

function bossPhoenixAI(host: BattleAiHost, unit: BattleUnit): void {
  const targets = host.getLivePlayers()
  if (targets.length === 0) return
  const roll = Math.random()
  if (roll < BATTLE_RULES.PHOENIX_FIRE_BREATH_CHANCE) {
    host.performSkill(unit, targets[0]!, 'fire_breath')
  } else if (roll < BATTLE_RULES.PHOENIX_WIND_PRESSURE_CHANCE) {
    const target = host.pickRandomTarget(targets)!
    host.performSkill(unit, target, 'wind_pressure')
  } else {
    const target = host.pickRandomTarget(targets)!
    host.performAttack(unit, target)
  }
  host.nextTurn()
}

function bossQilinAI(host: BattleAiHost, unit: BattleUnit): void {
  const targets = host.getLivePlayers()
  if (targets.length === 0) return
  const roll = Math.random()
  if (!host.hasStatus(unit, BATTLE_STATUS.ARMOR_UP) && roll < BATTLE_RULES.QILIN_ARMOR_UP_CHANCE) {
    host.performSkill(unit, unit, 'armor_up')
  } else if (roll < BATTLE_RULES.QILIN_EARTHQUAKE_CHANCE) {
    host.performSkill(unit, targets[0]!, 'earthquake')
  } else {
    const target = host.pickRandomTarget(targets)!
    host.performSkill(unit, target, 'flame_charge')
  }
  host.nextTurn()
}

function bossChiAI(host: BattleAiHost, unit: BattleUnit): void {
  const targets = host.getLivePlayers()
  if (targets.length === 0) return
  const roll = Math.random()
  if (roll < BATTLE_RULES.CHI_POISON_MIST_CHANCE) {
    host.performSkill(unit, targets[0]!, 'poison_mist')
  } else if (roll < BATTLE_RULES.CHI_VENOM_FANG_CHANCE) {
    const target = host.pickRandomTarget(targets)!
    host.performSkill(unit, target, 'venom_fang')
  } else {
    host.performSkill(unit, targets[0]!, 'toxic_burst')
  }
  host.nextTurn()
}

function bossMeiAI(host: BattleAiHost, unit: BattleUnit): void {
  const targets = host.getLivePlayers()
  if (targets.length === 0) return
  const roll = Math.random()
  if (roll < BATTLE_RULES.MEI_CHARM_CHANCE) {
    const target = host.pickRandomTarget(targets)!
    host.performSkill(unit, target, 'charm')
  } else if (roll < BATTLE_RULES.MEI_ILLUSION_STRIKE_CHANCE) {
    const target = host.pickRandomTarget(targets)!
    host.performSkill(unit, target, 'illusion_strike')
  } else {
    host.performSkill(unit, targets[0]!, 'shadow_dance')
  }
  host.nextTurn()
}

function bossWangAI(host: BattleAiHost, unit: BattleUnit): void {
  const targets = host.getLivePlayers()
  if (targets.length === 0) return
  const roll = Math.random()
  if (roll < BATTLE_RULES.WANG_WIND_POISON_CHANCE) {
    host.performSkill(unit, targets[0]!, 'wind_poison')
  } else if (roll < BATTLE_RULES.WANG_FEATHER_DART_CHANCE) {
    const target = host.pickRandomTarget(targets)!
    host.performSkill(unit, target, 'feather_dart')
  } else {
    const target = host.pickRandomTarget(targets)!
    host.performSkill(unit, target, 'aerial_dive')
  }
  host.nextTurn()
}

function bossLiangAI(host: BattleAiHost, unit: BattleUnit): void {
  const targets = host.getLivePlayers()
  if (targets.length === 0) return
  const hpRatio = unit.stats.hp / unit.stats.maxHp
  const roll = Math.random()
  if (hpRatio < BATTLE_RULES.LIANG_LOW_HP_RATIO && roll < BATTLE_RULES.LIANG_FLAME_STOMP_CHANCE) {
    host.performSkill(unit, targets[0]!, 'flame_stomp')
  } else if (roll < BATTLE_RULES.LIANG_ROCK_SMASH_CHANCE) {
    const target = host.pickRandomTarget(targets)!
    host.performSkill(unit, target, 'rock_smash')
  } else {
    const target = host.pickRandomTarget(targets)!
    host.performSkill(unit, target, 'armor_pierce')
  }
  host.nextTurn()
}

function bossFakeXiaoaiAI(host: BattleAiHost, unit: BattleUnit): void {
  const targets = host.getLivePlayers()
  if (targets.length === 0) return
  const roll = Math.random()
  if (roll < BATTLE_RULES.FAKE_XIAOAI_DARK_MIRROR_CHANCE && !host.hasStatus(unit, BATTLE_STATUS.DARK_MIRROR)) {
    host.performSkill(unit, unit, 'dark_mirror')
  } else if (roll < BATTLE_RULES.FAKE_XIAOAI_SHADOW_BLADE_CHANCE) {
    const target = host.pickRandomTarget(targets)!
    host.performSkill(unit, target, 'shadow_blade')
  } else {
    host.performSkill(unit, unit, 'afternoon_tea')
  }
  host.nextTurn()
}

function bossXiaoaiTrueAI(host: BattleAiHost, unit: BattleUnit): void {
  const targets = host.getLivePlayers()
  if (targets.length === 0) return
  const hpRatio = unit.stats.hp / unit.stats.maxHp
  const roll = Math.random()
  if (hpRatio < BATTLE_RULES.XIAOAI_TRUE_LOW_HP_RATIO && roll < BATTLE_RULES.XIAOAI_TRUE_FALLEN_ANGEL_CHANCE) {
    host.performSkill(unit, targets[0]!, 'fallen_angel')
  } else if (roll < BATTLE_RULES.XIAOAI_TRUE_DARK_PURGE_CHANCE) {
    host.performSkill(unit, targets[0]!, 'dark_purge')
  } else if (roll < BATTLE_RULES.XIAOAI_TRUE_SOUL_DRAIN_CHANCE) {
    const target = host.pickRandomTarget(targets)!
    host.performSkill(unit, target, 'soul_drain')
  } else {
    const target = host.pickRandomTarget(targets)!
    host.performSkill(unit, target, 'wind_moon_slash')
  }
  host.nextTurn()
}

function bossWuxiangAI(host: BattleAiHost, unit: BattleUnit): void {
  const targets = host.getLivePlayers()
  if (targets.length === 0) return
  const hpRatio = unit.stats.hp / unit.stats.maxHp
  const roll = Math.random()
  if (hpRatio < BATTLE_RULES.WUXIANG_LOW_HP_RATIO && roll < BATTLE_RULES.WUXIANG_DARK_NOVA_CHANCE) {
    host.performSkill(unit, targets[0]!, 'dark_nova')
  } else if (roll < BATTLE_RULES.WUXIANG_COPY_PARTY_CHANCE) {
    host.performSkill(unit, unit, 'copy_party')
  } else if (roll < BATTLE_RULES.WUXIANG_DEVOUR_PROPHECY_CHANCE) {
    host.performSkill(unit, targets[0]!, 'devour_prophecy')
  } else if (roll < BATTLE_RULES.WUXIANG_HEART_VOID_CHANCE) {
    host.performSkill(unit, targets[0]!, 'heart_void')
  } else {
    const target = host.pickRandomTarget(targets)!
    host.performAttack(unit, target)
  }
  host.nextTurn()
}
