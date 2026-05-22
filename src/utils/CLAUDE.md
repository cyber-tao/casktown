[根目录](../../CLAUDE.md) > [src](../) > **utils**

# utils -- 工具层

## 模块职责

全局常量、UI 布局参数、触控适配、场景生命周期辅助和语音线路解析等工具函数。

## 入口与启动

按需导入，无初始化流程。

## 对外接口

### constants.ts (1480+ 行)

130 个顶级导出，~1256 个常量（含嵌套属性）。所有像素坐标通过 `scalePx()` 预处理适配 `GAME_SCALE=2`。

#### 基础尺寸与缩放

| 导出 | 值 | 说明 |
|------|-----|------|
| `BASE_TILE_SIZE` / `TILE_SIZE` | 32 / 64 | 基础/实际瓦片尺寸 |
| `BASE_GAME_WIDTH` / `GAME_WIDTH` | 960 / 1920 | 基础/实际游戏宽度 |
| `BASE_GAME_HEIGHT` / `GAME_HEIGHT` | 540 / 1080 | 基础/实际游戏高度 |
| `GAME_SCALE` | 2 | 缩放倍数 |
| `VIEWPORT_TILES_X` / `VIEWPORT_TILES_Y` | - | 可视区瓦片数 |
| `scalePx(value)` | value * 2 | 像素缩放函数 |
| `scaleFont(value)` | (value*2) + 'px' | 字体缩放函数 |
| `PROJECT_GITHUB_URL` | - | GitHub 仓库地址 |

#### 时间常量

| 导出 | 值 | 说明 |
|------|-----|------|
| `TIME_MS_PER_SECOND` | 1000 | 毫秒/秒 |
| `SECONDS_PER_MINUTE` | 60 | 秒/分钟 |
| `MINUTES_PER_HOUR` | 60 | 分钟/小时 |
| `SECONDS_PER_HOUR` | 3600 | 秒/小时 |

#### 战斗规则 (BATTLE_RULES)

22 个常量：`MAX_TP=100`, `DAMAGE_VARIANCE_MIN=0.9`, `BREAK_DAMAGE_MULTIPLIER=1.3`, `DEFEND_DAMAGE_MULTIPLIER=0.5`, `ESCAPE_SUCCESS_RATE=0.5`, `PLAYER_ATTACK_TP_GAIN=5`, `DEFEND_TP_GAIN=15`, `WEAK_SKILL_BREAK_GAIN=25`, `PHOENIX_REBIRTH_HP_RATIO=0.3` 等

#### 角色成长 (LEVEL_GROWTH)

10 个常量：`EXP_TO_NEXT_MULTIPLIER=1.5`, `MAX_HP_BASE_GAIN=10`, `ATK_GAIN=2`, `DEF_GAIN=1`, `SPEED_GAIN=1` 等

#### 经济与进度

| 常量 | 值 | 说明 |
|------|-----|------|
| `TRAINING_COST` | 30 | 训练花费 |
| `TRAINING_EXP_BASE` | 20 | 训练基础经验 |
| `INITIAL_GOLD` | 100 | 初始金钱 |
| `COMBO_TP_COST` | 25 | 连击 TP 消耗 |
| `SAVE_SLOTS` | 3 | 存档栏位 |
| `QUICK_SAVE_SLOT` | 4 | 快速存档栏位 |
| `SAVE_LOAD_FEEDBACK_DELAY_MS` | 1000 | 存读档反馈延迟 |
| `TRUE_ROUTE_MIN_MERCY` | 3 | 真结局最低慈悲值 |
| `TRUE_ROUTE_MIN_XIAOAI_MEMORY_FRAGMENTS` | 3 | 真结局最低记忆碎片 |

#### 元素相克 (ELEMENT_WEAKNESS)

9 种元素 (FIRE/WATER/WIND/EARTH/THUNDER/WOOD/LIGHT/DARK/NONE)，完整相克关系数组

#### MENU_OVERLAY_UI (79+ 个布局参数)

覆盖层完整 UI 布局：面板位置/尺寸、字体大小、卡片尺寸、颜色定义(COLORS 对象 21 种)、渲染深度(DEPTH=400)、透明度(OVERLAY_ALPHA=0.72)

