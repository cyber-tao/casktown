import type { CharacterData, ItemData } from '../../data/types'
import {
  INVENTORY_CATEGORY_KEYS,
  MENU_CODEX_TAB_KEYS,
} from '../../utils/constants'

export type MenuSubmenu =
  | 'main'
  | 'prophecy'
  | 'party'
  | 'inventory'
  | 'inventory-target'
  | 'skills'
  | 'equip-list'
  | 'codex'
  | 'save'
  | 'settings'

export type InventoryCategory = (typeof INVENTORY_CATEGORY_KEYS)[number]
export type DisplayItemType = Exclude<InventoryCategory, 'all'>
export type CodexTab = (typeof MENU_CODEX_TAB_KEYS)[number]

export interface PartyMemberView {
  charId: string
  char: CharacterData
}

export interface InventoryEntry {
  itemId: string
  item: ItemData
  quantity: number
}

export interface PendingInventoryAction {
  itemId: string
  kind: 'use' | 'equip'
}

export interface SettingsLayout {
  fontSize: number
  rowHeight: number
  visibleRows: number
}
