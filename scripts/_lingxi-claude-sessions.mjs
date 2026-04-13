/**
 * Claude Code session source adapter.
 *
 * This module mirrors the interface of `_lingxi-codex-sessions.mjs` for Claude Code sessions.
 * Claude Code exposes session transcripts via hook payloads (`transcript_path`) rather than
 * a central session directory, so the session discovery strategy differs from Codex.
 *
 * Phase 2 implementation notes:
 * - Claude session transcripts are stored under `~/.claude/projects/<encoded-path>/`
 * - Each session is a `.jsonl` file; hook payloads carry `transcript_path` for the active session
 * - A Claude-specific runner should enumerate recent transcripts and feed them to `distill-session`
 * - Session relevance can be determined by matching the encoded project path in the transcript directory
 *
 * Current status: interface stub only. All functions return empty/no-op results.
 * Replace with real implementations when Claude session distillation is prioritized.
 */

import os from "node:os";
import path from "node:path";

/**
 * Returns the default Claude projects directory where session transcripts are stored.
 * Claude Code stores projects under `~/.claude/projects/`.
 */
export function defaultClaudeProjectsDir() {
  return path.join(os.homedir(), ".claude", "projects");
}

/**
 * Returns a list of candidate Claude session objects for the given project root.
 *
 * Phase 2: enumerate `.jsonl` files under the project's encoded path directory,
 * normalize them into `{ session_id, file, cwd, messages, context_text, updated_at, updated_at_ms }`,
 * and return them sorted by `updated_at_ms` descending.
 *
 * @param {string} _projectRoot - absolute path to the target repository
 * @param {string} [_claudeProjectsDir] - override for the claude projects directory
 * @returns {Array<object>} empty array until Phase 2 is implemented
 */
export function loadClaudeCandidateSessions(_projectRoot, _claudeProjectsDir) {
  // Phase 2: implement transcript enumeration and normalization
  return [];
}

/**
 * Returns whether a Claude session is relevant to the given project root.
 * Mirrors the interface of `isCodexSessionRelevantToProject`.
 *
 * @param {string} _projectRoot
 * @param {object} _session
 * @returns {boolean}
 */
export function isClaudeSessionRelevantToProject(_projectRoot, _session) {
  // Phase 2: implement cwd-based and basename-based relevance check
  return false;
}

/**
 * Returns whether a Claude session contains engineering signal worth distilling.
 * Mirrors the interface of `hasCodexEngineeringSignal`.
 *
 * @param {object} _session
 * @returns {boolean}
 */
export function hasClaudeEngineeringSignal(_session) {
  // Phase 2: implement signal detection against session message content
  return false;
}

/**
 * Returns a skip reason if this session should be excluded from distillation,
 * or null if it is a valid candidate.
 * Mirrors the interface of `detectCodexSelfDistillSkipReason`.
 *
 * @param {object} _session
 * @returns {string|null}
 */
export function detectClaudeSelfDistillSkipReason(_session) {
  // Phase 2: implement self-distillation detection for Claude sessions
  return null;
}