#### CONFIG_EDITOR_* (14+ 个顶级常量)

控制配置编辑器行为：存储键(`casktown.config.database.v1`)、地图预览画布(520x360)、精灵裁剪UI、表标签映射(14种)、资源分组(11类)、事件颜色(5种)、图块颜色(24种)、角色图片键(6种)、回退颜色(7种)

#### 菜单与UI标签

| 导出 | 内容 |
|------|------|
| `MENU_NAV_LABELS` / `MENU_NAV_INDEX` | 9 项主菜单导航 |
| `INVENTORY_*` | 5 类背包分类 |
| `MENU_SETTINGS_OPTIONS` | 15 个设置项(文字/战斗速度、巡逻、难度、预言、音量、全屏、操作模式) |
| `MENU_CODEX_*` | 3 个图鉴标签 + 10 个故事分支 + 13 个 Boss 发现标志 |
| `EQUIPMENT_SLOT_LABELS` | 3 装备槽(武器/防具/饰品) |
| `CHARACTER_STAT_LABELS` | 5 属性标签 |
| `EQUIPMENT_STAT_LABELS` | 7 属性标签 |
| `SETTINGS_PANEL` | 设置面板完整布局 |

#### 标题画面

| 导出 | 内容 |
|------|------|
| `TITLE_GITHUB_LINK` | GitHub 链接布局 |
| `TITLE_MENU_ITEMS` | 5 项菜单（开始/继续/编辑器/设置/退出） |
| `TITLE_MENU_ACTION_INDEX` | 菜单动作索引 |
| `TITLE_MENU_LAYOUT` | 菜单布局 |
| `EDITOR_PAGE_LINK` | 编辑器页面链接布局 |

#### 地图数据常量

| 导出 | 内容 |
|------|------|
| `MAP_ACCESS_REQUIREMENTS` | 29 个地图访问条件 |
| `REDESIGNED_MAP_LAYOUTS` | 25 个地图完整布局定义(~500 行) |
| `WORLD_MAP_LOCATION_POINTS` | 29 个世界地图坐标 |
| `WORLD_MAP_BACKGROUND_LAYOUT` / `WORLD_MAP_UI` | 世界地图 UI 参数 |
| `MAP_TILE_KEYS` | 28 种瓦片类型 |
| `MAP_LAYER_INDEX` | GROUND=0, OBJECTS=1 |
| `MAP_ENCOUNTER_RATES` | NONE/LOW/STANDARD/DENSE/DANGEROUS |
| `BATTLE_BACKGROUND_KEYS` / `MAP_BATTLE_BACKGROUND_KEYS` | 战斗背景映射 |

#### 野外实体 (FIELD_ENTITY_BEHAVIOR)

10 个基础常量 + `FIELD_ENTITY_BEHAVIOR_PRESETS`（8 种预设：idle/wander/guard/chase/ambush 变体）+ `FIELD_ENCOUNTER_SPAWN_COUNTS` + `ROAMING_ENCOUNTER_RESPAWN` + `FIELD_ENCOUNTER_RATE_THRESHOLDS`

#### 动画与精灵

- `FIELD_SPRITE_ANIMATION`: 帧时长180ms、空闲帧索引1、变异帧2
- `TILE_TEXTURE_PROCESSING`: 地形插入比例0.24、对象边距2px
- `TILE_TEXTURE_INSET_OVERRIDES` / `TILE_TEXTURE_DETAIL_ALPHA_OVERRIDES`: 瓦片纹理特殊覆盖
- `CONTINUOUS_TERRAIN_TEXTURE_KEYS` / `STRETCHED_TILE_TEXTURE_KEYS`: 连续/拉伸纹理键
- `REBUILD_TILE_REPLACEMENTS`: 重建等级瓦片替换规则
- `DIRECTION`: UP=0, RIGHT=1, DOWN=2, LEFT=3 + 向量 + 名称
- `CHARACTER_SPRITE_BASE_KEYS`: 6 个可玩角色 (T/huihui/abo/congcong/sun/xiaoai)
- `CHARACTER_DIRECTION_FRAME_STEMS` / `CHARACTER_DIRECTION_TEXTURE_PATTERN`: 角色帧命名
- `SPRITE_CROP_DEFAULTS`: 默认裁剪参数
- `TILE_SPRITE_FOOTPRINTS`: 瓦片精灵占位尺寸

