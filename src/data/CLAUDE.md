[根目录](../../CLAUDE.md) > [src](../) > **data**

# data -- 数据定义层

## 模块职责

游戏的静态数据表与类型声明。所有游戏内容以 TypeScript 常量/Record 的形式定义在此模块。同时提供 `GameConfigDatabase` 用于运行时数据覆盖与持久化。

## 入口与启动

- `types.ts` -- 全局类型定义，被所有模块引用
- `configDatabase.ts` -- `GameConfigDatabase` 单例，聚合所有数据表，提供 CRUD 与持久化
- `GAME_CONFIG_DATABASE` -- 导出的数据库实例，编辑器和游戏共用

## 对外接口

### 类型定义 (types.ts)

| 类型 | 说明 |
|------|------|
| `CharacterStats` | 角色属性 (hp/mp/maxHp/maxMp/atk/def/matk/mdef/speed/level/exp/expToNext) |
| `CharacterData` | 角色数据 (id/name/stats/skills/equipment/tp) |
| `SkillData` | 技能数据 (id/name/type/target/element/power/costMp/costTp/description/effects) |
| `ItemData` | 物品数据 (id/name/type/effect/description/usableInBattle/usableInField/price) |
| `EnemyData` | 敌人数据 (id/name/stats/skills/element/weakness/resistance/drops/exp/gold/isBoss/aiType) |
| `EncounterData` | 遭遇数据 (id/enemies/background/bgm/victoryFlag/questId/questProgress/rewards) |
| `MapData` | 地图数据 (id/name/width/height/tileset/layers/collisions/events/encounters/bgm/connections) |
| `MapEvent` | 地图事件 (id/x/y/width/height/type/trigger/sprite/direction/actions/conditions/fieldBehavior) |
| `EventAction` | 事件动作联合类型（16 种：dialogue/battle/transfer/questStart/questAdvance/questComplete/setFlag/setBranch/adjustTrust/adjustMercy/addItem/addParty/rebuild/shop/training/rebuildMenu） |
| `DialogueLine` | 对话行 (speaker/text/emotion/choices) |
| `DialogueChoice` | 对话选项 (text/next/actions/condition) |
| `DialogueData` | 对话数据 (id/lines) |
| `QuestDef` / `QuestState` | 任务定义与状态 |
| `BranchState` | 分支剧情状态（信赖值/慈悲值/重建等级/预言模式/记忆碎片/各结局标志） |
| `FieldEntityBehavior` / `FieldEntityMode` | 野外实体行为 (idle/wander/guard/chase/ambush) |
| `Inventory` | 背包 (items: Record<string, number>, equipment: Record<string, number>) |
| `MapLayer` / `MapConnection` / `EventCondition` | 地图辅助类型 |

### 数据表

| 文件 | 导出 | 说明 |
|------|------|------|
| `characters.ts` | `INITIAL_CHARACTERS`, `createCharacter()` | 初始角色数据 |
| `skills.ts` | `SKILLS` | 技能表 |
| `items.ts` | `ITEMS` | 物品表 |
| `enemies.ts` | `ENEMIES` | 敌人表 |
| `encounters.ts` | `ENCOUNTERS` | 遭遇表 |
| `maps.ts` | `MAPS`, `getMap()` | 地图表（2155+ 行） |
| `dialogues.ts` | `DIALOGUES`, `DIALOGUE_ALIASES` | 对话脚本表（2870+ 行） |
| `quests.ts` | `QUESTS` | 任务表 |
| `prophecies.ts` | `PROPHECIES`, `ProphecyVerse` | 预言诗句表 |
| `equipment.ts` | `EQUIP_STAT_BONUSES`, `EQUIP_SLOT_MAP`, `EQUIPMENT_SLOTS`, `createEmptyEquipStats()` | 装备属性加成与槽位 |
| `tileSprites.ts` | `TILE_SPRITES` | 瓦片精灵映射表 |
| `spriteCrops.ts` | `SPRITE_CROPS`, `SpriteCropConfig` | 精灵裁剪配置 |
| `assets.ts` | `IMAGE_ASSETS` | 图片资源路径映射 |
| `audio.ts` | `BGM_TRACKS`, `SFX_TRACKS`, `MAP_BGM_MAP`, `BGMConfig`, `SFXConfig` | 音频配置 |

### DialogueScript (定义在 DialogueOverlay.ts)

对话脚本类型，不在 `types.ts` 中，而在 `src/scenes/DialogueOverlay.ts` 中定义：

```typescript
export interface DialogueScript {
  id: string
  lines: DialogueLine[]
  onComplete?: EventAction[]  // 对话完成时自动触发的动作链
}
```

### GameConfigDatabase

