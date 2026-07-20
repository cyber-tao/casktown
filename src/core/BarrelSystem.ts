import { GameData } from './GameData'
import { BARREL_DUNGEON_ENTRANCES, BARREL_NO_ESCAPE_MAP_IDS } from '../utils/constants'

export type BarrelColor = 'green' | 'blue' | 'gold' | 'cyan' | 'white' | 'vermillion' | 'black' | 'rainbow'

interface BarrelAbility {
  color: BarrelColor
  name: string
  mapEffect: string
  battleEffect: string
  battleDescription: string
  unlockFlag: string
}

const BARREL_ABILITIES: BarrelAbility[] = [
  { color: 'green', name: '绿桶·生机', mapEffect: 'activate_seed_mechanism', battleEffect: 'heal_poison', battleDescription: '回复少量HP，解除中毒', unlockFlag: 'barrel_green' },
  { color: 'blue', name: '蓝桶·清泉', mapEffect: 'purify_water', battleEffect: 'restore_mp', battleDescription: '回复MP，解除灼烧', unlockFlag: 'barrel_blue' },
  { color: 'gold', name: '金桶·圣光', mapEffect: 'open_holy_door', battleEffect: 'light_shield', battleDescription: '光属性护盾', unlockFlag: 'barrel_gold' },
  { color: 'cyan', name: '青桶·驱毒', mapEffect: 'disperse_poison_fog', battleEffect: 'immunity_poison', battleDescription: '免疫毒3回合', unlockFlag: 'barrel_cyan' },
  { color: 'white', name: '白桶·坚壁', mapEffect: 'open_stone_door', battleEffect: 'defense_up', battleDescription: '防御提升', unlockFlag: 'barrel_white' },
  { color: 'vermillion', name: '朱桶·烈焰', mapEffect: 'light_fire', battleEffect: 'fire_counter', battleDescription: '火属性反击', unlockFlag: 'barrel_vermillion' },
  { color: 'black', name: '玄桶·镇压', mapEffect: 'hold_mechanism', battleEffect: 'taunt_damage_reduce', battleDescription: '嘲讽+减伤', unlockFlag: 'barrel_black' },
  { color: 'rainbow', name: '虹桶·共鸣', mapEffect: 'enter_abyss', battleEffect: 'ultimate_resonance', battleDescription: '全队共鸣，终极技条件', unlockFlag: 'barrel_rainbow' },
]

export class BarrelSystem {
  private static instance: BarrelSystem

  static getInstance(): BarrelSystem {
    if (!BarrelSystem.instance) {
      BarrelSystem.instance = new BarrelSystem()
    }
    return BarrelSystem.instance
  }

  getUnlockedColors(): BarrelColor[] {
    const gd = GameData.getInstance()
    return BARREL_ABILITIES.filter(b => gd.getFlag(b.unlockFlag) === true).map(b => b.color)
  }

  isUnlocked(color: BarrelColor): boolean {
    return GameData.getInstance().getFlag(`barrel_${color}`) === true
  }

  unlock(color: BarrelColor): void {
    GameData.getInstance().setFlag(`barrel_${color}`, true)
  }

  getAbility(color: BarrelColor): BarrelAbility | undefined {
    return BARREL_ABILITIES.find(b => b.color === color)
  }

  getAllAbilities(): BarrelAbility[] {
    return BARREL_ABILITIES
  }

  useBattleBarrel(color: BarrelColor): { success: boolean; effect: string } {
    if (!this.isUnlocked(color)) return { success: false, effect: '' }
    const ability = this.getAbility(color)
    if (!ability) return { success: false, effect: '' }
    return { success: true, effect: ability.battleEffect }
  }

  canEscapeDungeon(mapId: string): boolean {
    if ((BARREL_NO_ESCAPE_MAP_IDS as readonly string[]).includes(mapId)) return false
    return this.getUnlockedColors().length > 0
  }

  getDungeonEntrance(mapId: string): string | null {
    return BARREL_DUNGEON_ENTRANCES[mapId] || null
  }
}
