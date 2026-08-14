[根目录](../../CLAUDE.md) > [src](../) > **scenes**

# scenes -- 场景层

## 模块职责

Phaser 游戏场景层，负责游戏各阶段的画面渲染、用户交互和场景间切换。所有场景均继承自 `Phaser.Scene`。大型场景按子模块拆分：地图事件运行时在 `src/core/MapEventRuntime.ts`，战斗/菜单/地图 HUD 辅助在本目录子文件夹。

## 入口与启动

场景注册在 `src/game.ts` 的 `CaskTownGame` 构造函数中，按以下顺序排列：

1. `BootScene` -- 启动初始化
2. `TitleScene` -- 标题画面
3. `MapScene` -- 地图探索（核心场景）
4. `BattleScene` -- 回合制战斗
5. `GameOverScene` -- 游戏结束
6. `DialogueOverlay` -- 对话覆盖层
7. `MenuOverlay` -- 主菜单覆盖层（含图鉴页）
8. `SettingsScene` -- 设置覆盖层
9. `ShopOverlay` -- 商店覆盖层
10. `TrainingOverlay` -- 训练覆盖层
11. `RebuildOverlay` -- 城镇重建覆盖层
12. `WorldMapOverlay` -- 世界地图覆盖层

已移除独立的 `CodexOverlay`；图鉴仅通过 `MenuOverlay` 的图鉴页访问。

## 对外接口

### DialogueScript 类型定义

`DialogueOverlay.ts` 导出 `DialogueScript` 接口，被 `src/data/dialogues.ts` 引用：

```typescript
export interface DialogueScript {
  id: string
  lines: DialogueLine[]
  onComplete?: EventAction[]
}
```

### 场景间通信

跨场景回程与状态同步走 `EventBus` / `GameEvents`（见 `src/core/EventBus.ts`）。战斗与对话的**打开**由 `scene.launch` / `scene.start` 完成，不再使用已删除的 `BATTLE_START` / `DIALOGUE_START` 空事件。

- **MapScene**: 监听 `BATTLE_END`、`DIALOGUE_END`、`MENU_CLOSE`、`SAVE_LOADED`、`FLAG_SET`；缺对话时 `DIALOGUE_END` 可带 `{ missing: true }`，不错误完成场事件
- **BattleScene**: 由 MapScene（或视觉 QA）`scene.launch('BattleScene', …)` / `scene.start` 启动；结束时 emit `BATTLE_END`
- **DialogueOverlay / MenuOverlay 等**: 由 MapScene `launch`；关闭时 emit `DIALOGUE_END` / `MENU_CLOSE`

## 关键依赖与配置

- `GameData` -- 读写全局游戏状态
- `EventBus` -- 场景间回程与标志同步
- `MapEventRuntime` -- 地图事件两阶段 commit、暂停与 pending restart
- `AssetLoader` -- 资源加载与地图纹理卸载
- `InputManager` -- 统一输入处理
- `AudioManager` -- 音频播放（scene 所有权栈）
- `SaveManager` -- 存档管理
- `QuestSystem` -- 任务系统
- `RebuildSystem` -- 重建系统
- `constants` -- UI 布局常量

## 数据模型

场景不定义数据模型（除 `DialogueScript`），依赖 `src/data/types.ts` 中的类型。

### Map / Menu 辅助类型

- `map/MapPartyHud.ts` -- 队伍状态 HUD
- `menu/types.ts` -- 菜单页签与行数据
- `battle/BattleUnit.ts` -- 战斗单位视图模型

## 场景详细说明

### BootScene
- 启动入口，初始化 `GameData`，加载标题资源；支持 `?qa=mainline` / `?qa=normal` 故事 QA，以及 `?qa=battle` / `battle-final` / `battle-heart` 战斗视觉 QA

### TitleScene
- 标题画面，提供"开始游戏/继续游戏/编辑器/设置/退出"入口

