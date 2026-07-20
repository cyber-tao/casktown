import { BATTLE_LAYOUT, GAME_HEIGHT } from '../../utils/constants'

export interface BattleSubmenuLayout {
  panelX: number
  panelY: number
  panelWidth: number
  panelHeight: number
  itemStartY: number
}

export function resolveBattleSubmenuLayout(rowCount: number, clampTop: (value: number, min: number, max: number) => number): BattleSubmenuLayout {
  const rows = Math.max(1, rowCount)
  const contentHeight = BATTLE_LAYOUT.SUBMENU_VERTICAL_PADDING * 2
    + BATTLE_LAYOUT.SUBMENU_ITEM_FONT_SIZE
    + (rows - 1) * BATTLE_LAYOUT.SUBMENU_ITEM_GAP_Y
  const panelHeight = Math.max(BATTLE_LAYOUT.SUBMENU_PANEL_MIN_HEIGHT, contentHeight)
  const maxTop = GAME_HEIGHT - BATTLE_LAYOUT.SUBMENU_MARGIN_BOTTOM - panelHeight
  const top = maxTop < BATTLE_LAYOUT.SUBMENU_MIN_TOP
    ? Math.max(0, maxTop)
    : clampTop(BATTLE_LAYOUT.SUBMENU_PREFERRED_TOP, BATTLE_LAYOUT.SUBMENU_MIN_TOP, maxTop)
  return {
    panelX: BATTLE_LAYOUT.SUBMENU_PANEL_X,
    panelY: top + panelHeight / 2,
    panelWidth: BATTLE_LAYOUT.SUBMENU_PANEL_WIDTH,
    panelHeight,
    itemStartY: top + BATTLE_LAYOUT.SUBMENU_VERTICAL_PADDING,
  }
}
