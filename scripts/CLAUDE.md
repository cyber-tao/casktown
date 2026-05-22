[根目录](../CLAUDE.md) > **scripts**

# scripts -- 构建与工具脚本

## 模块职责

游戏资源的构建、处理与生成脚本。涵盖精灵图集修复/拆分、物品图标程序化生成、语音同步/生成三条工具链。

## 入口与启动

所有脚本通过 `bun run` 执行，无交互式界面。

```bash
bun run scripts/<script>.ts
```

## 脚本清单

### 共享配置

| 文件 | 说明 |
|------|------|
| `constants.ts` | 共享常量：路径、输出格式、图像处理参数、语音采样率(32000Hz)、图标网格(96x96) |
| `voice-config.ts` | 19 个角色的语音配置：语音 ID、语速、音高（使用 MiniMax 语音合成 API） |

### 精灵工具链

执行顺序：`repair` -> `refresh`

| 脚本 | 说明 | 输入 | 输出 |
|------|------|------|------|
| `repair-sprite-atlases.ts` | 修复图集背景污染和边缘出血 | `img/sprites/*.png+json` | 修改后的 `img/sprites/` |
| `refresh-sprites.ts` | 将图集拆分为独立 PNG | `img/sprites/` + `pack_manifest.json` | `assets/sprites/<category>/*.png` |

**repair 算法**：BFS 连通背景清理 -> 成分分析 -> 过滤次要成分（细线/小块/角落残留）-> 回写

**refresh 算法**：读取帧信息 -> 提取单帧 -> 自动 trim 透明边界 -> 居中放置正方形画布(+2px边距) -> 按类别输出

### 语音工具链

执行顺序：`sync` -> `generate`

| 脚本 | 说明 | 输入 | 输出 |
|------|------|------|------|
| `sync-voice-lines.ts` | 从对话数据同步语音索引 | `src/data/dialogues.ts` | `voice_lines.json` |
| `generate_voices.ts` | 批量生成语音 OGG 文件 | `voice_lines.json` | `assets/audio/voice/*.ogg` |

**generate 依赖**：`mmx` CLI (MiniMax) + `ffmpeg`
**generate 限制**：环境变量 `VOICE_GENERATION_LIMIT=N` 控制单次生成数量，最多重试 2 次

### 图标生成

| 脚本 | 说明 | 输入 | 输出 |
|------|------|------|------|
| `generate-item-icons.ts` | 程序化生成物品图标图集 | `src/data/items.ts` | `img/sprites/08_item_icons.png+json` |

**生成方式**：SVG 模板 + 渐变背景 + 形状符号，30+ 种预设形状，按物品类型自动配色
**输出规格**：8 列网格，每格 96x96，内图像 72x72

## 依赖关系

```
constants.ts <---------+
voice-config.ts <--+   |
                   |   |
sync-voice-lines   |   |  repair-sprite-atlases -> refresh-sprites -> assets/sprites/
generate_voices <--+   |
                       |  generate-item-icons -> img/sprites/ -> refresh-sprites
                       |
                       +--- (所有脚本共享)
```

## 构建流水线完整顺序

**精灵处理**：
1. `repair-sprite-atlases.ts` -- 清理源图集
2. `refresh-sprites.ts` -- 拆分单帧到 assets

**语音处理**：
1. 修改 `src/data/dialogues.ts` 添加对话
2. `sync-voice-lines.ts` -- 同步到 `voice_lines.json`
3. `generate_voices.ts` -- 生成语音文件

**物品图标**：
1. 修改 `src/data/items.ts` 添加物品
2. `generate-item-icons.ts` -- 生成图标图集
3. `refresh-sprites.ts` -- 拆分单个图标到 assets

## 外部依赖

| 工具 | 用途 | 安装 |
|------|------|------|
| `sharp` | 图片处理 (npm 包) | `bun install` |
| `mmx` | MiniMax 语音合成 CLI | 全局安装 |
| `ffmpeg` | WAV->OGG 音频转换 | 系统安装 |

## 相关文件清单

| 文件 | 说明 |
|------|------|
| `scripts/constants.ts` | 共享常量配置 (61 行) |
| `scripts/voice-config.ts` | 19 角色语音配置 (30 行) |
| `scripts/sync-voice-lines.ts` | 语音索引同步 (85 行) |
| `scripts/generate_voices.ts` | 语音文件生成 (195 行) |
| `scripts/refresh-sprites.ts` | 精灵拆分 (256 行) |
| `scripts/repair-sprite-atlases.ts` | 图集修复 (319 行) |
| `scripts/generate-item-icons.ts` | 物品图标生成 (262 行) |

## 变更记录

| 时间 | 操作 | 说明 |
|------|------|------|
| 2026-05-22 | 新建 | 深度扫描生成模块文档 |
| 2026-05-22 15:52:17 | 增量更新 | 无代码变更，文档格式统一化 |
