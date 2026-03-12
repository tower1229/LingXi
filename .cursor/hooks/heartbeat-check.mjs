#!/usr/bin/env node
/**
 * 心跳检查脚本：在 sessionStart 时由 session-init 调用。
 * 读 heartbeat-control.json 与 transcript 增量索引，判断是否距上次会话提炼超过 30 分钟；
 * 若是且锁可用，则从 transcript 增量中选出最多 3 个未提炼会话（按 mtime 倒序），
 * 写入 pending_distillation 与锁，返回 trigger_heartbeat 与 candidate_ids。
 * 同时判断是否需要触发 24h 低频诊断（trigger_improvement_diagnosis）。
 * 主 Agent 据此调用后台会话提炼子代理，无需等待。
 *
 * heartbeat.running：首次入队时设为 true；仅会话提炼子代理在收尾步骤会置为 false。
 * 若因锁超时（LOCK_STALE_MINUTES）重新入队，本脚本不再占用锁（running 写为 false），避免子代理未被调用时锁一直为 true。
 */
import fs from "node:fs";
import path from "node:path";

const HEARTBEAT_CONTROL_REL = ".cursor/.lingxi/workspace/heartbeat-control.json";
const HEARTBEAT_TRANSCRIPT_INDEX_REL = ".cursor/.lingxi/workspace/heartbeat-transcript-index.json";
const THRESHOLD_MINUTES = 30;
const LOCK_STALE_MINUTES = 5;
const MAX_CANDIDATES = 3;
const INDEX_VERSION = 1;
const IMPROVEMENT_THRESHOLD_HOURS = 24;

function resolveTranscriptRoot(projectRoot) {
  // 1. 最高优先级：环境变量接管
  const explicitRoot = process.env.CURSOR_AGENT_TRANSCRIPTS_DIR?.trim() || process.env.LINGXI_TRANSCRIPT_ROOT?.trim();
  if (explicitRoot) return explicitRoot;

  const home = process.env.HOME || process.env.USERPROFILE || "";
  if (!home) return "";
  
  // 2. Windows 和 Mac 的兼容预处理替换
  let normalizedProjectPath = path.resolve(projectRoot);
  // 处理 Windows 独有如 "C:\" (会变成 c--xxx)
  if (process.platform === 'win32') {
     normalizedProjectPath = normalizedProjectPath.replace(/^([a-zA-Z]):[\\/]/, "$1--");
  } else {
     normalizedProjectPath = normalizedProjectPath.replace(/^[\\/]+/, "");
  }
  
  const workspaceSlug = normalizedProjectPath.replace(/[\\/]/g, "-").replace(/[^A-Za-z0-9._-]/g, "-");
  const targetDir = path.join(home, ".cursor", "projects", workspaceSlug, "agent-transcripts");
  
  // 3. Fallback 校验：如果严格预测的路径不存在，尝试模糊扫描后缀目录
  if (!fs.existsSync(targetDir)) {
      const baseName = path.basename(projectRoot);
      const projDir = path.join(home, ".cursor", "projects");
      if (fs.existsSync(projDir)) {
          const candidates = fs.readdirSync(projDir, { withFileTypes: true })
            .filter(dir => dir.isDirectory() && dir.name.endsWith(`-${baseName}`))
            .map(dir => path.join(projDir, dir.name, "agent-transcripts"))
            .filter(p => fs.existsSync(p));
          if (candidates.length > 0) return candidates[0]; // 提供容错匹配
      }
  }
  
  return targetDir;
}

function listTranscriptFiles(transcriptRoot) {
  if (!fs.existsSync(transcriptRoot)) return [];
  const stack = [transcriptRoot];
  const files = [];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const abs = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(abs);
        continue;
      }
      if (entry.isFile() && abs.endsWith(".jsonl")) {
        files.push(abs);
      }
    }
  }
  return files;
}

function extractConversationId(filePath) {
  return path.basename(filePath, path.extname(filePath)).trim();
}

