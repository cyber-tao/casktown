import { describe, expect, test } from 'bun:test'
import { existsSync } from 'node:fs'
import { ITEMS } from '../../src/data/items.ts'
import { SKILLS } from '../../src/data/skills.ts'
import { ENEMIES } from '../../src/data/enemies.ts'
import { INITIAL_CHARACTERS } from '../../src/data/characters.ts'
import { ENCOUNTERS } from '../../src/data/encounters.ts'
import { MAPS } from '../../src/data/maps.ts'
import { DIALOGUES } from '../../src/data/dialogues.ts'
import { QUESTS } from '../../src/data/quests.ts'
import { PROPHECIES } from '../../src/data/prophecies.ts'
import { EQUIP_STAT_BONUSES } from '../../src/data/equipment.ts'
import { IMAGE_ASSETS } from '../../src/data/assets.ts'
import { TILE_SPRITES, TILESET_TILE_SPRITES, resolveTileSpriteKey } from '../../src/data/tileSprites.ts'
import { BGM_TRACKS, SFX_TRACKS } from '../../src/data/audio.ts'
import { DIALOGUE_SPEAKER_FACE_MAP } from '../../src/data/dialoguePortraits.ts'

describe('data type integrity', () => {
  test('all items have required fields', () => {
    for (const [id, item] of Object.entries(ITEMS)) {
      expect(item.id).toBe(id)
      expect(item.name).toBeTruthy()
      expect(item.type).toBeTruthy()
      if (item.price !== undefined) {
        expect(typeof item.price).toBe('number')
      }
    }
  })

  test('all skills have required fields', () => {
    for (const [id, skill] of Object.entries(SKILLS)) {
      expect(skill.id).toBe(id)
      expect(skill.name).toBeTruthy()
      expect(skill.type).toBeTruthy()
      expect(typeof skill.power).toBe('number')
    }
  })

  test('all enemies have required fields with valid skill references', () => {
    for (const [id, enemy] of Object.entries(ENEMIES)) {
      expect(enemy.id).toBe(id)
      expect(enemy.name).toBeTruthy()
      expect(enemy.stats).toBeDefined()
      expect(typeof enemy.exp).toBe('number')
      expect(typeof enemy.gold).toBe('number')
      for (const skillId of enemy.skills) {
        expect(SKILLS[skillId]).toBeDefined()
      }
      for (const drop of enemy.drops) {
        expect(ITEMS[drop.itemId]).toBeDefined()
      }
    }
  })

  test('xiaoai boss display names are readable', () => {
    expect(ENEMIES.fake_xiaoai.name).toBe('假·xiaoai')
    expect(ENEMIES.xiaoai_true.name).toBe('xiaoai·真身')
    expect(ENEMIES.fake_xiaoai.name).not.toMatch(/\s/)
    expect(ENEMIES.xiaoai_true.name).not.toMatch(/\s/)
    expect(ENEMIES.fake_xiaoai.name).not.toBe('假xiaoai')
    expect(ENEMIES.xiaoai_true.name).not.toBe('xiaoai真身')
  })

  test('all characters have required fields with valid references', () => {
    for (const [id, char] of Object.entries(INITIAL_CHARACTERS)) {
      expect(char.id).toBe(id)
      expect(char.name).toBeTruthy()
      expect(char.stats).toBeDefined()
      expect(typeof char.stats.hp).toBe('number')
      expect(typeof char.stats.atk).toBe('number')
      for (const skillId of char.skills) {
        expect(SKILLS[skillId]).toBeDefined()
      }
    }
  })

  test('all encounters have valid enemy references', () => {
    for (const [id, enc] of Object.entries(ENCOUNTERS)) {
      expect(enc.id).toBe(id)
      expect(enc.enemies.length).toBeGreaterThan(0)
      for (const enemyId of enc.enemies) {
        expect(ENEMIES[enemyId]).toBeDefined()
      }
    }
  })

  test('all maps have valid layer geometry', () => {
    for (const [id, map] of Object.entries(MAPS)) {
      expect(map.id).toBe(id)
      expect(map.width).toBeGreaterThan(0)
      expect(map.height).toBeGreaterThan(0)
      const tileCount = map.width * map.height
      for (const layer of map.layers) {
        expect(layer.data.length).toBe(tileCount)
      }
    }
  })

  test('all dialogues have at least one line', () => {
    for (const [id, dia] of Object.entries(DIALOGUES)) {
      expect(dia.id).toBe(id)
      expect(dia.lines.length).toBeGreaterThan(0)
      for (const line of dia.lines) {
        expect(line.text.trim().length).toBeGreaterThan(0)
      }
    }
  })

  test('all quests have objectives', () => {
    for (const [id, quest] of Object.entries(QUESTS)) {
      expect(quest.id).toBe(id)
      expect(quest.name).toBeTruthy()
      expect(quest.objectives.length).toBeGreaterThan(0)
    }
  })

  test('equip stat bonuses have valid structure', () => {
    expect(typeof EQUIP_STAT_BONUSES).toBe('object')
  })

  test('prophecies have required structure', () => {
    for (const prophecy of Object.values(PROPHECIES)) {
      expect(prophecy.id).toBeTruthy()
      expect(prophecy.chapter || prophecy.verse).toBeTruthy()
    }
  })

  test('character equipment references valid item slots', () => {
    for (const char of Object.values(INITIAL_CHARACTERS)) {
      const equip = char.equipment
      expect(equip).toBeDefined()
      for (const itemId of Object.values(equip)) {
        if (itemId) {
          expect(ITEMS[itemId]).toBeDefined()
        }
      }
    }
  })

  test('runtime image asset files exist', () => {
    const missing = Object.entries(IMAGE_ASSETS)
      .filter(([, assetPath]) => !existsSync(`assets/sprites/${assetPath}`))
      .map(([key, assetPath]) => `${key}: ${assetPath}`)

    expect(missing).toEqual([])
  })

  test('story npc image keys use distinct runtime portraits', () => {
    const distinctNpcKeys = [
      'npc_mayor',
      'npc_uncle_boluo',
      'npc_sailor',
      'npc_barrel_spirit',
      'npc_white_tiger',
      'npc_shuiyao',
      'npc_fengchi',
      'npc_xiyuan',
      'npc_phoenix',
      'npc_qilin',
      'npc_priestess_sun',
    ]
    const npcPaths = distinctNpcKeys.map(key => IMAGE_ASSETS[key])

    expect(npcPaths).not.toContain(undefined)
    expect(new Set(npcPaths).size).toBe(npcPaths.length)
  })

  test('dialogue speaker portraits resolve to runtime image assets', () => {
    const criticalSpeakers = ['祀神', '麒麟', '无相', '风之防御人']
    const missing = Object.entries(DIALOGUE_SPEAKER_FACE_MAP)
      .filter(([, assetKey]) => !IMAGE_ASSETS[assetKey])
      .map(([speaker, assetKey]) => `${speaker}: ${assetKey}`)

    expect(missing).toEqual([])
    for (const speaker of criticalSpeakers) {
      expect(DIALOGUE_SPEAKER_FACE_MAP[speaker]).toBeTruthy()
    }
  })

  test('map tile sprite assets resolve for each tileset', () => {
    const missingOverrides = Object.entries(TILESET_TILE_SPRITES)
      .flatMap(([tileset, overrides]) => Object.entries(overrides)
        .filter(([, spriteKey]) => !IMAGE_ASSETS[spriteKey])
        .map(([tileId, spriteKey]) => `${tileset}/${tileId}: ${spriteKey}`))

    const missingMapTiles = Object.values(MAPS)
      .flatMap(map => map.layers.flatMap(layer => layer.data.map(tileId => ({ map, tileId }))))
      .filter(({ tileId }) => tileId > 0)
      .map(({ map, tileId }) => ({ map, tileId, spriteKey: resolveTileSpriteKey(TILE_SPRITES, map.tileset, tileId) }))
      .filter(({ spriteKey }) => !spriteKey || !IMAGE_ASSETS[spriteKey])
      .map(({ map, tileId, spriteKey }) => `${map.id}/${map.tileset}/${tileId}: ${spriteKey ?? 'missing'}`)

    expect([...missingOverrides, ...missingMapTiles]).toEqual([])
  })

  test('runtime audio asset files exist', () => {
    const audioAssets = [...Object.values(BGM_TRACKS), ...Object.values(SFX_TRACKS)]
    const missing = audioAssets
      .filter(asset => !existsSync(`assets/${asset.path}`))
      .map(asset => `${asset.key}: ${asset.path}`)

    expect(missing).toEqual([])
  })
})