### MapScene
- 瓦片地图渲染与碰撞、玩家移动、NPC/场事件（委托 `MapEventRuntime`）
- 野外敌人巡逻、小地图、天气、跟随者
- 队伍 HUD / 触控：`map/MapPartyHud.ts`、`map/MapTouchControls.ts`
- 场事件成功后才标记 chest / field-done；重建等级变化在 Overlay/战斗中 defer `scene.restart`
- 切图时卸载上一张地图专属纹理

### BattleScene
- 回合制战斗胶水层；子模块：`battle/BattleUnit.ts`、`battle/BattleCommandUI.ts`、`battle/enemyAi.ts`
- 指令：攻击/技能/道具/木桶/逃跑/连携
- Boss AI 含心影与无相等；结算经验/物品/金币/任务进度

### MenuOverlay
- 导航：预言之书/队伍/背包/技能/图鉴/存读档/设置/返回（世界地图经 M 键或小地图进入）
- 纯逻辑辅助：`menu/inventoryHelpers.ts`、`codexHelpers.ts`、`saveHelpers.ts`、`settingsHelpers.ts`、`partyHelpers.ts`、`types.ts`
- 图鉴：怪物/物品/故事三页签（不再使用独立 Codex 场景）

### DialogueOverlay
- 对话渲染、选项、语音；有脸/无脸布局（`DIALOGUE_TEXT_FACELESS_*`）
- 头像映射：`src/data/dialoguePortraits.ts` 的 `DIALOGUE_SPEAKER_FACE_MAP`
- 缺失脚本时结束载荷带 `missing: true`

### ShopOverlay / TrainingOverlay / RebuildOverlay / WorldMapOverlay
- 商店、训练、重建、世界地图交互界面

### SettingsScene / GameOverScene
- 设置界面与游戏结束画面

## 测试与质量

场景相关测试：

| 测试文件 | 覆盖内容 |
|---------|---------|
| `tests/scenes/map-scene-interaction.test.ts` | 地图交互、事件完成语义、重建 defer restart |
| `tests/scenes/battle-scene.test.ts` | 战斗场景行为 |
| `tests/qa/mainline-qa.test.ts` | 真结局 / 普通结局+后日谈逻辑 QA |

## 相关文件清单

| 文件 | 说明 |
|------|------|
| `src/scenes/BootScene.ts` | 启动场景 |
| `src/scenes/TitleScene.ts` | 标题场景 |
| `src/scenes/MapScene.ts` | 地图探索场景 |
| `src/scenes/map/MapPartyHud.ts` | 队伍 HUD |
| `src/scenes/map/MapTouchControls.ts` | 触控控件 |
| `src/core/MapEventRuntime.ts` | 地图事件运行时（由 MapScene 使用） |
| `src/scenes/BattleScene.ts` | 战斗场景 |
| `src/scenes/battle/*` | 战斗单位/指令 UI/敌人 AI |
| `src/scenes/DialogueOverlay.ts` | 对话覆盖层 |
| `src/scenes/MenuOverlay.ts` | 主菜单（含图鉴） |
| `src/scenes/menu/*` | 菜单面板辅助 |
| `src/scenes/SettingsScene.ts` | 设置覆盖层 |
| `src/scenes/ShopOverlay.ts` | 商店覆盖层 |
| `src/scenes/TrainingOverlay.ts` | 训练覆盖层 |
| `src/scenes/RebuildOverlay.ts` | 重建覆盖层 |
| `src/scenes/WorldMapOverlay.ts` | 世界地图覆盖层 |
| `src/scenes/GameOverScene.ts` | 游戏结束场景 |

## 变更记录 (Changelog)

| 时间 | 操作 | 说明 |
|------|------|------|
| 2026-05-22 14:10:48 | 新建 | 初始化模块文档 |
| 2026-05-22 15:52:17 | 增量更新 | 补充 DialogueScript.onComplete、队伍 HUD、Menu 游玩时间、Title 菜单、对话头像映射 |
| 2026-07-20 | 同步架构 | 移除 CodexOverlay；记录 Map/Battle/Menu 子模块拆分、EventBus 精简与 launch 开场景、场事件两阶段 commit 与 QA 入口 |
| 2026-07-21 | 全量审核同步 | 修正菜单导航为 8 项（无地图页） |
