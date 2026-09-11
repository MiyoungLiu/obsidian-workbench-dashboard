// main.js — Obsidian 工作台插件（UI 层）。
// 纯逻辑已内联 lib.js（Obsidian 1.12 加载器只能用注入 require 到打包代码，不能 require("./lib.js")）；磁盘上的 lib.js 是 node 测试源；本层负责：注册视图/命令、DOM 渲染、vault 事件、写回。
const { Plugin, ItemView, Modal, Notice, PluginSettingTab, Setting, FuzzySuggestModal } = require("obsidian");
// lib.js — 工作台纯逻辑层（零 obsidian 依赖，ESM）
// 纪律：所有函数纯函数；同样的输入必须得到同样的输出；不碰文件系统。
// ---------- 日期 ----------
function pad2(n) {
  return String(n).padStart(2, "0");
}
function dateStr(d) {
  return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
}
function todayStr(today = new Date()) {
  return dateStr(today);
}
function addDays(yyyyMmDd, n) {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return dateStr(new Date(y, m - 1, d + n));
}
// ---------- 农历（1900-2100）----------
const LUNAR_TABLE = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
  0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0,
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b5a0, 0x195a6,
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x055c0, 0x0ab60, 0x096d5, 0x092e0,
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
  0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0,
  0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0,
  0x0a2e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4,
  0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0,
  0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160,
  0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a2d0, 0x0d150, 0x0f252,
  0x0d520
];
const LUNAR_MONTHS = ["正", "二", "三", "四", "五", "六", "七", "八", "九", "十", "冬", "腊"];
const LUNAR_DAYS = ["初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十",
  "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
  "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十"];
