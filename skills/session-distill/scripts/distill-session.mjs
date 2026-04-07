#!/usr/bin/env node

import process from "node:process";
import {
  DISTILL_VERSION,
  appendDistillJournal,
  fingerprintMessages,
  normalizeText,
  readProcessedSessionsState,
  recordProcessedSession,
  resolveProjectRoot,
  upsertMemoryNote
} from "../../../scripts/_lingxi-memory.mjs";

const ENGINEERING_SIGNAL_PATTERNS = [
  /\b(api|contract|schema|interfaces?|module|service|backend|frontend|sdk|library|cli|review|rollback|migration|dependency|test|diff|patch(?:es)?|refactor|docs?|readme|guide|state|route|layout|performance|compat(?:ibility)?|consumer|entrypoint|coupling)\b/i,
  /(接口|契约|模块|服务|后端|前端|库|SDK|命令行|审查|评审|回滚|迁移|依赖|测试|补丁|重构|文档|指南|状态|路由|布局|性能|兼容|调用方|入口|耦合)/,
  /\b(code|repository|repo|implementation|reviewable|maintainer|maintainers)\b/i
];

const GENERIC_LOW_SIGNAL_PATTERNS = [
  /\b(better|good|nice|careful|quickly|faster|cleaner)\b/i,
  /(更好|不错|小心|快一点|更快|更整洁|高效一点)/
];

function determineRunReason({ existing, fingerprint, stateDistillVersion, force }) {
  if (!existing) return "first_distill";
  if (force) return "forced_reprocess";
  if (existing.content_fingerprint !== fingerprint) return "content_changed";
  if (stateDistillVersion !== DISTILL_VERSION) return "distill_version_changed";
  return "duplicate_unchanged";
}

function isEngineeringRelevant(detail, fullText) {
  const normalizedDetail = normalizeText(detail);
  const normalizedFull = normalizeText(fullText);
  if (!normalizedDetail || normalizedDetail.length < 6) return false;
  const hasSignal = ENGINEERING_SIGNAL_PATTERNS.some((pattern) => pattern.test(normalizedDetail) || pattern.test(normalizedFull));
  if (!hasSignal) return false;
  if (GENERIC_LOW_SIGNAL_PATTERNS.some((pattern) => pattern.test(normalizedDetail)) && normalizedDetail.split(" ").length < 4) {
    return false;
  }
  return true;
}