- `getTable(key)` / `setTable(key, value)` -- 数据表 CRUD
- `setRecord(key, recordId, value)` / `deleteRecord(key, recordId)` -- 单条记录 CRUD（支持 Record 和 Array 两种表类型）
- `reset()` -- 重置为默认值并清除 localStorage
- `exportSnapshot()` / `importSnapshot(snapshot)` -- 导出/导入
- `persist()` -- 持久化到 localStorage
- `cloneConfigData<T>(value)` -- 深拷贝工具（优先 structuredClone，回退 JSON.parse）

## 深度扫描：对话系统 (dialogues.ts)

### 规模统计

| 指标 | 数值 |
|------|------|
| 对话条目 (DIALOGUES) | 259+ |
| 别名扩展 (DIALOGUE_ALIASES) | 38 |
| 有效对话节点 | ~297 |
| 不同说话者 | 36 |
| 带分支选项的对话 | 35 |
| 总分支选项数 | ~110 |
| 战斗触发对话 | ~42 |
| 商店入口 | 5 |
| 技能解锁事件 | 10+ |

### ID 命名规范

| 模式 | 示例 | 说明 |
|------|------|------|
| `DIA_XXX_NAME` | `DIA_001_START` | 主线对话，X 为章节编号 |
| `DIA_SIDE_CHAR_XX` | `DIA_SIDE_HH_01` | 角色支线（HH=慧慧, A=阿博, CC=葱葱, SUN=sun, XAI=xiaoai） |
| `DIA_NPC_REBUILDN_CHAR` | `DIA_NPC_REBUILD1_PINE` | NPC 对话，按重建等级 0-5 分类 |
| `DIA_REGION_*` | `DIA_FOREST_ENTRANCE` | 区域探索对话 |
| `DIA_LOCKED_*` | `DIA_LOCKED_TEMPLE` | 区域锁定提示 |
| `DIA_SHOP_*` / `DIA_TRAINING` | `DIA_SHOP_PINE` | 设施入口 |
| `DIA_REBUILD_BOARD` | - | 重建公告板 |

### 别名系统

`DIALOGUE_ALIASES` 将旧版/简化 ID 映射到正式对话，支持 `includeOnComplete` 选项决定是否携带目标对话的 `onComplete` 动作。38 个别名保持向后兼容。

### onComplete 动作链

对话完成后可自动触发事件动作（如设置标志、给予物品、开启任务等）。此机制替代了部分原本需要在地图事件中手动触发的逻辑。

预定义的 `onComplete` 动作集：
- `MAYOR_STORY_COMPLETION_ACTIONS`: 镇长对话完成（给预言之书/父亲装备/开启任务）
- `FOREST_PARTY_JOIN_BATTLE_ACTIONS`: 森林加入战斗
- `CONGCONG_JOIN_COMPLETION_ACTIONS`: 葱葱入队
- `XIYUAN_SACRED_WATER_COMPLETION_ACTIONS`: 熙苑问答完成（获圣水/完成任务/开启新任务）

### 章节结构

| 章节 | 对话数 | 编号范围 |
|------|--------|----------|
| 序章：盛典之日 | 12 | DIA_001-005 |
| 第一篇：重建家园 | 16 | DIA_101-104 |
| 圣水殿 | 11 | DIA_201-203 |
| 神殿路与重建 | 16 | DIA_301-305 |
| 第二篇：生命之泉 | 26 | DIA_401-430 |
| 第三篇：魔宫决战 | 13 | DIA_501-530 |
| 结局（普通+真） | 16 | DIA_601, 701-730 |
| 角色支线 | 19 | DIA_SIDE_* |
| 城镇NPC | 31 | DIA_NPC_* |
| 区域探索 | 25 | DIA_REGION_* |
| 锁定提示 | 23 | DIA_LOCKED_* |

### 分支结构类型

1. **线性单分支** -- NPC 闲聊、场景过渡
2. **多选项分支** -- `choices` 数组，含 `text`/`next`/`actions`/`condition`
3. **问答分支** -- 熙苑问答（5 题，错误触发惩罚战斗）
4. **连锁分支** -- 轮回道记忆碎片选择链
5. **结局分支** -- DIA_530_CHOICE -> 普通结局/真结局

### 角色列表（36 个说话者）

主角(T)、慧慧、阿博(A)、葱葱、sun、xiaoai、镇长/大伯、菠萝大叔、白虎、熙苑、水瑶、风赤、凤凰、麒麟、祀神、无相、木桶精灵、船夫、药草商、铁匠、渔民、行商人、旅店老板、森林精灵、旁白、系统、预言、UNKNOWN 等

### 关键游戏标志

- `trust_huihui/a/congcong/sun` -- 角色信赖度
- `mercy_score` -- 慈悲值（影响结局）
- `xiaoai_memory_fragments` -- 记忆碎片（>=3 解锁真结局）
- `rebuild_level` -- 重建等级（0-5）
- `congcong_joined` / `met_mayor` / `released_four_seals` / `xiaoai_purified` / `true_route_unlocked`
- `has_millennium_seed` / `has_sacred_water` / `has_divine_laurel` -- 三神器收集

