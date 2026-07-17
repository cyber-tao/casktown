import { describe, expect, test } from 'bun:test'
import { INITIAL_CHARACTERS } from '../../src/data/characters.ts'
import { COMBO_DEFINITIONS } from '../../src/data/combos.ts'
import { DIALOGUES } from '../../src/data/dialogues.ts'
import { ENCOUNTERS } from '../../src/data/encounters.ts'
import { ENEMIES } from '../../src/data/enemies.ts'
import { ITEMS } from '../../src/data/items.ts'
import { MAPS } from '../../src/data/maps.ts'
import { QUESTS } from '../../src/data/quests.ts'
import { SKILLS } from '../../src/data/skills.ts'
import type { EventAction, MapData, MapEvent } from '../../src/data/types.ts'
import { TILE_SPRITES, resolveTileSpriteKey } from '../../src/data/tileSprites.ts'
import { areEventConditionsMet } from '../../src/core/EventConditions.ts'
import { getBlockedMapDialogueId } from '../../src/core/MapAccess.ts'
import { getFieldEventDoneFlag } from '../../src/core/MapEventState.ts'
import { A_RESCUED_FLAG, BLUE_MINT_SIDE_QUEST, GAME_HEIGHT, GAME_WIDTH, MAP_ACCESS_REQUIREMENTS, PARTNER_CALL_AVAILABLE_FLAG, REBUILD_VISUAL_MAP_THRESHOLD, REBUILT_TOWN_MAP_ID, REINCARNATION_CORRECT_ANSWER_FLAGS, RUINED_TOWN_MAP_ID, START_MAP_ID, START_PLAYER_POSITION, STORY_PROGRESS_FLAGS, STORY_SKILL_UNLOCK_FLAGS, WORLD_MAP_LOCATION_POINTS } from '../../src/utils/constants.ts'

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
  'true_route_reincarnation',
])

const TOWN_BUILDING_SPRITE_KEYS = new Set([
  'obj_T_house',
  'obj_boluo_farmhouse',
  'obj_mayor_house',
  'obj_cottage',
  'obj_shop',
  'obj_central_tower',
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
    case 'questComplete':
      if (!QUESTS[action.questId]) pushMissing(errors, source, 'quest', action.questId)
      break
    case 'questAdvance':
      if (!QUESTS[action.questId]) pushMissing(errors, source, 'quest', action.questId)
      if (action.amount !== undefined && (!Number.isFinite(action.amount) || action.amount <= 0)) {
        errors.push(`${source} advances ${action.questId} by invalid amount: ${action.amount}`)
      }
      break
    case 'setFlag':
      break
    case 'setBranch':
      if (!BRANCH_KEYS.has(action.branch)) pushMissing(errors, source, 'branch', action.branch)
      break
    case 'startTimer':
      if (!action.timerId) errors.push(`${source} starts a timer without an id`)
      break
    case 'resolveTimer':
      if (!action.timerId || action.requiredFlags.length === 0 || action.requiredFlags.some(flag => !flag) || !action.successFlag || !Number.isFinite(action.maxDurationMs) || action.maxDurationMs <= 0) {
        errors.push(`${source} resolves an invalid timer`)
      }
      break
    case 'adjustTrust':
    case 'addParty':
    case 'removeParty':
      if (!INITIAL_CHARACTERS[action.characterId]) pushMissing(errors, source, 'character', action.characterId)
      break
    case 'adjustMercy':
      break
    case 'addItem':
      if (!ITEMS[action.itemId]) pushMissing(errors, source, 'item', action.itemId)
      if (action.quantity !== undefined && (!Number.isFinite(action.quantity) || action.quantity <= 0)) {
        errors.push(`${source} adds ${action.itemId} with invalid quantity: ${action.quantity}`)
      }
      break
    case 'removeItem':
      if (!ITEMS[action.itemId]) pushMissing(errors, source, 'item', action.itemId)
      if (action.quantity !== undefined && (!Number.isFinite(action.quantity) || action.quantity <= 0)) {
        errors.push(`${source} removes ${action.itemId} with invalid quantity: ${action.quantity}`)
      }
      break
    case 'rebuild':
      if (!Number.isFinite(action.level) || action.level < 0) {
        errors.push(`${source} sets invalid rebuild level: ${action.level}`)
      }
      break
    case 'shop':
    case 'training':
    case 'rebuildMenu':
      break
  }
}

