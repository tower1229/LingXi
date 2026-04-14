/**
 * Claude Code session source adapter.
 *
 * Claude Code stores session transcripts as `.jsonl` files under
 * `~/.claude/projects/<encoded-path>/`. Each line is a JSON event.
 *
 * The encoded path replaces `/` with `-` in the absolute project path,
 * e.g. `/Users/me/myproject` becomes `Users-me-myproject`.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { normalizeText } from "./_lingxi-memory.mjs";
import {
  normalizeMessage,
  uniqueMessages,
  statsForFile,
  hasEngineeringSignal,
  detectSelfDistillSkipReason
} from "./_lingxi-session-utils.mjs";

export function defaultClaudeProjectsDir() {
  return path.join(os.homedir(), ".claude", "projects");
}

function encodeProjectPath(projectRoot) {
  const resolved = path.resolve(projectRoot);
  return resolved.replace(/^\//, "").replaceAll("/", "-");
}

function findClaudeProjectDir(projectRoot, claudeProjectsDir) {
  const dir = claudeProjectsDir || defaultClaudeProjectsDir();
  if (!fs.existsSync(dir)) return null;

  const encoded = encodeProjectPath(projectRoot);

  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return null;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name === encoded) {
      return path.join(dir, entry.name);
    }
  }

  // Fallback: match by basename for shorter encoded paths
  const basename = path.basename(path.resolve(projectRoot));
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.endsWith(`-${basename}`)) {
      return path.join(dir, entry.name);
    }
  }

  return null;
}

function parseClaudeJsonlTranscript(content) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const parsed = [];
  for (const line of lines) {
    try {
      parsed.push(JSON.parse(line));
    } catch {
      continue;
    }
  }
  return parsed;
}

function extractMessagesFromClaudeTranscript(events) {
  const raw = [];
  for (const event of events) {
    if (!event || typeof event !== "object") continue;

    // Claude Code JSONL events have various shapes.
    // Common: { type: "human"|"assistant", message: { ... } }
    // Also: direct { role: "user"|"assistant", content: "..." }
    const msg = normalizeMessage(event);
    if (msg) {
      raw.push(msg);
      continue;
    }

    // Try nested message field
    if (event.message && typeof event.message === "object") {
      const nested = normalizeMessage(event.message);
      if (nested) {
        raw.push(nested);
        continue;
      }
    }

    // Claude transcript event with type field
    if (event.type === "human" || event.type === "user") {
      const content = normalizeText(
        typeof event.message === "string" ? event.message :
        event.message?.content || event.content || event.text || ""
      );
      if (content) raw.push({ role: "user", content });
    } else if (event.type === "assistant") {
      const content = normalizeText(
        typeof event.message === "string" ? event.message :
        event.message?.content || event.content || event.text || ""
      );
      if (content) raw.push({ role: "assistant", content });
    }
  }
  return uniqueMessages(raw);
}

export function loadClaudeCandidateSessions(projectRoot, claudeProjectsDir) {
  const projectDir = findClaudeProjectDir(projectRoot, claudeProjectsDir);
  if (!projectDir) return [];

  let entries;
  try {
    entries = fs.readdirSync(projectDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const sessions = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith(".jsonl")) continue;

    const filePath = path.join(projectDir, entry.name);
    const stats = statsForFile(filePath);
    if (!stats) continue;

    let content;
    try {
      content = fs.readFileSync(filePath, "utf8");
    } catch {
      continue;
    }

    const events = parseClaudeJsonlTranscript(content);
    if (events.length === 0) continue;

    const messages = extractMessagesFromClaudeTranscript(events);
    if (messages.length === 0) continue;

    const sessionId = path.basename(filePath, ".jsonl");

    sessions.push({
      session_id: sessionId,
      source_path: filePath,
      cwd: projectRoot,
      messages,
      context_text: "",
      updated_at: new Date(stats.mtimeMs).toISOString(),
      updated_at_ms: stats.mtimeMs
    });
  }

  return sessions.sort((a, b) => b.updated_at_ms - a.updated_at_ms);
}

export function isClaudeSessionRelevantToProject(_projectRoot, _session) {
  // Claude sessions are already scoped by the encoded project path directory,
  // so all sessions loaded via loadClaudeCandidateSessions are relevant.
  return true;
}

export function hasClaudeEngineeringSignal(session) {
  return hasEngineeringSignal(session);
}

export function detectClaudeSelfDistillSkipReason(session) {
  return detectSelfDistillSkipReason(session);
}
