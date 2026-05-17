# 木桶镇 / CaskTown

《木桶镇 / CaskTown》是一个面向浏览器的 2D 顶视角剧情 JRPG。玩家扮演少年 T，与慧慧、A、葱葱、sun 等伙伴探索木桶镇、奇妙森林、圣殿与生命之泉，通过剧情对话、回合制战斗、家园重建和预言之书系统推进主线。

项目当前使用 Phaser 3、TypeScript、Vite 和 Bun，资源由 Vite 的 `assets` 公共目录提供。

## 快速开始

```bash
bun install
```

```bash
bun run dev
```

开发服务器默认运行在 `http://localhost:5173`。

## 可用命令

| 命令 | 说明 |
| --- | --- |
| `bun run dev` | 启动 Vite 开发服务器 |
| `bun run build` | 执行 TypeScript 类型检查并构建到 `dist` |
| `bun run preview` | 预览生产构建结果 |
| `bun run sprites:refresh` | 根据 `img/sprites` 的图集与 JSON 元数据切分刷新 `assets/sprites` |

## 技术栈

| 类型 | 使用内容 |
| --- | --- |
| 运行时与包管理 | Bun |
| 游戏引擎 | Phaser 3 |
| 语言 | TypeScript |
| 构建工具 | Vite |
| 存档 | LocalStorage |

## 项目结构

```text
src/
  core/      全局系统与管理器
  data/      角色、任务、地图、敌人、物品、技能、对话和类型数据
  scenes/    Phaser 场景与 UI Overlay
  utils/     全局常量等工具定义
scripts/     开发时使用的脚本，例如刷新运行时 sprite 资源
assets/
  audio/     BGM、SFX 和语音资源
  sprites/   角色、场景、怪物、NPC、世界物件等图像资源
img/
  desiges/   美术设计参考图和整合预览图，不作为运行时资源直接加载
  sprites/   可切分的 sprite sheet、JSON 元数据和资源清单
doc/         游戏设计、剧情脚本、分支和战斗点文档
```

[img/sprites](img/sprites) 中的 JSON 采用类似 TexturePacker 的 `frames + meta` 结构，可用于按像素坐标切分图集；实际游戏加载使用 [assets/sprites](assets/sprites) 下的资源。

## 美术资源流程

1. 根据 [img/desiges](img/desiges) 下的角色、敌人、地图和环境设定集，创建或更新 [img/sprites](img/sprites) 中的图集 PNG 与对应 JSON 文件。
2. 运行 `bun run sprites:refresh`，脚本会读取 [img/sprites/pack_manifest.json](img/sprites/pack_manifest.json)，按 JSON 中的 frame 坐标切分所有图集。
3. 切分结果会刷新到 [assets/sprites](assets/sprites)，供 BootScene 和运行时代码加载。

## 关键文档

- [游戏设计文档](doc/CaskTown_Web_JRPG_GDD_v2.md)：产品定位、系统设计、地图结构、战斗节奏和 UI 目标。
- [剧情与分支文档](doc/CaskTown_Full_Script_Branches_BattlePoints.md)：完整剧情脚本、角色代号、分支变量、真结局条件和战斗触发点。

## 开发提示

- 入口文件是 [src/main.ts](src/main.ts)，Phaser 配置在 [src/game.ts](src/game.ts)。
- 启动资源加载集中在 [src/scenes/BootScene.ts](src/scenes/BootScene.ts)。
- 全局游戏状态由 [src/core/GameData.ts](src/core/GameData.ts) 管理。
- 跨场景通信使用 [src/core/EventBus.ts](src/core/EventBus.ts)。
- 新增常量统一放在 [src/utils/constants.ts](src/utils/constants.ts)。
