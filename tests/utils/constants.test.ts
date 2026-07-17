import { describe, expect, test } from 'bun:test'
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  GAME_SCALE,
  BASE_GAME_WIDTH,
  BASE_GAME_HEIGHT,
  START_MAP_ID,
  START_PARTY,
  START_INVENTORY_ITEMS,
  INITIAL_GOLD,
  SAVE_SLOTS,
  QUICK_SAVE_SLOT,
  TIME_MS_PER_SECOND,
  SECONDS_PER_MINUTE,
  MINUTES_PER_HOUR,
  SECONDS_PER_HOUR,
  TRUE_ROUTE_MIN_MERCY,
  TRUE_ROUTE_MIN_XIAOAI_MEMORY_FRAGMENTS,
  BATTLE_RULES,
  ELEMENTS,
  MAP_ACCESS_REQUIREMENTS,
  WORLD_MAP_BACKGROUND_LAYOUT,
  WORLD_MAP_LOCATION_POINTS,
  WORLD_MAP_UI,
  DIRECTION,
  DIRECTION_VECTORS,
  TOUCH_INPUT,
  UI_FONT_FAMILY,
  BATTLE_LAYOUT,
  BATTLE_RESULT_PANEL,
  STARTUP_LOADING,
  TITLE_GITHUB_LINK,
  TITLE_MENU_LAYOUT,
  BATTLE_DEFAULT_ENEMY_SPRITE_FRAME,
  BATTLE_ENEMY_SPRITE_FRAME_OVERRIDES,
  MENU_OVERLAY_UI,
  MENU_SETTINGS_OPTIONS,
  REBUILD_MENU,
} from '../../src/utils/constants.ts'

