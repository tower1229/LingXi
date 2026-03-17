#!/usr/bin/env node
/**
 * WAL_BUFFER.md 统一解析与写入。与 references/wal-schema.md 契约一致。
 */
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const WAL_BUFFER_REL = ".lingxi/os/WAL_BUFFER.md";
const DEFAULT_WAL_CANDIDATES = [
  ".cursor/skills/workspace-bootstrap/references/WAL_BUFFER.default.md",
  ".claude/skills/workspace-bootstrap/references/WAL_BUFFER.default.md",
];
const LOCK_FILE_REL = ".lingxi/os/.wal.lock";

const LINE_REGEX = /^- \[([ x])\] `\[([^\]]+)\]`:?\s*(.+)$/;

/**
 * 简单的文件锁实现（基于 flock 思想）。
 * 获取锁时尝试写入锁文件，成功返回 true，超时返回 false。
 * 跨平台兼容：处理 Windows 和 POSIX 差异
 */
export function acquireLock(lockPath, timeoutMs = 5000, intervalMs = 50) {
  const start = Date.now();
  const isWindows = process.platform === "win32";

  while (Date.now() - start < timeoutMs) {
    try {
      // 使用 'wx' flag: O_CREAT | O_EXCL，原子创建，跨平台兼容
      // Windows 上 'wx' 会创建新文件，若存在则失败
      fs.writeFileSync(lockPath, String(process.pid), { flag: "wx" });
      return true;
    } catch (err) {
      if (err.code === "EEXIST") {
        // 检查锁文件是否过期（超过 30 秒）
        try {
          const stat = fs.statSync(lockPath);
          const ageMs = Date.now() - stat.mtimeMs;
          if (ageMs > 30000) {
            // 锁过期，强制删除后重试
            fs.unlinkSync(lockPath);
            continue;
          }
        } catch {
          // 文件可能被删除，重试
        }
        // 等待后重试 - 使用更短的spin循环减少CPU占用
        const wait = Math.min(intervalMs * (1 + Math.random()), 200);
        const waitUntil = Date.now() + wait;
        while (Date.now() < waitUntil) {
          // 减少spin次数，从1000降至10
          for (let i = 0; i < 10; i++) { /* minimal spin to reduce CPU */ }
        }
        continue;
      }
      throw err;
    }
  }
  return false;
}

/**
 * 释放锁文件。
 */
export function releaseLock(lockPath) {
  try {
    if (fs.existsSync(lockPath)) {
      fs.unlinkSync(lockPath);
    }
  } catch {
    // ignore
  }
}

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
 * 使用文件锁防止并发写入冲突。
 * @param {string} projectRoot - 项目根目录
 * @param {string} type - 任务类型
 * @param {object} payload - payload 对象
 * @returns {boolean} 是否成功写入
 */
export function appendWalTask(projectRoot, type, payload) {
  const walPath = path.join(projectRoot, WAL_BUFFER_REL);
  const lockPath = path.join(projectRoot, LOCK_FILE_REL);
  const defaultPath = DEFAULT_WAL_CANDIDATES
    .map((rel) => path.join(projectRoot, rel))
    .find((candidate) => fs.existsSync(candidate));
  const dir = path.dirname(walPath);

  if (!acquireLock(lockPath)) {
    console.error("[wal-utils] failed to acquire lock for appendWalTask");
    return false;
  }

  try {
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
    return true;
  } catch (err) {
    console.error("[wal-utils] appendWalTask error:", err.message);
    return false;
  } finally {
    releaseLock(lockPath);
  }
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

/**
 * 带锁的 WAL 修改与写入。用于 heartbeat-check 的消费阶段。
 * @param {string} projectRoot - 项目根目录
 * @param {function} modifyFn - 修改函数，接收 WAL lines 数组，返回是否修改了内容
 * @returns {boolean} 是否成功完成
 */
export function modifyWalWithLock(projectRoot, modifyFn) {
  const walPath = path.join(projectRoot, WAL_BUFFER_REL);
  const lockPath = path.join(projectRoot, LOCK_FILE_REL);

  if (!fs.existsSync(walPath)) {
    return false;
  }

  if (!acquireLock(lockPath)) {
    console.error("[wal-utils] failed to acquire lock for modifyWalWithLock");
    return false;
  }

  try {
    const content = fs.readFileSync(walPath, "utf8");
    const lines = content.split("\n");
    const modified = modifyFn(lines);
    if (modified) {
      fs.writeFileSync(walPath, lines.join("\n"), "utf8");
    }
    return true;
  } catch (err) {
    console.error("[wal-utils] modifyWalWithLock error:", err.message);
    return false;
  } finally {
    releaseLock(lockPath);
  }
}
