#!/usr/bin/env node
/**
 * 主审计脚本：被 9 类 Hook 调用，从 stdin 读入参，写一条 NDJSON 到 audit.log，返回放行 JSON。
 * 参考：001.task.灵犀审计系统.md §8.2；Cursor Hooks 文档。
 */
import fs from "node:fs";
import path from "node:path";
import { readStdinJson, writeStdoutJson } from "./_hook-utils.mjs";

const AUDIT_REL = ".cursor/.lingxi/workspace/audit.log";
const MAX_PREVIEW = 200;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const TAIL_BYTES = 200 * 1024; // 200KB，完整性检查优先读取的尾部大小
const ROTATE_LOCK_SUFFIX = ".rotate.lock";
const SENSITIVE_KEY_RE = /(password|passwd|pwd|secret|token|api[-_]?key|authorization|cookie|session|credential)/i;
const RETRIEVE_SUCCESS_EVENTS = new Set(["memory.retrieve.performed", "memory.retrieve.skipped"]);
const DEFAULT_HOOK_EVENTS = new Set(["session_end", "stop"]);

const HOOK_TO_EVENT = {
  beforeSubmitPrompt: "before_submit_prompt",
  afterAgentResponse: "after_agent_response",
  preToolUse: "pre_tool_use",
  postToolUse: "post_tool_use",
  postToolUseFailure: "post_tool_use_failure",
  subagentStart: "subagent_start",
  subagentStop: "subagent_stop",
  sessionEnd: "session_end",
  stop: "stop",
};

function truncate(s, max = MAX_PREVIEW) {
  if (typeof s !== "string") return undefined;
  return s.length <= max ? s : s.slice(0, max) + "...";
}

function redactSecrets(value) {
  if (Array.isArray(value)) return value.map((item) => redactSecrets(item));
  if (value && typeof value === "object") {
    const next = {};
    for (const [key, val] of Object.entries(value)) {
      next[key] = SENSITIVE_KEY_RE.test(key) ? "[REDACTED]" : redactSecrets(val);
    }
    return next;
  }
  return value;
}

function buildToolInputPreview(toolInput) {
  if (toolInput == null) return undefined;
  try {
    const sanitized = redactSecrets(toolInput);
    return truncate(JSON.stringify(sanitized));
  } catch {
    return truncate(String(toolInput));
  }
}

/**
 * 获取系统当前时间戳（ISO 8601格式，UTC）
 */
function getSystemTimestamp() {
  // 使用系统API获取当前时间，转换为ISO 8601格式
  return new Date().toISOString();
}

function buildPayload(input) {
  const ts = getSystemTimestamp();
  const conversation_id = input.conversation_id ?? "";
  const generation_id = input.generation_id ?? "";
  const hookName = input.hook_event_name ?? "";
  const event = HOOK_TO_EVENT[hookName] ?? "unknown";

  const base = { ts, event, conversation_id, generation_id };

  switch (event) {
    case "before_submit_prompt":
      return { ...base, prompt_preview: truncate(input.prompt) };
    case "after_agent_response":
      return {
        ...base,
        reply_preview: truncate(input.text),
        duration_ms: input.duration_ms,
      };
    case "pre_tool_use":
      return {
        ...base,
        tool_name: input.tool_name,
        tool_use_id: input.tool_use_id,
        cwd: input.cwd,
        tool_input_preview: buildToolInputPreview(input.tool_input),
      };
    case "post_tool_use":
      return {
        ...base,
        tool_name: input.tool_name,
        tool_use_id: input.tool_use_id,
        duration_ms: input.duration,
        result_preview: truncate(input.tool_output),
      };
    case "post_tool_use_failure":
      return {
        ...base,
        tool_name: input.tool_name,
        tool_use_id: input.tool_use_id,
        duration_ms: input.duration,
        error_preview: truncate(input.error_message),
      };
    case "subagent_start":
      return { ...base, agent_name: input.subagent_type ?? input.subagent_name };
    case "subagent_stop":
      return {
        ...base,
        agent_name: input.subagent_type ?? input.subagent_name,
        duration_ms: input.duration,
      };
    case "session_end":
    case "stop":
    default:
      return base;
  }
}

