#!/usr/bin/env node
/**
 * Unified audit appender for memory events.
 * Accepts one JSON argument and appends one NDJSON line into audit.log.
 * Non-compatible mode: only v2 memory retrieve events are accepted.
 */
import fs from "node:fs";
import path from "node:path";

const AUDIT_REL = ".cursor/.lingxi/workspace/audit.log";
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ROTATE_LOCK_SUFFIX = ".rotate.lock";
const MEMORY_WRITE_EVENTS = new Set([
  "memory_note_created",
  "memory_note_updated",
  "memory_note_deleted",
  "memory_index_updated",
]);
const MEMORY_RETRIEVE_EVENTS = new Set([
  "memory.retrieve.performed",
  "memory.retrieve.skipped",
  "memory.retrieve.missing",
  "memory.retrieve.invalid",
]);

/**
 * 获取系统当前时间戳（ISO 8601格式，UTC）
 */
function getSystemTimestamp() {
  return new Date().toISOString();
}

function isString(v) {
  return typeof v === "string";
}

function isBool(v) {
  return typeof v === "boolean";
}

function isNumber(v) {
  return typeof v === "number" && Number.isFinite(v);
}

function isArray(v) {
  return Array.isArray(v);
}

function buildBasePayload(input) {
  return {
    ts: getSystemTimestamp(),
    event: input.event,
    conversation_id: input.conversation_id ?? "",
    generation_id: input.generation_id ?? "",
  };
}

function invalidPayload(base, reason, invalidEvent) {
  return {
    ...base,
    event: "memory.retrieve.invalid",
    reason,
    ...(invalidEvent ? { invalid_event: invalidEvent } : {}),
  };
}

function validateMemoryWriteEvent(input, base) {
  const payload = {
    ...base,
    ...(input.note_id != null && { note_id: input.note_id }),
    ...(input.operation != null && { operation: input.operation }),
    ...(input.source != null && { source: input.source }),
    ...(input.file != null && { file: input.file }),
    ...(input.reason != null && { reason: input.reason }),
  };

  if (input.event === "memory_index_updated") return payload;

  if (!isString(input.note_id) || input.note_id.length === 0) {
    return invalidPayload(base, "memory write event requires note_id", input.event);
  }
  if (!isString(input.operation) || input.operation.length === 0) {
    return invalidPayload(base, "memory write event requires operation", input.event);
  }
  if (!isString(input.file) || input.file.length === 0) {
    return invalidPayload(base, "memory write event requires file", input.event);
  }
  if (input.event !== "memory_note_deleted") {
    if (!isString(input.source) || input.source.length === 0) {
      return invalidPayload(base, "memory create/update requires source", input.event);
    }
  }
  return payload;
}

function validateMemoryRetrieveEvent(input, base) {
  if (input.event === "memory.retrieve.performed") {
    if (!isString(input.query)) return invalidPayload(base, "performed requires query", input.event);
    if (!isArray(input.hits)) return invalidPayload(base, "performed requires hits[]", input.event);
    if (!isArray(input.adopted)) return invalidPayload(base, "performed requires adopted[]", input.event);
    if (!isArray(input.rejected)) return invalidPayload(base, "performed requires rejected[]", input.event);
    if (!isBool(input.semantic_called)) return invalidPayload(base, "performed requires semantic_called(boolean)", input.event);
    if (!isBool(input.keyword_called)) return invalidPayload(base, "performed requires keyword_called(boolean)", input.event);
    if (!isNumber(input.candidate_read_count) || input.candidate_read_count < 0) {
      return invalidPayload(base, "performed requires candidate_read_count(number>=0)", input.event);
    }
    if (!isString(input.decision) || input.decision.length === 0) {
      return invalidPayload(base, "performed requires decision", input.event);
    }
    return {
      ...base,
      query: input.query,
      hits: input.hits,
      adopted: input.adopted,
      rejected: input.rejected,
      semantic_called: input.semantic_called,
      keyword_called: input.keyword_called,
      candidate_read_count: input.candidate_read_count,
      decision: input.decision,
    };
  }

  if (input.event === "memory.retrieve.skipped") {
    if (!isString(input.query)) return invalidPayload(base, "skipped requires query", input.event);
    if (!isString(input.reason) || input.reason.length === 0) {
      return invalidPayload(base, "skipped requires reason", input.event);
    }
    return {
      ...base,
      query: input.query,
      reason: input.reason,
      ...(isBool(input.semantic_called) ? { semantic_called: input.semantic_called } : {}),
      ...(isBool(input.keyword_called) ? { keyword_called: input.keyword_called } : {}),
    };
  }

  if (input.event === "memory.retrieve.missing") {
    if (!isString(input.reason) || input.reason.length === 0) {
      return invalidPayload(base, "missing requires reason", input.event);
    }
    return {
      ...base,
      reason: input.reason,
      ...(isArray(input.expected_events) ? { expected_events: input.expected_events } : {}),
    };
  }

  if (input.event === "memory.retrieve.invalid") {
    if (!isString(input.reason) || input.reason.length === 0) {
      return invalidPayload(base, "invalid requires reason", input.event);
    }
    return {
      ...base,
      reason: input.reason,
      ...(isString(input.invalid_event) ? { invalid_event: input.invalid_event } : {}),
    };
  }

  return invalidPayload(base, "unknown memory.retrieve event", input.event);
}

function buildPayload(input) {
  const base = buildBasePayload(input);
  if (!isString(input.event) || input.event.length === 0) {
    return invalidPayload(base, "event is required", "");
  }

  if (MEMORY_WRITE_EVENTS.has(input.event)) {
    return validateMemoryWriteEvent(input, base);
  }
  if (MEMORY_RETRIEVE_EVENTS.has(input.event)) {
    return validateMemoryRetrieveEvent(input, base);
  }
  return invalidPayload(base, "unsupported event for append-memory-audit", input.event);
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
    console.error("[append-memory-audit] Rotation failed:", err.message);
  } finally {
    releaseRotateLock(lockFd, lockPath);
  }
}

function main() {
  const raw = process.argv[2];
  if (!raw) {
    console.error("Usage: node append-memory-audit.mjs '<JSON>'");
    process.exit(1);
  }
  let input;
  try {
    input = JSON.parse(raw);
  } catch (err) {
    console.error("[append-memory-audit] invalid JSON:", err.message);
    process.exit(1);
  }
  const projectRoot = process.env.CURSOR_PROJECT_DIR || process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const auditPath = path.join(projectRoot, AUDIT_REL);
  const workspaceDir = path.dirname(auditPath);
  const payload = buildPayload(input);

  // 确保目录存在
  if (!fs.existsSync(workspaceDir)) {
    fs.mkdirSync(workspaceDir, { recursive: true });
  }

  // 检查文件大小并轮转（如果存在且超过限制）
  if (fs.existsSync(auditPath)) {
    rotateAuditFile(auditPath);
  }

  const line = JSON.stringify(payload) + "\n";
  fs.appendFileSync(auditPath, line, { encoding: "utf8", flag: "a" });
}

main();
