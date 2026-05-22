[根目录](../../CLAUDE.md) > [src](../) > **core**

# core -- 核心系统层

## 模块职责

游戏核心逻辑与系统服务，为场景层提供状态管理、存档、事件通信、资源加载、输入处理、音频、任务、木桶能力、技能成长、城镇重建、地图访问控制、音效合成等基础设施。

## 入口与启动

- `GameData` 为单例模式，通过 `GameData.getInstance()` 获取，在 `BootScene` 中首次初始化
- `EventBus` 为模块级单例，直接导入使用
- 其他系统类（`SaveManager`、`QuestSystem`、`BarrelSystem`、`SkillGrowth`、`RebuildSystem`）均为单例模式
- `MapAccess` 为纯函数模块，无需实例化
- `SFXSynth` 为实例化类，在需要时 new 创建

## 对外接口

### GameData (单例)

- `getInstance()` -- 获取全局实例
- `reset()` -- 重置所有游戏状态（含初始装备、初始物品）
- `playTime` / `syncPlayTime(nowMs?)` -- 游玩时间追踪（秒），序列化时自动同步
- `setFlag(key, value)` / `getFlag(key)` / `hasFlag(key)` -- 游戏标志管理
- `updateBranch(key, value)` -- 分支剧情状态更新
- `addItem(itemId, quantity?)` / `removeItem(itemId, quantity?)` / `hasItem(itemId, quantity?)` -- 物品管理
- `addGold(amount)` / `spendGold(amount)` -- 金币管理
- `addPartyMember(charId)` -- 队伍管理（上限4人，超出进reserve）
- `getEquipStats(charId)` / `equipItem(charId, itemId, slot)` / `unequipItem(charId, itemId)` -- 装备管理
- `gainCharacterExperience(charId, amount)` / `gainPartyExperience(amount)` -- 经验与升级
- `adjustTrust(charId, amount)` / `getTrustLevel(charId)` / `isTrustHigh(charId, threshold?)` -- 好感度
- `adjustMercy(amount)` -- 慈悲值
- `serialize()` / `deserialize(data)` -- 序列化/反序列化（含 playTime、baseStats、equipment 索引）
- `syncProgressionFlags()` -- 自动同步进度标志（遗物收集、封印解除、Boss 击败等）
- `syncTrueRouteState()` -- 自动判定真结局解锁条件

### EventBus (单例)

- `on(event, handler, context?)` / `off(event, handler, context?)` / `emit(event, ...args)` -- 事件订阅/发布
- 事件常量定义在 `GameEvents` 对象中，包含 **18** 种事件：

| 事件 | 载荷 |
|------|------|
| `SAVE_REQUEST` / `LOAD_REQUEST` | 无 |
| `DIALOGUE_START` | dialogueId: string |
| `DIALOGUE_END` | data?: { actions?: EventAction[] } |
| `BATTLE_START` | encounterId: string |
| `BATTLE_END` | victory: boolean, result?: { escaped?: boolean } |
| `MENU_OPEN` / `MENU_CLOSE` | 无 |
| `MAP_CHANGE` | mapId: string |
| `FLAG_SET` | key: string, value: unknown |
| `QUEST_UPDATE` | questId: string, state: QuestState |
| `ITEM_GET` | itemId: string, quantity: number |
| `LEVEL_UP` | { charId: string; level: number } |
| `GAME_OVER` / `GAME_CLEARED` | 无 |
| `SAVE_LOADED` | 无 |
| `BARREL_UNLOCKED` | color: string |

### AssetLoader

- `queueImageAsset(scene, key)` / `queueImageAssets(scene, keys)` -- 图片资源排队加载
- `collectMapTileTextureKeys(mapData)` -- 收集地图瓦片纹理键
- `collectMapImageKeys(mapData, partyIds)` -- 收集地图图片键
- `collectBattleImageKeys(encounterId, partyIds, mapId?)` -- 收集战斗图片键
- `processTileTextures(scene, keys)` -- 处理瓦片纹理
- `resolveBattleBackgroundKey(encounterId, mapId?)` -- 解析战斗背景键

### InputManager

- 键盘输入管理，支持方向键和 WASD 两套键位
- 接口: `KeyBindings` 类型（up/down/left/right/confirm/cancel/menu/dash）
- 显示名映射: `KEY_DISPLAY_NAMES`

### AudioManager

- BGM/SFX 播放管理

### SaveManager

- `SAVE_KEY = 'casktown_save'`
- `SaveMeta` 接口（含 slot/timestamp/playTime/currentMap/preview）
- `QUICK_SAVE_SLOT = SAVE_SLOTS + 1 = 4`
- 浏览器 localStorage 存档
- `save(slot)` / `load(slot)` / `hasSave(slot)` / `deleteSave(slot)` / `getSaveMeta(slot)` / `getAllSaveMeta()`

### QuestSystem

- 任务状态管理（inactive/active/completed/failed）
- `startQuest(questId)` / `advanceQuest(questId, amount?)` / `completeQuest(questId)` / `failQuest(questId)`
- `getQuestState(questId)` / `isQuestActive(questId)` / `getActiveQuests()`

