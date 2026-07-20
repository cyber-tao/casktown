import { ITEMS } from './items'
import { BATTLE_BACKGROUND_KEYS, ITEM_ICON_KEY_PREFIX, LOADING_SCREEN, RUNTIME_IMAGE_ASSET_PATHS } from '../utils/constants'

const CHARACTER_POSES = {
  T: ['front_idle_01', 'front_idle_02', 'back_idle_01', 'back_idle_02', 'side_walk_01', 'side_walk_02', 'attack_01', 'attack_02'],
  huihui: ['front_idle_01', 'front_idle_02', 'back_idle_01', 'back_idle_02', 'side_walk_01', 'side_walk_02', 'attack_01', 'attack_02'],
  abo: ['front_idle_01', 'front_idle_02', 'back_idle_01', 'back_idle_02', 'side_walk_01', 'side_walk_02', 'attack_01', 'attack_02'],
  congcong: ['front_idle_01', 'front_idle_02', 'back_idle_01', 'back_idle_02', 'side_walk_01', 'side_walk_02', 'attack_01', 'attack_02'],
  sun: ['front_idle_01', 'front_idle_02', 'back_idle_01', 'back_idle_02', 'side_walk_01', 'side_walk_02', 'cast_01', 'cast_02'],
  xiaoai: ['front_idle_01', 'front_idle_02', 'back_idle_01', 'back_idle_02', 'side_walk_01', 'side_walk_02', 'cast_01', 'cast_02'],
} as const

const ENVIRONMENT_TILES = [
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
] as const

const WORLD_OBJECTS = [
  'T_house', 'boluo_farmhouse', 'mayor_house', 'cottage', 'shop',
  'central_tower', 'temple', 'festival_plaza', 'prophecy_tree',
  'life_spring_fountain', 'sacred_spring', 'well', 'dock',
  'bridge', 'rowboat', 'sailboat', 'steamship', 'harbor_props',
  'lighthouse', 'portal_gate', 'rainbow_path_gate',
  'dark_castle', 'dark_swamp_cave', 'buoy',
] as const

