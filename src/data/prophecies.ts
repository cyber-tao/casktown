export interface ProphecyVerse {
  id: string
  chapter: string
  verse: string
  hint: string
  explicit: string
  condition?: string
}

export const PROPHECIES: ProphecyVerse[] = [
  {
    id: 'P001',
    chapter: '第一章·荒芜',
    verse: '木桶空空无人声，千年老树梦未醒。往东寻觅青之路，归来之时草又生。',
    hint: '前往奇妙森林寻找千年树种',
    explicit: '目标：奇妙森林 → 取得千年树种 → 回到木桶镇',
    condition: 'quest_started_QST_004',
  },
  {
    id: 'P002',
    chapter: '第二章·圣水',
    verse: '清水殿中谁掌杯？真假虚实须问水。船向西行觅圣路，心正则泉自归回。',
    hint: '乘船前往圣水殿，通过熙苑的试炼',
    explicit: '目标：码头 → 圣水殿 → 通过熙苑问答 → 取得神水',
    condition: 'has_millennium_seed',
  },
  {
    id: 'P003',
    chapter: '第三章·神殿',
    verse: '七色路上雾重重，神之桂冠在最高。凤凰麒麟齐守路，勇者方得见神光。',
    hint: '攀登神殿山路，击败凤凰和麒麟的试炼',
    explicit: '目标：神殿山路 → 七色路 → 击败凤凰+麒麟 → 取得桂冠',
    condition: 'has_sacred_water',
  },
  {
    id: 'P004',
    chapter: '第四章·生命之泉',
    verse: '四方封印镇泉眼，青龙白虎朱雀玄。解放四体方入内，魍魉之路不可忘。',
    hint: '进入生命之泉，解放四封印（青龙潭、白虎穴、朱雀林、玄武殿）',
    explicit: '目标：生命之泉 → 依次击败魑魅魍魉 → 解放四封印',
    condition: 'quest_started_QST_009',
  },
  {
    id: 'P005',
    chapter: '第五章·魔宫',
    verse: '影中身影似故人，花茶之下藏杀心。净化的光从何来？木桶精灵说分明。',
    hint: '进入魔宫，面对假 xiaoai，找到净化方法',
    explicit: '目标：魔宫 → 击败假 xiaoai → 找到净化 xiaoai 的方法',
    condition: 'quest_started_QST_012',
  },
  {
    id: 'P006',
    chapter: '终章·人心之渊',
    verse: '无相之影化万象，人心才是最暗处。预言指的不是路，而是你心中的选择。',
    hint: '进入人心之渊，面对真正的敌人——人心中的黑暗',
    explicit: '真结局：净化 xiaoai → 进入人心之渊 → 击败无相',
    condition: 'xiaoai_purified',
  },
  {
    id: 'P007',
    chapter: '隐藏·后日谈',
    verse: '木桶不再空，笑语满镇中。若有缘再会，花下说英雄。',
    hint: '完成真结局后，回到木桶镇与所有人对话',
    explicit: '回到木桶镇，与所有伙伴和居民对话，观看后日谈',
    condition: 'game_cleared',
  },
]
