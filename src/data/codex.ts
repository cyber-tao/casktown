export type StoryCodexEntryCategory = 'achievement' | 'memory' | 'lore'

export interface StoryCodexEntry {
  id: string
  category: StoryCodexEntryCategory
  title: string
  description: string
  unlockFlag: string
}

export const STORY_CODEX_ENTRIES: readonly StoryCodexEntry[] = [
  {
    id: 'achievement_almost_late',
    category: 'achievement',
    title: '差点迟到',
    description: '盛典清晨，T 想再睡五分钟，慧慧用袖镖把他的衣角钉在了门框上。',
    unlockFlag: 'achieve_late',
  },
  {
    id: 'memory_parent_robes',
    category: 'memory',
    title: '父母的战袍',
    description: '镇长交还了 T 父母留下的剑与战袍。遗物没有替他作答，却让被藏起的真相重新有了重量。',
    unlockFlag: 'memory_robes',
  },
  {
    id: 'lore_tianjian_pavilion',
    category: 'lore',
    title: '天剑阁',
    description: '葱葱自称是天剑阁阁主檠鹜烈的入室大弟子。他的来历仍有许多故事没有说完。',
    unlockFlag: 'info_tianjiange',
  },
] as const

export const STORY_CODEX_CATEGORY_LABELS: Record<StoryCodexEntryCategory, string> = {
  achievement: '成就',
  memory: '回忆',
  lore: '见闻',
}

export const STORY_CODEX_ENTRY_ID_BY_FLAG: Readonly<Record<string, string>> = Object.fromEntries(
  STORY_CODEX_ENTRIES.map(entry => [entry.unlockFlag, entry.id]),
)

export function getUnlockedStoryCodexEntries(unlockedIds: readonly string[]): StoryCodexEntry[] {
  const unlocked = new Set(unlockedIds)
  return STORY_CODEX_ENTRIES.filter(entry => unlocked.has(entry.id))
}
