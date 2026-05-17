export interface CharacterStats {
  hp: number
  mp: number
  maxHp: number
  maxMp: number
  atk: number
  def: number
  matk: number
  mdef: number
  speed: number
  level: number
  exp: number
  expToNext: number
}

export interface CharacterData {
  id: string
  name: string
  stats: CharacterStats
  skills: string[]
  equipment: {
    weapon: string | null
    armor: string | null
    accessory: string | null
  }
  tp: number
}

export interface SkillData {
  id: string
  name: string
  type: 'attack' | 'magic' | 'heal' | 'buff' | 'debuff' | 'special'
  target: 'single' | 'all' | 'self' | 'random'
  element: string
  power: number
  costMp: number
  costTp: number
  description: string
  effects?: string[]
}

export interface ItemData {
  id: string
  name: string
  type: 'consumable' | 'equipment' | 'key' | 'material'
  effect: string
  description: string
  usableInBattle: boolean
  usableInField: boolean
  price?: number
}

export interface EnemyData {
  id: string
  name: string
  stats: CharacterStats
  skills: string[]
  element: string
  weakness: string[]
  resistance: string[]
  drops: { itemId: string; rate: number }[]
  exp: number
  gold: number
  isBoss: boolean
  aiType: string
}

export interface EncounterData {
  id: string
  enemies: string[]
  background: string
  bgm: string
}

export interface MapData {
  id: string
  name: string
  width: number
  height: number
  tileset: string
  layers: MapLayer[]
  collisions: number[]
  events: MapEvent[]
  encounters?: string[]
  encounterRate: number
  bgm: string
  connections: MapConnection[]
}

export interface MapLayer {
  name: string
  data: number[]
  visible: boolean
  opacity: number
}

export interface MapEvent {
  id: string
  x: number
  y: number
  width: number
  height: number
  type: 'trigger' | 'npc' | 'transfer' | 'chest' | 'battle'
  trigger: 'action' | 'touch' | 'autorun' | 'parallel'
  sprite?: string
  direction?: number
  actions: EventAction[]
  conditions?: EventCondition[]
}

export interface EventAction {
  type: string
  [key: string]: unknown
}

export interface EventCondition {
  flag?: string
  value?: unknown
  switch?: string
}

export interface MapConnection {
  targetMap: string
  targetX: number
  targetY: number
  direction: number
}

export interface DialogueLine {
  speaker: string
  text: string
  emotion?: string
  choices?: DialogueChoice[]
}

export interface DialogueChoice {
  text: string
  next?: string
  actions?: EventAction[]
  condition?: EventCondition
}

export interface DialogueData {
  id: string
  lines: DialogueLine[]
}

export interface QuestDef {
  id: string
  name: string
  description: string
  objectives: string[]
  rewards?: { exp?: number; itemId?: string; itemQty?: number; flag?: string; value?: unknown; rebuild?: number }[]
}

export interface QuestState {
  id: string
  status: 'inactive' | 'active' | 'completed' | 'failed'
  progress: number
  maxProgress: number
}

export interface GameFlags {
  [key: string]: unknown
}

export interface BranchState {
  trust_huihui: number
  trust_a: number
  trust_congcong: number
  trust_sun: number
  mercy_score: number
  rebuild_level: number
  prophecy_hint_mode: string
  xiaoai_memory_fragments: number
  white_tiger_respected: boolean
  answered_xiyuan_kindly: boolean
  released_four_seals: boolean
  xiaoai_purified: boolean
  normal_ending_seen: boolean
  true_route_unlocked: boolean
}

export interface Inventory {
  items: Record<string, number>
  equipment: Record<string, number>
}
