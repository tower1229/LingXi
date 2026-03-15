#!/usr/bin/env node
/**
 * AgentOS Watchdog 守护进程：由 beforeSubmitPrompt hook（heartbeat-trigger.mjs）调用。
 * 职责：
 * 1. 轮询 WAL_BUFFER.md，如果发现 PENDING OPERATIONS，则静默唤起对应的 Subagent 消费。
 * 2. 检查会话提炼心跳（30分钟）和自我迭代心跳（24小时），若触发则向 WAL_BUFFER.md 写入任务。
 */
import fs from "node:fs";
import path from "node:path";
import { exec } from "node:child_process";
import { appendWalTask, parseWalLine, markWalLineChecked, acquireLock, releaseLock } from "./wal-utils.mjs";
import { getRegisteredApps } from "../heartbeat-plugins/registry.mjs";

const WAL_BUFFER_REL = ".lingxi/os/WAL_BUFFER.md";
const HEARTBEAT_CONTROL_REL = ".lingxi/os/heartbeat-control.json";
const HEARTBEAT_TRANSCRIPT_INDEX_REL = ".lingxi/os/heartbeat-transcript-index.json";
const THRESHOLD_MINUTES = 30;
const LOCK_STALE_MINUTES = 5;
const MAX_CANDIDATES = 3;
const INDEX_VERSION = 1;
const IMPROVEMENT_THRESHOLD_HOURS = 24;

