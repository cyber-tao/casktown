import type { DialogueData } from './types'
import { BLUE_MINT_SIDE_QUEST, REBUILT_TOWN_MAP_ID, STORY_PROGRESS_FLAGS, TRUE_ENDING_SUPPORT_CHARACTER_ID } from '../utils/constants'

const MAYOR_STORY_COMPLETION_ACTIONS: NonNullable<DialogueData['onComplete']> = [
  { type: 'setFlag', flag: STORY_PROGRESS_FLAGS.MET_MAYOR, value: true },
  { type: 'addItem', itemId: 'prophecy_book', quantity: 1 },
  { type: 'addItem', itemId: 'fathers_sword', quantity: 1 },
  { type: 'addItem', itemId: 'fathers_armor', quantity: 1 },
  { type: 'addItem', itemId: 'rainbow_barrel', quantity: 1 },
  { type: 'questStart', questId: 'QST_003' },
  { type: 'questComplete', questId: 'QST_003' },
  { type: 'questStart', questId: 'QST_004' },
]

const FOREST_PARTY_JOIN_BATTLE_ACTIONS: NonNullable<DialogueData['onComplete']> = [
  { type: 'battle', encounterId: 'BTL_101' },
]

const CONGCONG_JOIN_COMPLETION_ACTIONS: NonNullable<DialogueData['onComplete']> = [
  { type: 'setFlag', flag: 'congcong_joined', value: true },
]

const NORMAL_ENDING_COMPLETION_ACTIONS: NonNullable<DialogueData['onComplete']> = [
  { type: 'setFlag', flag: 'normal_ending_seen', value: true },
  { type: 'setFlag', flag: 'purification_scene_shown', value: true },
  { type: 'questComplete', questId: 'QST_012' },
  { type: 'transfer', targetMap: REBUILT_TOWN_MAP_ID, targetX: 16, targetY: 12 },
]

const XIYUAN_SACRED_WATER_COMPLETION_ACTIONS: NonNullable<DialogueData['onComplete']> = [
  { type: 'setFlag', flag: 'xiyuan_quiz_completed', value: true },
  { type: 'setFlag', flag: 'has_sacred_water', value: true },
  { type: 'addItem', itemId: 'holy_water', quantity: 1 },
  { type: 'addItem', itemId: 'healing_book', quantity: 1 },
  { type: 'questComplete', questId: 'QST_006' },
  { type: 'questStart', questId: 'QST_007' },
]

const XIYUAN_KIND_COMPLETION_ACTIONS: NonNullable<DialogueData['onComplete']> = [
  ...XIYUAN_SACRED_WATER_COMPLETION_ACTIONS,
  { type: 'addItem', itemId: 'water_mirror', quantity: 1 },
]

const XIYUAN_COLD_COMPLETION_ACTIONS: NonNullable<DialogueData['onComplete']> = [
  { type: 'setFlag', flag: 'xiyuan_quiz_completed', value: true },
  { type: 'setFlag', flag: 'has_sacred_water', value: true },
  { type: 'addItem', itemId: 'holy_water', quantity: 1 },
  { type: 'questComplete', questId: 'QST_006' },
  { type: 'questStart', questId: 'QST_007' },
  { type: 'adjustMercy', amount: -1 },
]

const TEMPLE_VISITED_COMPLETION_ACTIONS: NonNullable<DialogueData['onComplete']> = [
  { type: 'setFlag', flag: 'temple_visited', value: true },
]

const LAUREL_COMPLETION_ACTIONS: NonNullable<DialogueData['onComplete']> = [
  ...TEMPLE_VISITED_COMPLETION_ACTIONS,
  { type: 'setFlag', flag: 'has_divine_laurel', value: true },
  { type: 'addItem', itemId: 'laurel', quantity: 1 },
  { type: 'questComplete', questId: 'QST_007' },
  { type: 'questStart', questId: 'QST_008' },
]

const SIDE_A_COMPLETION_ACTIONS: NonNullable<DialogueData['onComplete']> = [
  { type: 'setFlag', flag: 'side_a_done', value: true },
]

const SIDE_A_REST_COMPLETION_ACTIONS: NonNullable<DialogueData['onComplete']> = [
  ...SIDE_A_COMPLETION_ACTIONS,
  { type: 'addItem', itemId: 'guard_charm', quantity: 1 },
]

const SIDE_CONGCONG_COMPLETION_ACTIONS: NonNullable<DialogueData['onComplete']> = [
  { type: 'setFlag', flag: 'side_congcong_done', value: true },
]

const DARK_PALACE_CAPTURED_COMPLETION_ACTIONS: NonNullable<DialogueData['onComplete']> = [
  { type: 'questStart', questId: 'QST_012' },
  { type: 'removeParty', characterId: 'A' },
]

