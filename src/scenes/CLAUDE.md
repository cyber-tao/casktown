[根目录](../../CLAUDE.md) > [src](../) > **scenes**

# scenes -- 场景层

## 模块职责

Phaser 游戏场景层，负责游戏各阶段的画面渲染、用户交互和场景间切换。所有场景均继承自 `Phaser.Scene`。

## 入口与启动

场景注册在 `src/game.ts` 的 `CaskTownGame` 构造函数中，按以下顺序排列：

1. `BootScene` -- 启动初始化
2. `TitleScene` -- 标题画面
3. `MapScene` -- 地图探索（核心场景）
4. `BattleScene` -- 回合制战斗
5. `GameOverScene` -- 游戏结束
6. `DialogueOverlay` -- 对话覆盖层
7. `MenuOverlay` -- 主菜单覆盖层
8. `SettingsScene` -- 设置覆盖层
9. `ShopOverlay` -- 商店覆盖层
10. `TrainingOverlay` -- 训练覆盖层
11. `RebuildOverlay` -- 城镇重建覆盖层
12. `CodexOverlay` -- 图鉴覆盖层
13. `WorldMapOverlay` -- 世界地图覆盖层

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

各场景通过 `EventBus` 事件与其他场景/系统通信：

- **MapScene**: 监听 `BATTLE_END`、`DIALOGUE_END`、`MENU_CLOSE`、`SAVE_LOADED`、`FLAG_SET`
- **BattleScene**: 由 MapScene 通过 `BATTLE_START` 事件触发
- **DialogueOverlay**: 由 MapScene 通过 `DIALOGUE_START` 事件触发

## 关键依赖与配置

- `GameData` -- 读写全局游戏状态
- `EventBus` -- 场景间通信
- `AssetLoader` -- 资源加载辅助
- `InputManager` -- 统一输入处理
- `AudioManager` -- 音频播放
- `SaveManager` -- 存档管理
- `QuestSystem` -- 任务系统
- `RebuildSystem` -- 重建系统
- `constants` -- UI 布局常量

## 数据模型

场景不定义数据模型（除 `DialogueScript`），依赖 `src/data/types.ts` 中的类型。

### MapScene 内部类型

- `PartyHudRow` -- 队伍状态 HUD 行 (charId/hpBar/mpBar/hpText/mpText/levelText)
- `PartyHudObject` -- HUD 游戏对象联合类型

## 场景详细说明

### BootScene
- 启动入口，初始化 `GameData`，加载标题画面资源后跳转 TitleScene

### TitleScene
- 标题画面，提供"开始游戏/继续游戏/编辑器/设置/退出"入口

### MapScene (核心，最大场景)
- 瓦片地图渲染与碰撞检测
- 玩家移动（键盘/WASD/手柄/触控）
- NPC 交互与事件触发
- 野外敌人巡逻与追逐
- 小地图显示
- 天气系统（雨/雪）
- 跟随者系统
- **队伍状态 HUD**（PartyHudRow，显示 HP/MP/等级）
- 地图转场与快速存档/读档
- 地图访问限制检测（`getBlockedMapDialogueId`）

### BattleScene
- 回合制战斗系统
- 指令菜单：攻击/技能/道具/木桶/逃跑
- 技能子菜单、道具子菜单、木桶能力子菜单、连携技子菜单
- 多种 Boss AI（白虎/水妖/风驰/凤凰/麒麟/魑/魅/魍/魉/伪小爱/真小爱/无相）
- 战斗结果结算（经验/物品/金币/任务进度）

### MenuOverlay
- 9 项导航：预言之书/队伍/背包/技能/图鉴/地图/存档/设置/返回游戏
- 背包：分类浏览、使用/装备/卸下
- 队伍：角色详情、属性/装备查看
- 图鉴：怪物/物品/故事三页签
- 存档：多槽位存档/读档（含快速存档），显示游玩时间
- 设置：文字速度/战斗速度/难度/音量/全屏等

### DialogueOverlay
- 对话渲染、选项分支、语音播放
- `SPEAKER_FACE_MAP`：17 个说话者头像映射
- 自动文字换行 (`DIALOGUE_TEXT_WRAP_CHARS = 33`)

### ShopOverlay / TrainingOverlay / RebuildOverlay
- 商店购买、训练强化、城镇重建的交互界面

### CodexOverlay / WorldMapOverlay
- 图鉴浏览与世界地图查看

### SettingsScene / GameOverScene
- 设置界面与游戏结束画面

## 测试与质量

当前无场景测试文件。场景层涉及 Phaser 渲染，建议通过集成测试或 E2E 测试覆盖。

## 相关文件清单

| 文件 | 说明 |
|------|------|
| `src/scenes/BootScene.ts` | 启动场景 |
| `src/scenes/TitleScene.ts` | 标题场景 |
| `src/scenes/MapScene.ts` | 地图探索场景（含队伍状态 HUD） |
| `src/scenes/BattleScene.ts` | 战斗场景 |
| `src/scenes/DialogueOverlay.ts` | 对话覆盖层（导出 DialogueScript 类型） |
| `src/scenes/MenuOverlay.ts` | 主菜单覆盖层（含存档/游玩时间） |
| `src/scenes/SettingsScene.ts` | 设置覆盖层 |
| `src/scenes/ShopOverlay.ts` | 商店覆盖层 |
| `src/scenes/TrainingOverlay.ts` | 训练覆盖层 |
| `src/scenes/RebuildOverlay.ts` | 重建覆盖层 |
| `src/scenes/CodexOverlay.ts` | 图鉴覆盖层 |
| `src/scenes/WorldMapOverlay.ts` | 世界地图覆盖层 |
| `src/scenes/GameOverScene.ts` | 游戏结束场景 |

## 变更记录 (Changelog)

| 时间 | 操作 | 说明 |
|------|------|------|
| 2026-05-22 14:10:48 | 新建 | 初始化模块文档 |
| 2026-05-22 15:52:17 | 增量更新 | 补充 DialogueScript.onComplete 导出说明、MapScene 队伍状态 HUD、MenuOverlay 游玩时间显示、TitleScene 5项菜单、DialogueOverlay 头像映射与换行、SPEAKER_FACE_MAP 17角色 |
