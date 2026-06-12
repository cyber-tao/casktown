import type { ItemData } from './types'

export const ITEMS: Record<string, ItemData> = {
  // Key items
  ring: {
    id: 'ring', name: '无名戒指', type: 'key',
    effect: 'plot', description: 'T 被选中的证明；驱散黑暗；净化 xiaoai；真结局钥匙',
    usableInBattle: false, usableInField: false,
  },
  prophecy_book: {
    id: 'prophecy_book', name: '预言之书', type: 'key',
    effect: 'plot', description: '记录任务、地图、图鉴、预言、分支',
    usableInBattle: false, usableInField: false,
  },
  fathers_sword: {
    id: 'fathers_sword', name: '父亲的剑', type: 'equipment',
    effect: 'equip_weapon', description: '镇长保管的旧剑，承载父亲的遗志，可升级',
    usableInBattle: false, usableInField: false,
  },
  fathers_armor: {
    id: 'fathers_armor', name: '父亲的战袍', type: 'equipment',
    effect: 'equip_armor', description: '镇长保管的旧战袍，提升意志抗性',
    usableInBattle: false, usableInField: false,
  },
  rainbow_barrel: {
    id: 'rainbow_barrel', name: '七彩木桶', type: 'key',
    effect: 'plot', description: '迷宫返回、颜色机关、成长共鸣',
    usableInBattle: true, usableInField: true,
  },
  seed: {
    id: 'seed', name: '千年树种', type: 'key',
    effect: 'plot', description: '重建木桶镇第一神物',
    usableInBattle: false, usableInField: false,
  },
  holy_water: {
    id: 'holy_water', name: '神水', type: 'key',
    effect: 'plot', description: '重建第二神物；可净化污水',
    usableInBattle: false, usableInField: false,
  },
  laurel: {
    id: 'laurel', name: '神之桂冠', type: 'key',
    effect: 'plot', description: '重建第三神物；开启神坛',
    usableInBattle: false, usableInField: false,
  },

  // Consumables
  heal_grass: {
    id: 'heal_grass', name: '回复草', type: 'consumable',
    effect: 'heal_hp:80', description: '回复单体80 HP',
    usableInBattle: true, usableInField: true, price: 30,
  },
  pineapple_rice: {
    id: 'pineapple_rice', name: '菠萝饭团', type: 'consumable',
    effect: 'heal_hp:150', description: '回复单体150 HP，A额外+20%',
    usableInBattle: true, usableInField: true, price: 80,
  },
  holy_drop: {
    id: 'holy_drop', name: '神水滴', type: 'consumable',
    effect: 'heal_mp:60', description: '回复单体60 MP',
    usableInBattle: true, usableInField: true, price: 50,
  },
  antidote: {
    id: 'antidote', name: '解毒草', type: 'consumable',
    effect: 'cure_poison', description: '解除中毒',
    usableInBattle: true, usableInField: true, price: 20,
  },
  clear_bell: {
    id: 'clear_bell', name: '清心铃', type: 'consumable',
    effect: 'cure_confuse_charm_fear', description: '解除迷惘、魅惑、恐惧',
    usableInBattle: true, usableInField: true, price: 40,
  },
  revive_feather: {
    id: 'revive_feather', name: '复生羽', type: 'consumable',
    effect: 'revive:30', description: '复活单体，恢复30% HP',
    usableInBattle: true, usableInField: true, price: 150,
  },
  barrel_cookie: {
    id: 'barrel_cookie', name: '木桶饼干', type: 'consumable',
    effect: 'heal_hp:30_all', description: '全体小回复，木桶精灵推荐',
    usableInBattle: true, usableInField: true, price: 60,
  },
  wind_pill: {
    id: 'wind_pill', name: '风铃丸', type: 'consumable',
    effect: 'buff_speed', description: '速度提升2回合',
    usableInBattle: true, usableInField: true, price: 45,
  },
  amulet: {
    id: 'amulet', name: '护身符', type: 'consumable',
    effect: 'barrier_status', description: '抵挡一次异常状态',
    usableInBattle: true, usableInField: true, price: 70,
  },

  // Seal items
  seal_qinglong: {
    id: 'seal_qinglong', name: '青龙碑牌', type: 'key',
    effect: 'plot', description: '青龙潭封印碑牌',
    usableInBattle: false, usableInField: false,
  },
  seal_baihu: {
    id: 'seal_baihu', name: '白虎碑牌', type: 'key',
    effect: 'plot', description: '白虎穴封印碑牌',
    usableInBattle: false, usableInField: false,
  },
  seal_zhuque: {
    id: 'seal_zhuque', name: '朱雀碑牌', type: 'key',
    effect: 'plot', description: '朱雀林封印碑牌',
    usableInBattle: false, usableInField: false,
  },
  seal_xuanwu: {
    id: 'seal_xuanwu', name: '玄武碑牌', type: 'key',
    effect: 'plot', description: '玄武殿封印碑牌',
    usableInBattle: false, usableInField: false,
  },
  xiaoai_light: {
    id: 'xiaoai_light', name: 'xiaoai 的残光', type: 'key',
    effect: 'plot', description: '真结局钥匙之一',
    usableInBattle: false, usableInField: false,
  },
  wuxiang_fragment: {
    id: 'wuxiang_fragment', name: '无相碎片', type: 'material',
    effect: 'plot', description: '通关后挑战材料',
    usableInBattle: false, usableInField: false,
  },
  baihu_kai: {
    id: 'baihu_kai', name: '白虎之铠', type: 'equipment',
    effect: 'equip_armor', description: '白虎传承的铠甲，附带念壁技能',
    usableInBattle: false, usableInField: false,
  },

  // Companion weapons
  zi_yue: {
    id: 'zi_yue', name: '紫月', type: 'equipment',
    effect: 'atk+8', description: '慧慧的飞镖',
    usableInBattle: false, usableInField: false, price: 0,
  },
  guan_dao: {
    id: 'guan_dao', name: '关刀', type: 'equipment',
    effect: 'atk+10', description: '阿博的关刀',
    usableInBattle: false, usableInField: false, price: 0,
  },
  yufeng_jian: {
    id: 'yufeng_jian', name: '御风剑', type: 'equipment',
    effect: 'atk+9', description: '葱葱的御风剑',
    usableInBattle: false, usableInField: false, price: 0,
  },
  shenyu_juanzhou: {
    id: 'shenyu_juanzhou', name: '神谕卷轴', type: 'equipment',
    effect: 'matk+12', description: 'sun的神谕卷轴',
    usableInBattle: false, usableInField: false, price: 0,
  },

  // Story items
  pineapple_seed: {
    id: 'pineapple_seed', name: '菠萝种子', type: 'material',
    effect: 'quest', description: '菠萝大叔的珍贵种子',
    usableInBattle: false, usableInField: false,
  },
  healing_book: {
    id: 'healing_book', name: '御疗术之书', type: 'key',
    effect: 'learn_skill', description: '记载御疗术的古书',
    usableInBattle: false, usableInField: false,
  },
  water_mirror: {
    id: 'water_mirror', name: '熙苑的水镜', type: 'equipment',
    effect: 'mdef+15', description: '熙苑赠予的水镜',
    usableInBattle: false, usableInField: false, price: 0,
  },
  guard_charm: {
    id: 'guard_charm', name: '守护护符', type: 'equipment',
    effect: 'def+8', description: '阿博交给同伴的护符',
    usableInBattle: false, usableInField: false, price: 0,
  },
  pink_chime: {
    id: 'pink_chime', name: '粉色风铃', type: 'equipment',
    effect: 'speed+5', description: '慧慧珍视的风铃',
    usableInBattle: false, usableInField: false, price: 0,
  },
  blue_mint: {
    id: 'blue_mint', name: '蓝色薄荷', type: 'material',
    effect: 'quest', description: '森林深处的稀有薄荷',
    usableInBattle: false, usableInField: false,
  },
  phoenix_feather: {
    id: 'phoenix_feather', name: '凤凰落羽', type: 'material',
    effect: 'revive', description: '凤凰遗落的羽毛',
    usableInBattle: false, usableInField: false,
  },
}