const MONSTER_FILES: Record<string, string> = {
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

const MASK_MINION_VARIANT_FRAMES = ['01', '02', '03', '04', '05'] as const

const BOSS_MONSTER_FILES: Record<string, string> = {
  baihu: 'white_tiger_idle',
  shui_yao: 'shuiyao',
  feng_chi: 'fengchi',
  fenghuang: 'phoenix_idle',
  qilin: 'qilin_idle',
}

const NPC_IMAGES: Record<string, string> = {
  npc_mayor: 'npcs_bosses/misc/mayor.png',
  npc_uncle_boluo: 'npcs_bosses/misc/uncle_boluo.png',
  npc_sailor: 'npcs_bosses/misc/sailor.png',
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

const GENERATED_BOSSES = ['chi', 'mei', 'wang', 'liang', 'fake_xiaoai', 'xiaoai_true', 'wuxiang'] as const

const HOLY_TILES = [
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
] as const

const DARK_TILES = [
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
] as const

const imageAssets: Record<string, string> = {
  ui_title_bg: 'title_bg_1080p.jpg',
  [LOADING_SCREEN.BACKGROUND_KEY]: 'loading_bg_1080p.jpg',
  ui_world_map: 'map-world.png',
}

for (const [key, path] of Object.entries(RUNTIME_IMAGE_ASSET_PATHS)) {
  imageAssets[key] = path
}

const BATTLE_BACKGROUND_PATHS: Record<string, string> = {
  [BATTLE_BACKGROUND_KEYS.FIELD]: 'battle_bg_field_1080p.jpg',
  [BATTLE_BACKGROUND_KEYS.TOWN_RUINS]: 'battle_bg_town_ruins_1080p.jpg',
  [BATTLE_BACKGROUND_KEYS.FOREST]: 'battle_bg_forest_1080p.jpg',
  [BATTLE_BACKGROUND_KEYS.FOREST_ALTAR]: 'battle_bg_forest_altar_1080p.jpg',
  [BATTLE_BACKGROUND_KEYS.HOLY_WATER]: 'battle_bg_holy_water_1080p.jpg',
  [BATTLE_BACKGROUND_KEYS.HOLY_HALL]: 'battle_bg_holy_hall_1080p.jpg',
  [BATTLE_BACKGROUND_KEYS.MOUNTAIN]: 'battle_bg_mountain_1080p.jpg',
  [BATTLE_BACKGROUND_KEYS.RAINBOW_PATH]: 'battle_bg_rainbow_path_1080p.jpg',
  [BATTLE_BACKGROUND_KEYS.LIFE_SPRING]: 'battle_bg_life_spring_1080p.jpg',
  [BATTLE_BACKGROUND_KEYS.AZURE_POOL]: 'battle_bg_azure_pool_1080p.jpg',
  [BATTLE_BACKGROUND_KEYS.TIGER_CAVE]: 'battle_bg_tiger_cave_1080p.jpg',
  [BATTLE_BACKGROUND_KEYS.PHOENIX_GROVE]: 'battle_bg_phoenix_grove_1080p.jpg',
  [BATTLE_BACKGROUND_KEYS.BASALT_TEMPLE]: 'battle_bg_basalt_temple_1080p.jpg',
  [BATTLE_BACKGROUND_KEYS.REINCARNATION_PATH]: 'battle_bg_reincarnation_path_1080p.jpg',
  [BATTLE_BACKGROUND_KEYS.DARK_PALACE]: 'battle_bg_dark_palace_1080p.jpg',
  [BATTLE_BACKGROUND_KEYS.DARK_SWAMP]: 'battle_bg_dark_swamp_1080p.jpg',
  [BATTLE_BACKGROUND_KEYS.UNDERGROUND_PALACE]: 'battle_bg_underground_palace_1080p.jpg',
  [BATTLE_BACKGROUND_KEYS.ABYSS]: 'battle_bg_abyss_1080p.jpg',
}

for (const [key, path] of Object.entries(BATTLE_BACKGROUND_PATHS)) {
  imageAssets[key] = path
}

for (const [character, poses] of Object.entries(CHARACTER_POSES)) {
  for (const pose of poses) {
    imageAssets[`${character.toLowerCase()}_${pose}`] = `characters/${character}/${pose}.png`
  }
}

const HEART_SHADOW_IMAGE_PATHS: Record<string, string> = {
  heart_shadow_t: 'enemies/heart_shadows/heart_shadow_t.png',
  heart_shadow_huihui: 'enemies/heart_shadows/heart_shadow_huihui.png',
  worry_chain: 'dark_fantasy/misc/chain_hook.png',
  heart_shadow_a: 'enemies/heart_shadows/heart_shadow_a.png',
  heart_shadow_congcong: 'enemies/heart_shadows/heart_shadow_congcong.png',
  heart_shadow_sun: 'enemies/heart_shadows/heart_shadow_sun.png',
}

for (const [enemyId, path] of Object.entries(HEART_SHADOW_IMAGE_PATHS)) {
  imageAssets[`mon_${enemyId}_01`] = path
  imageAssets[`mon_${enemyId}_02`] = path
}

for (const tile of ENVIRONMENT_TILES) {
  imageAssets[`env_${tile}`] = `environment/misc/${tile}.png`
}

for (const object of WORLD_OBJECTS) {
  imageAssets[`obj_${object}`] = `world_objects/misc/${object}.png`
}

for (const [id, fileName] of Object.entries(MONSTER_FILES)) {
  imageAssets[`mon_${id}_01`] = `monsters/misc/${fileName}_01.png`
  imageAssets[`mon_${id}_02`] = `monsters/misc/${fileName}_02.png`
}

for (const frame of MASK_MINION_VARIANT_FRAMES) {
  imageAssets[`mon_mask_minion_${frame}`] = `monsters/misc/mask_minion_${frame}.png`
}

for (const [id, fileName] of Object.entries(BOSS_MONSTER_FILES)) {
  imageAssets[`mon_${id}_01`] = `npcs_bosses/misc/${fileName}.png`
  imageAssets[`mon_${id}_02`] = `npcs_bosses/misc/${fileName}.png`
}

for (const [key, path] of Object.entries(NPC_IMAGES)) {
  imageAssets[key] = path
}

for (const id of GENERATED_BOSSES) {
  imageAssets[`mon_${id}_01`] = `monsters/misc/${id}_01.png`
  imageAssets[`mon_${id}_02`] = `monsters/misc/${id}_02.png`
}

for (const tile of HOLY_TILES) {
  imageAssets[`holy_${tile}`] = `holy_temple/misc/${tile}.png`
}

for (const tile of DARK_TILES) {
  imageAssets[`dark_${tile}`] = `dark_fantasy/misc/${tile}.png`
}

for (const itemId of Object.keys(ITEMS)) {
  imageAssets[`${ITEM_ICON_KEY_PREFIX}${itemId}`] = `items/misc/${itemId}.png`
}

export const IMAGE_ASSETS: Record<string, string> = imageAssets
