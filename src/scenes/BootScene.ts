import Phaser from 'phaser'
import { GameData } from '../core/GameData'
import { AudioManager } from '../core/AudioManager'
import { INITIAL_CHARACTERS } from '../data/characters'
import { TILE_SPRITES } from '../data/tileSprites'
import { TILE_SIZE } from '../utils/constants'

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' })
  }

  preload(): void {
    this.load.setPath('sprites')

    // Character sprites
    const chars: Record<string, string[]> = {
      T: ['front_idle_01', 'front_idle_02', 'back_idle_01', 'back_idle_02', 'side_walk_01', 'side_walk_02', 'attack_01', 'attack_02'],
      huihui: ['front_idle_01', 'front_idle_02', 'back_idle_01', 'back_idle_02', 'side_walk_01', 'side_walk_02', 'attack_01', 'attack_02'],
      abo: ['front_idle_01', 'front_idle_02', 'back_idle_01', 'back_idle_02', 'side_walk_01', 'side_walk_02', 'attack_01', 'attack_02'],
      congcong: ['front_idle_01', 'front_idle_02', 'back_idle_01', 'back_idle_02', 'side_walk_01', 'side_walk_02', 'attack_01', 'attack_02'],
      sun: ['front_idle_01', 'front_idle_02', 'back_idle_01', 'back_idle_02', 'side_walk_01', 'side_walk_02', 'cast_01', 'cast_02'],
      xiaoai: ['front_idle_01', 'front_idle_02', 'back_idle_01', 'back_idle_02', 'side_walk_01', 'side_walk_02', 'cast_01', 'cast_02'],
    }
    for (const [c, poses] of Object.entries(chars)) {
      for (const p of poses) {
        const key = `${c.toLowerCase()}_${p}`
        const path = `characters/${c}/${p}.png`
        this.load.image(key, path)
      }
    }

    // Environment tiles
    const envTiles = [
      'grass_plain', 'dirt_plain', 'dirt_pebbles', 'pond_round', 'river_edge',
      'river_vertical', 'river_curve_01', 'river_curve_02', 'waterfall',
      'tree_round', 'tree_pine', 'tree_pink', 'tree_autumn',
      'bush_round', 'bush_berries', 'grass_clump_01', 'grass_clump_02',
      'rock_small', 'rock_large', 'rock_pile', 'rock_tall',
      'fence_long', 'fence_short', 'rope_fence', 'wood_bridge', 'rope_bridge',
      'well_small', 'stump_plain', 'stump_mossy', 'log_fallen', 'log_short',
      'flowers_patch_blue', 'flowers_patch_orange', 'flowers_patch_pink', 'flowers_patch_white',
      'flowers_pink', 'flowers_white', 'flowers_yellow',
      'grass_pink_flower', 'grass_white_flower', 'grass_yellow_flower',
      'sapling', 'wheat', 'cabbage', 'farmland_plain', 'farmland_seedlings',
      'barrel', 'crate', 'pot', 'jug', 'signpost',
      'bench', 'lamp_post', 'lantern_post', 'stone_lantern',
      'campfire', 'mushrooms', 'moss_rock', 'pebbles', 'fallen_leaves',
      'altar_ruined', 'altar_mossy', 'altar_green', 'altar_blue', 'altar_fire',
      'mechanism_tree_green', 'mechanism_tree_blue', 'mechanism_tree_fire',
      'pond_lily', 'lily_pad', 'spike_pile', 'standing_stone_01', 'standing_stone_02',
      'stone_slab', 'axe_stump', 'cliff_left', 'cliff_right',
    ]
    for (const t of envTiles) {
      this.load.image(`env_${t}`, `environment/misc/${t}.png`)
    }

    // World objects
    const worldObjs = [
      'T_house', 'boluo_farmhouse', 'mayor_house', 'cottage', 'shop',
      'central_tower', 'temple', 'festival_plaza', 'prophecy_tree',
      'life_spring_fountain', 'sacred_spring', 'well', 'dock',
      'bridge', 'rowboat', 'sailboat', 'steamship', 'harbor_props',
      'lighthouse', 'portal_gate', 'rainbow_path_gate',
      'dark_castle', 'dark_swamp_cave', 'buoy',
    ]
    for (const o of worldObjs) {
      this.load.image(`obj_${o}`, `world_objects/misc/${o}.png`)
    }

    // Monsters (files are named {name}_01.png / {name}_02.png)
    const monsters: Record<string, string> = {
      xiao_yao: 'small_goblin',
      teng_yao: 'vine_demon',
      du_ye_chong: 'poison_leaf_bug',
      barrel_fake: 'barrel_mimic',
      xiao_shuidi: 'water_drop',
      feng_defender: 'wind_guard',
      crystal_parasite: 'crystal_parasite',
      feather_spirit: 'feather_spirit',
      stone_guard: 'stone_guard',
      fire_beast: 'fire_qilin_cub',
      bewilder_shadow: 'bewilder_shadow',
      jiangshi: 'jiangshi',
      miwang_ying: 'bewilder_shadow',
      charm_spirit: 'charm_spirit',
      water_wisp: 'water_wisp',
      horned_wraith: 'horned_wraith',
      hut_ghost: 'hut_ghost',
      dark_swamp_mon: 'dark_swamp',
      mask_minion: 'mask_minion',
    }
    for (const [id, fileName] of Object.entries(monsters)) {
      this.load.image(`mon_${id}_01`, `monsters/misc/${fileName}_01.png`)
      this.load.image(`mon_${id}_02`, `monsters/misc/${fileName}_02.png`)
    }

    // Mask minion has 5 variant frames
    for (let i = 1; i <= 5; i++) {
      this.load.image(`mon_mask_minion_0${i}`, `monsters/misc/mask_minion_0${i}.png`)
    }

    // Boss sprites (use NPC atlas as battle sprites)
    const bossMonsters: Record<string, string> = {
      baihu: 'white_tiger_idle',
      shui_yao: 'shuiyao',
      feng_chi: 'fengchi',
      fenghuang: 'phoenix_idle',
      qilin: 'qilin_idle',
    }
    for (const [id, fileName] of Object.entries(bossMonsters)) {
      this.load.image(`mon_${id}_01`, `npcs_bosses/misc/${fileName}.png`)
      this.load.image(`mon_${id}_02`, `npcs_bosses/misc/${fileName}.png`)
    }

    // NPCs / Bosses
    const npcImages: Record<string, string> = {
      npc_mayor: 'npcs_bosses/misc/mayor.png',
      npc_uncle_boluo: 'npcs_bosses/misc/uncle_boluo.png',
      npc_barrel_spirit: 'npcs_bosses/misc/barrel_spirit.png',
      npc_barrel_spirit_idle: 'npcs_bosses/misc/barrel_spirit_idle.png',
      npc_barrel_spirit_guard: 'npcs_bosses/misc/barrel_spirit_guard.png',
      npc_barrel_spirit_flower: 'npcs_bosses/misc/barrel_spirit_flower.png',
      npc_barrel_spirit_leafcloak: 'npcs_bosses/misc/barrel_spirit_leafcloak.png',
      npc_white_tiger: 'npcs_bosses/misc/white_tiger_idle.png',
      npc_white_tiger_roar: 'npcs_bosses/misc/white_tiger_roar.png',
      npc_white_tiger_leap: 'npcs_bosses/misc/white_tiger_leap.png',
      npc_white_tiger_slam: 'npcs_bosses/misc/white_tiger_slam.png',
      npc_white_tiger_charge: 'npcs_bosses/misc/white_tiger_charge.png',
      npc_white_tiger_dash: 'npcs_bosses/misc/white_tiger_dash.png',
      npc_shuiyao: 'npcs_bosses/misc/shuiyao.png',
      npc_fengchi: 'npcs_bosses/misc/fengchi.png',
      npc_xiyuan: 'npcs_bosses/misc/xiyuan.png',
      npc_xiyuan_idle: 'npcs_bosses/misc/xiyuan_idle.png',
      npc_xiyuan_spell: 'npcs_bosses/misc/xiyuan_spell.png',
      npc_xiyuan_umbrella: 'npcs_bosses/misc/xiyuan_umbrella.png',
      npc_xiyuan_magic_ring: 'npcs_bosses/misc/xiyuan_magic_ring.png',
      npc_phoenix: 'npcs_bosses/misc/phoenix_idle.png',
      npc_phoenix_flame: 'npcs_bosses/misc/phoenix_flame.png',
      npc_phoenix_spread: 'npcs_bosses/misc/phoenix_spread.png',
      npc_rainbow_phoenix: 'npcs_bosses/misc/rainbow_phoenix.png',
      npc_qilin: 'npcs_bosses/misc/qilin_idle.png',
      npc_qilin_aura: 'npcs_bosses/misc/qilin_aura.png',
      npc_qilin_charge: 'npcs_bosses/misc/qilin_charge.png',
      npc_qilin_idle_alt: 'npcs_bosses/misc/qilin_idle_alt.png',
      npc_priestess_sun: 'npcs_bosses/misc/priestess_sun.png',
    }
    for (const [key, path] of Object.entries(npcImages)) {
      this.load.image(key, path)
    }

    // Generated boss sprites (chi/mei/wang/liang/fake_xiaoai/xiaoai_true/wuxiang)
    const genBosses = ['chi', 'mei', 'wang', 'liang', 'fake_xiaoai', 'xiaoai_true', 'wuxiang']
    for (const id of genBosses) {
      this.load.image(`mon_${id}_01`, `monsters/misc/${id}_01.png`)
      this.load.image(`mon_${id}_02`, `monsters/misc/${id}_02.png`)
    }

    // Holy temple tiles
    const holyTiles = [
      'floor_tile_01', 'floor_tile_02', 'floor_tile_03', 'floor_tile_04',
      'stairs_small', 'stairs_large', 'pool_square', 'pool_round', 'fountain',
      'waterfall_vertical', 'waterfall_horizontal', 'water_corner',
      'wind_effect_small', 'wind_effect_large', 'holy_light_small', 'holy_light_large',
      'wall_plain', 'wall_window', 'wall_banner', 'door_wood', 'gate_golden',
      'column_plain', 'column_gem', 'crystal_blue', 'crystal_purple',
      'brazier_fire', 'brazier_ice', 'brazier_arcane',
      'altar_main', 'altar_lectern', 'statue_angel', 'statue_priest', 'statue_trumpet',
      'pedestal_orb', 'pedestal_crown', 'pedestal_book',
      'barrier_blue', 'barrier_purple', 'barrier_gold',
      'path_red', 'path_orange', 'path_yellow', 'path_green', 'path_blue', 'path_indigo', 'path_purple',
      'cloud_small', 'cloud_large', 'spring_edge_01', 'spring_edge_02',
      'stele_qinglong', 'stele_baihu', 'stele_zhuque', 'stele_xuanwu', 'sparkles',
    ]
    for (const t of holyTiles) {
      this.load.image(`holy_${t}`, `holy_temple/misc/${t}.png`)
    }

    // Dark fantasy tiles
    const darkTiles = [
      'floor_stone_01', 'floor_stone_02', 'floor_stone_03',
      'floor_bones', 'floor_skull_panel', 'floor_purple_cracks', 'floor_brick',
      'soil_mushroom', 'cliff_block', 'cliff_corner', 'cliff_vertical', 'cliff_horizontal',
      'cliff_pillar', 'cliff_inner_corner', 'rocks_pile', 'rocks_crystal',
      'cave_floor', 'earth_floor', 'drain_grate', 'mud_puddles',
      'swamp_water_01', 'swamp_water_02', 'swamp_bridge', 'swamp_edge',
      'dead_tree_01', 'dead_tree_02', 'thorn_bush', 'purple_torch', 'hanging_lantern',
      'chain_hook', 'hanging_cage', 'tombstone', 'bones_01', 'bones_02',
      'crystal_cluster', 'demon_gate_large', 'demon_gate_small',
      'ritual_altar', 'throne_platform', 'arena_platform',
      'spike_trap', 'cracked_plate', 'block_face', 'hidden_trap',
      'magic_circle_purple', 'magic_circle_red', 'magic_circle_green', 'banner',
    ]
    for (const t of darkTiles) {
      this.load.image(`dark_${t}`, `dark_fantasy/misc/${t}.png`)
    }

    // Audio (reset path to root so audio paths resolve correctly)
    this.load.setPath('')
    const audioManager = AudioManager.getInstance()
    audioManager.setScene(this)
    audioManager.preload(this.load)
    this.load.image('ui_title_bg', 'sprites/title_bg_001.jpg')
    this.load.image('ui_battle_bg_field', 'sprites/battle_bg_field_001.jpg')
  }

  create(): void {
    const gd = GameData.getInstance()
    if (gd.party.length === 1 && gd.party[0] === 'T' && gd.characters.size === 0) {
      for (const id of Object.keys(INITIAL_CHARACTERS)) {
        if (INITIAL_CHARACTERS[id]) {
          gd.characters.set(id, JSON.parse(JSON.stringify(INITIAL_CHARACTERS[id])))
        }
      }
      gd.initializeCharacterState()
      // Give initial items
      gd.addItem('heal_grass', 3)
      gd.addItem('pineapple_rice', 1)
      gd.addItem('antidote', 2)
    }

    this.processTileTextures()
    this.scene.start('TitleScene')
  }

  private processTileTextures(): void {
    const keys = new Set(Object.values(TILE_SPRITES))
    const groundTiles = new Set([
      'env_grass_plain',
      'env_dirt_plain',
      'env_pond_round',
      'env_dirt_pebbles',
      'env_farmland_plain',
    ])

    for (const key of keys) {
      const texture = this.textures.get(key)
      if (!texture || texture.key === '__MISSING') continue

      const source = texture.getSourceImage() as HTMLImageElement
      if (!source || source.width === 0 || source.height === 0) continue

      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = source.width
      tempCanvas.height = source.height
      const tempCtx = tempCanvas.getContext('2d')!
      tempCtx.drawImage(source, 0, 0)

      const imageData = tempCtx.getImageData(0, 0, source.width, source.height)
      const data = imageData.data

      let minX = source.width
      let minY = source.height
      let maxX = 0
      let maxY = 0
      for (let y = 0; y < source.height; y++) {
        for (let x = 0; x < source.width; x++) {
          const alpha = data[(y * source.width + x) * 4 + 3]!
          if (alpha > 0) {
            if (x < minX) minX = x
            if (x > maxX) maxX = x
            if (y < minY) minY = y
            if (y > maxY) maxY = y
          }
        }
      }

      if (minX > maxX || minY > maxY) continue

      const cropW = maxX - minX + 1
      const cropH = maxY - minY + 1

      const canvas = document.createElement('canvas')
      canvas.width = TILE_SIZE
      canvas.height = TILE_SIZE
      const ctx = canvas.getContext('2d')!
      ctx.imageSmoothingEnabled = false

      const isGround = groundTiles.has(key)
      const stretchObjects = new Set(['env_fence_long', 'env_wood_bridge'])

      if (isGround) {
        // Sample average color from center region for background fill
        let r = 0, g = 0, b = 0, count = 0
        const cx = minX + Math.floor(cropW * 0.25)
        const cy = minY + Math.floor(cropH * 0.25)
        const cw = Math.floor(cropW * 0.5)
        const ch = Math.floor(cropH * 0.5)
        for (let y = cy; y < cy + ch; y++) {
          for (let x = cx; x < cx + cw; x++) {
            const idx = (y * source.width + x) * 4
            if (data[idx + 3]! > 0) {
              r += data[idx]!
              g += data[idx + 1]!
              b += data[idx + 2]!
              count++
            }
          }
        }
        if (count > 0) {
          ctx.fillStyle = `rgb(${Math.floor(r / count)}, ${Math.floor(g / count)}, ${Math.floor(b / count)})`
          ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE)
        }
        // Draw actual texture content stretched to tile size
        ctx.drawImage(source, minX, minY, cropW, cropH, 0, 0, TILE_SIZE, TILE_SIZE)
      } else if (stretchObjects.has(key)) {
        // Stretch to fill for connecting objects
        ctx.drawImage(source, minX, minY, cropW, cropH, 0, 0, TILE_SIZE, TILE_SIZE)
      } else {
        // Object tile: center with margin
        const margin = 2
        const maxSize = TILE_SIZE - margin * 2
        const aspect = cropW / cropH
        let drawW: number
        let drawH: number
        if (aspect >= 1) {
          drawW = maxSize
          drawH = Math.round(maxSize / aspect)
        } else {
          drawH = maxSize
          drawW = Math.round(maxSize * aspect)
        }
        const drawX = Math.floor((TILE_SIZE - drawW) / 2)
        const drawY = Math.floor((TILE_SIZE - drawH) / 2)
        ctx.drawImage(source, minX, minY, cropW, cropH, drawX, drawY, drawW, drawH)
      }

      this.textures.remove(key)
      this.textures.addCanvas(key, canvas)
    }
  }
}