#### 音频与触控

- `VOICE_AUDIO_PATH`: 目录 `audio/voice`，扩展名 `.ogg`
- `BGM_FADE_DURATIONS`: DEFAULT=1000ms, FAST=500ms, NONE=0
- `TOUCH_INPUT`: 42+ 个触控参数 (D-pad/动作按钮/深度620/activePointers)
- `MAP_INPUT_CODES`: 地图输入码映射

#### 对话UI

`DIALOGUE_BOX`: 中心(960,880)、宽1800、高320、内边距36；`DIALOGUE_FACE`: (220,880)、240x240；`DIALOGUE_TEXT_WIDTH`/`DIALOGUE_TEXT_WRAP_CHARS=33`

#### 战斗面板

- `BATTLE_RESULT_PANEL` / `BATTLE_TARGET_INDICATOR` / `GAME_OVER_PANEL`: 战斗结果/目标指示器/游戏结束面板布局
- `BATTLE_SPEED` / `TEXT_SPEED`: 速度预设
- `BATTLE_RANDOM_TARGET_HITS`: 随机目标命中次数范围

### touch.ts

| 导出 | 说明 |
|------|------|
| `bindTouchText(text, onPress)` | 为 Text 对象绑定触控事件，自动扩展点击区域 |

### sceneLifecycle.ts

| 导出 | 说明 |
|------|------|
| `cleanupKeyboardOnShutdown(scene)` | 场景关闭时清理键盘监听器 |

### voiceLines.ts

| 导出 | 说明 |
|------|------|
| `resolveDialogueVoiceKey(dialogueId, lines, lineIndex)` | 解析对话语音键（处理重复说话者/文本） |
| `getDialogueVoicePath(voiceKey)` | 获取语音文件路径 |

## 常量审计发现

### 重复定义

`MAP_HUD.EVENT_COLORS` 和 `CONFIG_EDITOR_EVENT_COLORS` 定义了相同的 5 种事件颜色 (npc/battle/transfer/chest/trigger)，格式不同（数值 vs 字符串）。建议合并为单一 `EVENT_COLORS` 常量。

### 魔法数字

文件在提取魔法数字方面做得很好。所有算法参数都已命名提取，剩余字面量都是地图布局数据（坐标/尺寸），无需进一步提取。

### 未使用常量

未发现明显的未使用常量。

## 关键依赖

- `constants.ts`: 零外部依赖，纯值定义
- `touch.ts`: 依赖 Phaser
- `sceneLifecycle.ts`: 依赖 Phaser
- `voiceLines.ts`: 依赖 `voice_lines.json`（根目录）

## 测试与质量

2 个测试文件覆盖本模块：

| 测试文件 | 覆盖内容 |
|---------|---------|
| `tests/utils/constants.test.ts` | 分辨率一致性、初始值合法性、存档槽位、真结局阈值、元素相克、方向向量 |
| `tests/utils/voice-lines.test.ts` | 语音键解析（越界/空/重复说话者）、路径构造 |

## 相关文件清单

| 文件 | 说明 |
|------|------|
| `src/utils/constants.ts` | 全局常量与 UI 布局 (1480+ 行, 130 顶级导出) |
| `src/utils/touch.ts` | 触控适配 |
| `src/utils/sceneLifecycle.ts` | 场景生命周期 |
| `src/utils/voiceLines.ts` | 语音线路解析 |

## 变更记录

| 时间 | 操作 | 说明 |
|------|------|------|
| 2026-05-22 14:10:48 | 新建 | 初始化模块文档 |
| 2026-05-22 | 深度扫描 | 补充常量完整分类、审计发现、战斗规则/成长/经济参数 |
| 2026-05-22 15:52:17 | 增量更新 | 顶级导出修正为130、新增时间常量/QUICK_SAVE_SLOT/SAVE_LOAD_FEEDBACK_DELAY_MS/标题画面常量/战斗面板常量/瓦片纹理覆盖/重建瓦片替换/角色帧命名/2个测试文件覆盖 |
