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
  WORLD_MAP_LOCATION_POINTS,
  DIRECTION,
  DIRECTION_VECTORS,
  TOUCH_INPUT,
  UI_FONT_FAMILY,
  BATTLE_LAYOUT,
  BATTLE_RESULT_PANEL,
  STARTUP_LOADING,
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

  test('MAP_HUD prompt constants are defined', () => {
    const { MAP_HUD } = require('../../src/utils/constants.ts')
    expect(MAP_HUD.PROMPT_COLOR).toBeTruthy()
    expect(MAP_HUD.PROMPT_FONT_SIZE).toBeGreaterThan(0)
    expect(MAP_HUD.PROMPT_DEPTH).toBeGreaterThan(0)
    expect(MAP_HUD.TOUCH_PROMPT_TEXT).toContain(MAP_HUD.TOUCH_OPEN_HINT)
    expect(MAP_HUD.TOUCH_PROMPT_TEXT).toContain(MAP_HUD.TOUCH_PROMPT_MENU_TEXT)
    expect(MAP_HUD.TOUCH_PROMPT_ACTION_PREFIX).toBeTruthy()
    expect(MAP_HUD.TOUCH_PROMPT_FONT_SIZE).toBeGreaterThan(MAP_HUD.PROMPT_FONT_SIZE)
    expect(MAP_HUD.TOUCH_PROMPT_PADDING_X).toBeGreaterThan(MAP_HUD.PROMPT_PADDING_X)
  })

  test('touch controls cover common landscape phone widths', () => {
    expect(TOUCH_INPUT.MOBILE_VIEWPORT_MAX_WIDTH).toBeGreaterThanOrEqual(844)
    expect(TOUCH_INPUT.CONTROL_MIN_CSS_SIZE).toBeGreaterThanOrEqual(48)
    expect(TOUCH_INPUT.DPAD_LABEL_MIN_CSS_FONT_SIZE).toBeGreaterThanOrEqual(16)
    expect(TOUCH_INPUT.ACTION_LABEL_MIN_CSS_FONT_SIZE).toBeGreaterThanOrEqual(13)
    expect(TOUCH_INPUT.PROMPT_MIN_CSS_FONT_SIZE).toBeGreaterThanOrEqual(13)
  })
})
