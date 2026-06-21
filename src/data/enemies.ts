import type { EnemyData } from './types'

export const ENEMIES: Record<string, EnemyData> = {
  xiao_yao: {
    id: 'xiao_yao', name: '小妖怪',
    stats: { hp: 60, maxHp: 60, mp: 0, maxMp: 0, atk: 12, def: 6, matk: 0, mdef: 4, speed: 10, level: 1, exp: 15, expToNext: 0 },
    skills: ['normal_attack'],
    element: 'none', weakness: ['wind', 'light'], resistance: [],
    drops: [{ itemId: 'heal_grass', rate: 0.3 }],
    exp: 15, gold: 8, isBoss: false, aiType: 'basic',
  },
  teng_yao: {
    id: 'teng_yao', name: '藤妖',
    stats: { hp: 80, maxHp: 80, mp: 20, maxMp: 20, atk: 14, def: 8, matk: 8, mdef: 6, speed: 8, level: 2, exp: 25, expToNext: 0 },
    skills: ['normal_attack', 'bind'],
    element: 'wood', weakness: ['fire'], resistance: ['water'],
    drops: [{ itemId: 'heal_grass', rate: 0.4 }, { itemId: 'antidote', rate: 0.2 }],
    exp: 25, gold: 12, isBoss: false, aiType: 'basic',
  },
  du_ye_chong: {
    id: 'du_ye_chong', name: '毒叶虫',
    stats: { hp: 50, maxHp: 50, mp: 15, maxMp: 15, atk: 10, def: 4, matk: 6, mdef: 3, speed: 12, level: 2, exp: 20, expToNext: 0 },
    skills: ['normal_attack', 'poison_bite'],
    element: 'wood', weakness: ['wind', 'fire'], resistance: [],
    drops: [{ itemId: 'antidote', rate: 0.5 }],
    exp: 20, gold: 10, isBoss: false, aiType: 'basic',
  },
  barrel_fake: {
    id: 'barrel_fake', name: '木桶伪装怪',
    stats: { hp: 100, maxHp: 100, mp: 0, maxMp: 0, atk: 16, def: 12, matk: 0, mdef: 8, speed: 6, level: 3, exp: 35, expToNext: 0 },
    skills: ['normal_attack', 'surprise_attack'],
    element: 'none', weakness: ['light'], resistance: ['dark'],
    drops: [{ itemId: 'barrel_cookie', rate: 0.3 }, { itemId: 'heal_grass', rate: 0.5 }],
    exp: 35, gold: 20, isBoss: false, aiType: 'basic',
  },
  xiao_shuidi: {
    id: 'xiao_shuidi', name: '小水滴',
    stats: { hp: 70, maxHp: 70, mp: 30, maxMp: 30, atk: 8, def: 6, matk: 14, mdef: 10, speed: 9, level: 5, exp: 30, expToNext: 0 },
    skills: ['water_splash', 'split'],
    element: 'water', weakness: ['thunder', 'wood'], resistance: ['fire'],
    drops: [{ itemId: 'holy_drop', rate: 0.3 }],
    exp: 30, gold: 15, isBoss: false, aiType: 'basic',
  },
  feng_defender: {
    id: 'feng_defender', name: '风之防御人',
    stats: { hp: 120, maxHp: 120, mp: 40, maxMp: 40, atk: 12, def: 18, matk: 6, mdef: 14, speed: 7, level: 6, exp: 40, expToNext: 0 },
    skills: ['normal_attack', 'shield_bash', 'counter'],
    element: 'wind', weakness: ['earth'], resistance: ['wind'],
    drops: [{ itemId: 'heal_grass', rate: 0.4 }, { itemId: 'amulet', rate: 0.15 }],
    exp: 40, gold: 25, isBoss: false, aiType: 'defensive',
  },
  crystal_parasite: {
    id: 'crystal_parasite', name: '水晶寄生体',
    stats: { hp: 90, maxHp: 90, mp: 50, maxMp: 50, atk: 6, def: 8, matk: 18, mdef: 20, speed: 11, level: 7, exp: 45, expToNext: 0 },
    skills: ['magic_attack', 'crystal_drain'],
    element: 'water', weakness: ['none', 'earth'], resistance: ['water', 'ice'],
    drops: [{ itemId: 'holy_drop', rate: 0.4 }],
    exp: 45, gold: 30, isBoss: false, aiType: 'mage',
  },

  miwang_ying: {
    id: 'miwang_ying', name: '迷惘影',
    stats: { hp: 90, maxHp: 90, mp: 40, maxMp: 40, atk: 14, def: 8, matk: 16, mdef: 12, speed: 13, level: 4, exp: 35, expToNext: 0 },
    skills: ['magic_attack', 'confuse'],
    element: 'dark', weakness: ['light'], resistance: ['dark'],
    drops: [{ itemId: 'clear_bell', rate: 0.3 }],
    exp: 35, gold: 18, isBoss: false, aiType: 'mage',
  },

  // Bosses
  baihu: {
    id: 'baihu', name: '白虎',
    stats: { hp: 500, maxHp: 500, mp: 80, maxMp: 80, atk: 28, def: 20, matk: 12, mdef: 16, speed: 14, level: 8, exp: 200, expToNext: 0 },
    skills: ['tiger_claw', 'roar', 'heavenly_strike'],
    element: 'none', weakness: [], resistance: ['earth'],
    drops: [{ itemId: 'baihu_kai', rate: 1.0 }],
    exp: 200, gold: 100, isBoss: true, aiType: 'boss_baihu',
  },
  shui_yao: {
    id: 'shui_yao', name: '水瑶',
    stats: { hp: 400, maxHp: 400, mp: 120, maxMp: 120, atk: 14, def: 14, matk: 24, mdef: 22, speed: 13, level: 10, exp: 150, expToNext: 0 },
    skills: ['water_curtain', 'heal', 'ice_shard'],
    element: 'water', weakness: ['thunder'], resistance: ['fire', 'water'],
    drops: [], exp: 150, gold: 80, isBoss: true, aiType: 'boss_shuiyao',
  },
  feng_chi: {
    id: 'feng_chi', name: '风赤',
    stats: { hp: 380, maxHp: 380, mp: 100, maxMp: 100, atk: 22, def: 12, matk: 18, mdef: 14, speed: 18, level: 10, exp: 150, expToNext: 0 },
    skills: ['wind_wall', 'gale_slash', 'feather_storm'],
    element: 'wind', weakness: ['earth'], resistance: ['wind'],
    drops: [], exp: 150, gold: 80, isBoss: true, aiType: 'boss_fengchi',
  },
  fenghuang: {
    id: 'fenghuang', name: '凤凰',
    stats: { hp: 600, maxHp: 600, mp: 150, maxMp: 150, atk: 26, def: 16, matk: 28, mdef: 20, speed: 20, level: 15, exp: 300, expToNext: 0 },
    skills: ['fire_breath', 'wind_pressure', 'rebirth'],
    element: 'fire', weakness: ['water'], resistance: ['fire', 'wind'],
    drops: [], exp: 300, gold: 150, isBoss: true, aiType: 'boss_phoenix',
  },
  qilin: {
    id: 'qilin', name: '麒麟',
    stats: { hp: 700, maxHp: 700, mp: 120, maxMp: 120, atk: 30, def: 26, matk: 20, mdef: 24, speed: 12, level: 15, exp: 350, expToNext: 0 },
    skills: ['earthquake', 'flame_charge', 'armor_up'],
    element: 'earth', weakness: ['wind'], resistance: ['earth', 'fire'],
    drops: [], exp: 350, gold: 150, isBoss: true, aiType: 'boss_qilin',
  },

  // 四封印 Boss: 魑魅魍魉
  chi: {
    id: 'chi', name: '魑',
    stats: { hp: 800, maxHp: 800, mp: 150, maxMp: 150, atk: 28, def: 20, matk: 32, mdef: 22, speed: 16, level: 18, exp: 400, expToNext: 0 },
    skills: ['poison_mist', 'venom_fang', 'toxic_burst'],
    element: 'wood', weakness: ['fire', 'light'], resistance: ['wood', 'water'],
    drops: [{ itemId: 'seal_qinglong', rate: 1.0 }], exp: 400, gold: 200, isBoss: true, aiType: 'boss_chi',
  },
  mei: {
    id: 'mei', name: '魅',
    stats: { hp: 750, maxHp: 750, mp: 180, maxMp: 180, atk: 22, def: 18, matk: 35, mdef: 28, speed: 20, level: 19, exp: 420, expToNext: 0 },
    skills: ['charm', 'illusion_strike', 'shadow_dance'],
    element: 'dark', weakness: ['light'], resistance: ['dark'],
    drops: [{ itemId: 'seal_baihu', rate: 1.0 }], exp: 420, gold: 200, isBoss: true, aiType: 'boss_mei',
  },
  wang: {
    id: 'wang', name: '魍',
    stats: { hp: 720, maxHp: 720, mp: 140, maxMp: 140, atk: 30, def: 16, matk: 28, mdef: 20, speed: 22, level: 20, exp: 440, expToNext: 0 },
    skills: ['feather_dart', 'wind_poison', 'aerial_dive'],
    element: 'wind', weakness: ['thunder', 'earth'], resistance: ['wind'],
    drops: [{ itemId: 'seal_zhuque', rate: 1.0 }], exp: 440, gold: 200, isBoss: true, aiType: 'boss_wang',
  },
  liang: {
    id: 'liang', name: '魉',
    stats: { hp: 900, maxHp: 900, mp: 100, maxMp: 100, atk: 35, def: 30, matk: 20, mdef: 26, speed: 10, level: 21, exp: 460, expToNext: 0 },
    skills: ['flame_stomp', 'rock_smash', 'armor_pierce'],
    element: 'fire', weakness: ['water'], resistance: ['fire', 'earth'],
    drops: [{ itemId: 'seal_xuanwu', rate: 1.0 }], exp: 460, gold: 200, isBoss: true, aiType: 'boss_liang',
  },

  // 魔宫 Boss
  fake_xiaoai: {
    id: 'fake_xiaoai', name: 'xiaoai之影',
    stats: { hp: 1000, maxHp: 1000, mp: 200, maxMp: 200, atk: 32, def: 24, matk: 30, mdef: 24, speed: 18, level: 27, exp: 600, expToNext: 0 },
    skills: ['shadow_blade', 'dark_mirror', 'afternoon_tea'],
    element: 'dark', weakness: ['light'], resistance: ['dark'],
    drops: [], exp: 600, gold: 300, isBoss: true, aiType: 'boss_fake_xiaoai',
  },
  xiaoai_true: {
    id: 'xiaoai_true', name: 'xiaoai真身',
    stats: { hp: 1500, maxHp: 1500, mp: 300, maxMp: 300, atk: 40, def: 28, matk: 38, mdef: 30, speed: 24, level: 28, exp: 800, expToNext: 0 },
    skills: ['wind_moon_slash', 'dark_purge', 'soul_drain', 'fallen_angel'],
    element: 'dark', weakness: ['light'], resistance: ['dark', 'wind'],
    drops: [{ itemId: 'xiaoai_light', rate: 1.0 }], exp: 800, gold: 400, isBoss: true, aiType: 'boss_xiaoai_true',
  },

  // 真结局最终 Boss
  wuxiang: {
    id: 'wuxiang', name: '无相',
    stats: { hp: 2500, maxHp: 2500, mp: 400, maxMp: 400, atk: 45, def: 35, matk: 42, mdef: 38, speed: 20, level: 30, exp: 1200, expToNext: 0 },
    skills: ['copy_party', 'devour_prophecy', 'heart_void', 'dark_nova'],
    element: 'dark', weakness: ['light'], resistance: ['dark', 'fire', 'water', 'wind', 'earth'],
    drops: [{ itemId: 'wuxiang_fragment', rate: 1.0 }], exp: 1200, gold: 500, isBoss: true, aiType: 'boss_wuxiang',
  },
}
