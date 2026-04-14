import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { normalizeText } from "./_lingxi-memory.mjs";
import {
  SESSION_FILE_EXTENSIONS,
  extractText,
  normalizeRole,
  normalizeMessage,
  uniqueMessages,
  findMessages,
  parseJsonLines,
  deriveSessionId,
  deriveSessionCwd,
  collectContextText,
  deriveJsonlMetadata,
  statsForFile,
  walkSessionFiles,
  isPathWithin,
  hasEngineeringSignal,
  detectSelfDistillSkipReason
} from "./_lingxi-session-utils.mjs";

function defaultCodexHome() {
  return path.join(os.homedir(), ".codex");
}

export function resolveCodexHome(explicitHome = null) {
  return path.resolve(normalizeText(explicitHome || process.env.CODEX_HOME || defaultCodexHome()));
}

export function resolveCodexSessionsRoot(explicitSessionsRoot = null, explicitCodexHome = null) {
  if (normalizeText(explicitSessionsRoot)) {
    return path.resolve(explicitSessionsRoot);
  }
  return path.join(resolveCodexHome(explicitCodexHome), "sessions");
}

export function listCodexSessionArtifactPaths(sessionsRoot, options = {}) {
  const sinceHours = Number.isFinite(options.sinceHours) && options.sinceHours > 0 ? options.sinceHours : 6;
  const cutoff = Date.now() - (sinceHours * 60 * 60 * 1000);

  return walkSessionFiles(sessionsRoot)
    .map((filePath) => ({ filePath, stats: statsForFile(filePath) }))
    .filter(({ stats }) => stats)
    .filter(({ stats }) => stats.mtimeMs >= cutoff)
    .sort((a, b) => b.stats.mtimeMs - a.stats.mtimeMs)
    .map(({ filePath }) => filePath);
}

export function readCodexSessionArtifact(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const extension = path.extname(filePath).toLowerCase();
  const stats = statsForFile(filePath);
  let parsed;

  if (extension === ".jsonl") {
    const lines = parseJsonLines(content);
    if (lines.length === 1 && typeof lines[0] === "object" && !Array.isArray(lines[0])) {
      parsed = lines[0];
    } else {
      const metadata = deriveJsonlMetadata(lines);
      parsed = {
        ...metadata,
        messages: uniqueMessages(lines)
      };
    }
  } else {
    parsed = JSON.parse(content);
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Session artifact must be a JSON object or JSONL transcript.");
  }

  const messages = findMessages(parsed);
  if (messages.length === 0) {
    throw new Error("Session artifact does not contain any normalized messages.");
  }

  return {
    session_id: deriveSessionId(filePath, parsed),
    source_path: path.resolve(filePath),
    cwd: deriveSessionCwd(parsed),
    messages,
    context_text: collectContextText(parsed),
    updated_at: stats ? new Date(stats.mtimeMs).toISOString() : "",
    updated_at_ms: stats?.mtimeMs || 0
  };
}

export function isCodexSessionRelevantToProject(projectRoot, session) {
  const resolvedProjectRoot = path.resolve(projectRoot);
  const sessionCwd = normalizeText(session.cwd);
  if (sessionCwd) {
    const resolvedSessionCwd = path.resolve(sessionCwd);
    if (isPathWithin(resolvedProjectRoot, resolvedSessionCwd) || isPathWithin(resolvedSessionCwd, resolvedProjectRoot)) {
      return true;
    }
  }

  const basename = normalizeText(path.basename(resolvedProjectRoot)).toLowerCase();
  if (!basename || basename.length < 3) return false;
  const haystack = normalizeText([
    session.context_text,
    ...session.messages.map((message) => message.content)
  ].join("\n")).toLowerCase();
  return new RegExp(`\\b${basename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(haystack);
}

export { hasEngineeringSignal as hasCodexEngineeringSignal };

export { detectSelfDistillSkipReason as detectCodexSelfDistillSkipReason };
