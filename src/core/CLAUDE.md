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
- `setFlag(key, value)` / `getFlag(key)` / `hasFlag(key)` -- 游戏标志管理（数值分支走 `addBranch`；`rebuild_level` 取 max）
- `addBranch(key, amount)` / `setBranch(key, value)` / `updateBranch(key, value)` -- 分支写入（`updateBranch` 即 `setBranch`）
- `setRebuildLevel(level)` -- 重建等级唯一真相源（同步 branches/flags/设施）
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
- 事件常量定义在 `GameEvents` 中，当前为 **7** 种存活事件（开 Overlay/战斗用 `scene.launch`，不靠空 emit）：

| 事件 | 载荷 |
|------|------|
| `DIALOGUE_END` | data?: { actions?: EventAction[]; missing?: boolean } |
| `BATTLE_END` | victory: boolean, result?: { escaped?: boolean } |
| `MENU_CLOSE` | 无 |
| `FLAG_SET` | key: string, value: unknown |
| `QUEST_UPDATE` | questId: string, state: QuestState |
| `GAME_OVER` | 无 |
| `SAVE_LOADED` | 无 |

### AssetLoader

- `queueImageAsset(scene, key)` / `queueImageAssets(scene, keys)` -- 图片资源排队加载
- `collectMapTileTextureKeys(mapData)` -- 收集地图瓦片纹理键
- `collectMapImageKeys(mapData, partyIds)` -- 收集地图图片键
- `collectBattleImageKeys(encounterId, partyIds, mapId?)` -- 收集战斗图片键
- `processTileTextures(scene, keys)` -- 处理瓦片纹理
- `resolveBattleBackgroundKey(encounterId, mapId?)` -- 解析战斗背景键
- `unloadUnusedMapTextures(scene, previousKeys, nextKeys, retainKeys?)` -- 切图时卸载上一张地图专属纹理

### MapEventRuntime

- 地图场事件运行时：暂停原因、pending restart、两阶段 commit（成功后再写 chest/field-done）
- 由 `MapScene` 通过 host 回调驱动；缺对话/战斗失败不错误完成事件

### InputManager

- 键盘输入管理，支持方向键和 WASD 两套键位
- 接口: `KeyBindings` 类型（up/down/left/right/confirm/cancel/menu/dash）
- 显示名映射: `KEY_DISPLAY_NAMES`

### AudioManager

- BGM/SFX/语音播放管理
- `pushScene` / `popScene` -- scene 音频所有权栈；BGM load 回调校验宿主 scene 仍可用

### SaveManager

- `SAVE_KEY = 'casktown_save'`
- `SaveMeta` 接口（含 slot/timestamp/playTime/currentMap/preview）
- `QUICK_SAVE_SLOT = SAVE_SLOTS + 1 = 4`
- 浏览器 localStorage 存档
- `save(slot)` / `load(slot)` / `hasSave(slot)` / `deleteSave(slot)` / `getSaveMeta(slot)` / `getAllSaveMeta()`

### QuestSystem

- 任务状态管理（inactive/active/completed/failed）
- `startQuest` / `advanceQuest` / `completeQuest` / `failQuest` 返回 `QuestMutationResult`；非法状态 `console.warn`（英文）并失败可观测
- `getQuestState(questId)` / `isQuestActive(questId)` / `getActiveQuests()`

### BarrelSystem

- 木桶能力系统，8 种颜色: green/blue/gold/cyan/white/vermillion/black/rainbow
- 每种颜色对应不同能力效果（mapEffect + battleEffect）
- `unlock(color)` -- 解锁（写 flag；不再发射已删除的 `BARREL_UNLOCKED`）
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

核心相关测试（节选）：

| 测试文件 | 覆盖内容 |
|---------|---------|
| `tests/core/game-data.test.ts` | 重置、队伍、序列化、真结局解锁、分支边界 |
| `tests/core/event-bus.test.ts` | 注册/触发/移除、存活事件契约 |
| `tests/core/quest-system.test.ts` | 开始/推进/完成、非法状态结果 |
| `tests/core/barrel-system.test.ts` | 解锁/能力查询/战斗使用 |
| `tests/core/audio-manager.test.ts` | BGM 解锁、scene 宿主、音量 |
| `tests/core/event-action-executor.test.ts` | 状态动作执行与失败原因 |
| `tests/core/map-event-state.test.ts` | chest/field 完成标志 |
| `tests/core/save-manager.test.ts` | 存读档、快速存档 |
| `tests/core/skill-growth.test.ts` | 解锁条件 |
| `tests/core/map-access.test.ts` | 地图访问限制 |

## 相关文件清单

| 文件 | 说明 |
|------|------|
| `src/core/GameData.ts` | 全局游戏状态单例 |
| `src/core/EventBus.ts` | 事件总线（7 种存活事件） |
| `src/core/MapEventRuntime.ts` | 地图事件运行时 |
| `src/core/MapEventState.ts` | 场事件完成标志 |
| `src/core/EventActionExecutor.ts` | 状态类事件动作 |
| `src/core/EventConditions.ts` | 事件条件判定 |
| `src/core/DialogueCompletionQueue.ts` | 对话完成动作队列 |
| `src/core/BattleRewards.ts` | 战斗奖励结算 |
| `src/core/AssetLoader.ts` | 资源加载与纹理卸载 |
| `src/core/InputManager.ts` | 输入管理 |
| `src/core/AudioManager.ts` | 音频管理（scene 栈） |
| `src/core/SettingsManager.ts` | 设置持久化 |
| `src/core/SaveManager.ts` | 存档管理 |
| `src/core/QuestSystem.ts` | 任务系统 |
| `src/core/BarrelSystem.ts` | 木桶能力系统 |
| `src/core/SkillGrowth.ts` | 技能成长系统 |
| `src/core/RebuildSystem.ts` | 城镇重建系统 |
| `src/core/MapAccess.ts` | 地图访问控制 |
| `src/core/ProphecyConditions.ts` | 预言之书解锁条件 |
| `src/core/SFXSynth.ts` | 音效合成器 |

## 变更记录 (Changelog)

| 时间 | 操作 | 说明 |
|------|------|------|
| 2026-05-22 14:10:48 | 新建 | 初始化模块文档 |
| 2026-05-22 15:52:17 | 增量更新 | 补充 GameEvents、SaveManager、SkillGrowth、BarrelSystem、RebuildSystem、SFXSynth、GameData playTime |
| 2026-07-20 | 同步架构 | EventBus 精简为 7 事件；补充 branch/rebuild API、MapEventRuntime、纹理卸载、Audio scene 栈、QuestMutationResult |