function _lYearDays(y) {
  let s = 348;
  const data = LUNAR_TABLE[y - 1900];
  for (let i = 0x8000; i > 0x8; i >>= 1) s += (data & i) ? 1 : 0;
  return s + _lLeapDays(y);
}
function _lLeapDays(y) {
  if (_lLeapMonth(y)) { return (LUNAR_TABLE[y - 1900] & 0x10000) ? 30 : 29; }
  return 0;
}
function _lLeapMonth(y) { return LUNAR_TABLE[y - 1900] & 0xf; }
function _lMonthDays(y, m) { return (LUNAR_TABLE[y - 1900] & (0x10000 >> m)) ? 30 : 29; }
function _lYearMonths(ly) {
  const leap = _lLeapMonth(ly);
  const out = [];
  for (let m = 1; m <= 12; m++) {
    out.push({ m, leap: false, days: _lMonthDays(ly, m) });
    if (m === leap) out.push({ m, leap: true, days: _lLeapDays(ly) });
  }
  return out;
}
function lunarCN(d) {
  const y = d.getFullYear(), mo = d.getMonth() + 1, day = d.getDate();
  if (y < 1900 || y > 2100) return "";
  let offset = Math.round((Date.UTC(y, mo - 1, day) - Date.UTC(1900, 0, 31)) / 86400000);
  let ly = 1900;
  while (ly < 2101) {
    const ydays = _lYearDays(ly);
    if (offset < ydays) break;
    offset -= ydays;
    ly++;
  }
  for (const seg of _lYearMonths(ly)) {
    if (offset < seg.days) {
      const ld = offset + 1;
      if (ld < 1 || ld > 30) return "";
      return ((seg.leap ? "闰" : "") + LUNAR_MONTHS[seg.m - 1] + "月") + LUNAR_DAYS[ld - 1];
    }
    offset -= seg.days;
  }
  return "";
}
// ---------- 任务行解析 ----------
// 任务行 = 任意缩进 + "-" 或 "*" + 空格 + "[ ]"/"[x]"/"[X]" + 空格 + 内容
const TASK_RE = /^(\s*)[-*]\s+(\[[ xX]\])\s+(.*)$/;
function parseTaskLine(line) {
  const m = String(line).match(TASK_RE);
  if (!m) return null;
  const rest = m[3];
  const tags = [...rest.matchAll(/(^|\s)#([^\s#]+)/gu)].map((x) => x[2]);
  const desc = rest
    .replace(/\s*#[^\s#]+/g, "")
    .replace(/([📅✅⏳])\s*\d{4}-\d{2}-\d{2}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  return {
    done: m[2] === "[x]" || m[2] === "[X]",
    tags,
    due: (rest.match(/📅\s*(\d{4}-\d{2}-\d{2})/) || [])[1] || null,
    doneDate: (rest.match(/✅\s*(\d{4}-\d{2}-\d{2})/) || [])[1] || null,
    scheduled: (rest.match(/⏳\s*(\d{4}-\d{2}-\d{2})/) || [])[1] || null,
    desc,
  };
}
function parseTasksForFile(path, text, mtime) {
  const out = [];
  text.split(/\r?\n/).forEach((line, i) => {
    const t = parseTaskLine(line);
    if (t && t.desc && t.desc.trim()) out.push({ file: path, lineIndex: i, ref: line, mtime, ...t });
  });
  return out;
}
// ---------- State ----------
function isExcluded(path) {
  return path.split("/").some((s) => s.startsWith(".") || s === "docs" || s === "_templates");
}
function folderOf(path) {
  const i = path.lastIndexOf("/");
  return i < 0 ? "" : path.slice(0, i);
}
function baseName(path) {
  const n = path.split("/").pop() || path;
  return n.replace(/\.md$/i, "");
}
function noteInfo(f) {
  const props = {};
  const fm = f.text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (fm) {
    fm[1].split(/\r?\n/).forEach((l) => {
      const i = l.indexOf(":");
      if (i > 0) props[l.slice(0, i).trim()] = l.slice(i + 1).trim();
    });
  }
  return {
    path: f.path,
    folder: folderOf(f.path),
    name: baseName(f.path),
    mtime: f.mtime,
    date: props["日期"] || props["date"] || null,
    excalidraw: /excalidraw-plugin:/.test(f.text),
  };
}
function collectState(files) {
  const tasks = [];
  const notes = [];
  const filesText = {};
  for (const f of files) {
    filesText[f.path] = f.text;
    if (isExcluded(f.path)) continue;
    tasks.push(...parseTasksForFile(f.path, f.text, f.mtime));
    notes.push(noteInfo(f));
  }
  return { tasks, notes, files: filesText, generatedAt: Date.now() };
}
// ---------- 查询 ----------
function byDue(a, b) {
  const ad = a.due || "9999-12-31";
  const bd = b.due || "9999-12-31";
  return ad === bd ? 0 : ad < bd ? -1 : 1;
}
function queryToday(state, today = todayStr()) {
  return state.tasks.filter((t) => !t.done && ((t.due && t.due <= today) || (t.scheduled && t.scheduled <= today))).sort(byDue);
}
function queryNext7(state, today = todayStr()) {
  const end = addDays(today, 7);
  return state.tasks.filter((t) => !t.done && t.due && t.due > today && t.due <= end).sort(byDue);
}
function queryUnscheduled(state) {
  return state.tasks.filter((t) => !t.done && !t.due && !t.scheduled);
}
function queryTodayDone(state, today = todayStr()) {
  return state.tasks.filter((t) => t.done && t.doneDate === today);
}
function queryTagBoard(state, tag) {
  const has = (t) => t.tags.includes(tag);
  return {
    todo: state.tasks.filter((t) => !t.done && has(t) && !t.tags.includes("进行中")).sort(byDue),
    doing: state.tasks.filter((t) => !t.done && has(t) && t.tags.includes("进行中")).sort(byDue),
    done: state.tasks.filter((t) => t.done && has(t)),
  };
}
function querySuperBoard(state) {
  return queryTagBoard(state, "超分");
}
// ---------- 可配置阶段（v2-T19）----------
const DEFAULT_PROJ_STAGES = [
  { name: "待办", color: "#8b98a9", enabled: true },
  { name: "进行中", color: "#4f8cff", enabled: true },
  { name: "已完成", color: "#8cc265", enabled: true },
  { name: "已阻塞", color: "#e0af68", enabled: false },
  { name: "已搁置", color: "#9a7bff", enabled: false },
  { name: "已放弃", color: "#e07f87", enabled: false },
];
const DEFAULT_INSPO_STAGES = [
  { name: "收集箱", color: "#8b98a9", enabled: true },
  { name: "评估中", color: "#4f8cff", enabled: true },
  { name: "进行中", color: "#34c7c7", enabled: true },
  { name: "已完成", color: "#8cc265", enabled: true },
  { name: "已放弃", color: "#e07f87", enabled: true },
];
function normStages(cfg, max, fallback) {
  const base = (Array.isArray(fallback) ? fallback : DEFAULT_PROJ_STAGES).slice(0, max);
  const out = [];
  for (let i = 0; i < max; i++) {
    const d = base[i] || { name: "阶段" + (i + 1), color: "#8b98a9", enabled: i < 3 };
    const c = cfg && cfg[i] ? cfg[i] : {};
    out.push({ name: String(c.name || d.name).trim() || ("阶段" + (i + 1)), color: c.color || d.color, enabled: c.enabled === undefined ? d.enabled : !!c.enabled });
  }
  return out;
}
function enabledStages(cfg, max, fallback) {
  return normStages(cfg, max, fallback).filter((s) => s.enabled && s.name);
}
// 按"阶段名当标签"把项目任务分到各启用阶段列
function stageBoard(state, tag, stages) {
  const has = (t) => t.tags.includes(tag);
  const cols = stages.map((s) => ({ heading: s.name, color: s.color, tasks: [] }));
  const doneCol = cols.find((c) => c.heading === "已完成") || cols[cols.length - 1];
  for (const t of state.tasks) {
    if (!has(t)) continue;
    if (t.done) { doneCol.tasks.push(t); continue; }
    let placed = false;
    for (const c of cols) {
      if (c === doneCol) continue;
      if (t.tags.includes(c.heading)) { c.tasks.push(t); placed = true; break; }
    }
    if (!placed && cols[0]) cols[0].tasks.push(t);
  }
  for (const c of cols) c.tasks.sort(byDue);
  return cols;
}
function inspoStageNames(cfg) {
  return enabledStages(cfg, 5, DEFAULT_INSPO_STAGES).map((s) => s.name);
}
// 项目板发现（v1.1 r3）：项目文档/<X>项目看板.md 含 `tags include #<X>` 查询围栏 = #X 项目板
function discoverTagBoards(state) {
  const out = [];
  for (const p of Object.keys(state.files)) {
    if (p.startsWith("项目文档/归档/")) continue;
    const base = p.split("/").pop() || "";
    const m = base.match(/^(.+?)项目看板\.md$/);
    if (!m) continue;
    const tag = m[1];
    if (tag === "通用") continue;
    if (!state.files[p].includes("tags include #" + tag)) continue;
    const meta = projectMeta(state.files[p]);
    out.push({ tag: tag, title: tag, file: p, type: meta.type, color: meta.color, start: meta.start, end: meta.end, desc: meta.desc, stages: meta.stages, curStage: meta.curStage });
  }
  out.sort((a, b) => (a.file < b.file ? -1 : 1));
  return out;
}
// 自动聚合（2026-09-01 用户验收）：无项目标签的未完成任务 → 通用项目看板自动栏
// 项目标签动态发现：= discoverTagBoards(state) 的所有 tag。空 vault 无项目看板时返回空集。
function projectTagsOf(state) {
  if (!state || !state.files) return [];
  return discoverTagBoards(state).map((b) => b.tag);
}
const AUTO_BOARD_COL = "未入项目";
const AUTO_BOARD_EXCLUDE = ["项目文档/项目看板.md", "私人日程看板.md"];
function queryAutoTasks(state) {
  const pt = projectTagsOf(state);
  return state.tasks
    .filter((t) => !t.done && !t.tags.some((g) => pt.includes(g)) && !AUTO_BOARD_EXCLUDE.includes(t.file))
    .sort(byDue);
}
function queryAutoDoneTasks(state) {
  const pt = projectTagsOf(state);
  return state.tasks
    .filter((t) => t.done && t.doneDate && !t.tags.some((g) => pt.includes(g)) && !AUTO_BOARD_EXCLUDE.includes(t.file));
}
function autoBoard(state, stages) {
  const pt = projectTagsOf(state);
  const has = (t) => !t.tags.some((g) => pt.includes(g)) && !AUTO_BOARD_EXCLUDE.includes(t.file);
  const cols = stages.map((s) => ({ heading: s.name, color: s.color, tasks: [] }));
  const doneCol = cols.find((c) => c.heading === "已完成") || cols[cols.length - 1];
  const tagged = new Set();
  for (const t of state.tasks) {
    if (!has(t)) continue;
    if (t.done) { doneCol.tasks.push(t); tagged.add(t.file + ":" + t.lineIndex); continue; }
    let placed = false;
    for (const c of cols) {
      if (c === doneCol) continue;
      if (t.tags.includes(c.heading)) { c.tasks.push(t); tagged.add(t.file + ":" + t.lineIndex); placed = true; break; }
    }
    if (!placed && cols[0]) { cols[0].tasks.push(t); tagged.add(t.file + ":" + t.lineIndex); }
  }
  for (const c of cols) c.tasks.sort(byDue);
  return cols;
}
// 手动看板：按文件里的 ## 栏取任务（物理位置为准）
function kanbanBoard(state, path) {
  const text = state.files[path];
  if (text == null) return [];
  const lines = text.split(/\r?\n/);
  const byLine = new Map();
  for (const t of state.tasks) if (t.file === path) byLine.set(t.lineIndex, t);
  const sections = [];
  let cur = null;
  lines.forEach((line, i) => {
    const h = line.match(/^##\s+(.*)$/);
    if (h) { cur = { heading: h[1].trim(), tasks: [] }; sections.push(cur); return; }
    const t = byLine.get(i);
    if (cur && t) cur.tasks.push(t);
  });
  return sections;
}
// 卡片墙：文件夹白名单（前缀匹配，含该目录下所有子目录）
const CARD_FOLDERS = [
  "0-收件箱", "项目文档",
  "1-灵感", "2-知识积累", "3-资料库", "笔记归档",
];
function cardWall(state) {
  const groups = new Map();
  for (const n of state.notes) {
    if (!CARD_FOLDERS.some((fd) => n.folder === fd || n.folder.startsWith(fd + "/"))) continue;
    if (!groups.has(n.folder)) groups.set(n.folder, []);
    groups.get(n.folder).push(n);
  }
  const out = [];
  for (const folder of groups.keys()) {
    out.push({ folder, notes: groups.get(folder).sort((a, b) => b.mtime - a.mtime) });
  }
  return out;
}


// ---------- 写回变换（纯函数：全文进 → 全文出；只动目标行） ----------
function rejoin(originalText, lines) {
  return lines.join(originalText.includes("\r\n") ? "\r\n" : "\n");
}
function findIdx(text, ref) {
  return text.split(/\r?\n/).findIndex((l) => l === ref);
}
function toggleDone(text, ref, doDone, today = todayStr()) {
  const lines = text.split(/\r?\n/);
  const i = findIdx(text, ref);
  if (i < 0) return { ok: false, error: "stale" };
  const m = lines[i].match(/^(\s*[-*]\s+)\[[ xX]\](\s+)(.*)$/);
  if (!m) return { ok: false, error: "not-task" };
  const wasDone = /^\s*[-*]\s+\[[xX]\]/.test(lines[i]);
  if (doDone === wasDone) return { ok: true, text, changed: false };
  let rest = m[3];
  if (doDone) {
    if (!rest.includes("✅")) rest = rest.trimEnd() + " ✅ " + today;
    lines[i] = m[1] + "[x]" + m[2] + rest;
  } else {
    rest = rest.replace(/\s*✅\s*\d{4}-\d{2}-\d{2}/, "").trimEnd();
    lines[i] = m[1] + "[ ]" + m[2] + rest;
  }
  return { ok: true, text: rejoin(text, lines), changed: true };
}
function setStage(text, ref, toStage) {
  const lines = text.split(/\r?\n/);
  const i = findIdx(text, ref);
  if (i < 0) return { ok: false, error: "stale" };
  const other = toStage === "待办" ? "进行中" : "待办";
  let line = lines[i].replace(new RegExp("\\s*#" + other + "(?=\\s|$)"), "");
  if (!line.includes("#" + toStage)) line = line.trimEnd() + " #" + toStage;
  lines[i] = line;
  return { ok: true, text: rejoin(text, lines), changed: line !== ref };
}
// 通用阶段设置：移除所有已知阶段标签后加 #toStage（支持任意阶段名，可配置）
function setStageAny(text, ref, toStage, stageNames) {
  const lines = text.split(/\r?\n/);
  const i = findIdx(text, ref);
  if (i < 0) return { ok: false, error: "stale" };
  let line = lines[i];
  for (const nm of stageNames) {
    if (nm === toStage) continue;
    line = line.replace(new RegExp("\\s*#" + nm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?=\\s|$)"), "");
  }
  line = line.replace(/ {2,}/g, " ").trimEnd();
  if (!line.includes("#" + toStage)) line = line + " #" + toStage;
  lines[i] = line;
  return { ok: true, text: rejoin(text, lines), changed: line !== ref };
}
// 移除所有阶段标签（支持任意阶段名集合）
function clearStageAny(text, ref, stageNames) {
  const lines = text.split(/\r?\n/);
  const i = findIdx(text, ref);
  if (i < 0) return { ok: false, error: "stale" };
  let line = lines[i];
  for (const nm of stageNames) {
    line = line.replace(new RegExp("\\s*#" + nm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?=\\s|$)"), "");
  }
  line = line.replace(/ {2,}/g, " ").trimEnd();
  lines[i] = line;
  return { ok: true, text: rejoin(text, lines), changed: line !== ref };
}
function setDue(text, ref, date) {
  const lines = text.split(/\r?\n/);
  const i = findIdx(text, ref);
  if (i < 0) return { ok: false, error: "stale" };
  let line = lines[i];
  if (date) {
    line = /📅\s*\d{4}-\d{2}-\d{2}/.test(line)
      ? line.replace(/📅\s*\d{4}-\d{2}-\d{2}/, "📅 " + date)
      : line.trimEnd() + " 📅 " + date;
  } else {
    line = line.replace(/\s*📅\s*\d{4}-\d{2}-\d{2}/, "").trimEnd();
  }
  lines[i] = line;
  return { ok: true, text: rejoin(text, lines), changed: line !== ref };
}
function moveCard(text, ref, toHeading) {
  const lines = text.split(/\r?\n/);
  const i = findIdx(text, ref);
  if (i < 0) return { ok: false, error: "stale" };
  const line = lines[i];
  let tIdx = -1;
  for (let k = 0; k < lines.length; k++) {
    const h = lines[k].match(/^##\s+(.*)$/);
    if (h && h[1].trim() === toHeading) { tIdx = k; break; }
  }
  if (tIdx < 0) return { ok: false, error: "no-section" };
  let nextH = lines.findIndex((l, k) => k > tIdx && /^##\s/.test(l));
  const sectionEnd = nextH < 0 ? lines.length : nextH;
  if (i >= tIdx && i < sectionEnd) return { ok: true, text, changed: false };
  let insertAt = tIdx + 1;
  for (let k = sectionEnd - 1; k > tIdx; k--) {
    if (parseTaskLine(lines[k])) { insertAt = k + 1; break; }
  }
  lines.splice(i, 1);
  if (i < insertAt) insertAt -= 1;
  lines.splice(insertAt, 0, line);
  return { ok: true, text: rejoin(text, lines), changed: true };
}
function clearStage(text, ref) {
  const lines = text.split(/\r?\n/);
  const i = findIdx(text, ref);
  if (i < 0) return { ok: false, error: "stale" };
  let line = lines[i].replace(/\s*#待办(?=\s|$)/g, "").replace(/\s*#进行中(?=\s|$)/g, "").replace(/ {2,}/g, " ").trimEnd();
  lines[i] = line;
  return { ok: true, text: rejoin(text, lines), changed: line !== ref };
}
function weekStart(yyyyMmDd) {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const dow = (dt.getDay() + 6) % 7;
  return addDays(yyyyMmDd, -dow);
}
function queryOverdue(state, today) { if (!today) today = todayStr(); return state.tasks.filter((t) => !t.done && t.due && t.due < today); }
function todayStats(state, today) {
  if (!today) today = todayStr();
  const open = state.tasks.filter((t) => !t.done && t.due && t.due <= today).length;
  const done = state.tasks.filter((t) => t.done && t.doneDate === today).length;
  const overdue = state.tasks.filter((t) => !t.done && t.due && t.due < today).length;
  const rate = open + done > 0 ? Math.round((done / (open + done)) * 100) : 0;
  return { open, done, overdue, rate };
}
function weekStats(state, today) {
  if (!today) today = todayStr();
  const ws = weekStart(today);
  const we = addDays(ws, 6);
  // done = 本周勾选完成；open = 截止日 ≤ 本周日且未完成（含全部超期欠账）
  // total = done + open，与今日口径同构：补勾旧账涨分子也涨不了比例，今天/本周未完成必压分母
  const done = state.tasks.filter((t) => t.done && t.doneDate && t.doneDate >= ws && t.doneDate <= we).length;
  const open = state.tasks.filter((t) => !t.done && t.due && t.due <= we).length;
  const total = done + open;
  const rate = total > 0 ? Math.round((done / total) * 100) : 0;
  return { done, total, open, rate, ws, we };
}
function heatmap(state, today, weeks) {
  if (!today) today = todayStr();
  if (!weeks) weeks = 12;
  const thisMon = weekStart(today);
  let start = addDays(thisMon, -(weeks - 1) * 7);
  const startDow = (new Date(Number(start.slice(0, 4)), Number(start.slice(5, 7)) - 1, Number(start.slice(8, 10))).getDay() + 6) % 7;
  if (startDow !== 0) start = addDays(start, -startDow);
  let end = today;
  while (true) { const de = addDays(end, 1); if (weekStart(de) !== weekStart(end)) break; end = de; }
  const count = {};
  for (const t of state.tasks) if (t.done && t.doneDate) count[t.doneDate] = (count[t.doneDate] || 0) + 1;
  const cells = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const inRange = d >= addDays(thisMon, -(weeks - 1) * 7) && d <= today;
    cells.push({ date: d, count: inRange ? (count[d] || 0) : 0, pad: !inRange });
  }
  return cells;
}
function appendTaskLine(desc, today, tag) {
  if (!today) today = todayStr();
  if (tag === undefined) tag = "今日";
  let line = "- [ ] " + desc.trim();
  if (tag) line += " #" + tag;
  line += " 📅 " + today;
  return line;
}

function stageOf(t) {
  if (t.done) return "done";
  const tags = t.tags || [];
  if (tags.includes("进行中")) return "doing";
  if (tags.includes("待办")) return "todo";
  return "todo";
}
function filterByStage(tasks, stage) {
  if (stage === "all") return tasks.slice();
  return tasks.filter((t) => stageOf(t) === stage);
}
function calendarRange(tasks, start, end) {
  const cells = [];
  for (let d = start; d <= end; d = addDays(d, 1)) cells.push({ date: d, tasks: tasks.filter((t) => t.due === d) });
  return cells;
}
function ganttRows(tasks) {
  const dated = tasks.filter((t) => t.due);
  if (!dated.length) return { rows: [], start: null, end: null };
  const ds = dated.map((t) => t.due).sort();
  const start = ds[0];
  const end = ds[ds.length - 1];
  const rows = dated.map((t) => ({ file: t.file, desc: t.desc, start: start, end: t.due, done: t.done, stage: stageOf(t) })).sort((a, b) => (a.end < b.end ? -1 : a.end > b.end ? 1 : 0));
  return { rows, start, end };
}

function noteDateOf(n) {
  if (n.date && /^\d{4}-\d{2}-\d{2}$/.test(n.date)) return n.date;
  return dateStr(new Date(n.mtime));
}
function noteYearHeatmap(notes, year) {
  if (!year) year = new Date().getFullYear();
  const count = {};
  for (const n of notes) { const d = noteDateOf(n); if (d.slice(0, 4) === String(year)) count[d] = (count[d] || 0) + 1; }
  const jan1 = String(year) + "-01-01";
  const dec31 = String(year) + "-12-31";
  const start = weekStart(jan1);
  let end = dec31;
  while (true) { const ds = addDays(end, 1); if (weekStart(ds) !== weekStart(end)) break; end = ds; }
  const cells = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const inYear = d.slice(0, 4) === String(year);
    cells.push({ date: d, count: inYear ? (count[d] || 0) : 0, dow: (new Date(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10))).getDay() + 6) % 7, pad: !inYear });
  }
  return cells;
}
function taskYearHeatmap(state, year) {
  if (!year) year = new Date().getFullYear();
  const count = {};
  for (const t of state.tasks) if (t.done && t.doneDate && t.doneDate.slice(0, 4) === String(year)) count[t.doneDate] = (count[t.doneDate] || 0) + 1;
  const jan1 = String(year) + "-01-01";
  const dec31 = String(year) + "-12-31";
  const start = weekStart(jan1);
  let end = dec31;
  while (true) { const ds = addDays(end, 1); if (weekStart(ds) !== weekStart(end)) break; end = ds; }
  const cells = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const inYear = d.slice(0, 4) === String(year);
    cells.push({ date: d, count: inYear ? (count[d] || 0) : 0, dow: (new Date(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10))).getDay() + 6) % 7, pad: !inYear });
  }
  return cells;
}
function countdownStats(target, today) {
  if (!today) today = todayStr();
  const [ty, tm, td] = today.split("-").map(Number);
  const [by, bm, bd] = target.split("-").map(Number);
  const daysLeft = Math.max(0, Math.round((new Date(by, bm - 1, bd) - new Date(ty, tm - 1, td)) / 86400000));
  const weeksLeft = Math.ceil(daysLeft / 7);
  const total = Math.round((new Date(ty, 11, 31) - new Date(ty, 0, 1)) / 86400000);
  const elapsed = Math.max(0, Math.round((new Date(ty, tm - 1, td) - new Date(ty, 0, 1)) / 86400000));
  const pct = total > 0 ? Math.min(100, Math.round((elapsed / total) * 100)) : 0;
  return { daysLeft, weeksLeft, pct, target, year: ty };
}
function isoYearWeek(d) {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = x.getUTCDay() || 7;
  x.setUTCDate(x.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(x.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((x - yearStart) / 86400000 + 1) / 7);
  return x.getUTCFullYear() + "-W" + pad2(weekNo);
}

function projectMeta(text) {
  const out = { type: "", color: "", start: "", end: "", desc: "", stages: [], curStage: "" };
  if (!text) return out;
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) return out;
  for (const line of fm[1].split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i <= 0) continue;
    const k = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if (k === "类型") out.type = val;
    else if (k === "颜色") out.color = val;
    else if (k === "开始") out.start = val;
    else if (k === "结束") out.end = val;
    else if (k === "描述") { val = val.replace(/^"/ , "").replace(/"$/, ""); out.desc = val; }
    else if (k === "当前阶段") out.curStage = val.replace(/^"/ , "").replace(/"$/, "");
    else if (k === "阶段") { val = val.replace(/^\[|\]$/g, ""); out.stages = val.split(",").map((x) => x.trim().replace(/^"/ , "").replace(/"$/, "")).filter((x) => x); }
  }
  return out;
}

const INSPO_COLS = [
  { id: "inbox", icon: "📥", label: "收集箱", dot: "#8b98a9" },
  { id: "eval", icon: "🔍", label: "评估中", dot: "#4f8cff" },
  { id: "doing", icon: "🔵", label: "进行中", dot: "#34c7c7" },
  { id: "done", icon: "✅", label: "已完成", dot: "#8cc265" },
  { id: "dropped", icon: "🚫", label: "已放弃", dot: "#e07f87" },
];
const INSPO_COL_IDS = ["inbox", "eval", "doing", "done", "dropped"];
function normalizeInspo(it) {
  if (!it) return it;
  let col = it.col;
  if (col === "pool") col = "inbox";
  else if (col === "organize") col = "eval";
  else if (col === "launch") col = "doing";
  if (!col) col = "inbox";
  return { id: it.id, title: it.title || "", tags: Array.isArray(it.tags) ? it.tags : [], desc: it.desc || "", col: col, created: it.created || "", starred: !!it.starred, records: it.records || {}, launched: String(it.launched || ""), file: it.file || "" };
}
function inspAdd(list, item, col, today) {
  if (!Array.isArray(list)) list = [];
  if (!col) col = "inbox";
  if (!today) today = todayStr();
  const it = normalizeInspo({ id: item.id || String(Date.now()) + "-" + Math.floor(Math.random() * 1e6), title: item.title, tags: item.tags, desc: item.desc, col: col, created: today, starred: item.starred });
  return [it].concat(list.map(normalizeInspo));
}
function inspMove(list, id, col) {
  if (!Array.isArray(list)) list = [];
  return list.map((it) => (it.id === id ? normalizeInspo(Object.assign({}, it, { col: col })) : normalizeInspo(it)));
}
function inspStar(list, id, on) {
  if (!Array.isArray(list)) list = [];
  return list.map((it) => (it.id === id ? normalizeInspo(Object.assign({}, it, { starred: !!on })) : normalizeInspo(it)));
}
function inspDelete(list, id) {
  if (!Array.isArray(list)) list = [];
  return list.filter((it) => it.id !== id);
}
function inspGroup(list) {
  if (!Array.isArray(list)) list = [];
  const out = { inbox: [], eval: [], doing: [], done: [], dropped: [] };
  for (const it of list.map(normalizeInspo)) { if (out[it.col]) out[it.col].push(it); }
  return out;
}
function parseInspoTags(str) {
  return String(str || "").split(/[,，\s]+/).map((x) => x.trim()).filter((x) => x);
}
// ---------- 灵感 → vault Markdown（v2-T12：一条灵感一个 .md 文件）----------
const INSPO_COL_CN = { inbox: "收集箱", eval: "评估中", doing: "进行中", done: "已完成", dropped: "已放弃" };
function inspColFromCn(cn) {
  for (const k in INSPO_COL_CN) if (INSPO_COL_CN[k] === cn) return k;
  return "inbox";
}
function inspName(id, title) {
  let s = String(title || "").replace(/[\\/:*?"<>|#^\[\]]/g, " ").replace(/\s+/g, " ").trim().slice(0, 40);
  if (!s) s = String(id || "inspo");
  return s;
}
function inspIdFromName(name) {
  const m = String(name || "").match(/__([A-Za-z0-9_-]+)$/);
  return m ? m[1] : String(name || "");
}
const INSPO_STAGES = ["收集阶段", "评估阶段", "进行阶段", "完成情况", "放弃原因"];
function inspFileContent(it, today, stageNames) {
  if (!today) today = todayStr();
  it = normalizeInspo(it);
  const colCn = INSPO_COL_CN[it.col] || "收集箱";
  const tags = Array.isArray(it.tags) && it.tags.length ? it.tags : ["灵感"];
  const recs = (it && it.records) || {};
  const fm = [
    "---",
    "灵感名称: " + (it.title || "（无标题）"),
    "状态: " + colCn,
    "标签: [" + tags.join(", ") + "]",
    "创建日期: " + (it.created || today),
    "星标: " + (it.starred ? "是" : "否"),
    "id: " + (it.id || ""),
    "inspo: 1",
    "已立项: " + (it.launched || ""),
    "---",
    "",
  ].join("\n");
  let body = "## 背景 / 备注\n";
  body += it.desc ? it.desc + "\n\n" : "（暂无描述）\n\n";
  const stgs = Array.isArray(stageNames) && stageNames.length ? stageNames : INSPO_STAGES;
  for (const st of stgs) {
    body += "## " + st + "\n";
    const r = recs[st];
    body += (r && String(r).trim()) ? r + "\n\n" : "（暂无）\n\n";
  }
  return fm + body;
}
function parseInspoFile(text, stageNames) {
  const out = { title: "", col: "inbox", tags: [], created: "", starred: false, records: {}, launched: "" };
  if (!text) return out;
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) return out;
  for (const line of fm[1].split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i <= 0) continue;
    const k = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if (k === "灵感名称" || k === "标题") out.title = val;
    else if (k === "状态") out.col = inspColFromCn(val);
    else if (k === "创建日期") out.created = val;
    else if (k === "星标") out.starred = val === "是" || val === "true" || val === "True";
    else if (k === "标签") { val = val.replace(/^\[|\]$/g, ""); out.tags = val.split(",").map((x) => x.trim()).filter((x) => x); }
    else if (k === "id") out.id = val;
    else if (k === "已立项") out.launched = val;
  }
  const body = text.slice((fm[0] || "").length);
  const stgs = Array.isArray(stageNames) && stageNames.length ? stageNames : INSPO_STAGES;
  for (const st of stgs) {
    const safe = st.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re2 = new RegExp("##\\s*" + safe + "\\s*\\r?\\n([\\s\\S]*?)(?=\\r?\\n##\\s|$)");
    const m2 = body.match(re2);
    if (m2) {
      const val = m2[1].replace(/\s+$/, "");
      if (val && val !== "（暂无）") out.records[st] = val;
    }
  }
  return out;
}
function inspFilePath(dir, id, title) {
  const d = (dir || "1-灵感").replace(/\/+$/, "");
  return d + "/" + inspName(id, title) + ".md";
}



// 文件名 slug：去非法字符（中文保留），空白折叠成 -
function inspSlug(title) {
  const s = String(title || "").trim()
    .replace(/[\\/:*?"<>|#\[\]]+/g, " ")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return s || "灵感";
}
// 立项载荷：灵感 -> 项目看板（frontmatter + 模板）。纯函数，可单测。
// stages: 项目阶段名数组（非空）；clean: 已清洗项目名；inspId: 溯源用的灵感 id
function launchProjectPayload(clean, inspId, today, stages) {
  if (!today) today = todayStr();
  const c = inspSlug(clean);
  const stgs = (Array.isArray(stages) && stages.length) ? stages.map((s) => String(s).trim()).filter((s) => s) : ["待办", "进行中", "已完成"];
  const fm = [
    "---",
    "类型: 阶段项目",
    "颜色: #4f8cff",
    "开始: " + today,
    "结束: ",
    "描述: ",
    "阶段: [" + stgs.join(", ") + "]",
    "当前阶段: ",
    "灵感id: " + String(inspId || ""),
    "---",
    "",
    "",
  ].join("\n");
  const parts = [
    ">" + c + "项目自动看板：任务照常在**每日笔记**里写，带上 `#" + c + "` + 阶段标签，这里自动更新，无需手动维护",
    "> - 打勾完成后自动落入「已完成」",
    "",
  ];
  for (const sn of stgs) {
    const isDone = sn === "已完成";
    parts.push("## " + sn);
    parts.push("");
    parts.push("```tasks");
    parts.push("hide toolbar");
    parts.push(isDone ? "has done date" : "not done");
    parts.push("tags include #" + c);
    if (!isDone) parts.push("tags include #" + sn);
    parts.push("hide task count");
    parts.push("```");
    parts.push("");
  }
  return { path: "项目文档/" + c + "项目看板.md", fm: fm, tpl: parts.join("\n") };
}
const lib = { pad2, dateStr, todayStr, addDays, lunarCN, parseTaskLine, parseTasksForFile, noteInfo, collectState, queryToday, queryNext7, queryTodayDone, queryUnscheduled, querySuperBoard, kanbanBoard, CARD_FOLDERS, cardWall, toggleDone, setStage, setDue, moveCard, clearStage, weekStart, queryOverdue, todayStats, weekStats, heatmap, appendTaskLine, stageOf, filterByStage, calendarRange, ganttRows, noteDateOf, noteYearHeatmap, taskYearHeatmap, countdownStats, isoYearWeek, projectMeta, INSPO_COLS, INSPO_COL_IDS, normalizeInspo, inspAdd, inspMove, inspStar, inspDelete, inspGroup, parseInspoTags, INSPO_COL_CN, inspColFromCn, inspName, inspIdFromName, INSPO_STAGES, inspFileContent, parseInspoFile, inspFilePath, projectTagsOf, AUTO_BOARD_COL, AUTO_BOARD_EXCLUDE, queryAutoTasks, queryAutoDoneTasks, autoBoard, queryTagBoard, discoverTagBoards, DEFAULT_PROJ_STAGES, DEFAULT_INSPO_STAGES, normStages, enabledStages, stageBoard, inspoStageNames, setStageAny, clearStageAny, inspSlug, launchProjectPayload };
const VIEW_TYPE = "workbench-dashboard";
// 手动看板（物理栏；拖拽 = 跨 ## 移动整行任务）
const MANUAL_BOARDS = [
  { title: "通用项目看板", file: "项目文档/通用项目看板.md", auto: true },
  { title: "私人日程看板", file: "私人日程看板.md" },
];
const WD = ["日","一","二","三","四","五","六"];
function ringSVG(pct, size) {
  size = size || 54;
  const r = (size - 8) / 2; const cx = size / 2; const circ = 2 * Math.PI * r;
  const off = circ * (1 - Math.max(0, Math.min(100, pct)) / 100);
  return ["<svg class=\"wb-ring\" width=\"" + size + "\" height=\"" + size + "\" viewBox=\"0 0 " + size + " " + size + "\">",
    "<circle class=\"wb-ring-track\" cx=\"" + cx + "\" cy=\"" + cx + "\" r=\"" + r + "\" fill=\"none\" stroke-width=\"5\"/>",
    "<circle class=\"wb-ring-fill\" cx=\"" + cx + "\" cy=\"" + cx + "\" r=\"" + r + "\" fill=\"none\" stroke-width=\"5\" stroke-linecap=\"round\" stroke-dasharray=\"" + circ + "\" stroke-dashoffset=\"" + off + "\" transform=\"rotate(-90 " + cx + " " + cx + ")\"/>",
    "<text class=\"wb-ring-txt\" x=\"50%\" y=\"50%\" text-anchor=\"middle\" dominant-baseline=\"central\">" + pct + "%</text></svg>"]
    .join("");
}
function relTime(ms) {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return "刚刚";
  if (s < 3600) return Math.floor(s / 60) + " 分钟前";
  if (s < 86400) return Math.floor(s / 3600) + " 小时前";
  if (s < 86400 * 7) return Math.floor(s / 86400) + " 天前";
  return lib.dateStr(new Date(ms));
}
const CSS = `
.wb-picker{ position:absolute; z-index:50; display:flex; gap:6px; align-items:center; padding:8px; background:var(--background-primary); border:1px solid var(--background-modifier-border); border-radius:8px; box-shadow:0 4px 14px rgba(0,0,0,.18); }
.wb-picker .wb-pinput{ padding:4px 6px; border:1px solid var(--background-modifier-border); border-radius:4px; background:var(--background-primary); color:var(--text-normal); font-size:12px; }
.wb-picker .wb-pbtn{ cursor:pointer; padding:4px 10px; border-radius:4px; border:1px solid var(--background-modifier-border); background:var(--background-secondary); color:var(--text-normal); font-size:12px; user-select:none; }
.wb-picker .wb-pbtn:hover{ background:var(--background-modifier-hover); }
.wb-root{
  /* A 深色（默认） */
  --bg:#0d1117; --panel:#161d27; --panel2:#10151c; --border:#2b3648; --hair:#1c2530;
  --text:#dfe6ee; --muted:#8b98a9; --accent:#7aa2f7; --accent2:#e0af68;
  --good:#8cc265; --danger:#e07f87; --card:#182029; --chipbg:#2a3346; --shadow:0 1px 2px rgba(0,0,0,.4);
}
.wb-root[data-theme="b"]{
  --bg:#f5f1e8; --panel:#fffdf8; --panel2:#faf6ec; --border:#ddd3c0; --hair:#efe8d9;
  --text:#33302a; --muted:#8a7c64; --accent:#c26a3d; --accent2:#d9a441;
  --good:#6b8f5e; --danger:#b5533c; --card:#fffdf8; --chipbg:#f0e8da; --shadow:0 1px 5px rgba(120,90,50,.10);
}
.wb-root[data-theme="c"]{
  --bg:#ffffff; --panel:#ffffff; --panel2:#fafafa; --border:#e3e3e8; --hair:#efeff3;
  --text:#1d1d1f; --muted:#86868b; --accent:#0a84ff; --accent2:#f5a623;
  --good:#34c759; --danger:#ff3b30; --card:#ffffff; --chipbg:#f5f5f7; --shadow:0 1px 3px rgba(0,0,0,.06);
}
.wb-root{ position:relative; color:var(--text); font-size:14px; min-height:100vh;
  background:var(--bg);
  background-image:linear-gradient(rgba(128,140,160,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(128,140,160,.05) 1px, transparent 1px);
  background-size:22px 22px; }
.wb-root::before{ content:""; position:fixed; left:0; right:0; top:0; height:560px; pointer-events:none; z-index:0;
  background:radial-gradient(70% 90% at 20% 0%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 60%), radial-gradient(60% 80% at 80% 0%, color-mix(in srgb, var(--accent2) 16%, transparent), transparent 65%); }
.wb-root[data-glow="off"]::before{ display:none; }
.wb-root[data-glow="low"]::before{ opacity:.18; }
.wb-root[data-glow="mid"]::before{ opacity:.55; }
.wb-root[data-glow="high"]::before{ opacity:1; }
.wb-root > *{ position:relative; z-index:1; }
.wb-banner-tip{ position:absolute; bottom:6px; left:50%; transform:translateX(-50%); font-size:10px; color:var(--text); background:rgba(0,0,0,.4); border-radius:5px; padding:2px 8px; pointer-events:none; white-space:nowrap; opacity:0; transition:opacity .15s; }
.wb-banner:hover .wb-banner-tip{ opacity:1; }
.wb-pad{ padding:0 16px 40px; }
.wb-root[data-theme="b"] .wb-title{ font-family:"PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif; }
.wb-head{ display:flex; align-items:center; gap:14px; padding:14px 2px; flex-wrap:wrap; flex:none; }
.wb-tl{ display:flex; flex-direction:column; align-items:center; }
.wb-eyebrow{ font-size:10px; font-weight:700; letter-spacing:.3em; color:var(--muted); text-transform:uppercase; margin-bottom:3px; }
.wb-title{ font-size:24px; font-weight:700; letter-spacing:.42em; padding-left:.42em; text-align:center; font-family:"PingFang SC","Microsoft YaHei","Noto Sans SC",-apple-system,system-ui,sans-serif; }
.wb-title.wb-title-cjk{ letter-spacing:.08em; padding-left:.08em; font-family:"PingFang SC","Microsoft YaHei","Noto Sans SC","Source Han Sans SC",sans-serif; }
.wb-tr{ display:flex; flex-direction:column; align-items:flex-end; margin-left:auto; }
.wb-time{ font-size:20px; font-weight:700; letter-spacing:.02em; font-variant-numeric:tabular-nums; color:var(--text); }
.wb-meta{ font-size:12px; color:var(--muted); margin-top:2px; }
.wb-capture{ display:flex; align-items:center; gap:4px; }
.wb-switch{ display:flex; gap:4px; margin-left:2px; align-self:center; }
.wb-set-btn{ align-self:center; }
.wb-btn{ cursor:pointer; font-size:12px; padding:2px 9px; border-radius:6px;
  border:1px solid var(--border); color:var(--muted); user-select:none; }
.wb-btn.on{ background:var(--accent); border-color:var(--accent); color:var(--bg); font-weight:700; }
.wb-banner-err{ margin:8px 0; padding:8px 12px; border-radius:8px; cursor:pointer; flex:none;
  background:var(--accent2); color:var(--bg); font-size:13px; }
.wb-cols{ display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:14px; margin-top:6px;
  max-height:62vh; overflow-y:auto; }
.wb-list{ background:var(--panel); border:1px solid var(--border); border-radius:12px; padding:12px 12px 8px; box-shadow:var(--shadow); }
.wb-colh{ font-size:11px; font-weight:700; color:var(--muted); margin-bottom:10px; letter-spacing:.08em; text-transform:uppercase; }
.wb-kcol{ border-top:3px solid var(--wb-colc, transparent); }
.wb-kcol .wb-colh{ color:var(--wb-colc, var(--muted)); }
.wb-row{ display:flex; align-items:center; gap:8px; padding:5px 6px; border-radius:8px; }
.wb-row:hover{ background:var(--panel2); }
.wb-cb{ accent-color:var(--accent); cursor:pointer; width:15px; height:15px; flex:none; }
.wb-desc{ flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.wb-desc.done{ color:var(--muted); text-decoration:line-through; }
.wb-chip{ flex:none; font-size:11px; padding:1px 6px; border-radius:5px; background:var(--chipbg); color:var(--muted); }
.wb-due{ flex:none; font-size:11px; color:var(--muted); }
.wb-due.add{ color:var(--accent); }
.wb-due.sch{ color:var(--accent2); }
.wb-board-title{ font-size:13px; font-weight:700; color:var(--muted); margin-bottom:6px; }
.wb-ktitle{ font-size:12px; font-weight:700; color:var(--text); margin-bottom:10px; letter-spacing:.02em; }
.wb-kanban{ max-height:440px; overflow-y:auto; }
.wb-awrap{ margin-top:18px; }
.wb-aresize{ height:7px; cursor:ns-resize; position:relative; }
.wb-aresize::after{ content:""; position:absolute; left:25%; right:25%; top:3px; height:2px; border-radius:2px; background:var(--border); }
.wb-aresize:hover::after{ background:var(--accent); }
.wb-asroll.wb-proj-item{ overflow-y:auto; margin-top:0; }
.wb-proj-handle{ height:14px; cursor:ns-resize; position:relative; margin:2px 0; }
.wb-proj-handle::after{ content:""; position:absolute; left:25%; right:25%; top:6px; height:2px; border-radius:2px; background:var(--border); transition:background .15s; }
.wb-proj-handle:hover::after{ background:var(--accent); }
.wb-asroll > .wb-ktitle{ position:sticky; top:0; background:var(--bg); z-index:2; padding:2px; }
.wb-list .wb-colh{ position:sticky; top:0; background:var(--panel); z-index:1; }
.wb-kcol .wb-colh{ position:sticky; top:0; background:var(--panel2); z-index:1; }
.wb-cline{ display:flex; align-items:flex-start; gap:6px; }
.wb-kcols{ display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px; }
.wb-kcol{ background:var(--panel2); border:1px solid var(--hair); border-radius:12px; padding:10px; min-height:64px; }
.wb-kcol.over{ box-shadow:inset 0 0 0 2px var(--accent); background:var(--panel); }
.wb-card.dragging{ opacity:.92; transform:rotate(2deg) scale(1.02); box-shadow:0 10px 26px rgba(0,0,0,.45); z-index:5; }
.wb-card{ position:relative; overflow:hidden; background:var(--card); border:1px solid var(--border); border-radius:10px;
  padding:9px 11px; margin-bottom:8px; box-shadow:var(--shadow); cursor:grab; }
.wb-card:hover{ border-color:color-mix(in srgb, var(--accent) 45%, var(--border)); }
.wb-card::before, .wb-wcard::before, .wb-list::before{ content:""; position:absolute; left:0; right:0; top:0; height:1px;
  background:linear-gradient(90deg, transparent, rgba(255,255,255,.16), transparent); }
.wb-card .wb-cdesc{ font-size:12.5px; line-height:1.35; flex:1; min-width:0; }
.wb-card.done .wb-cdesc{ color:var(--muted); text-decoration:line-through; }
.wb-cmeta{ display:flex; gap:4px; flex-wrap:wrap; margin-top:4px; }
.wb-chip.tiny{ font-size:10px; padding:0 4px; }
.wb-cdue{ font-size:10px; color:var(--muted); }
.wb-wall{ width:100%; }
.wb-wgroup{ margin-bottom:10px; }
.wb-wlabel{ font-size:11px; font-weight:700; color:var(--accent); margin-bottom:6px; position:sticky; top:0; background:var(--bg); z-index:1; }
.wb-wcards{ display:grid; grid-template-columns:repeat(auto-fill,minmax(190px,1fr)); gap:12px; }
.wb-wcard{ background:var(--panel); border:1px solid var(--border); border-radius:12px; padding:11px 13px; box-shadow:var(--shadow); cursor:pointer; }
.wb-wcard:hover{ border-color:color-mix(in srgb, var(--accent) 45%, var(--border)); transform:translateY(-1px); }
.wb-wname{ font-size:12.5px; font-weight:600; display:block; margin-bottom:4px; }
.wb-wsub{ font-size:11px; color:var(--muted); }
.wb-starmap{ width:100%; height:min(720px, calc(100vh - 230px)); min-height:380px; border-radius:14px; overflow:hidden; background:#070b14; margin-top:6px; }
.wb-starmap canvas{ display:block; width:100%; height:100%; }
.wb-empty{ color:var(--muted); font-size:12px; }
.wb-picker{ position:absolute; z-index:10; display:flex; gap:6px; align-items:center;
  background:var(--panel); border:1px solid var(--border); border-radius:8px; padding:6px; box-shadow:var(--shadow); }
.wb-picker input{ font-size:12px; color:var(--text); }
/* ---- 首页网格（v2：响应式列数 + 卡片 span，参考 Xove）---- */
.wb-home-row{ margin-top:14px; display:grid; grid-template-columns:repeat(var(--wb-cols,4),minmax(0,1fr)); gap:14px; align-items:stretch; position:relative; z-index:1; }
.wb-home-row:first-child{ margin-top:10px; }
.wb-home-card{ position:relative; background:var(--card); border:1px solid var(--border); border-radius:14px; padding:14px 16px; box-shadow:var(--shadow); min-width:0; min-height:0; overflow:hidden; display:flex; flex-direction:column; gap:10px; grid-column:span var(--c,1); grid-row:span var(--r,1); }
.wb-home-card::before{ content:""; position:absolute; left:0; right:0; top:0; height:1px; background:linear-gradient(90deg,transparent,rgba(255,255,255,.16),transparent); }
.wb-home-card[data-mod="pulse"]{ grid-column:1 / -1; --r:auto; }
.wb-row-pulse .wb-home-card[data-mod="pulse"]{ grid-column:1 / 4; grid-row:1; }
.wb-row-pulse .wb-list-card{ grid-row:2; height:var(--wb-list-h,var(--wb-row-h,210px)); min-height:120px; overflow-y:auto; }
.wb-row-pulse .wb-list-tall{ grid-column:4; grid-row:1 / 3; height:auto; min-height:0; overflow-y:auto; }
.wb-row-pulse-h{ height:12px; cursor:ns-resize; position:relative; margin-top:4px; z-index:2; }
.wb-row-pulse-h::after{ content:""; position:absolute; left:30%; right:30%; top:5px; height:2px; border-radius:2px; background:var(--border); transition:background .15s; }
.wb-row-pulse-h:hover::after, .wb-row-pulse-h.on::after{ background:var(--accent); }
.wb-home-card[data-mod="countdown"]{ --c:1; --r:1; min-height:var(--wb-row-h,210px); }
.wb-home-card[data-mod="pomo"]{ --c:1; --r:1; min-height:var(--wb-row-h,210px); }
.wb-home-card[data-mod="capture"]{ --c:2; --r:1; min-height:var(--wb-row-h,230px); }
.wb-home-card[data-mod="taskheat"]{ --c:2; --r:1; min-height:180px; align-content:start; }
.wb-home-card[data-mod="noteheat"]{ --c:2; --r:1; min-height:180px; align-content:start; }
@media(max-width:1280px){ .wb-home-card[data-mod="pulse"]{ --c:3; } .wb-home-card[data-mod="countdown"],.wb-home-card[data-mod="pomo"]{ --c:1; } .wb-home-card[data-mod="capture"]{ --c:4; } .wb-home-card[data-mod="taskheat"],.wb-home-card[data-mod="noteheat"]{ --c:2; } }
@media(max-width:900px){ .wb-home-card{ --c:2 !important; } .wb-home-card[data-mod="pulse"]{ --c:2; } .wb-home-card[data-mod="capture"]{ --c:2; } }
@media(max-width:620px){ .wb-home-card{ --c:1 !important; --r:1 !important; } .wb-home-card{ min-height:150px; } }
.wb-card-h{ display:flex; align-items:center; justify-content:space-between; gap:8px; }
.wb-card-t{ font-size:13px; font-weight:700; color:var(--text); letter-spacing:.02em; }
.wb-card-sub{ font-size:11px; color:var(--muted); }
/* 脉冲（hero 卡） */
.wb-pulse{ display:flex; flex-direction:column; gap:10px; min-width:0; flex:none; }
.wb-pulse-top{ display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
.wb-stat{ display:flex; flex-direction:column; align-items:center; min-width:72px; padding:2px 16px; border-right:1px solid var(--hair); }
.wb-stat:last-of-type{ border-right:none; }
.wb-stat-n{ font-size:30px; font-weight:800; font-variant-numeric:tabular-nums; line-height:1.05; }
.wb-stat-l{ font-size:11px; color:var(--muted); margin-top:5px; letter-spacing:.05em; }
.wb-stat.good .wb-stat-n{ color:var(--good); }
.wb-stat.danger .wb-stat-n{ color:var(--danger); }
.wb-rings{ display:flex; gap:16px; margin-left:auto; }
.wb-ringbox{ display:flex; flex-direction:column; align-items:center; }
.wb-ringbox-l{ font-size:11px; color:var(--muted); margin-bottom:4px; }
.wb-ring{ display:block; }
.wb-ring-track{ stroke:var(--chipbg); }
.wb-ring-fill{ stroke:var(--accent); transition:stroke-dashoffset .5s ease; }
.wb-ring-txt{ font-size:13px; font-weight:700; fill:var(--text); font-variant-numeric:tabular-nums; }
.wb-overdue{ margin:0; padding:10px 12px 12px; border-radius:10px; background:var(--panel2); border:1px solid var(--border); border-left:3px solid var(--danger); display:flex; flex-direction:column; align-items:flex-start; justify-content:flex-start; gap:8px; }
.wb-overdue:empty{ display:none; }
.wb-overdue-none{ color:var(--muted); font-size:12px; }
.wb-overdue-h{ font-size:12px; font-weight:700; color:var(--danger); letter-spacing:.02em; }
.wb-overdue-items{ display:flex; flex-wrap:wrap; gap:6px; justify-content:flex-start; }
.wb-overdue-item{ font-size:12px; color:var(--text); background:color-mix(in srgb, var(--danger) 12%, transparent); padding:2px 8px; border-radius:6px; cursor:pointer; }
.wb-overdue-item:hover{ background:color-mix(in srgb, var(--danger) 24%, transparent); }
/* 完成热力（12 周）卡 */
.wb-heat{ align-self:stretch; display:flex; flex-direction:column; gap:10px; min-width:0; }
.wb-cc-body{ display:flex; flex-direction:column; gap:10px; flex:1; min-height:0; }
.wb-cc-line{ display:flex; flex-direction:column; gap:5px; min-width:0; }
.wb-cc-row{ display:flex; flex-direction:row; align-items:center; gap:8px; min-width:0; }
.wb-cc-name{ flex:none; font-size:14px; font-weight:600; padding:10px 13px; border:1px solid var(--border); border-radius:10px; background:var(--panel2); color:var(--text); }
.wb-cc-tags{ flex:1; min-width:0; font-size:13px; padding:8px 13px; border:1px solid var(--border); border-radius:10px; background:var(--panel2); color:var(--text); }
.wb-cc-star{ flex:none; cursor:pointer; font-size:20px; color:var(--muted); user-select:none; padding:2px 6px; }
.wb-cc-star.on{ color:var(--accent2); }
.wb-cc-name:focus,.wb-cc-tags:focus,.wb-cc-inp:focus{ outline:none; border-color:var(--accent); background:var(--panel2); }
.wb-cc-name::placeholder,.wb-cc-tags::placeholder,.wb-cc-inp::placeholder{ color:var(--muted); }
.wb-cc-inp{ flex:1; min-width:0; min-height:100px; font-size:13px; line-height:1.5; padding:10px 13px; border:1px solid var(--border); border-radius:10px; background:var(--panel2); color:var(--text); resize:none; }
.wb-cc-foot{ display:flex; justify-content:flex-end; margin-top:auto; }
.wb-cc-add{ flex:none; cursor:pointer; min-width:64px; height:38px; display:flex; align-items:center; justify-content:center; border-radius:9px; background:var(--accent); color:var(--bg); font-size:13px; font-weight:700; user-select:none; border:1px solid var(--accent); padding:0 16px; }
.wb-cc-add:hover{ filter:brightness(1.1); }
.wb-heat-grid{ display:grid; grid-auto-flow:column; grid-template-rows:repeat(7,1fr); gap:3px; }
.wb-hc{ width:15px; height:15px; border-radius:3px; display:inline-block; }
.wb-hc.pad{ visibility:hidden; }
.wb-heat .wb-hc.l0{ background:var(--chipbg); }
.wb-heat .wb-hc.l1{ background:color-mix(in srgb, var(--accent) 32%, var(--chipbg)); }
.wb-heat .wb-hc.l2{ background:color-mix(in srgb, var(--accent) 55%, var(--chipbg)); }
.wb-heat .wb-hc.l3{ background:color-mix(in srgb, var(--accent) 78%, var(--chipbg)); }
.wb-heat .wb-hc.l4{ background:var(--accent); }
.wb-heat .wb-hc.today{ box-shadow:0 0 0 2px color-mix(in srgb, var(--accent) 60%, transparent); }
.wb-heat-legend{ display:flex; align-items:center; gap:3px; font-size:10px; color:var(--muted); }
.wb-heat-legend .wb-hc{ width:11px; height:11px; }
.wb-toolbar{ display:flex; gap:7px; margin-left:10px; }
.wb-tb-btn{ cursor:pointer; display:flex; align-items:center; gap:6px; font-size:13px; font-weight:600; padding:7px 14px; border-radius:9px; border:1px solid var(--border); color:var(--muted); user-select:none; background:var(--panel2); transition:all .12s; }
.wb-tb-btn:hover{ color:var(--accent); border-color:var(--accent); background:color-mix(in srgb, var(--accent) 12%, var(--panel2)); transform:translateY(-1px); }
.wb-tb-ic{ font-size:14px; }
.wb-tb-lb{ }
.wb-capture{ display:flex; align-items:center; gap:4px; }
.wb-capture-inp{ font-size:12px; padding:4px 9px; border:1px solid var(--border); border-radius:7px; background:var(--panel2); color:var(--text); width:230px; }
.wb-capture-inp:focus{ outline:none; border-color:var(--accent); }
.wb-capture-btn{ cursor:pointer; font-size:15px; font-weight:700; color:var(--accent); width:24px; height:24px; display:flex; align-items:center; justify-content:center; border-radius:6px; border:1px solid var(--border); user-select:none; }
.wb-capture-btn:hover{ background:var(--accent); color:var(--bg); border-color:var(--accent); }
.wb-banner{ position:relative; width:100%; aspect-ratio:16/2.4; border:1px solid var(--border); border-radius:12px; overflow:hidden; margin:0 0 8px;
  background:radial-gradient(120% 90% at 0% 0%, color-mix(in srgb, var(--accent) 12%, transparent), transparent 55%), radial-gradient(110% 90% at 100% 100%, color-mix(in srgb, var(--accent2) 10%, transparent), transparent 60%), var(--panel2); }
.wb-banner::after{ content:""; position:absolute; inset:0; pointer-events:none; background-image:repeating-linear-gradient(135deg, rgba(255,255,255,.02) 0 1px, transparent 1px 12px); }
.wb-banner-img{ position:absolute; top:0; left:0; width:100%; height:auto; z-index:0; user-select:none; -webkit-user-drag:none; cursor:ns-resize; }
.wb-banner-img.hide{ display:none; }
.wb-banner-ph{ position:absolute; inset:0; z-index:2; display:flex; align-items:center; justify-content:center; color:var(--muted); font-size:12px; letter-spacing:.1em; pointer-events:none; }
.wb-banner-bar{ position:absolute; top:12px; right:12px; z-index:10; display:flex; gap:6px; opacity:0; transform:translateY(-2px); transition:opacity .15s, transform .15s; }
.wb-banner:hover .wb-banner-bar, .wb-banner-bar:focus-within{ opacity:1; transform:translateY(0); }
.wb-banner-btn{ cursor:pointer; padding:5px 10px; font-size:11px; color:var(--text); background:color-mix(in srgb, var(--bg) 78%, transparent); border:1px solid var(--border); border-radius:6px; backdrop-filter:blur(8px); user-select:none; }
.wb-banner-btn:hover{ border-color:var(--accent); color:var(--accent); }
.wb-banner-fi{ display:none; }
.wb-proj-ctrl{ display:flex; align-items:center; gap:10px; margin:4px 0 10px; flex-wrap:wrap; }
.wb-subtabs, .wb-stagef{ display:flex; gap:4px; }
.wb-subtab, .wb-stagef-btn{ cursor:pointer; font-size:12px; padding:4px 12px; border-radius:7px; border:1px solid var(--border); color:var(--muted); user-select:none; background:var(--panel); }
.wb-subtab:hover, .wb-stagef-btn:hover{ color:var(--text); }
.wb-subtab.on, .wb-stagef-btn.on{ background:var(--accent); color:var(--bg); border-color:var(--accent); font-weight:600; }
.wb-proj-count{ font-size:12px; color:var(--muted); margin-left:auto; }
.wb-kbwrap{ margin-bottom:18px; }
.wb-proj-health{ display:flex; align-items:center; gap:10px; padding:6px 0 8px; border-bottom:1px solid var(--hair); margin-bottom:8px; }
.wb-ph-ring{ width:44px; height:44px; flex:none; }
.wb-ph-info{ display:flex; flex-direction:column; gap:2px; flex:1; min-width:0; }
.wb-ph-count{ font-size:12px; font-weight:700; color:var(--text); }
.wb-ph-stage{ font-size:11px; color:var(--muted); }
.wb-ph-timebar{ position:relative; height:5px; border-radius:99px; background:color-mix(in srgb, var(--muted) 22%, var(--panel)); margin-top:3px; }
.wb-ph-timebar.over{ background:color-mix(in srgb, #e8395c 25%, var(--panel)); }
.wb-ph-tfill{ display:block; height:100%; border-radius:99px; background:linear-gradient(90deg, var(--accent), var(--accent2, #c026d3)); }
.wb-ph-timebar.over .wb-ph-tfill{ background:linear-gradient(90deg, #e8395c, #ff6b8a); }
.wb-ph-tmark{ position:absolute; top:-2px; width:2px; height:9px; background:var(--text); border-radius:1px; }
.wb-ph-tmile{ position:absolute; right:0; top:-2px; width:8px; height:8px; background:var(--accent); border-radius:2px; transform:rotate(45deg); }
.wb-ph-over{ font-size:11px; color:#e8395c; font-weight:600; }
.wb-plist{ border:1px solid var(--border); border-radius:12px; overflow:hidden; }
.wb-plist-h{ display:grid; grid-template-columns:1fr 90px 80px; gap:10px; padding:8px 14px; background:var(--panel2); font-size:11px; color:var(--muted); letter-spacing:.05em; }
.wb-plist-r{ display:grid; grid-template-columns:1fr 90px 80px; gap:10px; padding:8px 14px; border-top:1px solid var(--hair); font-size:13px; align-items:center; }
.wb-plist-r:hover{ background:var(--panel); }
.wb-plist-r.done .wb-pl-d{ color:var(--muted); text-decoration:line-through; }
.wb-pl-e.over{ color:var(--danger); font-weight:600; }
.wb-stg-todo{ background:color-mix(in srgb, var(--accent) 16%, var(--chipbg)); color:var(--text); }
.wb-stg-doing{ background:color-mix(in srgb, var(--accent2) 22%, var(--chipbg)); color:var(--text); }
.wb-stg-done{ background:color-mix(in srgb, var(--good) 20%, var(--chipbg)); color:var(--good); }
.wb-pl-s{ font-size:11px; padding:2px 8px; border-radius:6px; text-align:center; }
.wb-pcal{ border:1px solid var(--border); border-radius:12px; padding:12px; background:var(--panel); }
.wb-pcal-t{ font-size:12px; color:var(--muted); margin-bottom:10px; }
.wb-pcal-grid{ display:grid; grid-template-columns:repeat(7,1fr); gap:6px; }
.wb-pcal-month .wb-pcal-cell{ min-height:72px; flex-direction:column; align-items:stretch; }
.wb-pcal-month .wb-pcal-num{ font-size:11px; color:var(--muted); font-weight:600; margin-bottom:3px; }
.wb-pcal-month .wb-pcal-cell.out{ opacity:.35; }
.wb-pcal-dh{ font-size:11px; color:var(--muted); text-align:center; padding:4px 0; border-bottom:1px solid var(--hair); }
.wb-pcal-dh.today{ color:var(--accent); font-weight:700; }
.wb-pcal-cell{ min-height:72px; border-radius:8px; padding:5px; background:var(--panel2); border:1px solid var(--hair); }
.wb-pcal-cell.today{ border-color:var(--accent); }
.wb-pcal-none{ color:var(--muted); font-size:10px; display:block; text-align:center; margin-top:26px; }
.wb-pcal-task{ font-size:11px; padding:3px 6px; border-radius:5px; margin-bottom:3px; cursor:pointer; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.wb-pcal-task:hover{ filter:brightness(1.1); }
.wb-gantt{ border:1px solid var(--border); border-radius:12px; padding:14px; background:var(--panel); }
.wb-gantt-todayline{ position:absolute; top:0; bottom:0; width:0; border-left:1px dashed color-mix(in srgb, var(--accent) 60%, transparent); z-index:2; }
.wb-gantt-elapsed{ position:absolute; top:0; bottom:0; left:0; background:color-mix(in srgb, var(--accent) 30%, transparent); border-radius:4px 0 0 4px; pointer-events:none; }
.wb-gantt-elapsed.over{ background:color-mix(in srgb, #e8395c 40%, transparent); }
.wb-gantt-bar.done{ opacity:.5; }
.wb-gantt{ position:relative; }
.wb-colcount{ display:inline-flex; align-items:center; justify-content:center; min-width:18px; height:18px; border-radius:99px; font-size:10px; font-weight:700; color:#fff; margin-left:4px; }
.wb-gantt-axis{ display:flex; justify-content:space-between; font-size:10px; color:var(--muted); margin-left:180px; margin-bottom:8px; }
.wb-gantt-row{ display:flex; align-items:center; gap:10px; margin-bottom:6px; }
.wb-gantt-lb{ width:170px; flex:none; font-size:12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.wb-gantt-lb.done{ color:var(--muted); text-decoration:line-through; }
.wb-gantt-track{ flex:1; height:18px; background:var(--panel2); border-radius:5px; position:relative; }
.wb-gantt-bar{ position:absolute; top:2px; height:14px; border-radius:4px; cursor:pointer; }
.wb-gantt-bar:hover{ filter:brightness(1.15); }
.wb-empty.big{ font-size:13px; padding:30px; text-align:center; }
.wb-tabs{ display:flex; align-items:center; gap:6px; margin:4px 0 6px; border-bottom:1px solid var(--border); padding-bottom:0; }
.wb-tabs-l{ display:flex; gap:6px; align-items:center; }
.wb-tabs .wb-capture{ margin-left:auto; }
.wb-tab{ cursor:pointer; display:flex; align-items:center; gap:5px; font-size:13px; padding:8px 14px; border-radius:8px 8px 0 0; color:var(--muted); border:1px solid transparent; border-bottom:none; user-select:none; }
.wb-tab:hover{ color:var(--text); background:var(--panel); }
.wb-tab.on{ color:var(--accent); background:var(--panel); border-color:var(--border); font-weight:600; }
.wb-tab-ic{ font-size:13px; }
.wb-live, .wb-stat-n, .wb-ring-txt{ font-variant-numeric:tabular-nums; }
.wb-empty{ display:flex; align-items:center; gap:5px; }
/* ---- 项目卡片头属性（v2-T8）---- */
.wb-kbwrap.stg, .wb-kbwrap.nonstg{ border-left:3px solid var(--wb-pc, var(--accent)); }
.wb-ktitle{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.wb-ktitle-t{ font-size:15px; }
.wb-ptag{ font-size:11px; font-weight:600; padding:2px 8px; border-radius:99px; }
.wb-ptag.stg{ background:color-mix(in srgb, var(--wb-pc, var(--accent)) 22%, transparent); color:var(--wb-pc, var(--accent)); }
.wb-ptag.nonstg{ background:var(--panel2); color:var(--text2); }
.wb-pdates{ font-size:12px; color:var(--text2); font-variant-numeric:tabular-nums; }
.wb-pdesc{ font-size:12px; color:var(--text2); opacity:.8; }
/* ---- 底部组件（v2：并入首页网格）---- */
.wb-bottom-card{ flex:1; min-height:0; }
.wb-noteheat{ display:flex; gap:3px; overflow-x:auto; padding:6px 0; align-items:flex-start; width:100%; }
.wb-nh-col{ display:flex; flex-direction:column; gap:3px; }
.wb-nhc{ width:13px; height:13px; border-radius:3px; display:inline-block; flex:0 0 auto; }
.wb-nhc.pad{ visibility:hidden; }
.wb-nhc.l0{ background:var(--panel2); }
.wb-nhc.l1{ background:color-mix(in srgb, var(--accent) 30%, var(--panel2)); }
.wb-nhc.l2{ background:color-mix(in srgb, var(--accent) 55%, var(--panel2)); }
.wb-nhc.l3{ background:color-mix(in srgb, var(--accent) 80%, var(--panel2)); }
.wb-nhc.l4{ background:var(--accent); }
.wb-nhc.today{ box-shadow:0 0 0 2px color-mix(in srgb, var(--accent) 60%, transparent); }
.wb-heat-lgc{ width:13px; height:13px; }
/* 倒计时（简单醒目：顶部标题 + 居中大数字 + 底部进度） */
.wb-countdown{ display:flex; flex-direction:column; flex:1; min-height:0; }
.wb-cd-head{ display:flex; align-items:center; justify-content:space-between; }
.wb-cd-title{ font-size:13px; font-weight:700; color:var(--text); display:flex; align-items:center; gap:6px; }
.wb-cd-title::before{ content:""; width:8px; height:8px; border-radius:2px; background:var(--accent); }
.wb-cd-tag{ font-size:11px; color:var(--muted); }
.wb-cd-lbl{ font-size:12px; color:var(--muted); margin-top:14px; }
.wb-cd-big{ display:flex; align-items:center; justify-content:center; gap:10px; flex:1; }
.wb-cd-num{ font-size:76px; font-weight:800; color:var(--text); font-variant-numeric:tabular-nums; line-height:1; letter-spacing:-.02em; }
.wb-cd-unit{ font-size:16px; font-weight:600; color:var(--muted); letter-spacing:.04em; }
.wb-cd-foot{ display:flex; flex-direction:column; gap:8px; }
.wb-cd-bar{ width:100%; height:7px; border-radius:99px; background:color-mix(in srgb, var(--muted) 22%, var(--panel)); box-shadow:inset 0 1px 2px rgba(0,0,0,.22); overflow:hidden; }
.wb-cd-fill{ display:block; height:100%; border-radius:99px; background:linear-gradient(90deg, #14141a, #e8395c); }
.wb-root[data-theme="a"] .wb-cd-fill{ background:linear-gradient(90deg, #2f6bff, #c026d3); }
.wb-root[data-theme="c"] .wb-cd-fill{ background:linear-gradient(90deg, #2563eb, #9333ea); }
.wb-cd-sub{ display:flex; align-items:center; gap:10px; font-size:12px; }
.wb-cd-stat{ color:var(--muted); font-variant-numeric:tabular-nums; }
.wb-cd-stat:first-child{ color:var(--text); }
.wb-cd-list{ display:flex; flex-direction:column; gap:8px; margin-top:10px; flex:1; min-height:0; overflow-y:auto; }
.wb-cd-item{ display:grid; grid-template-columns:1fr auto; grid-template-rows:auto auto; gap:2px 10px; align-items:center; padding:8px 10px; border:1px solid var(--hair); border-radius:9px; background:var(--panel2); }
.wb-cd-item.today{ border-color:var(--accent); }
.wb-cd-item.past{ opacity:.6; }
.wb-cd-nm{ font-size:12px; font-weight:600; color:var(--text); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.wb-cd-date{ font-size:10px; font-weight:400; color:var(--muted); }
.wb-cd-row-r{ grid-row:1; display:flex; align-items:baseline; gap:3px; font-variant-numeric:tabular-nums; }
.wb-cd-mininum{ font-size:18px; font-weight:800; color:var(--text); line-height:1; }
.wb-cd-today{ font-size:13px; font-weight:800; color:var(--accent); }
.wb-cd-pastnum{ font-size:12px; font-weight:600; color:var(--muted); }
.wb-cd-mini{ grid-column:1 / -1; height:4px; border-radius:99px; background:color-mix(in srgb, var(--muted) 22%, var(--panel)); overflow:hidden; }
.wb-cd-minifill{ display:block; height:100%; border-radius:99px; background:linear-gradient(90deg, #14141a, #e8395c); opacity:.8; }
.wb-root[data-theme="a"] .wb-cd-minifill{ background:linear-gradient(90deg, #2f6bff, #c026d3); }
.wb-root[data-theme="c"] .wb-cd-minifill{ background:linear-gradient(90deg, #2563eb, #9333ea); }
/* 番茄钟（居中：标题/比例 + 模式药丸 + 大时间 + 紧凑按钮，点标题切换工作/休息） */
.wb-pomo{ display:flex; flex-direction:column; flex:1; min-height:0; }
.wb-pomo-head{ display:flex; align-items:center; justify-content:space-between; cursor:pointer; user-select:none; padding:2px; border-radius:8px; }
.wb-pomo-head:hover .wb-pomo-title{ color:var(--accent); }
.wb-pomo-title{ font-size:13px; font-weight:700; color:var(--text); display:flex; align-items:center; gap:6px; transition:color .12s; }
.wb-pomo-title::before{ content:""; width:8px; height:8px; border-radius:50%; border:2px solid var(--accent); }
.wb-pomo-ratio{ font-size:11px; color:var(--muted); font-variant-numeric:tabular-nums; }
.wb-pomo-body{ display:flex; flex-direction:column; align-items:center; gap:18px; flex:1; justify-content:center; }
.wb-pomo-pill{ font-size:13px; font-weight:600; color:var(--text); background:var(--panel2); border:1px solid var(--border); padding:5px 18px; border-radius:99px; cursor:pointer; user-select:none; transition:border-color .12s, color .12s; }
.wb-pomo-pill:hover{ border-color:var(--accent); }
.wb-pomo-pill.rest{ color:var(--accent2); border-color:color-mix(in srgb, var(--accent2) 50%, var(--border)); }
.wb-pomo-time{ text-align:center; font-size:64px; font-weight:800; font-variant-numeric:tabular-nums; color:var(--text); line-height:1; letter-spacing:-.02em; }
.wb-pomo-btns{ display:flex; gap:12px; }
.wb-pomo-btn{ cursor:pointer; font-size:13px; font-weight:600; padding:7px 22px; border-radius:9px; border:1px solid var(--border); background:var(--panel2); color:var(--text); user-select:none; }
.wb-pomo-btn:hover{ border-color:var(--accent); color:var(--accent); }
.wb-pomo-start.on{ background:var(--accent); border-color:var(--accent); color:var(--bg); }
.wb-pomo-start.on:hover{ filter:brightness(1.1); color:var(--bg); }
/* ---- 灵感捕捉页（v2-T9）---- */
.wb-inspo-h{ display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; position:relative; z-index:1; }
.wb-inspo-title{ font-size:18px; font-weight:700; letter-spacing:.02em; }
.wb-inspo-new{ font-size:13px; padding:7px 14px; }
.wb-inspo-grid{ display:grid; grid-template-columns:repeat(4,1fr); gap:14px; position:relative; z-index:1; }
@media(max-width:1100px){ .wb-inspo-grid{ grid-template-columns:repeat(2,1fr); } }
@media(max-width:640px){ .wb-inspo-grid{ grid-template-columns:1fr; } }
.wb-inspo-col{ background:var(--panel); border:1px solid var(--hair); border-radius:14px; padding:12px; min-height:120px; display:flex; flex-direction:column; box-shadow:var(--shadow-sm); }
.wb-inspo-colh{ display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; padding-bottom:8px; border-bottom:1px solid var(--hair); }
.wb-inspo-coltitle{ font-size:14px; font-weight:600; }
.wb-inspo-colcount{ font-size:12px; color:var(--text2); background:var(--panel2); border-radius:99px; padding:1px 8px; font-variant-numeric:tabular-nums; }
.wb-inspo-colbody{ flex:1; display:flex; flex-direction:column; gap:8px; margin-bottom:10px; }
.wb-inspo-card{ background:var(--panel2); border:1px solid var(--hair); border-radius:10px; padding:10px 11px; }
.wb-inspo-ct{ font-size:13px; font-weight:600; color:var(--text); margin-bottom:5px; }
.wb-inspo-tags{ display:flex; flex-wrap:wrap; gap:4px; margin-bottom:6px; }
.wb-inspo-tag{ font-size:11px; color:var(--accent); background:color-mix(in srgb, var(--accent) 14%, transparent); border-radius:6px; padding:1px 6px; }
.wb-inspo-cd{ font-size:12px; color:var(--text2); margin-bottom:6px; }
.wb-inspo-cm{ display:flex; align-items:center; gap:8px; font-size:11px; }
.wb-inspo-date{ color:var(--text2); margin-right:auto; font-variant-numeric:tabular-nums; }
.wb-inspo-move, .wb-inspo-act, .wb-inspo-del{ cursor:pointer; color:var(--text2); padding:1px 5px; border-radius:5px; }
.wb-inspo-move:hover, .wb-inspo-act:hover{ color:var(--accent); background:color-mix(in srgb, var(--accent) 12%, transparent); }
.wb-inspo-del:hover{ color:var(--danger); background:color-mix(in srgb, var(--danger) 12%, transparent); }
.wb-inspo-empty{ font-size:12px; color:var(--text2); opacity:.5; text-align:center; padding:12px 0; }
.wb-inspo-add{ text-align:center; font-size:12px; color:var(--accent); padding:6px 0; border-radius:8px; cursor:pointer; user-select:none; }
.wb-inspo-add:hover{ background:color-mix(in srgb, var(--accent) 10%, transparent); }
/* ---- 灵感页 v2 布局（侧栏 + 竖排看板 + 列表 + 星标）---- */
.wb-inspo{ display:flex; gap:14px; position:relative; z-index:1; min-height:calc(100vh - 320px); }
.wb-inspo-side{ width:180px; flex:none; background:var(--panel); border:1px solid var(--hair); border-radius:14px; padding:10px; display:flex; flex-direction:column; gap:4px; box-shadow:var(--shadow-sm); min-height:280px; }
.wb-inspo-nav{ display:flex; align-items:center; gap:8px; padding:7px 10px; border-radius:9px; cursor:pointer; user-select:none; color:var(--text2); font-size:13px; }
.wb-inspo-nav:hover{ background:var(--panel2); }
.wb-inspo-nav.on{ background:var(--panel2); color:var(--text); font-weight:600; }
.wb-inspo-dot{ width:9px; height:9px; border-radius:50%; flex:none; background:var(--muted); }
.wb-inspo-dot.star{ background:transparent; color:var(--accent2); font-size:13px; width:auto; }
.wb-inspo-navlb{ flex:1; }
.wb-inspo-navc{ font-size:12px; color:var(--text2); font-variant-numeric:tabular-nums; }
.wb-inspo-main{ flex:1; min-width:0; display:flex; flex-direction:column; gap:12px; }
.wb-inspo-top{ display:flex; align-items:center; justify-content:space-between; }
.wb-inspo-new{ font-size:13px; padding:7px 14px; }
@media(max-width:900px){ .wb-inspo{ flex-direction:column; } .wb-inspo-side{ width:100%; flex-direction:row; flex-wrap:wrap; } .wb-inspo-nav{ flex:1 1 auto; } }
.wb-inspo-grid{ display:grid; grid-template-columns:repeat(5,1fr); gap:12px; align-items:stretch; min-height:calc(100vh - 360px); }
@media(max-width:1100px){ .wb-inspo-grid{ grid-template-columns:repeat(3,1fr); } }
@media(max-width:640px){ .wb-inspo-grid{ grid-template-columns:repeat(2,1fr); } }
.wb-inspo-col{ background:var(--panel); border:1px solid var(--hair); border-top:3px solid var(--wb-inspo-c, transparent); border-radius:14px; padding:12px; min-height:240px; display:flex; flex-direction:column; box-shadow:var(--shadow-sm); }
.wb-inspo-colh{ display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; padding-bottom:8px; border-bottom:1px solid var(--hair); }
.wb-inspo-coltitle{ font-size:14px; font-weight:600; }
.wb-inspo-colcount{ font-size:12px; color:var(--text2); background:var(--panel2); border-radius:99px; padding:1px 8px; font-variant-numeric:tabular-nums; }
.wb-inspo-colbody{ flex:1; display:flex; flex-direction:column; gap:8px; }
.wb-inspo-card{ background:var(--panel2); border:1px solid var(--hair); border-radius:10px; padding:10px 11px; }
.wb-inspo-ch{ display:flex; align-items:flex-start; gap:6px; }
.wb-inspo-ct{ flex:1; font-size:13px; font-weight:600; color:var(--text); margin-bottom:5px; cursor:pointer; }
.wb-inspo-ct:hover{ color:var(--accent); }
.wb-inspo-star{ cursor:pointer; color:var(--text2); font-size:15px; line-height:1; user-select:none; flex:none; }
.wb-inspo-star.on{ color:var(--accent2); }
.wb-inspo-star:hover{ transform:scale(1.15); }
.wb-inspo-tags{ display:flex; flex-wrap:wrap; gap:4px; margin-bottom:6px; }
.wb-inspo-tag{ font-size:11px; color:var(--accent); background:color-mix(in srgb, var(--accent) 14%, transparent); border-radius:6px; padding:1px 6px; }
.wb-inspo-cd{ font-size:12px; color:var(--text2); margin-bottom:6px; }
.wb-inspo-cm{ display:flex; align-items:center; gap:6px; font-size:11px; flex-wrap:wrap; }
.wb-inspo-date{ color:var(--text2); margin-right:auto; font-variant-numeric:tabular-nums; }
.wb-inspo-move, .wb-inspo-act, .wb-inspo-del{ cursor:pointer; color:var(--accent); padding:1px 6px; border-radius:5px; }
.wb-inspo-act.dim{ color:var(--text2); }
.wb-inspo-move:hover, .wb-inspo-act:hover{ background:color-mix(in srgb, var(--accent) 12%, transparent); }
.wb-inspo-del{ color:var(--text2); }
.wb-inspo-del:hover{ color:var(--danger); background:color-mix(in srgb, var(--danger) 12%, transparent); }
.wb-inspo-empty{ font-size:12px; color:var(--text2); opacity:.5; text-align:center; padding:12px 0; }
.wb-inspo-empty.big{ padding:40px 0; }
.wb-inspo-list{ display:flex; flex-direction:column; gap:6px; background:var(--panel); border:1px solid var(--hair); border-radius:14px; padding:8px; box-shadow:var(--shadow-sm); min-height:calc(100vh - 360px); }
.wb-inspo-list-r{ display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:9px; }
.wb-inspo-list-r:hover{ background:var(--panel2); }
.wb-inspo-lt{ flex:1; min-width:0; font-size:13px; font-weight:500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.wb-inspo-lc{ font-size:12px; font-weight:600; }
.wb-inspo-ltags{ font-size:11px; color:var(--text2); max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
`;
// 主题色同步到插件自建弹窗（注入全局 <style>，幂等）
const WB_MODAL_CSS = [
  ".modal[data-wb-theme=\"a\"]{ --bg:#0d1117; --panel:#161d27; --panel2:#10151c; --border:#2b3648; --hair:#1c2530; --text:#dfe6ee; --muted:#8b98a9; --accent:#7aa2f7; --accent2:#e0af68; --good:#8cc265; --danger:#e07f87; --chipbg:#2a3346; }",
  ".modal[data-wb-theme=\"b\"]{ --bg:#f5f1e8; --panel:#fffdf8; --panel2:#faf6ec; --border:#ddd3c0; --hair:#efe8d9; --text:#33302a; --muted:#8a7c64; --accent:#c26a3d; --accent2:#d9a441; --good:#6b8f5e; --danger:#b5533c; --chipbg:#f0e8da; }",
  ".modal[data-wb-theme=\"c\"]{ --bg:#ffffff; --panel:#ffffff; --panel2:#fafafa; --border:#e3e3e8; --hair:#efeff3; --text:#1d1d1f; --muted:#86868b; --accent:#0a84ff; --accent2:#f5a623; --good:#34c759; --danger:#ff3b30; --chipbg:#f5f5f7; }",
  ".modal[data-wb-theme]{ --background-primary:var(--panel) !important; --background-secondary:var(--panel2) !important; --text-normal:var(--text) !important; --text-muted:var(--muted) !important; --background-modifier-border:var(--border) !important; --background-modifier-hover:var(--chipbg) !important; --background-modifier-fill-hover:var(--chipbg) !important; }",
  ".modal[data-wb-theme] .modal-content{ background:var(--panel) !important; color:var(--text) !important; border:1px solid var(--border) !important; border-radius:12px; }",
  ".modal[data-wb-theme] .titlebar{ background:var(--panel) !important; border-bottom-color:var(--border) !important; }",
  ".modal[data-wb-theme] .titlebar, .modal[data-wb-theme] .modal-title{ color:var(--text) !important; }",
  ".modal[data-wb-theme] .modal-button-close{ color:var(--muted) !important; }",
  ".modal[data-wb-theme] .modal-button-close:hover{ color:var(--text) !important; background:var(--chipbg) !important; }",
  ".modal[data-wb-theme] button{ background:var(--panel2) !important; color:var(--text) !important; border:1px solid var(--border) !important; border-radius:8px; font-size:13px; padding:6px 14px; cursor:pointer; }",
  ".modal[data-wb-theme] button:hover{ border-color:var(--accent) !important; color:var(--accent) !important; }",
  ".modal[data-wb-theme] button.mod-cta{ background:var(--accent) !important; border-color:var(--accent) !important; color:var(--bg) !important; font-weight:600; }",
  ".modal[data-wb-theme] button.mod-cta:hover{ filter:brightness(1.1); color:var(--bg) !important; }",
  ".modal[data-wb-theme] button.mod-secondary{ background:var(--panel2) !important; }",
  ".modal[data-wb-theme] input, .modal[data-wb-theme] select, .modal[data-wb-theme] textarea{ background:var(--panel2) !important; color:var(--text) !important; border:1px solid var(--border) !important; border-radius:7px; padding:7px 9px; font-size:13px; }",
  ".modal[data-wb-theme] input:focus, .modal[data-wb-theme] select:focus, .modal[data-wb-theme] textarea:focus{ outline:none; border-color:var(--accent) !important; box-shadow:none !important; }",
  ".modal[data-wb-theme] input::placeholder, .modal[data-wb-theme] textarea::placeholder{ color:var(--muted) !important; }",
  ".modal[data-wb-theme] input[type=date]::-webkit-calendar-picker-indicator{ filter:invert(0.5); cursor:pointer; }",
  ".modal[data-wb-theme] .wb-nb-swatch.on{ border-color:var(--text) !important; }",
  ".modal[data-wb-theme] .wb-mmlink{ font-size:12px; color:var(--accent) !important; cursor:pointer; user-select:none; }",
  ".modal[data-wb-theme] .wb-mmlink:hover{ text-decoration:underline; }",
].join("\n");
function ensureWbModalTheme() {
  if (typeof document === "undefined") return;
  if (document.getElementById("wb-modal-theme")) return;
  const st = document.createElement("style");
  st.id = "wb-modal-theme";
  st.textContent = WB_MODAL_CSS;
  document.head.appendChild(st);
}
// 给弹窗套当前主题（必须在赋值 m.onOpen 之后调用，才能包住内容构建器）
function themeModal(m, theme) {
  const fn = m.onOpen;
  m.onOpen = () => {
    ensureWbModalTheme();
    m.modalEl.setAttribute("data-wb-theme", theme || "a");
    if (fn) fn();
  };
}
class WorkbenchPlugin extends Plugin {
  theme = "a";
  areaH = {};
  page = "home";
  projView = "kanban";
  projStage = "all";
  wallView = "wall";
  wbTitle = "Lyra";
  wbEyebrow = "MIYOUNG · WORKBENCH";
  banner = { a: { dataUrl: null, offsetY: 0, scale: 1 }, b: { dataUrl: null, offsetY: 0, scale: 1 }, c: { dataUrl: null, offsetY: 0, scale: 1 } };
  pomo = { work: 25, rest: 5, mode: "work", left: 25 * 60, running: false };
  inspirations = [];
  inspoFilter = "all";
  glow = "high";
  countdownTarget = "";
  countdowns = [];
  archiveDir = "笔记归档";
  projStages = null;
  inspoStages = null;
  async onload() {
    const data = await this.loadData();
    if (data && data.theme) this.theme = data.theme;
    if (data && data.areaH) this.areaH = data.areaH;
    if (data && data.page) this.page = data.page;
    if (data && data.projView) this.projView = data.projView;
    if (data && data.projStage) this.projStage = data.projStage;
    if (data && data.wallView) this.wallView = data.wallView;
    if (data && data.banner) {
      // 安全迁移:清理混合脏数据(顶层 dataUrl/offsetY 字段),View 的 _bannerOf 再做完整规范化
      const b = data.banner;
      if (b && typeof b === "object" && "dataUrl" in b) {
        this.banner = { a: (b.a && typeof b.a === "object") ? b.a : { dataUrl: b.dataUrl || null, offsetY: b.offsetY || 0, scale: 1 }, b: b.b || { dataUrl: null, offsetY: 0, scale: 1 }, c: b.c || { dataUrl: null, offsetY: 0, scale: 1 } };
      } else if (b && typeof b === "object" && b.a) {
        this.banner = { a: b.a, b: b.b || { dataUrl: null, offsetY: 0, scale: 1 }, c: b.c || { dataUrl: null, offsetY: 0, scale: 1 } };
      } else {
        this.banner = b;
      }
    }
    if (data && data.pomo) this.pomo = Object.assign({}, this.pomo, data.pomo);
    if (data && data.inspirations) this.inspirations = data.inspirations;
    if (data && data.inspoFilter) this.inspoFilter = data.inspoFilter;
    if (data && data.glow) this.glow = data.glow;
    if (data && data.countdownTarget) this.countdownTarget = data.countdownTarget;
    if (data && data.countdownLabel) this.countdownLabel = data.countdownLabel;
    this.countdowns = (data && Array.isArray(data.countdowns)) ? data.countdowns.filter((x) => x && x.date && /^\d{4}-\d{2}-\d{2}$/.test(x.date)).map((x) => ({ label: String(x.label || "").trim(), date: x.date, since: (x.since && x.since.length === 10) ? x.since : undefined })) : [];
    if (!this.countdowns.length && data && data.countdownTarget && /^\d{4}-\d{2}-\d{2}$/.test(data.countdownTarget)) {
      this.countdowns = [{ label: String(data.countdownLabel || "").trim(), date: data.countdownTarget }];
    }
    this.inspoDir = (data && data.inspoDir) || "1-灵感";
    this.dailyDir = (data && data.dailyDir) || "0-收件箱/每日";
    this.weeklyDir = (data && data.weeklyDir) || "0-收件箱/每周";
    this.projDir = (data && data.projDir) || "项目文档";
    this.archiveDir = (data && data.archiveDir) || "笔记归档";
    this.wbTitle = (data && data.wbTitle) || "Lyra";
    this.wbEyebrow = (data && data.wbEyebrow != null) ? data.wbEyebrow : "MIYOUNG · WORKBENCH";
    this.projStages = (data && data.projStages) || null;
    this.inspoStages = (data && data.inspoStages) || null;
    if (!this.inspoStages) {
      this.inspoStages = lib.DEFAULT_INSPO_STAGES.map((s) => Object.assign({}, s, { enabled: !(s.name === "已完成" || s.name === "已放弃") }));
    }
    void this.migrateInspoFiles(data);
    this.applyAppAppearance(this.theme);
    this.registerView(VIEW_TYPE, (leaf) => new WorkbenchView(leaf, this));
    this.addRibbonIcon("gauge", "打开工作台", () => this.openView());
    this.addCommand({ id: "open-workbench", name: "打开仪表盘", callback: () => this.openView() });
    this.addCommand({ id: "wb-new-project-board", name: "新建项目看板（模板）", callback: () => this.newProjectBoard() });
    this.settingTab = new WorkbenchSettingTab(this.app, this);
    this.addSettingTab(this.settingTab);
  }
  onunload() {
    this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach((l) => { if (l.view) l.view.onClose(); });
  }
  async migrateInspoFiles(data) {
    const legacy = (data && Array.isArray(data.inspirations)) ? data.inspirations : [];
    if (!legacy.length) return;
    try {
      const mkDir = this.app.vault.createFolder || this.app.vault.createDirectory;
      await mkDir.call(this.app.vault, (this.inspoDir || "1-灵感").replace(/\/+$/, ""));
      for (const raw of legacy) {
        const it = lib.normalizeInspo(raw);
        if (!it.id || !it.title) continue;
        const p = lib.inspFilePath(this.inspoDir || "1-灵感", it.id);
        if (!this.app.vault.getAbstractFileByPath(p)) await this.app.vault.create(p, lib.inspFileContent(it, null, this.inspoStageNamesFor()));
      }
      this.saveInspoData();
      new Notice("已迁移 " + legacy.length + " 条旧灵感到 " + this.inspoDir + "/");
    } catch (er) { new Notice("灵感迁移失败：" + String((er && er.message) || er)); }
  }
  async openView() {
    const ws = this.app.workspace;
    let leaf = ws.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) leaf = ws.getRightLeaf(false) || ws.getRightLeaf(true);
    await leaf.setViewState({ type: VIEW_TYPE, active: true });
    ws.revealLeaf(leaf);
  }
  applyAppAppearance(t) {
    // 主题 A=深色 → Obsidian 整体切深色；B/C=浅色 → 整体切浅色
    if (typeof document === "undefined" || !document.body) return;
    const dark = (t || this.theme) === "a";
    document.body.classList.toggle("theme-dark", dark);
    document.body.classList.toggle("theme-light", !dark);
  }
  setTheme(t) {
    this.theme = t;
    this.applyAppAppearance(t);
    this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach((l) => { if (l.view) l.view.applyTheme(t); l.view.render(); });
    this.saveInspoData();
  }
  setWbTitle(t) {
    this.wbTitle = t;
    this.saveInspoData();
    this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach((l) => { if (l.view) { l.view.updateTitle(t); l.view.render(); } });
  }
  setWbEyebrow(t) {
    this.wbEyebrow = t;
    this.saveInspoData();
    this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach((l) => { if (l.view) l.view.render(); });
  }
  saveBanner() { this.saveInspoData(); }
  setProjView(v) { this.projView = v; this.saveBanner(); this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach((l) => { if (l.view) l.view.render(); }); }
  setProjStage(v) { this.projStage = v; this.saveBanner(); this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach((l) => { if (l.view) l.view.render(); }); }
  setWallView(v) { this.wallView = v; this.saveBanner(); this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach((l) => { if (l.view) l.view.render(); }); }
  setPage(p) { this.page = p; this.saveBanner(); this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach((l) => { if (l.view) l.view.render(); }); }
  setInspoFilter(v) { this.inspoFilter = v; this.saveInspoData(); this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach((l) => { if (l.view) l.view.render(); }); }
  saveInspoData() { const cd0 = (this.countdowns && this.countdowns[0]) || null; this.saveData({ theme: this.theme, areaH: this.areaH, page: this.page, projView: this.projView, projStage: this.projStage, wallView: this.wallView, banner: this.banner, pomo: this.pomo, inspirations: this.inspirations, inspoFilter: this.inspoFilter, glow: this.glow, countdownTarget: cd0 ? cd0.date : "", countdownLabel: cd0 ? cd0.label : "", countdowns: this.countdowns, inspoDir: this.inspoDir, dailyDir: this.dailyDir, weeklyDir: this.weeklyDir, projDir: this.projDir, archiveDir: this.archiveDir, wbTitle: this.wbTitle, wbEyebrow: this.wbEyebrow, projStages: this.projStages, inspoStages: this.inspoStages }); }
  // 项目阶段（归一化，4-6 槽，默认 3 启用）
  getProjStages() { return lib.normStages(this.projStages, 6, lib.DEFAULT_PROJ_STAGES); }
  // 项目阶段——仅启用
  getProjStagesEnabled() { return lib.enabledStages(this.projStages, 6, lib.DEFAULT_PROJ_STAGES); }
  // 灵感阶段（归一化，5 槽，默认全启用）
  getInspoStages() { return lib.normStages(this.inspoStages, 5, lib.DEFAULT_INSPO_STAGES); }
  getInspoStagesEnabled() { return lib.enabledStages(this.inspoStages, 5, lib.DEFAULT_INSPO_STAGES); }
  // 灵感文件阶段小节标题（写/解析用）
  inspoStageNamesFor() { return this.getInspoStages().map((s) => s.name); }
  // 灵感列（可配置名称/颜色，id 仍按固定 5 槽顺序，保证旧数据 col 字段兼容）
  getInspoCols() {
    const ids = lib.INSPO_COL_IDS;
    const cfg = this.getInspoStages();
    const icons = ["📥", "🔍", "🔵", "✅", "🚫"];
    return ids.map((id, i) => {
      const s = cfg[i] || { name: id, color: "#8b98a9", enabled: true };
      return { id: id, label: s.name, dot: s.color, enabled: s.enabled, icon: icons[i] || "▪" };
    });
  }
  // 某项目应使用的阶段：
  //  - 有 frontmatter 阶段（新建项目 / 阶段项目）→ 用其阶段名 + 全局同名颜色
  //  - 无 frontmatter 阶段（旧项目，如超分）→ 锁定旧 3 列 待办/进行中/已完成，保持原样
  projStagesFor(bd) {
    const fmStages = bd && Array.isArray(bd.stages) && bd.stages.length ? bd.stages : null;
    if (fmStages) {
      const colorMap = {};
      for (const s of this.getProjStages()) colorMap[s.name] = s.color;
      return fmStages.map((nm) => ({ name: nm, color: colorMap[nm] || "#8b98a9", enabled: true }));
    }
    const colorMap2 = {};
    for (const s of this.getProjStages()) colorMap2[s.name] = s.color;
    return ["待办", "进行中", "已完成"].map((nm) => ({ name: nm, color: colorMap2[nm] || "#8b98a9", enabled: true }));
  }
  newProjectBoard() {
    const app = this.app;
    const m = new Modal(app);
    m.setTitle("新建项目");
    m.onOpen = () => {
      const c = m.contentEl;
      c.createEl("style", { text: [
        ".wb-nb-lb{font-size:12px;color:var(--text-muted);margin:10px 0 5px;}",
        ".wb-nb-inp,.wb-nb-sel{width:100%;box-sizing:border-box;padding:8px;border:1px solid var(--background-modifier-border);border-radius:6px;background:var(--background-primary);color:var(--text-normal);font-size:14px;}",
        ".wb-nb-hint{font-size:12px;color:var(--text-muted);margin-bottom:8px;}",
        ".wb-nb-row{display:flex;gap:8px;}",
        ".wb-nb-row .wb-nb-inp,.wb-nb-row .wb-nb-sel{flex:1;}",
        ".wb-nb-pal{display:flex;flex-wrap:wrap;gap:8px;align-items:center;}",
        ".wb-nb-swatch{width:26px;height:26px;border-radius:7px;cursor:pointer;border:2px solid transparent;box-sizing:border-box;}",
        ".wb-nb-swatch.on{ border-color:var(--text-normal); transform:scale(1.08);}",
        ".wb-nb-swatchcustom{width:26px;height:26px;padding:0;border:1px dashed var(--background-modifier-border);border-radius:7px;background:var(--background-primary);cursor:pointer;}",
        ".wb-nb-desc{width:100%;box-sizing:border-box;min-height:54px;padding:8px;border:1px solid var(--background-modifier-border);border-radius:6px;background:var(--background-primary);color:var(--text-normal);font-size:13px;resize:vertical;}",
        ".wb-nb-stage{display:none;}",
        ".wb-nb-stage.show{display:block;}",
        ".wb-nb-btns{margin-top:14px;display:flex;justify-content:flex-end;gap:8px;}",
      ].join("") });
      c.createDiv({ text: "项目名（将创建 项目文档/<名字>项目看板.md）", cls: "wb-nb-hint" });
      const inp = c.createEl("input", { cls: "wb-nb-inp", type: "text" });
        inp.placeholder = "例如：我的项目";
      c.createDiv({ text: "类型", cls: "wb-nb-lb" });
      const typeSel = c.createEl("select", { cls: "wb-nb-sel" });
      typeSel.createEl("option", { text: "非阶段项目", value: "非阶段项目" });
      typeSel.createEl("option", { text: "阶段项目", value: "阶段项目" });
      c.createDiv({ text: "颜色", cls: "wb-nb-lb" });
      const pal = c.createDiv({ cls: "wb-nb-pal" });
      const PRESET = ["#4f8cff", "#e0af68", "#c26a3d", "#8cc265", "#e07f87", "#9a7bff", "#34c7c7", "#f5a623"];
      let chosen = PRESET[0];
      const marks = [];
      for (const hex of PRESET) {
        const sw = pal.createSpan({ cls: "wb-nb-swatch" + (hex === chosen ? " on" : "") });
        sw.style.background = hex;
        sw.title = hex;
        (function(h) { sw.addEventListener("click", () => { chosen = h; for (const x of marks) x.self.classList.remove("on"); sw.classList.add("on"); customInp.value = h; }); })(hex);
        marks.push({ self: sw });
      }
      const customWrap = pal.createSpan({ cls: "wb-nb-swatchcustom" });
      const customInp = customWrap.createEl("input", { cls: "wb-nb-colorhide", type: "color", value: chosen });
      customInp.style.cssText = "position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;";
      customWrap.style.position = "relative";
      customWrap.title = "自定义颜色";
      customWrap.addEventListener("click", () => customInp.click());
      customInp.addEventListener("input", () => { chosen = customInp.value; for (const x of marks) x.self.classList.remove("on"); });
      c.createDiv({ text: "起止日期", cls: "wb-nb-lb" });
      const dr = c.createDiv({ cls: "wb-nb-row" });
      const dStart = dr.createEl("input", { cls: "wb-nb-inp", type: "date" });
      const dEnd = dr.createEl("input", { cls: "wb-nb-inp", type: "date" });
      c.createDiv({ text: "描述", cls: "wb-nb-lb" });
      const desc = c.createEl("textarea", { cls: "wb-nb-desc" });
      desc.placeholder = "项目目标 / 说明（可选）";
      const stageWrap = c.createDiv({ cls: "wb-nb-stage" });
      stageWrap.createDiv({ text: "阶段（默认来自设置里的项目阶段，可改）", cls: "wb-nb-lb" });
      const stageInp = stageWrap.createEl("input", { cls: "wb-nb-inp", type: "text" });
      stageInp.value = this.getProjStagesEnabled().map((s) => s.name).join(", ");
      stageInp.placeholder = "立项, 规划, 开发, 测试, 上线";
      const curWrap = stageWrap.createDiv({});
      curWrap.createDiv({ text: "当前所处阶段", cls: "wb-nb-lb" });
      const curSel = curWrap.createEl("select", { cls: "wb-nb-sel" });
      curSel.createEl("option", { text: "（未开始）", value: "" });
      function refreshCur() {
        const isStg = typeSel.value === "阶段项目";
        stageWrap.classList.toggle("show", isStg);
        if (isStg) {
          const list = stageInp.value.split(/[,，]/).map((x) => x.trim()).filter((x) => x);
          const prev = curSel.value;
          curSel.empty();
          curSel.createEl("option", { text: "（未开始）", value: "" });
          for (const stg of list) curSel.createEl("option", { text: stg, value: stg });
          if (list.indexOf(prev) >= 0) curSel.value = prev;
        }
      }
      typeSel.addEventListener("change", refreshCur);
      stageInp.addEventListener("input", refreshCur);
      refreshCur();
      const go = () => {
        const name = inp.value;
        m.close();
      const clean = String(name || "").replace(/[\\/:*?"<>|#\s]+/g, "").trim();
      if (!clean) { new Notice("项目看板：名称为空，未创建"); return; }
      if (clean === "通用") { new Notice("项目看板：名称「通用」保留给自动通用看板，未创建"); return; }
      const type = typeSel.value;
      const cval = chosen || PRESET[0];
      const sval = dStart.value || "";
      const eval2 = dEnd.value || "";
      const dval = desc.value.trim();
      // 阶段：阶段项目用弹窗里填的（默认来自全局启用阶段），非阶段项目用全局启用阶段
      const globalStages = this.getProjStagesEnabled();
      const stval = type === "阶段项目"
        ? stageInp.value.split(/[,，]/).map((x) => x.trim()).filter((x) => x)
        : globalStages.map((s) => s.name);
      const curStage = type === "阶段项目" ? (curSel.value || "") : "";
      const p = this.projDir + "/" + clean + "项目看板.md";
      const fm = [
        "---",
        "类型: " + type,
        "颜色: " + cval,
        "开始: " + sval,
        "结束: " + eval2,
        "描述: " + dval,
        "阶段: [" + stval.join(", ") + "]",
        "当前阶段: " + curStage,
        "---",
        "",
      ].join("\n");
      const tplParts = [
        ">" + clean + "项目自动看板：任务照常在**每日笔记**里写，带上 `#" + clean + "` + 阶段标签，这里自动更新，无需手动维护。",
      ];
      for (let si = 0; si < stval.length; si++) {
        const sn = stval[si];
        const isDone = sn === "已完成";
        tplParts.push("> - " + sn + (si === 0 ? "：`- [ ] 任务 #" + clean + " #" + sn + " 📅 日期`" : "：把任务标签换成 `#" + sn + "`"));
      }
      tplParts.push("> - 打勾完成（自动记 ✅ 日期）后自动落入「已完成」");
      tplParts.push("> - 换项目：复制本文件，把 `#" + clean + "` 全部替换成新项目标签即可。");
      tplParts.push("");
      for (const sn of stval) {
        const isDone = sn === "已完成";
        tplParts.push("## " + sn);
        tplParts.push("");
        tplParts.push("```tasks");
        tplParts.push("hide toolbar");
        tplParts.push(isDone ? "has done date" : "not done");
        tplParts.push("tags include #" + clean);
        if (!isDone) tplParts.push("tags include #" + sn);
        tplParts.push("hide task count");
        tplParts.push("```");
        tplParts.push("");
      }
      const tpl = tplParts.join("\n");
      const mkDir = app.vault.createFolder || app.vault.createDirectory;
      const ensureDir = app.vault.getAbstractFileByPath(this.projDir) ? Promise.resolve() : mkDir.call(app.vault, this.projDir);
      ensureDir
        .then(() => app.vault.create(p, fm + tpl))
        .then(() => { new Notice("已创建项目看板：" + p + "（工作台已自动发现）"); })
        .catch((er) => { new Notice("创建失败：" + String((er && er.message) || er)); });
      };
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
      const btns = c.createDiv({ cls: "wb-nb-btns" });
      const cancelB = btns.createEl("button", { text: "取消", cls: "mod-secondary", attr: { type: "button" } });
      cancelB.addEventListener("click", () => m.close());
      const okB = btns.createEl("button", { text: "创建项目", cls: "mod-cta", attr: { type: "button" } });
      okB.addEventListener("click", go);
      inp.focus();
    };
    themeModal(m, this.theme);
    m.open();
  }
}
class WorkbenchView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.state = null;
    this.bannerEl = null;
    this.inspoView = "board";
    this.title = (plugin && plugin.wbTitle) || "Lyra";
  }
  getViewType() { return VIEW_TYPE; }
  getIcon() { return "gauge"; }
  getDisplayText() { return (this.plugin && this.plugin.wbTitle) || "Lyra"; }
  // 重写 getState：让 workspace.json 存的 title 跟随工作台名称，
  // 否则重载时 Obsidian 用旧 title 建占位 view，标签页会退回默认名
  getState() { return { title: (this.plugin && this.plugin.wbTitle) || "Lyra" }; }
  setState(_state, _ctx) { /* 工作台状态在 plugin.data 里，无需持久化到 leaf */ }
  updateTitle(t) {
    this.title = t || "Lyra";
    if (this.titleEl) { this.titleEl.setText(this.title); }
    if (this.leaf && this.leaf.tabHeaderInnerTitleEl) {
      this.leaf.tabHeaderInnerTitleEl.setText(this.title);
    }
  }
  applyGridToContent() {
    const t = this.plugin.theme || "a";
    const bg = t === "b" ? "#f5f1e8" : t === "c" ? "#ffffff" : "#0d1117";
    const ce = this.contentEl;
    ce.style.background = bg;
    ce.style.backgroundImage = "linear-gradient(rgba(128,140,160,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(128,140,160,.05) 1px, transparent 1px)";
    ce.style.backgroundSize = "22px 22px";
    ce.style.backgroundRepeat = "repeat";
  }
  onOpen() {
    this.app.vault.off("modify", this._bump);
    this.app.vault.off("create", this._bump);
    this.app.vault.off("delete", this._bump);
    window.clearInterval(this._clock);
    this._clock = window.setInterval(() => { if (this.root) this.renderHeadTime(); }, 30000);
    // 隐藏 Obsidian 视图头部（标题"工作台"+左右箭头），让背景网格顶到最上
    if (this.headerEl) { this.headerEl.style.display = "none"; }
    // 去掉 Obsidian view-content 默认内边距，让根背景铺满整个 leaf
    this.contentEl.style.padding = "0";
    this.contentEl.style.background = "transparent";
    this.updateTitle(this.plugin.wbTitle);
    const leafEl = this.contentEl.parentElement;
    if (leafEl) { leafEl.style.padding = "0"; leafEl.style.background = "transparent"; }
    this.contentEl.empty();
    this.applyGridToContent();
    this.root = this.contentEl.createDiv({ cls: "wb-root" });
    this.root.setAttribute("data-theme", this.plugin.theme);
    let timer = 0;
    this._bump = (file) => {
      if (!this.caresAbout(file)) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => { this.refresh().catch((er) => this.catchRender(er)); }, 150);
    };
    this.app.vault.on("modify", this._bump);
    this.app.vault.on("create", this._bump);
    this.app.vault.on("delete", this._bump);
    this.refresh().catch((er) => this.catchRender(er));
  }
  onClose() {
    this._stopStarMap();
    this.app.vault.off("modify", this._bump);
    this.app.vault.off("create", this._bump);
    this.app.vault.off("delete", this._bump);
    window.clearInterval(this._clock);
    if (this._pomoTick) { clearInterval(this._pomoTick); this._pomoTick = null; }
    this.root = null;
    this.pad = null;
  }
  caresAbout(file) {
    if (!file || !file.path) return true;
    const p = file.path;
    if (p.split("/").some((seg) => seg.startsWith(".") || seg === "docs" || seg === "_templates" || seg === "_excalidraw" || seg === "_mindmap")) return false;
    return p.endsWith(".md");
  }
  applyTheme(t) {
    if (!this.root) return;
    this.root.setAttribute("data-theme", t);
    this.root.querySelectorAll(".wb-switch .wb-btn").forEach((b) => { b.classList.toggle("on", b.textContent.toLowerCase() === t); });
    this.applyGridToContent();
  }
  // 迁移 banner 到按主题新格式 {a:{dataUrl,offsetY,scale}, b, c}
  // 兼容三种历史形态:
  //  1. 旧格式 {dataUrl, offsetY}(顶层有 dataUrl 字段,无 a)
  //  2. 混合脏数据 {dataUrl, offsetY, a, b, c}(既有顶层又有主题)
  //  3. 已是新格式 {a, b, c}
  _migrateBanner(b) {
    if (!b || typeof b !== "object") return this._emptyBanner();
    // 已是纯新格式(顶层无 dataUrl 字段)
    if (b.a && !("dataUrl" in b)) {
      return { a: this._normSlot(b.a), b: this._normSlot(b.b), c: this._normSlot(b.c) };
    }
    // 旧格式或混合脏数据:取顶层 dataUrl/offsetY 作为 a 的值,丢弃顶层字段
    const legacyDataUrl = ("dataUrl" in b) ? b.dataUrl : null;
    const legacyOffset = ("offsetY" in b) ? (b.offsetY || 0) : 0;
    const a = (b.a && typeof b.a === "object") ? b.a : { dataUrl: legacyDataUrl, offsetY: legacyOffset, scale: 1 };
    return {
      a: this._normSlot(a),
      b: this._normSlot(b.b),
      c: this._normSlot(b.c),
    };
  }
  _normSlot(s) {
    const o = (s && typeof s === "object") ? s : {};
    return { dataUrl: o.dataUrl || null, offsetY: o.offsetY || 0, scale: o.scale || 1 };
  }
  _emptyBanner() {
    return { a: { dataUrl: null, offsetY: 0, scale: 1 }, b: { dataUrl: null, offsetY: 0, scale: 1 }, c: { dataUrl: null, offsetY: 0, scale: 1 } };
  }
  _bannerOf(t) {
    if (!this.plugin.banner || typeof this.plugin.banner !== "object") this.plugin.banner = this._emptyBanner();
    // 运行时兜底:若仍是旧/混合形态,迁移
    if (!this.plugin.banner.a || ("dataUrl" in this.plugin.banner)) this.plugin.banner = this._migrateBanner(this.plugin.banner);
    this.plugin.banner[t] = this._normSlot(this.plugin.banner[t]);
    return this.plugin.banner[t];
  }
  async gatherFiles() {
    const out = [];
    for (const f of this.app.vault.getMarkdownFiles()) {
      if (f.path.split("/").some((s) => s.startsWith(".") || s === "docs" || s === "_templates")) continue;
      out.push({ path: f.path, text: await this.app.vault.read(f), mtime: f.stat.mtime });
    }
    return out;
  }
  render() {
    this._stopStarMap();
    const r = this.root;
    r.empty();
    r.setAttribute("data-glow", this.plugin.glow || "high");
    r.createEl("style", { text: CSS });
    this.pad = r.createDiv({ cls: "wb-pad" });
    this.renderBanner();
    this.renderHead();
    this.renderTabs();
    const page = this.plugin.page || "home";
    if (page === "home") {
      this.renderOverview();
    } else if (page === "project") {
      this.renderProject();
    } else if (page === "notes") {
      const sc = this.pad.createDiv({ cls: "wb-wall" });
      this.renderWall(sc);
    } else if (page === "inspo") {
      this.renderInspo();
    }
    this.bindScrollChaining();
  }
  bindScrollChaining() {
    // 项目内滚动到边界后，把滚轮"接力"给外层页面，避免鼠标停在项目上就只能滚该项目
    const scrollers = this.pad ? this.pad.querySelectorAll(".wb-asroll.wb-proj-item") : [];
    const outer = this.contentEl;
    for (const sc of scrollers) {
      if (sc._wbChain) continue;
      sc._wbChain = true;
      sc.addEventListener("wheel", (e) => {
        const dy = e.deltaY;
        if (dy === 0) return;
        const atTop = sc.scrollTop <= 0;
        const atBottom = sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 1;
        // 想往上滚但已在顶 → 接力给页面往上；想往下滚但已在底 → 接力给页面往下
        if ((dy < 0 && atTop) || (dy > 0 && atBottom)) {
          e.preventDefault();
          outer.scrollTop += dy;
        }
      }, { passive: false });
    }
  }
  saveInspo() { this.plugin.saveInspoData(); }
  async inspoSave(fn) {
    const app = this.app;
    const old = (this.inspoItems || []).map((it) => Object.assign({}, it));
    const out = fn(old);
    const dir = (this.plugin.inspoDir || "1-灵感").replace(/\/+$/, "");
    if (!app.vault.getAbstractFileByPath(dir)) { const mkDir = app.vault.createFolder || app.vault.createDirectory; await mkDir.call(app.vault, dir); }
    // 旧文件路径集合（用于找出被删除/改名的）
    const oldFiles = new Set(old.map((it) => it.file).filter(Boolean));
    // 遍历新列表：写每个灵感（新建或覆盖）
    for (const it of out) {
      const f = lib.inspFilePath(this.plugin.inspoDir || "1-灵感", it.id, it.title);
      if (!it.file) it.file = f;
      // 文件已存在 → modify；不存在 → create（vault.create 对已存在会抛错）
      const existing = app.vault.getAbstractFileByPath(f);
      const stgNames = this.plugin.inspoStageNamesFor();
      if (existing) await app.vault.modify(existing, lib.inspFileContent(it, null, stgNames));
      else await app.vault.create(f, lib.inspFileContent(it, null, stgNames));
      oldFiles.delete(f);
    }
    // 删除旧列表里有、但新列表里没有的文件（被删的灵感）
    for (const f of oldFiles) {
      if (!out.some((o) => o.id && f.endsWith(o.id + ".md")) && app.vault.getAbstractFileByPath(f)) {
        await app.vault.delete(app.vault.getAbstractFileByPath(f));
      }
    }
    // 反向同步：立项灵感的 col 变化（→done/→dropped）同步到其项目看板
    const oldById = {};
    for (const o of old) if (o && o.id) oldById[o.id] = o;
    for (const it of out) {
      if (!it || !it.launched) continue;
      const o = oldById[it.id];
      const oldCol = o ? (o.col || "inbox") : "inbox";
      try {
        if (it.col === "done" && oldCol !== "done") await this.syncLaunchedProject(it, "done");
        else if (it.col === "dropped" && oldCol !== "dropped") await this.syncLaunchedProject(it, "dropped");
      } catch (er) { er.wbStep = "call-syncLaunchedProject"; throw er; }
    }
    this.state = lib.collectState(await this.gatherFiles());
    this.inspoItems = await this.loadInspoFiles();
    try { this.render(); } catch (er) { this.catchRender(er); }
  }
  async syncLaunchedProject(it, newCol) {
    const app = this.app;
    const projDir = (this.plugin.projDir || "项目文档").replace(/\/+$/, "");
    const name = it.launched;
    const clean = lib.inspSlug(name);
    const boardRel = projDir + "/" + clean + "项目看板.md";
    const archiveRel = projDir + "/归档/" + clean + "项目看板.md";
    let boardFile = app.vault.getAbstractFileByPath(boardRel);
    if (!boardFile) { new Notice("未找到项目看板：" + boardRel, 5000); return; }
    const today = lib.todayStr();
    const marker = newCol === "done" ? "> ✅ 灵感已完成 " + today + "\n" : "> ❌ 灵感已放弃 " + today + "\n";
    try {
      const text = await app.vault.read(boardFile);
      const already = text.indexOf("> " + (newCol === "done" ? "✅ 灵感已完成" : "❌ 灵感已放弃")) >= 0;
      if (!already) {
        await app.vault.modify(boardFile, text.replace(/\s*$/, "") + "\n" + marker);
      }
      // 完成/放弃都归档（移到 项目文档/归档/，discoverTagBoards 排除该目录 → 看板不再显示）
      const archiveDir = projDir + "/归档";
      if (!app.vault.getAbstractFileByPath(archiveDir)) {
        const mkDir = app.vault.createFolder || app.vault.createDirectory;
        if (typeof mkDir === "function") await mkDir.call(app.vault, archiveDir);
      }
      if (typeof app.vault.rename === "function") {
        await app.vault.rename(boardFile, archiveRel);
      } else {
        const content = await app.vault.read(boardFile);
        await app.vault.create(archiveRel, content);
        await app.vault.delete(boardFile);
      }
      // 更新灵感文档「进行中」记录里的 wikilink → 指向归档后路径（避免点击新建空白文件）
      if (it.file) {
        const inspFile = app.vault.getAbstractFileByPath(it.file);
        if (inspFile) {
          const inspText = await app.vault.read(inspFile);
          const oldLink = projDir + "/" + clean + "项目看板";
          const newLink = projDir + "/归档/" + clean + "项目看板";
          if (inspText.indexOf("[[" + oldLink + "|") >= 0) {
            await app.vault.modify(inspFile, inspText.split("[[" + oldLink + "|").join("[[" + newLink + "|"));
          }
        }
      }
      new Notice("项目看板已" + (newCol === "done" ? "完成归档" : "放弃归档") + "：" + archiveRel, 4000);
    } catch (er) { new Notice("同步失败 step=" + (er && er.wbStep || "?") + " name=" + (er && er.name) + " msg=" + (er && er.message), 8000); }
  }
  async refresh() {
    if (!this.root) return;
    this.dismissBanner();
    this.state = lib.collectState(await this.gatherFiles());
    this.inspoItems = await this.loadInspoFiles();
    this.render();
  }
  async loadInspoFiles() {
    const dir = (this.plugin.inspoDir || "1-灵感") + "/";
    const out = [];
    for (const f of this.app.vault.getMarkdownFiles()) {
      if (!f.path.startsWith(dir)) continue;
      const name = f.path.slice(dir.length).replace(/\.md$/i, "");
      // 解析时同时认配置阶段名 + 旧默认阶段名，兼容旧文件记录
      const parseStages = this.plugin.inspoStageNamesFor().concat(lib.INSPO_STAGES.filter((s) => this.plugin.inspoStageNamesFor().indexOf(s) < 0));
      const meta = lib.parseInspoFile(this.state.files[f.path] || "", parseStages);
      const id = meta.id || (name.indexOf("__") >= 0 ? lib.inspIdFromName(name) : name);
      out.push(Object.assign({ id: id, file: f.path }, meta, { desc: this.inspDescOf(f.path) }));
    }
    return out;
  }
  inspDescOf(file) {
    const text = this.state.files[file] || "";
    const m = text.match(/##\s*背景\s*\/?\s*备注\s*\r?\n([\s\S]*?)(\r?\n##\s|\r?\n?$|$)/);
    if (!m) return "";
    const v = m[1].trim();
    return v === "（暂无描述）" ? "" : v;
  }
  renderInspo() {
    const all = this.inspoItems || [];
    const wrap = this.pad.createDiv({ cls: "wb-inspo" });
    const side = wrap.createDiv({ cls: "wb-inspo-side" });
    const mk = (id, label, dot, count) => {
      const row = side.createDiv({ cls: "wb-inspo-nav" + ((this.plugin.inspoFilter || "all") === id ? " on" : "") });
      if (dot) row.createSpan({ cls: "wb-inspo-dot", style: "background:" + dot });
      else row.createSpan({ cls: "wb-inspo-dot" + (id === "star" ? " star" : "") });
      const lb = row.createSpan({ text: label, cls: "wb-inspo-navlb" });
      if (dot) lb.style.color = dot;
      row.createSpan({ text: String(count), cls: "wb-inspo-navc" });
      row.addEventListener("click", () => this.plugin.setInspoFilter(id));
    };
    const norm = all.map(lib.normalizeInspo);
    const inspoCols = this.plugin.getInspoCols();
    const starred = norm.filter((it) => it.starred).length;
    mk("all", "全部", null, norm.length);
    for (const col of inspoCols) if (col.enabled) mk(col.id, col.label, col.dot, norm.filter((it) => it.col === col.id).length);
    mk("star", "星标", null, starred);
    const main = wrap.createDiv({ cls: "wb-inspo-main" });
    const top = main.createDiv({ cls: "wb-inspo-top" });
    const vt = top.createSpan({ cls: "wb-subtabs" });
    for (const v of [{ id: "board", label: "看板" }, { id: "list", label: "列表" }]) {
      const b = vt.createSpan({ text: v.label, cls: "wb-subtab" + ((this.inspoView === "list") === (v.id === "list") ? " on" : "") });
      b.addEventListener("click", () => { this.inspoView = v.id; this.render(); });
    }
    top.createSpan({ text: "＋ 新建灵感收集", cls: "wb-btn wb-inspo-new" }).addEventListener("click", () => this.newInspoModal("inbox"));
    const filt = this.plugin.inspoFilter || "all";
    const enabledIds = new Set(this.plugin.getInspoCols().filter((c) => c.enabled).map((c) => c.id));
    const visible = filt === "all"
      ? norm.filter((it) => enabledIds.has(it.col))
      : (filt === "star" ? norm.filter((it) => it.starred) : norm.filter((it) => it.col === filt));
    if (this.inspoView === "list") {
      this.inspoList(main, visible);
    } else {
      const grid = main.createDiv({ cls: "wb-inspo-grid" });
      const enabledCols = inspoCols.filter((c) => c.enabled);
      if (enabledCols.length) grid.style.gridTemplateColumns = "repeat(" + enabledCols.length + ", 1fr)";
      for (const col of inspoCols) {
        if (!col.enabled) continue;
        const items = (filt === "all" ? norm.filter((it) => it.col === col.id) : (filt === "star" ? norm.filter((it) => it.col === col.id && it.starred) : (filt === col.id ? norm.filter((it) => it.col === col.id) : [])));
        const card = grid.createDiv({ cls: "wb-inspo-col" });
        if (col.dot) card.style.setProperty("--wb-inspo-c", col.dot);
        const ch = card.createDiv({ cls: "wb-inspo-colh" });
        const ct = ch.createSpan({ text: col.label, cls: "wb-inspo-coltitle" });
        if (col.dot) ct.style.color = col.dot;
        ch.createSpan({ text: String(items.length), cls: "wb-inspo-colcount" });
        const body = card.createDiv({ cls: "wb-inspo-colbody" });
        for (const it of items) this.inspoCard(body, it, col.id);
        if (!items.length) body.createDiv({ text: "（空）", cls: "wb-inspo-empty" });
      }
    }
  }
  inspoList(parent, items) {
    if (!items.length) { parent.createDiv({ text: "（无灵感）", cls: "wb-inspo-empty big" }); return; }
    const box = parent.createDiv({ cls: "wb-inspo-list" });
    for (const it of items) this.inspoRow(box, it);
  }
  inspoRow(parent, it) {
    const r = parent.createDiv({ cls: "wb-inspo-list-r" });
    r.style.cursor = "pointer";
    r.addEventListener("click", () => this.openNote(it.file));
    const star = r.createSpan({ text: it.starred ? "★" : "☆", cls: "wb-inspo-star" + (it.starred ? " on" : "") });
    star.addEventListener("click", (e) => { e.stopPropagation(); this.inspoSave((list) => list.map((x) => x.id === it.id ? Object.assign({}, x, { starred: !x.starred }) : x)); });
    r.createSpan({ text: it.title || "（无标题）", cls: "wb-inspo-lt" });
    if (it.launched) r.createSpan({ text: "🚀 " + it.launched, cls: "wb-inspo-tag wb-inspo-launched" });
    const colInfo = this.plugin.getInspoCols().find((c) => c.id === it.col) || {};
    r.createSpan({ text: colInfo.label || it.col, cls: "wb-inspo-lc", style: "color:" + (colInfo.dot || "var(--muted)") });
    if (it.tags && it.tags.length) r.createSpan({ text: it.tags.map((t) => "#" + t).join(" "), cls: "wb-inspo-ltags" });
    const del = r.createSpan({ text: "删", cls: "wb-inspo-del" });
    del.addEventListener("click", (e) => { e.stopPropagation(); this.inspoSave((list) => list.filter((x) => x.id !== it.id)); });
  }
  inspoCard(parent, it, col) {
    const c = parent.createDiv({ cls: "wb-inspo-card" });
    c.style.cursor = "pointer";
    c.addEventListener("click", () => this.openNote(it.file));
    const head = c.createDiv({ cls: "wb-inspo-ch" });
    const star = head.createSpan({ text: it.starred ? "★" : "☆", cls: "wb-inspo-star" + (it.starred ? " on" : "") });
    star.addEventListener("click", (e) => { e.stopPropagation(); this.inspoSave((list) => list.map((x) => x.id === it.id ? Object.assign({}, x, { starred: !x.starred }) : x)); });
    const titleEl = head.createSpan({ text: it.title || "（无标题）", cls: "wb-inspo-ct" });
    if (it.launched) head.createSpan({ text: "🚀 " + it.launched, cls: "wb-inspo-tag wb-inspo-launched" });
    if (it.tags && it.tags.length) {
      const tr = c.createDiv({ cls: "wb-inspo-tags" });
      for (const t of it.tags) tr.createSpan({ text: "#" + t, cls: "wb-inspo-tag" });
    }
    if (it.desc) c.createDiv({ text: it.desc, cls: "wb-inspo-cd" });
    const meta = c.createDiv({ cls: "wb-inspo-cm" });
    meta.createSpan({ text: it.created || "", cls: "wb-inspo-date" });
    const act = (to) => this.inspoSave((list) => list.map((x) => x.id === it.id ? Object.assign({}, x, { col: to }) : x));
    const NEXT = { inbox: "eval", eval: "doing", doing: "done" };
    const NLBL = { eval: "评估", doing: "进行", done: "完成" };
    if (NEXT[col]) { const b = meta.createSpan({ text: "→ " + NLBL[NEXT[col]], cls: "wb-inspo-act" }); b.addEventListener("click", (e) => { e.stopPropagation(); act(NEXT[col]); }); }
    if (col === "eval" && !it.launched) { const lb = meta.createSpan({ text: "⚑ 立项", cls: "wb-inspo-act" }); lb.addEventListener("click", (e) => { e.stopPropagation(); this.inspLaunch(it); }); }
    const drop = meta.createSpan({ text: "放弃", cls: "wb-inspo-act dim" });
    drop.addEventListener("click", (e) => { e.stopPropagation(); act("dropped"); });
    if (col === "dropped") { const rb = meta.createSpan({ text: "回收集箱", cls: "wb-inspo-act" }); rb.addEventListener("click", (e) => { e.stopPropagation(); act("inbox"); }); }
    const del = meta.createSpan({ text: "删", cls: "wb-inspo-del" });
    del.addEventListener("click", (e) => { e.stopPropagation(); this.inspoSave((list) => list.filter((x) => x.id !== it.id)); });
  }
  async inspLaunch(it) {
    const app = this.app;
    const m = new Modal(app);
    m.setTitle("立项：" + (it.title || "灵感"));
    m.onOpen = () => {
      const c = m.contentEl;
      c.createEl("style", { text: ".wb-il{width:100%;box-sizing:border-box;padding:8px;border:1px solid var(--background-modifier-border);border-radius:6px;background:var(--background-primary);color:var(--text-normal);font-size:14px;margin-top:4px;}" });
      c.createDiv({ text: "项目名（将建 项目文档/<名>项目看板.md）", cls: "wb-iil" });
      const inp = c.createEl("input", { type: "text", cls: "wb-il" });
      inp.value = it.title || "";
      const go = async () => {
        const name = inp.value.trim();
        const clean = lib.inspSlug(name);
        if (!clean) { new Notice("项目名不能为空"); return; }
        const boardPath = this.plugin.projDir + "/" + clean + "项目看板.md";
        if (app.vault.getAbstractFileByPath(boardPath)) { new Notice("已存在同名项目看板，请改个名字"); return; }
        const stages = this.plugin.getProjStagesEnabled().map((s) => s.name);
        const payload = lib.launchProjectPayload(clean, it.id, lib.todayStr(), stages);
        try {
          await app.vault.create(boardPath, payload.fm + payload.tpl);
        } catch (er) { new Notice("创建失败：" + ((er && er.message) || er)); return; }
        this.inspoSave((list) => list.map((x) => x.id === it.id
          ? Object.assign({}, x, {
              col: "doing",
              launched: name,
              records: Object.assign({}, x.records || {}, { "进行中": ((x.records && x.records["进行中"]) ? x.records["进行中"] + "\n" : "") + "> 已立项 → [[" + boardPath.replace(/\.md$/, "") + "|" + clean + "]]" })
            })
          : x));
        m.close();
        new Notice("已立项：" + boardPath);
      };
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
      const bb = c.createDiv({ cls: "wb-iib" });
      const cb = bb.createEl("button", { text: "取消", cls: "mod-secondary", attr: { type: "button" } }); cb.addEventListener("click", () => m.close());
      const ob = bb.createEl("button", { text: "立项", cls: "mod-cta", attr: { type: "button" } }); ob.addEventListener("click", go);
      inp.focus();
    };
    themeModal(m, this.plugin.theme);
    m.open();
  }
  renderViewLocal() { this.render(); }
  newInspoModal(col) {
    const app = this.app;
    const m = new Modal(app);
    m.setTitle("新建灵感");
    m.onOpen = () => {
      const c = m.contentEl;
      c.createEl("style", { text: ".wb-ii{width:100%;box-sizing:border-box;padding:8px;border:1px solid var(--background-modifier-border);border-radius:6px;background:var(--background-primary);color:var(--text-normal);font-size:14px;margin-top:4px;}.wb-iil{font-size:12px;color:var(--text-muted);margin-top:10px;}.wb-iib{margin-top:12px;display:flex;justify-content:flex-end;gap:8px;}" });
      c.createDiv({ text: "标题", cls: "wb-iil" });
      const ti = c.createEl("input", { type: "text", cls: "wb-ii" }); ti.placeholder = "一句话灵感";
      c.createDiv({ text: "标签（逗号分隔）", cls: "wb-iil" });
      const tg = c.createEl("input", { type: "text", cls: "wb-ii" }); tg.placeholder = "产品, 设计";
      c.createDiv({ text: "描述", cls: "wb-iil" });
      const de = c.createEl("textarea", { cls: "wb-ii" }); de.style.minHeight = "70px"; de.placeholder = "详细想法（可选）";
      const go = async () => {
        const title = ti.value.trim();
        if (!title) { new Notice("灵感：标题为空"); return; }
        const tags = lib.parseInspoTags(tg.value);
        m.close();
        const id = Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
        await this.inspoSave((list) => [{ id: id, title: title, tags: tags, desc: de.value.trim(), col: col, created: lib.todayStr(), starred: false }].concat(list));
      };
      ti.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
      const bb = c.createDiv({ cls: "wb-iib" });
      const cb = bb.createEl("button", { text: "取消", cls: "mod-secondary", attr: { type: "button" } }); cb.addEventListener("click", () => m.close());
      const ob = bb.createEl("button", { text: "新建", cls: "mod-cta", attr: { type: "button" } }); ob.addEventListener("click", go);
      ti.focus();
    };
    themeModal(m, this.plugin.theme);
    m.open();
  }
  renderTabs() {
    const bar = this.pad.createDiv({ cls: "wb-tabs" });
    const tabWrap = bar.createSpan({ cls: "wb-tabs-l" });
    const items = [ { id: "home", label: "首页", icon: "⌂" }, { id: "project", label: "项目", icon: "▦" }, { id: "notes", label: "笔记", icon: "❐" }, { id: "inspo", label: "灵感", icon: "✦" } ];
    const cur = this.plugin.page || "home";
    for (const it of items) {
      const t = tabWrap.createSpan({ cls: "wb-tab" + (cur === it.id ? " on" : "") });
      t.createSpan({ text: it.icon + " ", cls: "wb-tab-ic" });
      t.createSpan({ text: it.label, cls: "wb-tab-lb" });
      t.addEventListener("click", () => this.plugin.setPage(it.id));
    }
    // 右侧：动作按钮（与 tab 同一行水平对齐）
    this.renderHeadActions(bar);
  }
  renderHeadTime() {
    if (!this._timeEl || !this._metaEl) return;
    const now = new Date();
    const hh = lib.pad2(now.getHours()), mm = lib.pad2(now.getMinutes());
    this._timeEl.textContent = lib.dateStr(now).replace(/-/g, "/") + " " + hh + ":" + mm;
    const lunar = lib.lunarCN(now);
    let meta = "星期" + WD[now.getDay()];
    if (lunar) meta += " · 农历 " + lunar;
    this._metaEl.textContent = meta;
  }
  renderBanner() {
    const t = this.plugin.theme || "a";
    const b = this._bannerOf(t);
    const bar = this.pad.createDiv({ cls: "wb-banner" });
    const img = bar.createEl("img", { cls: "wb-banner-img" + (b.dataUrl ? "" : " hide") });
    if (b.dataUrl) {
      img.src = b.dataUrl;
      const sc = b.scale || 1;
      img.style.transform = "translateY(" + (b.offsetY || 0) + "px) scale(" + sc + ")";
      img.style.transformOrigin = "center top";
    }
    if (!b.dataUrl) bar.createDiv({ text: "[ 封面 ]  ·  悬停右上角按钮插入封面图片", cls: "wb-banner-ph" });
    const ctl = bar.createDiv({ cls: "wb-banner-bar" });
    const pick = ctl.createSpan({ text: b.dataUrl ? "换图" : "插入封面", cls: "wb-banner-btn" });
    const fi = bar.createEl("input", { cls: "wb-banner-fi", type: "file", accept: "image/*" });
    pick.addEventListener("click", () => fi.click());
    fi.addEventListener("change", () => {
      const file = fi.files && fi.files[0];
      if (!file) return;
      const rd = new FileReader();
      rd.onload = () => { b.dataUrl = String(rd.result); b.offsetY = 0; b.scale = 1; this.plugin.saveBanner(); this.render(); };
      rd.readAsDataURL(file);
    });
    if (b.dataUrl) {
      const reset = ctl.createSpan({ text: "重置", cls: "wb-banner-btn" });
      reset.title = "重置本主题封面位置/缩放";
      reset.addEventListener("click", () => { b.offsetY = 0; b.scale = 1; this.plugin.saveBanner(); this.render(); });
      const rm = ctl.createSpan({ text: "移除", cls: "wb-banner-btn" });
      rm.addEventListener("click", () => { b.dataUrl = null; b.offsetY = 0; b.scale = 1; this.plugin.saveBanner(); this.render(); });
      const tip = bar.createDiv({ text: "左键拖动移动 · 右键放大 · Shift+右键缩小 · 自动保存", cls: "wb-banner-tip" });
      // 左键拖调位置（带 4px 阈值：轻点不触发拖拽，只有真正划动才移动）
      img.addEventListener("mousedown", (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        const startY = e.clientY;
        const startOff = b.offsetY || 0;
        let dragging = false;
        const apply = (off, sc) => {
          const cur = this.root && this.root.querySelector(".wb-banner-img");
          if (cur) cur.style.transform = "translateY(" + off + "px) scale(" + (sc || (b.scale || 1)) + ")";
        };
        const move = (ev) => {
          const dy = ev.clientY - startY;
          if (!dragging && Math.abs(dy) < 4) return;
          dragging = true;
          b.offsetY = startOff + dy;
          apply(startOff + dy);
        };
        const up = () => {
          if (dragging) this.plugin.saveBanner();
          document.removeEventListener("mousemove", move);
          document.removeEventListener("mouseup", up);
        };
        document.addEventListener("mousemove", move);
        document.addEventListener("mouseup", up);
      });
      // 右键缩放（preventDefault 避免菜单，与页面滚轮滚动错开）：右键=放大，Shift+右键=缩小
      bar.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        b.scale = e.shiftKey ? Math.max(0.5, (b.scale || 1) - 0.1) : Math.min(3, (b.scale || 1) + 0.1);
        const cur = this.root && this.root.querySelector(".wb-banner-img");
        if (cur) cur.style.transform = "translateY(" + (b.offsetY || 0) + "px) scale(" + b.scale + ")";
        clearTimeout(this._bannerZoomTimer);
        this._bannerZoomTimer = setTimeout(() => this.plugin.saveBanner(), 300);
      });
    }
  }
  renderHead() {
    const now = new Date();
    const h = this.pad.createDiv({ cls: "wb-head" });
    // 左：标题（居中块）
    const tl = h.createSpan({ cls: "wb-tl" });
    const eyebrow = (this.plugin.wbEyebrow || "").trim();
    if (eyebrow) tl.createDiv({ text: eyebrow, cls: "wb-eyebrow" });
    const titleText = this.plugin.wbTitle || "Lyra";
    const hasCjk = /[\u4e00-\u9fff\u3400-\u4dbf]/.test(titleText);
    tl.createDiv({ text: titleText, cls: "wb-title" + (hasCjk ? " wb-title-cjk" : "") });
    // 最右：时间块（Xove 风格：日期+时间 大 / 周几·农历 小）
    const tr = h.createSpan({ cls: "wb-tr" });
    this._timeEl = tr.createDiv({ cls: "wb-time" });
    this._metaEl = tr.createDiv({ cls: "wb-meta" });
    this.renderHeadTime();
  }
  renderHeadActions(parent) {
    // 捕捉 + 工具 + 主题切换 + 设置（放在分页 tab 同一行右侧）
    this.renderCapture(parent);
    this.renderToolbar(parent);
    const sw = parent.createSpan({ cls: "wb-switch" });
    for (const t of ["a","b","c"]) {
      const b = sw.createSpan({ text: t.toUpperCase(), cls: "wb-btn" + (t === this.plugin.theme ? " on" : "") });
      b.addEventListener("click", () => this.plugin.setTheme(t));
    }
    const setBtn = parent.createSpan({ cls: "wb-btn wb-set-btn" });
    setBtn.title = "打开插件设置";
    setBtn.setText("⚙ 设置");
    setBtn.addEventListener("click", () => {
      const st = this.plugin.app.setting;
      if (!st) return;
      const tab = this.plugin.settingTab;
      if (tab && st.tabs && st.tabs.some((t) => t === tab)) { st.open(tab); return; }
      if (tab) { st.open(); requestAnimationFrame(() => { try { st.openTab(tab); } catch (e) {} }); return; }
      st.open();
    });
  }
  renderToolbar(h) {
    const bar = h.createSpan({ cls: "wb-toolbar" });
    const items = [
      { ic: "✎", label: "新建日记", tip: "打开今日日记（无则创建；已打开则跳转）", run: () => this.openPeriodicNote("daily") },
      { ic: "▤", label: "新建周记", tip: "打开本周周记（无则创建；已打开则跳转）", run: () => this.openPeriodicNote("weekly") },
      { ic: "✚", label: "新建任务", tip: "弹窗新建任务（写今日笔记）", run: () => this.newTaskModal() },
      { ic: "🗂", label: "新建项目", tip: "新建项目看板（模板）", run: () => this.plugin.newProjectBoard() },
      { ic: "📦", label: "归档", tip: "一键归档日记/周记到归档目录（自动修复链接）", run: () => this.archiveModal() },
    ];
    for (const it of items) {
      const b = bar.createSpan({ cls: "wb-tb-btn" });
      b.title = it.tip;
      b.createSpan({ text: it.ic + " ", cls: "wb-tb-ic" });
      b.createSpan({ text: it.label, cls: "wb-tb-lb" });
      b.addEventListener("click", () => it.run());
    }
  }
  execCmd(ids) {
    const cmds = this.app.commands.commands;
    for (const id of ids) {
      if (cmds[id]) { this.app.commands.executeCommandById(id); return; }
    }
    this.banner("未找到对应命令（请在 设置→命令 里确认 Periodic Notes 已启用）");
  }
  openPeriodicNote(kind) {
    // 自己算路径（与 Periodic Notes 默认一致）：文件已存在 → openNote（内部先找已打开标签页跳转，没有才开新页）
    const now = new Date();
    const p = kind === "weekly" ? (this.plugin.weeklyDir + "/" + lib.isoYearWeek(now) + ".md") : (this.plugin.dailyDir + "/" + lib.dateStr(now) + ".md");
    if (this.app.vault.getAbstractFileByPath(p)) { this.openNote(p); return; }
    // 不存在：优先交给 Periodic Notes 按模板创建；若未安装该插件，则自建一个基础日记文件（不依赖外部插件）
    const pnIds = kind === "weekly" ? ["periodic-notes:open-weekly-note", "open-weekly-note"] : ["periodic-notes:open-daily-note", "open-daily-note"];
    const cmds = this.app.commands.commands;
    if (pnIds.some((id) => cmds[id])) {
      this.execCmd(pnIds);
    } else {
      this.createPeriodicNoteFallback(kind, p);
    }
  }
  archiveModal() {
    const app = this.app;
    const m = new Modal(app);
    m.setTitle("一键归档");
    m.onOpen = () => {
      const c2 = m.contentEl;
      c2.createEl("style", { text: ".wb-mml{font-size:12px;color:var(--text-muted);margin-top:10px;margin-bottom:10px;}.wb-mmb{margin-top:14px;display:flex;justify-content:flex-end;gap:8px;}.wb-arc-tabs{display:flex;gap:6px;margin-bottom:10px;}.wb-arc-tab{flex:1;padding:8px 12px;border:1px solid var(--background-modifier-border);border-radius:8px;background:var(--background-primary);color:var(--text-normal);font-size:13px;cursor:pointer;text-align:center;transition:border-color .12s,background .12s;}.wb-arc-tab.active{border-color:var(--interactive-accent);background:var(--interactive-accent);color:#fff;font-weight:600;}.wb-arc-list{max-height:220px;overflow-y:auto;border:1px solid var(--background-modifier-border);border-radius:8px;margin-bottom:10px;padding:4px;}.wb-arc-file{padding:6px 10px;border-radius:6px;font-size:12px;color:var(--text-normal);cursor:pointer;font-variant-numeric:tabular-nums;}.wb-arc-file:hover{background:var(--background-modifier-hover);}.wb-arc-file.sel{background:var(--interactive-accent);color:#fff;}.wb-arc-preview{padding:10px 12px;border:1px solid var(--background-modifier-border);border-radius:8px;background:var(--background-secondary);font-size:11px;line-height:1.6;margin-bottom:4px;}.wb-arc-src{color:var(--text-normal);}.wb-arc-dst{color:var(--text-muted);}.wb-arc-miss{color:var(--text-error);font-weight:600;}" });
      const arcDir = this.plugin.archiveDir || "笔记归档";
      c2.createDiv({ text: "从下面列表选择要归档的笔记（移到「" + arcDir + "」，自动修复链接）", cls: "wb-mml" });
      let kind = "daily";
      let pick = null;
      const tabs = c2.createDiv({ cls: "wb-arc-tabs" });
      const tabD = tabs.createEl("button", { cls: "wb-arc-tab active", text: "📅 日记", attr: { type: "button" } });
      const tabW = tabs.createEl("button", { cls: "wb-arc-tab", text: "▤ 周记", attr: { type: "button" } });
      const listBox = c2.createDiv({ cls: "wb-arc-list" });
      const preview = c2.createDiv({ cls: "wb-arc-preview" });
      const srcLine = preview.createDiv({ cls: "wb-arc-src" });
      const dstLine = preview.createDiv({ cls: "wb-arc-dst" });
      const bb = c2.createDiv({ cls: "wb-mmb" });
      const archiveBtn = bb.createEl("button", { text: "📦 归档", cls: "mod-cta", attr: { type: "button" } });
      const cancelBtn = bb.createEl("button", { text: "取消", cls: "mod-secondary", attr: { type: "button" } });
      cancelBtn.addEventListener("click", () => m.close());
      const updatePreview = () => {
        const srcDir = kind === "weekly" ? this.plugin.weeklyDir : this.plugin.dailyDir;
        const subDir = kind === "weekly" ? "每周" : "每日";
        if (!pick) {
          srcLine.setText("源：（先从上面列表选择一篇）");
          dstLine.setText("→ " + arcDir + "/" + subDir + "/");
          archiveBtn.disabled = true;
          return;
        }
        srcLine.setText("源：" + srcDir + "/" + pick + ".md");
        dstLine.setText("→ " + arcDir + "/" + subDir + "/" + pick + ".md");
        archiveBtn.disabled = false;
      };
      const loadList = () => {
        pick = null;
        listBox.empty();
        const srcDir = kind === "weekly" ? this.plugin.weeklyDir : this.plugin.dailyDir;
        const folder = app.vault.getAbstractFileByPath(srcDir);
        let files = [];
        if (folder && folder.children) files = folder.children.filter((f) => f.name && f.name.endsWith(".md"));
        files.sort((a, b) => b.name.localeCompare(a.name));
        if (!files.length) {
          listBox.createDiv({ text: "（" + srcDir + " 下没有笔记）", cls: "wb-arc-miss" });
        }
        const show = files.slice(0, 50);
        for (const f of show) {
          const item = listBox.createDiv({ cls: "wb-arc-file", text: f.name.replace(/.md$/, "") });
          item.addEventListener("click", () => {
            listBox.querySelectorAll(".wb-arc-file").forEach((el) => el.removeClass("sel"));
            item.addClass("sel");
            pick = f.name.replace(/.md$/, "");
            updatePreview();
          });
        }
        updatePreview();
      };
      tabD.addEventListener("click", () => { kind = "daily"; tabD.addClass("active"); tabW.removeClass("active"); loadList(); });
      tabW.addEventListener("click", () => { kind = "weekly"; tabW.addClass("active"); tabD.removeClass("active"); loadList(); });
      archiveBtn.addEventListener("click", () => { m.close(); this.archiveCurrentNote(kind, pick); });
      loadList();
    };
    themeModal(m, this.plugin.theme);
    m.open();
  }
  async archiveCurrentNote(kind, fname) {
    const app = this.app;
    // fname = 文件名（不含 .md）；缺省回退到今天/本周
    const name = fname || (kind === "weekly" ? lib.isoYearWeek(new Date()) : lib.todayStr());
    const srcDir = kind === "weekly" ? this.plugin.weeklyDir : this.plugin.dailyDir;
    const srcPath = srcDir + "/" + name + ".md";
    const subDir = kind === "weekly" ? "每周" : "每日";
    const dstDir = this.plugin.archiveDir + "/" + subDir;
    const dstPath = dstDir + "/" + name + ".md";
    const srcFile = app.vault.getAbstractFileByPath(srcPath);
    if (!srcFile) { new Notice("未找到该" + (kind === "weekly" ? "周记" : "日记") + "：" + srcPath); return; }
    if (app.vault.getAbstractFileByPath(dstPath)) { new Notice("目标已存在，未归档：" + dstPath); return; }
    try {
      if (!app.vault.getAbstractFileByPath(dstDir)) {
        const mkDir = app.vault.createFolder || app.vault.createDirectory;
        if (typeof mkDir === "function") await mkDir.call(app.vault, dstDir);
      }
      if (typeof app.vault.rename === "function") {
        await app.vault.rename(srcFile, dstPath);
      } else {
        const content = await app.vault.read(srcFile);
        await app.vault.create(dstPath, content);
        await app.vault.delete(srcFile);
      }
      new Notice("已归档到 " + dstPath);
      this.refresh().catch(() => {});
    } catch (e) {
      new Notice("归档失败：" + String((e && e.message) || e));
      console.error("[Lyra] archive error", e);
    }
  }
  async createPeriodicNoteFallback(kind, p) {
    // 未安装 Periodic Notes 时自建基础日记/周记（不依赖外部插件）
    const app = this.app;
    const today = lib.dateStr(new Date());
    const week = lib.isoYearWeek(new Date());
    const isWeek = kind === "weekly";
    const body = isWeek
      ? "---\n周: " + week + "\n---\n\n## 本周目标\n- \n\n## 本周待办\n```tasks\nhide toolbar\nnot done\nhide task count\n```\n\n## 本周完成\n```tasks\nhide toolbar\ndone\nhide task count\n```\n\n## 回顾\n- \n"
      : "---\n日期: " + today + "\n---\n\n## 今日待办（自动汇总）\n```tasks\nhide toolbar\nnot done\ndue before tomorrow\nhide task count\n```\n\n## 今天完成\n```tasks\nhide toolbar\ndone after yesterday\ndone before tomorrow\nhide task count\n```\n\n## 明日计划\n- \n\n## 学习与思考\n- \n";
    try {
      const dir = p.split("/").slice(0, -1).join("/");
      if (dir && !app.vault.getAbstractFileByPath(dir)) { const mkDir = app.vault.createFolder || app.vault.createDirectory; await mkDir.call(app.vault, dir); }
      await app.vault.create(p, body);
      this.banner("已创建" + (isWeek ? "周记" : "日记") + "：" + p);
      this.openNote(p);
    } catch (er) {
      new Notice("创建失败：" + String((er && er.message) || er));
    }
  }
  newTaskModal() {
    const app = this.app;
    const m = new Modal(app);
    m.setTitle("新建任务");
    m.onOpen = () => {
      const c = m.contentEl;
      c.createEl("style", { text: ".wb-mml{font-size:12px;color:var(--text-muted);margin-top:10px;}.wb-mmi{width:100%;box-sizing:border-box;padding:8px;border:1px solid var(--background-modifier-border);border-radius:6px;background:var(--background-primary);color:var(--text-normal);font-size:14px;margin-top:4px;}.wb-mmb{margin-top:14px;display:flex;justify-content:flex-end;gap:8px;}" });
      c.createDiv({ text: "任务内容", cls: "wb-mml" });
      const ti = c.createEl("input", { type: "text", cls: "wb-mmi" }); ti.placeholder = "要做的事";
      c.createDiv({ text: "截止时间", cls: "wb-mml" });
      const dt = c.createEl("input", { type: "date", cls: "wb-mmi" }); dt.value = lib.todayStr();
      const clr = c.createSpan({ text: "清除日期", cls: "wb-mmlink" });
      c.createDiv({ text: "标签（逗号分隔）", cls: "wb-mml" });
      const tg = c.createEl("input", { type: "text", cls: "wb-mmi" }); tg.placeholder = "例如：工作, 学习";
      const go = () => {
        const v = ti.value.trim();
        if (!v) { new Notice("任务：内容为空"); return; }
        m.close();
        this.addTaskLine(v, dt.value || null, tg.value);
      };
      ti.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
      clr.addEventListener("click", () => { dt.value = ""; });
      const bb = c.createDiv({ cls: "wb-mmb" });
      const cb = bb.createEl("button", { text: "取消", cls: "mod-secondary", attr: { type: "button" } }); cb.addEventListener("click", () => m.close());
      const ob = bb.createEl("button", { text: "新建", cls: "mod-cta", attr: { type: "button" } }); ob.addEventListener("click", go);
      ti.focus();
    };
    themeModal(m, this.plugin.theme);
    m.open();
  }
  async addTaskLine(desc, due, tagsStr) {
    const app = this.app;
    const today = lib.todayStr();
    const p = this.plugin.dailyDir + "/" + today + ".md";
    if (!app.vault.getAbstractFileByPath(p)) {
      await app.vault.create(p, "---\n日期: " + today + "\n---\n\n## 今日待办（自动汇总）\n```tasks\npath does not include docs\npath does not include _templates\nhide toolbar\nnot done\ndue before tomorrow\nhide task count\n```\n\n## 今天完成\n```tasks\npath does not include docs\npath does not include _templates\ndone after yesterday\ndone before tomorrow\nhide toolbar\nhide task count\n```\n\n## 明日计划\n- \n\n## 学习与思考\n- \n");
    }
    const tags = lib.parseInspoTags(tagsStr);
    const tagPart = tags.length ? " " + tags.map((x) => "#" + x).join(" ") : " #今日";
    const duePart = due ? " 📅 " + due : "";
    const line = "- [ ] " + desc + tagPart + duePart;
    await this.apply(p, (text) => { return { ok: true, text: text.replace(/\s*$/, "") + "\n" + line, changed: true }; });
    this.refresh().catch(() => {});
    this.banner("已新建任务：" + desc);
  }
  focusCapture() {
    const inp = this.root && this.root.querySelector(".wb-capture-inp");
    if (inp) { inp.focus(); inp.scrollIntoView({ block: "center" }); }
  }
  renderCapture(h) {
    const cap = h.createSpan({ cls: "wb-capture" });
    const inp = cap.createEl("input", { type: "text", cls: "wb-capture-inp", placeholder: "快速捕获灵感：回车存入收集箱" });
    const go = () => {
      const v = inp.value.trim();
      if (!v) return;
      inp.value = "";
      this.captureInspo(v);
    };
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); go(); } });
    const btn = cap.createSpan({ text: "+", cls: "wb-capture-btn" });
    btn.addEventListener("click", go);
  }
  async captureInspo(text, tags, desc, starred) {
    const id = Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
    try {
      await this.inspoSave((list) => [{ id: id, title: text, tags: tags || [], desc: desc || "", col: "inbox", created: lib.todayStr(), starred: !!starred, records: {} }].concat(list));
      new Notice("已捕获灵感：" + text);
    } catch (er) { new Notice("捕获失败：" + String((er && er.message) || er)); }
  }
  async captureTask(desc) {
    const app = this.app;
    const today = lib.todayStr();
    const p = this.plugin.dailyDir + "/" + today + ".md";
    let file = app.vault.getAbstractFileByPath(p);
    if (!file) {
      await app.vault.create(p, "---\n日期: " + today + "\n---\n\n## 今日待办（自动汇总）\n```tasks\npath does not include docs\npath does not include _templates\nhide toolbar\nnot done\ndue before tomorrow\nhide task count\n```\n\n## 今天完成\n```tasks\npath does not include docs\npath does not include _templates\ndone after yesterday\ndone before tomorrow\nhide toolbar\nhide task count\n```\n\n## 明日计划\n- \n\n## 学习与思考\n- \n");
      file = app.vault.getAbstractFileByPath(p);
    }
    const line = lib.appendTaskLine(desc, today, "今日");
    await this.apply(p, (text) => { return { ok: true, text: text.replace(/\s*$/, "") + "\n" + line, changed: true }; });
    this.banner("已捕获到今日笔记：" + desc);
  }
  allBoardTasks() {
    const seen = {};
    const out = [];
    const pt = lib.projectTagsOf(this.state);
    for (const t of this.state.tasks) { if (t.tags.some((x) => pt.includes(x) || x === "进行中" || x === "待办")) { const k = t.file + ":" + t.lineIndex; if (!seen[k]) { seen[k] = 1; out.push(t); } } }
    return out;
  }
  renderProject() {
    const all = this.allBoardTasks();
    const filtered = lib.filterByStage(all, this.plugin.projStage || "all");
    const ctrl = this.pad.createDiv({ cls: "wb-proj-ctrl" });
    const vt = ctrl.createSpan({ cls: "wb-subtabs" });
    const vitems = [ { id: "kanban", label: "看板" }, { id: "list", label: "列表" }, { id: "cal", label: "日历" }, { id: "gantt", label: "甘特" } ];
    const curv = this.plugin.projView || "kanban";
    for (const it of vitems) {
      const b = vt.createSpan({ text: it.label, cls: "wb-subtab" + (curv === it.id ? " on" : "") });
      b.addEventListener("click", () => this.plugin.setProjView(it.id));
    }
    if (curv !== "kanban") {
      const st = ctrl.createSpan({ cls: "wb-stagef" });
      const sitems = [ { id: "all", label: "全部" }, { id: "todo", label: "待办" }, { id: "doing", label: "进行中" }, { id: "done", label: "已完成" } ];
      const curs = this.plugin.projStage || "all";
      for (const it of sitems) {
        const b = st.createSpan({ text: it.label, cls: "wb-stagef-btn" + (curs === it.id ? " on" : "") });
        b.addEventListener("click", () => this.plugin.setProjStage(it.id));
      }
    }
    ctrl.createSpan({ text: " " + filtered.length + " 项", cls: "wb-proj-count" });
    if (curv === "kanban") {
      this.renderProjectKanban(all);
    } else {
      const sc = this.pad.createDiv({ cls: "wb-proj-body" });
      if (curv === "list") this.renderProjectList(sc, filtered);
      else if (curv === "cal") this.renderProjectCal(sc, filtered);
      else if (curv === "gantt") this.renderProjectGantt(sc, filtered);
    }
  }
  renderProjectKanban(all) {
    const items = [];
    // 所有项目看板（含超分等）由 discoverTagBoards 自动发现：项目文档/*项目看板.md
    for (const bd of lib.discoverTagBoards(this.state)) {
      const safeId = "proj-" + bd.tag.replace(/[^\w\u4e00-\u9fff-]/g, "");
      items.push({ id: safeId, title: bd.title + "项目看板", build: (box) => this.renderTagBoardInto(box, bd.tag, bd.title + "项目看板", bd) });
    }
    for (const bd of MANUAL_BOARDS) {
      if (!lib.kanbanBoard(this.state, bd.file).length && !bd.auto) continue;
      const safeId = "proj-m-" + bd.file.replace(/[^\w\u4e00-\u9fff-]/g, "");
      items.push({ id: safeId, title: bd.title || bd.file, build: (box) => this.renderBoardManual(bd, box) });
    }
    items.forEach((it, idx) => {
      this.wrapArea(it.id, "wb-proj-item", (box) => it.build(box), { noBottomHandle: true, defaultH: 320 });
      if (idx < items.length - 1) {
        this.addProjHandle(it.id);
      }
    });
  }
  addProjHandle(aboveId) {
    // 两个项目之间的横杠：拖拽调节上方项目显示高度，双击恢复默认
    const wraps = this.pad.querySelectorAll(".wb-awrap");
    const lastWrap = wraps[wraps.length - 1];
    const target = lastWrap ? lastWrap.querySelector(".wb-asroll") : null;
    if (!target) return;
    const h = this.pad.createDiv({ cls: "wb-proj-handle" });
    h.title = "拖拽调整上方项目高度 · 双击恢复默认";
    h.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const startY = e.clientY;
      const startH = target.getBoundingClientRect().height;
      const mm = (ev) => {
        const nh = Math.max(120, Math.min(Math.round(startH + (ev.clientY - startY)), Math.round(window.innerHeight * 0.92)));
        target.style.height = nh + "px";
      };
      const mu = () => {
        window.removeEventListener("mousemove", mm);
        window.removeEventListener("mouseup", mu);
        this.plugin.areaH = this.plugin.areaH || {};
        this.plugin.areaH[aboveId] = Math.round(target.getBoundingClientRect().height);
        this.plugin.saveInspoData();
      };
      window.addEventListener("mousemove", mm);
      window.addEventListener("mouseup", mu);
    });
    h.addEventListener("dblclick", () => {
      if (this.plugin.areaH) delete this.plugin.areaH[aboveId];
      target.style.height = "";
      this.plugin.saveInspoData();
    });
  }
  renderProjHealth(box, bd, stageNames) {
    const board = lib.queryTagBoard(this.state, bd.tag);
    const total = board.todo.length + board.doing.length + board.done.length;
    const done = board.done.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const wrap = box.createDiv({ cls: "wb-proj-health" });
    const ring = wrap.createDiv({ cls: "wb-ph-ring" });
    ring.innerHTML = ringSVG(pct, 44);
    const info = wrap.createDiv({ cls: "wb-ph-info" });
    info.createSpan({ text: done + " / " + total + " 任务", cls: "wb-ph-count" });
    // 当前阶段：第一条进行中/待办任务的阶段标签（tags 与项目阶段名取交集）
    const cur = board.doing[0] || board.todo[0];
    let stageLabel;
    if (!cur) stageLabel = total > 0 ? "全部完成" : "无任务";
    else {
      const names = (stageNames && stageNames.length) ? stageNames : ["待办", "进行中"];
      const hit = names.find((n) => cur.tags && cur.tags.includes(n));
      stageLabel = hit || "待办";
    }
    info.createSpan({ text: "当前：" + stageLabel, cls: "wb-ph-stage" });
    // 时间进度条（bd 平铺字段 start/end，来自看板 frontmatter）
    if (bd.start && bd.end) {
      const now = lib.todayStr();
      const totalDays = this.daysBetween(bd.start, bd.end);
      const elapsed = this.daysBetween(bd.start, now);
      const tpct = totalDays > 0 ? Math.max(0, Math.min(100, Math.round((elapsed / totalDays) * 100))) : 0;
      const over = now > bd.end;
      const tb = info.createDiv({ cls: "wb-ph-timebar" + (over ? " over" : "") });
      const tf = tb.createSpan({ cls: "wb-ph-tfill" }); tf.style.width = tpct + "%";
      const tm = tb.createSpan({ cls: "wb-ph-tmark" }); tm.style.left = tpct + "%";
      tb.title = bd.start + " → " + bd.end + "（时间已过 " + tpct + "%）";
      if (over) info.createSpan({ text: " 已超期", cls: "wb-ph-over" });
    }
  }
    renderTagBoardInto(sc, tag, title, bd) {
    const box = sc.createDiv({ cls: "wb-kbwrap" });
    box.createDiv({ cls: "wb-ktitle", text: title });
    const stages = this.plugin.projStagesFor(bd);
    const stageNames = stages.map((s) => s.name);
    this.renderProjHealth(box, bd, stageNames);
    const cols = lib.stageBoard(this.state, tag, stages);
    this.boardGrid(box, cols.map((c) => ({ heading: c.heading, color: c.color, tasks: c.tasks, file: "", stages: stageNames })), "super");
  }
  renderProjectList(sc, tasks) {
    if (!tasks.length) { sc.createDiv({ cls: "wb-empty big", text: "（无任务）" }); return; }
    const box = sc.createDiv({ cls: "wb-plist" });
    const head = box.createDiv({ cls: "wb-plist-h" });
    head.createSpan({ text: "任务", cls: "wb-pl-d" });
    head.createSpan({ text: "状态", cls: "wb-pl-s" });
    head.createSpan({ text: "截止", cls: "pl-e" });
    const stgOrder = { doing: 0, todo: 1, done: 2 };
    const sorted = tasks.slice().sort((a, b2) => {
      const sa = stgOrder[lib.stageOf(a)] ?? 3, sb = stgOrder[lib.stageOf(b2)] ?? 3;
      if (sa !== sb) return sa - sb;
      return (a.due || "9999") < (b2.due || "9999") ? -1 : 1;
    });
    for (const t of sorted) {
      const row = box.createDiv({ cls: "wb-plist-r" + (t.done ? " done" : "") });
      const d = row.createSpan({ cls: "wb-pl-d" });
      d.createSpan({ text: t.desc });
      const stg = lib.stageOf(t);
      row.createSpan({ text: stg === "done" ? "已完成" : stg === "doing" ? "进行中" : "待办", cls: "wb-pl-s wb-stg-" + stg });
      row.createSpan({ text: t.due ? t.due.slice(5) : "—", cls: "wb-pl-e" + (t.due && t.due < lib.todayStr() && !t.done ? " over" : "") });
    }
  }
  renderProjectCal(sc, tasks) {
    const today = lib.todayStr();
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth();
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    const firstMon = lib.weekStart(lib.dateStr(first));
    const lastSun = lib.addDays(lib.weekStart(lib.dateStr(last)), 6);
    const cells = lib.calendarRange(tasks, firstMon, lastSun);
    const mLabel = (y) + " 年 " + (m + 1) + " 月";
    const box = sc.createDiv({ cls: "wb-pcal" });
    box.createDiv({ cls: "wb-pcal-t", text: mLabel });
    const grid = box.createDiv({ cls: "wb-pcal-grid wb-pcal-month" });
    const wds = ["一", "二", "三", "四", "五", "六", "日"];
    for (let i = 0; i < 7; i++) grid.createDiv({ text: wds[i], cls: "wb-pcal-dh" });
    for (const c of cells) {
      const inMonth = c.date.slice(0, 7) === lib.dateStr(first).slice(0, 7);
      const cell = grid.createDiv({ cls: "wb-pcal-cell" + (c.date === today ? " today" : "") + (inMonth ? "" : " out") });
      cell.createSpan({ text: c.date.slice(8), cls: "wb-pcal-num" });
      for (const t of c.tasks) {
        const chip = cell.createDiv({ cls: "wb-pcal-task wb-stg-" + lib.stageOf(t) });
        chip.createSpan({ text: t.desc, cls: "wb-pcal-td" });
        chip.addEventListener("click", () => this.openNote(t.file));
      }
    }
  }
  renderProjectGantt(sc, tasks) {
    const g = lib.ganttRows(tasks);
    if (!g.rows.length) { sc.createDiv({ cls: "wb-empty big", text: "（无带截止日期的任务）" }); return; }
    const total = this.daysBetween(g.start, g.end);
    const box = sc.createDiv({ cls: "wb-gantt" });
    const axis = box.createDiv({ cls: "wb-gantt-axis" });
    for (let i = 0; i <= total; i += Math.max(1, Math.round(total / 14))) {
      const d = lib.addDays(g.start, i);
      axis.createSpan({ text: d.slice(5), cls: "wb-gantt-ax" });
    }
    const today = lib.todayStr();
    const todayOff = this.daysBetween(g.start, today);
    // today reference line
    if (todayOff >= 0 && todayOff <= total) {
      const tl = box.createDiv({ cls: "wb-gantt-todayline" });
      tl.style.left = "calc(180px + " + ((todayOff / Math.max(1, total)) * 100) + "%)";
      tl.title = "今天 " + today;
    }
    for (const r of g.rows) {
      const row = box.createDiv({ cls: "wb-gantt-row" });
      row.createSpan({ text: (r.done ? "✓ " : "") + r.desc, cls: "wb-gantt-lb" + (r.done ? " done" : "") });
      const track = row.createDiv({ cls: "wb-gantt-track" });
      const left = (this.daysBetween(g.start, r.start) / Math.max(1, total)) * 100;
      const width = Math.max(2, ((this.daysBetween(r.start, r.end) + 1) / Math.max(1, total)) * 100);
      const bar = track.createDiv({ cls: "wb-gantt-bar wb-stg-" + r.stage + (r.done ? " done" : "") });
      bar.style.left = left + "%";
      bar.style.width = width + "%";
      bar.title = r.desc + "  " + r.start + " ~ " + r.end;
      bar.addEventListener("click", () => this.openNote(r.file));
      // in-bar elapsed layer
      if (!r.done) {
        const rStartOff = this.daysBetween(g.start, r.start);
        const rEndOff = this.daysBetween(g.start, r.end);
        const inBar = Math.max(0, Math.min(todayOff, rEndOff) - rStartOff);
        const span = this.daysBetween(r.start, r.end) + 1;
        if (inBar > 0) {
          const ep = track.createDiv({ cls: "wb-gantt-elapsed" + (todayOff > rEndOff ? " over" : "") });
          ep.style.left = "0";
          ep.style.width = (inBar / Math.max(1, span)) * 100 + "%";
        }
      }
    }
  }
  daysBetween(a, b) {
    const [ay, am, ad] = a.split("-").map(Number);
    const [by, bm, bd] = b.split("-").map(Number);
    return Math.round((new Date(by, bm - 1, bd) - new Date(ay, am - 1, ad)) / 86400000);
  }
  renderHeat(card) {
    const year = new Date().getFullYear();
    const cells = lib.taskYearHeatmap(this.state, year);
    const today = lib.todayStr();
    const grid = card.createDiv({ cls: "wb-noteheat" });
    for (let i = 0; i < cells.length; i += 7) {
      const col = grid.createSpan({ cls: "wb-nh-col" });
      for (let j = 0; j < 7 && i + j < cells.length; j++) {
        const c = cells[i + j];
        if (c.pad) { col.createSpan({ cls: "wb-nhc pad" }); continue; }
        const lv = c.count === 0 ? 0 : c.count === 1 ? 1 : c.count <= 3 ? 2 : c.count <= 5 ? 3 : 4;
        const cell = col.createSpan({ cls: "wb-nhc l" + lv + (c.date === today ? " today" : "") });
        cell.title = c.date + " 完成 " + c.count + " 项";
      }
    }
    const legend = card.createDiv({ cls: "wb-heat-legend" });
    legend.createSpan({ text: "少", cls: "wb-heat-lg" });
    for (let i = 0; i <= 4; i++) legend.createSpan({ cls: "wb-nhc l" + i + " wb-heat-lgc" });
    legend.createSpan({ text: "多", cls: "wb-heat-lg" });
  }
  renderNoteHeat(card) {
    const year = new Date().getFullYear();
    const cells = lib.noteYearHeatmap(this.state.notes, year);
    const max = Math.max(1, ...cells.filter((c) => !c.pad).map((c) => c.count));
    const grid = card.createDiv({ cls: "wb-noteheat" });
    for (let i = 0; i < cells.length; i += 7) {
      const col = grid.createSpan({ cls: "wb-nh-col" });
      for (let j = 0; j < 7 && i + j < cells.length; j++) {
        const c = cells[i + j];
        if (c.pad) { col.createSpan({ cls: "wb-nhc pad" }); continue; }
        const t = c.count / max;
        const lv = c.count === 0 ? 0 : t <= 0.25 ? 1 : t <= 0.5 ? 2 : t <= 0.8 ? 3 : 4;
        const cell = col.createSpan({ cls: "wb-nhc l" + lv });
        cell.title = c.date + " " + c.count + " 篇";
      }
    }
    const lg1 = card.createDiv({ cls: "wb-heat-legend" });
    lg1.createSpan({ text: "少", cls: "wb-heat-lg" });
    for (let i = 0; i <= 4; i++) lg1.createSpan({ cls: "wb-nhc l" + i + " wb-heat-lgc" });
    lg1.createSpan({ text: "多", cls: "wb-heat-lg" });
  }
  renderOverview() {
    // 顶部：今日概览 + 工作项（同一网格，仅待安排拉长到顶部）
    const top = this.pad.createDiv({ cls: "wb-home-row wb-row-pulse" });
    const savedH = this.plugin.areaH && this.plugin.areaH["pulseRow"];
    if (savedH) top.style.setProperty("--wb-list-h", savedH + "px");
    this.renderPulse(this.homeCard(top, "pulse", "今日概览", "实时"));
    const s = this.state;
    const defs = [
      { title: "今日", tasks: lib.queryToday(s), cls: "" },
      { title: "未来 7 天", tasks: lib.queryNext7(s), cls: "" },
      { title: "今日完成", tasks: lib.queryTodayDone(s), cls: "" },
      { title: "待安排", tasks: lib.queryUnscheduled(s), cls: "wb-list-tall" },
    ];
    for (const d of defs) {
      const col = top.createDiv({ cls: "wb-home-card wb-list-card " + d.cls });
      col.createDiv({ cls: "wb-colh", text: d.title + " " + d.tasks.length });
      for (const t of d.tasks) this.renderTaskRow(col, t);
      if (!d.tasks.length) col.createDiv({ cls: "wb-empty", text: d.title === "今日完成" ? "今日尚无完成项 ☑" : d.title === "今日" ? "今日已清空 ☑" : "（空）" });
    }
    // 工作项行高度调节条（拖拽统一调整 4 张卡片高度，保持底部对齐）
    this.addPulseRowHandle(top);
    // 第二行：倒计时 / 番茄钟 / 快速捕获
    const mid = this.pad.createDiv({ cls: "wb-home-row" });
    this.renderCountdown(this.homeCard(mid, "countdown"));
    this.renderPomodoroCard(this.homeCard(mid, "pomo"));
    this.renderCaptureCard(this.homeCard(mid, "capture"));
    // 底部：最近12周完成 + 笔记分布（一左一右）
    const bottom = this.pad.createDiv({ cls: "wb-home-row" });
    this.renderHeat(this.homeCard(bottom, "taskheat", "Task分布"));
    const year = new Date().getFullYear();
    this.renderNoteHeat(this.homeCard(bottom, "noteheat", "笔记分布", year + " 年"));
    // 所有行创建完毕后再统一计算列数（确保宽度正确）
    this.updateHomeCols(top);
    this.updateHomeCols(mid);
    this.updateHomeCols(bottom);
    if (typeof ResizeObserver !== "undefined") {
      if (this._homeRO) this._homeRO.disconnect();
      this._homeRO = new ResizeObserver(() => { this.updateHomeCols(top); this.updateHomeCols(mid); this.updateHomeCols(bottom); });
      this._homeRO.observe(this.pad);
    }
    requestAnimationFrame(() => { this.updateHomeCols(top); this.updateHomeCols(mid); this.updateHomeCols(bottom); });
  }
  updateHomeCols(grid) {
    if (!grid) return;
    const width = grid.getBoundingClientRect().width;
    if (width <= 0) return;
    const MIN = 280, GAP = 14;
    let cols = Math.max(1, Math.min(4, Math.floor((width + GAP) / (MIN + GAP))));
    grid.style.setProperty("--wb-cols", String(cols));
    const unit = Math.max(150, (width - GAP * (cols - 1)) / cols);
    grid.style.setProperty("--wb-row-h", Math.round(unit) + "px");
  }
  addPulseRowHandle(rowEl) {
    // 在 workItem 行下方放一个调节横杠：拖拽统一改变 4 张工作项卡片高度（底部保持对齐）
    const h = this.pad.createDiv({ cls: "wb-row-pulse-h" });
    h.title = "拖拽调整工作项卡片高度 · 双击恢复默认";
    const apply = (px) => { rowEl.style.setProperty("--wb-list-h", px + "px"); };
    const currentH = () => {
      const card = rowEl.querySelector(".wb-list-card");
      return card ? Math.round(card.getBoundingClientRect().height) : 210;
    };
    h.addEventListener("mousedown", (e) => {
      e.preventDefault();
      h.classList.add("on");
      const startY = e.clientY;
      const startH = currentH();
      const mm = (ev) => {
        const nh = Math.max(120, Math.min(Math.round(startH + (ev.clientY - startY)), Math.round(window.innerHeight * 0.9)));
        apply(nh);
      };
      const mu = () => {
        window.removeEventListener("mousemove", mm);
        window.removeEventListener("mouseup", mu);
        h.classList.remove("on");
        this.plugin.areaH = this.plugin.areaH || {};
        this.plugin.areaH["pulseRow"] = currentH();
        this.plugin.saveInspoData();
      };
      window.addEventListener("mousemove", mm);
      window.addEventListener("mouseup", mu);
    });
    h.addEventListener("dblclick", () => {
      rowEl.style.removeProperty("--wb-list-h");
      if (this.plugin.areaH) delete this.plugin.areaH["pulseRow"];
      this.plugin.saveInspoData();
    });
  }
  homeCard(grid, mod, title, sub) {
    const c = grid.createDiv({ cls: "wb-home-card", attr: { "data-mod": mod } });
    if (title != null) {
      const h = c.createDiv({ cls: "wb-card-h" });
      h.createSpan({ text: title, cls: "wb-card-t" });
      if (sub != null) h.createSpan({ text: sub, cls: "wb-card-sub" });
    }
    return c;
  }
  buildHomeCards(grid) {
    this.renderPulse(this.homeCard(grid, "pulse", "今日概览", "实时"));
    this.renderCountdown(this.homeCard(grid, "countdown"));
    this.renderPomodoroCard(this.homeCard(grid, "pomo", "番茄钟"));
    this.renderCaptureCard(this.homeCard(grid, "capture"));
  }
  renderCaptureCard(card) {
    const body = card.createDiv({ cls: "wb-cc-body" });
    body.createDiv({ text: "快速捕获灵感", cls: "wb-card-t" });
    const f1 = body.createDiv({ cls: "wb-cc-line" });
    const tInp = f1.createEl("input", { type: "text", cls: "wb-cc-name", placeholder: "灵感名称 *" });
    const f2 = body.createDiv({ cls: "wb-cc-row" });
    const tagInp = f2.createEl("input", { type: "text", cls: "wb-cc-tags", placeholder: "标签（逗号分隔）" });
    const starInp = f2.createSpan({ text: "☆", cls: "wb-cc-star" });
    let starOn = false;
    starInp.addEventListener("click", () => { starOn = !starOn; starInp.textContent = starOn ? "★" : "☆"; starInp.classList.toggle("on", starOn); });
    const f3 = body.createDiv({ cls: "wb-cc-line" });
    const descInp = f3.createEl("textarea", { cls: "wb-cc-inp", placeholder: "在这里写下你的灵感想法、背景或备注…（可选）" });
    const go = () => {
      const v = tInp.value.trim();
      if (!v) { new Notice("请先填写灵感名称"); return; }
      const tags = lib.parseInspoTags(tagInp.value);
      const desc = descInp.value.trim();
      const capturedStar = starOn;
      tInp.value = ""; tagInp.value = ""; descInp.value = ""; starOn = false; starInp.textContent = "☆"; starInp.classList.remove("on");
      this.captureInspo(v, tags, desc, capturedStar);
    };
    descInp.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); go(); } });
    const foot = body.createDiv({ cls: "wb-cc-foot" });
    const btn = foot.createSpan({ text: "捕获", cls: "wb-cc-add" });
    btn.addEventListener("click", go);
  }
  renderPomodoroCard(card) { this.renderPomodoro(card); }
  renderCountdown(card) {
    const year = new Date().getFullYear();
    const items = (this.plugin.countdowns && this.plugin.countdowns.length ? this.plugin.countdowns.slice() : [{ label: "", date: (year + 1) + "-01-01" }]);
    if (items.length > 1) {
      const head = card.createDiv({ cls: "wb-cd-head" });
      head.createSpan({ text: "倒计时", cls: "wb-cd-title" });
      head.createSpan({ text: items.length + " 个目标", cls: "wb-cd-tag" });
      const list = card.createDiv({ cls: "wb-cd-list" });
      // 每条进度 = 从设定日(since)到目标日走过多少%；旧数据无 since 按一年窗口估算
      const th = this.plugin.theme || "a";
      const CD_PAL = { a: [["#2f6bff","#c026d3"],["#0ea5e9","#22d3ee"],["#f59e0b","#f7768e"],["#10b981","#73daca"],["#bb9af7","#7dcfff"]], b: [["#b06a3a","#d4a96a"],["#9c3554","#c8954e"],["#4a7c59","#b06a3a"],["#8b5a2b","#a3b18a"],["#7d5536","#e0af68"]], c: [["#ff5c8a","#f472b6"],["#2dd4bf","#34d399"],["#fbbf24","#fb923c"],["#a78bfa","#60a5fa"],["#f472b6","#a78bfa"]] };
      const psets = CD_PAL[th] || CD_PAL.a;
      items.forEach((it, idx) => {
        const st = lib.countdownStats(it.date);
        const today = st.daysLeft === 0;
        const isPast = it.date < lib.todayStr();
        // 迷你条 = 一年刻度剩余量：条长 = 剩余天数/365，不同目标长短立现，每天同步 drain
        let pct;
        if (isPast || today) pct = 0;
        else pct = Math.max(0, Math.min(100, Math.round((st.daysLeft / 365) * 100)));
        const row = list.createDiv({ cls: "wb-cd-item" + (today ? " today" : "") + (isPast ? " past" : "") });
        const nm = row.createDiv({ cls: "wb-cd-nm" });
        nm.createSpan({ text: it.label || it.date });
        nm.createSpan({ text: it.label ? " " + String.fromCharCode(183) + " " + it.date : "", cls: "wb-cd-date" });
        const num = row.createDiv({ cls: "wb-cd-row-r" });
        if (today) num.createSpan({ text: "今天！", cls: "wb-cd-today" });
        else if (isPast) num.createSpan({ text: "已过 " + this.daysBetween(it.date, lib.todayStr()) + " 天", cls: "wb-cd-pastnum" });
        else num.createSpan({ text: String(st.daysLeft), cls: "wb-cd-mininum" });
        if (!today && !isPast) num.createSpan({ text: "天", cls: "wb-cd-unit" });
        const pctNote = (today || isPast ? "" : "剩 " + st.daysLeft + " 天 · 一年刻度 " + pct + "%" + (st.daysLeft > 365 ? "（超一年，满条）" : ""));
        const mini = row.createDiv({ cls: "wb-cd-mini", attr: { title: pctNote } });
        const mf = mini.createSpan({ cls: "wb-cd-minifill" });
        mf.style.width = pct + "%";
        const pc = psets[idx % psets.length];
        mf.style.background = "linear-gradient(90deg, " + pc[0] + ", " + pc[1] + ")";
      });
      return;
    }
    const it0 = items[0];
    const target = it0.date;
    const label = (it0.label || "").trim();
    const head = card.createDiv({ cls: "wb-cd-head" });
    head.createSpan({ text: label ? label : "倒计时", cls: "wb-cd-title" });
    head.createSpan({ text: "剩余天数", cls: "wb-cd-tag" });
    const lbl = card.createDiv({ cls: "wb-cd-lbl" });
    lbl.createSpan({ text: "距离 " + (label ? label + " " : "") + target });
    const big = card.createDiv({ cls: "wb-cd-big" });
    big.createSpan({ text: String(lib.countdownStats(target).daysLeft), cls: "wb-cd-num" });
    big.createSpan({ text: "天", cls: "wb-cd-unit" });
    const foot = card.createDiv({ cls: "wb-cd-foot" });
    const bar = foot.createDiv({ cls: "wb-cd-bar" });
    const fill = bar.createSpan({ cls: "wb-cd-fill" });
    fill.style.width = lib.countdownStats(target).pct + "%";
    const stat = foot.createDiv({ cls: "wb-cd-sub" });
    stat.createSpan({ text: "剩余 " + lib.countdownStats(target).weeksLeft + " 周", cls: "wb-cd-stat" });
    stat.createSpan({ text: " ·  " + year + " 年已过 " + lib.countdownStats(target).pct + "%", cls: "wb-cd-stat" });
  }
  pomo() { return (this.plugin.pomo = this.plugin.pomo || { work: 25, rest: 5, mode: "work", left: 25 * 60, running: false }); }
  renderPomodoro(card) {
    const p = this.pomo();
    const head = card.createDiv({ cls: "wb-pomo-head" });
    head.createSpan({ text: "番茄钟", cls: "wb-pomo-title" });
    head.createSpan({ text: p.work + " / " + p.rest, cls: "wb-pomo-ratio" });
    const body = card.createDiv({ cls: "wb-pomo-body" });
    const pill = body.createDiv({ text: p.mode === "work" ? "工作" : "休息", cls: "wb-pomo-pill" + (p.mode === "rest" ? " rest" : "") });
    const time = body.createDiv({ cls: "wb-pomo-time" });
    time.id = "wb-pomo-time";
    time.createSpan({ text: this.pomoText(p.left), cls: "wb-pomo-mmss" });
    const btns = body.createDiv({ cls: "wb-pomo-btns" });
    const startB = btns.createDiv({ text: p.running ? "暂停" : "开始", cls: "wb-pomo-btn wb-pomo-start" + (p.running ? " on" : "") });
    startB.addEventListener("click", () => { p.running = !p.running; this.savePomo(); this.reevalPomo(); });
    const resetB = btns.createDiv({ text: "重置", cls: "wb-pomo-btn wb-pomo-reset" });
    resetB.addEventListener("click", () => {
      const totalNow = (p.mode === "work" ? p.work : p.rest) * 60;
      p.left = totalNow;
      p.running = false;
      this.savePomo();
      this.reevalPomo();
    });
    // 点击 工作/休息 药丸 切换模式
    const toggleMode = () => { p.mode = p.mode === "work" ? "rest" : "work"; p.left = (p.mode === "work" ? p.work : p.rest) * 60; this.savePomo(); this.reevalPomo(); };
    pill.addEventListener("click", toggleMode);
    this.ensurePomoTick();
  }
  reevalPomo() {
    const p = this.pomo();
    this.updatePomoUI(p);
    this.savePomo();
    this.ensurePomoTick();
  }
  updatePomoUI(p) {
    // 局部刷新番茄钟时间/按钮/模式药丸/比例，避免整页重渲染丢滚动
    if (!this.root) return;
    const time = this.root.querySelector("#wb-pomo-time .wb-pomo-mmss");
    if (time) time.textContent = this.pomoText(p.left);
    const startB = this.root.querySelector(".wb-pomo-start");
    if (startB) { startB.textContent = p.running ? "暂停" : "开始"; startB.classList.toggle("on", p.running); }
    const pill = this.root.querySelector(".wb-pomo-pill");
    if (pill) { pill.textContent = p.mode === "work" ? "工作" : "休息"; pill.classList.toggle("rest", p.mode === "rest"); }
    const ratio = this.root.querySelector(".wb-pomo-ratio");
    if (ratio) ratio.textContent = p.work + " / " + p.rest;
  }
  pomoText(sec) { const m = Math.floor(sec / 60); const s = sec % 60; return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s; }
  pomoNum(parent, key, min, max) {
    const p = this.pomo();
    const row = parent.createSpan({ cls: "wb-pomo-num" });
    const dec = row.createSpan({ text: "−", cls: "wb-pomo-nb" });
    row.createSpan({ text: String(p[key]), cls: "wb-pomo-nv" });
    const inc = row.createSpan({ text: "+", cls: "wb-pomo-nb" });
    dec.addEventListener("click", () => { p[key] = Math.max(min, p[key] - 1); if (!p.running && p.mode === key) p.left = p[key] * 60; this.reevalPomo(); this.root.querySelectorAll(".wb-pomo-nv")[key === "work" ? 0 : 1].textContent = String(p[key]); });
    inc.addEventListener("click", () => { p[key] = Math.min(max, p[key] + 1); if (!p.running && p.mode === key) p.left = p[key] * 60; this.reevalPomo(); this.root.querySelectorAll(".wb-pomo-nv")[key === "work" ? 0 : 1].textContent = String(p[key]); });
  }
  ensurePomoTick() {
    if (this._pomoTick) return;
    this._pomoTick = setInterval(() => {
      const p = this.plugin.pomo;
      if (!p || !p.running || !this.root) return;
      p.left -= 1;
      if (p.left <= 0) {
        p.running = false; p.left = 0;
        const finished = p.mode;
        this.showPomoAlert(finished);
      }
      const t = this.root.querySelector("#wb-pomo-time .wb-pomo-mmss");
      if (t) t.textContent = this.pomoText(Math.max(0, p.left));
    }, 1000);
  }
  savePomo() { this.pomo(); this.plugin.saveInspoData(); }
  showPomoAlert(finishedMode) {
    // finishedMode = 刚结束的模式。work 结束→提醒休息；rest 结束→提醒工作
    const isWork = finishedMode === "work";
    const emojis = isWork ? ["☕", "😮‍💨", "🌿", "🧘"] : ["💪", "🔥", "⚡", "🎯"];
    const tips = isWork
      ? ["专注完成！起来走走吧～", "眼睛看看远处，喝口水。", "伸个懒腰，肩膀松一松。", "呼吸几次，休息一下脑子。"]
      : ["休息结束，回来战斗！💪", "状态拉满，开启专注吧。", "深呼吸，进入心流模式。", "目标明确，开干！"];
    const title = isWork ? "该休息啦" : "该工作啦";
    const sub = tips[Math.floor(Math.random() * tips.length)];
    const mainEmo = emojis[Math.floor(Math.random() * emojis.length)];
    const app = this.app;
    const m = new Modal(app);
    m.setTitle("");
    m.onOpen = () => {
      const c = m.contentEl;
      c.createEl("style", { text: [
        ".wb-pa{display:flex;flex-direction:column;align-items:center;text-align:center;padding:10px 6px 4px;}",
        ".wb-pa-burst{position:relative;width:120px;height:120px;display:flex;align-items:center;justify-content:center;margin:6px 0 14px;}",
        ".wb-pa-emo{font-size:72px;line-height:1;animation:wb-pa-pop .6s cubic-bezier(.2,1.4,.4,1);}",
        ".wb-pa-ring{position:absolute;inset:18px;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--accent) 22%,transparent),transparent 70%);animation:wb-pa-pulse 2s ease-in-out infinite;}",
        ".wb-pa-bit{position:absolute;font-size:20px;opacity:0;animation:wb-pa-fly 1.6s ease-out forwards;}",
        ".wb-pa-title{font-size:24px;font-weight:800;letter-spacing:.04em;color:var(--accent);margin-bottom:8px;}",
        ".wb-pa-sub{font-size:14px;color:var(--muted);max-width:280px;line-height:1.6;margin-bottom:20px;}",
        ".wb-pa-btns{display:flex;gap:12px;}",
        ".wb-pa-btn{cursor:pointer;font-size:14px;font-weight:600;padding:9px 24px;border-radius:10px;border:1px solid var(--border);background:var(--panel2);color:var(--text);user-select:none;transition:transform .1s, border-color .12s, color .12s;}",
        ".wb-pa-btn:hover{transform:translateY(-1px);border-color:var(--accent);color:var(--accent);}",
        ".wb-pa-btn.go{background:var(--accent);border-color:var(--accent);color:var(--bg);}",
        ".wb-pa-btn.go:hover{filter:brightness(1.1);color:var(--bg);}",
        "@keyframes wb-pa-pop{0%{transform:scale(.3) rotate(-12deg);opacity:0}60%{transform:scale(1.12) rotate(4deg)}100%{transform:scale(1) rotate(0);opacity:1}}",
        "@keyframes wb-pa-pulse{0%,100%{transform:scale(1);opacity:.7}50%{transform:scale(1.25);opacity:.25}}",
        "@keyframes wb-pa-fly{0%{transform:translate(0,0) scale(.6) rotate(0);opacity:0}15%{opacity:1}100%{transform:translate(var(--dx),var(--dy)) scale(1.1) rotate(var(--rot));opacity:0}}",
      ].join("\n") });
      const wrap = c.createDiv({ cls: "wb-pa" });
      const burst = wrap.createDiv({ cls: "wb-pa-burst" });
      burst.createDiv({ cls: "wb-pa-ring" });
      burst.createDiv({ text: mainEmo, cls: "wb-pa-emo" });
      // 撒几个飘散的小表情
      const bits = isWork ? ["✨", "💤", "🌙", "🍃", "⭐", "💧"] : ["✨", "🚀", "💥", "🌟", "⚡", "💫"];
      for (let i = 0; i < bits.length; i++) {
        const b = burst.createSpan({ text: bits[i], cls: "wb-pa-bit" });
        const ang = (Math.PI * 2 * i) / bits.length + Math.random() * 0.6;
        const dist = 55 + Math.random() * 30;
        b.style.setProperty("--dx", Math.round(Math.cos(ang) * dist) + "px");
        b.style.setProperty("--dy", Math.round(Math.sin(ang) * dist) + "px");
        b.style.setProperty("--rot", Math.round(Math.random() * 360 - 180) + "deg");
        b.style.animationDelay = (Math.random() * 0.2) + "s";
      }
      wrap.createDiv({ text: title, cls: "wb-pa-title" });
      wrap.createDiv({ text: sub, cls: "wb-pa-sub" });
      const btns = wrap.createDiv({ cls: "wb-pa-btns" });
      const goLabel = isWork ? "☕ 开始休息" : "🔥 开始专注";
      const go = btns.createDiv({ text: goLabel, cls: "wb-pa-btn go" });
      const later = btns.createDiv({ text: isWork ? "稍后再歇" : "再磨蹭下", cls: "wb-pa-btn" });
      const doGo = () => {
        try {
          const p = this.pomo();
          p.mode = isWork ? "rest" : "work";
          p.left = (p.mode === "work" ? p.work : p.rest) * 60;
          p.running = true;
          this.updatePomoUI(p);
          this.savePomo();
        } finally {
          m.close();
        }
      };
      go.addEventListener("click", doGo);
      later.addEventListener("click", () => { m.close(); });
    };
    themeModal(m, this.plugin.theme);
    m.open();
  }
  renderPulse(card) {
    const s = this.state;
    const ts = lib.todayStats(s);
    const ws = lib.weekStats(s);
    const overdue = lib.queryOverdue(s);
    const top = card.createDiv({ cls: "wb-pulse-top" });
    const stats = [
      { n: ts.open, label: "今日待办", cls: "" },
      { n: ts.done, label: "今日完成", cls: "good" },
      { n: ts.overdue, label: "超期", cls: ts.overdue ? "danger" : "" },
      { n: ws.done + "/" + ws.total, label: "本周完成", cls: "" },
    ];
    for (const it of stats) {
      const cell = top.createDiv({ cls: "wb-stat " + it.cls });
      cell.createDiv({ text: String(it.n), cls: "wb-stat-n" });
      cell.createDiv({ text: it.label, cls: "wb-stat-l" });
    }
    const rings = top.createDiv({ cls: "wb-rings" });
    const r1 = rings.createDiv({ cls: "wb-ringbox" });
    r1.createDiv({ text: "今日", cls: "wb-ringbox-l" });
    const r1svg = r1.createEl("div", { cls: "wb-ringwrap" }); r1svg.innerHTML = ringSVG(ts.rate);
    const r2 = rings.createDiv({ cls: "wb-ringbox" });
    r2.createDiv({ text: "本周", cls: "wb-ringbox-l" });
    const r2svg = r2.createEl("div", { cls: "wb-ringwrap" }); r2svg.innerHTML = ringSVG(ws.rate);
    const bar = card.createDiv({ cls: "wb-overdue" });
    if (overdue.length) {
      bar.createSpan({ text: "⚠ " + overdue.length + " 项超期", cls: "wb-overdue-h" });
      const items = bar.createSpan({ cls: "wb-overdue-items" });
      overdue.slice(0, 6).forEach((t) => {
        const chip = items.createSpan({ text: t.desc + " 超" + this.overdueDays(t.due) + "天", cls: "wb-overdue-item" });
        chip.addEventListener("click", () => this.openNote(t.file));
      });
    } else {
      bar.createSpan({ text: "✓ 无超期任务", cls: "wb-overdue-none" });
    }
  }
  overdueDays(due) {
    const [ay, am, ad] = lib.todayStr().split("-").map(Number);
    const [by, bm, bd] = due.split("-").map(Number);
    return Math.round((new Date(ay, am - 1, ad) - new Date(by, bm - 1, bd)) / 86400000);
  }
  renderLists(sc) {
    const s = this.state;
    const cols = sc;
    const defs = [
      { title: "今日", tasks: lib.queryToday(s) },
      { title: "未来 7 天", tasks: lib.queryNext7(s) },
      { title: "今日完成", tasks: lib.queryTodayDone(s) },
      { title: "待安排", tasks: lib.queryUnscheduled(s) },
    ];
    for (const d of defs) {
      const col = cols.createDiv({ cls: "wb-list" });
      col.createDiv({ cls: "wb-colh", text: d.title + " " + d.tasks.length });
      for (const t of d.tasks) this.renderTaskRow(col, t);
      if (!d.tasks.length) col.createDiv({ cls: "wb-empty", text: d.title === "今日完成" ? "今日尚无完成项 ☑" : d.title === "今日" ? "今日已清空 ☑" : "（空）" });
    }
  }
  renderTaskRow(parent, t) {
    const row = parent.createDiv({ cls: "wb-row" });
    const cb = row.createEl("input", { type: "checkbox", cls: "wb-cb" });
    cb.checked = t.done;
    cb.addEventListener("change", () => {
      this.apply(t.file, (text) => {
        let r = lib.toggleDone(text, t.ref, cb.checked, lib.todayStr());
        if (!r.ok) return r;
        if (cb.checked) {
          const c2 = lib.clearStageAny(r.text, r.text.split(/\r?\n/)[t.lineIndex], ["待办", "进行中"]);
          if (c2.ok) r = { ok: true, text: c2.text, changed: r.changed || c2.changed };
        }
        return r;
      });
    });
    row.createSpan({ text: t.desc, cls: "wb-desc" + (t.done ? " done" : "") });
    for (const tag of t.tags) row.createSpan({ text: tag, cls: "wb-chip" });
    const due = row.createSpan({ cls: "wb-due" + (t.due ? "" : t.scheduled ? " sch" : " add") });
    due.textContent = t.due ? t.due.slice(5) : (t.scheduled ? "⏳ " + t.scheduled.slice(5) : "+ 设日期");
    due.title = t.due ? "截止 " + t.due + "（点击改期）" : (t.scheduled ? "计划开始 " + t.scheduled + "（⏳ 无截止日，点击补一个）" : "设置截止日期（点击）");
    due.addEventListener("click", (e) => { e.stopPropagation(); this.pickDate(due, t); });
  }
  renderTagBoard(tag, title, sc) {
    const b = lib.queryTagBoard(this.state, tag);
    sc.createDiv({ cls: "wb-ktitle", text: title });
    this.boardGrid(sc, [
      { heading: "待办", tasks: b.todo, file: "" },
      { heading: "进行中", tasks: b.doing, file: "" },
      { heading: "已完成", tasks: b.done, file: "" },
    ], "super");
  }
  renderBoardManual(def, sc) {
    if (def.auto) {
      // 通用看板：无项目标签的任务，按阶段标签分栏（与项目看板同构，"super" kind 统一标签逻辑）
      const stages = this.plugin.getProjStagesEnabled();
      const stageNames = stages.map((s) => s.name);
      const cols = lib.autoBoard(this.state, stages);
      sc.createDiv({ cls: "wb-ktitle", text: def.title + "（未打项目标签的任务按阶段标签分栏，拖拽换栏自动改标签）" });
      this.boardGrid(sc, cols.map((c) => ({ heading: c.heading, color: c.color, tasks: c.tasks, file: "", stages: stageNames })), "super");
      return;
    }
    // 手动板（如私人日程看板）：按文件 ## 栏物理位置
    const secs = lib.kanbanBoard(this.state, def.file);
    if (!secs.length) return;
    sc.createDiv({ cls: "wb-ktitle", text: def.title + "（手动板，拖拽可换栏）" });
    this.boardGrid(sc, secs.map((x) => ({ heading: x.heading, tasks: x.tasks, file: def.file, auto: false })), "manual");
  }
  boardGrid(parent, cols, kind) {
    const grid = parent.createDiv({ cls: "wb-kcols" });
    for (const c of cols) {
      const col = grid.createDiv({ cls: "wb-kcol" });
      if (c.color) col.style.setProperty("--wb-colc", c.color);
      this.bindColumnDnD(col, c, kind);
      const ch = col.createDiv({ cls: "wb-colh", text: c.heading + " " + c.tasks.length });
      if (c.color) ch.style.setProperty("--wb-colc", c.color);
      for (const t of c.tasks) this.renderCard(col, t, c.heading, c.file, kind, !!c.auto, c.stages);
      if (!c.tasks.length) col.createDiv({ cls: "wb-empty", text: "（空）" });
    }
  }
  renderCard(parent, t, heading, file, kind, isAutoCol, stages) {
    const inBoardFile = kind === "manual" && file && t.file === file;
    const draggable = inBoardFile || kind === "super";
    const c = parent.createDiv({ cls: "wb-card" + (t.done ? " done" : "") });
    c.draggable = draggable;
    if (draggable) {
      c.addEventListener("dragstart", () => { this._drag = t; c.classList.add("dragging"); });
      c.addEventListener("dragend", () => { c.classList.remove("dragging"); this._drag = null; });
    }
    const l1 = c.createSpan({ cls: "wb-cline" });
    const cb = l1.createEl("input", { type: "checkbox", cls: "wb-cb" });
    cb.checked = t.done;
    cb.addEventListener("change", () => {
      const wantDone = cb.checked;
      const sN = (stages && stages.length) ? stages : ["待办", "进行中"];
      if (inBoardFile) {
        // 物理板且任务确实在板文件内：勾选=打勾并搬进「已完成」小节；取消=去勾并搬回「待办」
        this.apply(file, (text) => {
          let r = lib.moveCard(text, t.ref, wantDone ? "已完成" : "待办");
          if (!r.ok) return r;
          const r2 = lib.toggleDone(r.text, t.ref, wantDone, lib.todayStr());
          if (!r2.ok) return r2;
          r = { ok: true, text: r2.text, changed: r.changed || r2.changed };
          if (wantDone) {
            const c2 = lib.clearStageAny(r.text, r.text.split(/\r?\n/)[t.lineIndex], sN);
            if (c2.ok) r = { ok: true, text: c2.text, changed: r.changed || c2.changed };
          }
          return r;
        });
        return;
      }
      // 查询板卡片、或通用板里聚合来的外来任务：只在其真实来源文件里打勾（完成时清阶段标签）
      this.apply(t.file, (text) => {
        let r = lib.toggleDone(text, t.ref, wantDone, lib.todayStr());
        if (!r.ok) return r;
        if (wantDone) {
          const c2 = lib.clearStageAny(r.text, r.text.split(/\r?\n/)[t.lineIndex], sN);
          if (c2.ok) r = { ok: true, text: c2.text, changed: r.changed || c2.changed };
        }
        return r;
      });
    });
    l1.createSpan({ text: t.desc, cls: "wb-cdesc" + (t.done ? " done" : "") });
    const meta = c.createSpan({ cls: "wb-cmeta" });
    for (const tag of t.tags.slice(0, 4)) meta.createSpan({ text: tag, cls: "wb-chip tiny" });
    if (t.due) meta.createSpan({ text: t.due, cls: "wb-cdue" });
  }
  openNote(p) {
    const f = this.app.vault.getAbstractFileByPath(p);
    if (!f) return;
    let found = null;
    this.app.workspace.iterateAllLeaves((leaf) => {
      try {
        if (found) return;
        const vp = leaf.view && leaf.view.file ? leaf.view.file.path : "";
        let sp = "";
        try { const st = leaf.view && leaf.view.getState ? leaf.view.getState() : null; if (st && st.file) sp = String(st.file); } catch (e2) {}
        if (vp === p || sp === p) found = leaf;
      } catch (e) {}
    });
    if (!found) {
      for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
        try {
          let sp = "";
          try { const st = leaf.view && leaf.view.getState ? leaf.view.getState() : null; if (st && st.file) sp = String(st.file); } catch (e2) {}
          if ((leaf.view && leaf.view.file && leaf.view.file.path === p) || sp === p) { found = leaf; break; }
        } catch (e) {}
      }
    }
    if (found) {
      try { this.app.workspace.revealLeaf(found); } catch (e) {}
      if (found.view && found.view.focus) { try { found.view.focus(); } catch (e) {} }
      return;
    }
    const leaf = this.app.workspace.getLeaf(false);
    leaf.openFile(f).catch(() => {});
  }
  renderWall(sc) {
    const wall = sc;
    const head = wall.createDiv({ cls: "wb-ktitle" });
    head.createSpan({ text: "笔记卡片墙" });
    const vt = head.createSpan({ cls: "wb-subtabs", attr: { style: "margin-left:auto;" } });
    const vitems = [ { id: "wall", label: "卡片墙" }, { id: "star", label: "星座图" } ];
    const curv = this.plugin.wallView || "wall";
    for (const it of vitems) {
      const b = vt.createSpan({ text: it.label, cls: "wb-subtab" + (curv === it.id ? " on" : "") });
      b.addEventListener("click", () => this.plugin.setWallView(it.id));
    }
    if (curv === "star") { this.renderStarMap(wall); return; }
    const groups = lib.cardWall(this.state);
    for (const g of groups) {
      const sec = wall.createDiv({ cls: "wb-wgroup" });
      sec.createDiv({ cls: "wb-wlabel", text: g.folder });
      const grid = sec.createDiv({ cls: "wb-wcards" });
      for (const n of g.notes) {
        const card = grid.createDiv({ cls: "wb-wcard" });
        card.createSpan({ text: n.name + (n.excalidraw ? " 🎨" : ""), cls: "wb-wname" });
        card.addEventListener("click", () => this.openNote(n.path));
        const sub = card.createSpan({ cls: "wb-wsub" });
        if (n.date) sub.createSpan({ text: n.date + " · " });
        sub.createSpan({ text: relTime(n.mtime) });
      }
      if (!g.notes.length) sec.createDiv({ cls: "wb-empty", text: "（空）" });
    }
    if (!groups.length) wall.createDiv({ cls: "wb-empty", text: "（无命中白名单的文件夹）" });
  }
  // 星座图视图：真3D星系——拖拽旋转(惯性+空闲自转)、滚轮缩放、透视投影、星云背景、衍射星芒、环境星场
  // 三主题适配：A=深邃蓝太空 / B=美拉德暖纸 / C=多巴胺明亮
  renderStarMap(wall) {
    this._stopStarMap();
    const allNotesRaw = (this.state && this.state.notes) || [];
    if (!allNotesRaw.length) { wall.createDiv({ cls: "wb-empty", text: "（无笔记可展示）" }); return; }
    const wrap = wall.createDiv({ cls: "wb-starmap" });
    const canvas = wrap.createEl("canvas");
    const dpr = window.devicePixelRatio || 1;
    const theme = (this.plugin.theme || "a");
    // 三套调色板：星团色 / 背景渐变(中心→边缘) / 环境星色 / 文本色 / 暗角色 / 提示框色
    const PAL = theme === "b" ? {
      // 美拉德：暖纸径向渐变底(中心暖亮→边缘柔深) + 焦糖/琥珀/肉桂/榛果/可可星点
      star: ["#d9480f", "#a61e4d", "#cf5c00", "#0c8599", "#c2255c", "#2b8a3e", "#5f3dc4", "#364fc7"],
      bgIn: "#ffffff", bgMid: "#fcf8f2", bgOut: "#f3ece1",
      ambient: "#c4a878", text: "#4a3520", dot: "#b06a3a",
      vignette: "rgba(160,130,80,.10)", tipBg: "rgba(255,250,240,.96)", tipSub: "#9c6644",
      glowColor: "rgba(220,170,110,.18)",
    } : theme === "c" ? {
      // 多巴胺：柔彩径向渐变底(中心亮白→边缘薰衣草) + 高饱和粉/青/黄/紫/橙/绿/蓝/品红星点
      star: ["#ff2d6f", "#009e7b", "#e8590c", "#7c4dff", "#2979ff", "#d6409f", "#0b7285", "#5c940d"],
      bgIn: "#ffffff", bgMid: "#fdfcff", bgOut: "#f5f2fc",
      ambient: "#b8a8d4", text: "#2e2440", dot: "#a78bfa",
      vignette: "rgba(160,140,200,.10)", tipBg: "rgba(255,255,255,.96)", tipSub: "#7c5cbf",
      glowColor: "rgba(180,150,255,.16)",
    } : {
      // 深邃蓝太空（默认）
      star: ["#7aa2f7", "#e0af68", "#9ece6a", "#bb9af7", "#f7768e", "#7dcfff", "#ff9e64", "#73daca", "#f2c94c", "#ff7edb", "#a9dc76", "#8f9fff"],
      bgIn: "#0c1530", bgMid: "#070d1e", bgOut: "#03060f",
      ambient: "#cdd6f4", text: "#e8ecf4", dot: "#7aa2f7",
      vignette: "rgba(0,0,0,.5)", tipBg: "rgba(8,14,26,.95)", tipSub: "#7aa2f7",
      glowColor: "rgba(122,162,247,.12)",
    };
    const COLORS = PAL.star;
    const now = Date.now();
    const THIRTY = 1000 * 60 * 60 * 24 * 30;
    const hash = (str, salt) => { let h = 5381; const s = str + salt; for (let i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i); return (h >>> 0) / 0xFFFFFFFF; };
    const aHex = (a) => Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, "0");
    // 预渲染星点精灵（辉光 + 衍射星芒），避免每帧 createRadialGradient
    function makeSprite(color, spikes, style) {
      const sz = 64, mid = sz / 2;
      const c = document.createElement("canvas");
      c.width = c.height = sz;
      const x = c.getContext("2d");
      const g = x.createRadialGradient(mid, mid, 0, mid, mid, mid);
      if (style === "solid" || style === "solidCore") {
        // 亮背景主题：小实心点（可见主体≈精灵28%，与A亮核视觉等大），边缘快速收干净
        if (style === "solidCore") {
          g.addColorStop(0, "#241f33");
          g.addColorStop(0.10, color);
        } else {
          g.addColorStop(0, color);
        }
        g.addColorStop(0.28, color);
        g.addColorStop(0.38, color + "70");
        g.addColorStop(0.48, "rgba(0,0,0,0)");
      } else {
        // 暗背景主题：辉光 + 白心
        g.addColorStop(0, "rgba(255,255,255,1)");
        g.addColorStop(0.08, color);
        g.addColorStop(0.22, color + "66");
        g.addColorStop(0.5, color + "1a");
        g.addColorStop(1, "rgba(0,0,0,0)");
      }
      x.fillStyle = g;
      x.fillRect(0, 0, sz, sz);
      if (spikes) {
        for (const ang of [0, Math.PI / 2]) {
          x.save(); x.translate(mid, mid); x.rotate(ang);
          const sg = x.createLinearGradient(-mid, 0, mid, 0);
          sg.addColorStop(0, "rgba(0,0,0,0)");
          sg.addColorStop(0.3, color + "00");
          sg.addColorStop(0.5, color + "cc");
          sg.addColorStop(0.7, color + "00");
          sg.addColorStop(1, "rgba(0,0,0,0)");
          x.fillStyle = sg;
          x.fillRect(-mid, -0.7, sz, 1.4);
          x.restore();
        }
      }
      return c;
    }
    const spriteStyle = theme === "b" ? "solid" : theme === "c" ? "solidCore" : "glow";
    const sprites = COLORS.map((c) => makeSprite(c, false, spriteStyle));
    const spikeSprites = theme === "b" ? sprites : COLORS.map((c) => makeSprite(c, true, spriteStyle));
    // 按 .md 实际目录层级分团（不用白名单），团中心斐波那契球面分布
    const dirSet = new Map();
    for (const n of allNotesRaw) {
      const parts = n.path.split("/");
      const dir = parts.length > 1 ? parts.slice(0, -1).join("/") : "（根目录）";
      if (!dirSet.has(dir)) dirSet.set(dir, []);
      dirSet.get(dir).push(n);
    }
    const dirs = Array.from(dirSet.entries()).filter(([, ns]) => ns.length > 0);
    const nc = dirs.length;
    const clusters = dirs.map(([dir, notes], ci) => {
      const coli = ci % COLORS.length;
      const color = COLORS[coli];
      const stars = notes.map((n) => {
        const ang = hash(n.path, "a") * Math.PI * 2;
        const rr = Math.sqrt(hash(n.path, "r")) * (35 + hash(n.path, "r2") * 50);
        const dz = (hash(n.path, "z") - 0.5) * 100;
        const recency = Math.max(0, Math.min(1, 1 - (now - n.mtime) / THIRTY));
        return { x: 0, y: 0, z: 0, recency, color, coli, note: n, phase: hash(n.path, "p") * Math.PI * 2, _ox: Math.cos(ang) * rr, _oy: Math.sin(ang) * rr, _oz: dz };
      });
      const phi = Math.acos(1 - 2 * (ci + 0.5) / nc);
      const theta = Math.PI * (1 + Math.sqrt(5)) * (ci + 0.5);
      const R = 200;
      const cx = R * Math.sin(phi) * Math.cos(theta);
      const cy = R * Math.sin(phi) * Math.sin(theta);
      const cz = R * Math.cos(phi);
      for (const s of stars) { s.x = cx + s._ox; s.y = cy + s._oy; s.z = cz + s._oz; }
      return { folder: dir, color, coli, cx, cy, cz, stars, links: [] };
    });
    const allStars = clusters.flatMap((c) => c.stars);
    // 关联连线：用 Obsidian metadataCache.resolvedLinks（关系图谱同源数据），
    // 比手写正则强——涵盖 [[link]]/![[embed]]/frontmatter wikilink，且已按文件名解析。
    const starByNote = new Map();
    for (const s of allStars) starByNote.set(s.note.path, s);
    const edges = [];
    const seen = new Set();
    try {
      const mc = this.app.metadataCache;
      const rl = mc && mc.resolvedLinks;
      if (rl) {
        // resolvedLinks 可能是 Map 或普通对象，统一用 Object.keys 遍历（兼容两种形态）
        for (const fromPath of Object.keys(rl)) {
          const from = starByNote.get(fromPath);
          if (!from) continue;
          const toMap = rl[fromPath];
          for (const toPath of Object.keys(toMap || {})) {
            const to = starByNote.get(toPath);
            if (!to || to === from) continue;
            const key = from.note.path < to.note.path ? from.note.path + "|" + to.note.path : to.note.path + "|" + from.note.path;
            if (seen.has(key)) continue;
            seen.add(key);
            edges.push({ from, to });
          }
        }
      }
    } catch (e) { /* metadataCache 不可用时静默降级为无线 */ }
    // 连通分量：把互为链接的笔记聚成一个「社区」（连通分量 = 关系图谱里的一个团块）
    const parent = new Map();
    const find = (x) => { let r = x; while (parent.get(r) !== r) r = parent.get(r); while (parent.get(x) !== r) { const nx = parent.get(x); parent.set(x, r); x = nx; } return r; };
    for (const s of allStars) parent.set(s, s);
    for (const e of edges) { const a = find(e.from), b = find(e.to); if (a !== b) parent.set(a, b); }
    const communities = new Map();
    for (const s of allStars) { const r = find(s); if (!communities.has(r)) communities.set(r, []); communities.get(r).push(s); }
    // 社区中心点：斐波那契球面分布，大社区（关联多）占更外圈、更显眼
    const comArr = Array.from(communities.entries()); // [root, list]
    comArr.sort((a, b) => b[1].length - a[1].length); // 大社区排前
    comArr.forEach(([root, list], ci) => {
      const n = comArr.length;
      const phi = Math.acos(1 - 2 * (ci + 0.5) / n);
      const theta = Math.PI * (1 + Math.sqrt(5)) * (ci + 0.5);
      const R = 150 + Math.min(120, ci * 22);
      root.cx = R * Math.sin(phi) * Math.cos(theta);
      root.cy = R * Math.sin(phi) * Math.sin(theta);
      root.cz = R * Math.cos(phi);
    });
    // 每颗星绑定自己的社区中心；初始位置 = 社区中心 + 组内散布偏移
    for (const s of allStars) {
      const c0 = find(s); // root 上存着社区中心 cx/cy/cz
      s.x = c0.cx + s._ox; s.y = c0.cy + s._oy; s.z = c0.cz + s._oz;
    }
    // 力导向微调：边缘拉力 + 社区内排斥力 + 弹簧拉向中心（60 步，无动画，仅算一次布局）
    const ITERS = 60;
    for (let it = 0; it < ITERS; it++) {
      const F = new Map();
      for (const s of allStars) if (!F.has(s)) F.set(s, [0, 0, 0]);
      const step = 0.18 * (1 - it / ITERS);
      // 边缘拉力：连接的星互拉，形成可见的线/臂
      for (const e of edges) {
        const fx = e.to.x - e.from.x, fy = e.to.y - e.from.y, fz = e.to.z - e.from.z;
        const dist = Math.sqrt(fx * fx + fy * fy + fz * fz) || 1;
        const pull = Math.min(0.55, dist / 95) * step;
        const ax = fx / dist * pull, ay = fy / dist * pull, az = fz / dist * pull;
        const fa = F.get(e.from), fb = F.get(e.to);
        fa[0] += ax; fa[1] += ay; fa[2] += az;
        fb[0] -= ax; fb[1] -= ay; fb[2] -= az;
      }
      // 社区内排斥力：同社区的星互斥，形成松散云团而非挤一点
      for (const [, list] of comArr) {
        for (let i = 0; i < list.length; i++) {
          for (let j = i + 1; j < list.length; j++) {
            const a = list[i], b = list[j];
            const fx = a.x - b.x, fy = a.y - b.y, fz = a.z - b.z;
            const dist = Math.sqrt(fx * fx + fy * fy + fz * fz) || 1;
            const repel = Math.min(0.8, 45 / dist) * step;
            const fa = F.get(a), fb = F.get(b);
            fa[0] += fx / dist * repel; fa[1] += fy / dist * repel; fa[2] += fz / dist * repel;
            fb[0] -= fx / dist * repel; fb[1] -= fy / dist * repel; fb[2] -= fz / dist * repel;
          }
        }
      }
      // 跨社区相连的星对也保持间距，避免两个社区挤成一坨
      for (const e of edges) {
        if (find(e.from) === find(e.to)) continue;
        const fx = e.from.x - e.to.x, fy = e.from.y - e.to.y, fz = e.from.z - e.to.z;
        const dist = Math.sqrt(fx * fx + fy * fy + fz * fz) || 1;
        if (dist >= 60) continue;
        const repel = Math.min(0.6, (60 - dist) / 60) * step;
        const fa = F.get(e.from), fb = F.get(e.to);
        fa[0] += fx / dist * repel; fa[1] += fy / dist * repel; fa[2] += fz / dist * repel;
        fb[0] -= fx / dist * repel; fb[1] -= fy / dist * repel; fb[2] -= fz / dist * repel;
      }
      // 弹簧回复力：拉向社区中心（乘步长与其他力量纲一致），保持团块又不挤死
      for (const s of allStars) {
        const c0 = find(s);
        const fx = c0.cx - s.x, fy = c0.cy - s.y, fz = c0.cz - s.z;
        const f = F.get(s);
        f[0] += fx * 0.015 * step; f[1] += fy * 0.015 * step; f[2] += fz * 0.015 * step;
      }
      // 应用位移（cap 放大到 1.5，让力导向真正起作用）
      for (const s of allStars) {
        const f = F.get(s);
        const m = Math.sqrt(f[0] * f[0] + f[1] * f[1] + f[2] * f[2]);
        if (m > 0.001) { const cap = Math.min(1.5, m); s.x += f[0] / m * cap; s.y += f[1] / m * cap; s.z += f[2] / m * cap; }
      }
    }
    // 环境背景星场（远处装饰星，不交互，仅营造深空感）
    const ambient = [];
    const ambCount = theme === "a" ? 400 : 160;
    for (let i = 0; i < ambCount; i++) {
      const phi = Math.acos(1 - 2 * hash("amb" + i, "phi"));
      const theta = hash("amb" + i, "th") * Math.PI * 2;
      const R = 400 + hash("amb" + i, "r") * 300;
      ambient.push({
        x: R * Math.sin(phi) * Math.cos(theta), y: R * Math.sin(phi) * Math.sin(theta), z: R * Math.cos(phi),
        size: 0.4 + hash("amb" + i, "s") * 1.1, bright: 0.12 + hash("amb" + i, "b") * 0.5, phase: hash("amb" + i, "p") * Math.PI * 2
      });
    }
    let canvasW = 0, canvasH = 0;
    const ctx = canvas.getContext("2d");
    function resize() {
      const rect = wrap.getBoundingClientRect();
      canvasW = Math.max(300, rect.width);
      canvasH = Math.max(380, rect.height || 560);
      canvas.style.width = canvasW + "px";
      canvas.style.height = canvasH + "px";
      canvas.width = Math.round(canvasW * dpr);
      canvas.height = Math.round(canvasH * dpr);
    }
    resize();
    // 旋转/缩放状态
    let yaw = 0.4, pitch = -0.2, vyaw = 0, vpitch = 0, zoom = 1.0, t = 0;
    let dragging = false, dragMoved = false, lastX = 0, lastY = 0;
    let hover = null, idle = 0;
    let selected = null, neighborSet = new Set();
    function setSelected(s) { selected = s; neighborSet = new Set(); if (!s) return; for (const lk of edges) { if (lk.from === s) neighborSet.add(lk.to); if (lk.to === s) neighborSet.add(lk.from); } }
    const FOV = 520;
    function project(x, y, z) {
      const cy_ = Math.cos(yaw), sy_ = Math.sin(yaw);
      const x1 = x * cy_ - z * sy_;
      const z1 = x * sy_ + z * cy_;
      const cp = Math.cos(pitch), sp = Math.sin(pitch);
      const y2 = y * cp - z1 * sp;
      const z2 = y * sp + z1 * cp;
      const denom = FOV + z2;
      if (denom <= 2) return null;
      const persp = FOV / denom;
      return { sx: canvasW * 0.5 + x1 * persp * zoom, sy: canvasH * 0.5 + y2 * persp * zoom, depth: z2, scale: persp * zoom };
    }
    function roundRect(c, x, y, w, h, r) {
      if (c.roundRect) { c.beginPath(); c.roundRect(x, y, w, h, r); return; }
      c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r);
      c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
    }
    function draw() {
      ctx.save();
      ctx.scale(dpr, dpr);
      const cxh = canvasW * 0.5, cyh = canvasH * 0.5;
      // 背景：三主题统一中心扩散径向渐变（中心亮→边缘柔深），A 偏暗、B/C 偏亮
      const bg = ctx.createRadialGradient(cxh, cyh, 0, cxh, cyh, Math.max(canvasW, canvasH) * 0.75);
      bg.addColorStop(0, PAL.bgIn);
      bg.addColorStop(0.45, PAL.bgMid);
      bg.addColorStop(1, PAL.bgOut);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvasW, canvasH);
      // 星系中心柔光（只在中心，不蔓延到角落）
      const cg = ctx.createRadialGradient(cxh, cyh, 0, cxh, cyh, Math.min(canvasW, canvasH) * 0.4);
      cg.addColorStop(0, PAL.glowColor);
      cg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = cg;
      ctx.fillRect(0, 0, canvasW, canvasH);
      // 环境背景星（闪烁，随星系旋转）
      for (const a of ambient) {
        const p = project(a.x, a.y, a.z);
        if (!p) continue;
        const fog = Math.max(0, Math.min(1, 1 - p.depth / 750));
        if (fog < 0.02) continue;
        const twk = 0.55 + 0.45 * Math.sin(t * 2.5 + a.phase);
        ctx.globalAlpha = a.bright * fog * twk;
        ctx.fillStyle = PAL.ambient;
        ctx.fillRect(p.sx - a.size * 0.5, p.sy - a.size * 0.5, a.size, a.size);
      }
      ctx.globalAlpha = 1;
      // 投影笔记星
      const proj = new Map();
      for (const s of allStars) proj.set(s, project(s.x, s.y, s.z));
      // wikilink 关联连线（选中时高亮关联，其余淡出）
      ctx.lineWidth = 1.0;
      for (const lk of edges) {
        const pa = proj.get(lk.from), pb = proj.get(lk.to);
        if (!pa || !pb) continue;
        let a = Math.max(0.05, 0.4 - (pa.depth + pb.depth) / 1500);
        let glow = false;
        if (selected) {
          if (lk.from === selected || lk.to === selected) { a = Math.max(a, 0.55); glow = true; }
          else a = 0.03;
        }
        if (glow) { ctx.shadowBlur = 6; ctx.shadowColor = lk.from.color; }
        ctx.strokeStyle = lk.from.color + aHex(a);
        ctx.beginPath(); ctx.moveTo(pa.sx, pa.sy); ctx.lineTo(pb.sx, pb.sy); ctx.stroke();
        if (glow) { ctx.shadowBlur = 0; ctx.shadowColor = "transparent"; }
      }
      ctx.globalAlpha = 1;
      // 笔记星（远→近排序，用预渲染精灵）
      const drawn = [];
      for (const s of allStars) { const p = proj.get(s); if (p) drawn.push({ s, p }); }
      drawn.sort((a, b) => b.p.depth - a.p.depth);
      for (const { s, p } of drawn) {
        const fog = Math.max(0.12, Math.min(1, 1 - p.depth / 480));
        const twk = 0.82 + 0.18 * Math.sin(t * 2 + s.phase);
        const dimmed = selected && s !== selected && !neighborSet.has(s);
        const opFloor = theme === "a" ? 0.35 : 0.5;
        const opacity = (dimmed ? 0.13 : 1) * fog * (opFloor + (1 - opFloor) * s.recency) * twk;
        const baseR = Math.max(1.9, (2.5 + s.recency * 6.5) * p.scale);
        const useSpike = p.scale > 0.55 && s.recency > 0.2;
        ctx.globalAlpha = opacity;
        if (theme === "a") {
          ctx.drawImage(useSpike ? spikeSprites[s.coli] : sprites[s.coli], p.sx - baseR, p.sy - baseR, baseR * 2, baseR * 2);
        } else {
          // B/C：矢量实心圆，边缘锐利（渐变精灵在小尺寸下必糊）
          ctx.fillStyle = s.color;
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, Math.max(1.3, (1.05 + s.recency * 2.0) * p.scale), 0, Math.PI * 2);
          ctx.fill();
        }
        if (theme === "a" && p.scale > 0.5) {
          ctx.globalAlpha = Math.min(1, opacity * 1.2);
          ctx.fillStyle = "#ffffff";
          ctx.beginPath(); ctx.arc(p.sx, p.sy, Math.max(0.5, baseR * 0.16), 0, Math.PI * 2); ctx.fill();
        }
      }
      // 选中星高亮光环（呼吸脉冲）
      if (selected) {
        const p = proj.get(selected);
        if (p) {
          const rr = Math.max(10, 14 * p.scale) + 2 + Math.sin(t * 3) * 1.5;
          ctx.globalAlpha = 0.9; ctx.strokeStyle = selected.color; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(p.sx, p.sy, rr, 0, Math.PI * 2); ctx.stroke();
          ctx.globalAlpha = 0.28; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.arc(p.sx, p.sy, rr + 3, 0, Math.PI * 2); ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
            ctx.globalAlpha = 1;
      // 每颗笔记星的文件名标签（缩小时自动淡出，避免拥挤；悬停的星始终显示）
      ctx.font = "500 10px ui-sans-serif, system-ui, sans-serif";
      ctx.textAlign = "left";
      for (const { s, p } of drawn) {
        const linked = selected && (s === selected || neighborSet.has(s));
        const near = s === hover || linked;
        const fog2 = Math.max(0, Math.min(1, 1 - p.depth / 420));
        if (!near) continue;
        const label = s.note.name + (s.note.excalidraw ? " 🎨" : "");
        ctx.globalAlpha = Math.min(1, 0.35 + fog2 * 0.6) * (s === hover ? 1 : 0.85);
        ctx.fillStyle = PAL.text;
        ctx.fillText(label, p.sx + 10 * p.scale + 4, p.sy + 3);
      }
      ctx.globalAlpha = 1;
      // 悬浮提示
      if (hover) {
        const p = proj.get(hover);
        if (p) {
          const label = hover.note.name + (hover.note.excalidraw ? " 🎨" : "");
          const sub = relTime(hover.note.mtime);
          ctx.font = "600 13px ui-sans-serif, system-ui, sans-serif";
          ctx.textAlign = "left";
          const w = Math.max(ctx.measureText(label).width, ctx.measureText(sub).width) + 18;
          let tx = p.sx + 14, ty = p.sy - 38;
          if (tx + w > canvasW - 4) tx = p.sx - w - 14;
          if (ty < 4) ty = p.sy + 14;
          ctx.fillStyle = PAL.tipBg;
          ctx.strokeStyle = hover.color + "88";
          ctx.lineWidth = 1;
          roundRect(ctx, tx, ty, w, 38, 7);
          ctx.fill(); ctx.stroke();
          ctx.fillStyle = PAL.text;
          ctx.fillText(label, tx + 9, ty + 16);
          ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
          ctx.fillStyle = PAL.tipSub;
          ctx.fillText(sub, tx + 9, ty + 31);
        }
      }
      // 暗角
      const vg = ctx.createRadialGradient(cxh, cyh, Math.min(canvasW, canvasH) * 0.35, cxh, cyh, Math.max(canvasW, canvasH) * 0.75);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, PAL.vignette);
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, canvasW, canvasH);
      // 操作提示
      ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillStyle = theme === "a" ? "rgba(255,255,255,.22)" : "rgba(60,60,80,.35)";
      ctx.fillText("拖拽旋转 · 滚轮缩放 · 点击星辰打开笔记", 12, canvasH - 12);
      ctx.restore();
    }
    function hitTest(cx, cy) {
      let best = null, bestD = 20;
      for (const s of allStars) {
        const p = project(s.x, s.y, s.z);
        if (!p) continue;
        const d = Math.hypot(p.sx - cx, p.sy - cy);
        const thr = Math.max(8, (1.8 + s.recency * 4) * p.scale);
        if (d < thr && d < bestD) { bestD = d; best = s; }
      }
      return best;
    }
    const onDown = (e) => { dragging = true; dragMoved = false; lastX = e.clientX; lastY = e.clientY; vyaw = 0; vpitch = 0; canvas.style.cursor = "grabbing"; };
    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
      if (dragging) {
        const dx = e.clientX - lastX, dy = e.clientY - lastY;
        if (Math.abs(dx) + Math.abs(dy) > 3) dragMoved = true;
        yaw += dx * 0.006; pitch += dy * 0.006;
        pitch = Math.max(-1.4, Math.min(1.4, pitch));
        vyaw = dx * 0.006; vpitch = dy * 0.006;
        lastX = e.clientX; lastY = e.clientY; idle = 0;
      } else {
        hover = hitTest(cx, cy);
        canvas.style.cursor = hover ? "pointer" : "grab";
      }
    };
    const onUp = (e) => {
      if (dragging && !dragMoved) {
        const rect = canvas.getBoundingClientRect();
        const hit = hitTest(e.clientX - rect.left, e.clientY - rect.top);
        setSelected(hit === selected ? null : hit);
      }
      dragging = false;
      canvas.style.cursor = hover ? "pointer" : "grab";
    };
    const onLeave = () => { if (!dragging) { hover = null; canvas.style.cursor = "grab"; } };
    const onDbl = (e) => { const rect = canvas.getBoundingClientRect(); const hit = hitTest(e.clientX - rect.left, e.clientY - rect.top); if (hit) this.openNote(hit.note.path); };
    const onWheel = (e) => { e.preventDefault(); zoom *= e.deltaY > 0 ? 0.92 : 1.08; zoom = Math.max(0.3, Math.min(3.5, zoom)); };
    canvas.style.cursor = "grab";
    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    canvas.addEventListener("mouseleave", onLeave);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("dblclick", onDbl);
    let running = true, rafId = 0;
    const loop = () => {
      if (!running) return;
      t += 0.01;
      if (!dragging) {
        yaw += vyaw; pitch += vpitch;
        vyaw *= 0.94; vpitch *= 0.94;
        pitch = Math.max(-1.4, Math.min(1.4, pitch));
        idle += 1;
        if (idle > 90 && Math.abs(vyaw) < 0.0005 && Math.abs(vpitch) < 0.0005) yaw += 0.0015;
      }
      draw();
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    const ro = new ResizeObserver(() => resize());
    ro.observe(wrap);
    const onVis = () => {
      if (document.hidden) { running = false; if (rafId) { cancelAnimationFrame(rafId); rafId = 0; } }
      else if (!running) { running = true; rafId = requestAnimationFrame(loop); }
    };
    document.addEventListener("visibilitychange", onVis);
    this._starCleanup = () => {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      ro.disconnect();
      canvas.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      canvas.removeEventListener("mouseleave", onLeave);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("dblclick", onDbl);
      document.removeEventListener("visibilitychange", onVis);
    };
  }
  _stopStarMap() { if (this._starCleanup) { try { this._starCleanup(); } catch (e) {} this._starCleanup = null; } }
  bindColumnDnD(col, c, kind) {
    col.addEventListener("dragover", (e) => { e.preventDefault(); col.classList.add("over"); });
    col.addEventListener("dragleave", () => col.classList.remove("over"));
    col.addEventListener("drop", (e) => { e.preventDefault(); col.classList.remove("over"); this.onDrop(c, kind); });
  }
  async onDrop(c, kind) {
    const t0 = this._drag;
    if (!t0) return;
    if (c.auto && kind !== "manual") { this.banner("自动栏暂不支持拖拽放入（给任务打上项目标签或写进看板文件）"); return; }
    if (kind === "manual") {
      if (t0.file !== c.file) { this.banner("v1 仅支持同一手动板内移动卡片"); return; }
      await this.apply(t0.file, (text) => {
        let r = lib.moveCard(text, t0.ref, c.heading);
        if (!r.ok) return r;
        if (c.heading === "已完成" && !t0.done) r = lib.toggleDone(r.text, t0.ref, true, lib.todayStr());
        else if (c.heading !== "已完成" && t0.done) r = lib.toggleDone(r.text, t0.ref, false, lib.todayStr());
        return r;
      });
      this.refresh();
      return;
    }
    const isDoneCol = c.heading === "已完成";
    if (isDoneCol) {
      const sN = (c.stages && c.stages.length) ? c.stages : ["待办", "进行中"];
      await this.apply(t0.file, (text) => {
        let r = lib.toggleDone(text, t0.ref, true, lib.todayStr());
        if (!r.ok) return r;
        const c2 = lib.clearStageAny(r.text, r.text.split(/\r?\n/)[t0.lineIndex], sN);
        if (c2.ok) r = { ok: true, text: c2.text, changed: r.changed || c2.changed };
        return r;
      });
      this.refresh();
      return;
    }
    const sN2 = (c.stages && c.stages.length) ? c.stages : ["待办", "进行中"];
    if (t0.done) {
      await this.apply(t0.file, (text) => {
        let r = lib.toggleDone(text, t0.ref, false, lib.todayStr());
        if (!r.ok) return r;
        return lib.setStageAny(r.text, r.text.split(/\r?\n/)[t0.lineIndex], c.heading, sN2);
      });
    } else {
      await this.apply(t0.file, (text) => lib.setStageAny(text, t0.ref, c.heading, sN2));
    }
    this.refresh();
  }
  wrapArea(id, cls, build, opts) {
    const noBottomHandle = opts && opts.noBottomHandle;
    const wrap = this.pad.createDiv({ cls: "wb-awrap" });
    const sc = wrap.createDiv({ cls: "wb-asroll " + cls });
    sc.dataset.wbId = id;
    const saved = this.plugin.areaH && this.plugin.areaH[id];
    if (saved) sc.style.height = saved + "px";
    else if (opts && opts.defaultH) sc.style.height = opts.defaultH + "px";
    build(sc);
    if (noBottomHandle) return;
    const h = wrap.createDiv({ cls: "wb-aresize" });
    h.title = "拖拽调整高度 · 双击恢复默认";
    h.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const startY = e.clientY;
      const startH = sc.getBoundingClientRect().height;
      const mm = (ev) => {
        const nh = Math.max(120, Math.min(Math.round(startH + (ev.clientY - startY)), Math.round(window.innerHeight * 0.92)));
        sc.style.height = nh + "px";
      };
      const mu = () => {
        window.removeEventListener("mousemove", mm);
        window.removeEventListener("mouseup", mu);
        this.plugin.areaH = this.plugin.areaH || {};
        this.plugin.areaH[id] = Math.round(sc.getBoundingClientRect().height);
        this.plugin.saveInspoData();
      };
      window.addEventListener("mousemove", mm);
      window.addEventListener("mouseup", mu);
    });
    h.addEventListener("dblclick", () => {
      if (this.plugin.areaH) delete this.plugin.areaH[id];
      sc.style.height = "";
      this.plugin.saveInspoData();
    });
  }
  pickDate(anchorEl, t) {
    if (this._picker) this.closePicker();
    const p = this.pad.createDiv({ cls: "wb-picker" });
    this._picker = p;
    const input = p.createEl("input", { type: "date", cls: "wb-pinput" });
    input.value = t.due || lib.todayStr();
    const ok = p.createSpan({ text: "确定", cls: "wb-pbtn" });
    ok.addEventListener("click", () => {
      const v = input.value;
      this.apply(t.file, (text) => lib.setDue(text, t.ref, v || null));
      this.closePicker();
    });
    const clear = p.createSpan({ text: "清除", cls: "wb-pbtn" });
    clear.addEventListener("click", () => {
      this.apply(t.file, (text) => lib.setDue(text, t.ref, null));
      this.closePicker();
    });
    const esc = p.createSpan({ text: "×", cls: "wb-pbtn" });
    esc.addEventListener("click", () => this.closePicker());
    const closer = (ev) => {
      if (!p.isConnected) { document.removeEventListener("click", closer); return; }
      if (!p.contains(ev.target)) this.closePicker();
    };
    setTimeout(() => document.addEventListener("click", closer), 0);
    // 边界钳制：弹层不超出 root 可视区（右/下溢出则往左上收）
    const r = anchorEl.getBoundingClientRect();
    const rr = this.root.getBoundingClientRect();
    const pw = p.offsetWidth || 240;
    const ph = p.offsetHeight || 48;
    let left = Math.round(r.left - rr.left);
    let top = Math.round(r.bottom - rr.top + 4);
    const maxLeft = Math.round(rr.width - pw - 8);
    if (left + pw > rr.width - 8) left = Math.max(8, maxLeft);
    left = Math.max(8, left);
    if (top + ph > rr.height - 8) top = Math.max(8, Math.round(r.top - rr.top - ph - 4));
    top = Math.max(8, top);
    p.style.left = left + "px";
    p.style.top = top + "px";
    input.focus();
  }
  closePicker() {
    if (this._picker) { this._picker.remove(); this._picker = null; }
  }
  async apply(file, mutate) {
    try {
      const f = this.app.vault.getAbstractFileByPath(file);
      if (!f) { this.banner("未找到文件：" + file); return; }
      const res = mutate(await this.app.vault.read(f));
      if (!res.ok) { this.banner("内容已变化（他处编辑过），点击这里重载"); return; }
      if (res.changed) await this.app.vault.process(f, () => res.text);
    } catch (er) {
      this.banner("写入失败：" + String((er && er.message) || er));
    }
  }
  banner(msg) {
    if (!this.pad) return;
    this.dismissBanner();
    this.bannerEl = this.pad.createDiv({ cls: "wb-banner wb-banner-err" });
    this.bannerEl.textContent = msg + " —— 点击重载";
    this.pad.insertBefore(this.bannerEl, this.pad.children[1] || null);
    this.bannerEl.addEventListener("click", () => { this.dismissBanner(); this.refresh(); });
  }
  catchRender(er) {
    const msg = String((er && er.stack) || er);
    this.app.vault.adapter.write(this.app.vault.configDir + "/plugins/workbench-dashboard/.dev/last-error.txt", msg).catch(() => {});
    try { this.banner("工作台渲染出错：" + String((er && er.message) || er) + "（详情已写入 .dev/last-error.txt）"); } catch (e2) {}
  }
  dismissBanner() { if (this.bannerEl) { this.bannerEl.remove(); this.bannerEl = null; } }
}
class WorkbenchSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  refreshSettingsKeepScroll() {
    // 重渲染设置页但保持滚动位置（阶段数量等需重建整页时避免回顶）
    let target = null;
    try { target = this.app.dom.app.querySelector(".vertical-tab-content"); } catch (e) {}
    const top = target ? target.scrollTop : 0;
    this.display();
    if (target) requestAnimationFrame(() => { target.scrollTop = top; });
  }
  display() {
    const c = this.containerEl;
    c.empty();
    c.createEl("h2", { text: (this.plugin.wbTitle || "Lyra") + " 设置" });
    // ===== 外观 =====
    new Setting(c).setName("外观").setHeading();
    new Setting(c).setName("工作台名称").setDesc("界面顶部 + 标签页显示的标题文字").addText((t) => {
      t.setPlaceholder("Lyra").setValue(this.plugin.wbTitle || "Lyra").onChange(async (v) => {
        this.plugin.setWbTitle(v.trim() || "Lyra");
      });
    });
    new Setting(c).setName("顶部小标题").setDesc("大标题上方的小字（留空 = 不显示该行）").addText((t) => {
      t.setPlaceholder("MIYOUNG · WORKBENCH").setValue(this.plugin.wbEyebrow || "").onChange(async (v) => {
        this.plugin.setWbEyebrow(v.trim());
      });
    });
    new Setting(c).setName("主题").setDesc("界面配色（也可在界面右上角 A/B/C 切换）").addDropdown((d) => {
      d.addOptions({ a: "深色", b: "暖纸", c: "纯白" }).setValue(this.plugin.theme).onChange(async (v) => { this.plugin.setTheme(v); });
    });
    new Setting(c).setName("背景辉光").setDesc("顶部渐变发光强度（强 / 中 / 弱 / 关）").addDropdown((d) => {
      d.addOptions({ high: "强", mid: "中", low: "弱", off: "关" }).setValue(this.plugin.glow || "high").onChange(async (v) => {
        this.plugin.glow = v;
        this.plugin.saveInspoData();
        this.plugin.app.workspace.getLeavesOfType(VIEW_TYPE).forEach((l) => { if (l.view) l.view.render(); });
      });
    });
    // ===== 数据与存储 =====
    new Setting(c).setName("数据与存储").setHeading();
    new Setting(c).setName("灵感存储目录").setDesc("灵感收集页中，每个灵感存为目录下一个独立 Markdown 文件").addText((t) => {
      t.setPlaceholder("1-灵感").setValue(this.plugin.inspoDir || "1-灵感").onChange(async (v) => {
        this.plugin.inspoDir = v.trim() || "1-灵感";
        this.plugin.saveInspoData();
      });
    });
    new Setting(c).setName("每日笔记目录").setDesc("「新建日记」写入的目录").addText((t) => {
      t.setPlaceholder("0-收件箱/每日").setValue(this.plugin.dailyDir || "0-收件箱/每日").onChange(async (v) => {
        this.plugin.dailyDir = v.trim() || "0-收件箱/每日";
        this.plugin.saveInspoData();
      });
    });
    new Setting(c).setName("每周笔记目录").setDesc("「新建周记」写入的目录").addText((t) => {
      t.setPlaceholder("0-收件箱/每周").setValue(this.plugin.weeklyDir || "0-收件箱/每周").onChange(async (v) => {
        this.plugin.weeklyDir = v.trim() || "0-收件箱/每周";
        this.plugin.saveInspoData();
      });
    });
    new Setting(c).setName("项目看板目录").setDesc("「新建项目」创建看板文件的目录").addText((t) => {
      t.setPlaceholder("项目文档").setValue(this.plugin.projDir || "项目文档").onChange(async (v) => {
        this.plugin.projDir = v.trim() || "项目文档";
        this.plugin.saveInspoData();
      });
    });
    // ===== 番茄钟 =====
    new Setting(c).setName("归档目录").setDesc("「一键归档」将完成的日记/周记移到此目录下的 每日/每周 子目录").addText((t) => {
      t.setPlaceholder("笔记归档").setValue(this.plugin.archiveDir || "笔记归档").onChange(async (v) => {
        this.plugin.archiveDir = v.trim() || "笔记归档";
        this.plugin.saveInspoData();
      });
    });
    new Setting(c).setName("番茄钟").setHeading();
    const p = this.plugin.pomo = this.plugin.pomo || { work: 25, rest: 5, mode: "work", left: 25 * 60, running: false };
    new Setting(c).setName("专注时长（分钟）").setDesc("默认 25，范围 1–120").addText((t) => {
      t.setPlaceholder("25").setValue(String(p.work)).onChange(async (v) => {
        const n = Math.max(1, Math.min(120, parseInt(v, 10) || 25));
        p.work = n;
        if (!p.running && p.mode === "work") p.left = n * 60;
        this.plugin.saveInspoData();
      });
    });
    new Setting(c).setName("休息时长（分钟）").setDesc("默认 5，范围 1–60").addText((t) => {
      t.setPlaceholder("5").setValue(String(p.rest)).onChange(async (v) => {
        const n = Math.max(1, Math.min(60, parseInt(v, 10) || 5));
        p.rest = n;
        if (!p.running && p.mode === "rest") p.left = n * 60;
        this.plugin.saveInspoData();
      });
    });
    // ===== 倒计时 =====（区块化：添加/删除只重建本区块，不动整页滚动）
    new Setting(c).setName("倒计时").setHeading();
    c.createEl("p", { text: "首页倒计时卡片支持多个目标（多条时用紧凑列表显示）。单条时显示大数字卡片；留空列表则显示「距明年 1 月 1 日」。", cls: "setting-item-desc" });
    const cdBox = c.createDiv();
    const renderCdRows = () => {
      cdBox.empty();
      const cdList = this.plugin.countdowns = this.plugin.countdowns || [];
      cdList.forEach((cd, i) => {
        new Setting(cdBox).setName("倒计时 " + (i + 1)).addText((t) => {
          t.setPlaceholder("事件名称（如：国庆）").setValue(cd.label || "").onChange(async (v) => {
            cd.label = v.trim();
            clearTimeout(this._cdDebounce); this._cdDebounce = setTimeout(() => this.plugin.saveInspoData(), 800);
            this.plugin.app.workspace.getLeavesOfType(VIEW_TYPE).forEach((l) => { if (l.view) l.view.render(); });
          });
        }).addText((t) => {
          t.setPlaceholder("2027-06-01").setValue(cd.date || "").onChange(async (v) => {
            const s = v.trim();
            if (/^\d{4}-\d{2}-\d{2}$/.test(s)) cd.date = s;
            clearTimeout(this._cdDebounce); this._cdDebounce = setTimeout(() => this.plugin.saveInspoData(), 800);
            this.plugin.app.workspace.getLeavesOfType(VIEW_TYPE).forEach((l) => { if (l.view) l.view.render(); });
          });
        }).addExtraButton((b) => {
          b.setIcon("trash").setTooltip("删除这条倒计时").onClick(async () => {
            cdList.splice(i, 1);
            this.plugin.saveInspoData();
            this.plugin.app.workspace.getLeavesOfType(VIEW_TYPE).forEach((l) => { if (l.view) l.view.render(); });
            renderCdRows();
          });
        });
      });
      new Setting(cdBox).setName("添加倒计时").setDesc("新增一个倒计时目标").addButton((b) => {
        b.setButtonText("+ 添加").setCta().onClick(async () => {
          cdList.push({ label: "", date: lib.todayStr(), since: lib.todayStr() });
          this.plugin.saveInspoData();
          renderCdRows();
          const last = cdBox.lastElementChild; if (last && last.scrollIntoView) last.scrollIntoView({ block: "nearest" });
        });
      });
    };
    renderCdRows();
    // ===== 项目阶段配置 =====
    new Setting(c).setName("项目阶段").setHeading();
    c.createEl("p", { text: "新建项目看板使用的阶段（4–6 个）。任务打 #阶段名 标签即落入对应列；「已完成」列收集已勾选任务。已建项目沿用其自身阶段，不受此处影响。", cls: "setting-item-desc" });
    const projStages = this.plugin.getProjStages();
    new Setting(c).setName("阶段数量").setDesc("看板列的数量（4–6 个）").addDropdown((d) => {
      const cur = projStages.filter((s) => s.enabled).length;
      const opts = {};
      for (let n = 4; n <= 6; n++) opts[String(n)] = n + " 个阶段";
      d.addOptions(opts).setValue(String(cur)).onChange(async (v) => {
        const n = parseInt(v, 10);
        const arr = this.plugin.getProjStages();
        for (let i = 0; i < arr.length; i++) arr[i].enabled = i < n;
        this.plugin.projStages = arr;
        this.plugin.saveInspoData();
        this.plugin.app.workspace.getLeavesOfType(VIEW_TYPE).forEach((l) => { if (l.view) l.view.render(); });
        this.refreshSettingsKeepScroll();
      });
    });
    for (let i = 0; i < 6; i++) {
      const s = projStages[i];
      new Setting(c).setName("阶段 " + (i + 1)).setDesc("自定义第 " + (i + 1) + " 个阶段的名称、颜色，以及是否显示该列").addText((t) => {
        t.setValue(s.name).onChange(async (v) => {
          const arr = this.plugin.getProjStages();
          arr[i].name = v.trim() || ("阶段" + (i + 1));
          this.plugin.projStages = arr;
          this.plugin.saveInspoData();
          this.plugin.app.workspace.getLeavesOfType(VIEW_TYPE).forEach((l) => { if (l.view) l.view.render(); });
        });
      }).addColorPicker((cp) => {
        cp.setValue(s.color).onChange(async (v) => {
          const arr = this.plugin.getProjStages();
          arr[i].color = v || "#8b98a9";
          this.plugin.projStages = arr;
          this.plugin.saveInspoData();
          this.plugin.app.workspace.getLeavesOfType(VIEW_TYPE).forEach((l) => { if (l.view) l.view.render(); });
        });
      }).addToggle((tg) => {
        tg.setValue(!!s.enabled).onChange(async (v) => {
          const arr = this.plugin.getProjStages();
          arr[i].enabled = !!v;
          this.plugin.projStages = arr;
          this.plugin.saveInspoData();
          this.plugin.app.workspace.getLeavesOfType(VIEW_TYPE).forEach((l) => { if (l.view) l.view.render(); });
        });
      });
    }
    // ===== 灵感阶段配置 =====
    new Setting(c).setName("灵感阶段").setHeading();
    c.createEl("p", { text: "灵感收集页的列（5 个）。改名称/颜色即时生效；关闭则隐藏该列。", cls: "setting-item-desc" });
    const inspoStages = this.plugin.getInspoStages();
    for (let i = 0; i < 5; i++) {
      const s = inspoStages[i];
      new Setting(c).setName("阶段 " + (i + 1)).setDesc("自定义第 " + (i + 1) + " 个灵感阶段的名称、颜色，以及是否显示该列").addText((t) => {
        t.setValue(s.name).onChange(async (v) => {
          const arr = this.plugin.getInspoStages();
          arr[i].name = v.trim() || ("阶段" + (i + 1));
          this.plugin.inspoStages = arr;
          this.plugin.saveInspoData();
          this.plugin.app.workspace.getLeavesOfType(VIEW_TYPE).forEach((l) => { if (l.view) l.view.render(); });
        });
      }).addColorPicker((cp) => {
        cp.setValue(s.color).onChange(async (v) => {
          const arr = this.plugin.getInspoStages();
          arr[i].color = v || "#8b98a9";
          this.plugin.inspoStages = arr;
          this.plugin.saveInspoData();
          this.plugin.app.workspace.getLeavesOfType(VIEW_TYPE).forEach((l) => { if (l.view) l.view.render(); });
        });
      }).addToggle((tg) => {
        tg.setValue(!!s.enabled).onChange(async (v) => {
          const arr = this.plugin.getInspoStages();
          arr[i].enabled = !!v;
          this.plugin.inspoStages = arr;
          this.plugin.saveInspoData();
          this.plugin.app.workspace.getLeavesOfType(VIEW_TYPE).forEach((l) => { if (l.view) l.view.render(); });
        });
      });
    }
    // ===== 关于 =====
    new Setting(c).setName("关于").setHeading();
    new Setting(c).setName("版本").setDesc("其余配置（封面、分页、项目视图、灵感筛选等）直接在界面里改，会自动保存。").addText((t) => {
      t.setValue(this.manifest ? "v" + this.manifest.version : "").setDisabled(true);
    });
  }
}
module.exports = WorkbenchPlugin;
