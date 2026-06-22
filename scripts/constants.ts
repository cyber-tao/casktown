export const PROJECT_ROOT_PARENT_SEGMENT = '..'
export const SOURCE_SPRITE_PACK_DIR = 'img/sprites'
export const TARGET_SPRITE_DIR = 'assets/sprites'
export const SPRITE_PACK_MANIFEST_FILE = 'pack_manifest.json'
export const OUTPUT_MISC_DIRECTORY = 'misc'
export const PNG_FILE_EXTENSION = '.png'
export const POSIX_PATH_SEPARATOR = '/'
export const UTF8_FILE_ENCODING = 'utf8'
export const ROOT_FRAME_SEGMENT_COUNT = 1
export const INITIAL_GENERATED_FILE_COUNT = 0
export const PROCESS_SUCCESS_EXIT_CODE = 0
export const PROCESS_FAILURE_EXIT_CODE = 1
export const JSON_FORMAT_SPACE_COUNT = 2
export const RGBA_CHANNEL_COUNT = 4
export const ALPHA_CHANNEL_OFFSET = 3
export const TRIM_PADDING_PX = 2
export const TRANSPARENT_PIXEL = { r: 0, g: 0, b: 0, alpha: 0 } as const
export const FRAME_SEQUENCE_SUFFIX_PATTERN = /_\d+$/
export const RGB_BACKGROUND_MIN_CHANNEL_VALUE = 218
export const RGB_BACKGROUND_MAX_CHANNEL_DELTA = 24
export const EDGE_LINE_MAX_THICKNESS_RATIO = 0.025
export const EDGE_BLEED_MAX_PRIMARY_AREA_RATIO = 0.35
export const TOP_BLEED_MAX_PRIMARY_AREA_RATIO = 0.45
export const EDGE_BLEED_ZONE_RATIO = 0.22
export const TOP_BLEED_ZONE_RATIO = 0.28
export const FRAME_BACKGROUND_MAX_PRIMARY_AREA_RATIO = 0.12
export const ACTOR_SPRITE_PACK_CATEGORIES = ['characters', 'npcs_bosses', 'monsters'] as const
export const SPRITE_PREVIEW_MAPPING_FILE = 'output/imagegen/casktown-visual-redesign/atlas-preview/atlas-preview-mapping.json'
export const SPRITE_PREVIEW_APPLY_CATEGORIES = ['characters', 'npcs_bosses'] as const
export const SPRITE_MAPPING_FRAME_INSET_PX = 12
export const SPRITE_MAPPING_BACKGROUND_DISTANCE_THRESHOLD = 56
export const SPRITE_MAPPING_LIGHT_BACKGROUND_MIN_CHANNEL = 225
export const SPRITE_MAPPING_LIGHT_BACKGROUND_MAX_CHANNEL_DELTA = 42
export const SPRITE_MAPPING_OPAQUE_ALPHA = 255
export const VOICE_LINES_FILE = 'voice_lines.json'
export const VOICE_AUDIO_OUTPUT_DIR = 'assets/audio/voice'
export const VOICE_TEMP_DIR = '.voice-tmp'
export const VOICE_ASSET_KEY_INDEX_PAD_LENGTH = 3
export const VOICE_GENERATION_DELAY_MS = 1200
export const VOICE_GENERATION_RETRY_LIMIT = 2
export const VOICE_RATE_LIMIT_RETRY_DELAY_MS = 3000
export const VOICE_SYNTHESIS_TIMEOUT_MS = 30000
export const VOICE_CONVERSION_TIMEOUT_MS = 10000
export const VOICE_SAMPLE_RATE = 32000
export const VOICE_CHANNEL_COUNT = 1
export const AUDIO_OUTPUT_CHANNEL_COUNT = 2
export const DEFAULT_VOICE_SPEED = 1.0
export const DEFAULT_VOICE_PITCH = 0
export const COMMAND_LOOKUP_CLI = 'which'
export const VOICE_SYNTHESIS_CLI = 'mmx'
export const AUDIO_CONVERSION_CLI = 'ffmpeg'
export const AUDIO_CONVERSION_CODEC = 'vorbis'
export const AUDIO_CONVERSION_QUALITY = '4'
export const AUDIO_CONVERSION_STRICT_MODE = '-2'
export const VOICE_GENERATION_LIMIT_ENV = 'VOICE_GENERATION_LIMIT'
export const PROCESS_ERROR_MESSAGE_MAX_LENGTH = 600
export const DESIGN_RUNTIME_ASSET_DIR = 'img/desiges/runtime-ui-assets'
export const RUNTIME_UI_OUTPUT_DIR = 'assets/sprites/ui'
export const DESIGN_ITEM_ICON_SOURCE_DIR = 'img/sprites/item_overrides'
export const RUNTIME_ITEM_ICON_OUTPUT_DIR = 'assets/sprites/items/misc'
export const RUNTIME_ITEM_ICON_SIZE_PX = 80
export const RUNTIME_UI_DESIGN_SOURCE_FILE = 'img/desiges/design-sources/08-production-ui-kit.png'
export const RUNTIME_UI_IMAGEGEN_MENU_PANEL_SOURCE_FILE = 'img/desiges/runtime-ui-assets/source/panel_menu_large-imagegen-alpha.png'
export const RUNTIME_UI_SCALE_MODE = {
  CONTAIN: 'contain',
  NINE_SLICE: 'nineSlice',
} as const
export const RUNTIME_VISUAL_ASSET_DEFINITIONS = {
  ui: [
    {
      name: 'panel_menu_large',
      kind: 'book',
      target: { width: 1320, height: 960 },
    },
    {
      name: 'panel_menu_sidebar',
      kind: 'sidebar',
      target: { width: 480, height: 960 },
    },
    {
      name: 'panel_dialogue',
      kind: 'dialogue',
      target: { width: 1800, height: 320 },
    },
    {
      name: 'panel_dialogue_face',
      kind: 'panel',
      target: { width: 300, height: 300 },
    },
    {
      name: 'panel_card',
      kind: 'card',
      target: { width: 420, height: 260 },
    },
    {
      name: 'panel_quest',
      kind: 'panel',
      target: { width: 520, height: 260 },
    },
    {
      name: 'panel_minimap',
      kind: 'minimap',
      target: { width: 300, height: 260 },
    },
    {
      name: 'panel_prompt',
      kind: 'prompt',
      target: { width: 720, height: 160 },
    },
    {
      name: 'button_selected',
      kind: 'button',
      target: { width: 420, height: 72 },
    },
    {
      name: 'panel_battle_command',
      kind: 'battle',
      target: { width: 880, height: 360 },
    },
  ],
} as const
export const RUNTIME_UI_IMAGE_SOURCE_DEFINITIONS = {
  panel_menu_large: {
    source: RUNTIME_UI_IMAGEGEN_MENU_PANEL_SOURCE_FILE,
    mode: RUNTIME_UI_SCALE_MODE.CONTAIN,
    paddingRatio: 0.02,
  },
  panel_menu_sidebar: {
    source: RUNTIME_UI_DESIGN_SOURCE_FILE,
    mode: RUNTIME_UI_SCALE_MODE.NINE_SLICE,
    crop: { left: 193, top: 12, width: 196, height: 196 },
    slice: { left: 28, right: 28, top: 28, bottom: 28 },
  },
  panel_dialogue: {
    source: RUNTIME_UI_DESIGN_SOURCE_FILE,
    mode: RUNTIME_UI_SCALE_MODE.NINE_SLICE,
    crop: { left: 13, top: 608, width: 358, height: 44 },
    slice: { left: 34, right: 34, top: 16, bottom: 16 },
  },
  panel_dialogue_face: {
    source: RUNTIME_UI_DESIGN_SOURCE_FILE,
    mode: RUNTIME_UI_SCALE_MODE.NINE_SLICE,
    crop: { left: 8, top: 12, width: 176, height: 196 },
    slice: { left: 28, right: 28, top: 30, bottom: 30 },
  },
  panel_card: {
    source: RUNTIME_UI_DESIGN_SOURCE_FILE,
    mode: RUNTIME_UI_SCALE_MODE.NINE_SLICE,
    crop: { left: 193, top: 12, width: 196, height: 196 },
    slice: { left: 28, right: 28, top: 28, bottom: 28 },
  },
  panel_quest: {
    source: RUNTIME_UI_DESIGN_SOURCE_FILE,
    mode: RUNTIME_UI_SCALE_MODE.NINE_SLICE,
    crop: { left: 1405, top: 390, width: 120, height: 100 },
    slice: { left: 20, right: 20, top: 20, bottom: 20 },
  },
  panel_minimap: {
    source: RUNTIME_UI_DESIGN_SOURCE_FILE,
    mode: RUNTIME_UI_SCALE_MODE.NINE_SLICE,
    crop: { left: 1007, top: 430, width: 220, height: 188 },
    slice: { left: 18, right: 22, top: 18, bottom: 22 },
  },
  panel_prompt: {
    source: RUNTIME_UI_DESIGN_SOURCE_FILE,
    mode: RUNTIME_UI_SCALE_MODE.NINE_SLICE,
    crop: { left: 13, top: 498, width: 358, height: 38 },
    slice: { left: 34, right: 34, top: 14, bottom: 14 },
  },
  button_selected: {
    source: RUNTIME_UI_DESIGN_SOURCE_FILE,
    mode: RUNTIME_UI_SCALE_MODE.NINE_SLICE,
    crop: { left: 397, top: 134, width: 299, height: 54 },
    slice: { left: 28, right: 28, top: 16, bottom: 16 },
  },
  panel_battle_command: {
    source: RUNTIME_UI_DESIGN_SOURCE_FILE,
    mode: RUNTIME_UI_SCALE_MODE.NINE_SLICE,
    crop: { left: 1405, top: 390, width: 120, height: 100 },
    slice: { left: 20, right: 20, top: 20, bottom: 20 },
  },
} as const