function readTranscriptIndex(indexPath) {
  const emptyIndex = { version: INDEX_VERSION, transcripts: {} };
  if (!fs.existsSync(indexPath)) return emptyIndex;
  try {
    const raw = fs.readFileSync(indexPath, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return emptyIndex;
    return {
      version: INDEX_VERSION,
      transcripts:
        parsed.transcripts && typeof parsed.transcripts === "object"
          ? parsed.transcripts
          : {},
    };
  } catch {
    return emptyIndex;
  }
}

function writeTranscriptIndex(indexPath, index) {
  const workspaceDir = path.dirname(indexPath);
  if (!fs.existsSync(workspaceDir)) {
    fs.mkdirSync(workspaceDir, { recursive: true });
  }
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), "utf8");
}

function writeControlFile(controlPath, control) {
  const workspaceDir = path.dirname(controlPath);
  if (!fs.existsSync(workspaceDir)) {
    fs.mkdirSync(workspaceDir, { recursive: true });
  }
  fs.writeFileSync(controlPath, JSON.stringify(control, null, 2), "utf8");
}

function collectTranscriptCandidates({
  transcriptRoot,
  index,
  processedSet,
  currentConversationId,
  nowIso,
}) {
  const files = listTranscriptFiles(transcriptRoot);
  const nextTranscripts = {};
  const changedFiles = [];

  for (const filePath of files) {
    const stat = fs.statSync(filePath, { throwIfNoEntry: false });
    if (!stat || !stat.isFile()) continue;
    const mtimeMs = stat.mtimeMs;
    const conversationId = extractConversationId(filePath);
    const previous = index.transcripts?.[filePath];
    const hasChanged = !previous || mtimeMs > Number(previous.mtimeMs ?? 0);

    nextTranscripts[filePath] = {
      mtimeMs,
      conversationId,
      lastProcessedAt: hasChanged ? nowIso : previous.lastProcessedAt ?? null,
    };

    if (hasChanged) {
      changedFiles.push({ filePath, mtimeMs, conversationId });
    }
  }

  const sortedChanged = changedFiles.sort((a, b) => b.mtimeMs - a.mtimeMs);
  const candidateIds = [];
  const seenConversationIds = new Set();
  for (const item of sortedChanged) {
    const cid = item.conversationId;
    if (!cid || seenConversationIds.has(cid)) continue;
    if (cid === currentConversationId || processedSet.has(cid)) continue;
    seenConversationIds.add(cid);
    candidateIds.push(cid);
    if (candidateIds.length >= MAX_CANDIDATES) break;
  }

  return {
    candidate_ids: candidateIds,
    nextIndex: {
      version: INDEX_VERSION,
      transcripts: nextTranscripts,
    },
  };
}

/**
 * 执行心跳检查。可被 session-init 调用。
 * @param {string} projectRoot - 项目根目录
 * @param {string} [currentConversationId] - 当前会话 id（sessionStart 入参），用于排除当前会话与写 run_id
 * @returns {{ trigger_heartbeat: boolean, candidate_ids: string[], trigger_improvement_diagnosis: boolean }}
 */
