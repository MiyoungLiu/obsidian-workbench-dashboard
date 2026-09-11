// lib.js — 工作台纯逻辑层（零 obsidian 依赖，ESM）
// 纪律：所有函数纯函数；同样的输入必须得到同样的输出；不碰文件系统。
// ---------- 日期 ----------
export function pad2(n) {
  return String(n).padStart(2, "0");
}
export function dateStr(d) {
  return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
}
export function todayStr(today = new Date()) {
  return dateStr(today);
}
export function addDays(yyyyMmDd, n) {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return dateStr(new Date(y, m - 1, d + n));
}
// ---------- 农历（1900-2100）----------
// 标准农历表：每年 0x18bd7 形式，bit 0-11 十二月大小(1=大30天,0=小29天)，bit 12 闰月月份(0=无闰)，bit 13-15 闰月大小
const LUNAR_TABLE = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2, // 1900-1909
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977, // 1910-1919
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970, // 1920-1929
  0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950, // 1930-1939
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557, // 1940-1949
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0, // 1950-1959
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0, // 1960-1969
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b5a0, 0x195a6, // 1970-1979
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570, // 1980-1989
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x055c0, 0x0ab60, 0x096d5, 0x092e0, // 1990-1999
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5, // 2000-2009
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930, // 2010-2019
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530, // 2020-2029
  0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45, // 2030-2039
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0, // 2040-2049
  0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0, // 2050-2059
  0x0a2e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4, // 2060-2069
  0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0, // 2070-2079
  0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160, // 2080-2089
  0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a2d0, 0x0d150, 0x0f252, // 2090-2099
  0x0d520 // 2100
];
const LUNAR_MONTHS = ["正", "二", "三", "四", "五", "六", "七", "八", "九", "十", "冬", "腊"];
const LUNAR_DAYS = ["初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十",
  "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
  "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十"];