function collectProducedFlags(): Set<string> {
  const produced = new Set<string>()
  const collectAction = (action: EventAction): void => {
    if (action.type === 'setFlag') produced.add(action.flag)
  }

  for (const map of Object.values(MAPS)) {
    for (const event of map.events) {
      for (const action of event.actions) collectAction(action)
    }
  }

  for (const dialogue of Object.values(DIALOGUES)) {
    for (const action of dialogue.onComplete ?? []) collectAction(action)
    for (const line of dialogue.lines) {
      for (const choice of line.choices ?? []) {
        for (const action of choice.actions ?? []) collectAction(action)
      }
    }
  }

  for (const encounter of Object.values(ENCOUNTERS)) {
    if (encounter.victoryFlag) produced.add(encounter.victoryFlag)
    for (const reward of encounter.rewards ?? []) {
      if (reward.flag) produced.add(reward.flag)
    }
  }

  return produced
}

function findEvent(mapId: string, eventId: string): MapEvent {
  const event = MAPS[mapId]?.events.find(item => item.id === eventId)
  if (!event) throw new Error(`${mapId}/${eventId} not found`)
  return event
}

function expectCondition(event: MapEvent, flag: string, value: unknown): void {
  expect(event.conditions).toContainEqual({ flag, value })
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

function countTownBuildings(map: MapData): number {
  const objectLayer = map.layers[1]
  if (!objectLayer) return 0
  return objectLayer.data
    .map(tileId => resolveTileSpriteKey(TILE_SPRITES, map.tileset, tileId))
    .filter(spriteKey => spriteKey && TOWN_BUILDING_SPRITE_KEYS.has(spriteKey))
    .length
}

type TilePoint = [x: number, y: number]

function getTileIndex(map: MapData, x: number, y: number): number {
  return y * map.width + x
}

function isInMapBounds(map: MapData, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < map.width && y < map.height
}

function isWalkableTile(map: MapData, collisionIndexes: Set<number>, x: number, y: number): boolean {
  return isInMapBounds(map, x, y) && !collisionIndexes.has(getTileIndex(map, x, y))
}

function getEventTiles(event: MapEvent): TilePoint[] {
  const points: TilePoint[] = []
  for (let y = event.y; y < event.y + event.height; y++) {
    for (let x = event.x; x < event.x + event.width; x++) {
      points.push([x, y])
    }
  }
  return points
}

function getAdjacentTiles(event: MapEvent): TilePoint[] {
  const points = new Map<string, TilePoint>()
  const directions: TilePoint[] = [[1, 0], [-1, 0], [0, 1], [0, -1]]
  for (const [x, y] of getEventTiles(event)) {
    for (const [dx, dy] of directions) {
      points.set(`${x + dx},${y + dy}`, [x + dx, y + dy])
    }
  }
  return [...points.values()]
}

function collectReachableTiles(map: MapData, starts: TilePoint[]): Set<string> {
  const collisionIndexes = new Set(map.collisions)
  const reached = new Set<string>()
  const queue: TilePoint[] = []

  for (const [x, y] of starts) {
    if (!isWalkableTile(map, collisionIndexes, x, y)) continue
    const key = `${x},${y}`
    reached.add(key)
    queue.push([x, y])
  }

  const directions: TilePoint[] = [[1, 0], [-1, 0], [0, 1], [0, -1]]
  for (let index = 0; index < queue.length; index++) {
    const [x, y] = queue[index]!
    for (const [dx, dy] of directions) {
      const nextX = x + dx
      const nextY = y + dy
      const key = `${nextX},${nextY}`
      if (reached.has(key) || !isWalkableTile(map, collisionIndexes, nextX, nextY)) continue
      reached.add(key)
      queue.push([nextX, nextY])
    }
  }

  return reached
}

function collectMapEntryPoints(): Map<string, TilePoint[]> {
  const startsByMap = new Map<string, TilePoint[]>()
  const addStart = (mapId: string, x: number, y: number): void => {
    const starts = startsByMap.get(mapId) ?? []
    starts.push([x, y])
    startsByMap.set(mapId, starts)
  }

  addStart(START_MAP_ID, START_PLAYER_POSITION.x, START_PLAYER_POSITION.y)

  for (const map of Object.values(MAPS)) {
    for (const event of map.events) {
      for (const action of event.actions) {
        if (action.type === 'transfer') addStart(action.targetMap, action.targetX, action.targetY)
      }
    }
    for (const connection of map.connections) {
      addStart(connection.targetMap, connection.targetX, connection.targetY)
    }
  }

  for (const [x, y] of startsByMap.get(RUINED_TOWN_MAP_ID) ?? []) {
    addStart(REBUILT_TOWN_MAP_ID, x, y)
  }

  return startsByMap
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

  test('field events are reachable from map entry points', () => {
    const errors: string[] = []
    const startsByMap = collectMapEntryPoints()

    for (const [mapId, map] of Object.entries(MAPS)) {
      const reachableTiles = collectReachableTiles(map, startsByMap.get(mapId) ?? [])
      for (const event of map.events) {
        const triggerTiles = event.trigger === 'touch' || event.trigger === 'autorun'
          ? getEventTiles(event)
          : [...getEventTiles(event), ...getAdjacentTiles(event)]
        const reachable = triggerTiles.some(([x, y]) => reachableTiles.has(`${x},${y}`))
        if (!reachable) errors.push(`${mapId}/${event.id} cannot be reached from any map entry point`)
      }
    }

    expect(errors).toEqual([])
  })

  test('town maps contain dense settlement landmarks', () => {
    expect(countTownBuildings(MAPS['MAP_001']!)).toBeGreaterThanOrEqual(8)
    expect(countTownBuildings(MAPS['MAP_002']!)).toBeGreaterThanOrEqual(9)
  })

  test('story maps use matching visual tilesets', () => {
    const expectedTilesets: Record<string, string> = {
      MAP_030: 'holy',
      MAP_031: 'holy',
      MAP_041: 'holy',
      MAP_042: 'holy',
      MAP_054: 'holy',
      MAP_060: 'dark',
      MAP_061: 'dark',
      MAP_062: 'dark',
      MAP_063: 'dark',
      MAP_070: 'dark',
    }

    const mismatches = Object.entries(expectedTilesets)
      .filter(([mapId, tileset]) => MAPS[mapId]?.tileset !== tileset)
      .map(([mapId, tileset]) => `${mapId}: expected ${tileset}, got ${MAPS[mapId]?.tileset ?? 'missing'}`)

    expect(mismatches).toEqual([])
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
      for (const action of dialogue.onComplete ?? []) validateAction(action, `${dialogueId}/onComplete`, errors)
    }

    expect(errors).toEqual([])
  })

  test('branch dialogues preserve completion-bearing story actions', () => {
    const errors: string[] = []

    for (const [dialogueId, dialogue] of Object.entries(DIALOGUES)) {
      if (!dialogue.onComplete?.length) continue
      for (const [lineIndex, line] of dialogue.lines.entries()) {
        for (const choice of line.choices ?? []) {
          if (!choice.next) continue
          const target = DIALOGUES[choice.next]
          if (!target?.onComplete?.length) {
            errors.push(`${dialogueId}/${lineIndex} branches to ${choice.next} without completion actions`)
          }
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

  test('combo definitions resolve skills, participants, and unlock owners', () => {
    expect(new Set(COMBO_DEFINITIONS.map(definition => definition.skillId)).size).toBe(COMBO_DEFINITIONS.length)
    for (const definition of COMBO_DEFINITIONS) {
      expect(SKILLS[definition.skillId]).toBeDefined()
      expect(INITIAL_CHARACTERS[definition.char1]).toBeDefined()
      expect(INITIAL_CHARACTERS[definition.char2]).toBeDefined()
      expect(INITIAL_CHARACTERS[definition.unlockCharacterId]).toBeDefined()
    }
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

  test('map access requirements have reachable story flags', () => {
    const producedFlags = collectProducedFlags()
    const errors: string[] = []

    for (const [mapId, requirement] of Object.entries(MAP_ACCESS_REQUIREMENTS)) {
      if (!MAPS[mapId]) pushMissing(errors, 'map-access', 'map', mapId)
      if (!DIALOGUES[requirement.blockedDialogueId]) pushMissing(errors, `map-access/${mapId}`, 'dialogue', requirement.blockedDialogueId)
      if (!producedFlags.has(requirement.flag)) errors.push(`map-access/${mapId} requires unreachable flag: ${requirement.flag}`)
    }

    expect(errors).toEqual([])
  })

  test('main story access chain unlocks maps in order', () => {
    const flags: Record<string, unknown> = {}
    const readFlag = (flag: string): unknown => flags[flag]
    const steps = [
      { flag: 'met_mayor', value: true, maps: ['MAP_010'] },
      { flag: 'a_joined', value: true, maps: ['MAP_011'] },
      { flag: 'defeated_baihu', value: true, maps: ['MAP_012'] },
      { flag: 'has_millennium_seed', value: true, maps: ['MAP_020', 'MAP_030'] },
      { flag: 'shuiyao_fengchi_defeated', value: true, maps: ['MAP_031'] },
      { flag: 'has_sacred_water', value: true, maps: ['MAP_040'] },
      { flag: 'congcong_joined', value: true, maps: ['MAP_041'] },
      { flag: 'phoenix_qilin_defeated', value: true, maps: ['MAP_042'] },
      { flag: 'rebuild_level', value: 3, maps: ['MAP_050', 'MAP_051', 'MAP_052', 'MAP_053', 'MAP_054'] },
      { flag: 'released_four_seals', value: true, maps: [] },
      { flag: 'spring_gate_opened', value: true, maps: ['MAP_055'] },
      { flag: 'dream_completed', value: true, maps: ['MAP_061'] },
      { flag: 'swamp_chains_resolved', value: true, maps: ['MAP_060'] },
      { flag: 'a_captured', value: true, maps: ['MAP_062'] },
      { flag: 'fake_xiaoai_defeated', value: true, maps: ['MAP_063'] },
      { flag: 'true_route_unlocked', value: true, maps: ['MAP_070'] },
    ]

    for (const step of steps) {
      for (const mapId of step.maps) {
        expect(getBlockedMapDialogueId(mapId, readFlag)).not.toBeNull()
      }
      flags[step.flag] = step.value
      for (const mapId of step.maps) {
        expect(getBlockedMapDialogueId(mapId, readFlag)).toBeNull()
      }
    }
  })

  test('xiaoai purification branches into normal and true ending outcomes', () => {
    const trueEvent = findEvent('MAP_063', 'EVT_PURIFICATION_TRUE')
    const normalEvent = findEvent('MAP_063', 'EVT_PURIFICATION_NORMAL')
    const normalDialogue = DIALOGUES['DIA_632_PURIFICATION_NORMAL']

    expectCondition(trueEvent, 'xiaoai_purified', true)
    expectCondition(trueEvent, 'true_route_unlocked', true)
    expectCondition(trueEvent, 'purification_scene_shown', false)
    expect(trueEvent.actions).toContainEqual({ type: 'dialogue', dialogueId: 'DIA_632_PURIFICATION' })

    expectCondition(normalEvent, 'xiaoai_purified', true)
    expectCondition(normalEvent, 'true_route_unlocked', false)
    expectCondition(normalEvent, 'purification_scene_shown', false)
    expect(normalEvent.actions).toContainEqual({ type: 'dialogue', dialogueId: 'DIA_632_PURIFICATION_NORMAL' })

    expect(normalDialogue?.onComplete).toContainEqual({ type: 'setFlag', flag: 'normal_ending_seen', value: true })
    expect(normalDialogue?.onComplete).toContainEqual({ type: 'questComplete', questId: 'QST_012' })
    expect(normalDialogue?.onComplete).toContainEqual({ type: 'transfer', targetMap: REBUILT_TOWN_MAP_ID, targetX: 16, targetY: 12 })
  })

  test('wrong Xiyuan mercy answer uses the clamped mercy adjustment action', () => {
    expect(DIALOGUES.DIA_203_Q4_A?.onComplete).toEqual([{ type: 'adjustMercy', amount: -1 }])
  })

  test('story-critical rewards and scene gates cannot be bypassed or farmed', () => {
    const festival = findEvent('MAP_001', 'EVT_FESTIVAL')
    const sun = findEvent('MAP_042', 'NPC_SUN')
    const sunAfter = findEvent('MAP_042', 'NPC_SUN_AFTER')
    const springGate = findEvent('MAP_050', 'EVT_SPRING_GATE')
    const springExit = findEvent('MAP_050', 'EXIT_NORTH_55')
    const capture = DIALOGUES['DIA_501_CAPTURED']
    const rescue = DIALOGUES['DIA_520_RESCUE_A']
    const sideA = findEvent('MAP_002', 'SIDE_A_START')
    const choice = DIALOGUES['DIA_530_CHOICE']?.lines.flatMap(line => line.choices ?? [])
      .find(option => option.next === 'DIA_530_CALL')

    expect(festival.actions[0]).toEqual({ type: 'dialogue', dialogueId: 'DIA_003_DREAM' })
    expect(DIALOGUES['DIA_003_DREAM']?.onComplete).toContainEqual({ type: 'addItem', itemId: 'ring', quantity: 1 })

    expectCondition(sun, 'temple_visited', false)
    expectCondition(sunAfter, 'temple_visited', true)
    expect(sunAfter.actions).toEqual([{ type: 'dialogue', dialogueId: 'DIA_304_TEMPLE_AFTER' }])

    expectCondition(springGate, 'released_four_seals', true)
    expectCondition(springGate, 'spring_gate_opened', false)
    expectCondition(springExit, 'spring_gate_opened', true)
    expect(DIALOGUES['DIA_420_GOD']?.onComplete).toContainEqual({ type: 'setFlag', flag: 'spring_gate_opened', value: true })

    expect(capture?.onComplete).toContainEqual({ type: 'setFlag', flag: 'a_captured', value: true })
    expect(rescue?.onComplete).toContainEqual({ type: 'setFlag', flag: A_RESCUED_FLAG, value: true })
    expectCondition(sideA, A_RESCUED_FLAG, true)
    expect(ENEMIES.xiaoai_true?.drops).not.toContainEqual({ itemId: 'xiaoai_light', rate: 1 })
    expect(DIALOGUES['DIA_530_PURIFY_SUCCESS']?.onComplete).toContainEqual({ type: 'addItem', itemId: 'xiaoai_light', quantity: 1 })
    expect(choice?.condition).toEqual({ flag: PARTNER_CALL_AVAILABLE_FLAG, value: true })

    expect(MAPS.MAP_030?.events.some(event => event.id === 'EVT_SHUIYAO_FENGCHI_BOSS')).toBe(false)
    expect(MAPS.MAP_041?.events.some(event => event.id === 'EVT_PHOENIX_QILIN_BOSS')).toBe(false)
    expect(MAPS.MAP_062?.events.some(event => event.id === 'EVT_FAKE_XIAOAI_BOSS')).toBe(false)
    expect(findEvent('MAP_030', 'EVT_SHUIYAO_GATE').actions).toContainEqual({ type: 'dialogue', dialogueId: 'DIA_202_SHUIYAO_AFTER' })
  })

  test('town services follow rebuild facility milestones', () => {
    expect(REBUILD_VISUAL_MAP_THRESHOLD).toBe(3)
    expectCondition(findEvent('MAP_001', 'NPC_PINEAPPLE_SHOP'), 'facility_herb_shop', true)
    expectCondition(findEvent('MAP_001', 'SHOP_ITEM_EARLY'), 'facility_item_shop', true)
    expectCondition(findEvent('MAP_002', 'SHOP_ITEM'), 'facility_item_shop', true)
    expectCondition(findEvent('MAP_002', 'TRAIN_GROUND'), 'facility_training', true)

    const questBoardEvents = [
      BLUE_MINT_SIDE_QUEST.EVENTS.REQUEST,
      BLUE_MINT_SIDE_QUEST.EVENTS.WAIT,
      BLUE_MINT_SIDE_QUEST.EVENTS.TURN_IN,
      BLUE_MINT_SIDE_QUEST.EVENTS.DONE,
      'SIDE_HUIHUI_START',
      'SIDE_A_START',
      'SIDE_CONGCONG_START',
      'SIDE_SUN_START',
    ]
    for (const eventId of questBoardEvents) {
      expectCondition(findEvent('MAP_002', eventId), 'facility_quest_board', true)
    }
  })

  test('terminal attack continues into the complete normal ending sequence', () => {
    const killDialogue = DIALOGUES['DIA_530_KILL']
    const normalEnding = DIALOGUES['DIA_601_NORMAL']

    expect(killDialogue?.onComplete).toEqual([{ type: 'dialogue', dialogueId: 'DIA_601_NORMAL' }])
    expect(normalEnding?.onComplete).toContainEqual({ type: 'setFlag', flag: 'normal_ending_seen', value: true })
    expect(normalEnding?.onComplete).toContainEqual({ type: 'questComplete', questId: 'QST_012' })
    expect(normalEnding?.onComplete).toContainEqual({ type: 'transfer', targetMap: REBUILT_TOWN_MAP_ID, targetX: 16, targetY: 12 })
  })

  test('purification autoruns cover the final interaction area after map redesign', () => {
    const finalEvent = findEvent('MAP_063', 'EVT_XIAOAI_FINAL')
    const trueEvent = findEvent('MAP_063', 'EVT_PURIFICATION_TRUE')
    const normalEvent = findEvent('MAP_063', 'EVT_PURIFICATION_NORMAL')

    expect({ x: trueEvent.x, y: trueEvent.y, width: trueEvent.width, height: trueEvent.height }).toEqual({
      x: normalEvent.x,
      y: normalEvent.y,
      width: normalEvent.width,
      height: normalEvent.height,
    })
    expect(trueEvent.x).toBeLessThanOrEqual(finalEvent.x - 1)
    expect(trueEvent.y).toBeLessThanOrEqual(finalEvent.y - 1)
    expect(trueEvent.x + trueEvent.width).toBeGreaterThanOrEqual(finalEvent.x + finalEvent.width + 1)
    expect(trueEvent.y + trueEvent.height).toBeGreaterThanOrEqual(finalEvent.y + finalEvent.height + 1)
  })

  test('reincarnation memories require the previous step and contain one choice each', () => {
    const dreamStart = findEvent('MAP_055', 'EVT_DREAM_START')
    const memory1 = findEvent('MAP_055', 'EVT_MEMORY_1')
    const memory2 = findEvent('MAP_055', 'EVT_MEMORY_2')
    const memory3 = findEvent('MAP_055', 'EVT_MEMORY_3')
    const memoryFinal = findEvent('MAP_055', 'EVT_MEMORY_FINAL')

    expectCondition(memory2, getFieldEventDoneFlag(memory1.id), true)
    expectCondition(memory3, getFieldEventDoneFlag(memory2.id), true)
    expectCondition(memoryFinal, getFieldEventDoneFlag(memory3.id), true)
    expect(dreamStart.actions).toContainEqual({ type: 'startTimer', timerId: 'reincarnation' })
    const resolveTimer = memory3.actions.find((action): action is Extract<EventAction, { type: 'resolveTimer' }> => action.type === 'resolveTimer')
    expect(resolveTimer).toMatchObject({ timerId: 'reincarnation', successFlag: 'true_route_reincarnation' })
    expect(resolveTimer?.requiredFlags).toEqual(REINCARNATION_CORRECT_ANSWER_FLAGS)

    for (const [index, dialogueId] of ['DIA_552_MEMORY_1', 'DIA_553_MEMORY_2', 'DIA_554_MEMORY_3'].entries()) {
      const choices = DIALOGUES[dialogueId]!.lines.flatMap(line => line.choices ?? [])
      expect(choices.length).toBeGreaterThan(0)
      expect(choices.every(choice => choice.next === undefined)).toBe(true)
      expect(choices[0]?.actions).toContainEqual({ type: 'setFlag', flag: REINCARNATION_CORRECT_ANSWER_FLAGS[index], value: true })
      for (const choice of choices.slice(1)) {
        expect(choice.actions).toContainEqual({ type: 'setFlag', flag: REINCARNATION_CORRECT_ANSWER_FLAGS[index], value: false })
      }
    }

    const dreamChest = findEvent('MAP_055', 'CHEST_DREAM_1')
    expect(dreamChest.actions).toEqual([{ type: 'addItem', itemId: 'revive_feather', quantity: 1 }])
    expect(dreamChest.actions).not.toContainEqual({ type: 'setFlag', flag: 'xiaoai_memory_fragments', value: 1 })
  })

  test('authored dialogue skill rewards set only their intended unlock flags', () => {
    expect(DIALOGUES['DIA_SIDE_HH_01_SILENT']?.onComplete).toContainEqual({
      type: 'setFlag', flag: STORY_SKILL_UNLOCK_FLAGS.YUEXIAHUIXUAN, value: true,
    })
    expect(DIALOGUES['DIA_SIDE_HH_01_COMFORT']?.onComplete).not.toContainEqual({
      type: 'setFlag', flag: STORY_SKILL_UNLOCK_FLAGS.YUEXIAHUIXUAN, value: true,
    })
    expect(DIALOGUES['DIA_SIDE_HH_01_JOKE']?.onComplete).not.toContainEqual({
      type: 'setFlag', flag: STORY_SKILL_UNLOCK_FLAGS.YUEXIAHUIXUAN, value: true,
    })
    expect(ENCOUNTERS.BTL_SIDE_SUN_01?.rewards).toContainEqual({ flag: STORY_SKILL_UNLOCK_FLAGS.RENDEQIYUAN, value: true })
  })

  test('the five authored memory sources can reach the fragment threshold', () => {
    const staffMemory = findEvent('MAP_040', 'EVT_XIAOAI_MEMORY_STAFF')
    const fragmentActions = [
      DIALOGUES['DIA_SIDE_XAI_01']?.onComplete,
      DIALOGUES['DIA_203_Q5']?.lines.flatMap(line => line.choices ?? []).find(choice => choice.next === 'DIA_203_XIYUAN_KIND')?.actions,
      DIALOGUES['DIA_420_REINCARNATION']?.lines.flatMap(line => line.choices ?? [])[0]?.actions,
      DIALOGUES['DIA_420_R2']?.lines.flatMap(line => line.choices ?? [])[0]?.actions,
      DIALOGUES['DIA_530_PURIFY']?.onComplete,
    ]

    expect(staffMemory.actions).toContainEqual({ type: 'dialogue', dialogueId: 'DIA_SIDE_XAI_01' })
    for (const actions of fragmentActions) {
      expect(actions).toContainEqual({ type: 'setFlag', flag: 'xiaoai_memory_fragments', value: 1 })
    }
  })

  test('dark swamp chains enforce order and resolve only after their battles', () => {
    const chain1 = findEvent('MAP_061', 'EVT_CHAIN_1')
    const chain2 = findEvent('MAP_061', 'EVT_CHAIN_2')
    const chain3 = findEvent('MAP_061', 'EVT_CHAIN_3')

    expect(chain1.actions).toContainEqual({ type: 'battle', encounterId: 'BTL_510' })
    expectCondition(chain2, getFieldEventDoneFlag(chain1.id), true)
    expect(chain2.actions).toContainEqual({ type: 'battle', encounterId: 'BTL_511' })
    expectCondition(chain3, getFieldEventDoneFlag(chain2.id), true)
    expect(chain3.actions).toContainEqual({ type: 'battle', encounterId: 'BTL_512' })
    expect(chain3.actions.at(-1)).toEqual({ type: 'setFlag', flag: 'swamp_chains_resolved', value: true })
  })

  test('all five heart shadows gate Wuxiang and advance the abyss quest', () => {
    const shadowFlow = [
      ['EVT_HEART_SHADOW_T', 'BTL_701', 'heart_shadow_t_defeated'],
      ['EVT_HEART_SHADOW_HUIHUI', 'BTL_702', 'heart_shadow_huihui_defeated'],
      ['EVT_HEART_SHADOW_A', 'BTL_703', 'heart_shadow_a_defeated'],
      ['EVT_HEART_SHADOW_CONGCONG', 'BTL_704', 'heart_shadow_congcong_defeated'],
      ['EVT_HEART_SHADOW_SUN', 'BTL_705', 'heart_shadow_sun_defeated'],
    ] as const
    const entry = findEvent('MAP_070', 'EVT_ABYSS_ENTRY')
    const wuxiang = findEvent('MAP_070', 'EVT_WUXIANG')

    expect(entry.actions).toContainEqual({ type: 'questStart', questId: 'QST_013' })
    expect(entry.actions).toContainEqual({ type: 'questAdvance', questId: 'QST_013' })

    for (const [eventId, encounterId, victoryFlag] of shadowFlow) {
      const event = findEvent('MAP_070', eventId)
      expect(event.actions.some(action => action.type === 'dialogue')).toBe(true)
      expect(ENCOUNTERS[encounterId]?.victoryFlag).toBe(victoryFlag)
      expectCondition(wuxiang, victoryFlag, true)
    }
    expect(ENCOUNTERS['BTL_705']?.questId).toBe('QST_013')
    expect(ENCOUNTERS['BTL_705']?.questProgress).toBe('advance')
    expect(ENCOUNTERS['BTL_720']?.questProgress).toBe('complete')
  })

  test('critical story npcs switch to follow-up dialogue after completion flags', () => {
    const mayorBefore = findEvent('MAP_001', 'NPC_MAYOR')
    const mayorStory = findEvent('MAP_001', 'NPC_MAYOR_STORY')
    const mayorAfter = findEvent('MAP_001', 'NPC_MAYOR_AFTER')
    const xiyuanBefore = findEvent('MAP_031', 'NPC_XIYUAN')
    const xiyuanAfter = findEvent('MAP_031', 'NPC_XIYUAN_AFTER')

    expectCondition(mayorBefore, STORY_PROGRESS_FLAGS.FESTIVAL_DONE, false)
    expectCondition(mayorBefore, STORY_PROGRESS_FLAGS.MET_MAYOR, false)
    expect(mayorBefore.actions).toContainEqual({ type: 'dialogue', dialogueId: 'DIA_004_MAYOR' })
    expectCondition(mayorStory, STORY_PROGRESS_FLAGS.FESTIVAL_DONE, true)
    expectCondition(mayorStory, STORY_PROGRESS_FLAGS.MET_MAYOR, false)
    expect(mayorStory.actions).toContainEqual({ type: 'dialogue', dialogueId: 'DIA_005_MAYOR' })
    expectCondition(mayorAfter, STORY_PROGRESS_FLAGS.MET_MAYOR, true)
    expect(mayorAfter.actions).toContainEqual({ type: 'dialogue', dialogueId: 'DIA_005_MAYOR_AFTER' })

    expectCondition(xiyuanBefore, 'xiyuan_quiz_completed', false)
    expect(xiyuanBefore.actions).toContainEqual({ type: 'dialogue', dialogueId: 'DIA_203_XIYUAN' })
    expectCondition(xiyuanAfter, 'xiyuan_quiz_completed', true)
    expect(xiyuanAfter.actions).toContainEqual({ type: 'dialogue', dialogueId: 'DIA_203_XIYUAN_AFTER' })
  })

  test('ruined town exposes only one mayor npc across story flag states', () => {
    const mayorEventIds = new Set(['NPC_MAYOR', 'NPC_MAYOR_STORY', 'NPC_MAYOR_AFTER'])
    const mayorEvents = MAPS['MAP_001']!.events.filter(event => mayorEventIds.has(event.id))
    const flagStates: Record<string, unknown>[] = [
      {},
      { [STORY_PROGRESS_FLAGS.FESTIVAL_DONE]: false, [STORY_PROGRESS_FLAGS.MET_MAYOR]: false },
      { [STORY_PROGRESS_FLAGS.FESTIVAL_DONE]: true, [STORY_PROGRESS_FLAGS.MET_MAYOR]: false },
      { [STORY_PROGRESS_FLAGS.FESTIVAL_DONE]: true, [STORY_PROGRESS_FLAGS.MET_MAYOR]: true },
      { [STORY_PROGRESS_FLAGS.FESTIVAL_DONE]: false, [STORY_PROGRESS_FLAGS.MET_MAYOR]: true },
    ]

    for (const flags of flagStates) {
      const visibleMayors = mayorEvents.filter(event => areEventConditionsMet(event.conditions, flag => flags[flag]))
      expect(visibleMayors).toHaveLength(1)
    }
  })

  test('garden quest flow events progress through flag chain', () => {
    const start = findEvent('MAP_001', 'NPC_PINEAPPLE_START')
    const wait = findEvent('MAP_001', 'NPC_PINEAPPLE_WAIT')
    const report = findEvent('MAP_001', 'NPC_PINEAPPLE_REPORT')
    const done = findEvent('MAP_001', 'NPC_PINEAPPLE_DONE')
    const barrel = findEvent('MAP_001', 'NPC_GARDEN_BARREL')

    expectCondition(start, 'garden_started', false)
    expect(start.actions).toContainEqual({ type: 'questStart', questId: 'QST_002' })
    expect(start.actions).toContainEqual({ type: 'dialogue', dialogueId: 'DIA_002_GARDEN' })
    expect(start.actions).toContainEqual({ type: 'setFlag', flag: 'garden_started', value: true })

    expectCondition(wait, 'garden_started', true)
    expectCondition(wait, 'garden_cleaned', false)

    expectCondition(barrel, 'garden_started', true)
    expectCondition(barrel, 'garden_cleaned', false)
    expect(barrel.actions).toContainEqual({ type: 'dialogue', dialogueId: 'DIA_002_GARDEN_BARREL' })
    expect(barrel.actions).toContainEqual({ type: 'setFlag', flag: 'garden_cleaned', value: true })

    expectCondition(report, 'garden_cleaned', true)
    expectCondition(report, 'garden_reported', false)
    expect(report.actions).toContainEqual({ type: 'addItem', itemId: 'pineapple_rice', quantity: 3 })
    expect(report.actions).toContainEqual({ type: 'questComplete', questId: 'QST_002' })
    expect(report.actions).toContainEqual({ type: 'setFlag', flag: 'garden_reported', value: true })

    expectCondition(done, 'garden_reported', true)
    expect(done.actions).toContainEqual({ type: 'dialogue', dialogueId: 'DIA_002_GARDEN_DONE' })
  })

  test('garden dialogues DIA_002_* exist and have valid structure', () => {
    const gardenIds = ['DIA_002_GARDEN', 'DIA_002_GARDEN_WAIT', 'DIA_002_GARDEN_BARREL', 'DIA_002_GARDEN_CLEAR', 'DIA_002_GARDEN_AFTER', 'DIA_002_GARDEN_DONE']
    for (const id of gardenIds) {
      expect(DIALOGUES[id]).toBeDefined()
      expect(DIALOGUES[id]!.lines.length).toBeGreaterThan(0)
    }
  })

  test('blue mint side quest consumes the gathered material on turn-in', () => {
    const gatherDialogue = DIALOGUES['DIA_FOREST_HERB_GATHER']
    const turnInDialogue = DIALOGUES['DIA_NPC_REBUILD1_HERB_TURNIN']

    expect(gatherDialogue?.onComplete).toContainEqual({ type: 'addItem', itemId: 'blue_mint', quantity: 1 })
    expect(turnInDialogue?.onComplete).toContainEqual({ type: 'removeItem', itemId: 'blue_mint', quantity: 1 })
    expect(turnInDialogue?.onComplete).toContainEqual({ type: 'questComplete', questId: 'QST_014' })
  })
})
