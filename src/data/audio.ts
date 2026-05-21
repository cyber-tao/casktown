export interface BGMConfig {
  key: string
  path: string
  loop: boolean
  volume: number
}

export interface SFXConfig {
  key: string
  path: string
  volume: number
}

export const BGM_TRACKS: Record<string, BGMConfig> = {
  title: { key: 'bgm_title', path: 'audio/bgm/title.ogg', loop: true, volume: 0.7 },
  town_ruins: { key: 'bgm_town_ruins', path: 'audio/bgm/town_ruins.ogg', loop: true, volume: 0.6 },
  town_rebuilt: { key: 'bgm_town_rebuilt', path: 'audio/bgm/town_rebuilt.ogg', loop: true, volume: 0.6 },
  forest: { key: 'bgm_forest', path: 'audio/bgm/forest.ogg', loop: true, volume: 0.6 },
  forest_mystery: { key: 'bgm_forest_mystery', path: 'audio/bgm/forest.ogg', loop: true, volume: 0.5 },
  holy_water: { key: 'bgm_holy_water', path: 'audio/bgm/holy_water.ogg', loop: true, volume: 0.6 },
  holy_temple: { key: 'bgm_holy_temple', path: 'audio/bgm/holy_temple.ogg', loop: true, volume: 0.6 },
  mountain: { key: 'bgm_mountain', path: 'audio/bgm/mountain.ogg', loop: true, volume: 0.6 },
  mystery: { key: 'bgm_mystery', path: 'audio/bgm/mystery.ogg', loop: true, volume: 0.5 },
  dream: { key: 'bgm_dream', path: 'audio/bgm/mystery.ogg', loop: true, volume: 0.5 },
  temple: { key: 'bgm_temple', path: 'audio/bgm/temple.ogg', loop: true, volume: 0.6 },
  dock: { key: 'bgm_dock', path: 'audio/bgm/dock.ogg', loop: true, volume: 0.5 },
  battle_normal: { key: 'bgm_battle_normal', path: 'audio/bgm/battle_normal.ogg', loop: true, volume: 0.7 },
  battle_boss: { key: 'bgm_battle_boss', path: 'audio/bgm/battle_boss.ogg', loop: true, volume: 0.8 },
  life_spring: { key: 'bgm_life_spring', path: 'audio/bgm/life_spring.ogg', loop: true, volume: 0.5 },
  dark_palace: { key: 'bgm_dark_palace', path: 'audio/bgm/dark_palace.ogg', loop: true, volume: 0.6 },
  xiaoai_battle: { key: 'bgm_xiaoai_battle', path: 'audio/bgm/xiaoai_battle.ogg', loop: true, volume: 0.8 },
  wuxiang_battle: { key: 'bgm_wuxiang_battle', path: 'audio/bgm/wuxiang_battle.ogg', loop: true, volume: 0.8 },
  victory: { key: 'bgm_victory', path: 'audio/bgm/victory.ogg', loop: false, volume: 0.7 },
  game_over: { key: 'bgm_game_over', path: 'audio/bgm/game_over.ogg', loop: false, volume: 0.6 },
}

export const SFX_TRACKS: Record<string, SFXConfig> = {
  cursor: { key: 'sfx_cursor', path: 'audio/sfx/cursor.ogg', volume: 0.5 },
  confirm: { key: 'sfx_confirm', path: 'audio/sfx/confirm.ogg', volume: 0.6 },
  cancel: { key: 'sfx_cancel', path: 'audio/sfx/cancel.ogg', volume: 0.5 },
  battle_start: { key: 'sfx_battle_start', path: 'audio/sfx/battle_start.ogg', volume: 0.7 },
  attack_hit: { key: 'sfx_attack_hit', path: 'audio/sfx/attack_hit.ogg', volume: 0.6 },
  attack_slash: { key: 'sfx_attack_slash', path: 'audio/sfx/attack_slash.ogg', volume: 0.6 },
  magic_cast: { key: 'sfx_magic_cast', path: 'audio/sfx/magic_cast.ogg', volume: 0.6 },
  heal: { key: 'sfx_heal', path: 'audio/sfx/heal.ogg', volume: 0.6 },
  item_use: { key: 'sfx_item_use', path: 'audio/sfx/item_use.ogg', volume: 0.5 },
  level_up: { key: 'sfx_level_up', path: 'audio/sfx/level_up.ogg', volume: 0.7 },
  dialogue_advance: { key: 'sfx_dialogue', path: 'audio/sfx/dialogue.ogg', volume: 0.3 },
  step_grass: { key: 'sfx_step_grass', path: 'audio/sfx/step_grass.ogg', volume: 0.2 },
  step_stone: { key: 'sfx_step_stone', path: 'audio/sfx/step_stone.ogg', volume: 0.2 },
  encounter: { key: 'sfx_encounter', path: 'audio/sfx/encounter.ogg', volume: 0.7 },
  victory_fanfare: { key: 'sfx_victory', path: 'audio/sfx/victory.ogg', volume: 0.8 },
  open_menu: { key: 'sfx_open_menu', path: 'audio/sfx/open_menu.ogg', volume: 0.5 },
  close_menu: { key: 'sfx_close_menu', path: 'audio/sfx/close_menu.ogg', volume: 0.5 },
  equip: { key: 'sfx_equip', path: 'audio/sfx/equip.ogg', volume: 0.5 },
  get_item: { key: 'sfx_get_item', path: 'audio/sfx/get_item.ogg', volume: 0.6 },
  warp: { key: 'sfx_warp', path: 'audio/sfx/warp.ogg', volume: 0.6 },
}

export const MAP_BGM_MAP: Record<string, string> = {
  MAP_001: 'town_ruins',
  MAP_002: 'town_rebuilt',
  MAP_010: 'forest',
  MAP_011: 'forest',
  MAP_012: 'forest_mystery',
  MAP_020: 'dock',
  MAP_030: 'holy_water',
  MAP_031: 'holy_temple',
  MAP_040: 'mountain',
  MAP_041: 'mystery',
  MAP_042: 'temple',
  MAP_050: 'life_spring',
  MAP_060: 'dark_palace',
  MAP_062: 'dark_palace',
  MAP_070: 'wuxiang_battle',
}
