import type { SkillData } from './types'

export const SKILLS: Record<string, SkillData> = {
  // T skills
  qizhijian: {
    id: 'qizhijian', name: '气剑指', type: 'attack', target: 'single',
    element: 'none', power: 25, costMp: 4, costTp: 0,
    description: '无属性单体伤害，较高命中',
  },
  yiqizhi: {
    id: 'yiqizhi', name: '一气指', type: 'attack', target: 'single',
    element: 'none', power: 45, costMp: 8, costTp: 0,
    description: '高暴击，打断蓄力',
  },
  chansizhang: {
    id: 'chansizhang', name: '禅丝掌', type: 'buff', target: 'self',
    element: 'none', power: 0, costMp: 12, costTp: 0,
    description: '1回合吸收远程技能并反击',
  },
  baihuquan: {
    id: 'baihuquan', name: '白虎拳', type: 'attack', target: 'single',
    element: 'earth', power: 60, costMp: 10, costTp: 0,
    description: '土/无属性重击，破势高',
  },
  shengdun: {
    id: 'shengdun', name: '神盾', type: 'buff', target: 'all',
    element: 'light', power: 0, costMp: 16, costTp: 0,
    description: '全体减伤25%，持续2回合',
  },
  zhuifengdian: {
    id: 'zhuifengdian', name: '追风点', type: 'attack', target: 'random',
    element: 'none', power: 15, costMp: 0, costTp: 40,
    description: '随机6-10次攻击',
  },
  shouxiangshi: {
    id: 'shouxiangshi', name: '守乡誓', type: 'buff', target: 'all',
    element: 'none', power: 0, costMp: 0, costTp: 50,
    description: '全体攻击、防御上升',
  },
  jieguangjinghua: {
    id: 'jieguangjinghua', name: '戒光净化', type: 'special', target: 'single',
    element: 'light', power: 80, costMp: 0, costTp: 100,
    description: '驱散黑暗状态，Boss特定阶段必需',
  },

  // 慧慧 skills
  xiubiao: {
    id: 'xiubiao', name: '袖镖', type: 'attack', target: 'single',
    element: 'wind', power: 20, costMp: 3, costTp: 0,
    description: '风属性小伤害',
  },
  dushebiao: {
    id: 'dushebiao', name: '毒蛇镖', type: 'attack', target: 'single',
    element: 'wind', power: 30, costMp: 6, costTp: 0,
    description: '伤害+中毒',
  },
  huixuanbiao: {
    id: 'huixuanbiao', name: '回旋镖', type: 'attack', target: 'single',
    element: 'wind', power: 35, costMp: 8, costTp: 0,
    description: '攻击两名敌人', targetCount: 2,
  },
  yuliaoshu: {
    id: 'yuliaoshu', name: '御疗术', type: 'heal', target: 'single',
    element: 'water', power: 60, costMp: 10, costTp: 0,
    description: '单体中量回复',
  },
  fengleisan: {
    id: 'fengleisan', name: '风雷散', type: 'attack', target: 'all',
    element: 'wind', power: 40, costMp: 14, costTp: 0,
    description: '风属性群攻，打断飞行',
  },
  huamantianji: {
    id: 'huamantianji', name: '花漫天际', type: 'attack', target: 'all',
    element: 'wind', power: 55, costMp: 0, costTp: 50,
    description: '群体多段伤害，附带命中下降',
  },
  qingxinling: {
    id: 'qingxinling', name: '清心铃', type: 'heal', target: 'single',
    element: 'light', power: 0, costMp: 12, costTp: 0,
    description: '解除迷惘、魅惑、恐惧',
  },

  // A skills
  hengzhan: {
    id: 'hengzhan', name: '横斩', type: 'attack', target: 'single',
    element: 'none', power: 28, costMp: 4, costTp: 0,
    description: '大刀物理伤害',
  },
  zhendizhan: {
    id: 'zhendizhan', name: '震地斩', type: 'attack', target: 'all',
    element: 'earth', power: 35, costMp: 9, costTp: 0,
    description: '土属性，低概率眩晕',
  },
  dingshenshu: {
    id: 'dingshenshu', name: '定神术', type: 'debuff', target: 'single',
    element: 'none', power: 0, costMp: 8, costTp: 0,
    description: '单体速度下降/我方稳定身形',
  },
  guiliandeng: {
    id: 'guiliandeng', name: '鬼莲灯', type: 'buff', target: 'self',
    element: 'fire', power: 0, costMp: 12, costTp: 0,
    description: '吸引敌人攻击，反击火焰',
  },
  nianbi: {
    id: 'nianbi', name: '念壁', type: 'buff', target: 'all',
    element: 'none', power: 0, costMp: 14, costTp: 0,
    description: '护盾，抵御一次强击',
  },
  shanbeng: {
    id: 'shanbeng', name: '山崩', type: 'attack', target: 'single',
    element: 'earth', power: 90, costMp: 0, costTp: 50,
    description: '高破势、高仇恨',
  },

  // 葱葱 skills
  yufengzhan: {
    id: 'yufengzhan', name: '御风斩', type: 'attack', target: 'single',
    element: 'wind', power: 30, costMp: 5, costTp: 0,
    description: '风属性剑击',
  },
  wuhuazhui: {
    id: 'wuhuazhui', name: '舞花坠', type: 'attack', target: 'random',
    element: 'wind', power: 20, costMp: 12, costTp: 0,
    description: '多段剑气，随机目标',
  },
  jingyuezhan: {
    id: 'jingyuezhan', name: '惊月斩', type: 'attack', target: 'single',
    element: 'wind', power: 55, costMp: 14, costTp: 0,
    description: '高暴击，攻击飞行敌人有效',
  },
  tiefengbu: {
    id: 'tiefengbu', name: '贴风步', type: 'buff', target: 'self',
    element: 'wind', power: 0, costMp: 8, costTp: 0,
    description: '闪避+40%，持续2回合',
  },
  pozhankan: {
    id: 'pozhankan', name: '破绽看穿', type: 'debuff', target: 'single',
    element: 'none', power: 0, costMp: 10, costTp: 0,
    description: '暴露敌人弱点，破势获取+20%',
  },
  tianjianyishan: {
    id: 'tianjianyishan', name: '天剑一闪', type: 'attack', target: 'single',
    element: 'wind', power: 100, costMp: 0, costTp: 70,
    description: '先制强击，若击杀则再次行动', grantsExtraTurnOnKill: true,
  },

  // Enemy basic skills
  normal_attack: {
    id: 'normal_attack', name: '普通攻击', type: 'attack', target: 'single',
    element: 'none', power: 10, costMp: 0, costTp: 0,
    description: '普通物理攻击',
  },
  magic_attack: {
    id: 'magic_attack', name: '魔法攻击', type: 'magic', target: 'single',
    element: 'none', power: 12, costMp: 0, costTp: 0,
    description: '普通魔法攻击',
  },
  bind: {
    id: 'bind', name: '缠绕', type: 'debuff', target: 'single',
    element: 'wood', power: 0, costMp: 5, costTp: 0,
    description: '降低目标速度',
  },
  poison_bite: {
    id: 'poison_bite', name: '毒咬', type: 'attack', target: 'single',
    element: 'wood', power: 15, costMp: 5, costTp: 0,
    description: '伤害并中毒',
  },
  surprise_attack: {
    id: 'surprise_attack', name: '突袭', type: 'attack', target: 'single',
    element: 'none', power: 25, costMp: 0, costTp: 0,
    description: '出其不意的重击',
  },
  split: {
    id: 'split', name: '分裂', type: 'magic', target: 'single',
    element: 'water', power: 18, costMp: 10, costTp: 0,
    description: '水属性攻击',
  },
  shield_bash: {
    id: 'shield_bash', name: '盾击', type: 'attack', target: 'single',
    element: 'wind', power: 20, costMp: 8, costTp: 0,
    description: '用盾牌猛击',
  },
  counter: {
    id: 'counter', name: '反击姿态', type: 'buff', target: 'self',
    element: 'none', power: 0, costMp: 5, costTp: 0,
    description: '进入反击状态',
  },
  crystal_drain: {
    id: 'crystal_drain', name: '水晶吸取', type: 'magic', target: 'single',
    element: 'water', power: 25, costMp: 10, costTp: 0,
    description: '吸取生命',
  },
  confuse: {
    id: 'confuse', name: '迷惑', type: 'debuff', target: 'single',
    element: 'dark', power: 0, costMp: 8, costTp: 0,
    description: '使目标迷惑',
  },
  water_splash: {
    id: 'water_splash', name: '水花弹', type: 'attack', target: 'single',
    element: 'water', power: 12, costMp: 3, costTp: 0,
    description: '水属性攻击',
  },
  heal: {
    id: 'heal', name: '治疗', type: 'heal', target: 'self',
    element: 'none', power: 30, costMp: 8, costTp: 0,
    description: '恢复自身HP',
  },

  // Boss skills
  tiger_claw: {
    id: 'tiger_claw', name: '虎爪', type: 'attack', target: 'single',
    element: 'none', power: 45, costMp: 0, costTp: 0,
    description: '白虎的强力爪击',
  },
  roar: {
    id: 'roar', name: '虎啸', type: 'buff', target: 'self',
    element: 'none', power: 0, costMp: 10, costTp: 0,
    description: '提升自身攻击力',
  },
  heavenly_strike: {
    id: 'heavenly_strike', name: '天雷破', type: 'magic', target: 'single',
    element: 'thunder', power: 60, costMp: 20, costTp: 0,
    description: '从天而降的雷击',
  },
  water_curtain: {
    id: 'water_curtain', name: '水幕', type: 'buff', target: 'self',
    element: 'water', power: 0, costMp: 12, costTp: 0,
    description: '用水幕提升防御',
  },
  ice_shard: {
    id: 'ice_shard', name: '冰棱', type: 'magic', target: 'single',
    element: 'water', power: 40, costMp: 10, costTp: 0,
    description: '锋利的冰棱攻击',
  },
  wind_wall: {
    id: 'wind_wall', name: '风壁', type: 'buff', target: 'self',
    element: 'wind', power: 0, costMp: 10, costTp: 0,
    description: '风之护盾',
  },
  gale_slash: {
    id: 'gale_slash', name: '疾风斩', type: 'attack', target: 'single',
    element: 'wind', power: 50, costMp: 0, costTp: 0,
    description: '迅猛的风斩',
  },
  feather_storm: {
    id: 'feather_storm', name: '羽风暴', type: 'magic', target: 'all',
    element: 'wind', power: 30, costMp: 20, costTp: 0,
    description: '羽毛风暴席卷全体',
  },
  fire_breath: {
    id: 'fire_breath', name: '火焰吐息', type: 'magic', target: 'all',
    element: 'fire', power: 35, costMp: 20, costTp: 0,
    description: '灼烧一切的火焰',
  },
  wind_pressure: {
    id: 'wind_pressure', name: '风压', type: 'magic', target: 'single',
    element: 'wind', power: 45, costMp: 12, costTp: 0,
    description: '压缩空气重击',
  },
  rebirth: {
    id: 'rebirth', name: '涅槃', type: 'special', target: 'self',
    element: 'fire', power: 0, costMp: 0, costTp: 0,
    description: '死亡时复活一次',
  },
  earthquake: {
    id: 'earthquake', name: '地震', type: 'magic', target: 'all',
    element: 'earth', power: 40, costMp: 25, costTp: 0,
    description: '大地震动攻击全体',
  },
  flame_charge: {
    id: 'flame_charge', name: '烈焰冲撞', type: 'attack', target: 'single',
    element: 'fire', power: 55, costMp: 0, costTp: 0,
    description: '火焰包裹的猛冲',
  },
  armor_up: {
    id: 'armor_up', name: '装甲强化', type: 'buff', target: 'self',
    element: 'earth', power: 0, costMp: 10, costTp: 0,
    description: '提升防御力',
  },

  // sun skills
  shenyu: {
    id: 'shenyu', name: '神谕', type: 'debuff', target: 'single',
    element: 'light', power: 0, costMp: 10, costTp: 0,
    description: '显示敌人弱点，提升命中',
  },
  zhufu: {
    id: 'zhufu', name: '祝福', type: 'heal', target: 'single',
    element: 'light', power: 50, costMp: 12, costTp: 0,
    description: '回复+攻击提升',
  },
  jiezhang: {
    id: 'jiezhang', name: '界障', type: 'buff', target: 'all',
    element: 'light', power: 0, costMp: 18, costTp: 0,
    description: '全体护盾，抵御魔法',
  },
  zhoushufengsha: {
    id: 'zhoushufengsha', name: '纣术封杀', type: 'debuff', target: 'single',
    element: 'light', power: 0, costMp: 20, costTp: 0,
    description: '降低Boss行动速度，非完全控制',
  },
  wushenzhaohuan_qing: {
    id: 'wushenzhaohuan_qing', name: '五神召唤·青', type: 'special', target: 'all',
    element: 'water', power: 55, costMp: 0, costTp: 50,
    description: '水木之力攻击全体敌人，并为全队解毒',
  },
  wushenzhaohuan_bai: {
    id: 'wushenzhaohuan_bai', name: '五神召唤·白', type: 'buff', target: 'all',
    element: 'earth', power: 0, costMp: 0, costTp: 50,
    description: '全体防御提升并获得反击姿态',
  },
  wushenzhaohuan_zhu: {
    id: 'wushenzhaohuan_zhu', name: '五神召唤·朱', type: 'magic', target: 'all',
    element: 'fire', power: 75, costMp: 0, costTp: 50,
    description: '朱雀之火对全体敌人造成爆发伤害',
  },
  wushenzhaohuan_xuan: {
    id: 'wushenzhaohuan_xuan', name: '五神召唤·玄', type: 'special', target: 'all',
    element: 'water', power: 0, costMp: 0, costTp: 50,
    description: '为全队施加护盾，并降低全体敌人速度',
  },
  wushenzhaohuan_si: {
    id: 'wushenzhaohuan_si', name: '五神召唤·祀', type: 'special', target: 'all',
    element: 'light', power: 90, costMp: 0, costTp: 100,
    description: '祀神之光净化全队，并攻击全体敌人',
  },

  // 魑魅魍魉技能
  poison_mist: {
    id: 'poison_mist', name: '毒雾弥漫', type: 'magic', target: 'all',
    element: 'wood', power: 25, costMp: 15, costTp: 0,
    description: '全体毒属性伤害，概率中毒',
  },
  venom_fang: {
    id: 'venom_fang', name: '毒牙噬', type: 'attack', target: 'single',
    element: 'wood', power: 45, costMp: 10, costTp: 0,
    description: '强力毒击，高概率中毒',
  },
  toxic_burst: {
    id: 'toxic_burst', name: '剧毒爆发', type: 'magic', target: 'all',
    element: 'wood', power: 55, costMp: 30, costTp: 0,
    description: '全体剧毒爆发，中毒者额外伤害',
  },
  charm: {
    id: 'charm', name: '魅惑之瞳', type: 'debuff', target: 'single',
    element: 'dark', power: 0, costMp: 12, costTp: 0,
    description: '魅惑目标攻击队友',
  },
  illusion_strike: {
    id: 'illusion_strike', name: '幻梦击', type: 'magic', target: 'single',
    element: 'dark', power: 50, costMp: 18, costTp: 0,
    description: '黑暗幻术攻击',
  },
  shadow_dance: {
    id: 'shadow_dance', name: '影舞', type: 'attack', target: 'random',
    element: 'dark', power: 20, costMp: 15, costTp: 0,
    description: '暗影多段随机攻击',
  },
  feather_dart: {
    id: 'feather_dart', name: '飞羽毒箭', type: 'attack', target: 'single',
    element: 'wind', power: 40, costMp: 10, costTp: 0,
    description: '带毒飞羽射击',
  },
  wind_poison: {
    id: 'wind_poison', name: '毒风旋', type: 'magic', target: 'all',
    element: 'wind', power: 30, costMp: 20, costTp: 0,
    description: '风毒混合全体攻击',
  },
  aerial_dive: {
    id: 'aerial_dive', name: '俯冲毒击', type: 'attack', target: 'single',
    element: 'wind', power: 60, costMp: 15, costTp: 0,
    description: '高空俯冲重击',
  },
  flame_stomp: {
    id: 'flame_stomp', name: '烈焰践踏', type: 'attack', target: 'all',
    element: 'fire', power: 40, costMp: 20, costTp: 0,
    description: '火焰践踏全体',
  },
  rock_smash: {
    id: 'rock_smash', name: '碎岩拳', type: 'attack', target: 'single',
    element: 'earth', power: 55, costMp: 12, costTp: 0,
    description: '重击破甲',
  },
  armor_pierce: {
    id: 'armor_pierce', name: '破甲冲击', type: 'attack', target: 'single',
    element: 'earth', power: 50, costMp: 15, costTp: 0,
    description: '无视部分防御',
  },

  // 假xiaoai技能
  shadow_blade: {
    id: 'shadow_blade', name: '影刃', type: 'attack', target: 'single',
    element: 'dark', power: 50, costMp: 0, costTp: 0,
    description: '暗影剑击',
  },
  dark_mirror: {
    id: 'dark_mirror', name: '暗镜', type: 'buff', target: 'self',
    element: 'dark', power: 0, costMp: 20, costTp: 0,
    description: '反射部分伤害',
  },
  afternoon_tea: {
    id: 'afternoon_tea', name: '下午茶', type: 'special', target: 'self',
    element: 'dark', power: 0, costMp: 30, costTp: 0,
    description: '恢复HP并强化自身',
  },

  // xiaoai真身技能
  wind_moon_slash: {
    id: 'wind_moon_slash', name: '风月斩', type: 'attack', target: 'single',
    element: 'dark', power: 65, costMp: 0, costTp: 0,
    description: '风与月的双剑斩击',
  },
  dark_purge: {
    id: 'dark_purge', name: '暗蚀', type: 'magic', target: 'all',
    element: 'dark', power: 45, costMp: 25, costTp: 0,
    description: '黑暗侵蚀全体',
  },
  soul_drain: {
    id: 'soul_drain', name: '噬魂', type: 'magic', target: 'single',
    element: 'dark', power: 55, costMp: 20, costTp: 0,
    description: '吸取生命与MP',
  },
  fallen_angel: {
    id: 'fallen_angel', name: '堕天', type: 'special', target: 'all',
    element: 'dark', power: 80, costMp: 50, costTp: 0,
    description: '堕天使的终极一击',
  },

  // 无相技能
  copy_party: {
    id: 'copy_party', name: '镜像复制', type: 'special', target: 'all',
    element: 'dark', power: 0, costMp: 30, costTp: 0,
    description: '复制我方队伍',
  },
  devour_prophecy: {
    id: 'devour_prophecy', name: '吞噬预言', type: 'magic', target: 'all',
    element: 'dark', power: 50, costMp: 40, costTp: 0,
    description: '吞噬希望的全体攻击',
  },
  heart_void: {
    id: 'heart_void', name: '心之虚', type: 'debuff', target: 'all',
    element: 'dark', power: 0, costMp: 35, costTp: 0,
    description: '全体恐惧与能力下降',
  },
  dark_nova: {
    id: 'dark_nova', name: '暗星爆发', type: 'magic', target: 'all',
    element: 'dark', power: 90, costMp: 60, costTp: 0,
    description: '暗之新星毁灭一切',
  },

  // Endgame ultimate skills
  shouxiangxin: {
    id: 'shouxiangxin', name: '守乡心', type: 'special', target: 'self',
    element: 'none', power: 0, costMp: 20, costTp: 50,
    description: 'T的终极大技，守护家乡的决心',
  },
  butaozhiling: {
    id: 'butaozhiling', name: '不逃之铃', type: 'buff', target: 'all',
    element: 'none', power: 0, costMp: 15, costTp: 40,
    description: '慧慧的终极技，全员速度提升',
  },
  shanyuexin: {
    id: 'shanyuexin', name: '山岳心', type: 'buff', target: 'self',
    element: 'earth', power: 0, costMp: 20, costTp: 50,
    description: '阿博的终极技，防御大幅提升',
  },
  zhenfengbu: {
    id: 'zhenfengbu', name: '真风步', type: 'attack', target: 'all',
    element: 'wind', power: 80, costMp: 25, costTp: 50,
    description: '葱葱的终极技，真风之力席卷全场',
  },
  rendeqiyuan: {
    id: 'rendeqiyuan', name: '人的祈愿', type: 'special', target: 'all',
    element: 'light', power: 0, costMp: 30, costTp: 80,
    description: 'sun的终极祈祷，全员回复与强化',
  },
  // Combo skills
  fengleisanhua: {
    id: 'fengleisanhua', name: '风雷散华', type: 'attack', target: 'all',
    element: 'wind', power: 70, costMp: 0, costTp: 50,
    description: '慧慧与葱葱的连携技，风雷交织的全体攻击',
  },
  shouxiangshuangji: {
    id: 'shouxiangshuangji', name: '守乡双击', type: 'attack', target: 'single',
    element: 'none', power: 80, costMp: 0, costTp: 50,
    description: 'T与阿博的连携技，守护家乡的双人强击',
  },
  shendunzhen: {
    id: 'shendunzhen', name: '神盾阵', type: 'buff', target: 'all',
    element: 'light', power: 0, costMp: 0, costTp: 50,
    description: '阿博与sun的连携技，全体防御大幅提升',
  },
  yuyanzhiren: {
    id: 'yuyanzhiren', name: '预言之刃', type: 'attack', target: 'single',
    element: 'light', power: 90, costMp: 0, costTp: 50,
    description: 'T与sun的连携技，神圣预言之刃',
  },
  fengyuezhixi: {
    id: 'fengyuezhixi', name: '风月止息', type: 'special', target: 'single',
    element: 'light', power: 200, costMp: 50, costTp: 100,
    description: 'T 与 xiaoai 的连携奥义',
  },
  yuexiahuixuan: {
    id: 'yuexiahuixuan', name: '月下回旋', type: 'attack', target: 'all',
    element: 'moon', power: 100, costMp: 35, costTp: 60,
    description: '慧慧与T的连携技',
  },
}
