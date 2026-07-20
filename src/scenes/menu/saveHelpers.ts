import type { SaveMeta } from '../../core/SaveManager'
import { formatSaveSlotLabel, getLoadSaveSlots, getManualSaveSlots } from '../../utils/saveSlots'

export function buildSaveRows(
  loadMode: boolean,
  getMeta: (slot: number) => SaveMeta | null,
): string[] {
  if (loadMode) {
    return [
      ...getLoadSaveSlots(true).map(slot => formatSaveSlotLabel(slot, getMeta(slot), 'load')),
      '返回',
    ]
  }
  return [
    ...getManualSaveSlots().map(slot => formatSaveSlotLabel(slot, getMeta(slot), 'save')),
    '读取存档',
    '返回',
  ]
}
