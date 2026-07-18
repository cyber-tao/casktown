import { SETTINGS_PANEL } from './constants'

export interface SettingsSceneLayout {
  fontSize: number
  rowHeight: number
  visibleRows: number
}

export function resolveSettingsSceneLayout(cssToGameScale: number, optionCount: number): SettingsSceneLayout {
  const safeScale = Number.isFinite(cssToGameScale) && cssToGameScale > 0 ? cssToGameScale : 1
  const toGamePixels = (cssPixels: number): number => Math.round(cssPixels * safeScale)
  const fontSize = Math.max(SETTINGS_PANEL.labelFontSize, toGamePixels(SETTINGS_PANEL.minCssFontSize))
  const rowHeight = Math.max(SETTINGS_PANEL.rowHeight, fontSize + toGamePixels(SETTINGS_PANEL.rowGapCss))
  const maximumRows = Math.max(1, optionCount)
  const backFontSize = Math.max(SETTINGS_PANEL.backFontSize, fontSize)
  const fullContentBottom = SETTINGS_PANEL.rowStartY + optionCount * rowHeight + backFontSize
  const availableHeight = SETTINGS_PANEL.contentBottomY
    - SETTINGS_PANEL.rowStartY
    - SETTINGS_PANEL.pageFooterHeight
    - backFontSize
  const visibleRows = fullContentBottom <= SETTINGS_PANEL.contentBottomY
    ? maximumRows
    : Math.min(
      maximumRows,
      SETTINGS_PANEL.compactRowsPerPage,
      Math.max(SETTINGS_PANEL.minVisibleRows, Math.floor(availableHeight / rowHeight)),
    )

  return { fontSize, rowHeight, visibleRows }
}
