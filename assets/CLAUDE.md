[根目录](../CLAUDE.md) > **assets**

# assets -- 静态资源

## 模块职责

游戏运行时直接加载的静态资源文件，由 `scripts/` 工具链从 `img/` 源文件处理生成。**此目录为生成物，不应手动编辑。**

## 目录结构

```
assets/
|-- audio/
|   |-- bgm/          (19 个 OGG)
|   |-- voice/        (835+ 个 OGG)
|-- sprites/
|   |-- characters/   (6 角色子目录, 48 PNG) -- 可玩角色
|   |-- dark_fantasy/ (48 PNG) -- 暗黑区域瓦片
|   |-- environment/  (80 PNG) -- 自然环境瓦片
|   |-- holy_temple/  (55 PNG) -- 圣神殿瓦片
|   |-- items/        (34 PNG) -- 物品图标
|   |-- monsters/     (53 PNG) -- 怪物
|   |-- npcs_bosses/  (29 PNG) -- NPC 和 Boss
|   |-- world_objects/(24 PNG) -- 场景物体
|   |-- map-world.png -- 世界地图
```

## 资产统计

| 类别 | 文件数 | 格式 | 大小(约) |
|------|--------|------|----------|
| BGM 音乐 | 19 | OGG Vorbis | ~30MB |
| 语音台词 | 835+ | OGG Vorbis | ~24MB |
| 精灵图片 | 371 | PNG | - |
| **总计** | **1225+** | - | - |

## BGM 音轨 (19 首)

| 文件名 | 用途 |
|--------|------|
| `title.ogg` | 标题画面 |
| `town_ruins.ogg` | 废墟木桶镇 |
| `town_rebuilt.ogg` | 重建后木桶镇 |
| `forest.ogg` | 奇妙森林 |
| `forest_mystery.ogg` | 森林神秘区域 |
| `dock.ogg` | 码头 |
| `holy_water.ogg` / `holy_temple.ogg` | 圣水殿/神殿 |
| `mountain.ogg` | 山区 |
| `mystery.ogg` | 神秘事件 |
| `temple.ogg` | 神殿通用 |
| `life_spring.ogg` | 生命之泉 |
| `battle_normal.ogg` / `battle_boss.ogg` | 普通战/Boss战 |
| `dark_palace.ogg` | 暗黑宫殿 |
| `xiaoai_battle.ogg` | xiaoai Boss战 |
| `wuxiang_battle.ogg` | 无相最终战 |
| `victory.ogg` | 战斗胜利 |
| `game_over.ogg` | 游戏结束 |

## 语音文件 (835+ 个)

- **命名规则**: `<对话ID>_<行索引>.ogg`
- **覆盖**: 所有已配置对话中 19 个有配音角色的台词
- **索引**: `voice_lines.json` (根目录)
- **生成方式**: `scripts/generate_voices.ts` (MiniMax TTS + ffmpeg)

## 精灵分类 (371 个 PNG)

| 分类 | 数量 | 内容 | 角色/怪物列表 |
|------|------|------|-------------|
| characters | 48 | 可玩角色 (6 子目录) | T、huihui、abo、congcong、sun、xiaoai |
| npcs_bosses | 29 | NPC/Boss | 镇长、木桶精灵、菠萝大叔、船夫、白虎、熙苑、水瑶、风赤、凤凰、无相等 |
| monsters | 53 | 敌人 | 角灵魔、魅灵、羽灵、火麒麟幼崽、面具小兵等 |
| world_objects | 24 | 场景物体 | 木桶、箱子、门等 |
| environment | 80 | 自然瓦片 | 草、土、水、树等 |
| holy_temple | 55 | 神殿瓦片 | 神殿专用装饰 |
| dark_fantasy | 48 | 暗黑瓦片 | 魔宫/沼泽装饰 |
| items | 34 | 物品图标 | 程序化生成 |

## 生成流程

**不要手动编辑此目录。** 所有文件由脚本生成：

1. 精灵：`img/sprites/` -> `scripts/repair` -> `scripts/refresh` -> `assets/sprites/`
2. 语音：`src/data/dialogues.ts` -> `scripts/sync` -> `scripts/generate` -> `assets/audio/voice/`
3. 图标：`src/data/items.ts` -> `scripts/generate-item-icons` -> `img/sprites/` -> `scripts/refresh` -> `assets/sprites/items/`

## 变更记录

| 时间 | 操作 | 说明 |
|------|------|------|
| 2026-05-22 | 新建 | 深度扫描生成模块文档 |
| 2026-05-22 15:52:17 | 增量更新 | 精灵分类修正为8类(加map-world.png)、characters子目录结构更新(6角色子目录)、文件数微调 |
