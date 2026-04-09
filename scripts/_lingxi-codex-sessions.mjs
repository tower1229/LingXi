import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { normalizeText } from "./_lingxi-memory.mjs";

const SESSION_FILE_EXTENSIONS = new Set([".json", ".jsonl"]);
const CURRENT_RUN_MARKERS = [
  /lingxi-session-distill/i,
  /lingxi session distill/i,
  /lx-distill-sessions\.mjs/i,
  /run\s+node\s+scripts\/lx-distill-sessions\.mjs/i
];
const HISTORICAL_SELF_DISTILL_MARKERS = [
  /session-distill/i,
  /distill(?:ation)?/i,
  /processed-sessions\.json/i,
  /distill-journal\.jsonl/i,
  /memory about memory/i,
  /self-distill/i,
  /lingxi memory/i
];
const ENGINEERING_SIGNAL_PATTERN =
  /(`[^`]+`|\/[A-Za-z0-9._/-]+|[A-Za-z0-9._-]+\.(js|ts|tsx|jsx|mjs|json|md|py|go|rs|java|toml|yaml|yml)|task|vet|bug|fix|feature|test|refactor|api|docs|build|debug|review|implement|repository|repo|project|module|function|class|frontend|backend|sdk|contract|rollback|schema|explicit interfaces?|hidden coupling|module boundaries?|stable contracts?|reviewable patches?|rollback notes?|rollback path|文档|任务|实现|接口|测试|重构|调试|代码|仓库|模块|前端|后端|契约|回滚)/i;

function defaultCodexHome() {
  return path.join(os.homedir(), ".codex");
}

function extractText(value) {
  if (value == null) return "";
  if (typeof value === "string") return normalizeText(value);
  if (typeof value === "number" || typeof value === "boolean") return normalizeText(String(value));
  if (Array.isArray(value)) {
    return normalizeText(value.map((item) => extractText(item)).filter(Boolean).join("\n"));
  }
  if (typeof value === "object") {
    if (typeof value.text === "string") return normalizeText(value.text);
    if (typeof value.content === "string") return normalizeText(value.content);
    if (typeof value.body === "string") return normalizeText(value.body);
    if (typeof value.message === "string") return normalizeText(value.message);
    if (value.output_text) return extractText(value.output_text);
    if (value.input_text) return extractText(value.input_text);
    if (value.parts) return extractText(value.parts);
    if (value.content?.parts) return extractText(value.content.parts);
    if (value.message?.content) return extractText(value.message.content);
    if (value.delta) return extractText(value.delta);
  }
  return "";
}

function normalizeRole(value) {
  const role = normalizeText(
    value?.role ||
    value?.author?.role ||
    value?.author?.type ||
    value?.sender ||
    value?.type ||
    value?.message?.role
  ).toLowerCase();

  if (["assistant", "user", "system", "tool", "developer"].includes(role)) {
    return role;
  }
  return "";
}

function normalizeMessage(entry) {
  if (!entry || typeof entry !== "object") return null;
  const role = normalizeRole(entry);
  const content = normalizeText(
    extractText(entry.content) ||
    extractText(entry.message?.content) ||
    extractText(entry.text) ||
    extractText(entry.body) ||
    extractText(entry.message)
  );
  if (!role || !content) return null;
  return { role, content };
}

function uniqueMessages(messages) {
  const out = [];
  const seen = new Set();
  for (const message of messages || []) {
    const normalized = normalizeMessage(message);
    if (!normalized) continue;
    const key = `${normalized.role}\n${normalized.content}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out;
}

function findMessages(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return uniqueMessages(value);
  }
  if (typeof value === "object") {
    const candidates = [
      value.messages,
      value.turns,
      value.items,
      value.entries,
      value.events,
      value.transcript?.messages,
      value.transcript?.items,
      value.conversation?.messages
    ];
    for (const candidate of candidates) {
      const found = findMessages(candidate);
      if (found.length > 0) return found;
    }
  }
  return [];
}

function parseJsonLines(content) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function deriveSessionId(filePath, value) {
  return normalizeText(
    value?.session_id ||
    value?.sessionId ||
    value?.id ||
    value?.conversation_id ||
    value?.conversationId ||
    path.basename(filePath, path.extname(filePath))
  );
}

function deriveSessionCwd(value) {
  return normalizeText(
    value?.cwd ||
    value?.project_root ||
    value?.projectRoot ||
    value?.repo_path ||
    value?.repoPath ||
    value?.metadata?.cwd ||
    value?.metadata?.project_root ||
    value?.metadata?.projectRoot
  );
}

function collectContextText(value) {
  if (!value || typeof value !== "object") return "";
  return normalizeText([
    value.title,
    value.name,
    value.description,
    value.prompt,
    value.agent_name,
    value.agentName,
    value.automation_name,
    value.automationName,
    value.metadata?.title,
    value.metadata?.prompt,
    value.metadata?.agent_name,
    value.metadata?.automation_name
  ].map((item) => normalizeText(item)).filter(Boolean).join("\n"));
}

function statsForFile(filePath) {
  try {
    return fs.statSync(filePath);
  } catch {
    return null;
  }
}

function walkSessionFiles(rootDir) {
  if (!fs.existsSync(rootDir)) return [];
  const results = [];
  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (SESSION_FILE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

function isPathWithin(parentDir, targetDir) {
  const parent = path.resolve(parentDir);
  const target = path.resolve(targetDir);
  const relative = path.relative(parent, target);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
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
      const metadata = lines.find((item) => item && typeof item === "object" && !Array.isArray(item) && !normalizeMessage(item)) || {};
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

export function hasCodexEngineeringSignal(session) {
  const combined = normalizeText(session.messages.map((message) => message.content).join("\n"));
  if (!combined) return false;
  return ENGINEERING_SIGNAL_PATTERN.test(combined);
}

export function detectCodexSelfDistillSkipReason(session) {
  const haystack = normalizeText([
    session.context_text,
    ...session.messages.map((message) => message.content)
  ].join("\n"));
  if (!haystack) return null;

  const isCurrentRun = CURRENT_RUN_MARKERS.some((pattern) => pattern.test(haystack));
  if (isCurrentRun) {
    return "self_distill_current_run";
  }

  const isHistoricalSelfDistill = HISTORICAL_SELF_DISTILL_MARKERS.some((pattern) => pattern.test(haystack));
  if (isHistoricalSelfDistill && !hasCodexEngineeringSignal(session)) {
    return "self_distill_historical";
  }

  return null;
}
