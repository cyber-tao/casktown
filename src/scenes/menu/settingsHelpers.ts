import {
  BATTLE_RULES,
  MENU_OVERLAY_UI,
  MENU_SETTINGS_OPTION_LABELS,
  MENU_SETTINGS_OPTIONS,
} from '../../utils/constants'
import type { SettingsLayout } from './types'

export type MenuSettingsOption = (typeof MENU_SETTINGS_OPTIONS)[number]

export function getSettingsLayout(cssToGamePx: (cssPx: number) => number): SettingsLayout {
  const fontSize = Math.max(
    MENU_OVERLAY_UI.CAPTION_FONT_SIZE,
    cssToGamePx(MENU_OVERLAY_UI.SETTINGS_MIN_CSS_FONT_SIZE),
  )
  const rowHeight = Math.max(
    MENU_OVERLAY_UI.SETTINGS_ROW_HEIGHT,
    fontSize + cssToGamePx(MENU_OVERLAY_UI.SETTINGS_ROW_GAP_CSS),
  )
  const availableHeight = MENU_OVERLAY_UI.FOOTER_Y
    - MENU_OVERLAY_UI.SETTINGS_FOOTER_GAP
    - MENU_OVERLAY_UI.SETTINGS_ROW_Y
  const visibleRows = Math.min(
    MENU_OVERLAY_UI.SETTINGS_VISIBLE_ROWS,
    Math.max(
      MENU_OVERLAY_UI.SETTINGS_MIN_VISIBLE_ROWS,
      Math.floor(availableHeight / rowHeight),
    ),
  )
  return { fontSize, rowHeight, visibleRows }
}

export function getSettingValueText(
  config: MenuSettingsOption,
  settings: Record<string, unknown>,
  options: {
    isWASDMode: boolean
    isGamepadEnabled: boolean
  },
): string {
  if (config.key === 'controlMode') return options.isWASDMode ? 'WASD' : '方向键'
  if (config.key === 'gamepad') return options.isGamepadEnabled ? '开' : '关'
  if (config.key === 'resetKeys') return '--'
  const value = settings[config.key]
  if (config.type === 'select') {
    const labels = MENU_SETTINGS_OPTION_LABELS[config.key]
    return labels?.[value as string] ?? String(value)
  }
  if (config.type === 'slider') {
    return `${Math.round((value as number) * BATTLE_RULES.PERCENT_DIVISOR)}%`
  }
  return value ? '开' : '关'
}