const ZODIAC = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"];
const LUNAR_EPOCH = Date.UTC(1900, 1, 28); // 1900-01-31 正月初一
function _lYearDays(y) {
  let s = 348;
  const data = LUNAR_TABLE[y - 1900];
  for (let i = 0x8000; i > 0x8; i >>= 1) s += (data & i) ? 1 : 0;
  return s + _lLeapDays(y);
}
function _lLeapDays(y) {
  if (_lLeapMonth(y)) {
    return (LUNAR_TABLE[y - 1900] & 0x10000) ? 30 : 29;
  }
  return 0;
}
function _lLeapMonth(y) {
  return LUNAR_TABLE[y - 1900] & 0xf;
}
function _lMonthDays(y, m) {
  return (LUNAR_TABLE[y - 1900] & (0x10000 >> m)) ? 30 : 29;
}
// 列出某农历年所有月份（含闰月，按顺序）：[{m, leap, days}]
function _lYearMonths(ly) {
  const leap = _lLeapMonth(ly);
  const out = [];
  for (let m = 1; m <= 12; m++) {
    out.push({ m, leap: false, days: _lMonthDays(ly, m) });
    if (m === leap) out.push({ m, leap: true, days: _lLeapDays(ly) });
  }
  return out;
}
// 公历 Date → 农历字符串，如 "七月廿二"；超出表范围返回空串
export function lunarCN(d) {
  const y = d.getFullYear(), mo = d.getMonth() + 1, day = d.getDate();
  if (y < 1900 || y > 2100) return "";
  // 1900-01-31 为农历 1900 正月初一（epoch）
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
export function parseTaskLine(line) {
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
export function parseTasksForFile(path, text, mtime) {
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
export function noteInfo(f) {
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
export function collectState(files) {
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
export function queryToday(state, today = todayStr()) {
  return state.tasks.filter((t) => !t.done && ((t.due && t.due <= today) || (t.scheduled && t.scheduled <= today))).sort(byDue);
}
export function queryNext7(state, today = todayStr()) {
  const end = addDays(today, 7);
  return state.tasks.filter((t) => !t.done && t.due && t.due > today && t.due <= end).sort(byDue);
}
export function queryUnscheduled(state) {
  return state.tasks.filter((t) => !t.done && !t.due && !t.scheduled);
}
export function queryTodayDone(state, today = todayStr()) {
  return state.tasks.filter((t) => t.done && t.doneDate === today);
}
export function queryTagBoard(state, tag) {
  const has = (t) => t.tags.includes(tag);
  return {
    todo: state.tasks.filter((t) => !t.done && has(t) && !t.tags.includes("进行中")).sort(byDue),
    doing: state.tasks.filter((t) => !t.done && has(t) && t.tags.includes("进行中")).sort(byDue),
    done: state.tasks.filter((t) => t.done && has(t)),
  };
}
export function querySuperBoard(state) {
  return queryTagBoard(state, "超分");
}
// ---------- 可配置阶段（v2-T19）----------
// 项目阶段默认（4-6 槽；前 3 默认启用，对应旧 待办/进行中/已完成）
export const DEFAULT_PROJ_STAGES = [
  { name: "待办", color: "#8b98a9", enabled: true },
  { name: "进行中", color: "#4f8cff", enabled: true },
  { name: "已完成", color: "#8cc265", enabled: true },
  { name: "已阻塞", color: "#e0af68", enabled: false },
  { name: "已搁置", color: "#9a7bff", enabled: false },
  { name: "已放弃", color: "#e07f87", enabled: false },
];
// 灵感阶段默认（5 槽，对应旧 INSPO_COLS 的中文名列）
export const DEFAULT_INSPO_STAGES = [
  { name: "收集箱", color: "#8b98a9", enabled: true },
  { name: "评估中", color: "#4f8cff", enabled: true },
  { name: "进行中", color: "#34c7c7", enabled: true },
  { name: "已完成", color: "#8cc265", enabled: true },
  { name: "已放弃", color: "#e07f87", enabled: true },
];
// 归一化阶段配置：补默认、限 6 槽（proj）/5 槽（inspo）、name 去空
export function normStages(cfg, max, fallback) {
  const base = (Array.isArray(fallback) ? fallback : DEFAULT_PROJ_STAGES).slice(0, max);
  const out = [];
  for (let i = 0; i < max; i++) {
    const d = base[i] || { name: "阶段" + (i + 1), color: "#8b98a9", enabled: i < 3 };
    const c = cfg && cfg[i] ? cfg[i] : {};
    out.push({ name: String(c.name || d.name).trim() || ("阶段" + (i + 1)), color: c.color || d.color, enabled: c.enabled === undefined ? d.enabled : !!c.enabled });
  }
  return out;
}
// 取启用阶段（保持顺序）
export function enabledStages(cfg, max, fallback) {
  return normStages(cfg, max, fallback).filter((s) => s.enabled && s.name);
}
// 按"阶段名当标签"把项目任务分到各启用阶段列
// stages = [{name,color,enabled}]；返回 [{heading, color, tasks}]
// 规则：已完成阶段=done 任务；其余阶段=未 done 且带 #阶段名 标签；
//       未 done 且无任一启用阶段标签 → 归入第一个阶段列（兜底）
export function stageBoard(state, tag, stages) {
  const has = (t) => t.tags.includes(tag);
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
// 灵感阶段名列表（供模板/解析用）
export function inspoStageNames(cfg) {
  return enabledStages(cfg, 5, DEFAULT_INSPO_STAGES).map((s) => s.name);
}
// 项目板发现（v1.1 r3）：项目文档/<X>项目看板.md 含 `tags include #<X>` 查询围栏 = #X 项目板
export function discoverTagBoards(state) {
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
// 项目标签动态发现：= discoverTagBoards(state) 的所有 tag（即 项目文档/*项目看板.md 的标签集合）。
// 空 vault 没有项目看板文件时返回空集，所有任务进通用看板；不再硬编码任何私人项目名。
export function projectTagsOf(state) {
  if (!state || !state.files) return [];
  return discoverTagBoards(state).map((b) => b.tag);
}
export const AUTO_BOARD_COL = "未入项目";
export const AUTO_BOARD_EXCLUDE = ["项目文档/项目看板.md", "私人日程看板.md"];
export function queryAutoTasks(state) {
  const pt = projectTagsOf(state);
  return state.tasks
    .filter((t) => !t.done && !t.tags.some((g) => pt.includes(g)) && !AUTO_BOARD_EXCLUDE.includes(t.file))
    .sort(byDue);
}
export function queryAutoDoneTasks(state) {
  const pt = projectTagsOf(state);
  return state.tasks
    .filter((t) => t.done && t.doneDate && !t.tags.some((g) => pt.includes(g)) && !AUTO_BOARD_EXCLUDE.includes(t.file));
}
// 通用看板：无项目标签的任务按阶段标签分栏（stageBoard 的"无标签"变体）
// 规则同 stageBoard，但 has(t) = 任务不带任何项目标签（动态发现）、且不在 AUTO_BOARD_EXCLUDE
export function autoBoard(state, stages) {
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
export function kanbanBoard(state, path) {
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
export const CARD_FOLDERS = [
  "0-收件箱", "项目文档",
  "1-灵感", "2-知识积累", "3-资料库", "笔记归档",
];
export function cardWall(state) {
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
export function toggleDone(text, ref, doDone, today = todayStr()) {
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
export function setStage(text, ref, toStage) {
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
// stageNames = 所有阶段名（含 待办/进行中/已完成 等）；toStage 为目标阶段名
export function setStageAny(text, ref, toStage, stageNames) {
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
export function clearStageAny(text, ref, stageNames) {
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
export function setDue(text, ref, date) {
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
export function moveCard(text, ref, toHeading) {
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
export function clearStage(text, ref) {
  const lines = text.split(/\r?\n/);
  const i = findIdx(text, ref);
  if (i < 0) return { ok: false, error: "stale" };
  let line = lines[i].replace(/\s*#待办(?=\s|$)/g, "").replace(/\s*#进行中(?=\s|$)/g, "").replace(/ {2,}/g, " ").trimEnd();
  lines[i] = line;
  return { ok: true, text: rejoin(text, lines), changed: line !== ref };
}
// ---------- 概览统计（v2）----------
// 周一为起点的 ISO 周（返回该周周一的 yyyy-mm-dd）
export function weekStart(yyyyMmDd) {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const dow = (dt.getDay() + 6) % 7; // 0=周一
  return addDays(yyyyMmDd, -dow);
}
export function queryOverdue(state, today = todayStr()) {
  return state.tasks.filter((t) => !t.done && t.due && t.due < today);
}
export function todayStats(state, today = todayStr()) {
  const open = state.tasks.filter((t) => !t.done && t.due && t.due <= today).length;
  const done = state.tasks.filter((t) => t.done && t.doneDate === today).length;
  const overdue = state.tasks.filter((t) => !t.done && t.due && t.due < today).length;
  const rate = open + done > 0 ? Math.round((done / (open + done)) * 100) : 0;
  return { open, done, overdue, rate };
}
export function weekStats(state, today = todayStr()) {
  const ws = weekStart(today);
  const we = addDays(ws, 6); // 周日
  const done = state.tasks.filter((t) => t.done && t.doneDate && t.doneDate >= ws && t.doneDate <= we).length;
  const total = state.tasks.filter((t) => t.due && t.due >= ws && t.due <= we).length;
  const rate = total > 0 ? Math.round((done / total) * 100) : 0;
  return { done, total, rate, ws, we };
}
// 最近 weeks 周（含本周）每天完成数（按 doneDate），从最早周一到本周周日
export function heatmap(state, today = todayStr(), weeks = 12) {
  const thisMon = weekStart(today);
  let start = addDays(thisMon, -(weeks - 1) * 7);
  // 补齐首周周一之前的天数（使第一列从周一开始）
  const startDow = (new Date(Number(start.slice(0, 4)), Number(start.slice(5, 7)) - 1, Number(start.slice(8, 10))).getDay() + 6) % 7;
  if (startDow !== 0) start = addDays(start, -startDow);
  // 补齐末周周日（使最后一列完整）
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
// 快速捕获：生成一行新任务（纯，便于测）
export function appendTaskLine(desc, today, tag) {
  if (!today) today = todayStr();
  if (tag === undefined) tag = "今日";
  let line = "- [ ] " + desc.trim();
  if (tag) line += " #" + tag;
  line += " 📅 " + today;
  return line;
}
// ---------- 项目页视图数据（v2-T6c）----------
// 状态判定：done 优先；否则 #进行中→doing；否则 #待办→todo；无标签默认 todo
export function stageOf(t) {
  if (t.done) return "done";
  const tags = t.tags || [];
  if (tags.includes("进行中")) return "doing";
  if (tags.includes("待办")) return "todo";
  return "todo";
}
// 按状态过滤（all/todo/doing/done）
export function filterByStage(tasks, stage) {
  if (stage === "all") return tasks.slice();
  return tasks.filter((t) => stageOf(t) === stage);
}
// 日历：anchor 所在周(周一~周日)每天的任务 + 该范围 [start,end] 内每天任务（用于月视图按月）
// 这里做通用版：给定日期区间 [start, end]，返回每天 { date, tasks }
export function calendarRange(tasks, start, end) {
  const cells = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    cells.push({ date: d, tasks: tasks.filter((t) => t.due === d) });
  }
  return cells;
}
// 甘特行：每个有 due 的任务，start = 区间最早 due，end = 该任务 due（截止日时间轴版）
// 返回 { ref, desc, start, end, done, stage } 列表（按 start,end 排序）
export function ganttRows(tasks) {
  const dated = tasks.filter((t) => t.due);
  if (!dated.length) return { rows: [], start: null, end: null };
  const ds = dated.map((t) => t.due).sort();
  const start = ds[0];
  const end = ds[ds.length - 1];
  const rows = dated.map((t) => ({
    file: t.file,
    desc: t.desc,
    start: start,
    end: t.due,
    done: t.done,
    stage: stageOf(t),
  })).sort((a, b) => (a.end < b.end ? -1 : a.end > b.end ? 1 : 0));
  return { rows, start, end };
}
// ---------- 底部组件数据（v2-T7）----------
// 笔记分布：某年按周(周一)×7 的每日笔记数（date 优先 frontmatter 日期，否则 mtime）
export function noteDateOf(n) {
  if (n.date && /^\d{4}-\d{2}-\d{2}$/.test(n.date)) return n.date;
  return dateStr(new Date(n.mtime));
}
export function noteYearHeatmap(notes, year) {
  if (!year) year = new Date().getFullYear();
  const count = {};
  for (const n of notes) { const d = noteDateOf(n); if (d.slice(0, 4) === String(year)) count[d] = (count[d] || 0) + 1; }
  // 该年第一天所在周的周一 ~ 该年最后一天所在周的周日（补全整周，保证每列 7 格、周一开头）
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
// Task分布：某年按周(周一)×7 的每日完成任务数（doneDate）
export function taskYearHeatmap(state, year) {
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
export function weekTrend(state, weeks) {
  // 最近 N 周（含本周）每周完成的任务数，返回 [{week, label, done}]
  if (!weeks) weeks = 8;
  const doneCount = {};
  for (const t of state.tasks) {
    if (!t.done || !t.doneDate) continue;
    const start = weekStart(t.doneDate);
    doneCount[start] = (doneCount[start] || 0) + 1;
  }
  const endStart = weekStart(todayStr());
  const out = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = addDays(endStart, -i * 7);
    const dt = new Date(Number(start.slice(0, 4)), Number(start.slice(5, 7)) - 1, Number(start.slice(8, 10)));
    const lab = i === 0 ? "本周" : (dt.getMonth() + 1) + "/" + dt.getDate();
    out.push({ week: start, label: lab, done: doneCount[start] || 0 });
  }
  return out;
}
export function streak(state) {
  // 连续完成天数（今天未完成不中断，从昨天往前数）
  const d = new Date();
  let span = 0;
  for (let i = 0; i < 2000; i++) {
    const key = dateStr(new Date(d.getFullYear(), d.getMonth(), d.getDate() - i));
    const has = state.tasks.some((t) => t.done && t.doneDate === key);
    if (has) { span += 1; continue; }
    if (i === 0) continue;
    break;
  }
  return span;
}
// 倒计时：距目标日期的天数/剩余周数 + 当前年份已过去百分比（v2-T11 修复：原来按目标年算，跨年恒 0%）
export function countdownStats(target, today) {
  if (!today) today = todayStr();
  const [ty, tm, td] = today.split("-").map(Number);
  const [by, bm, bd] = target.split("-").map(Number);
  const daysLeft = Math.max(0, Math.round((new Date(by, bm - 1, bd) - new Date(ty, tm - 1, td)) / 86400000));
  const weeksLeft = Math.ceil(daysLeft / 7);
  // 年度进度按「今天所在年份」算：elapsed/total
  const total = Math.round((new Date(ty, 11, 31) - new Date(ty, 0, 1)) / 86400000);
  const elapsed = Math.max(0, Math.round((new Date(ty, tm - 1, td) - new Date(ty, 0, 1)) / 86400000));
  const pct = total > 0 ? Math.min(100, Math.round((elapsed / total) * 100)) : 0;
  return { daysLeft, weeksLeft, pct, target, year: ty };
}
// ISO 年-周（如 2026-W36），与 Periodic Notes 默认周记文件名一致
export function isoYearWeek(d) {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = x.getUTCDay() || 7;
  x.setUTCDate(x.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(x.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((x - yearStart) / 86400000 + 1) / 7);
  return x.getUTCFullYear() + "-W" + pad2(weekNo);
}
// ---------- 项目属性（v2-T8 新建项目属性）----------
// 解析看板文件 frontmatter → { type, color, start, end, desc, stages }
export function projectMeta(text) {
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
// ---------- 灵感捕捉（v2-T9）----------
export const INSPO_COLS = [
  { id: "inbox", icon: "📥", label: "收集箱", dot: "#8b98a9" },
  { id: "eval", icon: "🔍", label: "评估中", dot: "#4f8cff" },
  { id: "doing", icon: "🔵", label: "进行中", dot: "#34c7c7" },
  { id: "done", icon: "✅", label: "已完成", dot: "#8cc265" },
  { id: "dropped", icon: "🚫", label: "已放弃", dot: "#e07f87" },
];
export const INSPO_COL_IDS = ["inbox", "eval", "doing", "done", "dropped"];
// 归一化一条灵感（补默认字段，兼容旧 pool/organize/launch）
export function normalizeInspo(it) {
  if (!it) return it;
  let col = it.col;
  if (col === "pool") col = "inbox";
  else if (col === "organize") col = "eval";
  else if (col === "launch") col = "doing";
  else if (col === "done" || col === "dropped") col = col;
  if (!col) col = "inbox";
  return { id: it.id, title: it.title || "", tags: Array.isArray(it.tags) ? it.tags : [], desc: it.desc || "", col: col, created: it.created || "", starred: !!it.starred, records: it.records || {}, launched: String(it.launched || ""), file: it.file || "" };
}
// 新增一条灵感 → 返回新数组（新对象，不可变）
export function inspAdd(list, item, col, today) {
  if (!Array.isArray(list)) list = [];
  if (!col) col = "inbox";
  if (!today) today = todayStr();
  const it = normalizeInspo({ id: item.id || String(Date.now()) + "-" + Math.floor(Math.random() * 1e6), title: item.title, tags: item.tags, desc: item.desc, col: col, created: today, starred: item.starred });
  return [it].concat(list.map(normalizeInspo));
}
// 移动到目标列 → 返回新数组
export function inspMove(list, id, col) {
  if (!Array.isArray(list)) list = [];
  return list.map((it) => (it.id === id ? normalizeInspo(Object.assign({}, it, { col: col })) : normalizeInspo(it)));
}
// 切换星标 → 返回新数组
export function inspStar(list, id, on) {
  if (!Array.isArray(list)) list = [];
  return list.map((it) => (it.id === id ? normalizeInspo(Object.assign({}, it, { starred: !!on })) : normalizeInspo(it)));
}
// 删除一条
export function inspDelete(list, id) {
  if (!Array.isArray(list)) list = [];
  return list.filter((it) => it.id !== id);
}
// 按列分组（保持原顺序，新建在前）
export function inspGroup(list) {
  if (!Array.isArray(list)) list = [];
  const out = { inbox: [], eval: [], doing: [], done: [], dropped: [] };
  for (const it of list.map(normalizeInspo)) { if (out[it.col]) out[it.col].push(it); }
  return out;
}
// 立项载荷：灵感 -> 项目看板（frontmatter + 模板）。纯函数，可单测。
// stages: 项目阶段名数组（非空）；clean: 已清洗项目名；inspId: 溯源用的灵感 id
export function launchProjectPayload(clean, inspId, today, stages) {
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
// 解析标签字符串（逗号/空格分隔）
export function parseInspoTags(str) {
  return String(str || "").split(/[,，\s]+/).map((x) => x.trim()).filter((x) => x);
}
// ---------- 灵感 → vault Markdown（v2-T12：一条灵感一个 .md 文件）----------
// 列 id ↔ 状态中文名（frontmatter 用中文，卡片/列表直接展示）
export const INSPO_COL_CN = { inbox: "收集箱", eval: "评估中", doing: "进行中", done: "已完成", dropped: "已放弃" };
export function inspColFromCn(cn) {
  for (const k in INSPO_COL_CN) if (INSPO_COL_CN[k] === cn) return k;
  return "inbox";
}
// 文件名 slug：去非法字符（中文保留），空白折叠成 -
export function inspSlug(title) {
  const s = String(title || "").trim()
    .replace(/[\\/:*?"<>|#\[\]]+/g, " ")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return s || "灵感";
}
// 可读文件名：标题 + __id 后缀（避免冲突，重载后能从文件名还原 id）
export function inspName(id, title) {
  let s = String(title || "").replace(/[\\/:*?"<>|#^\[\]]/g, " ").replace(/\s+/g, " ").trim().slice(0, 40);
  if (!s) s = String(id || "inspo");
  return s;
}
export function inspIdFromName(name) {
  const m = String(name || "").match(/__([A-Za-z0-9_-]+)$/);
  return m ? m[1] : String(name || "");
}
export const INSPO_STAGES = ["收集阶段", "评估阶段", "进行阶段", "完成情况", "放弃原因"];
// 内建模板：一条灵感的完整 Markdown（frontmatter + 背景/备注 + 各阶段相关记录）
// stageNames 可选：各阶段小节标题（默认 INSPO_STAGES）
export function inspFileContent(it, today, stageNames) {
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
// 解析一个灵感文件 frontmatter → { title, col, tags, created, starred, records }
// stageNames 可选：按配置阶段解析记录小节（默认 INSPO_STAGES）
export function parseInspoFile(text, stageNames) {
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
// 更新已有灵感文件：只重写 frontmatter（标题/状态/标签/星标），正文原样保留；
// 状态变化时在对应阶段小节追加一行记录。返回新全文。
export function inspUpdateFile(text, it, today) {
  if (!today) today = todayStr();
  it = normalizeInspo(it);
  const old = parseInspoFile(text);
  const colCn = INSPO_COL_CN[it.col] || "收集箱";
  const tags = Array.isArray(it.tags) && it.tags.length ? it.tags : (old.tags && old.tags.length ? old.tags : ["灵感"]);
  const fm = [
    "---",
    "标题: " + (it.title || old.title || "（无标题）"),
    "状态: " + colCn,
    "标签: [" + tags.join(", ") + "]",
    "创建日期: " + (it.created || old.created || today),
    "星标: " + (it.starred ? "是" : "否"),
    "---",
    "",
  ].join("\n");
  const m = text.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  let body = m ? text.slice(m[0].length) : text;
  if (old.col !== it.col) body = appendStageRecord(body, colCn, "- " + today + " 移入" + colCn);
  return fm + body;
}
// 在正文「### <阶段>」小节末尾追加一行记录（无该小节则原样返回）
function appendStageRecord(body, stageCn, line) {
  const lines = body.split(/\r?\n/);
  let start = -1;
  for (let i = 0; i < lines.length; i++) if (lines[i].trim() === "### " + stageCn) { start = i; break; }
  if (start < 0) return body;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) if (/^#{2,3}\s/.test(lines[i])) { end = i; break; }
  let insert = start + 1;
  for (let i = end - 1; i > start; i--) { if (lines[i].trim() !== "") { insert = i + 1; break; } }
  lines.splice(insert, 0, line);
  return lines.join("\n");
}
// 灵感文件路径（目录内按 可读标题__id 命名，避开 Obsidian 非法字符）
export function inspFilePath(dir, id, title) {
  const d = (dir || "1-灵感").replace(/\/+$/, "");
  return d + "/" + inspName(id, title) + ".md";
}