function isAuditDebugEnabled() {
  const v = (process.env.LINGXI_AUDIT_DEBUG || "").trim();
  return v === "1" || v.toLowerCase() === "true";
}

function shouldAppendHookEvent(eventName, debugEnabled) {
  if (!eventName || eventName === "unknown") return false;
  if (debugEnabled) return true;
  return DEFAULT_HOOK_EVENTS.has(eventName);
}

function safeJsonParse(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

/**
 * 读取 audit 文件最后 TAIL_BYTES 字节，解析为完整行得到 rows；避免全量读大文件。
 */
function readAuditRowsTail(auditPath) {
  const stats = fs.statSync(auditPath, { throwIfNoEntry: false });
  if (!stats || stats.size === 0) return [];
  const size = stats.size;
  const toRead = Math.min(size, TAIL_BYTES);
  const start = Math.max(0, size - toRead);
  const fd = fs.openSync(auditPath, "r");
  try {
    const buffer = Buffer.alloc(toRead);
    fs.readSync(fd, buffer, 0, toRead, start);
    let str = buffer.toString("utf8");
    if (start > 0 && str.includes("\n")) {
      str = str.slice(str.indexOf("\n") + 1);
    }
    return str
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => safeJsonParse(line))
      .filter(Boolean);
  } finally {
    fs.closeSync(fd);
  }
}

/**
 * 全量读取 audit 文件并解析为 rows（fallback）。
 */
function readAuditRowsFull(auditPath) {
  const content = fs.readFileSync(auditPath, { encoding: "utf8" });
  return content
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => safeJsonParse(line))
    .filter(Boolean);
}

function appendAuditLine(auditPath, payload) {
  const line = JSON.stringify(payload) + "\n";
  fs.appendFileSync(auditPath, line, { encoding: "utf8", flag: "a" });
}

function maybeAppendRetrieveIntegrityEvent(auditPath, input) {
  if (!isAuditDebugEnabled()) return;
  if (input.hook_event_name !== "afterAgentResponse") return;
  const conversation_id = input.conversation_id ?? "";
  const generation_id = input.generation_id ?? "";
  if (!conversation_id && !generation_id) return;

  let rows = readAuditRowsTail(auditPath);
  const matchTurn = (row) =>
    (row.conversation_id ?? "") === conversation_id && (row.generation_id ?? "") === generation_id;
  let turnRows = rows.filter(matchTurn);
  if (turnRows.length === 0) {
    rows = readAuditRowsFull(auditPath);
    turnRows = rows.filter(matchTurn);
  }
  if (turnRows.length === 0) return;

  const hasUserSubmit = turnRows.some((row) => row.event === "before_submit_prompt");
  if (!hasUserSubmit) return;

  const beforeSubmitRow = turnRows.find((row) => row.event === "before_submit_prompt");
  const turnStartTs = beforeSubmitRow ? new Date(beforeSubmitRow.ts).getTime() : null;
  const turnEndTs = Math.max(...turnRows.map((r) => new Date(r.ts).getTime()));
  if (turnStartTs == null) return;

  const hasRetrieveInWindow = (r) => {
    if (!RETRIEVE_SUCCESS_EVENTS.has(r.event)) return false;
    if ((r.conversation_id ?? "") !== conversation_id) return false;
    const t = new Date(r.ts).getTime();
    if (t < turnStartTs || t > turnEndTs) return false;
    const rGen = r.generation_id ?? "";
    return rGen === "" || rGen === generation_id;
  };
  const hasRetrieve = rows.some(hasRetrieveInWindow);
  const alreadyMarkedMissing = turnRows.some((row) => row.event === "memory.retrieve.missing");
  if (hasRetrieve || alreadyMarkedMissing) {
    const hasGrepInTurn = rows.some(
      (r) =>
        r.event === "pre_tool_use" &&
        r.tool_name === "Grep" &&
        (r.conversation_id ?? "") === conversation_id &&
        new Date(r.ts).getTime() >= turnStartTs &&
        new Date(r.ts).getTime() <= turnEndTs &&
        ((r.generation_id ?? "") === "" || r.generation_id === generation_id)
    );
    appendAuditLine(auditPath, {
      ts: getSystemTimestamp(),
      event: "memory.retrieve.keyword_path_verified",
      conversation_id,
      generation_id,
      verified: hasGrepInTurn,
    });
    return;
  }

  appendAuditLine(auditPath, {
    ts: getSystemTimestamp(),
    event: "memory.retrieve.missing",
    conversation_id,
    generation_id,
    reason: "No memory.retrieve.performed or memory.retrieve.skipped found for this turn",
    expected_events: ["memory.retrieve.performed", "memory.retrieve.skipped"],
  });
}