## 深度扫描：地图系统 (maps.ts)

### 规模统计

| 指标 | 数值 |
|------|------|
| 总地图数 | **27** |
| NPC 位置 | 15 (10 个唯一 NPC) |
| 事件触发器 | **108** |
| 地图连接 | 36 |
| 宝箱 | 17 |
| Boss 战 | 13 |
| 有随机遇敌的地图 | 13 |

### 地图 ID 编号规则

| 百位 | 区域 | 地图 |
|------|------|------|
| 00X | 木桶镇 | 001(荒芜), 002(重建) |
| 01X | 奇妙森林 | 010(入口), 011(围湖), 012(祭台) |
| 02X | 码头 | 020(航路) |
| 03X | 圣水殿 | 030(外路), 031(大厅) |
| 04X | 神殿 | 040(山路), 041(七色路), 042(神殿) |
| 05X | 生命之泉 | 050(入口), 051-054(四灵), 055(轮回道) |
| 06X | 魔宫 | 060(入口), 061(沼泽), 062(大厅), 063(地下) |
| 07X | 最终 | 070(人心之渊) |

### Boss 战分布

| Boss | 地图 | 条件 |
|------|------|------|
| 白虎 | MAP_011 | 无 |
| 千年树种 | MAP_012 | puzzle_trees_solved |
| 水瑶风赤 | MAP_030 | 一次性 |
| 熙苑测验 | MAP_031 | 一次性 |
| 凤凰麒麟 | MAP_041 | 一次性 |
| 魑(青龙) | MAP_051 | seal_qinglong 未解封 |
| 魅(白虎) | MAP_052 | seal_baihu 未解封 |
| 魍(朱雀) | MAP_053 | seal_zhuque 未解封 |
| 魉(玄武) | MAP_054 | seal_xuanwu 未解封 |
| xiaoai 影 | MAP_055 | dream_active |
| 假 xiaoai | MAP_062 | 一次性 |
| xiaoai 真身 | MAP_063 | fake_xiaoai_defeated |
| 无相 | MAP_070 | 最终 Boss |

## 关键依赖

- `types.ts` 是零依赖的类型文件
- 所有数据表文件依赖 `types.ts`
- `dialogues.ts` 依赖 `DialogueScript` 类型（定义在 `src/scenes/DialogueOverlay.ts`）
- `configDatabase.ts` 依赖所有数据表文件，聚合为 `GameConfigTables`
- `equipment.ts` 依赖 `CharacterData` 和 `CharacterStats`

## 测试与质量

3 个测试文件覆盖本模块：

| 测试文件 | 覆盖内容 |
|---------|---------|
| `tests/data/config-database.test.ts` | cloneConfigData 深拷贝、GameConfigDatabase CRUD、持久化、导入导出 |
| `tests/data/data-integrity.test.ts` | 所有数据表字段完整性、引用有效性（技能/物品/敌人交叉引用） |
| `tests/data/game-content.test.ts` | 地图几何校验、事件动作 ID 引用验证、对话选择分支解析、遭遇/敌人/任务 ID 一致性 |

## 相关文件清单

| 文件 | 说明 |
|------|------|
| `src/data/types.ts` | 全局类型定义 (218 行) |
| `src/data/characters.ts` | 角色数据 + `createCharacter()` |
| `src/data/skills.ts` | 技能数据 |
| `src/data/items.ts` | 物品数据 |
| `src/data/enemies.ts` | 敌人数据 |
| `src/data/encounters.ts` | 遭遇数据 |
| `src/data/maps.ts` | 地图数据 (2155+ 行) |
| `src/data/dialogues.ts` | 对话脚本 (2870+ 行, 含别名和 onComplete) |
| `src/data/quests.ts` | 任务数据 |
| `src/data/prophecies.ts` | 预言诗句 |
| `src/data/equipment.ts` | 装备配置 + `createEmptyEquipStats()` |
| `src/data/tileSprites.ts` | 瓦片精灵映射 |
| `src/data/spriteCrops.ts` | 精灵裁剪配置 |
| `src/data/assets.ts` | 图片资源映射 |
| `src/data/audio.ts` | 音频配置 (BGMConfig/SFXConfig) |
| `src/data/configDatabase.ts` | 配置数据库 (180 行) |

## 变更记录 (Changelog)

| 时间 | 操作 | 说明 |
|------|------|------|
| 2026-05-22 14:10:48 | 新建 | 初始化模块文档 |
| 2026-05-22 | 深度扫描 | 补充对话系统分析和地图系统分析 |
| 2026-05-22 15:52:17 | 增量更新 | 修正EventAction为16种、补充DialogueScript.onComplete机制、别名includeOnComplete选项、预定义onComplete动作集、游戏标志详情、3个测试文件覆盖、装备模块createEmptyEquipStats |
