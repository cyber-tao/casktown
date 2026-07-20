import type { GameData } from '../../core/GameData'
import { GAME_CONFIG_DATABASE } from '../../data/configDatabase'
import { STORY_CODEX_CATEGORY_LABELS, getUnlockedStoryCodexEntries } from '../../data/codex'
import { EQUIPMENT_SLOTS } from '../../data/equipment'
import type { EnemyData, ItemData } from '../../data/types'
import {
  CODEX_BOSS_DISCOVERY_FLAGS,
  CODEX_STORY_BRANCH_COUNT,
  ENEMY_ICON_DEFAULT_FRAME,
  ENEMY_ICON_KEY_PREFIX,
  MENU_CODEX_TAB_KEYS,
  MENU_OVERLAY_UI,
} from '../../utils/constants'
import { getItemIconKey, getOwnedItemQuantity } from './inventoryHelpers'
import type { CodexTab, PartyMemberView } from './types'

export function getCodexTab(codexTabIndex: number): CodexTab {
  return MENU_CODEX_TAB_KEYS[codexTabIndex] ?? MENU_CODEX_TAB_KEYS[0]
}

export function getEnemyIconKey(enemyId: string): string {
  return `${ENEMY_ICON_KEY_PREFIX}${enemyId}_${ENEMY_ICON_DEFAULT_FRAME}`
}

export function getDiscoveredEnemies(
  gd: GameData,
  enemies: Record<string, EnemyData> = GAME_CONFIG_DATABASE.getTable('enemies'),
): string[] {
  const discovered = Object.keys(enemies).filter(
    id => gd.getFlag(`discovered_${id}`) === true || gd.getFlag(`defeated_${id}`) === true,
  )
  for (const [enemyId, flag] of Object.entries(CODEX_BOSS_DISCOVERY_FLAGS)) {
    if (enemies[enemyId] && !discovered.includes(enemyId) && gd.getFlag(`defeated_${flag}`) === true) {
      discovered.push(enemyId)
    }
  }
  return discovered
}

export function getDiscoveredItems(
  gd: GameData,
  items: Record<string, ItemData>,
  partyMembers: readonly PartyMemberView[],
): string[] {
  return Object.keys(items).filter(id => {
    const stored = gd.getItemQuantity(id)
    const equipped = partyMembers.some(member =>
      EQUIPMENT_SLOTS.some(slot => member.char.equipment[slot] === id),
    )
    return stored > 0 || equipped || gd.getFlag(`found_${id}`) === true
  })
}

export function getStoryBranchRows(gd: GameData): string[] {
  return [
    `信任-慧慧 ${gd.branches.trust_huihui}`,
    `信任-A ${gd.branches.trust_a}`,
    `信任-葱葱 ${gd.branches.trust_congcong}`,
    `信任-sun ${gd.branches.trust_sun}`,
    `慈悲值 ${gd.branches.mercy_score}`,
    `重建等级 ${gd.branches.rebuild_level}`,
    `记忆碎片 ${gd.branches.xiaoai_memory_fragments}`,
    `白虎尊重 ${gd.branches.white_tiger_respected ? '是' : '否'}`,
    `四封印解放 ${gd.branches.released_four_seals ? '是' : '否'}`,
    `xiaoai净化 ${gd.branches.xiaoai_purified ? '是' : '否'}`,
  ]
}

export function getCodexListCount(
  gd: GameData,
  tab: CodexTab,
  discoveredEnemies: readonly string[],
  discoveredItems: readonly string[],
  prophecyCount: number = GAME_CONFIG_DATABASE.getTable('prophecies').length,
): number {
  if (tab === 'monsters') return Math.max(1, discoveredEnemies.length)
  if (tab === 'items') return Math.max(1, discoveredItems.length)
  return (
    CODEX_STORY_BRANCH_COUNT
    + getUnlockedStoryCodexEntries(gd.unlockedCodex).length
    + prophecyCount
  )
}

export function getCodexRowLabel(params: {
  gd: GameData
  tab: CodexTab
  index: number
  discoveredEnemies: readonly string[]
  discoveredItems: readonly string[]
  items: Record<string, ItemData>
  partyMembers: readonly PartyMemberView[]
  enemies?: Record<string, EnemyData>
}): string {
  const {
    gd,
    tab,
    index,
    discoveredEnemies,
    discoveredItems,
    items,
    partyMembers,
    enemies = GAME_CONFIG_DATABASE.getTable('enemies'),
  } = params

  if (tab === 'monsters') {
    const enemyId = discoveredEnemies[index]
    const enemy = enemyId ? enemies[enemyId] : undefined
    if (!enemy) return '尚未发现任何怪物'
    return `${enemy.isBoss ? 'BOSS' : '怪物'} · ${enemy.name}`
  }
  if (tab === 'items') {
    const itemId = discoveredItems[index]
    const item = itemId ? items[itemId] : undefined
    if (!item || !itemId) return '尚未获得任何物品'
    return `${item.name} x${getOwnedItemQuantity(gd, partyMembers, itemId)}`
  }
  if (index < CODEX_STORY_BRANCH_COUNT) {
    return getStoryBranchRows(gd)[index] ?? ''
  }
  const codexEntries = getUnlockedStoryCodexEntries(gd.unlockedCodex)
  const codexEntryIndex = index - CODEX_STORY_BRANCH_COUNT
  const codexEntry = codexEntries[codexEntryIndex]
  if (codexEntry) {
    return `${STORY_CODEX_CATEGORY_LABELS[codexEntry.category]} · ${codexEntry.title}`
  }
  const prophecy = GAME_CONFIG_DATABASE.getTable('prophecies')[codexEntryIndex - codexEntries.length]
  return prophecy ? prophecy.chapter : ''
}

export function getCodexRowColor(
  tab: CodexTab,
  index: number,
  discoveredEnemies: readonly string[],
  enemies: Record<string, EnemyData> = GAME_CONFIG_DATABASE.getTable('enemies'),
): string {
  if (tab !== 'monsters') return MENU_OVERLAY_UI.COLORS.text
  const enemyId = discoveredEnemies[index]
  const enemy = enemyId ? enemies[enemyId] : undefined
  return enemy?.isBoss ? MENU_OVERLAY_UI.COLORS.danger : MENU_OVERLAY_UI.COLORS.text
}

export function getCodexImageKeys(
  tab: CodexTab,
  discoveredItems: readonly string[],
  discoveredEnemies: readonly string[],
): string[] {
  if (tab === 'items') return discoveredItems.map(itemId => getItemIconKey(itemId))
  if (tab === 'monsters') return discoveredEnemies.map(enemyId => getEnemyIconKey(enemyId))
  return []
}
