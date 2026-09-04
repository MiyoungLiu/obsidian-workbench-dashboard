# Lyra（workbench-dashboard）

Obsidian 内打开一个好看的工作台：任务汇总 + 看板拖拽 + 笔记卡片墙，全部实时读写你的 Vault。

> 中文界面。仅桌面版（`isDesktopOnly: true`）。

## 功能

- **今日/未来 7 天/今日完成/待安排** 四个任务列表，一眼看清手头的事
- **看板拖拽**：项目看板（按标签自动聚合）、通用看板（无项目标签的任务）、私人日程看板（手动栏），拖拽换栏自动改阶段标签
- **笔记卡片墙**：按目录聚合笔记卡片
- **番茄钟**：专注/休息计时
- **灵感捕捉**：快速记录灵感，一键「立项」建项目看板，自动管理灵感生命周期（待办/进行中/已完成/已放弃）
- **项目看板生命周期**：从灵感立项 → 看板 → 完成/放弃归档，反向同步
- **主题**：多套配色（A/B/C…），专注模式（强/中/弱/隐）
- **项目阶段自定义**：在设置里增删阶段（待办/进行中/已完成…），看板自动跟随

## 安装

### 方式一：社区插件商店（上架后）

1. Obsidian → 设置 → 第三方插件 → 浏览，搜索 **Lyra** 安装启用
2. 或装 [BRAT](https://github.com/TheDevOwen/obsidian42-brat) 后搜索 `workbench-dashboard`

### 方式二：手动安装（上架前）

1. 下载本仓库 `main.js` 和 `manifest.json`
2. 放入你的 Vault：`.obsidian/plugins/workbench-dashboard/`
   ```
   .obsidian/plugins/workbench-dashboard/main.js
   .obsidian/plugins/workbench-dashboard/manifest.json
   ```
3. Obsidian → 设置 → 第三方插件 → 关闭「安全模式」→ 启用 **Lyra**

> 本插件样式内联在 `main.js` 中，**无需** 单独的 `styles.css`。
> `lib.js` 是源码（纯函数，供 node 单元测试用），运行时由 `main.js` 内联，手动安装**不需要** 复制它。

## 配置

设置项在 设置 → Lyra（workbench-dashboard）：

| 分组 | 设置项 | 说明 |
|---|---|---|
| 外观 | 工作台标题 | 顶栏 + 标签页显示文本 |
| 外观 | 主题 | 主色调（也可在看板标题上 A/B/C 切换） |
| 外观 | 专注模式 | 背景氛围强度（强/中/弱/隐） |
| 目录存储 | 灵感捕捉存储目录 | 灵感主页/每项一行 Markdown |
| 目录存储 | 每日/每周笔记目录 | 新建日记/周记的目录 |
| 目录存储 | 项目看板目录 | 新建项目看板写入的目录 |
| 番茄钟 | 专注/休息时间 | 分钟（专注 1–120，休息 1–60） |
| 倒计时 | 目标日期 | 首页倒计时卡片目标（YYYY-MM-DD） |
| 项目阶段 | 增删阶段 | 自定义看板阶段（默认 待办/进行中/已完成） |

## 命令

- `Lyra: 打开工作台`（`open-workbench`）
- `Lyra: 新建项目看板（模板）`（`wb-new-project-board`）

## 依赖

无强制依赖。以下核心插件存在时体验更佳（非必需）：

- `periodic-notes`（每日/每周笔记）
- `templater-obsidian`（模板）
- `obsidian-tasks-plugin`（任务查询，看板会自动适配）

## 开发

- `main.js`：Obsidian 插件主体（UI + 事件 + Vault 读写），内联了 `lib.js` 的纯函数副本（Obsidian 1.12 无法 `require("./lib.js")`）
- `lib.js`：纯函数（任务解析/看板聚合/灵感生命周期/项目看板生成），供 node 单元测试
- 测试：`node .dev/lib.test.js`（独立仓库不含 `.dev/`，见源仓库）

## License

MIT
