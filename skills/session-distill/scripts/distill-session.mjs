#!/usr/bin/env node

import process from "node:process";
import {
  DISTILL_VERSION,
  appendMemoryOpsLog,
  appendDistillJournal,
  fingerprintMessages,
  normalizeText,
  readProcessedSessionsState,
  recordProcessedSession,
  resolveProjectRoot,
  upsertMemoryNotes
} from "../../../scripts/_lingxi-memory.mjs";
import { distillSessionToCandidates } from "../../../scripts/_lingxi-memory-semantic.mjs";

function determineRunReason({ existing, fingerprint, stateDistillVersion, force }) {
  if (!existing) return "first_distill";
  if (force) return "forced_reprocess";
  if (existing.content_fingerprint !== fingerprint) return "content_changed";
  if (stateDistillVersion !== DISTILL_VERSION) return "distill_version_changed";
  return "duplicate_unchanged";
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

  const candidateSet = await distillSessionToCandidates(projectRoot, {
    session_id: sessionId,
    content_fingerprint: fingerprint,
    distill_version: DISTILL_VERSION,
    messages
  });
  if (candidateSet.semantic_trace?.taste_extract) {
    appendMemoryOpsLog(projectRoot, {
      ...candidateSet.semantic_trace.taste_extract,
      session_id: sessionId,
      content_fingerprint: fingerprint,
      distill_version: DISTILL_VERSION
    });
  }
  if (candidateSet.semantic_trace?.taste_adjudicate) {
    appendMemoryOpsLog(projectRoot, {
      ...candidateSet.semantic_trace.taste_adjudicate,
      session_id: sessionId,
      content_fingerprint: fingerprint,
      distill_version: DISTILL_VERSION
    });
  }
  const extracted = candidateSet.candidates.map((candidate) => ({
    title: normalizeText(candidate.title),
    scene: normalizeText(candidate.scene),
    content_type: normalizeText(candidate.content_type),
    alternatives: candidate.alternatives,
    choice: normalizeText(candidate.choice),
    rationale: normalizeText(candidate.rationale),
    kind: normalizeText(candidate.kind),
    one_liner: normalizeText(candidate.one_liner),
    decision: normalizeText(candidate.decision),
    pattern_hint: normalizeText(candidate.pattern_hint),
    when_to_load: candidate.when_to_load,
    evidence: candidate.evidence,
    confidence: candidate.confidence,
    durability_reason: normalizeText(candidate.durability_reason),
    value_scores: candidate.value_scores,
    reusability_scope: normalizeText(candidate.reusability_scope),
    suggested_storage_kind: normalizeText(candidate.suggested_storage_kind),
    source_session_ids: [sessionId]
  }));

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

  const governanceStartedAt = Date.now();
  const noteResults = await upsertMemoryNotes(
    projectRoot,
    extracted.map((candidate) => ({
      ...candidate,
      scope: candidate.reusability_scope === "share" ? "share" : "project",
      source: "session-distill"
    }))
  );
  appendMemoryOpsLog(projectRoot, {
    operation: "distill_governance_applied",
    duration_ms: Date.now() - governanceStartedAt,
    session_id: sessionId,
    content_fingerprint: fingerprint,
    distill_version: DISTILL_VERSION,
    candidate_count: extracted.length,
    created_count: noteResults.filter((result) => result.operation === "created").length,
    merged_count: noteResults.filter((result) => result.operation === "merged").length,
    skipped_count: noteResults.filter((result) => result.operation === "skipped").length,
    reason_codes: [...new Set(noteResults.map((result) => normalizeText(result.reason_code)).filter(Boolean))]
  });
  const noteIds = noteResults.map((result) => result.note_id).filter(Boolean);
  const createdCount = noteResults.filter((result) => result.operation === "created").length;
  const mergedCount = noteResults.filter((result) => result.operation === "merged").length;
  const overallOperation =
    noteIds.length === 0
      ? "skipped_no_signal"
      : noteResults.every((result) => result.operation === "merged")
        ? "merged"
        : "written";
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