function getAllowOutput(hookName) {
  if (hookName === "beforeSubmitPrompt") return { continue: true };
  if (hookName === "preToolUse") return { decision: "allow" };
  if (hookName === "subagentStart") return { decision: "allow" };
  return {};
}

/**
 * 轮转审计日志文件：当文件超过大小限制时，删除总条数一半的旧日志
 */
function acquireRotateLock(lockPath) {
  try {
    return fs.openSync(lockPath, "wx");
  } catch (err) {
    if (err?.code === "EEXIST") return null;
    throw err;
  }
}

function releaseRotateLock(lockFd, lockPath) {
  if (typeof lockFd === "number") {
    try {
      fs.closeSync(lockFd);
    } catch {}
  }
  try {
    fs.unlinkSync(lockPath);
  } catch {}
}

function rotateAuditFile(auditPath) {
  const lockPath = `${auditPath}${ROTATE_LOCK_SUFFIX}`;
  const lockFd = acquireRotateLock(lockPath);
  if (lockFd === null) {
    return;
  }

  try {
    const stats = fs.statSync(auditPath, { throwIfNoEntry: false });
    if (!stats || stats.size < MAX_FILE_SIZE) {
      return; // 无需轮转
    }

    // 读取所有日志行
    const content = fs.readFileSync(auditPath, { encoding: "utf8" });
    const lines = content.split("\n").filter((line) => line.trim().length > 0);

    // 计算需要保留的行数（保留后一半）
    const totalLines = lines.length;
    const keepLines = Math.ceil(totalLines / 2); // 保留后一半，向上取整

    if (keepLines >= totalLines) {
      // 如果保留行数等于总行数，说明只有1行或0行，无需清理
      return;
    }

    // 保留后一半的行
    const linesToKeep = lines.slice(-keepLines);
    const newContent = linesToKeep.join("\n") + "\n";

    // 写回文件（使用唯一临时文件避免并发覆盖）
    const tempPath = `${auditPath}.${process.pid}.${Date.now()}.${Math.random()
      .toString(16)
      .slice(2)}.tmp`;
    fs.writeFileSync(tempPath, newContent, { encoding: "utf8" });
    fs.renameSync(tempPath, auditPath);
  } catch (err) {
    // 轮转失败不影响主流程，静默降级
    console.error("[lingxi-audit] Rotation failed:", err.message);
  } finally {
    releaseRotateLock(lockFd, lockPath);
  }
}

async function main() {
  const input = await readStdinJson();
  const projectRoot = process.env.CURSOR_PROJECT_DIR || process.cwd();
  let auditPath = path.join(projectRoot, AUDIT_REL);
  const workspaceDir = path.dirname(auditPath);

  // 确保目录存在
  if (!fs.existsSync(workspaceDir)) {
    fs.mkdirSync(workspaceDir, { recursive: true });
  }

  // 检查文件大小并轮转（如果存在且超过限制）
  if (fs.existsSync(auditPath)) {
    rotateAuditFile(auditPath);
  }

  const payload = buildPayload(input);
  const debugEnabled = isAuditDebugEnabled();
  if (shouldAppendHookEvent(payload.event, debugEnabled)) {
    appendAuditLine(auditPath, payload);
    maybeAppendRetrieveIntegrityEvent(auditPath, input);
  }

  const out = getAllowOutput(input.hook_event_name);
  writeStdoutJson(out);
}

main().catch((err) => {
  console.error("[lingxi-audit]", err);
  writeStdoutJson({ continue: true, decision: "allow" });
});
