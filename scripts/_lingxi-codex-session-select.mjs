import {
  DISTILL_VERSION,
  fingerprintMessages,
  readProcessedSessionsState,
  resolveProjectRoot
} from "./_lingxi-memory.mjs";
import {
  detectCodexSelfDistillSkipReason,
  hasCodexEngineeringSignal,
  isCodexSessionRelevantToProject,
  listCodexSessionArtifactPaths,
  readCodexSessionArtifact,
  resolveCodexSessionsRoot
} from "./_lingxi-codex-sessions.mjs";

export const CODEX_SELECTOR_SKIP_REASONS = new Set([
  "repo_irrelevant",
  "self_distill_current_run",
  "self_distill_historical",
  "duplicate_unchanged",
  "no_engineering_signal",
  "artifact_unreadable"
]);

function summarizeSkips(skipped) {
  const out = {};
  for (const item of skipped || []) {
    const reason = item.skip_reason;
    if (!reason) continue;
    out[reason] = (out[reason] || 0) + 1;
  }
  return out;
}

function isDuplicateUnchanged(state, session) {
  const existing = state.sessions?.[session.session_id];
  if (!existing) return false;
  const fingerprint = fingerprintMessages(session.messages);
  return existing.content_fingerprint === fingerprint && state.distill_version === DISTILL_VERSION;
}

export function selectCodexSessions(projectRootInput, options = {}) {
  const projectRoot = resolveProjectRoot(projectRootInput);
  const limit = Number.isFinite(options.limit) && options.limit > 0 ? options.limit : 20;
  const sinceHours = Number.isFinite(options.sinceHours) && options.sinceHours > 0 ? options.sinceHours : 6;
  const sessionsRoot = resolveCodexSessionsRoot(options.sessionsRoot, options.codexHome);
  const artifactPaths = listCodexSessionArtifactPaths(sessionsRoot, { limit, sinceHours });
  const processedState = readProcessedSessionsState(projectRoot);
  const selected = [];
  const skipped = [];

  for (const filePath of artifactPaths) {
    if (selected.length >= limit) break;

    let session;
    try {
      session = readCodexSessionArtifact(filePath);
    } catch (error) {
      skipped.push({
        source_path: filePath,
        skip_reason: "artifact_unreadable",
        detail: String(error.message || error)
      });
      continue;
    }

    if (!isCodexSessionRelevantToProject(projectRoot, session)) {
      skipped.push({
        session_id: session.session_id,
        source_path: session.source_path,
        skip_reason: "repo_irrelevant"
      });
      continue;
    }

    const selfDistillReason = detectCodexSelfDistillSkipReason(session);
    if (selfDistillReason) {
      skipped.push({
        session_id: session.session_id,
        source_path: session.source_path,
        skip_reason: selfDistillReason
      });
      continue;
    }

    if (!hasCodexEngineeringSignal(session)) {
      skipped.push({
        session_id: session.session_id,
        source_path: session.source_path,
        skip_reason: "no_engineering_signal"
      });
      continue;
    }

    if (isDuplicateUnchanged(processedState, session)) {
      skipped.push({
        session_id: session.session_id,
        source_path: session.source_path,
        skip_reason: "duplicate_unchanged"
      });
      continue;
    }

    selected.push({
      session_id: session.session_id,
      source_path: session.source_path,
      messages: session.messages,
      selection_reason: "repo_relevant_unprocessed"
    });
  }

  return {
    operation: "selected_sessions",
    host: "codex",
    summary: {
      sessions_root: sessionsRoot,
      scanned_count: artifactPaths.length,
      selected_count: selected.length,
      skipped_count: skipped.length,
      skip_reasons: summarizeSkips(skipped)
    },
    selected,
    skipped
  };
}
