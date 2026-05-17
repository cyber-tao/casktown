import { GameData } from './GameData'
import { SKILLS } from '../data/skills'

interface SkillUnlockCondition {
  skillId: string
  characterId: string
  type: 'level' | 'flag' | 'rebuild' | 'trust' | 'quest'
  value: number | string
  threshold?: number
}

const SKILL_UNLOCKS: SkillUnlockCondition[] = [
  // T skills
  { skillId: 'qizhijian', characterId: 'T', type: 'level', value: 1 },
  { skillId: 'yiqizhi', characterId: 'T', type: 'level', value: 5 },
  { skillId: 'chansizhang', characterId: 'T', type: 'flag', value: 'temple_visited' },
  { skillId: 'baihuquan', characterId: 'T', type: 'flag', value: 'defeated_baihu' },
  { skillId: 'shengdun', characterId: 'T', type: 'flag', value: 'defeated_baihu' },
  { skillId: 'zhuifengdian', characterId: 'T', type: 'level', value: 18 },
  { skillId: 'shouxiangshi', characterId: 'T', type: 'rebuild', value: 2 },
  { skillId: 'jieguangjinghua', characterId: 'T', type: 'flag', value: 'has_sacred_water' },
  { skillId: 'shouxiangxin', characterId: 'T', type: 'flag', value: 'true_route_unlocked' },
  // HUIHUI skills
  { skillId: 'xiubiao', characterId: 'HUIHUI', type: 'level', value: 1 },
  { skillId: 'dushebiao', characterId: 'HUIHUI', type: 'level', value: 6 },
  { skillId: 'huixuanbiao', characterId: 'HUIHUI', type: 'level', value: 8 },
  { skillId: 'yuliaoshu', characterId: 'HUIHUI', type: 'flag', value: 'has_sacred_water' },
  { skillId: 'fengleisan', characterId: 'HUIHUI', type: 'level', value: 14 },
  { skillId: 'huamantianji', characterId: 'HUIHUI', type: 'flag', value: 'temple_visited' },
  { skillId: 'qingxinling', characterId: 'HUIHUI', type: 'flag', value: 'quest_huihui_side' },
  { skillId: 'butaozhiling', characterId: 'HUIHUI', type: 'flag', value: 'true_route_unlocked' },
  // A skills
  { skillId: 'hengzhan', characterId: 'A', type: 'level', value: 1 },
  { skillId: 'zhendizhan', characterId: 'A', type: 'level', value: 7 },
  { skillId: 'dingshenshu', characterId: 'A', type: 'flag', value: 'temple_visited' },
  { skillId: 'guiliandeng', characterId: 'A', type: 'flag', value: 'has_baihu_kai' },
  { skillId: 'nianbi', characterId: 'A', type: 'flag', value: 'has_baihu_kai' },
  { skillId: 'shanbeng', characterId: 'A', type: 'level', value: 20 },
  { skillId: 'shanyuexin', characterId: 'A', type: 'flag', value: 'true_route_unlocked' },
  // CONGCONG skills
  { skillId: 'yufengzhan', characterId: 'CONGCONG', type: 'level', value: 1 },
  { skillId: 'wuhuazhui', characterId: 'CONGCONG', type: 'level', value: 1 },
  { skillId: 'jingyuezhan', characterId: 'CONGCONG', type: 'level', value: 15 },
  { skillId: 'tiefengbu', characterId: 'CONGCONG', type: 'level', value: 16 },
  { skillId: 'pozhankan', characterId: 'CONGCONG', type: 'flag', value: 'quest_congcong_side' },
  { skillId: 'tianjianyishan', characterId: 'CONGCONG', type: 'level', value: 24 },
  { skillId: 'zhenfengbu', characterId: 'CONGCONG', type: 'flag', value: 'true_route_unlocked' },
  // SUN skills
  { skillId: 'shenyu', characterId: 'SUN', type: 'level', value: 1 },
  { skillId: 'zhufu', characterId: 'SUN', type: 'level', value: 1 },
  { skillId: 'jiezhang', characterId: 'SUN', type: 'flag', value: 'life_spring_visited' },
  { skillId: 'zhoushufengsha', characterId: 'SUN', type: 'flag', value: 'temple_visited' },
  { skillId: 'rendeqiyuan', characterId: 'SUN', type: 'flag', value: 'true_route_unlocked' },
  // Combo skills
  { skillId: 'yuexiahuixuan', characterId: 'T', type: 'flag', value: 'has_sacred_water' },
  { skillId: 'fengyuezhixi', characterId: 'T', type: 'flag', value: 'xiaoai_purified' },
]

export class SkillGrowth {
  private static instance: SkillGrowth

  static getInstance(): SkillGrowth {
    if (!SkillGrowth.instance) {
      SkillGrowth.instance = new SkillGrowth()
    }
    return SkillGrowth.instance
  }

  checkUnlocksForCharacter(charId: string): string[] {
    const gd = GameData.getInstance()
    const charData = gd.characters.get(charId)
    if (!charData) return []

    const newlyUnlocked: string[] = []
    for (const cond of SKILL_UNLOCKS) {
      if (cond.characterId !== charId) continue
      if (charData.skills.includes(cond.skillId)) continue
      if (this.isConditionMet(cond)) {
        charData.skills.push(cond.skillId)
        newlyUnlocked.push(cond.skillId)
      }
    }
    return newlyUnlocked
  }

  checkAllUnlocks(): Map<string, string[]> {
    const result = new Map<string, string[]>()
    const gd = GameData.getInstance()
    for (const charId of gd.party) {
      const unlocked = this.checkUnlocksForCharacter(charId)
      if (unlocked.length > 0) result.set(charId, unlocked)
    }
    for (const charId of gd.reserve) {
      const unlocked = this.checkUnlocksForCharacter(charId)
      if (unlocked.length > 0) result.set(charId, unlocked)
    }
    return result
  }

  isConditionMet(cond: SkillUnlockCondition): boolean {
    const gd = GameData.getInstance()
    const charData = gd.characters.get(cond.characterId)
    switch (cond.type) {
      case 'level':
        return (charData?.stats.level || 0) >= (cond.value as number)
      case 'flag':
        return gd.getFlag(cond.value as string) === true
      case 'rebuild':
        return gd.rebuildLevel >= (cond.value as number)
      case 'trust': {
        const trustKey = `trust_${cond.characterId.toLowerCase()}` as keyof typeof gd.branches
        return (gd.branches[trustKey] as number) >= (cond.threshold || 0)
      }
      case 'quest': {
        const quest = gd.quests.get(cond.value as string)
        return quest?.status === 'completed'
      }
      default:
        return false
    }
  }

  getAvailableSkills(charId: string): string[] {
    return SKILL_UNLOCKS
      .filter(c => c.characterId === charId && this.isConditionMet(c))
      .map(c => c.skillId)
  }

  getNextUnlocks(charId: string): SkillUnlockCondition[] {
    const gd = GameData.getInstance()
    const charData = gd.characters.get(charId)
    const currentSkills = charData?.skills || []
    return SKILL_UNLOCKS.filter(c =>
      c.characterId === charId && !currentSkills.includes(c.skillId)
    )
  }
}
