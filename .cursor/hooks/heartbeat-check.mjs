#!/usr/bin/env node
/**
 * 心跳检查脚本：在 sessionStart 时由 session-init 调用。
 * 读 heartbeat-control.json 与 audit.log，判断是否距上次会话提炼超过 30 分钟；
 * 若是且锁可用，则选出最多 3 个已完结、未提炼的会话（按 session_end 倒序），写入 pending_distillation 与锁，返回 trigger_heartbeat 与 candidate_ids。
 * 主 Agent 据此调用后台会话提炼子代理，无需等待。
 *
 * heartbeat.running：首次入队时设为 true；仅会话提炼子代理在收尾步骤会置为 false。
 * 若因锁超时（LOCK_STALE_MINUTES）重新入队，本脚本不再占用锁（running 写为 false），避免子代理未被调用时锁一直为 true。
 */
import fs from "node:fs";
import path from "node:path";

const HEARTBEAT_CONTROL_REL = ".cursor/.lingxi/workspace/heartbeat-control.json";
const AUDIT_REL = ".cursor/.lingxi/workspace/audit.log";
const TAIL_BYTES = 200 * 1024; // 200KB，与 lingxi-audit 一致
const THRESHOLD_MINUTES = 30;
const LOCK_STALE_MINUTES = 5;
const MAX_CANDIDATES = 3;
const PROCESSED_MAX = 500;

function safeJsonParse(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

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

function readAuditRowsFull(auditPath) {
  const content = fs.readFileSync(auditPath, { encoding: "utf8" });
  return content
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => safeJsonParse(line))
    .filter(Boolean);
}

/**
 * 从 audit 中找出已 session_end 的会话，排除已处理与当前会话，按 session_end 时间倒序取最多 MAX_CANDIDATES 个 conversation_id。
 */
function getCandidateIds(auditPath, processedSet, currentConversationId) {
  let rows = readAuditRowsTail(auditPath);
  const sessionEndRows = rows.filter((r) => (r.event ?? "") === "session_end");
  if (sessionEndRows.length === 0) {
    rows = readAuditRowsFull(auditPath);
    const sessionEndRowsFull = rows.filter((r) => (r.event ?? "") === "session_end");
    if (sessionEndRowsFull.length === 0) return [];
    // 按 ts 倒序，去重 conversation_id（同一会话可能多条 session_end 取最新）
    const byCid = new Map();
    for (const r of sessionEndRowsFull) {
      const cid = (r.conversation_id ?? "").trim();
      if (!cid || cid === currentConversationId || processedSet.has(cid)) continue;
      const ts = new Date(r.ts).getTime();
      if (!byCid.has(cid) || ts > byCid.get(cid)) byCid.set(cid, ts);
    }
    return [...byCid.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_CANDIDATES)
      .map(([cid]) => cid);
  }
  const byCid = new Map();
  for (const r of sessionEndRows) {
    const cid = (r.conversation_id ?? "").trim();
    if (!cid || cid === currentConversationId || processedSet.has(cid)) continue;
    const ts = new Date(r.ts).getTime();
    if (!byCid.has(cid) || ts > byCid.get(cid)) byCid.set(cid, ts);
  }
  return [...byCid.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_CANDIDATES)
    .map(([cid]) => cid);
}

/**
 * 执行心跳检查。可被 session-init 调用。
 * @param {string} projectRoot - 项目根目录
 * @param {string} [currentConversationId] - 当前会话 id（sessionStart 入参），用于排除当前会话与写 run_id
 * @returns {{ trigger_heartbeat: boolean, candidate_ids: string[] }}
 */
export function runHeartbeatCheck(projectRoot, currentConversationId = "") {
  const controlPath = path.join(projectRoot, HEARTBEAT_CONTROL_REL);
  const auditPath = path.join(projectRoot, AUDIT_REL);
  const now = Date.now();
  const thresholdMs = THRESHOLD_MINUTES * 60 * 1000;
  const lockStaleMs = LOCK_STALE_MINUTES * 60 * 1000;

  let control = {
    last_distillation_completed_at: null,
    heartbeat: { running: false, started_at: null, run_id: null },
    pending_distillation: null,
    processed_conversation_ids: [],
  };
  if (fs.existsSync(controlPath)) {
    try {
      const raw = fs.readFileSync(controlPath, "utf8");
      control = { ...control, ...JSON.parse(raw) };
    } catch (err) {
      console.error("[heartbeat-check] read control failed:", err.message);
    }
  }

  const processedSet = new Set(
    Array.isArray(control.processed_conversation_ids) ? control.processed_conversation_ids : []
  );
  const lastAt = control.last_distillation_completed_at
    ? new Date(control.last_distillation_completed_at).getTime()
    : 0;
  const shouldTriggerByTime = lastAt === 0 || now - lastAt > thresholdMs;

  const hb = control.heartbeat ?? {};
  const running = !!hb.running;
  const startedAt = hb.started_at ? new Date(hb.started_at).getTime() : 0;
  const lockStale = startedAt > 0 && now - startedAt > lockStaleMs;
  const canAcquireLock = !running || lockStale;

  if (!shouldTriggerByTime || !canAcquireLock) {
    return { trigger_heartbeat: false, candidate_ids: [] };
  }

  if (!fs.existsSync(auditPath)) {
    return { trigger_heartbeat: false, candidate_ids: [] };
  }

  const candidate_ids = getCandidateIds(auditPath, processedSet, currentConversationId);
  if (candidate_ids.length === 0) {
    return { trigger_heartbeat: false, candidate_ids: [] };
  }

  // 若因锁超时重新入队，不再占用 running 锁，避免子代理从未被调用时 running 一直为 true
  const holdLock = !lockStale;
  const next = {
    ...control,
    last_distillation_completed_at: control.last_distillation_completed_at,
    heartbeat: {
      running: holdLock,
      started_at: holdLock ? new Date(now).toISOString() : null,
      run_id: holdLock ? (currentConversationId || null) : null,
    },
    pending_distillation: {
      candidate_ids,
      enqueued_at: new Date(now).toISOString(),
      enqueued_by: currentConversationId || null,
    },
    processed_conversation_ids: control.processed_conversation_ids,
  };

  try {
    const workspaceDir = path.dirname(controlPath);
    if (!fs.existsSync(workspaceDir)) {
      fs.mkdirSync(workspaceDir, { recursive: true });
    }
    fs.writeFileSync(controlPath, JSON.stringify(next, null, 2), "utf8");
  } catch (err) {
    console.error("[heartbeat-check] write control failed:", err.message);
    return { trigger_heartbeat: false, candidate_ids: [] };
  }

  return { trigger_heartbeat: true, candidate_ids };
}