export const DIALOGUES: Record<string, DialogueData> = {
  // ============================================================
  // 序章：盛典之日 (SCN_001 - SCN_005)
  // ============================================================

  // SCN_001 起床与慧慧催促
  DIA_001_START: {
    id: 'DIA_001_START',
    lines: [
      { speaker: '旁白', text: '木桶镇的清晨总是来得很慢。风从生命之泉的方向吹来，带着一点水声，也带着一点梦还没有醒的味道。' },
      { speaker: '慧慧', text: 'T！你还在磨蹭吗？今天可是盛典！' },
      { speaker: 'T', text: '听见了，听见了。盛典又不会长脚跑掉。' },
      { speaker: '慧慧', text: '会跑掉的是你。去年你睡到镇长念完开场词才到。' },
      { speaker: 'T', text: '那不正好？省下我站着听大伯咳嗽半天。' },
      { speaker: '慧慧', text: '不许这么说镇长！还有，菠萝大叔让你帮他整理菜园子。你弄完就早点去会场。' },
      { speaker: 'T', text: '为什么是我？' },
      { speaker: '慧慧', text: '因为你答应过。' },
      { speaker: 'T', text: '我什么时候答应的？' },
      { speaker: '慧慧', text: '昨天你吃了他三个菠萝饭团的时候。' },
      { speaker: 'T', text: '……那叫交易，不叫答应。' },
      { speaker: '慧慧', text: '交易也要付钱。你没钱，所以去干活。' },
      {
        speaker: 'T',
        text: '……',
        choices: [
          { text: '好吧，我去。', next: 'DIA_001_HELP', actions: [{ type: 'setFlag', flag: 'trust_huihui', value: 1 }] },
          { text: '我先去会场。', next: 'DIA_001_REFUSE' },
          { text: '我再睡五分钟。', next: 'DIA_001_SLEEP', actions: [{ type: 'setFlag', flag: 'trust_huihui', value: 1 }, { type: 'setFlag', flag: 'achieve_late', value: true }] },
        ],
      },
      { speaker: '慧慧', text: '我先去会场帮忙。你不许偷懒。' },
      { speaker: 'T', text: '你对我是不是有什么误解？' },
      { speaker: '慧慧', text: '没有，我很了解你。' },
      { speaker: '系统', text: '获得任务【整理菜园子】。' },
    ],
  },
  DIA_001_HELP: {
    id: 'DIA_001_HELP',
    lines: [
      { speaker: '慧慧', text: '这才是我认识的T。快去吧，菠萝大叔在小镇西南角的菜园门口等你。' },
      { speaker: '系统', text: '慧慧信赖度+1。目标：前往小镇西南角菜园。' },
    ],
    onComplete: [{ type: 'questStart', questId: 'QST_002' }],
  },
  DIA_001_REFUSE: {
    id: 'DIA_001_REFUSE',
    lines: [
      { speaker: '慧慧', text: '喂！菠萝大叔的菜园你到底去不去？' },
      { speaker: 'T', text: '等盛典完了再说。' },
      { speaker: '慧慧', text: '不行，你现在就去。不然我告诉镇长你偷吃菠萝饭团。' },
      { speaker: 'T', text: '……好吧好吧。' },
    ],
    onComplete: [{ type: 'questStart', questId: 'QST_002' }],
  },
  DIA_001_SLEEP: {
    id: 'DIA_001_SLEEP',
    lines: [
      { speaker: '旁白', text: '慧慧从袖中取出三枚袖镖，钉住T的衣角，将他固定在门框上。' },
      { speaker: '慧慧', text: '五分钟到了我叫你。用袖镖。' },
      { speaker: 'T', text: '你这是叫我起床还是处刑？' },
      { speaker: '系统', text: '获得成就【差点迟到】。慧慧信赖度+1。' },
    ],
    onComplete: [{ type: 'questStart', questId: 'QST_002' }],
  },

  // SCN_002 菠萝大叔的菜园子
  DIA_002_GARDEN: {
    id: 'DIA_002_GARDEN',
    lines: [
      { speaker: '菠萝大叔', text: 'T，可算来了。菜园就在这片篱笆里面，别再说你找不到。' },
      { speaker: 'T', text: '我只是确认一下是不是还有专门的菜园入口。' },
      { speaker: '菠萝大叔', text: '没有入口，只有活。进去把那只怪木桶搬走，再回来找我。' },
      { speaker: '系统', text: '目标更新：清理菜园里的木桶。' },
    ],
  },
  DIA_002_GARDEN_WAIT: {
    id: 'DIA_002_GARDEN_WAIT',
    lines: [
      { speaker: '菠萝大叔', text: '先去篱笆里的菜地。那只木桶卡在地里，我看它不像普通木桶。' },
      { speaker: 'T', text: '木桶还能不像普通木桶？' },
      { speaker: '菠萝大叔', text: '你们年轻人见识少。' },
    ],
  },
  DIA_002_GARDEN_BARREL: {
    id: 'DIA_002_GARDEN_BARREL',
    lines: [
      { speaker: 'T', text: '这个木桶怎么还会喘气？' },
      { speaker: '系统', text: '木桶突然跳了起来！' },
      { speaker: '系统', text: '战斗开始！' },
    ],
    onComplete: [{ type: 'battle', encounterId: 'BTL_001' }],
  },
  DIA_002_GARDEN_CLEAR: {
    id: 'DIA_002_GARDEN_CLEAR',
    lines: [
      { speaker: 'T', text: '木桶终于老实了。旁边还压着几株药草和一包种子。' },
      { speaker: '系统', text: '获得【回复草】x2，【菠萝种子】x1。' },
      { speaker: 'T', text: '回去找菠萝大叔交差。' },
    ],
  },
  DIA_002_GARDEN_AFTER: {
    id: 'DIA_002_GARDEN_AFTER',
    lines: [
      { speaker: '菠萝大叔', text: '干得好。那只木桶昨晚还在我菜地里打呼噜。' },
      { speaker: 'T', text: '你的菜园问题比我想象得复杂。' },
      { speaker: '菠萝大叔', text: '作为回报，这是我特制的菠萝饭团。赶紧去会场，别让慧慧来抓人。' },
      { speaker: '系统', text: '获得【菠萝饭团】x3。任务【整理菜园子】完成。' },
    ],
  },
  DIA_002_GARDEN_DONE: {
    id: 'DIA_002_GARDEN_DONE',
    lines: [
      { speaker: '菠萝大叔', text: '菜园整理好了。你要是还想帮忙，我这里永远有活。' },
      { speaker: 'T', text: '我突然想起盛典快开始了。' },
    ],
  },

  // SCN_003 大树下的梦
  DIA_003_DREAM: {
    id: 'DIA_003_DREAM',
    lines: [
      { speaker: '旁白', text: '会场的钟声还没有响。T 靠在大树旁，只想闭一会儿眼。' },
      { speaker: 'T', text: '五分钟。真的就五分钟。' },
      { speaker: '旁白', text: '画面逐渐变暗，进入梦境。大树叶影变成白色光点。' },
      { speaker: 'UNKNOWN', text: '你做好准备了吗，被选中的骑士？' },
      { speaker: 'T', text: '谁？' },
      { speaker: 'UNKNOWN', text: '你背负着重建家园的使命。你要拿起我们的剑，重新捍卫我们的家园。' },
      { speaker: 'T', text: '等等，我连菜园都差点没整理完。' },
      { speaker: 'UNKNOWN', text: '玩笑可以遮住害怕，却遮不住命运。' },
      { speaker: 'T', text: '我不喜欢别人替我决定命运。' },
      { speaker: 'UNKNOWN', text: '那就用你的手，把它改成你愿意承认的样子。' },
      { speaker: '旁白', text: '白光落入 T 掌心。' },
      { speaker: 'T', text: '戒指？' },
      { speaker: '系统', text: '获得关键道具【无名戒指】。' },
      { speaker: '旁白', text: '钟声响起。盛典开始了。' },
    ],
  },

  // SCN_004 盛典与黑暗来袭
  DIA_004_FESTIVAL: {
    id: 'DIA_004_FESTIVAL',
    lines: [
      { speaker: '慧慧', text: '我以为你又要迟到了呢！' },
      { speaker: '阿博', text: '这次不算迟。只能算很危险。' },
      { speaker: 'T', text: '你们两个是不是约好每天轮流损我？' },
      { speaker: '阿博', text: '不用约好，这是常识。' },
      { speaker: '镇长', text: '都安静。盛典开始。' },
      { speaker: '旁白', text: '镇长翻开预言之书。一本看似古旧的书忽然亮起，书页中央钻出一个小小的木桶精灵。它拖着过长的鞋子，在书页上走来走去。' },
      { speaker: '木桶精灵', text: '咳咳，二十年一次的重大场合，请大家看天，不要看我鞋。' },
      { speaker: 'T', text: '它鞋真的很长。' },
      { speaker: '慧慧', text: '严肃点！' },
      { speaker: '木桶精灵', text: '预言宣读——' },
      { speaker: '系统', text: '天空浮现诗句。' },
      { speaker: '预言', text: '旧梦难缠，烟容丝淡，凌寒旧时雨。' },
      { speaker: '预言', text: '元帘未卷，仙鸡催晓，终将谁人到？' },
      { speaker: '预言', text: '天地风卷色，白露显微明。' },
      { speaker: '预言', text: '念春朝，年如年远。' },
      { speaker: '阿博', text: '什么意思？' },
      { speaker: '镇长', text: '……大概是，很重要的意思。' },
      { speaker: 'T', text: '大伯你也没看懂吧。' },
      { speaker: '旁白', text: '天空变暗，风声变强。生命之泉方向传来低鸣。' },
      { speaker: 'xiaoai', text: '生命之泉……终究要归还给黑暗。' },
      { speaker: '慧慧', text: '这个声音！' },
      { speaker: '镇长', text: '所有人退到会场后方！' },
      { speaker: '系统', text: '战斗开始！' },
    ],
    onComplete: [{ type: 'battle', encounterId: 'BTL_002' }],
  },
  DIA_004_FESTIVAL_MID: {
    id: 'DIA_004_FESTIVAL_MID',
    lines: [
      { speaker: 'T', text: '这些东西怎么越打越多？' },
      { speaker: '慧慧', text: 'T，你的手！' },
      { speaker: '系统', text: '无名戒指发出白光。' },
      { speaker: '旁白', text: '白光射向黑暗，xiaoai 的影子后退。' },
      { speaker: 'xiaoai', text: '……原来如此。你就是这一次的答案。' },
      { speaker: 'T', text: '你认识我？' },
      { speaker: 'xiaoai', text: '现在还不需要。' },
      { speaker: '旁白', text: '黑暗消散。' },
      { speaker: '镇长', text: '我宣布，T 将成为木桶镇的勇士。' },
      { speaker: 'T', text: '等等，我还没宣布我同意。' },
      { speaker: '木桶精灵', text: '命运类事件默认同意。' },
      { speaker: '慧慧', text: 'T……' },
      { speaker: '阿博', text: '看来你逃不掉了。' },
      { speaker: '镇长', text: '今晚到会场北侧的镇长家门口来。我有东西交给你。' },
      { speaker: '系统', text: '主线任务更新【镇长的嘱托】：前往会场北侧的镇长家门口。' },
    ],
    onComplete: [
      { type: 'questStart', questId: 'QST_001' },
      { type: 'questComplete', questId: 'QST_001' },
      { type: 'setFlag', flag: STORY_PROGRESS_FLAGS.FESTIVAL_DONE, value: true },
      { type: 'questStart', questId: 'QST_003' },
    ],
  },
  DIA_004_MAYOR: {
    id: 'DIA_004_MAYOR',
    lines: [
      { speaker: '镇长', text: '都到会场中央来。盛典马上开始，别在边上磨蹭。' },
      { speaker: '木桶精灵', text: '重要场合，请站在能被命运看见的位置。' },
    ],
  },

  // SCN_005 镇长的嘱托
  DIA_005_MAYOR: {
    id: 'DIA_005_MAYOR',
    lines: [
      { speaker: '镇长', text: '你来了。把门关上。' },
      { speaker: 'T', text: '大伯，你怎么翻得像小偷一样？' },
      { speaker: '镇长', text: '严肃点。' },
      { speaker: '旁白', text: '镇长从柜子底层取出几件被布包住的旧物。' },
      { speaker: '镇长', text: '这是预言之书。它能记录你的任务、地图、怪物信息和还没被你理解的预言。' },
      { speaker: '木桶精灵', text: '也能记录你迟到的次数。' },
      { speaker: 'T', text: '你怎么又出来了？' },
      { speaker: '木桶精灵', text: '我是书灵，不是书签。' },
      { speaker: '镇长', text: '这是你父亲曾经用过的剑和战袍。' },
      { speaker: 'T', text: '我父亲……' },
      { speaker: '镇长', text: '他们当年为了保护木桶镇战死。我一直在想，是否应该让你远离这些。' },
      { speaker: 'T', text: '那为什么现在又给我？' },
      { speaker: '镇长', text: '因为有些东西不是藏起来就不存在。T，你可以害怕，但不要装作什么都不在乎。' },
      {
        speaker: 'T',
        text: '……',
        choices: [
          { text: '我会把镇子重建起来。', actions: [{ type: 'setFlag', flag: 'mercy_score', value: 1 }, { type: 'setFlag', flag: 'trust_huihui', value: 1 }] },
          { text: '我只是想知道真相。', actions: [{ type: 'setFlag', flag: 'memory_robes', value: true }] },
          { text: '我还没答应当勇士。', next: 'DIA_005_RELUCTANT' },
        ],
      },
      { speaker: '镇长', text: '还有这个，七彩木桶。它可以提升你的战斗力和防御力，也能带你返回迷宫起点。' },
      { speaker: 'T', text: '为什么这么厉害的东西长得像木桶？' },
      { speaker: '木桶精灵', text: '你对木桶有什么偏见？' },
      { speaker: '系统', text: '获得【预言之书】、【父亲的剑】、【父亲的战袍】、【七彩木桶】。' },
      { speaker: '木桶精灵', text: '重建家园需要三件神物：奇妙森林的千年树种，圣水殿的神水，神殿的太阳桂冠。' },
      { speaker: 'T', text: '听起来一个比一个麻烦。' },
      { speaker: '木桶精灵', text: '恭喜你，理解正确。' },
    ],
    onComplete: MAYOR_STORY_COMPLETION_ACTIONS,
  },
  DIA_005_RELUCTANT: {
    id: 'DIA_005_RELUCTANT',
    lines: [
      { speaker: '木桶精灵', text: '勇士拒绝率接近零。你是第一个。' },
      { speaker: 'T', text: '那说明我特别。' },
      { speaker: '木桶精灵', text: '特别固执。' },
    ],
    onComplete: MAYOR_STORY_COMPLETION_ACTIONS,
  },
  DIA_005_MAYOR_AFTER: {
    id: 'DIA_005_MAYOR_AFTER',
    lines: [
      { speaker: '镇长', text: '预言之书和七彩木桶已经交给你了。先去奇妙森林，找到千年树种。' },
      { speaker: '木桶精灵', text: '东边。别再往会场绕了。' },
    ],
  },

  // ============================================================
  // 第一篇：重建家园 (SCN_101 - SCN_104)
  // ============================================================

  // SCN_101 奇妙森林路口
  DIA_101_FOREST: {
    id: 'DIA_101_FOREST',
    lines: [
      { speaker: '阿博', text: '好慢，T。' },
      { speaker: 'T', text: '你们是来给本大爷送行的？' },
      { speaker: '慧慧', text: '我们想和你一起去。' },
      { speaker: 'T', text: '你们知道我要去哪里吗？' },
      { speaker: '阿博', text: '奇妙森林、圣水殿、神殿。镇长已经说了。' },
      { speaker: 'T', text: '大伯嘴这么快？' },
      { speaker: '慧慧', text: '不是镇长，是木桶精灵在会场门口大喊"勇者缺队友"。' },
      { speaker: '木桶精灵', text: '招募效率很高。' },
      {
        speaker: 'T',
        text: '……',
        choices: [
          { text: '那就一起吧。', actions: [{ type: 'setFlag', flag: 'trust_huihui', value: 1 }, { type: 'setFlag', flag: 'trust_a', value: 1 }] },
          { text: '太危险了。', next: 'DIA_101_DANGER', actions: [{ type: 'setFlag', flag: 'mercy_score', value: 1 }] },
          { text: '拖后腿可别怪我。', next: 'DIA_101_COLD' },
        ],
      },
      { speaker: '慧慧', text: '从现在开始，我们就是同伴了。' },
      { speaker: '阿博', text: '先别说漂亮话。森林里有动静。' },
      { speaker: '系统', text: '战斗开始！' },
    ],
    onComplete: FOREST_PARTY_JOIN_BATTLE_ACTIONS,
  },
  DIA_101_DANGER: {
    id: 'DIA_101_DANGER',
    lines: [
      { speaker: '慧慧', text: '正因危险才要一起去。你以为丢下我们就安全了？' },
      { speaker: '阿博', text: '我会保护大家。' },
    ],
    onComplete: FOREST_PARTY_JOIN_BATTLE_ACTIONS,
  },
  DIA_101_COLD: {
    id: 'DIA_101_COLD',
    lines: [
      { speaker: '慧慧', text: '你才拖后腿！连方向都分不清的才是你。' },
      { speaker: '阿博', text: '……' },
    ],
    onComplete: FOREST_PARTY_JOIN_BATTLE_ACTIONS,
  },

  // SCN_102 森林探索对白
  DIA_102_VINE: {
    id: 'DIA_102_VINE',
    lines: [
      { speaker: '慧慧', text: '这些藤蔓会动。' },
      { speaker: 'T', text: '你确定不是风吹的？' },
      { speaker: '阿博', text: '风不会把路牌勒断。' },
      { speaker: '系统', text: '战斗开始！' },
    ],
    onComplete: [{ type: 'battle', encounterId: 'BTL_102' }],
  },
  DIA_102_POISON: {
    id: 'DIA_102_POISON',
    lines: [
      { speaker: '阿博', text: '小心叶子背面，有虫。' },
      { speaker: '慧慧', text: '你怎么知道？' },
      { speaker: '阿博', text: '它在看我。' },
      { speaker: '系统', text: '战斗开始！' },
    ],
    onComplete: [{ type: 'battle', encounterId: 'BTL_103' }],
  },
  DIA_102_LOST: {
    id: 'DIA_102_LOST',
    lines: [
      { speaker: 'T', text: '这棵树我见过。' },
      { speaker: '慧慧', text: '你刚才也这么说。' },
      { speaker: '阿博', text: '所以我们至少第三次回到这里了。' },
      { speaker: '木桶精灵', text: '奇妙森林会改变道路。你们要找刻有种子形状的机关树。' },
      { speaker: '系统', text: '预言之书更新【三棵机关树】。' },
    ],
  },

  // SCN_103 白虎误会战
  DIA_103_TIGER: {
    id: 'DIA_103_TIGER',
    lines: [
      { speaker: '旁白', text: '湖边伏着一只巨大的白虎，身上伤口尚未愈合，血迹沿着白色毛发凝成暗色的线。' },
      { speaker: '白虎', text: '你们是魔头的人吧。' },
      { speaker: '慧慧', text: '不是！我们是木桶镇的——' },
      { speaker: '白虎', text: '魔头的手下也会说自己无辜。' },
      { speaker: '阿博', text: '它听不进去。' },
      { speaker: 'T', text: '那就先让它冷静下来。' },
      { speaker: '系统', text: '白虎误会战开始！撑过5回合或将其HP降至60%即可。' },
    ],
    onComplete: [{ type: 'questStart', questId: 'QST_005' }, { type: 'battle', encounterId: 'BTL_110' }],
  },
  DIA_103_TIGER_RING: {
    id: 'DIA_103_TIGER_RING',
    lines: [
      { speaker: '白虎', text: '让我结果你们这些魔头的手下……碎裂！' },
      { speaker: '旁白', text: '白虎蓄力，地面裂开。T 的戒指发光。' },
      { speaker: '白虎', text: '这是……jojo大神的守护戒？你是守护者？' },
      { speaker: 'T', text: '你终于愿意听人说话了？' },
      { speaker: '慧慧', text: '我们一开始就说了。' },
      { speaker: '白虎', text: '……抱歉。伤让我失去了判断。' },
      { speaker: '旁白', text: 'xiaoai出现在白虎身后。' },
      { speaker: 'xiaoai', text: '判断？守护者最不该相信的就是自己的判断。' },
      { speaker: '白虎', text: 'xiaoai！' },
      { speaker: 'xiaoai', text: '你已经守不住森林了。' },
      { speaker: '旁白', text: 'xiaoai一掌击中白虎。' },
      { speaker: 'T', text: '住手！' },
      { speaker: 'xiaoai', text: 'T，你进步了不少。我在生命之泉等你。' },
      { speaker: 'T', text: '你到底想做什么？' },
      { speaker: 'xiaoai', text: '等你走到那里，也许会问一个更好的问题。' },
      { speaker: '旁白', text: 'xiaoai消失。' },
      { speaker: '慧慧', text: '白虎！我来治疗你！' },
      { speaker: '系统', text: '慧慧施展治疗，被黑暗伤口反噬。' },
      { speaker: '慧慧', text: '唔……这是什么伤？它在拒绝恢复。' },
      { speaker: '白虎', text: '那是心魔留下的痕。孩子们，听好。森林深处藏着千年树种。按下三棵刻有种子形状的机关树，路会打开。' },
      { speaker: '白虎', text: '拿着这个。白虎之铠。还有我的拳与盾。' },
      { speaker: '系统', text: '获得【白虎之铠】。T学会【白虎拳】、【神盾】。' },
      { speaker: '白虎', text: '别只想着打倒魔。守护家园，有时比复仇更难。' },
      {
        speaker: 'T',
        text: '……',
        choices: [
          { text: '我们会安葬你。', next: 'DIA_103_BURY', actions: [{ type: 'setFlag', flag: 'white_tiger_respected', value: true }, { type: 'setFlag', flag: 'mercy_score', value: 1 }] },
          { text: '我会替你报仇。', next: 'DIA_103_REVENGE' },
          { text: '你还有什么没说？', next: 'DIA_103_SECRET', actions: [{ type: 'setFlag', flag: 'xiaoai_memory_fragments', value: 1 }] },
        ],
      },
    ],
  },
  DIA_103_BURY: {
    id: 'DIA_103_BURY',
    lines: [
      { speaker: '旁白', text: 'T和伙伴们为白虎举行了简单的安葬。木桶精灵念出悼诗。' },
      { speaker: '木桶精灵', text: '天地嚎，怒风起。' },
      { speaker: '木桶精灵', text: '佳人依窗，念郎泪，何日归？' },
      { speaker: '木桶精灵', text: '英雄血，乱人葬。' },
      { speaker: '木桶精灵', text: '空留惨冢，去相思，奈何谁人知。' },
    ],
  },
  DIA_103_REVENGE: {
    id: 'DIA_103_REVENGE',
    lines: [
      { speaker: '旁白', text: 'T握紧拳头，白虎之铠上泛起一层微光。' },
      { speaker: '系统', text: 'T获得临时攻击加成。' },
      { speaker: '慧慧', text: '白虎……一路走好。' },
    ],
  },
  DIA_103_SECRET: {
    id: 'DIA_103_SECRET',
    lines: [
      { speaker: '白虎', text: 'xiaoai击中我的时候……她的表情不是纯粹的恶意。像是不忍。' },
      { speaker: 'T', text: '不忍？' },
      { speaker: '白虎', text: '也许是我看错了。但也许不是。' },
      { speaker: '系统', text: 'xiaoai记忆碎片+1。' },
    ],
  },

  // SCN_104 三棵机关树与千年树种
  DIA_104_TREE_1: {
    id: 'DIA_104_TREE_1',
    lines: [
      { speaker: '木桶精灵', text: '第一棵树的种子还没睡醒。敲一敲？' },
      { speaker: '慧慧', text: '不要乱敲神圣的树！' },
      { speaker: 'T', text: '那温柔地敲？' },
      { speaker: '系统', text: '战斗开始！' },
    ],
    onComplete: [{ type: 'battle', encounterId: 'BTL_111' }],
  },
  DIA_104_TREE_2: {
    id: 'DIA_104_TREE_2',
    lines: [
      { speaker: '阿博', text: '水声从树里面传出来。' },
      { speaker: '慧慧', text: '也许树在哭。' },
      { speaker: 'T', text: '也许树喝太多了。' },
      { speaker: '旁白', text: '按照水滴落下顺序踩地砖，机关启动。蓝露树发光。' },
    ],
  },
  DIA_104_TREE_3: {
    id: 'DIA_104_TREE_3',
    lines: [
      { speaker: '木桶精灵', text: '这棵树讨厌阴影。让光照到种子符号上。' },
      { speaker: '慧慧', text: '怎么让光照过去？' },
      { speaker: 'T', text: '推倒旁边的木桶当镜子？' },
      { speaker: '旁白', text: '推动镜石折射光线，机关启动。金阳树发光。' },
    ],
  },
  DIA_104_SEED_BATTLE: {
    id: 'DIA_104_SEED_BATTLE',
    lines: [
      { speaker: '旁白', text: '森林深处的路像被风翻开的书页，一层层展开。' },
      { speaker: 'T', text: '那就是千年树种？' },
      { speaker: '慧慧', text: '它在发光。' },
      { speaker: '阿博', text: '小心。越安静的地方越危险。' },
      { speaker: '系统', text: '战斗开始！' },
    ],
    onComplete: [{ type: 'battle', encounterId: 'BTL_113' }],
  },
  DIA_104_SEED: {
    id: 'DIA_104_SEED',
    lines: [
      { speaker: '系统', text: '获得关键道具【千年树种】。' },
      { speaker: 'T', text: '我要去生命之泉。' },
      { speaker: '阿博', text: '现在不行。' },
      { speaker: 'T', text: 'xiaoai 在那里等我。' },
      { speaker: '慧慧', text: '可是木桶镇也在等我们。' },
      { speaker: '阿博', text: '先重建家园。否则我们赢了，也没有地方回去。' },
      {
        speaker: 'T',
        text: '……',
        choices: [
          { text: '你说得对。', actions: [{ type: 'setFlag', flag: 'trust_a', value: 1 }, { type: 'setFlag', flag: 'mercy_score', value: 1 }] },
          { text: '我只是暂时听你们的。', actions: [{ type: 'setFlag', flag: 'trust_huihui', value: 1 }] },
          { text: '走吧，去圣水殿。' },
        ],
      },
    ],
    onComplete: [{ type: 'questStart', questId: 'QST_006' }],
  },
  DIA_104_ALTAR_LOCKED: {
    id: 'DIA_104_ALTAR_LOCKED',
    lines: [
      { speaker: '木桶精灵', text: '祭台还没有回应。先按下三棵刻有种子形状的机关树。' },
    ],
  },

  // ============================================================
  // SCN_201 - SCN_203：圣水殿
  // ============================================================

  // SCN_201 乘船前往圣水殿
  DIA_201_BOAT: {
    id: 'DIA_201_BOAT',
    lines: [
      { speaker: '船夫', text: '去圣水殿和神殿？风向不太好。' },
      { speaker: 'T', text: '会沉吗？' },
      { speaker: '船夫', text: '不会。就是会摇。' },
      { speaker: '慧慧', text: 'T，你脸色怎么变了？' },
      { speaker: 'T', text: '我在思考人生。' },
      { speaker: '阿博', text: '他晕船。' },
      { speaker: '系统', text: '乘船动画。抵达神域脚下。' },
      { speaker: '慧慧', text: '左边就是圣水殿，直走是神殿。先去哪？' },
      { speaker: 'T', text: '随便了。' },
      { speaker: '木桶精灵', text: '预言之书建议先去圣水殿。理由：你们现在打不过神殿守卫。' },
      { speaker: 'T', text: '你说话能不能委婉点？' },
      { speaker: '木桶精灵', text: '不能。' },
    ],
  },

  // SCN_202 圣水殿门前
  DIA_202_SHUIYAO: {
    id: 'DIA_202_SHUIYAO',
    lines: [
      { speaker: '慧慧', text: '这就是圣水殿？好漂亮。像水晶做的。' },
      { speaker: '旁白', text: '凉风吹过，慧慧被击倒。' },
      { speaker: '阿博', text: '是谁？' },
      { speaker: '水瑶', text: '你们是谁？' },
      { speaker: 'T', text: '木桶镇的人。我们来取神水。' },
      { speaker: '风赤', text: '取神水？' },
      { speaker: '水瑶', text: '为什么？' },
      { speaker: 'T', text: '重建我们的家园。' },
      { speaker: '水瑶', text: '不行，不行。' },
      { speaker: '阿博', text: '不给就抢。' },
      { speaker: '慧慧', text: 'A！你这样说只会更麻烦！' },
      { speaker: '风赤', text: '你们要抢？' },
      { speaker: '旁白', text: '水瑶与风赤现身。' },
      { speaker: '水瑶', text: '我是水瑶。' },
      { speaker: '风赤', text: '我是风赤。' },
      { speaker: '水瑶', text: '我们看管神水。想拿走，就证明你们不是又一批贪婪的人。' },
      { speaker: '风赤', text: '证明方法很简单——打败我们。' },
    ],
    onComplete: [{ type: 'battle', encounterId: 'BTL_201' }],
  },
  DIA_202_SHUIYAO_AFTER: {
    id: 'DIA_202_SHUIYAO_AFTER',
    lines: [
      { speaker: '水瑶', text: '他们没有被神水的力量迷惑。' },
      { speaker: '风赤', text: '也没有在胜利后下杀手。' },
      { speaker: '水瑶', text: '进去吧。殿主在等你们。' },
    ],
  },

  // SCN_203 熙苑的问答
  DIA_203_XIYUAN: {
    id: 'DIA_203_XIYUAN',
    lines: [
      { speaker: '旁白', text: '大厅中央坐着一位穿着紫罗衫的女子。她的面容并不美丽，甚至有些怪异，但眼神安静得像深水。' },
      { speaker: '熙苑', text: '你们来了。' },
      { speaker: 'T', text: '你是圣水殿的主人？' },
      { speaker: '熙苑', text: '我是熙苑。我知道你们要神水。可我不能把它交给只会挥剑的人。' },
      { speaker: '阿博', text: '我们刚刚才挥过。' },
      { speaker: '慧慧', text: '闭嘴啦。' },
      { speaker: '熙苑', text: '回答我的问题。答完，我给你们神水。' },
      { speaker: '熙苑', text: '问题一：水晶不说谎，但会倒映谎言。你看见四面水晶，哪一面没有倒影？' },
      {
        speaker: 'T',
        text: '……',
        choices: [
          { text: '面向门口的水晶', next: 'DIA_203_Q1_W' },
          { text: '面向泉水的水晶', next: 'DIA_203_Q1_W' },
          { text: '被布盖住的水晶', next: 'DIA_203_Q2' },
          { text: '破碎的水晶', next: 'DIA_203_Q1_W' },
        ],
      },
    ],
  },
  DIA_203_Q1_W: {
    id: 'DIA_203_Q1_W',
    lines: [
      { speaker: '熙苑', text: '错了。被布盖住的水晶才没有倒影。' },
      { speaker: '系统', text: '触发惩罚战：水镜 x2。' },
      { speaker: 'T', text: '……好吧，再来。' },
    ],
    onComplete: [{ type: 'battle', encounterId: 'BTL_202A' }],
  },
  DIA_203_Q2: {
    id: 'DIA_203_Q2',
    lines: [
      { speaker: '熙苑', text: '正确。问题二：一只木桶装满水需要三刻，一只破木桶漏光水需要两刻。如果同时开始，什么时候它既不是满的，也不是空的？' },
      {
        speaker: 'T',
        text: '……',
        choices: [
          { text: '第一刻', next: 'DIA_203_Q3' },
          { text: '第二刻', next: 'DIA_203_Q2_W' },
          { text: '第三刻', next: 'DIA_203_Q2_W' },
          { text: '永远不会', next: 'DIA_203_Q2_W' },
        ],
      },
    ],
  },
  DIA_203_Q2_W: {
    id: 'DIA_203_Q2_W',
    lines: [
      { speaker: '熙苑', text: '错了。第一刻时它既不是满的也不是空的。' },
      { speaker: '系统', text: '触发惩罚战：小水滴 x3。' },
    ],
    onComplete: [{ type: 'battle', encounterId: 'BTL_202B' }],
  },
  DIA_203_Q3: {
    id: 'DIA_203_Q3',
    lines: [
      { speaker: '熙苑', text: '正确。问题三：风从东边来，火把向哪里弯？' },
      {
        speaker: 'T',
        text: '……',
        choices: [
          { text: '东', next: 'DIA_203_Q3_W' },
          { text: '西', next: 'DIA_203_Q4' },
          { text: '南', next: 'DIA_203_Q3_W' },
          { text: '不弯', next: 'DIA_203_Q3_W' },
        ],
      },
    ],
  },
  DIA_203_Q3_W: {
    id: 'DIA_203_Q3_W',
    lines: [
      { speaker: '熙苑', text: '错了。风从东边来，火把自然向西弯。' },
      { speaker: '系统', text: '触发惩罚战：风之防御人 x2。' },
    ],
    onComplete: [{ type: 'battle', encounterId: 'BTL_202C' }],
  },
  DIA_203_Q4: {
    id: 'DIA_203_Q4',
    lines: [
      { speaker: '熙苑', text: '正确。问题四：白虎为什么攻击你们？' },
      {
        speaker: 'T',
        text: '……',
        choices: [
          { text: '它天生凶恶', next: 'DIA_203_Q4_A' },
          { text: '它受伤后误把我们当成魔头手下', next: 'DIA_203_Q5' },
          { text: '它想抢戒指', next: 'DIA_203_Q4_W' },
          { text: '它被xiaoai控制', next: 'DIA_203_Q4_W' },
        ],
      },
    ],
  },
  DIA_203_Q4_W: {
    id: 'DIA_203_Q4_W',
    lines: [
      { speaker: '熙苑', text: '错了。白虎是因为受伤后误判了你们。' },
    ],
  },
  DIA_203_Q4_A: {
    id: 'DIA_203_Q4_A',
    lines: [
      { speaker: '熙苑', text: '错了。白虎并非天生凶恶，是受伤后的误判。你对生命的理解还需加深。' },
      { speaker: '系统', text: '悲悯值-1。' },
    ],
    onComplete: [{ type: 'setFlag', flag: 'mercy_score', value: -1 }],
  },
  DIA_203_Q5: {
    id: 'DIA_203_Q5',
    lines: [
      { speaker: '熙苑', text: '正确。最后一个问题：我是不是长得很丑？' },
      {
        speaker: 'T',
        text: '……',
        choices: [
          { text: '外表确实不重要。', next: 'DIA_203_XIYUAN_NEUTRAL' },
          { text: '不，内心的丑陋比外表更可怕。你很善良，所以你很漂亮。', next: 'DIA_203_XIYUAN_KIND', actions: [{ type: 'setFlag', flag: 'answered_xiyuan_kindly', value: true }, { type: 'setFlag', flag: 'mercy_score', value: 1 }] },
          { text: '你想听真话还是假话？', next: 'DIA_203_XIYUAN_BITTER' },
          { text: '我们只是来拿神水。', next: 'DIA_203_XIYUAN_COLD' },
        ],
      },
    ],
  },
  DIA_203_XIYUAN_KIND: {
    id: 'DIA_203_XIYUAN_KIND',
    lines: [
      { speaker: '熙苑', text: '……谢谢你。很久没有人这样说过。' },
      { speaker: '系统', text: '获得饰品【熙苑的水镜】。' },
      { speaker: '熙苑', text: '神水拿去吧。愿你们重建的不只是房子，还有愿意相信彼此的心。' },
      { speaker: '系统', text: '获得【神水】、【御疗术之书】。慧慧学会【御疗术】。' },
      { speaker: '旁白', text: '圣水殿化为一潭水。熙苑化为七彩凤鸟飞向天空。' },
      { speaker: '旁白', text: '斜阳坠，落红徒白，暮雨纷纷。' },
      { speaker: '旁白', text: '朝云何觅，静水柳园乡草丛。' },
      { speaker: '旁白', text: '听风乐，白鹭轻吟，残雾撩萦。' },
      { speaker: '旁白', text: '镜中白雪，万年岁梦蝶舞飞。' },
    ],
    onComplete: XIYUAN_KIND_COMPLETION_ACTIONS,
  },
  DIA_203_XIYUAN_NEUTRAL: {
    id: 'DIA_203_XIYUAN_NEUTRAL',
    lines: [
      { speaker: '熙苑', text: '嗯。中性通过。' },
      { speaker: '系统', text: '获得【神水】、【御疗术之书】。慧慧学会【御疗术】。' },
      { speaker: '熙苑', text: '愿你们重建的不只是房子，还有愿意相信彼此的心。' },
      { speaker: '旁白', text: '圣水殿化为一潭水。熙苑化为七彩凤鸟飞向天空。' },
    ],
    onComplete: XIYUAN_SACRED_WATER_COMPLETION_ACTIONS,
  },
  DIA_203_XIYUAN_BITTER: {
    id: 'DIA_203_XIYUAN_BITTER',
    lines: [
      { speaker: '熙苑', text: '……你很诚实。至少比假话好。神水拿去吧。' },
      { speaker: '系统', text: '获得【神水】、【御疗术之书】。慧慧学会【御疗术】。' },
      { speaker: '旁白', text: '圣水殿化为一潭水。熙苑化为七彩凤鸟飞向天空。' },
    ],
    onComplete: XIYUAN_SACRED_WATER_COMPLETION_ACTIONS,
  },
  DIA_203_XIYUAN_COLD: {
    id: 'DIA_203_XIYUAN_COLD',
    lines: [
      { speaker: '熙苑', text: '……也是。神水拿去吧。' },
      { speaker: '系统', text: '获得【神水】。悲悯值-1。' },
      { speaker: '旁白', text: '圣水殿化为一潭水。熙苑化为七彩凤鸟飞向天空。' },
    ],
    onComplete: XIYUAN_COLD_COMPLETION_ACTIONS,
  },
  DIA_203_XIYUAN_AFTER: {
    id: 'DIA_203_XIYUAN_AFTER',
    lines: [
      { speaker: '熙苑', text: '神水已经交给你们。下一段路在神殿，不在这座殿里。' },
    ],
  },

  // ============================================================
  // SCN_301 - SCN_305：神殿路与重建
  // ============================================================

  // SCN_301 葱葱登场
  DIA_301_CONGCONG: {
    id: 'DIA_301_CONGCONG',
    lines: [
      { speaker: '慧慧', text: '刚才还没有这块大石头！' },
      { speaker: 'T', text: '也许它走过来的。' },
      { speaker: '阿博', text: '石头不会走。' },
      { speaker: '葱葱', text: '哈哈，美女，我来帮你们吧！不过要报酬。' },
      { speaker: '慧慧', text: '你是谁？是不是你把石头放在这里的？' },
      { speaker: '葱葱', text: '那又怎样？本少爷愿意！' },
      { speaker: '慧慧', text: '你找打！' },
      { speaker: '旁白', text: '慧慧五枚袖镖飞出。葱葱随手接住。' },
      { speaker: '葱葱', text: '定情信物！这是定情信物！' },
      { speaker: '慧慧', text: '谁跟你定情！' },
      { speaker: '阿博', text: '等一下。这个家伙不是一般人。' },
      { speaker: 'T', text: '说不定是xiaoai手下的魑魅魍魉之一。' },
      { speaker: '葱葱', text: '什么魑魅魍魉？本少爷这么英俊，哪里像？' },
      { speaker: '阿博', text: '你帮我们移开石头，我们给你报酬。' },
      { speaker: '葱葱', text: '我要你们身上一半的钱。' },
      { speaker: 'T', text: '你胃口真大。' },
      { speaker: '阿博', text: '成交。' },
      { speaker: '旁白', text: '葱葱移开石头，A顺势把葱葱吊在树上。' },
      { speaker: '葱葱', text: '你们说话不算数！' },
      { speaker: '慧慧', text: '谁叫你勒索我们。' },
      { speaker: '葱葱', text: '我错了！我只是迷路好几天没吃饭。' },
      {
        speaker: 'T',
        text: '……',
        choices: [
          { text: '放他下来。', next: 'DIA_301_RELEASE', actions: [{ type: 'setFlag', flag: 'trust_congcong', value: 1 }] },
          { text: '先审问。', next: 'DIA_301_INTERROGATE', actions: [{ type: 'setFlag', flag: 'info_tianjiange', value: true }] },
          { text: '让慧慧决定。', next: 'DIA_301_HUIHUI', actions: [{ type: 'setFlag', flag: 'trust_huihui', value: 1 }] },
        ],
      },
      { speaker: '葱葱', text: '你们不要上去。上面有麒麟和凤凰把守。' },
      { speaker: 'T', text: '你怎么知道？' },
      { speaker: '葱葱', text: '我是天剑阁阁主檠鹜烈的入室大弟子——葱葱是也！' },
      { speaker: 'T', text: '知道了。带路。' },
      { speaker: '葱葱', text: '你们反应也太冷淡了吧！' },
      { speaker: '系统', text: '葱葱加入队伍。' },
    ],
    onComplete: CONGCONG_JOIN_COMPLETION_ACTIONS,
  },
  DIA_301_RELEASE: {
    id: 'DIA_301_RELEASE',
    lines: [
      { speaker: 'T', text: '放他下来吧。' },
      { speaker: '葱葱', text: '终于！我以为要在树上过夜了！' },
      { speaker: '慧慧', text: '哼。看在你还知道认错的份上。' },
    ],
    onComplete: CONGCONG_JOIN_COMPLETION_ACTIONS,
  },
  DIA_301_INTERROGATE: {
    id: 'DIA_301_INTERROGATE',
    lines: [
      { speaker: '阿博', text: '先说清楚，你从哪来？' },
      { speaker: '葱葱', text: '天剑阁！我真的只是迷路了！' },
      { speaker: '阿博', text: '天剑阁……那是什么地方？' },
      { speaker: '葱葱', text: '那是我师父的地方。本少爷是入室大弟子！' },
      { speaker: '系统', text: '获得信息【天剑阁】。' },
    ],
    onComplete: CONGCONG_JOIN_COMPLETION_ACTIONS,
  },
  DIA_301_HUIHUI: {
    id: 'DIA_301_HUIHUI',
    lines: [
      { speaker: 'T', text: '慧慧，你决定吧。' },
      { speaker: '慧慧', text: '哼。看在你认错的份上，放你下来。但你得给我们带路。' },
      { speaker: '葱葱', text: '大小姐英明！' },
      { speaker: '慧慧', text: '少拍马屁。' },
    ],
    onComplete: CONGCONG_JOIN_COMPLETION_ACTIONS,
  },

  // SCN_302 七色路与迷惘界
  DIA_302_MIST: {
    id: 'DIA_302_MIST',
    lines: [
      { speaker: '慧慧', text: '怎么会有七条路？' },
      { speaker: '葱葱', text: '这是神铺下的七色路。心怀恶意的人会被引向罪恶深渊。' },
      { speaker: '阿博', text: '既然你这么了解，应该知道走哪条。' },
      { speaker: '葱葱', text: '今天蓝色路力量最弱。但是神知道这件事，所以一定有守卫。' },
      { speaker: 'T', text: '那就蓝色。' },
      { speaker: '葱葱', text: '等一下，我还没说完——' },
      { speaker: '旁白', text: '全队进入蓝色路，陷入黑暗。' },
      { speaker: '旁白', text: '梦境：T 看到年幼的 xiaoai。她头顶三花，身披白霞衣。一位看不清脸的人将权杖赐予她。' },
      { speaker: 'UNKNOWN', text: '神赐予你警世者的身份。去警世人间界。' },
      { speaker: 'xiaoai', text: '若人间不愿听呢？' },
      { speaker: 'UNKNOWN', text: '那你便看着。' },
      { speaker: 'xiaoai', text: '只看着？' },
      { speaker: 'UNKNOWN', text: '看见罪，记住罪，直到他们懂得畏惧。' },
      { speaker: 'T', text: 'xiaoai……' },
      { speaker: '系统', text: '触发迷惘影战斗！T单人2回合。' },
    ],
    onComplete: [{ type: 'battle', encounterId: 'BTL_310' }],
  },
  DIA_302_MIST_WAKE: {
    id: 'DIA_302_MIST_WAKE',
    lines: [
      { speaker: '葱葱', text: '醒醒！快醒啊！' },
      { speaker: 'T', text: '迷惘界？' },
      { speaker: '葱葱', text: '听我师傅说过，但我也第一次进来。' },
      { speaker: 'T', text: '你不是很懂吗？' },
      { speaker: '葱葱', text: '懂路，不懂梦。' },
      { speaker: '慧慧', text: '我梦见木桶镇又烧起来了。' },
      { speaker: '阿博', text: '我梦见大家都不在了。' },
      { speaker: 'T', text: '那就别让它变成真的。' },
    ],
  },

  // SCN_303 凤凰与麒麟
  DIA_303_PHOENIX: {
    id: 'DIA_303_PHOENIX',
    lines: [
      { speaker: '凤凰', text: '你们并非心底邪恶之人。回去吧。' },
      { speaker: 'T', text: '我们要取得神之桂冠。' },
      { speaker: '凤凰', text: '神物不是给执念之人的奖赏。' },
      { speaker: '慧慧', text: '我们是为了重建木桶镇！' },
      { speaker: '凤凰', text: '许多人都说自己为了正确之事。' },
      { speaker: '葱葱', text: '谈不拢了。' },
    ],
    onComplete: [{ type: 'battle', encounterId: 'BTL_311A' }],
  },
  DIA_303_PHOENIX_P2: {
    id: 'DIA_303_PHOENIX_P2',
    lines: [
      { speaker: '凤凰', text: '麒麟，现身。' },
      { speaker: '系统', text: '麒麟出现！凤凰与麒麟联手！' },
    ],
    onComplete: [{ type: 'battle', encounterId: 'BTL_311B' }],
  },
  DIA_303_SUN_APPEAR: {
    id: 'DIA_303_SUN_APPEAR',
    lines: [
      { speaker: '旁白', text: '一个年轻人出现，挡住所有攻击。' },
      { speaker: 'sun', text: '够了。' },
      { speaker: '凤凰', text: '祀者，他们不肯离去。' },
      { speaker: 'sun', text: '神都知道了。' },
      { speaker: 'sun', text: 'T，神在等你们。随我来。' },
      { speaker: '慧慧', text: '他是谁？' },
      { speaker: '葱葱', text: '看起来比我还会装。' },
      { speaker: '阿博', text: '也比你可靠。' },
    ],
  },

  // SCN_304 神殿与神之桂冠
  DIA_304_TEMPLE: {
    id: 'DIA_304_TEMPLE',
    lines: [
      { speaker: 'sun', text: '你们先四处看看。我去禀报。' },
      { speaker: 'T', text: '这里……是我梦见的地方。' },
      { speaker: 'sun', text: '为何不忘记那个梦？' },
      { speaker: 'T', text: '因为它不像梦。xiaoai是神界的人，对吧？' },
      { speaker: 'sun', text: '她是人间界的警世者。看遍了罪恶的脸孔，心底被黑暗势力牵引，从此堕入魔界。' },
      { speaker: 'T', text: '神只是看着？' },
      { speaker: 'sun', text: '神看到的是因果，不是每个人的疼痛。' },
      { speaker: 'T', text: '那我不喜欢神的看法。' },
      { speaker: 'sun', text: '也许这正是你被选中的原因。' },
      {
        speaker: 'T',
        text: '……',
        choices: [
          { text: '我想救她。', actions: [{ type: 'setFlag', flag: 'mercy_score', value: 1 }, { type: 'setFlag', flag: 'trust_sun', value: 1 }] },
          { text: '我会打倒她。', actions: [{ type: 'setFlag', flag: 'atk_bonus', value: true }] },
          { text: '我还不知道。', actions: [{ type: 'setFlag', flag: 'xiaoai_memory_fragments', value: 1 }] },
        ],
      },
      { speaker: 'sun', text: 'xiaoai被誉为近神的人。她的能力加上魔性，会变得更强。再见面时，你也要变得更强。' },
      { speaker: '慧慧', text: '终于找到你了！他们叫我们去旁殿。' },
      { speaker: 'sun', text: '神之桂冠就在祭台上。若你们已经准备好，就亲手取走它。' },
    ],
    onComplete: TEMPLE_VISITED_COMPLETION_ACTIONS,
  },
  DIA_304_GET_LAUREL: {
    id: 'DIA_304_GET_LAUREL',
    lines: [
      { speaker: 'sun', text: '这是神之桂冠。神允许你们重建木桶镇。' },
      { speaker: 'T', text: '神允许？' },
      { speaker: 'sun', text: '你可以理解为，神不阻止。' },
      { speaker: 'T', text: '那我就当他帮忙了。' },
      { speaker: '系统', text: '获得关键道具【神之桂冠】。主线任务更新：返回木桶镇，完成重建。' },
    ],
    onComplete: LAUREL_COMPLETION_ACTIONS,
  },

  // SCN_305 木桶镇重建
  DIA_305_REBUILD: {
    id: 'DIA_305_REBUILD',
    lines: [
      { speaker: '镇长', text: '你们真的带回来了。' },
      { speaker: '菠萝大叔', text: '千年树种！快，放在菜园旁边！' },
      { speaker: '慧慧', text: '神水要倒进水井吗？' },
      { speaker: '木桶精灵', text: '还有桂冠，放到会场中央。' },
      { speaker: '旁白', text: '三神物共鸣。树苗生长，水井恢复，废屋亮灯，会场中央升起木桶镇标记。' },
      { speaker: 'T', text: '这才像个可以回来的地方。' },
      { speaker: '阿博', text: '还差很多，但已经开始了。' },
      { speaker: '葱葱', text: '为了庆祝，能不能先吃饭？' },
      { speaker: '慧慧', text: '你除了吃还会想什么？' },
      { speaker: '葱葱', text: '想你。' },
      { speaker: '慧慧', text: '你还是吃吧。' },
      { speaker: '系统', text: '木桶镇重建等级提升至Lv.3。开放商店、训练场、支线板、装备强化。' },
    ],
    onComplete: [
      { type: 'questStart', questId: 'QST_008' },
      { type: 'questComplete', questId: 'QST_008' },
      { type: 'setFlag', flag: 'rebuild_level', value: 3 },
      { type: 'setFlag', flag: 'rebuild_ceremony_done', value: true },
      { type: 'questStart', questId: 'QST_009' },
    ],
  },

  // ============================================================
  // 第二篇：生命之泉 (SCN_401 - SCN_430)
  // ============================================================

  // SCN_401 独自前往生命之泉
  DIA_401_SPRING: {
    id: 'DIA_401_SPRING',
    lines: [
      { speaker: '旁白', text: '木桶镇一天天恢复。可 T 总无法忘记 xiaoai 在森林里留下的表情。那不是纯粹的恶意，更像一种不忍。' },
      { speaker: 'T', text: '生命之泉……你到底在那里等什么？' },
      { speaker: '慧慧', text: '这样可不够意思，丢下我们就走。' },
      { speaker: 'T', text: '你怎么在这里？' },
      { speaker: '慧慧', text: '我知道你会一个人来。' },
      { speaker: '葱葱', text: '这个大小姐一大早把我叫起来，我还以为有什么好吃的。' },
      { speaker: '慧慧', text: '你可以回去。' },
      { speaker: '葱葱', text: '我是特意来保护你的。' },
      { speaker: 'sun', text: '我也一起去。' },
      { speaker: 'T', text: '你也知道我会来？' },
      { speaker: 'sun', text: '神知道。或者说，我猜到了。' },
    ],
    onComplete: [{ type: 'setFlag', flag: 'life_spring_visited', value: true }],
  },

  // SCN_402 气壁与四封印
  DIA_402_BARRIER: {
    id: 'DIA_402_BARRIER',
    lines: [
      { speaker: '旁白', text: '透明气壁挡住前路。' },
      { speaker: 'T', text: '过不去。' },
      { speaker: 'sun', text: '生命之泉由祀神守护。xiaoai将祀神分成四体，封印在青龙潭、白虎穴、朱雀林、玄武殿，由魑魅魍魉把守。' },
      { speaker: '慧慧', text: '所以要先救出祀神？' },
      { speaker: 'sun', text: '是。四块碑牌回到圣石，气壁才会消失。' },
      { speaker: '葱葱', text: '听起来又是跑腿。' },
      { speaker: '木桶精灵', text: '史诗冒险本质上就是高风险跑腿。' },
      { speaker: '系统', text: '开放四封印任务。推荐顺序：青龙潭 → 白虎穴 → 朱雀林 → 玄武殿。' },
    ],
    onComplete: [{ type: 'questStart', questId: 'QST_010' }],
  },

  // SCN_411 青龙潭：魑
  DIA_411_CHI: {
    id: 'DIA_411_CHI',
    lines: [
      { speaker: '旁白', text: '青龙潭笼罩在一层绿色的毒雾中，水面泛着不正常的荧光。' },
      { speaker: 'xiaoai', text: '守护者，毒会先进入你们的肺，再进入你们的心。' },
      { speaker: '慧慧', text: '他说话好恶心。' },
      { speaker: '葱葱', text: '同意。' },
      { speaker: 'sun', text: '别吸入雾气。' },
    ],
    onComplete: [{ type: 'battle', encounterId: 'BTL_411' }],
  },
  DIA_411_CHI_AFTER: {
    id: 'DIA_411_CHI_AFTER',
    lines: [
      { speaker: 'xiaoai', text: '黑暗不是我给你们的……你们自己会生出来……' },
      { speaker: '系统', text: '获得【青龙碑牌】。sun解锁【五神召唤·青】。' },
    ],
  },

  // SCN_412 白虎穴：魅
  DIA_412_MEI: {
    id: 'DIA_412_MEI',
    lines: [
      { speaker: 'xiaoai', text: '你们想念白虎吗？我可以让它回来。' },
      { speaker: '旁白', text: '白虎幻影出现。' },
      { speaker: '白虎', text: '为什么没有救我？' },
      { speaker: '慧慧', text: '不是它。' },
      { speaker: 'T', text: '我知道。' },
      { speaker: 'xiaoai', text: '知道也会痛。痛就会露出破绽。' },
    ],
    onComplete: [{ type: 'battle', encounterId: 'BTL_412' }],
  },
  DIA_412_MEI_AFTER: {
    id: 'DIA_412_MEI_AFTER',
    lines: [
      { speaker: 'xiaoai', text: '记忆……竟然没有变成锁链……' },
      { speaker: '系统', text: '获得【白虎碑牌】。sun解锁【五神召唤·白】。' },
    ],
  },

  // SCN_413 朱雀林：魍
  DIA_413_WANG: {
    id: 'DIA_413_WANG',
    lines: [
      { speaker: 'xiaoai', text: '地上的人，总以为抬头就能看见天空。' },
      { speaker: '葱葱', text: '这家伙飞得真烦。' },
      { speaker: '慧慧', text: '那就把它打下来。' },
    ],
    onComplete: [{ type: 'battle', encounterId: 'BTL_413' }],
  },
  DIA_413_WANG_AFTER: {
    id: 'DIA_413_WANG_AFTER',
    lines: [
      { speaker: '系统', text: '获得【朱雀碑牌】。sun解锁【五神召唤·朱】。' },
    ],
  },

  // SCN_414 玄武殿：魉
  DIA_414_LIANG: {
    id: 'DIA_414_LIANG',
    lines: [
      { speaker: 'xiaoai', text: '小小守护者，也敢走进玄武殿？' },
      { speaker: 'T', text: '你们四个开场白都这么长吗？' },
      { speaker: '葱葱', text: '魔宫可能有培训。' },
    ],
    onComplete: [{ type: 'battle', encounterId: 'BTL_414' }],
  },
  DIA_414_LIANG_AFTER: {
    id: 'DIA_414_LIANG_AFTER',
    lines: [
      { speaker: '系统', text: '获得【玄武碑牌】。sun解锁【五神召唤·玄】。' },
      { speaker: '系统', text: '四封印全部解除！' },
      { speaker: '系统', text: 'released_four_seals = true' },
    ],
    onComplete: [{ type: 'setFlag', flag: 'released_four_seals', value: true }],
  },

  // SCN_420 祀神与轮回道
  DIA_420_GOD: {
    id: 'DIA_420_GOD',
    lines: [
      { speaker: '旁白', text: '四块碑牌嵌入圣石。生命之泉的水声突然变得遥远，像从另一个时代传来。' },
      { speaker: '祀神', text: '谢谢你们救了我。我能预知过去与未来。你们想知道什么？' },
      { speaker: 'T', text: 'xiaoai的过去。' },
      { speaker: '慧慧', text: 'T……' },
      { speaker: '祀神', text: '只有你一个人能去。你只有一分钟。' },
      { speaker: '系统', text: '进入限时事件【轮回道 60 秒】。' },
    ],
    onComplete: [
      { type: 'questComplete', questId: 'QST_009' },
      { type: 'questStart', questId: 'QST_011' },
    ],
  },
  DIA_420_REINCARNATION: {
    id: 'DIA_420_REINCARNATION',
    lines: [
      { speaker: 'xiaoai', text: '你是谁？' },
      { speaker: 'T', text: '一个从很久以后来的人。' },
      { speaker: 'xiaoai', text: '很久以后？那里的人间变好了吗？' },
      {
        speaker: 'T',
        text: '……',
        choices: [
          { text: '没有。但还有人在努力。', next: 'DIA_420_R2', actions: [{ type: 'setFlag', flag: 'xiaoai_memory_fragments', value: 1 }] },
          { text: '你会变成魔头。', next: 'DIA_420_R2_HURT' },
          { text: '我不能说。', next: 'DIA_420_R2_SLOW' },
        ],
      },
    ],
  },
  DIA_420_R2: {
    id: 'DIA_420_R2',
    lines: [
      { speaker: 'xiaoai', text: '神说我必须看着人间的罪。若我恨他们，是不是说明我不够接近神？' },
      {
        speaker: 'T',
        text: '……',
        choices: [
          { text: '恨说明你还在乎。', next: 'DIA_420_R3', actions: [{ type: 'setFlag', flag: 'mercy_score', value: 1 }] },
          { text: '神不会恨。', next: 'DIA_420_R3', actions: [{ type: 'setFlag', flag: 'trust_sun', value: 1 }] },
          { text: '不要相信神。', next: 'DIA_420_R3_UNSTABLE' },
        ],
      },
    ],
  },
  DIA_420_R2_HURT: {
    id: 'DIA_420_R2_HURT',
    lines: [
      { speaker: 'xiaoai', text: '……我？魔头？' },
      { speaker: '旁白', text: '她的表情从好奇变为受伤。轮回道的画面开始颤抖。' },
      { speaker: 'xiaoai', text: '神说我必须看着人间的罪。若我恨他们，是不是说明我不够接近神？' },
      {
        speaker: 'T',
        text: '……',
        choices: [
          { text: '恨说明你还在乎。', next: 'DIA_420_R3', actions: [{ type: 'setFlag', flag: 'mercy_score', value: 1 }] },
          { text: '神不会恨。', next: 'DIA_420_R3', actions: [{ type: 'setFlag', flag: 'trust_sun', value: 1 }] },
          { text: '不要相信神。', next: 'DIA_420_R3_UNSTABLE' },
        ],
      },
    ],
  },
  DIA_420_R2_SLOW: {
    id: 'DIA_420_R2_SLOW',
    lines: [
      { speaker: 'xiaoai', text: '你不能说？那你还来做什么？' },
      { speaker: '旁白', text: '轮回道时间消耗加剧。' },
      { speaker: 'xiaoai', text: '神说我必须看着人间的罪。若我恨他们，是不是说明我不够接近神？' },
      {
        speaker: 'T',
        text: '……',
        choices: [
          { text: '恨说明你还在乎。', next: 'DIA_420_R3', actions: [{ type: 'setFlag', flag: 'mercy_score', value: 1 }] },
          { text: '神不会恨。', next: 'DIA_420_R3', actions: [{ type: 'setFlag', flag: 'trust_sun', value: 1 }] },
          { text: '不要相信神。', next: 'DIA_420_R3_UNSTABLE' },
        ],
      },
    ],
  },
  DIA_420_R3: {
    id: 'DIA_420_R3',
    lines: [
      { speaker: 'xiaoai', text: '那我该怎么做？' },
      {
        speaker: 'T',
        text: '……',
        choices: [
          { text: '不要让黑暗替你回答。', next: 'DIA_420_END', actions: [{ type: 'setFlag', flag: 'true_route_reincarnation', value: true }] },
          { text: '千万不要变成魔头。', next: 'DIA_420_END' },
          { text: '等我去救你。', next: 'DIA_420_END', actions: [{ type: 'setFlag', flag: 'mercy_score', value: 1 }] },
        ],
      },
    ],
  },
  DIA_420_R3_UNSTABLE: {
    id: 'DIA_420_R3_UNSTABLE',
    lines: [
      { speaker: '旁白', text: '轮回道剧烈震颤。画面开始失真。' },
      { speaker: 'xiaoai', text: '那我该怎么做？' },
      {
        speaker: 'T',
        text: '……',
        choices: [
          { text: '不要让黑暗替你回答。', next: 'DIA_420_END', actions: [{ type: 'setFlag', flag: 'true_route_reincarnation', value: true }] },
          { text: '千万不要变成魔头。', next: 'DIA_420_END' },
          { text: '等我去救你。', next: 'DIA_420_END', actions: [{ type: 'setFlag', flag: 'mercy_score', value: 1 }] },
        ],
      },
    ],
  },
  DIA_420_END: {
    id: 'DIA_420_END',
    lines: [
      { speaker: '旁白', text: '时间结束。' },
      { speaker: '旁白', text: '几多萦绕，梦里芳华。' },
      { speaker: '旁白', text: '几度春秋寒暑，一叶孤舟。' },
      { speaker: '旁白', text: '望山川，依楼听风雨，不觉今朝。' },
    ],
  },

  // SCN_430 生命之泉外 xiaoai 影战
  DIA_430_SHADOW: {
    id: 'DIA_430_SHADOW',
    lines: [
      { speaker: 'T', text: '不可能。我明明和她说了。' },
      { speaker: 'xiaoai', text: '你以为一句话能改变二十年的黑暗？' },
      { speaker: '慧慧', text: 'xiaoai！' },
      { speaker: 'xiaoai', text: '吟唱，风。讴歌，月。' },
      { speaker: '旁白', text: '两把巨大的剑出现在xiaoai手中。' },
    ],
    onComplete: [{ type: 'battle', encounterId: 'BTL_430' }],
  },
  DIA_430_SHADOW_AFTER: {
    id: 'DIA_430_SHADOW_AFTER',
    lines: [
      { speaker: 'xiaoai', text: '干得不错。我在魔宫等你。' },
      { speaker: '慧慧', text: '只是影子吗？' },
      { speaker: 'sun', text: '她比以前更强了。T，今后的事情交给你。' },
      { speaker: 'T', text: '你不一起？' },
      { speaker: 'sun', text: '神的使者不能替人做出人的选择。' },
      { speaker: '葱葱', text: '你们神殿的人都这么会说半句吗？' },
      { speaker: 'sun', text: '是。' },
    ],
  },

  // ============================================================
  // 第三篇：魔宫决战 (SCN_501 - SCN_530)
  // ============================================================

  // SCN_501 A 被抓
  DIA_501_CAPTURED: {
    id: 'DIA_501_CAPTURED',
    lines: [
      { speaker: '旁白', text: '木桶镇的灯火乱成一片。居民聚在会场，空气里有烧焦的木头味。' },
      { speaker: 'T', text: '这是怎么回事？' },
      { speaker: '镇长', text: '魔头的人又来了……A被他们抓走了。' },
      { speaker: '慧慧', text: 'A？为什么是他？' },
      { speaker: '镇长', text: '他们留下话，要你去魔宫。' },
      { speaker: '葱葱', text: '这明显是陷阱。' },
      { speaker: 'T', text: '当然是陷阱。' },
      { speaker: '慧慧', text: '那也要去。' },
      { speaker: 'T', text: '我知道。' },
      {
        speaker: 'T',
        text: '……',
        choices: [
          { text: '我们去救A。', actions: [{ type: 'setFlag', flag: 'trust_huihui', value: 1 }] },
          { text: '先确认镇里伤亡。', next: 'DIA_501_CHECK', actions: [{ type: 'setFlag', flag: 'mercy_score', value: 1 }] },
          { text: 'xiaoai是冲我来的。', next: 'DIA_501_SOLO' },
        ],
      },
      { speaker: '系统', text: '主线任务更新【前往魔宫】。' },
    ],
    onComplete: DARK_PALACE_CAPTURED_COMPLETION_ACTIONS,
  },
  DIA_501_CHECK: {
    id: 'DIA_501_CHECK',
    lines: [
      { speaker: 'T', text: '先看看镇里的情况。' },
      { speaker: '镇长', text: '还好，没有人员伤亡。只是……A不见了。' },
      { speaker: '慧慧', text: '谢谢你的关心，T。' },
      { speaker: '系统', text: '获得额外补给。悲悯值+1。' },
    ],
    onComplete: DARK_PALACE_CAPTURED_COMPLETION_ACTIONS,
  },
  DIA_501_SOLO: {
    id: 'DIA_501_SOLO',
    lines: [
      { speaker: 'T', text: '这一切都是冲我来的。是我的错。' },
      { speaker: '慧慧', text: '不是你的错。是我们的战斗。' },
      { speaker: '葱葱', text: '别说丧气话了。我们走。' },
    ],
    onComplete: DARK_PALACE_CAPTURED_COMPLETION_ACTIONS,
  },

  // SCN_510 黑暗沼泽
  DIA_510_SWAMP: {
    id: 'DIA_510_SWAMP',
    lines: [
      { speaker: '慧慧', text: '看，魔宫在前面！' },
      { speaker: '葱葱', text: '小心。' },
      { speaker: '旁白', text: '葱葱割断慧慧身后的怪物。' },
      { speaker: '慧慧', text: '我看见了！' },
      { speaker: '葱葱', text: '我知道，所以我才更快。' },
      { speaker: 'T', text: '这黑暗沼泽要怎么过？' },
      { speaker: '葱葱', text: '找木头？' },
      { speaker: '慧慧', text: '全是湿的。' },
    ],
    onComplete: [{ type: 'battle', encounterId: 'BTL_510' }],
  },
  DIA_510_SWAMP_WET: {
    id: 'DIA_510_SWAMP_WET',
    lines: [
      { speaker: 'T', text: '派不上用场。' },
    ],
  },
  DIA_510_SWAMP_MOSS: {
    id: 'DIA_510_SWAMP_MOSS',
    lines: [
      { speaker: '慧慧', text: '滑得站不住。' },
    ],
  },
  DIA_510_SWAMP_MECH: {
    id: 'DIA_510_SWAMP_MECH',
    lines: [
      { speaker: '旁白', text: '慧慧跺脚触发隐藏机关。' },
      { speaker: '慧慧', text: '烦死了！' },
      { speaker: '旁白', text: '地动山摇，一条锁链浮出沼泽。' },
      { speaker: '葱葱', text: '你看，大小姐的脾气也有战略价值。' },
      { speaker: '慧慧', text: '你再说一遍？' },
    ],
    onComplete: [{ type: 'battle', encounterId: 'BTL_512' }],
  },

  // SCN_520 魔宫大厅与下午茶
  DIA_520_PALACE: {
    id: 'DIA_520_PALACE',
    lines: [
      { speaker: '旁白', text: '四个怪头的大门缓缓打开。大厅深处，一个黑影坐在长桌后。' },
      { speaker: '慧慧', text: '大魔头，不要装神弄鬼！快把A交出来！' },
      { speaker: 'xiaoai', text: '不要着急，小姑娘。你的情人没事。' },
      { speaker: '慧慧', text: '谁、谁是情人！' },
      { speaker: '葱葱', text: '这句我受伤了。' },
      { speaker: 'xiaoai', text: '我只是请他喝下午茶。你们要不要一杯？' },
      { speaker: '旁白', text: '三杯茶自己长了腿，挪到三人面前。' },
      { speaker: 'T', text: '不必。' },
      { speaker: '旁白', text: 'T运气接住茶杯，反手打回去，却打偏在墙上。' },
      { speaker: 'xiaoai', text: '不喝就不喝，为什么浪费？' },
      { speaker: 'T', text: '你不是xiaoai。' },
      { speaker: '慧慧', text: '什么？' },
      { speaker: 'xiaoai', text: '哦？' },
      { speaker: 'T', text: '眼神不像。你没有她那种像神又像鬼的表情。' },
      { speaker: 'xiaoai', text: '那就看看假的能不能杀死真的守护者。' },
    ],
    onComplete: [{ type: 'battle', encounterId: 'BTL_520' }],
  },
  DIA_520_RESCUE_A: {
    id: 'DIA_520_RESCUE_A',
    lines: [
      { speaker: '慧慧', text: '呜呜声！在那里！' },
      { speaker: '旁白', text: '慧慧和葱葱找到被吊起的A。' },
      { speaker: '阿博', text: '唔！唔唔！' },
      { speaker: '葱葱', text: '他说什么？' },
      { speaker: '慧慧', text: '他说快放我下来！' },
      { speaker: '旁白', text: '拉下绳子，A落地，同时T脚下铁板震动。' },
      { speaker: 'T', text: '糟了。' },
      { speaker: '阿博', text: 'T！' },
      { speaker: '旁白', text: 'T落入地下魔宫，缺口关闭。' },
    ],
    onComplete: [{ type: 'addParty', characterId: 'A' }],
  },

  // SCN_530 地下魔宫 xiaoai 真身
  DIA_530_XIAOAI: {
    id: 'DIA_530_XIAOAI',
    lines: [
      { speaker: 'T', text: '是你安排好的吧，xiaoai。' },
      { speaker: 'xiaoai', text: '你来了。' },
      { speaker: 'T', text: '一开始我就觉得那个人不是你。' },
      { speaker: 'xiaoai', text: '为什么？' },
      { speaker: 'T', text: '因为眼神不像。他没有你那般若的表情。' },
      { speaker: 'xiaoai', text: '你很在意我的表情。' },
      { speaker: 'T', text: '因为那不像魔头该有的表情。' },
      { speaker: 'xiaoai', text: '那魔头该是什么样？' },
      { speaker: 'T', text: '至少不该难过。' },
      { speaker: '旁白', text: '短暂停顿。' },
      { speaker: 'xiaoai', text: '受死吧。' },
    ],
    onComplete: [{ type: 'battle', encounterId: 'BTL_530' }],
  },
  DIA_530_CHOICE: {
    id: 'DIA_530_CHOICE',
    lines: [
      { speaker: '旁白', text: 'xiaoai力量耗尽，跪倒在地。黑暗从她身上剥离，像一层层撕开的面具。' },
      { speaker: '系统', text: '关键选择：终结攻击 或 戒光净化。' },
      {
        speaker: 'T',
        text: '……',
        choices: [
          { text: '终结攻击', next: 'DIA_530_KILL', actions: [{ type: 'setFlag', flag: 'normal_ending_seen', value: true }] },
          { text: '戒光净化', next: 'DIA_530_PURIFY', actions: [{ type: 'setFlag', flag: 'xiaoai_purified', value: true }] },
          { text: '防御并呼唤伙伴', next: 'DIA_530_CALL' },
        ],
      },
    ],
  },
  DIA_530_KILL: {
    id: 'DIA_530_KILL',
    lines: [
      { speaker: '旁白', text: 'T举起剑。xiaoai抬头，没有躲避。' },
      { speaker: 'xiaoai', text: '这样也不错。' },
      { speaker: '旁白', text: 'xiaoai化为白烟。地下魔宫门打开。' },
      { speaker: '系统', text: '进入普通结局。normal_ending_seen = true。' },
    ],
    onComplete: [{ type: 'questComplete', questId: 'QST_012' }],
  },
  DIA_530_PURIFY: {
    id: 'DIA_530_PURIFY',
    lines: [
      { speaker: '旁白', text: '无名戒指发出白光，笼罩xiaoai全身。黑暗一层层剥离。' },
      { speaker: 'xiaoai', text: '其实，魔并不是人们最可怕的敌人。' },
      { speaker: 'T', text: '我知道。' },
      { speaker: 'xiaoai', text: '最可怕的敌人，在人们自己心里。' },
      { speaker: 'T', text: '那你呢？你的心里还有什么？' },
      { speaker: 'xiaoai', text: '一点……来不及熄灭的光。' },
      { speaker: 'xiaoai', text: '还有，T，小心……' },
      { speaker: 'T', text: '小心什么？' },
      { speaker: '旁白', text: 'xiaoai化为白烟。地下魔宫门打开。' },
    ],
  },
  DIA_530_CALL: {
    id: 'DIA_530_CALL',
    lines: [
      { speaker: 'T', text: '慧慧！A！葱葱！' },
      { speaker: '旁白', text: '上方传来伙伴的声音。' },
      { speaker: '慧慧', text: 'T！我们在这里！' },
      { speaker: '阿博', text: '撑住！' },
      { speaker: '葱葱', text: '别倒下啊！' },
      { speaker: '旁白', text: '伙伴的声音化为力量。T的TP回满。' },
      { speaker: '系统', text: 'TP回满。再次选择：终结攻击 或 戒光净化。' },
      {
        speaker: 'T',
        text: '……',
        choices: [
          { text: '终结攻击', next: 'DIA_530_KILL', actions: [{ type: 'setFlag', flag: 'normal_ending_seen', value: true }] },
          { text: '戒光净化', next: 'DIA_530_PURIFY', actions: [{ type: 'setFlag', flag: 'xiaoai_purified', value: true }] },
        ],
      },
    ],
  },
  DIA_530_PURIFY_SUCCESS: {
    id: 'DIA_530_PURIFY_SUCCESS',
    lines: [
      { speaker: '旁白', text: '白烟没有散尽，而是凝成一枚微弱的光。' },
      { speaker: '系统', text: '获得【xiaoai的残光】。预言之书自动翻页。' },
      { speaker: '木桶精灵', text: '预言还没有结束。' },
    ],
    onComplete: [
      { type: 'setFlag', flag: 'true_route_unlocked', value: true },
      { type: 'addParty', characterId: TRUE_ENDING_SUPPORT_CHARACTER_ID },
      { type: 'questComplete', questId: 'QST_012' },
      { type: 'questStart', questId: 'QST_013' },
    ],
  },

  // ============================================================
  // 普通结局 (SCN_601)
  // ============================================================

  DIA_601_NORMAL: {
    id: 'DIA_601_NORMAL',
    lines: [
      { speaker: '旁白', text: '魔宫的黑暗退去。木桶镇恢复了平静。' },
      { speaker: '慧慧', text: '结束了吗？' },
      { speaker: '阿博', text: '至少现在结束了。' },
      { speaker: '葱葱', text: '那可以吃饭了吗？' },
      { speaker: 'T', text: 'xiaoai最后说让我小心。' },
      { speaker: '慧慧', text: '小心什么？' },
      { speaker: 'T', text: '她没来得及说。' },
      { speaker: '镇长', text: '有些答案，也许要留给以后。' },
      { speaker: '旁白', text: '木桶镇重新亮起灯火。人们记住了勇士的名字，却不知道那缕白烟最后想提醒什么。' },
      { speaker: '系统', text: '达成结局【重建的家园】。保存通关记录后可继续探索并开启真结局补完。' },
    ],
    onComplete: NORMAL_ENDING_COMPLETION_ACTIONS,
  },

  // ============================================================
  // 真结局：人心之渊 (SCN_701 - SCN_730)
  // ============================================================

  // SCN_701 预言之书失控
  DIA_701_BOOK: {
    id: 'DIA_701_BOOK',
    lines: [
      { speaker: '旁白', text: '预言之书自动翻开，书页上的文字被黑色墨迹吞没。' },
      { speaker: '木桶精灵', text: '不好。有什么东西在吃预言。' },
      { speaker: 'sun', text: '无相。' },
      { speaker: 'T', text: '那是什么？' },
      { speaker: 'sun', text: '不是神，不是魔。是人心黑暗聚合后的形体。xiaoai是被它推下去的人，不是源头。' },
      { speaker: '慧慧', text: '所以她最后想说"小心无相"？' },
      { speaker: 'sun', text: '也许。' },
      { speaker: '阿博', text: '它在哪里？' },
      { speaker: '木桶精灵', text: '书页背面。也就是所有没被说出口的地方。' },
      { speaker: '系统', text: '开启最终区域【人心之渊】。' },
    ],
  },

  // SCN_710 人心之渊入口
  DIA_710_ENTER: {
    id: 'DIA_710_ENTER',
    lines: [
      { speaker: '旁白', text: '人心之渊没有天空，也没有地面。只有一条像墨迹凝成的路，通向无数人的影子。' },
      { speaker: '无相', text: '你们终于来了。守护者、祀者、逃兵、骗子、胆小鬼。' },
      { speaker: '葱葱', text: '它说骗子的时候是不是看我？' },
      { speaker: '慧慧', text: '很明显。' },
      { speaker: '阿博', text: '别被激怒。' },
      { speaker: '无相', text: '我不需要制造黑暗。我只负责让你们承认，它本来就在。' },
    ],
  },

  // SCN_711 T 的心影
  DIA_711_SHADOW_T: {
    id: 'DIA_711_SHADOW_T',
    lines: [
      { speaker: '无相', text: '你总是装作不在乎。这样就算失去，也可以说自己本来没期待。' },
      { speaker: 'T', text: '你话真多。' },
      { speaker: '无相', text: '看，又来了。' },
    ],
    onComplete: [{ type: 'battle', encounterId: 'BTL_701' }],
  },
  DIA_711_SHADOW_T_AFTER: {
    id: 'DIA_711_SHADOW_T_AFTER',
    lines: [
      { speaker: 'T', text: '我害怕。害怕像父母一样，保护了什么，又什么都没留下。' },
      { speaker: '慧慧', text: '你留下了我们。' },
      { speaker: 'T', text: '嗯。所以我不会再装作无所谓。' },
      { speaker: '系统', text: 'T终战获得【守乡心】。' },
    ],
  },

  // SCN_712 慧慧的心影
  DIA_712_SHADOW_HH: {
    id: 'DIA_712_SHADOW_HH',
    lines: [
      { speaker: '无相', text: '你照顾所有人，因为你怕自己一松手，他们就不见了。' },
      { speaker: '慧慧', text: '我只是……不想再看见谁倒下。' },
    ],
    onComplete: [{ type: 'battle', encounterId: 'BTL_702' }],
  },
  DIA_712_SHADOW_HH_AFTER: {
    id: 'DIA_712_SHADOW_HH_AFTER',
    lines: [
      { speaker: '慧慧', text: '我不能替大家承受所有伤。但我可以站在这里，等你们需要我。' },
      { speaker: '系统', text: '慧慧终战获得【不逃之铃】。' },
    ],
  },

  // SCN_713 A 的心影
  DIA_713_SHADOW_A: {
    id: 'DIA_713_SHADOW_A',
    lines: [
      { speaker: '无相', text: '你沉稳，因为你觉得自己不能倒。可你也会累。' },
      { speaker: '阿博', text: '我知道。' },
      { speaker: '无相', text: '你不知道。你从来不说。' },
    ],
    onComplete: [{ type: 'battle', encounterId: 'BTL_703' }],
  },
  DIA_713_SHADOW_A_AFTER: {
    id: 'DIA_713_SHADOW_A_AFTER',
    lines: [
      { speaker: '阿博', text: '我也会怕。但怕不代表不能往前。' },
      { speaker: '系统', text: 'A终战获得【山岳心】。' },
    ],
  },

  // SCN_714 葱葱的心影
  DIA_714_SHADOW_CC: {
    id: 'DIA_714_SHADOW_CC',
    lines: [
      { speaker: '无相', text: '你把真心藏在玩笑里，因为被拒绝就能说自己只是开玩笑。' },
      { speaker: '葱葱', text: '这话太没礼貌了。' },
      { speaker: '慧慧', text: '但有点准。' },
      { speaker: '葱葱', text: '大小姐你站哪边？' },
    ],
    onComplete: [{ type: 'battle', encounterId: 'BTL_704' }],
  },
  DIA_714_SHADOW_CC_AFTER: {
    id: 'DIA_714_SHADOW_CC_AFTER',
    lines: [
      { speaker: '葱葱', text: '好吧。我怕自己不够可靠，所以先装得不可靠。' },
      { speaker: '慧慧', text: '你终于说了句像样的话。' },
      { speaker: '系统', text: '葱葱终战获得【真风步】。' },
    ],
  },

  // SCN_715 sun 的心影
  DIA_715_SHADOW_SUN: {
    id: 'DIA_715_SHADOW_SUN',
    lines: [
      { speaker: '无相', text: '你说神不能替人选择。其实是你害怕自己选择错。' },
      { speaker: 'sun', text: '……' },
      { speaker: 'T', text: '这一次，你站哪边？' },
      { speaker: 'sun', text: '站在你们这边。' },
    ],
    onComplete: [{ type: 'battle', encounterId: 'BTL_705' }],
  },
  DIA_715_SHADOW_SUN_AFTER: {
    id: 'DIA_715_SHADOW_SUN_AFTER',
    lines: [
      { speaker: 'sun', text: '若旁观也是罪，那我愿意从这里开始偿还。' },
      { speaker: '系统', text: 'sun终战获得【人的祈愿】。' },
    ],
  },

  // SCN_720 最终战：无相
  DIA_720_WUXIANG: {
    id: 'DIA_720_WUXIANG',
    lines: [
      { speaker: '无相', text: '你们打倒xiaoai，以为黑暗就会消失。多么方便的故事。' },
      { speaker: 'T', text: '所以这次不方便了。我们来打倒你。' },
      { speaker: '无相', text: '我没有形体。你们挥剑，只会砍到自己。' },
      { speaker: '旁白', text: 'xiaoai的残光出现。' },
      { speaker: 'xiaoai', text: '它没有形体，就给它一个名字。叫出名字的黑暗，就能被看见。' },
      { speaker: '慧慧', text: 'xiaoai？' },
      { speaker: 'xiaoai', text: '只是一点残光。' },
      { speaker: 'sun', text: '无相，以人心为壳，以恐惧为骨，以旁观为血。' },
      { speaker: '阿博', text: '现在能打了？' },
      { speaker: '葱葱', text: '我喜欢这个问题。' },
    ],
    onComplete: [{ type: 'battle', encounterId: 'BTL_720' }],
  },
  DIA_720_WUXIANG_END: {
    id: 'DIA_720_WUXIANG_END',
    lines: [
      { speaker: '无相', text: '我不会消失。只要人心还会害怕，我就会回来。' },
      { speaker: 'T', text: '那我们就每次都把你认出来。' },
      { speaker: 'xiaoai', text: '这一次，我不再只是看着。' },
      { speaker: '系统', text: 'T与xiaoai发动【风月止息】。' },
      { speaker: '旁白', text: '风与月的两把剑不再指向人间，而是斩开黑暗本身。' },
    ],
  },

  // SCN_730 真结局
  DIA_730_TRUE_END: {
    id: 'DIA_730_TRUE_END',
    lines: [
      { speaker: '旁白', text: '天亮的时候，木桶镇的水井先发出声音。然后是树叶，然后是人的脚步声。这个镇子像从一场很长的梦里醒来。' },
      { speaker: '慧慧', text: '结束了吗？' },
      { speaker: 'T', text: '不会永远结束。但现在结束了。' },
      { speaker: '阿博', text: '这次说得像个勇士。' },
      { speaker: '葱葱', text: '我也很勇士。' },
      { speaker: '慧慧', text: '你只是没逃。' },
      { speaker: '葱葱', text: '这已经很伟大了。' },
      { speaker: 'sun', text: '神殿会记录这一天。' },
      { speaker: 'T', text: '别只记录。下次早点帮忙。' },
      { speaker: 'sun', text: '我会转告神。' },
      { speaker: '旁白', text: 'xiaoai的残光停在生命之泉上方。' },
      { speaker: 'xiaoai', text: 'T。' },
      { speaker: 'T', text: '你要走了？' },
      { speaker: 'xiaoai', text: '警世者看了太久。现在，我想闭上眼睛。' },
      { speaker: 'T', text: '人间也没有你想的那么糟。' },
      { speaker: 'xiaoai', text: '我知道了。因为你们让我看见了。' },
      { speaker: '慧慧', text: '她笑了。' },
      { speaker: '阿博', text: '嗯。' },
      { speaker: '葱葱', text: '那我们是不是该吃饭庆祝？' },
      { speaker: '木桶精灵', text: '预言之书最后一页写着：饭团管够。' },
      { speaker: '菠萝大叔', text: '谁写的？' },
      { speaker: '木桶精灵', text: '预言。' },
      { speaker: '菠萝大叔', text: '预言也得付钱。' },
      { speaker: '旁白', text: '木桶镇重新成为木桶镇。不是因为黑暗永远消失，而是因为这里的人终于知道，当黑暗再来时，他们会一起点灯。' },
      { speaker: '系统', text: '达成真结局【点灯的人们】。' },
    ],
  },

  // ============================================================
  // 支线对话
  // ============================================================

  // 慧慧支线：不想再迟到的人
  DIA_SIDE_HH_01: {
    id: 'DIA_SIDE_HH_01',
    lines: [
      { speaker: '慧慧', text: 'T，你有没有想过……为什么我每次都催你？' },
      { speaker: 'T', text: '因为我慢？' },
      { speaker: '慧慧', text: '不是。是因为……小时候你父母战死那天，我也是迟了一步才知道消息。' },
      { speaker: '慧慧', text: '我一直觉得，如果我早一点到，也许……' },
      { speaker: 'T', text: '慧慧……' },
      {
        speaker: 'T',
        text: '……',
        choices: [
          { text: '那不是你的错。', next: 'DIA_SIDE_HH_01_COMFORT', actions: [{ type: 'setFlag', flag: 'trust_huihui', value: 2 }, { type: 'setFlag', flag: 'mercy_score', value: 1 }] },
          { text: '你现在不是已经到了吗？', next: 'DIA_SIDE_HH_01_JOKE', actions: [{ type: 'setFlag', flag: 'trust_huihui', value: 1 }] },
          { text: '……', next: 'DIA_SIDE_HH_01_SILENT' },
        ],
      },
    ],
  },
  DIA_SIDE_HH_01_COMFORT: {
    id: 'DIA_SIDE_HH_01_COMFORT',
    lines: [
      { speaker: '慧慧', text: '谢谢你，T。' },
      { speaker: '旁白', text: '记忆小妖从暗处涌出，试图吞噬这段回忆。' },
      { speaker: '系统', text: '战斗开始！' },
    ],
    onComplete: [{ type: 'battle', encounterId: 'BTL_SIDE_HH_01' }],
  },
  DIA_SIDE_HH_01_JOKE: {
    id: 'DIA_SIDE_HH_01_JOKE',
    lines: [
      { speaker: '慧慧', text: '你……算了，至少你说了句不那么气人的话。' },
      { speaker: '旁白', text: '记忆小妖从暗处涌出，试图吞噬这段回忆。' },
      { speaker: '系统', text: '战斗开始！' },
    ],
    onComplete: [{ type: 'battle', encounterId: 'BTL_SIDE_HH_01' }],
  },
  DIA_SIDE_HH_01_SILENT: {
    id: 'DIA_SIDE_HH_01_SILENT',
    lines: [
      { speaker: '旁白', text: 'T没有说话，只是站在慧慧身旁。风吹过木桶镇，风铃发出清脆的声响。' },
      { speaker: '慧慧', text: '……谢谢你陪着我。' },
      { speaker: '旁白', text: '记忆小妖从暗处涌出，试图吞噬这段回忆。' },
      { speaker: '系统', text: '战斗开始！解锁连携【月下回旋】。' },
    ],
    onComplete: [{ type: 'battle', encounterId: 'BTL_SIDE_HH_01' }],
  },
  DIA_SIDE_HH_01_AFTER: {
    id: 'DIA_SIDE_HH_01_AFTER',
    lines: [
      { speaker: '系统', text: '获得饰品【粉色风铃】。慧慧技能【清心铃】强化。' },
    ],
  },

  // A 支线：沉稳的人也会害怕
  DIA_SIDE_A_01: {
    id: 'DIA_SIDE_A_01',
    lines: [
      { speaker: '阿博', text: 'T，和我对练。' },
      { speaker: 'T', text: '怎么了？' },
      { speaker: '阿博', text: '被抓的事……让我觉得自己拖累了你们。' },
      { speaker: '阿博', text: '我需要变强。' },
      {
        speaker: 'T',
        text: '……',
        choices: [
          { text: '好，我陪你练。', next: 'DIA_SIDE_A_01_FIGHT', actions: [{ type: 'setFlag', flag: 'trust_a', value: 2 }] },
          { text: '你应该休息。', next: 'DIA_SIDE_A_01_REST', actions: [{ type: 'setFlag', flag: 'mercy_score', value: 1 }] },
          { text: '让慧慧劝你。', next: 'DIA_SIDE_A_01_HUIHUI' },
        ],
      },
    ],
  },
  DIA_SIDE_A_01_FIGHT: {
    id: 'DIA_SIDE_A_01_FIGHT',
    lines: [
      { speaker: '阿博', text: '来吧。' },
    ],
    onComplete: [{ type: 'battle', encounterId: 'BTL_SIDE_A_01' }],
  },
  DIA_SIDE_A_01_REST: {
    id: 'DIA_SIDE_A_01_REST',
    lines: [
      { speaker: 'T', text: '你已经很强了。不是每次都要硬撑。' },
      { speaker: '阿博', text: '……谢谢。' },
      { speaker: '系统', text: '获得防御饰品【守护护符】。悲悯值+1。' },
    ],
    onComplete: SIDE_A_REST_COMPLETION_ACTIONS,
  },
  DIA_SIDE_A_01_HUIHUI: {
    id: 'DIA_SIDE_A_01_HUIHUI',
    lines: [
      { speaker: '慧慧', text: 'A！你要是再逞强，我就用袖镖钉你！' },
      { speaker: '阿博', text: '……' },
      { speaker: '慧慧', text: '我们是一起的。拖累不拖累的，由不得你一个人说了算。' },
      { speaker: '阿博', text: '……好。' },
    ],
    onComplete: SIDE_A_COMPLETION_ACTIONS,
  },
  DIA_SIDE_A_01_AFTER: {
    id: 'DIA_SIDE_A_01_AFTER',
    lines: [
      { speaker: '系统', text: 'A技能【山崩】提前解锁。' },
    ],
  },

  // 葱葱支线：天剑阁来信
  DIA_SIDE_CC_01: {
    id: 'DIA_SIDE_CC_01',
    lines: [
      { speaker: '葱葱', text: 'T，我师父来信了。' },
      { speaker: 'T', text: '说什么？' },
      { speaker: '葱葱', text: '让我回去继任天剑阁阁主。' },
      { speaker: '葱葱', text: '可是我不想放弃你们。' },
      {
        speaker: 'T',
        text: '……',
        choices: [
          { text: '留下来吧。', next: 'DIA_SIDE_CC_01_STAY', actions: [{ type: 'setFlag', flag: 'trust_congcong', value: 2 }] },
          { text: '回去看看也好。', next: 'DIA_SIDE_CC_01_VISIT' },
          { text: '让慧慧决定。', next: 'DIA_SIDE_CC_01_HUIHUI', actions: [{ type: 'setFlag', flag: 'trust_huihui', value: 1 }, { type: 'setFlag', flag: 'trust_congcong', value: 1 }] },
        ],
      },
    ],
  },
  DIA_SIDE_CC_01_STAY: {
    id: 'DIA_SIDE_CC_01_STAY',
    lines: [
      { speaker: '葱葱', text: '真的可以吗？' },
      { speaker: 'T', text: '你是我们的伙伴。这里需要你。' },
      { speaker: '葱葱', text: '……好。那我写信回绝。' },
    ],
    onComplete: SIDE_CONGCONG_COMPLETION_ACTIONS,
  },
  DIA_SIDE_CC_01_VISIT: {
    id: 'DIA_SIDE_CC_01_VISIT',
    lines: [
      { speaker: '葱葱', text: '你让我回去？' },
      { speaker: 'T', text: '去看看。但记得回来。' },
      { speaker: '葱葱', text: '当然！本少爷哪里不回来！' },
      { speaker: '系统', text: '开启天剑阁短地图。' },
    ],
    onComplete: [{ type: 'battle', encounterId: 'BTL_SIDE_CC_01' }],
  },
  DIA_SIDE_CC_01_HUIHUI: {
    id: 'DIA_SIDE_CC_01_HUIHUI',
    lines: [
      { speaker: '慧慧', text: '葱葱，你到底想留下来还是回去？' },
      { speaker: '葱葱', text: '当然是留下来陪……陪你们。' },
      { speaker: '慧慧', text: '那就别婆婆妈妈的！写信回绝！' },
      { speaker: '葱葱', text: '大小姐你这样我会以为你在乎我。' },
      { speaker: '慧慧', text: '我在乎的是队伍战斗力！' },
    ],
    onComplete: SIDE_CONGCONG_COMPLETION_ACTIONS,
  },
  DIA_SIDE_CC_01_AFTER: {
    id: 'DIA_SIDE_CC_01_AFTER',
    lines: [
      { speaker: '系统', text: '葱葱技能【破绽看穿】解锁。' },
    ],
  },

  // sun 支线：旁观者
  DIA_SIDE_SUN_01: {
    id: 'DIA_SIDE_SUN_01',
    lines: [
      { speaker: 'sun', text: 'T，你觉得……神殿一直旁观，是不是也导致了xiaoai的堕落？' },
      { speaker: 'T', text: '你自己怎么想？' },
      { speaker: 'sun', text: '我在怀疑。但怀疑本身就是对神的不敬。' },
      {
        speaker: 'T',
        text: '……',
        choices: [
          { text: '你可以改变。', next: 'DIA_SIDE_SUN_01_CHANGE', actions: [{ type: 'setFlag', flag: 'trust_sun', value: 2 }] },
          { text: '神殿也有错。', next: 'DIA_SIDE_SUN_01_WRONG', actions: [{ type: 'setFlag', flag: 'mercy_score', value: 1 }] },
          { text: '我不关心神殿。', next: 'DIA_SIDE_SUN_01_END' },
        ],
      },
    ],
  },
  DIA_SIDE_SUN_01_CHANGE: {
    id: 'DIA_SIDE_SUN_01_CHANGE',
    lines: [
      { speaker: 'sun', text: '改变……也许这就是你被选中的原因。不是因为你强，而是因为你相信改变。' },
      { speaker: '旁白', text: '旁观之影从神殿阴影中浮现。' },
    ],
    onComplete: [{ type: 'battle', encounterId: 'BTL_SIDE_SUN_01' }],
  },
  DIA_SIDE_SUN_01_WRONG: {
    id: 'DIA_SIDE_SUN_01_WRONG',
    lines: [
      { speaker: 'sun', text: '……' },
      { speaker: '旁白', text: 'sun沉默了很久。但他的眼中，多了一点从没有过的光。' },
      { speaker: '旁白', text: '旁观之影从神殿阴影中浮现。' },
    ],
    onComplete: [{ type: 'battle', encounterId: 'BTL_SIDE_SUN_01' }],
  },
  DIA_SIDE_SUN_01_END: {
    id: 'DIA_SIDE_SUN_01_END',
    lines: [
      { speaker: 'sun', text: '……也是。' },
      { speaker: '旁白', text: 'sun转身离去。这次对话没有结论。' },
    ],
  },
  DIA_SIDE_SUN_01_AFTER: {
    id: 'DIA_SIDE_SUN_01_AFTER',
    lines: [
      { speaker: '系统', text: 'sun技能【人的祈愿】解锁。真结局阶段增益提升。' },
    ],
  },

  // ============================================================
  // 杂项对话：商店、训练场等
  // ============================================================

  DIA_SHOP_PINE: {
    id: 'DIA_SHOP_PINE',
    lines: [
      { speaker: '菠萝大叔', text: '哟，来买东西啊？都是自家种的好东西！' },
    ],
    onComplete: [{ type: 'shop' }],
  },
  DIA_TRAINING: {
    id: 'DIA_TRAINING',
    lines: [
      { speaker: '系统', text: '训练场的篝火旁，可以消耗金币进行特训。' },
    ],
    onComplete: [{ type: 'training' }],
  },

  // ============================================================
  // 补充对话：城镇NPC（荒芜期）
  // ============================================================

  DIA_NPC_TOWN_MAYOR_HOME: {
    id: 'DIA_NPC_TOWN_MAYOR_HOME',
    lines: [
      { speaker: '镇长', text: 'T，有空就多去镇上走走。居民们虽然嘴上不说，心里都盼着有人能拉他们一把。' },
      { speaker: '木桶精灵', text: '拉他们一把是指你，不是我。我只是书灵。' },
      { speaker: 'T', text: '你能不能至少装一下鼓励我？' },
      { speaker: '木桶精灵', text: '加油。这是装的。' },
    ],
  },

  DIA_NPC_TOWN_GRANDMA: {
    id: 'DIA_NPC_TOWN_GRANDMA',
    lines: [
      { speaker: '老婆婆', text: '小伙子，你长得像我年轻时的丈夫。他也是那种嘴硬心软的人。' },
      { speaker: 'T', text: '婆婆，您丈夫后来怎么样了？' },
      { speaker: '老婆婆', text: '他被木桶砸死了。所以你不要小看木桶。' },
      { speaker: '木桶精灵', text: '我对这则轶事感到非常不适。' },
    ],
  },

  DIA_NPC_TOWN_CHILD: {
    id: 'DIA_NPC_TOWN_CHILD',
    lines: [
      { speaker: '小孩', text: '大哥哥，你真的要去打大魔头吗？' },
      { speaker: 'T', text: '嗯。' },
      { speaker: '小孩', text: '那你能不能帮我把风筝从树上拿下来？' },
      { speaker: 'T', text: '打魔头可以，拿风筝我也行。' },
      { speaker: '小孩', text: '谢谢大哥哥！我长大了也要像你一样！' },
      { speaker: '系统', text: '获得【回复草】x1。' },
    ],
  },

  DIA_NPC_TOWN_GUARD: {
    id: 'DIA_NPC_TOWN_GUARD',
    lines: [
      { speaker: '守卫', text: 'T，镇子东边的路通往奇妙森林。上次有人在路口看到发光的东西。' },
      { speaker: 'T', text: '发光的东西？' },
      { speaker: '守卫', text: '也可能是萤火虫。我们镇穷得买不起路灯，看什么都像发光。' },
      { speaker: 'T', text: '……辛苦了。' },
    ],
  },

  DIA_NPC_TOWN_BOLUO_HOME: {
    id: 'DIA_NPC_TOWN_BOLUO_HOME',
    lines: [
      { speaker: '菠萝大叔', text: 'T！谢谢你帮忙整理菜园子。作为回报，这是我特制的菠萝饭团。' },
      { speaker: '系统', text: '获得【菠萝饭团】x3。' },
      { speaker: 'T', text: '谢谢菠萝大叔。' },
      { speaker: '菠萝大叔', text: '别客气。你父亲以前也爱吃我做的饭团。他总说……算了，不说了。' },
      { speaker: 'T', text: '他说什么？' },
      { speaker: '菠萝大叔', text: '他说"味道不错，但咸了点"。和你一模一样。' },
    ],
  },

  DIA_NPC_TOWN_HERB: {
    id: 'DIA_NPC_TOWN_HERB',
    lines: [
      { speaker: '药草商', text: '药草铺虽然关了，但我还有些存货。你是T对吧？拿着这个。' },
      { speaker: '系统', text: '获得【解毒草】x3。' },
      { speaker: '药草商', text: '森林里毒虫多，小心点。你母亲以前也总来我这里买药草。' },
      { speaker: 'T', text: '我母亲？' },
      { speaker: '药草商', text: '她比你父亲还会照顾人。你也一样吧，别看嘴上不饶人。' },
    ],
  },

  // ============================================================
  // 补充对话：城镇NPC（重建Lv.1 新芽期）
  // ============================================================

  DIA_NPC_REBUILD1_PINE: {
    id: 'DIA_NPC_REBUILD1_PINE',
    lines: [
      { speaker: '菠萝大叔', text: '千年树种放到菜园旁边之后，第二天就冒出了嫩芽！我活了这么多年，头回见长得这么快的！' },
      { speaker: 'T', text: '是吗？菜园怎么样？' },
      { speaker: '菠萝大叔', text: '好得很！菜园重新开张了，你来买点东西吧。' },
      { speaker: '系统', text: '菠萝大叔商店开放。' },
    ],
    onComplete: [{ type: 'shop' }],
  },

  DIA_NPC_REBUILD1_GRANDMA: {
    id: 'DIA_NPC_REBUILD1_GRANDMA',
    lines: [
      { speaker: '老婆婆', text: '草地变绿了，我窗前的花也开了。谢谢你，小伙子。' },
      { speaker: 'T', text: '不用谢我。是千年树种的力量。' },
      { speaker: '老婆婆', text: '种子要有人种下去才能发芽。你就是那个种种子的人。' },
      { speaker: '系统', text: '获得【护身符】x1。' },
    ],
  },

  DIA_NPC_REBUILD1_CHILD: {
    id: 'DIA_NPC_REBUILD1_CHILD',
    lines: [
      { speaker: '小孩', text: '大哥哥！你看你看，树苗长出来了！比我还高！' },
      { speaker: 'T', text: '嗯，很快整座镇子都会重新长满树的。' },
      { speaker: '小孩', text: '那我是不是能爬树了？' },
      { speaker: 'T', text: '等长大一点再说。' },
      { speaker: '小孩', text: '你和我妈说的一样！' },
    ],
  },

  DIA_NPC_REBUILD1_HERB: {
    id: BLUE_MINT_SIDE_QUEST.DIALOGUES.REQUEST,
    lines: [
      { speaker: '药草商', text: '树苗长出来之后，野生的药草也开始恢复了。我的店终于可以重新开张。' },
      { speaker: '系统', text: '药草商商店开放。' },
      { speaker: '药草商', text: '你去奇妙森林的时候，帮我留意一下有没有稀有的蓝色薄荷。' },
    ],
    onComplete: [
      { type: 'questStart', questId: BLUE_MINT_SIDE_QUEST.QUEST_ID },
      { type: 'setFlag', flag: BLUE_MINT_SIDE_QUEST.FLAGS.REQUESTED, value: true },
    ],
  },

  DIA_NPC_REBUILD1_HERB_WAIT: {
    id: BLUE_MINT_SIDE_QUEST.DIALOGUES.WAIT,
    lines: [
      { speaker: '药草商', text: '蓝色薄荷通常长在千年树种祭台附近。叶片泛蓝，靠近时有清凉的味道。' },
      { speaker: 'T', text: '找到之后我会带回来。' },
    ],
  },

  DIA_NPC_REBUILD1_HERB_TURNIN: {
    id: BLUE_MINT_SIDE_QUEST.DIALOGUES.TURN_IN,
    lines: [
      { speaker: '药草商', text: '这就是蓝色薄荷！有了它，镇上的解毒药就能稳定供应了。' },
      { speaker: '系统', text: '交付【蓝色薄荷】。获得【回复草】x5。' },
    ],
    onComplete: [
      { type: 'setFlag', flag: BLUE_MINT_SIDE_QUEST.FLAGS.DELIVERED, value: true },
      { type: 'questComplete', questId: BLUE_MINT_SIDE_QUEST.QUEST_ID },
    ],
  },

  DIA_NPC_REBUILD1_HERB_DONE: {
    id: BLUE_MINT_SIDE_QUEST.DIALOGUES.DONE,
    lines: [
      { speaker: '药草商', text: '蓝色薄荷已经入药了。需要补给的话，随时来我这里。' },
    ],
    onComplete: [{ type: 'shop' }],
  },

  // ============================================================
  // 补充对话：城镇NPC（重建Lv.2 清泉期）
  // ============================================================

  DIA_NPC_REBUILD2_PINE: {
    id: 'DIA_NPC_REBUILD2_PINE',
    lines: [
      { speaker: '菠萝大叔', text: '水井出甘泉了！你知道这意味着什么吗？' },
      { speaker: 'T', text: '可以好好洗手了？' },
      { speaker: '菠萝大叔', text: '意味着我的菠萝饭团可以放更多天不坏！' },
      { speaker: 'T', text: '所以核心是保质期。' },
      { speaker: '菠萝大叔', text: '是料理品质！' },
    ],
  },

  DIA_NPC_REBUILD2_MAYOR: {
    id: 'DIA_NPC_REBUILD2_MAYOR',
    lines: [
      { speaker: '镇长', text: '水井恢复之后，越来越多的居民愿意留下来了。你做得很好，T。' },
      { speaker: 'T', text: '还有桂冠没拿。等拿了桂冠，镇子会更好。' },
      { speaker: '镇长', text: '我知道。但你也该休息一下。别把自己逼得太紧。' },
      { speaker: 'T', text: '大伯什么时候开始说这种话了？' },
      { speaker: '镇长', text: '你父亲当年也是这样。我那时候没说，现在不想再犯同样的错。' },
    ],
  },

  DIA_NPC_REBUILD2_WEAPON: {
    id: 'DIA_NPC_REBUILD2_WEAPON',
    lines: [
      { speaker: '铁匠', text: '哎，水恢复之后锻造炉也能用了。虽然简陋，但至少能修修补补。' },
      { speaker: '系统', text: '装备店开放。可以进行装备强化。' },
      { speaker: '铁匠', text: '你父亲的剑……是件好东西。下次拿来，我帮你磨一磨。' },
    ],
  },

  DIA_NPC_REBUILD2_GUARD: {
    id: 'DIA_NPC_REBUILD2_GUARD',
    lines: [
      { speaker: '守卫', text: '水井出水之后，夜晚的巡逻也没那么难熬了。至少有口热水喝。' },
      { speaker: 'T', text: '辛苦了。' },
      { speaker: '守卫', text: '说辛苦的是你。我们守家，你守整个镇子的未来。' },
      { speaker: 'T', text: '你这样说我会不好意思。' },
      { speaker: '守卫', text: '那就多带点回复草回来。' },
    ],
  },

  // ============================================================
  // 补充对话：城镇NPC（重建Lv.3 归光期）
  // ============================================================

  DIA_NPC_REBUILD3_MAYOR: {
    id: 'DIA_NPC_REBUILD3_MAYOR',
    lines: [
      { speaker: '镇长', text: '会场重新亮起来了。灯光映在水面上，像二十年前盛典那天一样。' },
      { speaker: 'T', text: '二十年前发生过什么？' },
      { speaker: '镇长', text: '二十年前，你父母也是这样站在会场中央。那时候他们也是年轻人。' },
      { speaker: 'T', text: '……' },
      { speaker: '镇长', text: '不一样的是，他们没能把镇子重建完。你做到了。' },
    ],
  },

  DIA_NPC_REBUILD3_PINE: {
    id: 'DIA_NPC_REBUILD3_PINE',
    lines: [
      { speaker: '菠萝大叔', text: 'T！训练场也修好了！你要不要去练练？' },
      { speaker: 'T', text: '训练场？' },
      { speaker: '菠萝大叔', text: '对！可以在里面特训，提升战斗力。我出一半费用！' },
      { speaker: 'T', text: '你为什么这么大方？' },
      { speaker: '菠萝大叔', text: '因为你欠我一半的饭团钱。训练完还我。' },
    ],
  },

  DIA_NPC_REBUILD3_CHILD: {
    id: 'DIA_NPC_REBUILD3_CHILD',
    lines: [
      { speaker: '小孩', text: '大哥哥！会场的灯好漂亮！晚上亮起来的时候，整个镇子都像在发光！' },
      { speaker: 'T', text: '嗯。以后会更好。' },
      { speaker: '小孩', text: '大哥哥，你还会再离开吗？' },
      {
        speaker: 'T',
        text: '……',
        choices: [
          { text: '我会回来的。', actions: [{ type: 'setFlag', flag: 'mercy_score', value: 1 }] },
          { text: '不知道。但我尽量。' },
          { text: '你先把风筝看好。' },
        ],
      },
    ],
  },

  DIA_NPC_REBUILD3_GRANDMA: {
    id: 'DIA_NPC_REBUILD3_GRANDMA',
    lines: [
      { speaker: '老婆婆', text: '神坛亮了。你知道吗，这镇子的神坛，二十年来第一次亮起来。' },
      { speaker: 'T', text: '是桂冠的力量。' },
      { speaker: '老婆婆', text: '是人的力量。桂冠不会自己发光。' },
      { speaker: '系统', text: '获得【风铃丸】x2。' },
    ],
  },

  DIA_NPC_REBUILD3_BLACKSMITH: {
    id: 'DIA_NPC_REBUILD3_BLACKSMITH',
    lines: [
      { speaker: '铁匠', text: '有了神坛的能量，我能锻造更好的装备了。你带来过一些稀有材料吧？' },
      { speaker: 'T', text: '森林里捡了一些。' },
      { speaker: '铁匠', text: '放着我来。我给你打造一件像样的护甲。' },
      { speaker: '系统', text: '高级装备强化开放。' },
    ],
  },

  // ============================================================
  // 补充对话：奇妙森林NPC与探索
  // ============================================================

  DIA_FOREST_SPIRIT_1: {
    id: 'DIA_FOREST_SPIRIT_1',
    lines: [
      { speaker: '森林精灵', text: '人类，你们来奇妙森林做什么？' },
      { speaker: 'T', text: '找千年树种。' },
      { speaker: '森林精灵', text: '树种是森林的心脏。你凭什么取走它？' },
      { speaker: '慧慧', text: '为了重建木桶镇。那里曾经也是森林的邻居。' },
      { speaker: '森林精灵', text: '邻居……好久没听到有人这样说了。' },
      { speaker: '森林精灵', text: '前面的路被藤蔓封住了。打败守卫，我帮你们开路。' },
    ],
  },

  DIA_FOREST_SPIRIT_2: {
    id: 'DIA_FOREST_SPIRIT_2',
    lines: [
      { speaker: '森林精灵', text: '白虎大人受伤之后，森林就变得越来越混乱。藤蔓不听话，毒虫到处跑。' },
      { speaker: '阿博', text: '白虎是守护这片森林的？' },
      { speaker: '森林精灵', text: '是的。它是五神之一。现在只剩下伤和恨了。' },
      { speaker: '慧慧', text: '我们会帮助白虎的。' },
      { speaker: '森林精灵', text: '……谢谢你们。' },
    ],
  },

  DIA_FOREST_HERB_GATHER: {
    id: BLUE_MINT_SIDE_QUEST.DIALOGUES.GATHER,
    lines: [
      { speaker: '慧慧', text: 'T，你看这个草药。和药草商描述的蓝色薄荷一模一样！' },
      { speaker: 'T', text: '真的？' },
      { speaker: '慧慧', text: '嗯。带回去给他，说不定有奖励。' },
      { speaker: '系统', text: '获得【蓝色薄荷】x1。' },
    ],
    onComplete: [
      { type: 'addItem', itemId: BLUE_MINT_SIDE_QUEST.ITEM_ID, quantity: 1 },
      { type: 'setFlag', flag: BLUE_MINT_SIDE_QUEST.FLAGS.GATHERED, value: true },
      { type: 'questAdvance', questId: BLUE_MINT_SIDE_QUEST.QUEST_ID },
    ],
  },

  DIA_FOREST_SPRING: {
    id: 'DIA_FOREST_SPRING',
    lines: [
      { speaker: '阿博', text: '这里有泉眼。水很清澈。' },
      { speaker: '慧慧', text: '可以休息一下吗？大家都累了。' },
      { speaker: 'T', text: '好吧，休息十分钟。' },
      { speaker: '木桶精灵', text: '旅行中的休息不会影响战斗。但对话会影响信赖。' },
      { speaker: '系统', text: '全队HP回复20%，MP回复10%。' },
    ],
  },

  DIA_FOREST_SIGNPOST: {
    id: 'DIA_FOREST_SIGNPOST',
    lines: [
      { speaker: '系统', text: '路牌上写着："前方围湖，白虎栖息地，请勿靠近。"' },
      { speaker: 'T', text: '白虎栖息地……' },
      { speaker: '慧慧', text: '我们不是要靠近，是要路过。' },
      { speaker: '阿博', text: '路过和白虎说了也没用。' },
    ],
  },

  // ============================================================
  // 补充对话：圣水殿探索
  // ============================================================

  DIA_TEMPLE_OUTER_PUZZLE: {
    id: 'DIA_TEMPLE_OUTER_PUZZLE',
    lines: [
      { speaker: '慧慧', text: '这些小水滴好像在排什么队形。' },
      { speaker: '阿博', text: '看起来像音符。' },
      { speaker: 'T', text: '按顺序碰它们试试？' },
      { speaker: '系统', text: '按照水滴大小从大到小触碰，机关开启。' },
    ],
  },

  DIA_TEMPLE_CRYSTAL: {
    id: 'DIA_TEMPLE_CRYSTAL',
    lines: [
      { speaker: '慧慧', text: '这些水晶真漂亮。每一颗里面都有不同颜色的光。' },
      { speaker: '阿博', text: '别碰。水晶有时候是活的。' },
      { speaker: '慧慧', text: '活的？' },
      { speaker: '旁白', text: '水晶突然睁开了一只眼睛。' },
      { speaker: '慧慧', text: '我说的不是这个——！' },
      { speaker: '系统', text: '战斗开始！' },
    ],
    onComplete: [{ type: 'battle', encounterId: 'BTL_202A' }],
  },

  DIA_TEMPLE_WIND_GUARD: {
    id: 'DIA_TEMPLE_WIND_GUARD',
    lines: [
      { speaker: '风之防御人', text: '没有殿主许可，不得入内。' },
      { speaker: 'T', text: '我们打败了水瑶和风赤。他们让我们进来的。' },
      { speaker: '风之防御人', text: '我只听殿主的。' },
      { speaker: '阿博', text: '看来还得打。' },
      { speaker: '系统', text: '战斗开始！' },
    ],
    onComplete: [{ type: 'battle', encounterId: 'BTL_202C' }],
  },

  // ============================================================
  // 补充对话：神殿山路探索
  // ============================================================

  DIA_MOUNTAIN_STONE_STATUE: {
    id: 'DIA_MOUNTAIN_STONE_STATUE',
    lines: [
      { speaker: '葱葱', text: '这些石像好大。是不是神殿的守卫？' },
      { speaker: '慧慧', text: '我怎么觉得它们在看我。' },
      { speaker: '阿博', text: '因为它们确实在看你。' },
      { speaker: '旁白', text: '石像缓缓转身，手中的巨剑开始发光。' },
      { speaker: '慧慧', text: '我就知道！' },
      { speaker: '系统', text: '战斗开始！' },
    ],
    onComplete: [{ type: 'battle', encounterId: 'BTL_310' }],
  },

  DIA_MOUNTAIN_CAMP: {
    id: 'DIA_MOUNTAIN_CAMP',
    lines: [
      { speaker: '葱葱', text: '山路太陡了。本少爷要求休息。' },
      { speaker: '慧慧', text: '你刚才不是还说自己很能走吗？' },
      { speaker: '葱葱', text: '能走不代表想走。' },
      { speaker: '阿博', text: '休息五分钟。' },
      { speaker: 'T', text: '刚才谁说很能走的？' },
      { speaker: '葱葱', text: '那是在平地。上山是另一回事。' },
      { speaker: '慧慧', text: '借口。' },
    ],
  },

  DIA_MOUNTAIN_VIEW: {
    id: 'DIA_MOUNTAIN_VIEW',
    lines: [
      { speaker: '旁白', text: '从山腰望去，木桶镇的方向依稀可见。' },
      { speaker: 'T', text: '从这里看，镇子好小。' },
      { speaker: '慧慧', text: '可是那里住着所有人。' },
      { speaker: '阿博', text: '所以即使小，也值得守护。' },
      { speaker: '葱葱', text: '你们这个时候能不能别煽情？腿好酸。' },
    ],
  },

  // ============================================================
  // 补充对话：七色路探索
  // ============================================================

  DIA_SEVENROAD_COLOR_BLUE: {
    id: 'DIA_SEVENROAD_COLOR_BLUE',
    lines: [
      { speaker: '葱葱', text: '蓝色路代表悲伤。如果心被悲伤填满，就会一直走不出来。' },
      { speaker: '慧慧', text: '你怎么什么都懂？' },
      { speaker: '葱葱', text: '师父教的。七色路对应七种心念：悲、怒、惧、欲、执、疑、空。' },
      { speaker: 'T', text: '听起来像心理考试。' },
      { speaker: '葱葱', text: '差不多。不及格的代价是永远留在里面。' },
    ],
  },

  DIA_SEVENROAD_SHADOW: {
    id: 'DIA_SEVENROAD_SHADOW',
    lines: [
      { speaker: '旁白', text: '暗影从路面浮起，幻化成每个伙伴最害怕的样子。' },
      { speaker: '慧慧', text: '它变成了……我弟弟？' },
      { speaker: '阿博', text: '是假的。' },
      { speaker: '葱葱', text: '虽然知道是假的，还是很难不动心。' },
      { speaker: 'T', text: '那就闭上眼打。' },
    ],
  },

  // ============================================================
  // 补充对话：神殿探索
  // ============================================================

  DIA_TEMPLE_EXPLORE_1: {
    id: 'DIA_TEMPLE_EXPLORE_1',
    lines: [
      { speaker: '慧慧', text: '神殿好大。壁画上画的是五神的故事。' },
      { speaker: '旁白', text: '壁画上：青龙布雨，白虎守山，朱雀栖火，玄武镇海，中央是第五神——祀。' },
      { speaker: '葱葱', text: '第五神很少被提到。师父说它是连接所有生命的存在。' },
      { speaker: 'T', text: '和xiaoai有什么关系？' },
      { speaker: '葱葱', text: '不知道。但sun一定知道。' },
    ],
  },

  DIA_TEMPLE_EXPLORE_2: {
    id: 'DIA_TEMPLE_EXPLORE_2',
    lines: [
      { speaker: '阿博', text: '这只石像守卫和山路上的一样。但这里的不动。' },
      { speaker: '慧慧', text: '也许因为这里是神的地盘，不需要守卫。' },
      { speaker: '葱葱', text: '或者它只是懒得动。' },
      { speaker: '阿博', text: '我不觉得神殿的东西会偷懒。' },
    ],
  },

  DIA_TEMPLE_FIRELION: {
    id: 'DIA_TEMPLE_FIRELION',
    lines: [
      { speaker: '旁白', text: '火麟幼兽从石柱后窜出，朝着慧慧喷出火焰。' },
      { speaker: '慧慧', text: '好烫！' },
      { speaker: '阿博', text: '我来挡！' },
      { speaker: '葱葱', text: '这种小东西，让我来。' },
      { speaker: '系统', text: '战斗开始！' },
    ],
    onComplete: [{ type: 'battle', encounterId: 'BTL_311A' }],
  },

  DIA_TEMPLE_FEATHER: {
    id: 'DIA_TEMPLE_FEATHER',
    lines: [
      { speaker: '旁白', text: '一根散发着微光的羽毛落在T手中。' },
      { speaker: '慧慧', text: '这是什么？' },
      { speaker: '木桶精灵', text: '凤凰的落羽。稀有材料。可以用来强化装备。' },
      { speaker: '系统', text: '获得【凤凰落羽】x1。' },
    ],
  },

  // ============================================================
  // 补充对话：重建后的城镇NPC（重建Lv.4 守护期）
  // ============================================================

  DIA_NPC_REBUILD4_MAYOR: {
    id: 'DIA_NPC_REBUILD4_MAYOR',
    lines: [
      { speaker: '镇长', text: '防御塔和祭坛都恢复了。这下就算黑暗再来，我们也不会像上次那样毫无还手之力。' },
      { speaker: 'T', text: '但我们还是要主动出击。' },
      { speaker: '镇长', text: '我知道。只是……回来的时候，这里还是你的家。' },
      { speaker: 'T', text: '大伯。' },
      { speaker: '镇长', text: '嗯？' },
      { speaker: 'T', text: '谢谢你一直守着这里。' },
      { speaker: '镇长', text: '这是我的镇子。不用谢。' },
    ],
  },

  DIA_NPC_REBUILD4_GUARD: {
    id: 'DIA_NPC_REBUILD4_GUARD',
    lines: [
      { speaker: '守卫', text: '防御塔修好之后，夜里的巡逻轻松多了。塔上的灯自动照着四周，什么也藏不住。' },
      { speaker: 'T', text: '那就好。' },
      { speaker: '守卫', text: 'T，你是不是要去更远的地方了？' },
      { speaker: 'T', text: '嗯。魔宫。' },
      { speaker: '守卫', text: '那……平安回来。' },
    ],
  },

  DIA_NPC_REBUILD4_WEAPON: {
    id: 'DIA_NPC_REBUILD4_WEAPON',
    lines: [
      { speaker: '铁匠', text: '祭坛的能量注入了锻造炉。我现在能打造出从前想都不敢想的装备。' },
      { speaker: '系统', text: '高级装备强化开放。可以打造四封印装备。' },
      { speaker: '铁匠', text: '你要是能从四封印之地带回来特殊材料，我能给你做更好的。' },
    ],
  },

  // ============================================================
  // 补充对话：故事过渡
  // ============================================================

  // 重建完成后的夜晚思考
  DIA_TRANSITION_NIGHT_THINK: {
    id: 'DIA_TRANSITION_NIGHT_THINK',
    lines: [
      { speaker: '旁白', text: '夜深了。木桶镇的灯火一盏接一盏亮起来，像星空倒映在大地上。T坐在会场旁的石阶上。' },
      { speaker: '木桶精灵', text: '睡不着？' },
      { speaker: 'T', text: '你不睡觉的吧？' },
      { speaker: '木桶精灵', text: '书不需要睡觉。但书灵偶尔会做梦。' },
      { speaker: 'T', text: '你梦到什么？' },
      { speaker: '木桶精灵', text: '梦到有人把预言写成饭团食谱。很可怕。' },
      { speaker: 'T', text: '……晚安。' },
      { speaker: '木桶精灵', text: '晚安，守护者。明天还有很长的路。' },
    ],
  },

  // 取得千年树种后返回城镇的过渡
  DIA_TRANSITION_SEED_RETURN: {
    id: 'DIA_TRANSITION_SEED_RETURN',
    lines: [
      { speaker: '旁白', text: '走出森林，木桶镇的废墟轮廓出现在视野尽头。' },
      { speaker: '慧慧', text: '回来了。' },
      { speaker: '阿博', text: '感觉像过了很久。' },
      { speaker: 'T', text: '才三天。' },
      { speaker: '慧慧', text: '三天里我们打了藤妖、毒虫、白虎、还有伪装成木桶的怪物。三天够长的了。' },
      { speaker: '阿博', text: '镇长大伯一定在等。走吧。' },
    ],
  },

  // 取得神水后前往神殿的过渡
  DIA_TRANSITION_TEMPLE_GO: {
    id: 'DIA_TRANSITION_TEMPLE_GO',
    lines: [
      { speaker: '木桶精灵', text: '两件神物到手。最后一件在神殿。但神殿在山上，有凤凰和麒麟守护。' },
      { speaker: 'T', text: '凤凰和麒麟？' },
      { speaker: '木桶精灵', text: '对。不是开会能解决的那种。' },
      { speaker: '慧慧', text: '我们从圣水殿出发往山上走？' },
      { speaker: '葱葱', text: '那条路我熟。我就是在那里迷路的。' },
      { speaker: '阿博', text: '迷路的人说"我熟"？' },
      { speaker: '葱葱', text: '正因为迷过路，才更熟！' },
    ],
  },

  // 生命之泉篇开启的过渡
  DIA_TRANSITION_SPRING_GO: {
    id: 'DIA_TRANSITION_SPRING_GO',
    lines: [
      { speaker: '旁白', text: '木桶镇重建完成后的第七个夜晚。T又一次梦到了xiaoai。' },
      { speaker: 'xiaoai', text: '你在等我吗？还是我在等你？' },
      { speaker: 'T', text: '你到底是谁？' },
      { speaker: 'xiaoai', text: '快了。你很快就会知道。' },
      { speaker: '旁白', text: 'T从梦中醒来，无名戒指在指尖微微发热。' },
      { speaker: 'T', text: '生命之泉。' },
    ],
  },

  // 魔宫篇开启的过渡
  DIA_TRANSITION_PALACE_GO: {
    id: 'DIA_TRANSITION_PALACE_GO',
    lines: [
      { speaker: '旁白', text: '从生命之泉回来的路上，空气变得沉重。远处，魔宫的轮廓比从前更清晰了。' },
      { speaker: '慧慧', text: '魔宫好像比上次更大了。' },
      { speaker: '葱葱', text: '不是更大。是离我们更近了。' },
      { speaker: 'sun', text: 'xiaoai在加速。她知道你们变强了，所以也在加速。' },
      { speaker: 'T', text: '那就比谁更快。' },
    ],
  },

  // ============================================================
  // 补充对话：码头与航路
  // ============================================================

  DIA_DOCK_FISHERMAN: {
    id: 'DIA_DOCK_FISHERMAN',
    lines: [
      { speaker: '渔民', text: '你们要去神域？这条海路我已经走了三十年了。最近海面上总起雾。' },
      { speaker: 'T', text: '雾？' },
      { speaker: '渔民', text: '黑色的雾。像有什么东西在海底下呼吸。我劝你们小心。' },
      { speaker: '慧慧', text: '谢谢提醒。' },
      { speaker: '渔民', text: '还有，回来的时候记得找我。我有东西给你们。' },
    ],
  },

  DIA_DOCK_ARRIVE: {
    id: 'DIA_DOCK_ARRIVE',
    lines: [
      { speaker: '旁白', text: '船靠岸了。眼前是神域的山脚，云雾缭绕中隐约可见两座建筑。' },
      { speaker: '慧慧', text: '左边那个是圣水殿吧？水晶一样的屋顶。' },
      { speaker: '阿博', text: '直走通向山顶。应该就是神殿。' },
      { speaker: 'T', text: '先去圣水殿。' },
      { speaker: '木桶精灵', text: '明智。毕竟你们现在去神殿只会被石像守卫当球踢。' },
      { speaker: 'T', text: '你能不能鼓励一次？' },
      { speaker: '木桶精灵', text: '你还没被当球踢。这就是鼓励。' },
    ],
  },

  DIA_DOCK_RETURN: {
    id: 'DIA_DOCK_RETURN',
    lines: [
      { speaker: '渔民', text: '回来了？海边最近又不太平了。黑雾从海底冒上来，鱼都不见了。' },
      { speaker: 'T', text: '和魔宫有关吗？' },
      { speaker: '渔民', text: '不知道。但这是给你的，上次答应你的东西。' },
      { speaker: '系统', text: '获得【复生羽】x2。' },
      { speaker: '渔民', text: '出海的时候帮我注意一下，如果有见到的稀有的贝壳，带回来给我。' },
    ],
  },

  // ============================================================
  // 补充对话：Boss战前后补充
  // ============================================================

  // 白虎战前：T的戒指反应
  DIA_103_TIGER_PRE: {
    id: 'DIA_103_TIGER_PRE',
    lines: [
      { speaker: '旁白', text: '湖面泛起涟漪。戒指开始发热。' },
      { speaker: '慧慧', text: 'T，你的戒指在发光！' },
      { speaker: 'T', text: '有什么东西在水边。' },
      { speaker: '阿博', text: '准备战斗。' },
      { speaker: '旁白', text: '白虎从水雾中现身。它的眼中是警觉和痛楚。' },
    ],
  },

  // 凤凰战前补充
  DIA_303_PHOENIX_PRE: {
    id: 'DIA_303_PHOENIX_PRE',
    lines: [
      { speaker: '旁白', text: '七色路的尽头是一片开阔的天空。一只巨大的凤凰盘旋在空中，翼展遮住了半边天。' },
      { speaker: '葱葱', text: '凤凰。师父说它的风压可以压倒一座城。' },
      { speaker: '慧慧', text: '那我们怎么打？' },
      { speaker: '葱葱', text: '它飞在空中的时候，暗器和雷系技能最有效。' },
      { speaker: '阿博', text: '我有办法让它下来。但需要配合。' },
    ],
  },

  // 麒麟合体战后
  DIA_303_PHOENIX_KILIN_AFTER: {
    id: 'DIA_303_PHOENIX_KILIN_AFTER',
    lines: [
      { speaker: '凤凰', text: '够了。你们的力量……确实不完全是执念。' },
      { speaker: '麒麟', text: '凤凰，我感受到了。这个少年手上的戒指——' },
      { speaker: '凤凰', text: '是守护者的证明。' },
      { speaker: '麒麟', text: '那我们不能再打了。祀者已经到了。' },
      { speaker: '旁白', text: '凤凰与麒麟收起攻势，退到两侧。' },
    ],
  },

  // 魑战前补充：毒雾入林
  DIA_411_CHI_PRE: {
    id: 'DIA_411_CHI_PRE',
    lines: [
      { speaker: '旁白', text: '青龙潭原本清澈的水面变得浑浊发绿。空气中弥漫着令人窒息的气味。' },
      { speaker: '慧慧', text: '好臭。' },
      { speaker: '葱葱', text: '捂住嘴。别用嘴呼吸。' },
      { speaker: 'sun', text: '这是魑的毒气。它把整座潭水都变成了毒池。' },
      { speaker: 'T', text: '那我们先把毒清了。' },
      { speaker: 'sun', text: '七彩木桶的青色之力可以暂时驱散毒雾。善用它。' },
    ],
  },

  // 魅战前补充：白虎幻影
  DIA_412_MEI_PRE: {
    id: 'DIA_412_MEI_PRE',
    lines: [
      { speaker: '旁白', text: '白虎穴的岩壁上刻满了古老的文字。洞穴深处传来低沉的虎啸，但那声音像是从记忆里挖出来的。' },
      { speaker: '慧慧', text: '这里好冷。不是温度的冷，是心里的。' },
      { speaker: '阿博', text: '是魅。它会利用你最在乎的东西来攻击你。' },
      { speaker: 'T', text: '最在乎的……' },
      { speaker: '旁白', text: '白虎的幻影从石壁中浮现。' },
      { speaker: '慧慧', text: 'T，那不是真的白虎。' },
      { speaker: 'T', text: '我知道。' },
    ],
  },

  // 魍战前补充：空中追踪
  DIA_413_WANG_PRE: {
    id: 'DIA_413_WANG_PRE',
    lines: [
      { speaker: '旁白', text: '朱雀林的天空被红色的枝叶遮蔽。上方传来箭矢破空的声音。' },
      { speaker: '葱葱', text: '上面有东西！' },
      { speaker: '慧慧', text: '在哪？我看不到！' },
      { speaker: '旁白', text: '一支毒箭擦着慧慧的头发飞过，钉在树干上。' },
      { speaker: '慧慧', text: '我的头发！' },
      { speaker: '葱葱', text: '比起头发，你更应该担心箭上的毒。' },
      { speaker: '慧慧', text: '那就别废话了，把它打下来！' },
    ],
  },

  // 魉战前补充：巨兽咆哮
  DIA_414_LIANG_PRE: {
    id: 'DIA_414_LIANG_PRE',
    lines: [
      { speaker: '旁白', text: '玄武殿的地面上布满烧焦的痕迹。空气中残留着硫磺的味道。' },
      { speaker: '阿博', text: '这里很热。比朱雀林还热。' },
      { speaker: 'sun', text: '魉是四魑中体型最大的。它的火焰可以融化岩石。' },
      { speaker: '葱葱', text: '那怎么打？' },
      { speaker: '阿博', text: '用盾挡。' },
      { speaker: '葱葱', text: '你是认真的？' },
      { speaker: '阿博', text: '我有念壁。' },
      { speaker: '旁白', text: '地动山摇。前方出现巨大的影子。' },
    ],
  },

  // xiaoai影战后、回镇前过渡
  DIA_430_RETURN_TOWN: {
    id: 'DIA_430_RETURN_TOWN',
    lines: [
      { speaker: '旁白', text: '从生命之泉返回木桶镇的路途中，没有人说话。' },
      { speaker: '慧慧', text: '……她说在魔宫等我们。' },
      { speaker: '葱葱', text: '那就去吧。' },
      { speaker: 'T', text: '先回镇。确认大家安全。' },
      { speaker: 'sun', text: '明智的选择。' },
      { speaker: '葱葱', text: 'sun你能不能别每次都说"明智的选择"？' },
      { speaker: 'sun', text: '可以。下次说"正确"。' },
      { speaker: '葱葱', text: '没差！' },
    ],
  },

  // 假xiaoai战后、发现A之前
  DIA_520_PALACE_AFTER: {
    id: 'DIA_520_PALACE_AFTER',
    lines: [
      { speaker: '旁白', text: '假xiaoai化为烟雾消散。长桌、茶杯、大厅的一切像画一样褪色。' },
      { speaker: '慧慧', text: '果然是假的。' },
      { speaker: '葱葱', text: '不过T你怎么看出来的？' },
      { speaker: 'T', text: '表情不对。真正的xiaoai看我的时候……有一种说不出来的东西。' },
      { speaker: '慧慧', text: '说不出来的东西？' },
      { speaker: 'T', text: '不是杀意。' },
      { speaker: '旁白', text: '远处传来微弱的呜呜声。' },
    ],
  },

  // ============================================================
  // 补充对话：xiaoai支线：残光回忆
  // ============================================================

  DIA_SIDE_XAI_01: {
    id: 'DIA_SIDE_XAI_01',
    lines: [
      { speaker: '旁白', text: 'xiaoai的残光在生命之泉上方徘徊。T走近时，残光散发出微弱的暖意。' },
      { speaker: '旁白', text: '残光中浮现一段记忆：年轻的xiaoai站在人间界的废墟上，手握权杖。' },
      { speaker: 'xiaoai', text: '第三次了。他们不听。每一次警告，他们只会更恨我。' },
      { speaker: '旁白', text: '没有人回答。只有风声。' },
      { speaker: 'xiaoai', text: '也许……恨就恨吧。至少证明他们还在看我。' },
      { speaker: '旁白', text: '画面消散。残光回到了寂静中。' },
      { speaker: '系统', text: 'xiaoai记忆碎片+1。' },
    ],
    onComplete: [{ type: 'setFlag', flag: 'xiaoai_memory_fragments', value: 1 }],
  },

  DIA_SIDE_XAI_02: {
    id: 'DIA_SIDE_XAI_02',
    lines: [
      { speaker: '旁白', text: '残光再次浮动。新的记忆浮现。' },
      { speaker: '旁白', text: 'xiaoai跪在神殿的大厅中央。神的声音从四面八方传来。' },
      { speaker: 'UNKNOWN', text: '你的恨意太深。它已经不再是警世的工具，而是你的主人。' },
      { speaker: 'xiaoai', text: '我……我只是想让他们看见。' },
      { speaker: 'UNKNOWN', text: '他们看见了。看见了一个被恨吞噬的使者。' },
      { speaker: '旁白', text: 'xiaoai低下头。黑暗从她的影子中涌出，缓缓包裹了她的全身。' },
      { speaker: 'xiaoai', text: '……我不后悔。后悔是给看得见希望的人的。' },
      { speaker: '旁白', text: '画面消散。' },
      { speaker: '系统', text: 'xiaoai记忆碎片+1。' },
    ],
    onComplete: [{ type: 'setFlag', flag: 'xiaoai_memory_fragments', value: 1 }],
  },

  DIA_SIDE_XAI_03: {
    id: 'DIA_SIDE_XAI_03',
    lines: [
      { speaker: '旁白', text: '残光最后一次涌动。画面变得更加清晰。' },
      { speaker: '旁白', text: 'xiaoai独自坐在魔宫的王座上。她的身边没有一个人。' },
      { speaker: 'xiaoai', text: '我赢了吗？人间被我吓住了。黑暗被我放大了。可是……' },
      { speaker: '旁白', text: '她握紧手中的权杖。权杖上有一道细小的裂缝，从裂缝中透出微弱的白光。' },
      { speaker: 'xiaoai', text: '这道光是什么时候的？我不记得了。' },
      { speaker: '旁白', text: '她没有去碰那道光。但也没有熄灭它。' },
      { speaker: '旁白', text: '记忆至此终结。' },
      { speaker: '系统', text: 'xiaoai记忆碎片收集完成。连携技【风月止息】解锁。' },
    ],
    onComplete: [{ type: 'setFlag', flag: 'xiaoai_memory_fragments', value: 1 }],
  },

  // ============================================================
  // 补充对话：真结局-无相战后过渡
  // ============================================================

  DIA_720_WUXIANG_FADE: {
    id: 'DIA_720_WUXIANG_FADE',
    lines: [
      { speaker: '旁白', text: '无相的形体逐渐瓦解。不是粉碎，而是像水渗入大地一样，无声无息地消失。' },
      { speaker: '无相', text: '你们赢了。但也只是这一次。' },
      { speaker: 'T', text: '一次就够了。' },
      { speaker: '旁白', text: '人心之渊的墨色褪去。一条由光芒铺成的路出现在脚下。' },
      { speaker: 'sun', text: '路通往人间。走吧。' },
      { speaker: '慧慧', text: '等等。xiaoai的残光——' },
      { speaker: 'xiaoai', text: '我在。' },
      { speaker: '旁白', text: '残光缓缓飘向光芒之路的尽头。' },
    ],
  },

  // 真结局前夜的对话
  DIA_730_PRE_NIGHT: {
    id: 'DIA_730_PRE_NIGHT',
    lines: [
      { speaker: '旁白', text: '回到木桶镇的前一晚。众人在生命之泉旁休息。' },
      { speaker: '慧慧', text: '我们做到了。' },
      { speaker: '阿博', text: '还没有完全结束。' },
      { speaker: '葱葱', text: '你就不能享受一下当下吗？' },
      { speaker: '阿博', text: '我在享受。我只是享受的方式比较安静。' },
      { speaker: 'sun', text: '……' },
      { speaker: 'T', text: 'sun，你在想什么？' },
      { speaker: 'sun', text: '我在想，神殿明天要记录什么。' },
      { speaker: 'T', text: '就记录"木桶镇的人今天很累了，明天再说"。' },
      { speaker: 'sun', text: '……也许这是最好的预言。' },
    ],
  },

  // ============================================================
  // 补充对话：普通结局后补完
  // ============================================================

  DIA_601_NORMAL_AFTER: {
    id: 'DIA_601_NORMAL_AFTER',
    lines: [
      { speaker: '旁白', text: '几天后。木桶镇恢复了日常的节奏。但T总是在夜里看着无名戒指发呆。' },
      { speaker: '慧慧', text: 'T，你又在想xiaoai的事？' },
      { speaker: 'T', text: '她说"小心"。我不确定她说的是什么。' },
      { speaker: '慧慧', text: '也许她指的是……你自己。' },
      { speaker: 'T', text: '什么意思？' },
      { speaker: '慧慧', text: '小心别变成她那样。在恨里待太久，会忘记怎么出来。' },
      { speaker: 'T', text: '慧慧……' },
      { speaker: '慧慧', text: '你不会的。因为你不是一个人。' },
      { speaker: '系统', text: '普通结局后可以继续探索。完成条件后可进入真结局。' },
    ],
  },

  // ============================================================
  // 补充对话：商店与设施NPC
  // ============================================================

  DIA_SHOP_WEAPON: {
    id: 'DIA_SHOP_WEAPON',
    lines: [
      { speaker: '铁匠', text: '要买装备还是强化？我这里虽然简陋，但手艺不差。' },
    ],
    onComplete: [{ type: 'shop' }],
  },

  DIA_SHOP_HERB: {
    id: 'DIA_SHOP_HERB',
    lines: [
      { speaker: '药草商', text: '需要药草吗？我这里有解毒草、清心铃，还有回复草。' },
    ],
    onComplete: [{ type: 'shop' }],
  },

  DIA_SHOP_TRAVEL: {
    id: 'DIA_SHOP_TRAVEL',
    lines: [
      { speaker: '行商人', text: '哟，你是那个勇士吧？我从远方来的，有些这里买不到的稀罕货。' },
      { speaker: '系统', text: '行商人商店开放。出售稀有消耗品和饰品。' },
    ],
    onComplete: [{ type: 'shop' }],
  },

  DIA_INN_REST: {
    id: 'DIA_INN_REST',
    lines: [
      { speaker: '旅店老板', text: '累了就歇一歇。今晚住宿免费，你是镇子的英雄嘛。' },
      { speaker: '系统', text: '全队HP与MP完全恢复。' },
    ],
  },

  DIA_REBUILD_BOARD: {
    id: 'DIA_REBUILD_BOARD',
    lines: [
      { speaker: '旁白', text: '支线板上贴着几张新的委托单。' },
      { speaker: '木桶精灵', text: '有居民在寻求帮助。你可以按自己的节奏来完成。' },
      { speaker: '系统', text: '支线任务板开放。可以接取支线任务。' },
    ],
  },

  // ============================================================
  // 补充对话：城镇NPC闲聊（重建Lv.5 心安期-真结局后）
  // ============================================================

  DIA_NPC_REBUILD5_PINE: {
    id: 'DIA_NPC_REBUILD5_PINE',
    lines: [
      { speaker: '菠萝大叔', text: 'T！预言上写的"饭团管够"，你到底认不认？' },
      { speaker: 'T', text: '那是木桶精灵写的。' },
      { speaker: '菠萝大叔', text: '管谁写的，白纸黑字。' },
      { speaker: '木桶精灵', text: '预言的法律效力存疑。' },
      { speaker: '菠萝大叔', text: '你写的你负责！' },
      { speaker: '木桶精灵', text: '我只是预言的载体，不是预言的甲方。' },
    ],
  },

  DIA_NPC_REBUILD5_MAYOR: {
    id: 'DIA_NPC_REBUILD5_MAYOR',
    lines: [
      { speaker: '镇长', text: '居民全都回来了。灯亮了，水清了，人心也安了。' },
      { speaker: 'T', text: '是啊。' },
      { speaker: '镇长', text: '但T，你要记住——心安不是终点。心安是让每个人都愿意继续往前走的起点。' },
      { speaker: 'T', text: '大伯，你今天说话特别像预言。' },
      { speaker: '镇长', text: '老了就爱说教。你也会的。' },
    ],
  },

  DIA_NPC_REBUILD5_CONGCONG_HH: {
    id: 'DIA_NPC_REBUILD5_CONGCONG_HH',
    lines: [
      { speaker: '葱葱', text: '大小姐，重建庆典上你打算穿什么？' },
      { speaker: '慧慧', text: '关你什么事？' },
      { speaker: '葱葱', text: '因为我穿什么得和你搭配。' },
      { speaker: '慧慧', text: '谁要和你搭配！' },
      { speaker: '葱葱', text: '那我来搭配你。一样的。' },
      { speaker: '慧慧', text: '你再胡说我就用袖镖。' },
      { speaker: '葱葱', text: '你舍得吗？' },
      { speaker: '慧慧', text: '试试。' },
      { speaker: '旁白', text: '葱葱挨了三枚袖镖。他笑得很开心。' },
    ],
  },

  DIA_NPC_REBUILD5_A: {
    id: 'DIA_NPC_REBUILD5_A',
    lines: [
      { speaker: '阿博', text: 'T，训练场的防御设施修好了。以后就算有敌人来，镇子也不会轻易被攻破了。' },
      { speaker: 'T', text: '辛苦了，A。' },
      { speaker: '阿博', text: '不辛苦。保护大家是我的职责。' },
      { speaker: 'T', text: '你不觉得累吗？' },
      { speaker: '阿博', text: '累。但有人回来的时候说一句"我到家了"，就不觉得了。' },
    ],
  },

  DIA_NPC_REBUILD5_SUN: {
    id: 'DIA_NPC_REBUILD5_SUN',
    lines: [
      { speaker: 'sun', text: 'T，神殿决定以后不再只是旁观。' },
      { speaker: 'T', text: '真的？' },
      { speaker: 'sun', text: '真的。我会作为神殿的使者常驻木桶镇。' },
      { speaker: 'T', text: '你留下来？' },
      { speaker: 'sun', text: '嗯。你们教会我一件事——有些事，要在旁边才能看见。但有些事，得走进去才能改变。' },
      { speaker: 'T', text: '欢迎加入木桶镇，sun。' },
      { speaker: 'sun', text: '……谢谢。' },
    ],
  },

  DIA_LOCKED_FOREST: {
    id: 'DIA_LOCKED_FOREST',
    lines: [{ speaker: '木桶精灵', text: '盛典后的预言之力还没有觉醒。先回镇上完成当前主线。' }],
  },
  DIA_LOCKED_FOREST_DEPTH: {
    id: 'DIA_LOCKED_FOREST_DEPTH',
    lines: [{ speaker: '慧慧', text: '森林深处太危险了。先和大家会合，再继续往里走。' }],
  },
  DIA_LOCKED_FOREST_ALTAR: {
    id: 'DIA_LOCKED_FOREST_ALTAR',
    lines: [{ speaker: '木桶精灵', text: '白虎的试炼还没有结束。千年树种不会提前回应你。' }],
  },
  DIA_LOCKED_DOCK: {
    id: 'DIA_LOCKED_DOCK',
    lines: [{ speaker: '船夫', text: '去圣水殿的航路还没开。先把奇妙森林的千年树种带回来。' }],
  },
  DIA_LOCKED_WATER_ROUTE: {
    id: 'DIA_LOCKED_WATER_ROUTE',
    lines: [{ speaker: '船夫', text: '海雾还没散。没有千年树种的气息，船靠不过去。' }],
  },
  DIA_LOCKED_WATER_HALL: {
    id: 'DIA_LOCKED_WATER_HALL',
    lines: [{ speaker: '熙苑', text: '圣水殿不会跳过试炼。先完成水瑶和风赤的战斗。' }],
  },
  DIA_LOCKED_TEMPLE_ROUTE: {
    id: 'DIA_LOCKED_TEMPLE_ROUTE',
    lines: [{ speaker: '木桶精灵', text: '神殿山路还在沉睡。取得神水后，通往神殿的路才会显现。' }],
  },
  DIA_LOCKED_SEVEN_ROAD: {
    id: 'DIA_LOCKED_SEVEN_ROAD',
    lines: [{ speaker: '葱葱', text: '前面的路被石阵封住了。先解决山路上的阻碍。' }],
  },
  DIA_LOCKED_TEMPLE: {
    id: 'DIA_LOCKED_TEMPLE',
    lines: [{ speaker: 'sun', text: '神殿不会在试炼结束前开门。先完成七色路的战斗。' }],
  },
  DIA_LOCKED_LIFE_SPRING: {
    id: 'DIA_LOCKED_LIFE_SPRING',
    lines: [{ speaker: '木桶精灵', text: '生命之泉还没有显露。集齐三件神物并完成重建后再来。' }],
  },
  DIA_LOCKED_REINCARNATION: {
    id: 'DIA_LOCKED_REINCARNATION',
    lines: [{ speaker: '木桶精灵', text: '轮回道仍被四道封印压住。先释放祀神四体。' }],
  },
  DIA_LOCKED_SWAMP: {
    id: 'DIA_LOCKED_SWAMP',
    lines: [{ speaker: 'xiaoai', text: '梦还没有醒。你现在看见的黑暗沼泽，只是黑暗本身。' }],
  },
  DIA_LOCKED_PALACE: {
    id: 'DIA_LOCKED_PALACE',
    lines: [{ speaker: '木桶精灵', text: '沼泽的链锁还没有解开。魔宫入口不会回应你。' }],
  },
  DIA_LOCKED_UNDERGROUND: {
    id: 'DIA_LOCKED_UNDERGROUND',
    lines: [{ speaker: '木桶精灵', text: '通往地下魔宫的机关还没有打开。先处理黑暗沼泽的链锁。' }],
  },
  DIA_LOCKED_DEEP_UNDERGROUND: {
    id: 'DIA_LOCKED_DEEP_UNDERGROUND',
    lines: [{ speaker: 'xiaoai', text: '假影还没有被击破。更深处的门不会让你通过。' }],
  },
  DIA_LOCKED_ABYSS: {
    id: 'DIA_LOCKED_ABYSS',
    lines: [{ speaker: '木桶精灵', text: '人心之渊还没有出现。净化xiaoai后，还需要把散落的真相与善意带回来。' }],
  },
}

