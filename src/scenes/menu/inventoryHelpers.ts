import { EQUIP_SLOT_MAP, EQUIP_STAT_BONUSES, EQUIPMENT_SLOTS } from '../../data/equipment'
import type { EquipmentSlot } from '../../data/equipment'
import type { ItemData } from '../../data/types'
import type { GameData } from '../../core/GameData'
import {
  EQUIPMENT_STAT_LABELS,
  INVENTORY_CATEGORY_KEYS,
  INVENTORY_CATEGORY_LABELS,
  INVENTORY_TYPE_ORDER,
  ITEM_ICON_KEY_PREFIX,
} from '../../utils/constants'
import type { DisplayItemType, InventoryCategory, InventoryEntry, PartyMemberView } from './types'

type EquipmentStatKey = keyof typeof EQUIPMENT_STAT_LABELS

export function getItemIconKey(itemId: string): string {
  return `${ITEM_ICON_KEY_PREFIX}${itemId}`
}

export function isEquipmentItem(itemId: string, item: ItemData): boolean {
  return item.type === 'equipment' || Boolean(EQUIP_SLOT_MAP[itemId])
}

export function getDisplayItemType(itemId: string, item: ItemData): DisplayItemType {
  return isEquipmentItem(itemId, item) ? 'equipment' : item.type
}

export function getItemTypeLabel(itemId: string, item: ItemData): string {
  return INVENTORY_CATEGORY_LABELS[getDisplayItemType(itemId, item)]
}

export function formatEquipmentBonuses(itemId: string): string {
  const bonuses = EQUIP_STAT_BONUSES[itemId]
  if (!bonuses) return ''
  return (Object.entries(EQUIPMENT_STAT_LABELS) as [EquipmentStatKey, string][])
    .flatMap(([key, label]) => {
      const value = bonuses[key]
      return value ? [`${label} +${value}`] : []
    })
    .join('  ')
}

export function getItemName(items: Record<string, ItemData>, itemId: string): string {
  return items[itemId]?.name ?? itemId
}

export function buildInventoryEntries(
  gd: GameData,
  items: Record<string, ItemData>,
  category: InventoryCategory,
): InventoryEntry[] {
  const entries = new Map<string, InventoryEntry>()
  const addEntry = (itemId: string, quantity: number): void => {
    if (quantity <= 0) return
    const item = items[itemId]
    if (!item) return
    const displayType = getDisplayItemType(itemId, item)
    if (category !== 'all' && displayType !== category) return
    const current = entries.get(itemId)
    if (current) {
      current.quantity += quantity
    } else {
      entries.set(itemId, { itemId, item, quantity })
    }
  }

  for (const [itemId, quantity] of Object.entries(gd.inventory.items)) addEntry(itemId, quantity)
  for (const [itemId, quantity] of Object.entries(gd.inventory.equipment)) addEntry(itemId, quantity)

  return [...entries.values()].sort((a, b) => {
    const typeA = getDisplayItemType(a.itemId, a.item)
    const typeB = getDisplayItemType(b.itemId, b.item)
    const orderA = INVENTORY_TYPE_ORDER[typeA]
    const orderB = INVENTORY_TYPE_ORDER[typeB]
    if (orderA !== orderB) return orderA - orderB
    return a.item.name.localeCompare(b.item.name, 'zh-Hans-CN')
  })
}

export function getInventoryCategory(categoryIndex: number): InventoryCategory {
  return INVENTORY_CATEGORY_KEYS[categoryIndex]!
}

export function getOwnedItemQuantity(
  gd: GameData,
  partyMembers: readonly PartyMemberView[],
  itemId: string,
): number {
  const equipped = partyMembers.filter(member =>
    EQUIPMENT_SLOTS.some(slot => member.char.equipment[slot] === itemId),
  ).length
  return gd.getItemQuantity(itemId) + equipped
}

export function getEquipmentCandidates(
  entries: readonly InventoryEntry[],
  getStoredQuantity: (itemId: string) => number,
  slot: EquipmentSlot,
): string[] {
  return entries
    .filter(entry => EQUIP_SLOT_MAP[entry.itemId] === slot && getStoredQuantity(entry.itemId) > 0)
    .map(entry => entry.itemId)
}

export function getInventoryEntryImageKeys(entries: readonly InventoryEntry[]): string[] {
  return entries.map(entry => getItemIconKey(entry.itemId))
}
