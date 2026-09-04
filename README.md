# Lyra (workbench-dashboard)

A visual workbench inside your vault: task overview, kanban drag-and-drop, and a note card wall — all reading and writing your notes in real time.

> UI is in Chinese. Desktop only.

## Installation

### From the community plugin store

1. Open **Settings → Third-party plugins** in the app.
2. Turn **off** Restricted mode (Safe mode) if it is on.
3. Click **Browse**, search for **Lyra**, then **Install** and **Enable**.

### Via [BRAT](https://github.com/TheDevOwen/obsidian42-brat)

1. Install and enable the BRAT plugin.
2. Open the command palette and run `BRAT: Search for plugins`.
3. Search `workbench-dashboard`, then install.

### Manual install

1. Download `main.js` and `manifest.json` from this repository (from a [release](https://github.com/MiyoungLiu/obsidian-workbench-dashboard/releases) or the `main` branch).
2. Place them in your vault:
   ```
   .obsidian/plugins/workbench-dashboard/main.js
   .obsidian/plugins/workbench-dashboard/manifest.json
   ```
3. In **Settings → Third-party plugins**, turn off Restricted mode and **Enable** Lyra.

> Styles are inlined in `main.js`; there is **no** separate `styles.css`.
> `lib.js` is source-only (pure functions used by the node unit tests) and is inlined into `main.js` at build time — you do **not** need it to run the plugin.

## Usage

Open the workbench with the command **`Lyra: Open workbench`** (`open-workbench`) or its ribbon button.

The workbench has these areas:

- **Task lists** — Today / Next 7 days / Done today / Unscheduled. Check a task to complete it; the plugin updates the source note in place.
- **Boards (kanban)**
  - *Project boards* aggregate tasks by project tag (e.g. `#superres`).
  - *General board* collects tasks that have no project tag, grouped by stage tag.
  - *Personal schedule board* uses manual columns.
  - Drag a card between columns to change its stage; checking a card completes it (and clears stage tags).
- **Note card wall** — groups notes into cards by folder. Click a card to open the note.
- **Pomodoro** — focus / rest timer.
- **Inspo capture** — quick-capture an idea; one click on **立项 (Launch)** turns it into a project board and tracks its lifecycle (todo / doing / done / dropped).
- **Themes & focus mode** — switch palettes (A/B/C…) and ambient intensity from the top bar.

Create a new project board with the command **`Lyra: New project board (template)`** (`wb-new-project-board`).

### Settings

Under **Settings → Lyra** you can configure: workbench title, theme, focus mode, storage folders (inspo / daily / weekly / project boards), pomodoro durations, countdown target date, and the list of project stages (default: todo / doing / done).

## Data access & security

This plugin is **local-only**. It performs no network requests and uploads no data.

It reads the vault to build the workbench in real time:

- **Vault enumeration** — it lists vault files (`vault.getFiles` / `getMarkdownFiles`) to discover notes, project boards, and inspo items, and parses their task lines. This is how the task lists, boards, and card wall stay up to date as you edit notes elsewhere.
- **Read/write of note content** — checking/completing a task, dragging a card, or launching a project writes back to the *source note* (e.g. toggling `[x]`, adding/removing a stage tag). It only edits the specific task lines it is acting on.

All reads and writes stay inside your local vault. Nothing leaves your machine.

## Optional integrations

No hard dependencies. These plugins improve the experience if present (all optional):

- `periodic-notes` — daily/weekly notes
- `templater-obsidian` — templates
- `obsidian-tasks-plugin` — task queries (boards adapt automatically)

## Development

- `main.js` — plugin body (UI, events, vault read/write). It inlines a copy of `lib.js`'s pure functions (the desktop build cannot `require("./lib.js")`).
- `lib.js` — pure functions (task parsing, board aggregation, inspo lifecycle, project-board generation), used by the node unit tests.
- Tests: `node .dev/lib.test.js` (the published repo does not ship `.dev/`; see the source vault).

## 中文说明

在库内打开一个可视化工作台：任务汇总、看板拖拽、笔记卡片墙，全部实时读写你的笔记。界面为中文，仅桌面版。

### 安装
- **社区插件商店**：设置 → 第三方插件 → 浏览，搜 **Lyra** → 安装 → 启用。
- **BRAT**：装 BRAT 后命令面板 `BRAT: Search for plugins`，搜 `workbench-dashboard`。
- **手动**：下载 `main.js` + `manifest.json` 放进 `.obsidian/plugins/workbench-dashboard/`，关闭安全模式后启用。

### 使用
命令 **`Lyra: 打开工作台`** 打开。区域包括：任务列表（今日/未来7天/今日完成/待安排）、看板（项目/通用/私人日程，拖拽换栏改阶段标签）、笔记卡片墙、番茄钟、灵感捕捉（一键「立项」建项目看板并管理生命周期）。命令 **`Lyra: 新建项目看板（模板）`** 新建看板。

### 数据与隐私
本插件**纯本地**，无网络请求、不上传任何数据。它会枚举库内文件以实时构建工作台（任务列表/看板/卡片墙），并在你勾选/拖拽/立项时**写回源笔记**的对应任务行。所有读写都在本地 vault 内完成。

## License

MIT
