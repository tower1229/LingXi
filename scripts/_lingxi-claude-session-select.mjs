import {
  DISTILL_VERSION,
  fingerprintMessages,
  readProcessedSessionsState,
  resolveProjectRoot
} from "./_lingxi-memory.mjs";
import {
  detectClaudeSelfDistillSkipReason,
  hasClaudeEngineeringSignal,
  isClaudeSessionRelevantToProject,
  loadClaudeCandidateSessions
} from "./_lingxi-claude-sessions.mjs";

export const CLAUDE_SELECTOR_SKIP_REASONS = new Set([
  "repo_irrelevant",
  "self_distill_current_run",
  "self_distill_historical",
  "duplicate_unchanged",
  "no_engineering_signal"
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

export function selectClaudeSessions(projectRootInput, options = {}) {
  const projectRoot = resolveProjectRoot(projectRootInput);
  const limit = Number.isFinite(options.limit) && options.limit > 0 ? options.limit : 20;
  const sinceHours = Number.isFinite(options.sinceHours) && options.sinceHours > 0 ? options.sinceHours : 6;
  const cutoff = Date.now() - (sinceHours * 60 * 60 * 1000);

  const allSessions = loadClaudeCandidateSessions(projectRoot, options.claudeProjectsDir);
  const recentSessions = allSessions.filter((session) => session.updated_at_ms >= cutoff);
  const processedState = readProcessedSessionsState(projectRoot);
  const selected = [];
  const skipped = [];

  for (const session of recentSessions) {
    if (selected.length >= limit) break;

    if (!isClaudeSessionRelevantToProject(projectRoot, session)) {
      skipped.push({
        session_id: session.session_id,
        source_path: session.source_path,
        skip_reason: "repo_irrelevant"
      });
      continue;
    }

    const selfDistillReason = detectClaudeSelfDistillSkipReason(session);
    if (selfDistillReason) {
      skipped.push({
        session_id: session.session_id,
        source_path: session.source_path,
        skip_reason: selfDistillReason
      });
      continue;
    }

    if (!hasClaudeEngineeringSignal(session)) {
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
    host: "claude",
    summary: {
      scanned_count: recentSessions.length,
      selected_count: selected.length,
      skipped_count: skipped.length,
      skip_reasons: summarizeSkips(skipped)
    },
    selected,
    skipped
  };
}