const DIALOGUE_ALIASES: Record<string, { target: string; includeOnComplete?: boolean }> = {
  DIA_002_HUIHUI: { target: 'DIA_001_HELP' },
  DIA_003_A: { target: 'DIA_101_COLD' },
  DIA_005_BARREL: { target: 'DIA_REBUILD_BOARD' },
  DIA_006_FESTIVAL: { target: 'DIA_004_FESTIVAL', includeOnComplete: true },
  DIA_202_PINE: { target: 'DIA_NPC_REBUILD1_PINE', includeOnComplete: true },
  DIA_203_MAYOR: { target: 'DIA_NPC_REBUILD2_MAYOR' },
  DIA_204_BARREL: { target: 'DIA_REBUILD_BOARD' },
  DIA_205_SHOP: { target: 'DIA_SHOP_PINE', includeOnComplete: true },
  DIA_206_TRAIN: { target: 'DIA_TRAINING', includeOnComplete: true },
  DIA_105_TREE_1: { target: 'DIA_104_TREE_1', includeOnComplete: true },
  DIA_105_TREE_2: { target: 'DIA_104_TREE_2' },
  DIA_105_TREE_3: { target: 'DIA_104_TREE_3' },
  DIA_106_ALTAR: { target: 'DIA_104_SEED' },
  DIA_107_SAILOR: { target: 'DIA_201_BOAT' },
  DIA_201_SHUIYAO: { target: 'DIA_202_SHUIYAO', includeOnComplete: true },
  DIA_511_POISON_GAS: { target: 'DIA_411_CHI_PRE' },
  DIA_512_DRAGON_SEAL: { target: 'DIA_411_CHI_PRE' },
  DIA_521_TIGER_MEMORY: { target: 'DIA_412_MEI_PRE' },
  DIA_522_MEI_BATTLE: { target: 'DIA_412_MEI_PRE' },
  DIA_531_WANG_BATTLE: { target: 'DIA_413_WANG_PRE' },
  DIA_541_LIANG_BATTLE: { target: 'DIA_414_LIANG_PRE' },
  DIA_542_GIANT_BEAST: { target: 'DIA_414_LIANG_PRE' },
  DIA_551_DREAM_START: { target: 'DIA_420_REINCARNATION' },
  DIA_552_MEMORY_1: { target: 'DIA_420_R2' },
  DIA_553_MEMORY_2: { target: 'DIA_420_R3' },
  DIA_554_MEMORY_3: { target: 'DIA_420_END' },
  DIA_555_MEMORY_FINAL: { target: 'DIA_420_END' },
  DIA_501_MASK: { target: 'DIA_501_CAPTURED', includeOnComplete: true },
  DIA_611_CHAIN_1: { target: 'DIA_510_SWAMP' },
  DIA_612_CHAIN_2: { target: 'DIA_510_SWAMP_MOSS' },
  DIA_613_CHAIN_3: { target: 'DIA_510_SWAMP_MECH' },
  DIA_503_FAKE_XIAOAI: { target: 'DIA_520_PALACE', includeOnComplete: true },
  DIA_631_XIAOAI_CONFRONT: { target: 'DIA_530_CHOICE' },
  DIA_632_PURIFICATION: { target: 'DIA_530_PURIFY_SUCCESS', includeOnComplete: true },
  DIA_632_PURIFICATION_NORMAL: { target: 'DIA_601_NORMAL', includeOnComplete: true },
  DIA_601_WUXIANG: { target: 'DIA_710_ENTER' },
}

for (const [alias, config] of Object.entries(DIALOGUE_ALIASES)) {
  const target = DIALOGUES[config.target]
  if (target) {
    DIALOGUES[alias] = {
      id: alias,
      lines: target.lines,
      ...(config.includeOnComplete && target.onComplete ? { onComplete: target.onComplete } : {}),
    }
  }
}
