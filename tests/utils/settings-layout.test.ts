import { describe, expect, test } from 'bun:test'
import { GAME_HEIGHT, GAME_WIDTH, MENU_SETTINGS_OPTIONS, SETTINGS_PANEL } from '../../src/utils/constants.ts'
import { resolveSettingsSceneLayout } from '../../src/utils/settingsLayout.ts'

function getCssToGameScale(width: number, height: number): number {
  return 1 / Math.min(width / GAME_WIDTH, height / GAME_HEIGHT)
}

describe('settings scene responsive layout', () => {
  test('keeps desktop settings on one readable page', () => {
    const scale = getCssToGameScale(1280, 720)
    const layout = resolveSettingsSceneLayout(scale, MENU_SETTINGS_OPTIONS.length)

    expect(layout.visibleRows).toBe(MENU_SETTINGS_OPTIONS.length)
    expect(layout.fontSize / scale).toBeGreaterThanOrEqual(SETTINGS_PANEL.minCssFontSize)
  })

  for (const [width, height] of [[568, 320], [667, 375]] as const) {
    test(`paginates settings at ${width}x${height} without shrinking below the CSS minimum`, () => {
      const scale = getCssToGameScale(width, height)
      const layout = resolveSettingsSceneLayout(scale, MENU_SETTINGS_OPTIONS.length)
      const pageCount = Math.ceil(MENU_SETTINGS_OPTIONS.length / layout.visibleRows)
      const backY = SETTINGS_PANEL.rowStartY + layout.visibleRows * layout.rowHeight + SETTINGS_PANEL.pageFooterHeight
      const panelBottom = SETTINGS_PANEL.y + SETTINGS_PANEL.height / 2

      expect(layout.fontSize / scale).toBeGreaterThanOrEqual(SETTINGS_PANEL.minCssFontSize)
      expect(layout.visibleRows).toBe(SETTINGS_PANEL.compactRowsPerPage)
      expect(pageCount).toBe(2)
      expect(backY + layout.fontSize).toBeLessThanOrEqual(SETTINGS_PANEL.contentBottomY)
      expect(SETTINGS_PANEL.contentBottomY).toBeLessThan(panelBottom)
    })
  }
})
