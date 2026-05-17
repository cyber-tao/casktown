import Phaser from 'phaser'

export const EventBus = new Phaser.Events.EventEmitter()

export const GameEvents = {
  SAVE_REQUEST: 'save-request',
  LOAD_REQUEST: 'load-request',
  DIALOGUE_START: 'dialogue-start',
  DIALOGUE_END: 'dialogue-end',
  BATTLE_START: 'battle-start',
  BATTLE_END: 'battle-end',
  MENU_OPEN: 'menu-open',
  MENU_CLOSE: 'menu-close',
  MAP_CHANGE: 'map-change',
  FLAG_SET: 'flag-set',
  QUEST_UPDATE: 'quest-update',
  ITEM_GET: 'item-get',
  LEVEL_UP: 'level-up',
  GAME_OVER: 'game-over',
  GAME_CLEARED: 'game-cleared',
  SAVE_LOADED: 'save-loaded',
  BARREL_UNLOCKED: 'barrel:unlocked',
} as const
