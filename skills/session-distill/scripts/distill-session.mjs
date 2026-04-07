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

  if (
    !input.force &&
    existing &&
    existing.content_fingerprint === fingerprint &&
    state.distill_version === DISTILL_VERSION
  ) {
    const result = {
      operation: "skipped_duplicate",
      session_id: sessionId,
      content_fingerprint: fingerprint,
      distill_version: state.distill_version,
      notes: existing.notes || []
    };
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
      content_fingerprint: fingerprint,
      distill_version: DISTILL_VERSION,
      notes: []
    };
    recordProcessedSession(projectRoot, sessionId, {
      content_fingerprint: fingerprint,
      distilled_at: new Date().toISOString(),
      result: "skipped_no_signal",
      notes: []
    });
    appendDistillJournal(projectRoot, result);
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    return;
  }

  const noteResults = extracted.map((candidate) =>
    upsertMemoryNote(projectRoot, { ...candidate, source: "session-distill" }, "project")
  );
  const noteIds = noteResults.map((result) => result.note_id);
  const overallOperation = noteResults.every((result) => result.operation === "merged") ? "merged" : "written";
  const output = {
    operation: overallOperation,
    session_id: sessionId,
    content_fingerprint: fingerprint,
    distill_version: DISTILL_VERSION,
    candidate_count: extracted.length,
    notes: noteIds
  };

  recordProcessedSession(projectRoot, sessionId, {
    content_fingerprint: fingerprint,
    distilled_at: new Date().toISOString(),
    result: overallOperation,
    notes: noteIds
  });
  appendDistillJournal(projectRoot, output);
  process.stdout.write(JSON.stringify(output, null, 2) + "\n");
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