describe('constants consistency', () => {
  test('game resolution = base * scale', () => {
    expect(GAME_WIDTH).toBe(BASE_GAME_WIDTH * GAME_SCALE)
    expect(GAME_HEIGHT).toBe(BASE_GAME_HEIGHT * GAME_SCALE)
  })

  test('start party and inventory are non-empty', () => {
    expect(START_PARTY.length).toBeGreaterThan(0)
    expect(START_INVENTORY_ITEMS.length).toBeGreaterThan(0)
  })

  test('start map id is a valid string', () => {
    expect(typeof START_MAP_ID).toBe('string')
    expect(START_MAP_ID).toBeTruthy()
  })

  test('initial gold is non-negative', () => {
    expect(INITIAL_GOLD).toBeGreaterThanOrEqual(0)
  })

  test('save slots are positive integers', () => {
    expect(SAVE_SLOTS).toBeGreaterThan(0)
    expect(Number.isInteger(SAVE_SLOTS)).toBe(true)
  })

  test('quick save slot is a valid integer', () => {
    expect(Number.isInteger(QUICK_SAVE_SLOT)).toBe(true)
  })

  test('true route thresholds are positive', () => {
    expect(TRUE_ROUTE_MIN_MERCY).toBeGreaterThan(0)
    expect(TRUE_ROUTE_MIN_XIAOAI_MEMORY_FRAGMENTS).toBeGreaterThan(0)
  })

  test('battle rules have valid numeric values', () => {
    expect(BATTLE_RULES.ESCAPE_SUCCESS_RATE).toBeGreaterThan(0)
    expect(BATTLE_RULES.ESCAPE_SUCCESS_RATE).toBeLessThanOrEqual(1)
    expect(BATTLE_RULES.MAX_TP).toBeGreaterThan(0)
    expect(BATTLE_RULES.DEFEND_DAMAGE_MULTIPLIER).toBeGreaterThan(0)
    expect(BATTLE_RULES.DEFEND_DAMAGE_MULTIPLIER).toBeLessThan(1)
  })

  test('battle result panel keeps content centered and readable', () => {
    const panelLeft = BATTLE_RESULT_PANEL.x - BATTLE_RESULT_PANEL.width / 2
    const panelRight = BATTLE_RESULT_PANEL.x + BATTLE_RESULT_PANEL.width / 2
    const contentRight = BATTLE_RESULT_PANEL.contentX + BATTLE_RESULT_PANEL.contentWrapWidth

    expect(BATTLE_RESULT_PANEL.titleX).toBe(BATTLE_RESULT_PANEL.x)
    expect(BATTLE_RESULT_PANEL.confirmX).toBe(BATTLE_RESULT_PANEL.x)
    expect(BATTLE_RESULT_PANEL.contentX).toBeGreaterThan(panelLeft)
    expect(contentRight).toBeLessThan(panelRight)
    expect(BATTLE_RESULT_PANEL.contentWrapWidth).toBeGreaterThan(BATTLE_RESULT_PANEL.width * 0.75)
  })

  test('battle command panel keeps the playfield visible', () => {
    const panelLeft = BATTLE_LAYOUT.COMMAND_PANEL_X - BATTLE_LAYOUT.COMMAND_PANEL_WIDTH / 2
    const panelRight = BATTLE_LAYOUT.COMMAND_PANEL_X + BATTLE_LAYOUT.COMMAND_PANEL_WIDTH / 2
    const panelBottom = BATTLE_LAYOUT.COMMAND_PANEL_Y + BATTLE_LAYOUT.COMMAND_PANEL_HEIGHT / 2
    const panelArea = BATTLE_LAYOUT.COMMAND_PANEL_WIDTH * BATTLE_LAYOUT.COMMAND_PANEL_HEIGHT

    expect(panelLeft).toBeGreaterThan(GAME_WIDTH * 0.65)
    expect(panelRight).toBeLessThanOrEqual(GAME_WIDTH)
    expect(panelBottom).toBeLessThanOrEqual(GAME_HEIGHT)
    expect(panelArea).toBeLessThan(GAME_WIDTH * GAME_HEIGHT * 0.09)
  })

  test('battle submenus fit late-game barrel and item lists', () => {
    const lateGameRows = 9
    const contentHeight = BATTLE_LAYOUT.SUBMENU_VERTICAL_PADDING * 2 +
      BATTLE_LAYOUT.SUBMENU_ITEM_FONT_SIZE +
      (lateGameRows - 1) * BATTLE_LAYOUT.SUBMENU_ITEM_GAP_Y
    const panelHeight = Math.max(BATTLE_LAYOUT.SUBMENU_PANEL_MIN_HEIGHT, contentHeight)
    const maxTop = GAME_HEIGHT - BATTLE_LAYOUT.SUBMENU_MARGIN_BOTTOM - panelHeight
    const panelTop = Math.min(BATTLE_LAYOUT.SUBMENU_PREFERRED_TOP, maxTop)
    const firstItemTop = panelTop + BATTLE_LAYOUT.SUBMENU_VERTICAL_PADDING
    const lastItemBottom = firstItemTop +
      (lateGameRows - 1) * BATTLE_LAYOUT.SUBMENU_ITEM_GAP_Y +
      BATTLE_LAYOUT.SUBMENU_ITEM_FONT_SIZE

    expect(panelTop).toBeGreaterThanOrEqual(BATTLE_LAYOUT.SUBMENU_MIN_TOP)
    expect(panelTop + panelHeight).toBeLessThanOrEqual(GAME_HEIGHT - BATTLE_LAYOUT.SUBMENU_MARGIN_BOTTOM)
    expect(lastItemBottom).toBeLessThanOrEqual(panelTop + panelHeight - BATTLE_LAYOUT.SUBMENU_VERTICAL_PADDING)
    expect(BATTLE_LAYOUT.SUBMENU_TEXT_WIDTH).toBeLessThan(BATTLE_LAYOUT.SUBMENU_PANEL_WIDTH)
    expect(BATTLE_LAYOUT.SUBMENU_ITEM_MIN_FONT_SIZE).toBeLessThan(BATTLE_LAYOUT.SUBMENU_ITEM_FONT_SIZE)
  })

  test('battle unit names stay readable over detailed backgrounds', () => {
    expect(BATTLE_LAYOUT.UNIT_NAME_STROKE_THICKNESS).toBeGreaterThan(0)
    expect(BATTLE_LAYOUT.UNIT_NAME_MAX_WIDTH).toBeGreaterThanOrEqual(BATTLE_LAYOUT.UNIT_BAR_WIDTH)
    expect(BATTLE_LAYOUT.UNIT_NAME_MAX_WIDTH).toBeLessThan(BATTLE_LAYOUT.ENEMY_GAP_X)
  })

  test('boss battle sprites scale up without covering their status UI', () => {
    const defaultSpriteSize = BATTLE_LAYOUT.UNIT_SPRITE_SIZE
    const bossSpriteSize = Math.round(defaultSpriteSize * BATTLE_LAYOUT.BOSS_SPRITE_SCALE)
    const defaultUiOffset = defaultSpriteSize / 2 + BATTLE_LAYOUT.UNIT_UI_SPRITE_GAP_Y
    const bossUiOffset = bossSpriteSize / 2 + BATTLE_LAYOUT.UNIT_UI_SPRITE_GAP_Y
    const bossTop = BATTLE_LAYOUT.ENEMY_START_Y - bossSpriteSize / 2
    const bossUiBottom = BATTLE_LAYOUT.ENEMY_START_Y - bossUiOffset +
      BATTLE_LAYOUT.UNIT_BAR_HEIGHT * 2 +
      BATTLE_LAYOUT.UNIT_BAR_GAP_Y

    expect(BATTLE_LAYOUT.BOSS_SPRITE_SCALE).toBeGreaterThan(1)
    expect(defaultUiOffset).toBe(BATTLE_LAYOUT.UNIT_UI_OFFSET_Y)
    expect(bossSpriteSize).toBeGreaterThan(defaultSpriteSize)
    expect(bossUiBottom).toBeLessThanOrEqual(bossTop)
    expect(bossSpriteSize).toBeLessThan(BATTLE_LAYOUT.ENEMY_GAP_X)
  })

  test('battle enemy sprite frame overrides use explicit non-default frames', () => {
    expect(BATTLE_DEFAULT_ENEMY_SPRITE_FRAME).toBe('01')
    expect(BATTLE_ENEMY_SPRITE_FRAME_OVERRIDES.wuxiang).toBe('02')
    expect(BATTLE_ENEMY_SPRITE_FRAME_OVERRIDES.wuxiang).not.toBe(BATTLE_DEFAULT_ENEMY_SPRITE_FRAME)
  })

  test('elements enum has no duplicates', () => {
    const vals = Object.values(ELEMENTS)
    expect(new Set(vals).size).toBe(vals.length)
  })

  test('direction enum has exactly 4 directions', () => {
    expect(Object.keys(DIRECTION)).toHaveLength(4)
  })

  test('direction vectors match direction keys', () => {
    for (const dir of Object.values(DIRECTION)) {
      const vec = DIRECTION_VECTORS[dir as keyof typeof DIRECTION_VECTORS]
      expect(vec).toBeDefined()
      expect(typeof vec.x).toBe('number')
      expect(typeof vec.y).toBe('number')
    }
  })

  test('map access requirements have same keys as world map points', () => {
    const accessMapIds = new Set(Object.keys(MAP_ACCESS_REQUIREMENTS))
    for (const mapId of accessMapIds) {
      expect(WORLD_MAP_LOCATION_POINTS[mapId as keyof typeof WORLD_MAP_LOCATION_POINTS]).toBeDefined()
    }
  })

  test('world map location points are within screen bounds', () => {
    for (const [mapId, point] of Object.entries(WORLD_MAP_LOCATION_POINTS)) {
      expect(point.x).toBeGreaterThanOrEqual(0)
      expect(point.x).toBeLessThanOrEqual(GAME_WIDTH)
      expect(point.y).toBeGreaterThanOrEqual(0)
      expect(point.y).toBeLessThanOrEqual(GAME_HEIGHT)
    }
  })

  test('world map current marker stays subtle over dense map labels', () => {
    expect(WORLD_MAP_UI.LOCATION_PIN_SIZE).toBeLessThanOrEqual(WORLD_MAP_UI.LOCATION_LABEL_FONT_SIZE / 2)
    expect(WORLD_MAP_UI.LOCATION_PIN_ALPHA).toBeLessThan(0.5)
    expect(WORLD_MAP_UI.LOCATION_PIN_STROKE_ALPHA).toBeGreaterThan(0.7)
    expect(WORLD_MAP_UI.LOCATION_PULSE_FILL_ALPHA).toBeLessThanOrEqual(0.1)
    expect(WORLD_MAP_UI.LOCATION_PULSE_ALPHA).toBeLessThan(0.5)
    expect(WORLD_MAP_LOCATION_POINTS.MAP_070.y).toBeLessThan(WORLD_MAP_UI.LOCATION_LABEL_Y - WORLD_MAP_UI.LOCATION_PULSE_SIZE)
  })

  test('world map title stays readable over the illustrated clock tower', () => {
    expect(WORLD_MAP_UI.TITLE_PANEL_WIDTH).toBeGreaterThan(WORLD_MAP_UI.TITLE_FONT_SIZE * 4)
    expect(WORLD_MAP_UI.TITLE_PANEL_HEIGHT).toBeGreaterThan(WORLD_MAP_UI.TITLE_FONT_SIZE)
    expect(WORLD_MAP_UI.TITLE_PANEL_BG_ALPHA).toBeGreaterThanOrEqual(0.8)
    expect(WORLD_MAP_UI.TITLE_PANEL_BG_ALPHA).toBeLessThan(1)
    expect(WORLD_MAP_UI.TITLE_STROKE_THICKNESS).toBeGreaterThan(0)
    expect(WORLD_MAP_UI.TITLE_PANEL_DEPTH).toBeGreaterThan(WORLD_MAP_BACKGROUND_LAYOUT.MAP_DEPTH)
    expect(WORLD_MAP_UI.TITLE_TEXT_DEPTH).toBeGreaterThan(WORLD_MAP_UI.TITLE_PANEL_DEPTH)
    expect(WORLD_MAP_UI.TITLE_Y + WORLD_MAP_UI.TITLE_PANEL_HEIGHT).toBeLessThan(WORLD_MAP_UI.HINT_Y)
  })

  test('UI font family includes CJK fonts', () => {
    expect(UI_FONT_FAMILY).toContain('YaHei')
  })

  test('time constants form consistent relationships', () => {
    expect(TIME_MS_PER_SECOND).toBe(1000)
    expect(SECONDS_PER_MINUTE).toBe(60)
    expect(MINUTES_PER_HOUR).toBe(60)
    expect(SECONDS_PER_HOUR).toBe(SECONDS_PER_MINUTE * MINUTES_PER_HOUR)
    expect(SECONDS_PER_HOUR).toBe(3600)
  })

  test('startup loading fallback is bounded', () => {
    expect(STARTUP_LOADING.FALLBACK_HIDE_DELAY_MS).toBeGreaterThan(0)
    expect(STARTUP_LOADING.FALLBACK_HIDE_DELAY_MS).toBeLessThan(10_000)
  })

  test('title menu leaves the central party art visible', () => {
    const partyArtRight = GAME_WIDTH * 0.58
    const panelLeft = TITLE_MENU_LAYOUT.PANEL_X - TITLE_MENU_LAYOUT.PANEL_WIDTH / 2
    const panelRight = TITLE_MENU_LAYOUT.PANEL_X + TITLE_MENU_LAYOUT.PANEL_WIDTH / 2
    const panelBottom = TITLE_MENU_LAYOUT.PANEL_Y + TITLE_MENU_LAYOUT.PANEL_HEIGHT / 2
    const menuLeft = TITLE_MENU_LAYOUT.MENU_X - TITLE_MENU_LAYOUT.CURSOR_OFFSET_X
    const menuRight = TITLE_MENU_LAYOUT.MENU_X + TITLE_MENU_LAYOUT.MENU_TEXT_HALF_WIDTH
    const finalMenuItemY = TITLE_MENU_LAYOUT.START_Y + TITLE_MENU_LAYOUT.GAP_Y * 4

    expect(panelLeft).toBeGreaterThan(partyArtRight)
    expect(panelRight).toBeLessThanOrEqual(GAME_WIDTH - 32)
    expect(panelBottom).toBeLessThan(TITLE_GITHUB_LINK.y)
    expect(menuLeft).toBeGreaterThan(partyArtRight)
    expect(menuRight).toBeLessThan(GAME_WIDTH - 80)
    expect(menuLeft).toBeGreaterThan(panelLeft)
    expect(menuRight).toBeLessThan(panelRight)
    expect(TITLE_MENU_LAYOUT.MESSAGE_X).toBe(TITLE_MENU_LAYOUT.MENU_X)
    expect(finalMenuItemY).toBeLessThan(GAME_HEIGHT - 80)
    expect(TITLE_MENU_LAYOUT.MENU_STROKE_THICKNESS).toBeGreaterThan(0)
    expect(TITLE_MENU_LAYOUT.PANEL_ALPHA).toBeGreaterThan(0)
    expect(TITLE_MENU_LAYOUT.PANEL_ALPHA).toBeLessThan(0.7)
  })

  test('title menu remains readable on common landscape phone viewports', () => {
    const landscapePhoneViewport = { width: 667, height: 375 }
    const displayScale = Math.min(
      landscapePhoneViewport.width / GAME_WIDTH,
      landscapePhoneViewport.height / GAME_HEIGHT,
    )
    const menuCssFontSize = TITLE_MENU_LAYOUT.MENU_FONT_SIZE * GAME_SCALE * displayScale
    const githubCssFontSize = TITLE_GITHUB_LINK.fontSize * displayScale
    const menuCenterX = TITLE_MENU_LAYOUT.MENU_X * displayScale
    const panelRight = (TITLE_MENU_LAYOUT.PANEL_X + TITLE_MENU_LAYOUT.PANEL_WIDTH / 2) * displayScale
    const finalMenuItemY = (TITLE_MENU_LAYOUT.START_Y + TITLE_MENU_LAYOUT.GAP_Y * 4) * displayScale

    expect(menuCssFontSize).toBeGreaterThanOrEqual(16)
    expect(githubCssFontSize).toBeGreaterThanOrEqual(10)
    expect(menuCenterX).toBeGreaterThan(landscapePhoneViewport.width * 0.72)
    expect(menuCenterX).toBeLessThan(landscapePhoneViewport.width * 0.86)
    expect(panelRight).toBeLessThanOrEqual(landscapePhoneViewport.width - 8)
    expect(finalMenuItemY).toBeLessThan(landscapePhoneViewport.height - 24)
  })

  test('settings rows remain readable and paginated on landscape phones', () => {
    const phoneViewports = [
      { width: 568, height: 320 },
      { width: 667, height: 375 },
    ]

    for (const viewport of phoneViewports) {
      const displayScale = Math.min(viewport.width / GAME_WIDTH, viewport.height / GAME_HEIGHT)
      const cssToGameScale = 1 / displayScale
      const fontSize = Math.max(
        MENU_OVERLAY_UI.CAPTION_FONT_SIZE,
        Math.round(MENU_OVERLAY_UI.SETTINGS_MIN_CSS_FONT_SIZE * cssToGameScale),
      )
      const rowHeight = Math.max(
        MENU_OVERLAY_UI.SETTINGS_ROW_HEIGHT,
        fontSize + Math.round(MENU_OVERLAY_UI.SETTINGS_ROW_GAP_CSS * cssToGameScale),
      )
      const availableHeight = MENU_OVERLAY_UI.FOOTER_Y
        - MENU_OVERLAY_UI.SETTINGS_FOOTER_GAP
        - MENU_OVERLAY_UI.SETTINGS_ROW_Y
      const visibleRows = Math.max(
        MENU_OVERLAY_UI.SETTINGS_MIN_VISIBLE_ROWS,
        Math.min(MENU_OVERLAY_UI.SETTINGS_VISIBLE_ROWS, Math.floor(availableHeight / rowHeight)),
      )

      expect(fontSize * displayScale).toBeGreaterThanOrEqual(MENU_OVERLAY_UI.SETTINGS_MIN_CSS_FONT_SIZE)
      expect(visibleRows).toBeLessThan(MENU_OVERLAY_UI.SETTINGS_VISIBLE_ROWS)
      expect(visibleRows).toBeGreaterThanOrEqual(MENU_OVERLAY_UI.SETTINGS_MIN_VISIBLE_ROWS)
      expect(MENU_OVERLAY_UI.SETTINGS_ROW_Y + visibleRows * rowHeight)
        .toBeLessThanOrEqual(MENU_OVERLAY_UI.FOOTER_Y - MENU_OVERLAY_UI.SETTINGS_FOOTER_GAP)
      expect((MENU_OVERLAY_UI.SETTINGS_PAGE_TEXT_X - MENU_OVERLAY_UI.SETTINGS_PAGE_PREVIOUS_X) * displayScale)
        .toBeGreaterThanOrEqual(TOUCH_INPUT.TEXT_HIT_AREA_MIN_CSS_WIDTH)
      expect((MENU_OVERLAY_UI.SETTINGS_PAGE_NEXT_X - MENU_OVERLAY_UI.SETTINGS_PAGE_TEXT_X) * displayScale)
        .toBeGreaterThanOrEqual(TOUCH_INPUT.TEXT_HIT_AREA_MIN_CSS_WIDTH)
    }

    const desktopScale = 1
    const desktopFontSize = Math.max(
      MENU_OVERLAY_UI.CAPTION_FONT_SIZE,
      Math.round(MENU_OVERLAY_UI.SETTINGS_MIN_CSS_FONT_SIZE / desktopScale),
    )
    const desktopRowHeight = Math.max(
      MENU_OVERLAY_UI.SETTINGS_ROW_HEIGHT,
      desktopFontSize + Math.round(MENU_OVERLAY_UI.SETTINGS_ROW_GAP_CSS / desktopScale),
    )
    const desktopAvailableHeight = MENU_OVERLAY_UI.FOOTER_Y
      - MENU_OVERLAY_UI.SETTINGS_FOOTER_GAP
      - MENU_OVERLAY_UI.SETTINGS_ROW_Y

    expect(desktopFontSize).toBe(MENU_OVERLAY_UI.CAPTION_FONT_SIZE)
    expect(desktopRowHeight).toBe(MENU_OVERLAY_UI.SETTINGS_ROW_HEIGHT)
    expect(Math.floor(desktopAvailableHeight / desktopRowHeight)).toBe(MENU_OVERLAY_UI.SETTINGS_VISIBLE_ROWS)
    expect(MENU_SETTINGS_OPTIONS.length).toBeGreaterThan(MENU_OVERLAY_UI.SETTINGS_VISIBLE_ROWS)
  })

  test('rebuild progress text stays inside the book pages', () => {
    const panelTop = GAME_HEIGHT / 2 - REBUILD_MENU.PANEL_HEIGHT / 2
    const panelRight = GAME_WIDTH / 2 + REBUILD_MENU.PANEL_WIDTH / 2
    const panelBottom = GAME_HEIGHT / 2 + REBUILD_MENU.PANEL_HEIGHT / 2
    const descriptionRight = REBUILD_MENU.DESC_X + REBUILD_MENU.DESC_WRAP_WIDTH
    const finalMilestoneY = REBUILD_MENU.OPTION_START_Y + REBUILD_MENU.OPTION_GAP_Y * 4
    const landscapeScale = Math.min(844 / GAME_WIDTH, 390 / GAME_HEIGHT)

    expect(REBUILD_MENU.TITLE_Y).toBeGreaterThan(panelTop + 60 * GAME_SCALE)
    expect(REBUILD_MENU.PROGRESS_Y).toBe(REBUILD_MENU.TITLE_Y)
    expect(REBUILD_MENU.OPTION_START_Y - REBUILD_MENU.TITLE_Y)
      .toBeGreaterThan(REBUILD_MENU.TITLE_FONT_SIZE * GAME_SCALE)
    expect(REBUILD_MENU.DESC_X).toBeGreaterThan(GAME_WIDTH / 2)
    expect(descriptionRight).toBeLessThan(panelRight - 30 * GAME_SCALE)
    expect(REBUILD_MENU.BACK_Y).toBeGreaterThan(finalMilestoneY + 20 * GAME_SCALE)
    expect(REBUILD_MENU.BACK_Y).toBeLessThan(panelBottom - 20 * GAME_SCALE)
    expect(REBUILD_MENU.OPTION_FONT_SIZE * GAME_SCALE * landscapeScale).toBeGreaterThanOrEqual(13)
    expect(REBUILD_MENU.DESC_FONT_SIZE * GAME_SCALE * landscapeScale).toBeGreaterThanOrEqual(11)
  })

  test('MAP_HUD party layout constants are defined', () => {
    const { MAP_HUD } = require('../../src/utils/constants.ts')
    expect(MAP_HUD.PARTY_X).toBeGreaterThan(0)
    expect(MAP_HUD.PARTY_Y).toBeGreaterThan(0)
    expect(MAP_HUD.PARTY_MAX_ROWS).toBe(4)
    expect(MAP_HUD.PARTY_LEADER_INDEX).toBe(0)
    expect(MAP_HUD.PARTY_HP_LABEL).toBeTruthy()
    expect(MAP_HUD.PARTY_MP_LABEL).toBeTruthy()
    expect(MAP_HUD.PARTY_LEVEL_PREFIX).toBeTruthy()
  })

  test('MAP_HUD touch party text stays readable on landscape phones', () => {
    const { MAP_HUD } = require('../../src/utils/constants.ts')
    const landscapePhoneViewport = { width: 844, height: 390 }
    const displayScale = Math.min(
      landscapePhoneViewport.width / GAME_WIDTH,
      landscapePhoneViewport.height / GAME_HEIGHT,
    )
    const unprotectedNameCssFontSize = MAP_HUD.PARTY_NAME_FONT_SIZE * displayScale
    const unprotectedStatusCssFontSize = MAP_HUD.PARTY_STATUS_FONT_SIZE * displayScale
    const valueColumnCssWidth = (
      MAP_HUD.PARTY_ROW_WIDTH -
      MAP_HUD.PARTY_TEXT_OFFSET_X -
      MAP_HUD.PARTY_BAR_LABEL_WIDTH -
      MAP_HUD.PARTY_BAR_WIDTH -
      MAP_HUD.PARTY_BAR_VALUE_GAP
    ) * displayScale

    expect(MAP_HUD.TOUCH_PARTY_NAME_MIN_CSS_FONT_SIZE).toBeGreaterThanOrEqual(10)
    expect(MAP_HUD.TOUCH_PARTY_LEVEL_MIN_CSS_FONT_SIZE).toBeGreaterThanOrEqual(8)
    expect(MAP_HUD.TOUCH_PARTY_STATUS_MIN_CSS_FONT_SIZE).toBeGreaterThanOrEqual(8)
    expect(unprotectedNameCssFontSize).toBeLessThan(MAP_HUD.TOUCH_PARTY_NAME_MIN_CSS_FONT_SIZE)
    expect(unprotectedStatusCssFontSize).toBeLessThan(MAP_HUD.TOUCH_PARTY_STATUS_MIN_CSS_FONT_SIZE)
    expect(valueColumnCssWidth).toBeLessThan(32)
    expect(MAP_HUD.TOUCH_PARTY_SHOW_NUMERIC_VALUES).toBe(false)
  })

  test('MAP_HUD prompt constants are defined', () => {
    const { MAP_HUD } = require('../../src/utils/constants.ts')
    expect(MAP_HUD.PROMPT_COLOR).toBeTruthy()
    expect(MAP_HUD.PROMPT_FONT_SIZE).toBeGreaterThan(0)
    expect(MAP_HUD.PROMPT_DEPTH).toBeGreaterThan(0)
    expect(MAP_HUD.TOUCH_PROMPT_TEXT).toBe(MAP_HUD.TOUCH_OPEN_HINT)
    expect(MAP_HUD.TOUCH_PROMPT_TEXT.length).toBeLessThan(MAP_HUD.PROMPT_TEXT.length / 3)
    expect(MAP_HUD.TOUCH_PROMPT_ACTION_PREFIX).toBeTruthy()
    expect(MAP_HUD.TOUCH_PROMPT_FONT_SIZE).toBeGreaterThan(MAP_HUD.PROMPT_FONT_SIZE)
    expect(MAP_HUD.TOUCH_PROMPT_PADDING_X).toBeGreaterThan(MAP_HUD.PROMPT_PADDING_X)
  })

  test('MAP_HUD touch quest text stays readable on landscape phones', () => {
    const { MAP_HUD } = require('../../src/utils/constants.ts')
    const landscapePhoneViewport = { width: 844, height: 390 }
    const displayScale = Math.min(
      landscapePhoneViewport.width / GAME_WIDTH,
      landscapePhoneViewport.height / GAME_HEIGHT,
    )
    const unprotectedBodyCssFontSize = MAP_HUD.QUEST_BODY_FONT_SIZE * displayScale
    const questCssWidth = MAP_HUD.QUEST_WIDTH * displayScale
    const questRight = (MAP_HUD.QUEST_X + MAP_HUD.QUEST_WIDTH) * displayScale
    const minimapBottom = (MAP_HUD.MINIMAP_Y + MAP_HUD.MINIMAP_HEIGHT) * displayScale

    expect(MAP_HUD.TOUCH_QUEST_TITLE_MIN_CSS_FONT_SIZE).toBeGreaterThanOrEqual(10)
    expect(MAP_HUD.TOUCH_QUEST_NAME_MIN_CSS_FONT_SIZE).toBeGreaterThanOrEqual(12)
    expect(MAP_HUD.TOUCH_QUEST_BODY_MIN_CSS_FONT_SIZE).toBeGreaterThanOrEqual(11)
    expect(MAP_HUD.TOUCH_QUEST_PROGRESS_MIN_CSS_FONT_SIZE).toBeGreaterThanOrEqual(10)
    expect(unprotectedBodyCssFontSize).toBeLessThan(MAP_HUD.TOUCH_QUEST_BODY_MIN_CSS_FONT_SIZE)
    expect(questCssWidth).toBeLessThanOrEqual(304)
    expect(questRight).toBeLessThanOrEqual(landscapePhoneViewport.width - 8)
    expect(MAP_HUD.QUEST_Y * displayScale).toBeGreaterThan(minimapBottom + 8)
  })

  test('touch controls cover common landscape phone widths', () => {
    expect(TOUCH_INPUT.MOBILE_VIEWPORT_MAX_WIDTH).toBeGreaterThanOrEqual(844)
    expect(TOUCH_INPUT.CONTROL_MIN_CSS_SIZE).toBeGreaterThanOrEqual(48)
    expect(TOUCH_INPUT.DPAD_LABEL_MIN_CSS_FONT_SIZE).toBeGreaterThanOrEqual(16)
    expect(TOUCH_INPUT.ACTION_LABEL_MIN_CSS_FONT_SIZE).toBeGreaterThanOrEqual(13)
    expect(TOUCH_INPUT.PROMPT_MIN_CSS_FONT_SIZE).toBeGreaterThanOrEqual(13)
  })

  test('touch controls keep edge padding on compact landscape phones', () => {
    const landscapePhoneViewport = { width: 812, height: 375 }
    const displayScale = Math.min(
      landscapePhoneViewport.width / GAME_WIDTH,
      landscapePhoneViewport.height / GAME_HEIGHT,
    )
    const minButtonGameSize = TOUCH_INPUT.CONTROL_MIN_CSS_SIZE / displayScale
    const dpadButtonSize = Math.max(TOUCH_INPUT.DPAD_BUTTON_SIZE, minButtonGameSize)
    const actionButtonSize = Math.max(TOUCH_INPUT.ACTION_BUTTON_SIZE, minButtonGameSize)
    const dpadBottom = TOUCH_INPUT.DPAD_CENTER_Y + TOUCH_INPUT.DPAD_BUTTON_OFFSET + dpadButtonSize / 2
    const actionBottom = TOUCH_INPUT.ACTION_BUTTON_Y + actionButtonSize / 2
    const minimumCssEdgePadding = 6

    expect((GAME_HEIGHT - dpadBottom) * displayScale).toBeGreaterThanOrEqual(minimumCssEdgePadding)
    expect((GAME_HEIGHT - actionBottom) * displayScale).toBeGreaterThanOrEqual(minimumCssEdgePadding)
  })
})
