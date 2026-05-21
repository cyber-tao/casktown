import { describe, expect, test } from 'bun:test'
import { INITIAL_CHARACTERS } from '../../src/data/characters.ts'
import { DIALOGUES } from '../../src/data/dialogues.ts'
import { ENCOUNTERS } from '../../src/data/encounters.ts'
import { ENEMIES } from '../../src/data/enemies.ts'
import { ITEMS } from '../../src/data/items.ts'
import { MAPS } from '../../src/data/maps.ts'
import { QUESTS } from '../../src/data/quests.ts'
import { SKILLS } from '../../src/data/skills.ts'
import type { EventAction, MapData } from '../../src/data/types.ts'
import { GAME_HEIGHT, GAME_WIDTH, WORLD_MAP_LOCATION_POINTS } from '../../src/utils/constants.ts'

const BRANCH_KEYS = new Set([
  'trust_huihui',
  'trust_a',
  'trust_congcong',
  'trust_sun',
  'mercy_score',
  'rebuild_level',
  'prophecy_hint_mode',
  'xiaoai_memory_fragments',
  'white_tiger_respected',
  'answered_xiyuan_kindly',
  'released_four_seals',
  'xiaoai_purified',
  'normal_ending_seen',
  'true_route_unlocked',
])

function pushMissing(errors: string[], source: string, kind: string, id: string): void {
  errors.push(`${source} references missing ${kind}: ${id}`)
}

function validateAction(action: EventAction, source: string, errors: string[]): void {
  switch (action.type) {
    case 'dialogue':
      if (!DIALOGUES[action.dialogueId]) pushMissing(errors, source, 'dialogue', action.dialogueId)
      break
    case 'battle':
      if (!ENCOUNTERS[action.encounterId]) pushMissing(errors, source, 'encounter', action.encounterId)
      break
    case 'transfer': {
      const targetMap = MAPS[action.targetMap]
      if (!targetMap) {
        pushMissing(errors, source, 'map', action.targetMap)
        break
      }
      if (action.targetX < 0 || action.targetX >= targetMap.width || action.targetY < 0 || action.targetY >= targetMap.height) {
        errors.push(`${source} transfers outside ${action.targetMap}: ${action.targetX},${action.targetY}`)
      }
      break
    }
    case 'questStart':
    case 'questAdvance':
    case 'questComplete':
      if (!QUESTS[action.questId]) pushMissing(errors, source, 'quest', action.questId)
      break
    case 'setFlag':
      break
    case 'setBranch':
      if (!BRANCH_KEYS.has(action.branch)) pushMissing(errors, source, 'branch', action.branch)
      break
    case 'adjustTrust':
    case 'addParty':
      if (!INITIAL_CHARACTERS[action.characterId]) pushMissing(errors, source, 'character', action.characterId)
      break
    case 'adjustMercy':
      break
    case 'addItem':
      if (!ITEMS[action.itemId]) pushMissing(errors, source, 'item', action.itemId)
      break
    case 'rebuild':
    case 'shop':
    case 'training':
    case 'rebuildMenu':
      break
  }
}

function validateMapGeometry(map: MapData, errors: string[]): void {
  const tileCount = map.width * map.height
  if (map.width <= 0 || map.height <= 0) errors.push(`${map.id} has invalid dimensions`)
  for (const layer of map.layers) {
    if (layer.data.length !== tileCount) errors.push(`${map.id}/${layer.name} has ${layer.data.length} tiles, expected ${tileCount}`)
  }
  for (const collision of map.collisions) {
    if (collision < 0 || collision >= tileCount) errors.push(`${map.id} collision index out of range: ${collision}`)
  }
  for (const event of map.events) {
    if (event.x < 0 || event.y < 0 || event.width <= 0 || event.height <= 0 || event.x + event.width > map.width || event.y + event.height > map.height) {
      errors.push(`${map.id}/${event.id} event bounds outside map`)
    }
  }
}

