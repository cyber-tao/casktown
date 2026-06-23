import { describe, expect, test } from 'bun:test'
import type { SaveMeta } from '../../src/core/SaveManager.ts'
import { QUICK_SAVE_SLOT, SAVE_SLOT_MIN, SAVE_SLOTS } from '../../src/utils/constants.ts'
import { formatSavePlayTime, formatSavePreview, formatSaveSlotLabel, getLoadSaveSlots, getManualSaveSlots, getSaveSlotName } from '../../src/utils/saveSlots.ts'

const meta: SaveMeta = {
  slot: 1,
  timestamp: 1,
  playTime: 125,
  currentMap: 'MAP_001',
  preview: 'T, HUIHUI',
}

describe('save slot presentation', () => {
  test('lists manual save slots separately from quick save', () => {
    expect(getManualSaveSlots()).toEqual([SAVE_SLOT_MIN, SAVE_SLOT_MIN + 1, SAVE_SLOTS])
    expect(getLoadSaveSlots(true)).toEqual([SAVE_SLOT_MIN, SAVE_SLOT_MIN + 1, SAVE_SLOTS, QUICK_SAVE_SLOT])
    expect(getLoadSaveSlots(false)).toEqual(getManualSaveSlots())
  })

  test('names normal and quick save slots distinctly', () => {
    expect(getSaveSlotName(1)).toBe('槽位 1')
    expect(getSaveSlotName(QUICK_SAVE_SLOT)).toBe('快速存档')
  })

  test('formats labels for save and load menus', () => {
    expect(formatSaveSlotLabel(1, null, 'save')).toBe('保存到槽位 1 · 空')
    expect(formatSaveSlotLabel(1, meta, 'load')).toBe('槽位 1 · T, HUIHUI · 0h2m')
    expect(formatSaveSlotLabel(QUICK_SAVE_SLOT, null, 'load')).toBe('快速存档 · 空')
  })

  test('keeps long party previews compact', () => {
    expect(formatSavePreview('T, HUIHUI, CONGCONG, SUN')).toBe('T 等4人')
    expect(formatSavePreview('')).toBe('未知队伍')
  })

  test('formats short and invalid play time defensively', () => {
    expect(formatSavePlayTime(12)).toBe('12s')
    expect(formatSavePlayTime(Number.NaN)).toBe('0s')
  })
})
