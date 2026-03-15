#!/usr/bin/env node
/**
 * WAL_BUFFER.md 统一解析与写入。与 references/wal-schema.md 契约一致。
 */
import fs from "node:fs";
import path from "node:path";

const WAL_BUFFER_REL = ".lingxi/os/WAL_BUFFER.md";
const DEFAULT_WAL_REL = "plugin/skills/workspace-bootstrap/references/WAL_BUFFER.default.md";

const LINE_REGEX = /^- \[([ x])\] `\[([^\]]+)\]`:?\s*(.+)$/;

/**
 * 解析单行是否为 WAL 任务行；若是则返回 { checked, type, payload }，否则返回 null。
 * @param {string} line
 * @returns {{ checked: boolean, type: string, payload: object } | null}
 */
export function parseWalLine(line) {
  const trimmed = line.trim();
  const m = trimmed.match(LINE_REGEX);
  if (!m) return null;
  const [, checkChar, type, jsonStr] = m;
  const checked = checkChar === "x";
  let payload = {};
  try {
    payload = JSON.parse(jsonStr);
  } catch {
    return null;
  }
  return { checked, type, payload };
}

/**
 * 解析 WAL 全文，返回所有任务行（含已勾选与未勾选）。
 * @param {string} content - WAL 文件内容
 * @returns {{ type: string, payload: object, checked: boolean }[]}
 */
export function parseWalLines(content) {
  const results = [];
  for (const line of content.split("\n")) {
    const parsed = parseWalLine(line);
    if (parsed) results.push({ type: parsed.type, payload: parsed.payload, checked: parsed.checked });
  }
  return results;
}

/**
 * 返回未勾选任务列表。
 * @param {string} content - WAL 文件内容
 * @returns {{ type: string, payload: object }[]}
 */
export function getPendingTasks(content) {
  return parseWalLines(content).filter((t) => !t.checked).map(({ type, payload }) => ({ type, payload }));
}

/**
 * 序列化单行为 WAL 行字符串。
 * @param {string} type - 任务类型，如 SESSION_DISTILL, SELF_ITERATE
 * @param {object} payload - 可 JSON 序列化的 payload
 * @param {boolean} [checked=false]
 * @returns {string}
 */
export function formatWalLine(type, payload, checked = false) {
  const check = checked ? "x" : " ";
  return `- [${check}] \`[${type}]\`: ${JSON.stringify(payload)}`;
}


/**
 * 向 WAL 文件追加一条未勾选任务。若文件不存在则从 default 骨架创建。
 * @param {string} projectRoot - 项目根目录
 * @param {string} type - 任务类型
 * @param {object} payload - payload 对象
 */
export function appendWalTask(projectRoot, type, payload) {
  const walPath = path.join(projectRoot, WAL_BUFFER_REL);
  const defaultPath = path.join(projectRoot, DEFAULT_WAL_REL);
  const dir = path.dirname(walPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let content = "";
  if (fs.existsSync(walPath)) {
    content = fs.readFileSync(walPath, "utf8");
  } else if (fs.existsSync(defaultPath)) {
    content = fs.readFileSync(defaultPath, "utf8");
  } else {
    content = "# WAL Buffer\n\n## [PENDING OPERATIONS]\n\n";
  }

  const newLine = formatWalLine(type, payload, false);
  const newContent = content.trimEnd() + "\n" + newLine + "\n";
  fs.writeFileSync(walPath, newContent, "utf8");
}

/**
 * 将 WAL 中指定行索引的任务勾选为已完成（仅修改内存中的 lines，不写文件）。
 * 用于在回调中先修改行再一次性写回。
 * @param {string[]} lines - 按行拆分的 WAL 内容
 * @param {number} lineIndex - 行索引（0-based）
 * @returns {boolean} 是否成功替换
 */
export function markWalLineChecked(lines, lineIndex) {
  const line = lines[lineIndex];
  const parsed = parseWalLine(line);
  if (!parsed || parsed.checked) return false;
  lines[lineIndex] = formatWalLine(parsed.type, parsed.payload, true);
  return true;
}