### BarrelSystem

- 木桶能力系统，8 种颜色: green/blue/gold/cyan/white/vermillion/black/rainbow
- 每种颜色对应不同能力效果（mapEffect + battleEffect）
- `unlock(color)` -- 解锁并发射 `BARREL_UNLOCKED` 事件
- `getUnlockedColors()` / `isUnlocked(color)` / `getAbility(color)` / `getAllAbilities()`
- `useBattleBarrel(color)` -- 战斗中使用木桶能力

### SkillGrowth

- 技能解锁条件管理，5 种触发类型: level / flag / rebuild / trust / quest
- `checkUnlocksForCharacter(charId)` / `checkAllUnlocks()`
- `getAvailableSkills(charId)` / `getNextUnlocks(charId)`

### RebuildSystem

- 城镇重建系统，12 个设施定义，解锁等级 1-5
- `addProgress(amount)` / `setLevel(level)` / `canRebuild(requirement)`
- `isFacilityUnlocked(facilityId)` / `getUnlockedFacilities()` / `getAllFacilities()` / `getFacilitiesForLevel(level)`

### MapAccess

- `getBlockedMapDialogueId(mapId, readFlag)` -- 检查地图访问限制，支持布尔标志和数值阈值两种模式
- `MapAccessFlagReader` -- 读取标志的函数类型

### SFXSynth

- 程序化音效合成（不依赖音频文件）
- 17 种音效方法: `playCursor/confirm/cancel/attackHit/attackSlash/magicCast/heal/itemUse/levelUp/openMenu/closeMenu/equip/getItem/encounter/step/warp/dialogue`

## 关键依赖与配置

- 依赖 `src/data/types.ts` 中的类型定义
- 依赖 `src/utils/constants.ts` 中的常量
- `GameData` 依赖 `GameConfigDatabase` 获取角色基础数据
- `GameData` 依赖 `START_INVENTORY_ITEMS`、`START_PARTY`、`TIME_MS_PER_SECOND` 等启动常量
- `AssetLoader` 依赖 `src/data/assets.ts`、`spriteCrops.ts`、`tileSprites.ts`

## 数据模型

- `LevelUpResult`: 升级结果 (charId, name, level)
- `BarrelColor`: 木桶颜色类型 (8 种)
- `RebuildFacility`: 重建设施定义 (12 个，解锁等级 1-5)
- `MapAccessFlagReader`: 地图访问标志读取函数类型
- `SaveMeta`: 存档元数据 (slot/timestamp/playTime/currentMap/preview)
- `KeyBindings`: 按键绑定接口
- `SkillUnlockCondition`: 技能解锁条件 (5 种触发类型)

## 测试与质量

7 个测试文件覆盖本模块：

| 测试文件 | 覆盖内容 |
|---------|---------|
| `tests/core/game-data.test.ts` | 重置状态、队伍加入、序列化/反序列化、真结局解锁、装备/经验 |
| `tests/core/event-bus.test.ts` | 注册/触发/移除监听器、上下文绑定、多监听器 |
| `tests/core/quest-system.test.ts` | 开始/推进/完成任务、事件发射、重复启动保护 |
| `tests/core/barrel-system.test.ts` | 解锁/能力查询/战斗使用/事件发射 |
| `tests/core/save-manager.test.ts` | 存读档往返、槽位校验、快速存档、元数据 |
| `tests/core/skill-growth.test.ts` | 解锁条件判定、防重复学习、等级/标志触发 |
| `tests/core/map-access.test.ts` | 无限制地图、布尔标志限制、数值阈值限制、对话 ID 有效性 |

## 相关文件清单

| 文件 | 说明 |
|------|------|
| `src/core/GameData.ts` | 全局游戏状态单例 (612 行) |
| `src/core/EventBus.ts` | 事件总线 (18 种事件) |
| `src/core/AssetLoader.ts` | 资源加载辅助 |
| `src/core/InputManager.ts` | 输入管理 (双键位) |
| `src/core/AudioManager.ts` | 音频管理 |
| `src/core/SaveManager.ts` | 存档管理 (含快速存档) |
| `src/core/QuestSystem.ts` | 任务系统 |
| `src/core/BarrelSystem.ts` | 木桶能力系统 (8 色) |
| `src/core/SkillGrowth.ts` | 技能成长系统 (5 种触发) |
| `src/core/RebuildSystem.ts` | 城镇重建系统 (12 设施) |
| `src/core/MapAccess.ts` | 地图访问控制 |
| `src/core/SFXSynth.ts` | 音效合成器 (17 种音效) |

## 变更记录 (Changelog)

| 时间 | 操作 | 说明 |
|------|------|------|
| 2026-05-22 14:10:48 | 新建 | 初始化模块文档 |
| 2026-05-22 15:52:17 | 增量更新 | 补充 GameEvents 完整18事件表、SaveManager 快速存档、SkillGrowth 5种触发、BarrelSystem 战斗使用、RebuildSystem 12设施、SFXSynth 17音效、GameData playTime/syncPlayTime/初始装备、7个测试文件覆盖说明 |
