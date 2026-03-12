#!/usr/bin/env node
/**
 * AgentOS Watchdog 守护进程：在 post-command hook 中调用。
 * 职责：
 * 1. 轮询 WAL_BUFFER.md，如果发现 PENDING OPERATIONS，则静默唤起对应的 Subagent 消费。
 * 2. 检查会话提炼心跳（30分钟）和自我迭代心跳（24小时），若触发则向 WAL_BUFFER.md 写入任务。
 */
import fs from "node:fs";
import path from "node:path";
import { exec } from "node:child_process";

const WAL_BUFFER_REL = ".cursor/.lingxi/os/WAL_BUFFER.md";
const HEARTBEAT_CONTROL_REL = ".cursor/.lingxi/os/heartbeat-control.json";
const HEARTBEAT_TRANSCRIPT_INDEX_REL = ".cursor/.lingxi/os/heartbeat-transcript-index.json";
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
 * 执行心跳检查并将任务写入 WAL_BUFFER.md。可被 post-command hook 调用。
 * @param {string} projectRoot - 项目根目录
 * @param {string} [currentConversationId] - 当前会话 id
 */
export function runHeartbeatCheck(projectRoot, currentConversationId = "") {
  const controlPath = path.join(projectRoot, HEARTBEAT_CONTROL_REL);
  const indexPath = path.join(projectRoot, HEARTBEAT_TRANSCRIPT_INDEX_REL);
  const walBufferPath = path.join(projectRoot, WAL_BUFFER_REL);
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

  let walAppends = [];

  // 24h 诊断触发
  if (triggerImprovementDiagnosis && currentConversationId) {
    const nextControl = {
      ...control,
      last_improvement_prompted_session_id: currentConversationId,
      last_improvement_prompted_at: nowIso,
    };
    try {
      writeControlFile(controlPath, nextControl);
      control = nextControl;
      walAppends.push(`- [ ] \`[SELF_ITERATE]\`: {"session_id": "${currentConversationId}"}`);
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

  if (shouldTriggerByTime && canAcquireLock && transcriptRoot && fs.existsSync(transcriptRoot)) {
    const transcriptIndex = readTranscriptIndex(indexPath);
    const { candidate_ids, nextIndex } = collectTranscriptCandidates({
      transcriptRoot,
      index: transcriptIndex,
      processedSet,
      currentConversationId,
      nowIso,
    });

    if (candidate_ids.length > 0) {
      try {
        writeTranscriptIndex(indexPath, nextIndex);
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
        writeControlFile(controlPath, next);
        walAppends.push(`- [ ] \`[SESSION_DISTILL]\`: {"candidate_ids": ${JSON.stringify(candidate_ids)}, "enqueued_by": "${currentConversationId}"}`);
      } catch (err) {
        console.error("[heartbeat-check] write transcript index/control failed:", err.message);
      }
    }
  }

  // 将触发的任务写入 WAL_BUFFER.md
  if (walAppends.length > 0 && fs.existsSync(walBufferPath)) {
    try {
      let walContent = fs.readFileSync(walBufferPath, "utf8");
      walContent += "\n" + walAppends.join("\n") + "\n";
      fs.writeFileSync(walBufferPath, walContent, "utf8");
    } catch (err) {
      console.error("[heartbeat-check] write to WAL_BUFFER failed:", err.message);
    }
  }

  // Watchdog 核心逻辑：扫描 WAL_BUFFER.md，处理无需大模型的纯脚本任务
  if (fs.existsSync(walBufferPath)) {
    try {
      const walContent = fs.readFileSync(walBufferPath, "utf8");
      const lines = walContent.split('\n');
      let modified = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // 注意：[SESSION_DISTILL] 任务现在由主 Agent 的 HOT_RAM.md 队列消费，Watchdog 不再处理它。
        
        if (line.startsWith('- [ ] `[SELF_ITERATE]`')) {
          const payloadStr = line.substring(line.indexOf('{'), line.lastIndexOf('}') + 1);
          const payload = JSON.parse(payloadStr);
          
          // 标记为处理中
          lines[i] = line.replace('- [ ]', '- [x]');
          modified = true;
          
          // 异步唤起后台进程执行 iterate (纯脚本任务)
          const proposalScript = path.join(projectRoot, ".cursor/agents/lingxi-self-iterate/scripts/memory-improvement-proposal.mjs");
          const applyScript = path.join(projectRoot, ".cursor/agents/lingxi-self-iterate/scripts/memory-improvement-apply.mjs");
          if (fs.existsSync(proposalScript) && fs.existsSync(applyScript)) {
            exec(`node "${proposalScript}" --window-hours 24 && node "${applyScript}" --approve-all`, (error) => {
              if (error) console.error("[watchdog] iterate failed:", error);
            });
          }
        }
      }
      
      if (modified) {
        fs.writeFileSync(walBufferPath, lines.join('\n'), "utf8");
      }
    } catch (err) {
      console.error("[watchdog] process WAL_BUFFER failed:", err.message);
    }
  }
}
