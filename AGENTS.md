# CaskTown 代理开发指南

## 项目速览

- 这是一个基于 Phaser 3、TypeScript 和 Vite 的 2D 顶视角剧情 JRPG 网页游戏。
- 运行入口是 [src/main.ts](src/main.ts)，Phaser 配置在 [src/game.ts](src/game.ts)，启动加载流程从 [src/scenes/BootScene.ts](src/scenes/BootScene.ts) 进入标题场景。
- 游戏设计以 [doc/CaskTown_Web_JRPG_GDD_v2.md](doc/CaskTown_Web_JRPG_GDD_v2.md) 为准；剧情、分支和战斗点参考 [doc/CaskTown_Full_Script_Branches_BattlePoints.md](doc/CaskTown_Full_Script_Branches_BattlePoints.md)。不要把这些文档的大段内容复制进代码或说明文件。

## 常用命令

- 安装依赖：`bun install`
- 本地开发：`bun run dev`
- 类型检查与构建：`bun run build`
- 预览构建结果：`bun run preview`
- 切分并刷新运行时 sprite：`bun run sprites:refresh`

## 架构边界

- [src/core](src/core) 放全局管理器和系统能力，现有管理器采用 `static getInstance()` 单例模式。
- [src/data](src/data) 放角色、任务、地图、敌人、物品、技能、对话和类型定义；新增玩法数据时优先补齐这里的配置，再让场景消费。
- [src/scenes](src/scenes) 放 Phaser 场景与 UI Overlay；跨场景行为优先通过 [src/core/EventBus.ts](src/core/EventBus.ts) 的 `EventBus` 和 `GameEvents` 通信。
- [src/utils/constants.ts](src/utils/constants.ts) 放全局常量；新增或重构时不要引入新的魔法数字和临时常量。
- `assets` 是 Vite 的 `publicDir`，运行时资源路径相对该目录；例如 BootScene 设置 `sprites` 作为图像加载根路径。
- [img/desiges](img/desiges) 放设计参考图和整合预览图，用于理解角色、敌人、地图和环境美术方向，不作为运行时资源直接加载。
- [img/sprites](img/sprites) 放重生成的 sprite sheet、切图 JSON 元数据和 manifest，用于资源切分、生成或对照；运行时代码引用资源前仍需确认最终文件已放入 [assets/sprites](assets/sprites) 并完成预加载。
- [scripts](scripts) 放开发时使用的脚本；例如根据 [img/sprites](img/sprites) 的图集和 JSON 元数据切分刷新 [assets/sprites](assets/sprites)。

## 美术资源流程

- 先根据 [img/desiges](img/desiges) 下的设定集创建或更新 [img/sprites](img/sprites) 中的图集 PNG 与对应 JSON 元数据。
- 再运行 `bun run sprites:refresh`，脚本会读取 [img/sprites/pack_manifest.json](img/sprites/pack_manifest.json)，按 frame 坐标切分并刷新 [assets/sprites](assets/sprites) 下的运行时 PNG。
- 刷新后检查 BootScene 中的资源 key、文件路径和实际输出文件是否一致。

## 开发规则

- 优先复用 Phaser API、现有 core 管理器和 data 配置表，不为已有能力另建平行实现。
- 修改 `GameData` 状态结构时，同步检查默认值、`reset()`、`serialize()`、`deserialize()`、相关类型和读档后的场景刷新逻辑。
- 新增跨场景事件时，先在 `GameEvents` 中定义事件名，再在生产者和消费者之间传递明确的数据结构。
- 新增资源时，确认文件路径、资源 key、BootScene 预加载和使用处一致；避免让场景引用未加载的 sprite/audio。
- 日志与异常输出使用英文，并保持分级清晰；不要留下调试用 `console.log()`。
- 除非用户明确要求，不新增测试代码、注释、说明文档或无关重构。

## 角色配音设定

- 角色配音参数（语音 ID、语速、音调、性格风格）定义在 [voice_profiles.md](voice_profiles.md) 中。
- 生成配音时必须参照该表选择正确的 Voice ID 和参数，确保性别和口音与角色一致。
- 配音文本来源为 [voice_lines.json](voice_lines.json)，生成命令参考 voice_profiles.md 末尾的"配音生成规范"。
- **关键角色性别**：慧慧、sun、xiaoai、熙苑、水瑶、凤凰 为女性；T、阿博、葱葱、镇长、菠萝大叔、船夫、风赤 为男性；木桶精灵和无相 为无性别。

## 常见修改路径

- 新角色：更新角色数据、角色 sprite、BootScene 预加载，以及地图/战斗中需要引用的 ID。
- 新任务：更新任务数据，在对话或地图事件中通过 `QuestSystem` 推进任务，并确保奖励与重建/分支状态一致。
- 新地图：更新地图数据、资源加载、进入条件和地图切换事件，地图 ID 需与剧情脚本保持一致。
- 新战斗：更新敌人与 encounter 数据，通过 `GameEvents.BATTLE_START` 触发，并检查战斗结束后的任务、分支和掉落处理。
- 新 UI Overlay：保持 Phaser Scene 生命周期清晰，输入焦点、打开/关闭事件和音效反馈要与现有 Overlay 风格一致。