function englishCandidates(text) {
  const patterns = [
    { kind: "preference", regex: /\bprefer(?:s|red)?\s+(.+?)(?:\.|$)/i, title: "Prefer" },
    { kind: "anti_pattern", regex: /\bavoid\s+(.+?)(?:\.|$)/i, title: "Avoid" },
    { kind: "anti_pattern", regex: /\bdo not\s+(.+?)(?:\.|$)/i, title: "Do not" },
    { kind: "anti_pattern", regex: /\bdon't\s+(.+?)(?:\.|$)/i, title: "Do not" },
    { kind: "constraint", regex: /\bmust\s+(.+?)(?:\.|$)/i, title: "Must" }
  ];
  return patterns
    .map((pattern) => {
      const match = pattern.regex.exec(text);
      if (!match) return null;
      const detail = normalizeText(match[1]);
      if (detail.length < 8) return null;
      if (!isEngineeringRelevant(detail, text)) return null;
      return {
        kind: pattern.kind,
        title: `${pattern.title} ${detail}`.slice(0, 96),
        one_liner: text,
        decision: text,
        when_to_load: ["When planning or reviewing changes in this repository"],
        evidence: [text]
      };
    })
    .filter(Boolean);
}

function chineseCandidates(text) {
  const patterns = [
    { kind: "preference", regex: /(优先|倾向于|尽量)(.+?)(。|$)/, title: "优先" },
    { kind: "anti_pattern", regex: /(避免|不要)(.+?)(。|$)/, title: "避免" },
    { kind: "constraint", regex: /(必须)(.+?)(。|$)/, title: "必须" }
  ];
  return patterns
    .map((pattern) => {
      const match = pattern.regex.exec(text);
      if (!match) return null;
      const detail = normalizeText(match[2]);
      if (detail.length < 2) return null;
      const normalizedSentence = normalizeText(text);
      if (!isEngineeringRelevant(detail, normalizedSentence)) return null;
      return {
        kind: pattern.kind,
        title: `${pattern.title}${detail}`.slice(0, 96),
        one_liner: normalizedSentence,
        decision: normalizedSentence,
        when_to_load: ["在定义任务或审查任务时"],
        evidence: [normalizedSentence]
      };
    })
    .filter(Boolean);
}

function dedupeCandidates(candidates) {
  const seen = new Set();
  return candidates.filter((candidate) => {
    const key = `${candidate.kind}::${candidate.title.toLowerCase()}::${candidate.decision.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function readJsonStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) {
    throw new Error("Expected session JSON on stdin.");
  }
  return JSON.parse(raw);
}

function validateInput(input) {
  if (!normalizeText(input.session_id)) {
    throw new Error("Missing required field: session_id");
  }
  if (!Array.isArray(input.messages) || input.messages.length === 0) {
    throw new Error("Missing required field: messages[]");
  }
}

async function main() {
  const projectRoot = resolveProjectRoot();
  const input = await readJsonStdin();
  validateInput(input);

  const sessionId = normalizeText(input.session_id);
  const messages = input.messages
    .map((message) => ({
      role: normalizeText(message.role),
      content: normalizeText(message.content)
    }))
    .filter((message) => message.role && message.content);
  if (messages.length === 0) {
    throw new Error("messages[] must contain non-empty role/content pairs");
  }

  const state = readProcessedSessionsState(projectRoot);
  const fingerprint = fingerprintMessages(messages);
  const existing = state.sessions[sessionId];
  const runReason = determineRunReason({
    existing,
    fingerprint,
    stateDistillVersion: state.distill_version,
    force: Boolean(input.force)
  });

  if (
    !input.force &&
    existing &&
    existing.content_fingerprint === fingerprint &&
    state.distill_version === DISTILL_VERSION
  ) {
    const result = {
      operation: "skipped_duplicate",
      session_id: sessionId,
      run_reason: runReason,
      content_fingerprint: fingerprint,
      distill_version: state.distill_version,
      previous_result: existing.result || "",
      candidate_count: existing.candidate_count || 0,
      notes: existing.notes || [],
      note_count: Array.isArray(existing.notes) ? existing.notes.length : 0
    };
    recordProcessedSession(projectRoot, sessionId, existing, {
      occurred_at: new Date().toISOString(),
      operation: result.operation,
      run_reason: result.run_reason,
      content_fingerprint: fingerprint,
      candidate_count: result.candidate_count,
      note_count: result.note_count
    });
    appendDistillJournal(projectRoot, result);
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    return;
  }

  const userTexts = messages
    .filter((message) => message.role === "user")
    .map((message) => normalizeText(message.content))
    .filter(Boolean);

  const extracted = dedupeCandidates(
    userTexts.flatMap((text) => [...englishCandidates(text), ...chineseCandidates(text)])
  );

  if (extracted.length === 0) {
    const result = {
      operation: "skipped_no_signal",
      session_id: sessionId,
      run_reason: runReason,
      content_fingerprint: fingerprint,
      distill_version: DISTILL_VERSION,
      candidate_count: 0,
      notes: []
    };
    recordProcessedSession(projectRoot, sessionId, {
      content_fingerprint: fingerprint,
      distilled_at: new Date().toISOString(),
      result: "skipped_no_signal",
      run_reason: runReason,
      candidate_count: 0,
      notes: []
    }, {
      occurred_at: new Date().toISOString(),
      operation: result.operation,
      run_reason: result.run_reason,
      content_fingerprint: fingerprint,
      candidate_count: 0,
      note_count: 0
    });
    appendDistillJournal(projectRoot, result);
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    return;
  }

  const noteResults = extracted.map((candidate) =>
    upsertMemoryNote(projectRoot, { ...candidate, source: "session-distill" }, "project")
  );
  const noteIds = noteResults.map((result) => result.note_id);
  const createdCount = noteResults.filter((result) => result.operation === "created").length;
  const mergedCount = noteResults.filter((result) => result.operation === "merged").length;
  const overallOperation = noteResults.every((result) => result.operation === "merged") ? "merged" : "written";
  const output = {
    operation: overallOperation,
    session_id: sessionId,
    run_reason: runReason,
    content_fingerprint: fingerprint,
    distill_version: DISTILL_VERSION,
    candidate_count: extracted.length,
    note_operations: {
      created_count: createdCount,
      merged_count: mergedCount
    },
    notes: noteIds,
    note_count: noteIds.length
  };

  recordProcessedSession(projectRoot, sessionId, {
    content_fingerprint: fingerprint,
    distilled_at: new Date().toISOString(),
    result: overallOperation,
    run_reason: runReason,
    candidate_count: extracted.length,
    notes: noteIds
  }, {
    occurred_at: new Date().toISOString(),
    operation: output.operation,
    run_reason: output.run_reason,
    content_fingerprint: fingerprint,
    candidate_count: output.candidate_count,
    note_count: output.note_count
  });
  appendDistillJournal(projectRoot, output);
  process.stdout.write(JSON.stringify(output, null, 2) + "\n");
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
