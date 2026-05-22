[根目录](../../CLAUDE.md) > [src](../) > **editor**

# editor -- 配置编辑器

## 模块职责

独立的 Web 配置编辑器，提供游戏数据表的 CRUD 操作、地图预览、精灵裁剪编辑、JSON 手动编辑、导入导出、运行时覆盖等功能。通过 `editor.html` 单独访问，不依赖游戏运行。

## 入口与启动

- HTML 入口: `editor.html` -> `src/editor/main.ts`
- CSS 样式: `src/editor/styles.css`
- Vite 构建为独立入口点，开发时通过 `/editor.html` 访问
- 后端 API: Vite 插件 `casktown-editor-api` 提供开发服务器中间件

## 对外接口

### 编辑器功能

- **数据表浏览**: 左侧栏列出 15 张配置表（隐藏 tileSprites/mapBgm/spriteCrops），支持搜索过滤
- **记录 CRUD**: 选择表 -> 浏览记录 -> 编辑/复制/删除
- **地图预览**: 可视化地图瓦片、事件标记、NPC 位置
- **精灵裁剪编辑**: 可视化裁剪源图帧，调整 sourceX/Y/Width/Height/offsetX/Y，保存后自动触发 `refresh-sprites`
- **JSON 编辑**: 直接编辑 JSON，保存时校验
- **导入/导出**: JSON 格式的完整配置快照
- **运行时覆盖**: 通过 `GameConfigDatabase.persist()` 写入 localStorage，刷新游戏后生效
- **重置覆盖**: 清除 localStorage 覆盖，恢复默认数据

### 编辑器 API (开发服务器)

| 路由 | 方法 | 说明 |
|------|------|------|
| `/__casktown-editor/sprite-frame` | GET | 查询精灵帧元数据 |
| `/__casktown-editor/sprite-frame` | PUT | 保存精灵帧裁剪并自动刷新精灵 |
| `/__casktown-editor/sprite-atlas-image` | GET | 获取精灵图集图片 |

API 实现位于 `vite.config.ts` 的 `casktownEditorApiPlugin` 插件中，包括路径安全检查（防目录逃逸）、帧元数据校验、自动触发 `refresh-sprites` 等功能。

### Vite 插件

- **casktownEditorApiPlugin** (serve 模式): 提供开发服务器中间件，处理精灵帧查询/保存/图集图片请求
- **casktownStaticSpriteSourcePlugin** (build 模式): 构建时将 `img/sprites/` 复制到 `dist/sprite-sources/`

## 关键依赖与配置

- `GameConfigDatabase` -- 配置数据库，提供数据 CRUD 与持久化
- `GameConfigTableKey` -- 数据表键类型
- `constants.ts` -- 编辑器 UI 常量 (`CONFIG_EDITOR_*`)
- `spriteCrops.ts` -- 精灵裁剪配置
- `voiceLines.ts` -- 语音线路解析（用于对话预览）
- `vite.config.ts` -- 编辑器 API 插件与静态精灵源插件

## 数据模型

- `EditorState`: 编辑器状态 (activeTable/selectedId/search)
- `RecordEntry`: 记录条目 (id/label/subtitle/value/searchText)
- `SpriteFrame` / `SpriteFrameSource`: 精灵帧数据
- `SpriteViewport`: 精灵视口参数
- `ResourceTreeNode`: 资源树节点

## 测试与质量

当前无测试文件。

## 常见问题 (FAQ)

**Q: 编辑器修改如何影响游戏?**
A: 点击"应用到游戏"将配置写入 localStorage，刷新游戏页面后生效。点击"重置覆盖"可恢复默认。

**Q: 编辑器如何访问精灵源图?**
A: 开发模式下通过 Vite 中间件 API (`/__casktown-editor/sprite-atlas-image`)，构建时将 `img/sprites/` 复制到 `dist/sprite-sources/`。

**Q: 保存精灵裁剪后会发生什么?**
A: PUT `/sprite-frame` 会更新 `img/sprites/` 中的 JSON 帧元数据，然后自动触发 `refresh-sprites` 脚本重新生成 `assets/sprites/` 中的独立 PNG。

## 相关文件清单

| 文件 | 说明 |
|------|------|
| `src/editor/main.ts` | 编辑器入口（纯 DOM，无框架） |
| `src/editor/styles.css` | 编辑器样式 |

## 变更记录 (Changelog)

| 时间 | 操作 | 说明 |
|------|------|------|
| 2026-05-22 14:10:48 | 新建 | 初始化模块文档 |
| 2026-05-22 15:52:17 | 增量更新 | 修正文件数为2、补充 Vite 插件详情(API/构建插件)、精灵帧保存自动刷新流程、路径安全检查、CONFIG_EDITOR_HIDDEN_TABLE_KEYS 说明 |
