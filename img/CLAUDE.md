[根目录](../CLAUDE.md) > **img**

# img -- 源美术资源

## 模块职责

游戏美术的源文件目录。包含设计参考原图和精灵图集（打包后的 PNG+JSON 对），是 `scripts/` 工具链的输入源。

## 目录结构

```
img/
|-- desiges/    (8 个 PNG，设计参考原图)
|-- sprites/    (8 组 PNG+JSON 精灵图集 + pack_manifest.json + README.txt)
```

## 设计参考 (desiges/)

| 文件 | 用途 |
|------|------|
| `char-heroes.png` | 英雄/主角设计稿 |
| `char-enemies.png` | 敌人角色设计稿 |
| `char-npcs-guardians.png` | NPC 和守护者设计稿 |
| `env-nature-tiles.png` | 自然环境瓦片原图 |
| `env-holy-tiles.png` | 圣神殿瓦片原图 |
| `env-dark-tiles.png` | 暗黑风格瓦片原图 |
| `map-town-overhead.png` | 木桶镇顶视角地图 |
| `map-world.png` | 世界地图设计 |

## 精灵图集 (sprites/)

8 组打包好的精灵图集，每组包含 PNG 图片 + JSON 帧元数据：

| 图集 | 分类 | 精灵数 | 网格 | 单元格尺寸 |
|------|------|--------|------|-----------|
| `01_characters_main` | characters | 48 | 8x6 | 181x181 |
| `02_npcs_bosses_creatures` | npcs_bosses | 29 | 8x4 | 181x271 |
| `03_monsters` | monsters | 53 | 8x7 | 181x217 |
| `04_town_world_objects` | world_objects | 24 | 6x4 | 241x271 |
| `05_nature_environment_tiles` | environment | 80 | 10x8 | 144x135 |
| `06_holy_temple_tiles` | holy_temple | 55 | 12x5 | 120x181 |
| `07_dark_fantasy_tiles` | dark_fantasy | 48 | 8x6 | 181x181 |

**总计**: 337 个精灵

### pack_manifest.json

管理所有图集的清单文件，包含：
- `origin`: 左上角坐标系
- 每个图集: `image`/`json` 路径、`category`、`sprite_count`、`grid` (列/行/单元格宽高)
- 每帧定义: `frame: {x, y, w, h}`, `rotated`

### README.txt

精灵图集的说明文档。

## 处理流程

```
desiges/ (设计稿)
   | 裁剪打包
sprites/ (图集)
   | scripts/repair-sprite-atlases
sprites/ (修复后图集)
   | scripts/refresh-sprites
assets/sprites/ (拆分后单文件)
```

## 变更记录

| 时间 | 操作 | 说明 |
|------|------|------|
| 2026-05-22 | 新建 | 深度扫描生成模块文档 |
| 2026-05-22 15:52:17 | 增量更新 | 精灵总数修正为371、补充 README.txt 说明 |