function resolveTranscriptRoot(projectRoot) {
  const explicitRoot = process.env.CURSOR_AGENT_TRANSCRIPTS_DIR?.trim() || process.env.LINGXI_TRANSCRIPT_ROOT?.trim();
  if (explicitRoot) return explicitRoot;

  const home = process.env.HOME || process.env.USERPROFILE || "";
  if (!home) return "";

  let normalizedProjectPath = path.resolve(projectRoot);
  if (process.platform === "win32") {
    normalizedProjectPath = normalizedProjectPath.replace(/^([a-zA-Z]):[\\/]/, "$1--");
  } else {
    normalizedProjectPath = normalizedProjectPath.replace(/^[\\/]+/, "");
  }

  const workspaceSlug = normalizedProjectPath.replace(/[\\/]/g, "-").replace(/[^A-Za-z0-9._-]/g, "-");
  const targetDir = path.join(home, ".cursor", "projects", workspaceSlug, "agent-transcripts");

  if (!fs.existsSync(targetDir)) {
    const baseName = path.basename(projectRoot);
    const projDir = path.join(home, ".cursor", "projects");
    if (fs.existsSync(projDir)) {
      const candidates = fs.readdirSync(projDir, { withFileTypes: true })
        .filter((dir) => dir.isDirectory() && dir.name.endsWith(`-${baseName}`))
        .map((dir) => path.join(projDir, dir.name, "agent-transcripts"))
        .filter((p) => fs.existsSync(p));
      if (candidates.length > 0) return candidates[0];
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
      transcripts: parsed.transcripts && typeof parsed.transcripts === "object" ? parsed.transcripts : {},
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

function readControl(controlPath) {
  const defaultControl = {
    last_distillation_completed_at: null,
    heartbeat: { running: false, started_at: null, run_id: null },
    last_improvement_cycle_at: null,
    last_improvement_prompted_session_id: null,
    last_improvement_prompted_at: null,
    processed_conversation_ids: [],
  };
  if (!fs.existsSync(controlPath)) return defaultControl;
  try {
    const raw = fs.readFileSync(controlPath, "utf8");
    return { ...defaultControl, ...JSON.parse(raw) };
  } catch (err) {
    console.error("[heartbeat-check] read control failed:", err.message);
    return defaultControl;
  }
}

/**
 * 为 30min 插件提供：时间/锁/transcript 检查 + 收集候选，返回 { candidate_ids, nextIndex, controlPatch } 或 null。
 */
function getTranscriptCandidates(projectRoot, control, now, nowIso, conversationId, controlPath, indexPath) {
  const transcriptRoot = resolveTranscriptRoot(projectRoot);
  const thresholdMs = THRESHOLD_MINUTES * 60 * 1000;
  const lockStaleMs = LOCK_STALE_MINUTES * 60 * 1000;

  const lastAt = control.last_distillation_completed_at
    ? new Date(control.last_distillation_completed_at).getTime()
    : 0;
  const shouldTriggerByTime = lastAt === 0 || now - lastAt > thresholdMs;
  const hb = control.heartbeat ?? {};
  const running = !!hb.running;
  const startedAt = hb.started_at ? new Date(hb.started_at).getTime() : 0;
  const lockStale = startedAt > 0 && now - startedAt > lockStaleMs;
  const canAcquireLock = !running || lockStale;

  if (!shouldTriggerByTime || !canAcquireLock || !transcriptRoot || !fs.existsSync(transcriptRoot))
    return null;

  const processedSet = new Set(
    Array.isArray(control.processed_conversation_ids) ? control.processed_conversation_ids : []
  );
  const transcriptIndex = readTranscriptIndex(indexPath);
  const { candidate_ids, nextIndex } = collectTranscriptCandidates({
    transcriptRoot,
    index: transcriptIndex,
    processedSet,
    currentConversationId: conversationId,
    nowIso,
  });

  if (candidate_ids.length === 0) return null;

  const holdLock = !lockStale;
  const controlPatch = {
    heartbeat: {
      running: holdLock,
      started_at: holdLock ? nowIso : null,
      run_id: holdLock ? (conversationId || null) : null,
    },
  };
  return { candidate_ids, nextIndex, controlPatch };
}

/**
 * 阶段一：按注册表依次调用各应用的 shouldEnqueue，若有 payload 则入队并重读 control。
 */
function runHeartbeatEnqueue(projectRoot, currentConversationId = "") {
  const controlPath = path.join(projectRoot, HEARTBEAT_CONTROL_REL);
  const indexPath = path.join(projectRoot, HEARTBEAT_TRANSCRIPT_INDEX_REL);
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const apps = getRegisteredApps();

  let control = readControl(controlPath);

  const writeControl = (c) => {
    try {
      writeControlFile(controlPath, c);
    } catch (err) {
      console.error("[heartbeat-check] write control failed:", err.message);
    }
  };
  const writeIndexToDisk = (index) => {
    try {
      writeTranscriptIndex(indexPath, index);
    } catch (err) {
      console.error("[heartbeat-check] write transcript index failed:", err.message);
    }
  };
  const getTranscriptCandidatesForEnv = () =>
    getTranscriptCandidates(projectRoot, control, now, nowIso, currentConversationId, controlPath, indexPath);

  for (const app of apps) {
    const env = {
      projectRoot,
      control,
      now,
      nowIso,
      conversationId: currentConversationId,
      writeControl,
      writeTranscriptIndex: writeIndexToDisk,
      getTranscriptCandidates: getTranscriptCandidatesForEnv,
      improvementThresholdHours: IMPROVEMENT_THRESHOLD_HOURS,
    };
    let payload;
    try {
      payload = app.shouldEnqueue(env);
    } catch (err) {
      console.error("[heartbeat-check] app", app.id, "shouldEnqueue failed:", err.message);
      continue;
    }
    if (payload != null) {
      appendWalTask(projectRoot, app.id, payload);
      control = readControl(controlPath);
    }
  }
}

/**
 * 阶段二：读 WAL，解析未勾选任务，按 TYPE 查注册表；watchdog 应用执行 execCommand，成功则勾选 WAL，失败则调用 onFailure。
 * 使用带锁的 modifyWalWithLock 确保并发安全。
 */
function runHeartbeatConsume(projectRoot) {
  const walBufferPath = path.join(projectRoot, WAL_BUFFER_REL);
  const lockPath = path.join(projectRoot, ".lingxi/os/.wal.lock");
  if (!fs.existsSync(walBufferPath)) return;

  const appsById = Object.fromEntries(getRegisteredApps().map((a) => [a.id, a]));

  // 读取并解析 WAL
  let walContent;
  let lines;
  try {
    walContent = fs.readFileSync(walBufferPath, "utf8");
    lines = walContent.split("\n");
  } catch (err) {
    console.error("[watchdog] read WAL failed:", err.message);
    return;
  }

  // 查找待处理任务
  let taskToProcess = null;
  let taskLineIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const parsed = parseWalLine(lines[i]);
    if (!parsed || parsed.checked) continue;
    const app = appsById[parsed.type];
    if (app && app.consumer === "watchdog" && typeof app.execCommand === "function") {
      const cmd = app.execCommand(projectRoot, parsed.payload);
      if (cmd) {
        taskToProcess = { app, payload: parsed.payload, cmd };
        taskLineIndex = i;
        break;
      }
    }
  }

  if (!taskToProcess) return;

  // 获取锁并执行
  if (!acquireLock(lockPath)) {
    console.error("[watchdog] failed to acquire lock");
    return;
  }

  try {
    // 重新读取（确保最新）
    const latestContent = fs.readFileSync(walBufferPath, "utf8");
    const latestLines = latestContent.split("\n");
    const parsed = parseWalLine(latestLines[taskLineIndex]);
    if (!parsed || parsed.checked) return;

    // 执行命令
    exec(taskToProcess.cmd, (error) => {
      // 释放锁
      releaseLock(lockPath);

      if (!error) {
        // 重新获取锁来写入
        if (acquireLock(lockPath, 2000)) {
          try {
            const content = fs.readFileSync(walBufferPath, "utf8");
            const linesToWrite = content.split("\n");
            markWalLineChecked(linesToWrite, taskLineIndex);
            fs.writeFileSync(walBufferPath, linesToWrite.join("\n"), "utf8");
          } catch (e) {
            console.error("[watchdog] write WAL failed:", e.message);
          } finally {
            releaseLock(lockPath);
          }
        }
      } else {
        console.error("[watchdog]", taskToProcess.app.id, "failed:", error);
        if (typeof taskToProcess.app.onFailure === "function") {
          taskToProcess.app.onFailure(projectRoot, taskToProcess.payload);
        }
      }
    });
  } catch (err) {
    releaseLock(lockPath);
    console.error("[watchdog] consume error:", err.message);
  }
}

/**
 * 执行心跳检查：先入队再消费。可被 heartbeat-trigger hook 调用。
 */
export function runHeartbeatCheck(projectRoot, currentConversationId = "") {
  runHeartbeatEnqueue(projectRoot, currentConversationId);
  runHeartbeatConsume(projectRoot);
}