describe('game content data', () => {
  test('maps have valid geometry and connected actions', () => {
    const errors: string[] = []

    for (const [mapId, map] of Object.entries(MAPS)) {
      validateMapGeometry(map, errors)

      for (const encounterId of map.encounters ?? []) {
        if (!ENCOUNTERS[encounterId]) pushMissing(errors, mapId, 'encounter', encounterId)
      }
      for (const event of map.events) {
        const source = `${mapId}/${event.id}`
        for (const action of event.actions) validateAction(action, source, errors)
      }
      for (const connection of map.connections) {
        if (!MAPS[connection.targetMap]) pushMissing(errors, `${mapId}/connection`, 'map', connection.targetMap)
      }
    }

    expect(errors).toEqual([])
  })

  test('dialogue choices and completion actions resolve', () => {
    const errors: string[] = []

    for (const [dialogueId, dialogue] of Object.entries(DIALOGUES)) {
      for (const [lineIndex, line] of dialogue.lines.entries()) {
        for (const choice of line.choices ?? []) {
          if (choice.next && !DIALOGUES[choice.next]) pushMissing(errors, `${dialogueId}/${lineIndex}`, 'dialogue', choice.next)
          for (const action of choice.actions ?? []) validateAction(action, `${dialogueId}/${lineIndex}`, errors)
        }
      }
    }

    expect(errors).toEqual([])
  })

  test('encounters, enemies, quests, and characters resolve gameplay ids', () => {
    const errors: string[] = []

    for (const [encounterId, encounter] of Object.entries(ENCOUNTERS)) {
      for (const enemyId of encounter.enemies) {
        if (!ENEMIES[enemyId]) pushMissing(errors, encounterId, 'enemy', enemyId)
      }
      if (encounter.questId && !QUESTS[encounter.questId]) pushMissing(errors, encounterId, 'quest', encounter.questId)
      for (const reward of encounter.rewards ?? []) {
        if (reward.itemId && !ITEMS[reward.itemId]) pushMissing(errors, encounterId, 'item', reward.itemId)
        if (reward.branch && !BRANCH_KEYS.has(reward.branch)) pushMissing(errors, encounterId, 'branch', reward.branch)
      }
    }

    for (const [enemyId, enemy] of Object.entries(ENEMIES)) {
      for (const skillId of enemy.skills) {
        if (!SKILLS[skillId]) pushMissing(errors, enemyId, 'skill', skillId)
      }
      for (const drop of enemy.drops) {
        if (!ITEMS[drop.itemId]) pushMissing(errors, enemyId, 'item', drop.itemId)
      }
    }

    for (const [characterId, character] of Object.entries(INITIAL_CHARACTERS)) {
      for (const skillId of character.skills) {
        if (!SKILLS[skillId]) pushMissing(errors, characterId, 'skill', skillId)
      }
      for (const itemId of Object.values(character.equipment)) {
        if (itemId && !ITEMS[itemId]) pushMissing(errors, characterId, 'item', itemId)
      }
    }

    for (const [questId, quest] of Object.entries(QUESTS)) {
      for (const reward of quest.rewards ?? []) {
        if (reward.itemId && !ITEMS[reward.itemId]) pushMissing(errors, questId, 'item', reward.itemId)
      }
    }

    expect(errors).toEqual([])
  })

  test('world map points match implemented maps and valid screen bounds', () => {
    const errors: string[] = []
    const worldMapIds = new Set(Object.keys(WORLD_MAP_LOCATION_POINTS))

    for (const [mapId, point] of Object.entries(WORLD_MAP_LOCATION_POINTS)) {
      if (!MAPS[mapId]) {
        pushMissing(errors, 'world-map', 'map', mapId)
        continue
      }
      if (point.x < 0 || point.x > GAME_WIDTH || point.y < 0 || point.y > GAME_HEIGHT) {
        errors.push(`world-map/${mapId} point outside screen: ${point.x},${point.y}`)
      }
    }

    for (const mapId of Object.keys(MAPS)) {
      if (!worldMapIds.has(mapId)) pushMissing(errors, 'world-map', 'point', mapId)
    }

    for (const [mapId, map] of Object.entries(MAPS)) {
      for (const connection of map.connections) {
        if (!worldMapIds.has(connection.targetMap)) pushMissing(errors, `${mapId}/world-map-connection`, 'point', connection.targetMap)
      }
    }

    expect(errors).toEqual([])
  })
})