export function runHeartbeatCheck(projectRoot, currentConversationId = "") {
  const controlPath = path.join(projectRoot, HEARTBEAT_CONTROL_REL);
  const indexPath = path.join(projectRoot, HEARTBEAT_TRANSCRIPT_INDEX_REL);
  const transcriptRoot = resolveTranscriptRoot(projectRoot);
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const improvementThresholdMs = IMPROVEMENT_THRESHOLD_HOURS * 60 * 60 * 1000;
  const thresholdMs = THRESHOLD_MINUTES * 60 * 1000;
  const lockStaleMs = LOCK_STALE_MINUTES * 60 * 1000;

  let control = {
    last_distillation_completed_at: null,
    heartbeat: { running: false, started_at: null, run_id: null },
    last_improvement_cycle_at: null,
    last_improvement_prompted_session_id: null,
    last_improvement_prompted_at: null,
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

  const lastImprovementAt = control.last_improvement_cycle_at
    ? new Date(control.last_improvement_cycle_at).getTime()
    : 0;
  const triggerImprovementByTime =
    lastImprovementAt === 0 || now - lastImprovementAt > improvementThresholdMs;
  const promptedSessionId = typeof control.last_improvement_prompted_session_id === "string"
    ? control.last_improvement_prompted_session_id
    : "";
  const alreadyPromptedThisSession = !!currentConversationId && promptedSessionId === currentConversationId;
  const triggerImprovementDiagnosis = triggerImprovementByTime && !alreadyPromptedThisSession;

  // 24h 诊断在同一会话内只提示一次，避免主流程每轮重复触发 self-iterate。
  if (triggerImprovementDiagnosis && currentConversationId) {
    const nextControl = {
      ...control,
      last_improvement_prompted_session_id: currentConversationId,
      last_improvement_prompted_at: nowIso,
    };
    try {
      writeControlFile(controlPath, nextControl);
      control = nextControl;
    } catch (err) {
      console.error("[heartbeat-check] write improvement prompt marker failed:", err.message);
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
    return {
      trigger_heartbeat: false,
      candidate_ids: [],
      trigger_improvement_diagnosis: triggerImprovementDiagnosis,
    };
  }

  // 【修复点】：如果是因为锁过期（说明上游任务挂掉未完成），且存在排队中的提炼任务，则先“复活”它们，不触发新的更新
  if (lockStale && control.pending_distillation && Array.isArray(control.pending_distillation.candidate_ids) && control.pending_distillation.candidate_ids.length > 0) {
    const resurrected_ids = control.pending_distillation.candidate_ids;
    // 重新续期锁并返回
    control.heartbeat = { running: true, started_at: nowIso, run_id: currentConversationId || null };
    try {
      writeControlFile(controlPath, control);
    } catch (err) {
      console.error("[heartbeat-check] write resurrected control failed:", err.message);
    }
    return {
      trigger_heartbeat: true,
      candidate_ids: resurrected_ids,
      trigger_improvement_diagnosis: triggerImprovementDiagnosis,
    };
  }

  if (!transcriptRoot || !fs.existsSync(transcriptRoot)) {
    return {
      trigger_heartbeat: false,
      candidate_ids: [],
      trigger_improvement_diagnosis: triggerImprovementDiagnosis,
    };
  }

  const transcriptIndex = readTranscriptIndex(indexPath);
  const { candidate_ids, nextIndex } = collectTranscriptCandidates({
    transcriptRoot,
    index: transcriptIndex,
    processedSet,
    currentConversationId,
    nowIso,
  });

  try {
    writeTranscriptIndex(indexPath, nextIndex);
  } catch (err) {
    console.error("[heartbeat-check] write transcript index failed:", err.message);
    return {
      trigger_heartbeat: false,
      candidate_ids: [],
      trigger_improvement_diagnosis: triggerImprovementDiagnosis,
    };
  }

  if (candidate_ids.length === 0) {
    return {
      trigger_heartbeat: false,
      candidate_ids: [],
      trigger_improvement_diagnosis: triggerImprovementDiagnosis,
    };
  }

  // 若因锁超时重新入队，不再占用 running 锁，避免子代理从未被调用时 running 一直为 true
  const holdLock = !lockStale;
  const next = {
    ...control,
    last_distillation_completed_at: control.last_distillation_completed_at,
    heartbeat: {
      running: holdLock,
      started_at: holdLock ? nowIso : null,
      run_id: holdLock ? (currentConversationId || null) : null,
    },
    pending_distillation: {
      candidate_ids,
      enqueued_at: nowIso,
      enqueued_by: currentConversationId || null,
    },
    processed_conversation_ids: control.processed_conversation_ids,
  };

  try {
    writeControlFile(controlPath, next);
  } catch (err) {
    console.error("[heartbeat-check] write control failed:", err.message);
    return {
      trigger_heartbeat: false,
      candidate_ids: [],
      trigger_improvement_diagnosis: triggerImprovementDiagnosis,
    };
  }

  return {
    trigger_heartbeat: true,
    candidate_ids,
    trigger_improvement_diagnosis: triggerImprovementDiagnosis,
  };
}
