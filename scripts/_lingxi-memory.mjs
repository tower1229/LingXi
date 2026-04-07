import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const INDEX_COLUMNS = ["Id", "Kind", "Title", "When to load", "Source", "UpdatedAt", "File"];
export const DISTILL_VERSION = "v1";
export const SESSION_RESULT_VALUES = new Set([
  "written",
  "merged",
  "skipped_no_signal",
  "skipped_duplicate",
  "failed"
]);

export function resolveProjectRoot(explicitRoot) {
  return path.resolve(explicitRoot || process.env.CODEX_PROJECT_DIR || process.cwd());
}

export function lingxiRoot(projectRoot) {
  return path.join(projectRoot, ".lingxi");
}

export function memoryDir(projectRoot, scope = "project") {
  return path.join(projectRoot, ".lingxi", "memory", scope);
}

export function indexPath(projectRoot) {
  return path.join(projectRoot, ".lingxi", "memory", "INDEX.md");
}

export function processedSessionsPath(projectRoot) {
  return path.join(projectRoot, ".lingxi", "state", "processed-sessions.json");
}

export function distillJournalPath(projectRoot) {
  return path.join(projectRoot, ".lingxi", "state", "distill-journal.jsonl");
}

export function tasksDir(projectRoot) {
  return path.join(projectRoot, ".lingxi", "tasks");
}

export function normalizeText(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\s+/g, " ")
    .trim();
}

export function slugify(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "item";
}

export function ensureLingxiLayout(projectRoot) {
  const dirs = [
    tasksDir(projectRoot),
    memoryDir(projectRoot, "project"),
    memoryDir(projectRoot, "share"),
    path.dirname(processedSessionsPath(projectRoot)),
    path.join(projectRoot, ".lingxi", "setup"),
    path.join(projectRoot, ".codex", "agents")
  ];
  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function defaultProcessedSessionsState() {
  return {
    distill_version: DISTILL_VERSION,
    sessions: {}
  };
}

export function ensureRuntimeState(projectRoot) {
  ensureLingxiLayout(projectRoot);
  if (!fs.existsSync(indexPath(projectRoot))) {
    fs.writeFileSync(indexPath(projectRoot), buildIndexMarkdown([], projectRoot), "utf8");
  }
  if (!fs.existsSync(processedSessionsPath(projectRoot))) {
    fs.writeFileSync(
      processedSessionsPath(projectRoot),
      JSON.stringify(defaultProcessedSessionsState(), null, 2) + "\n",
      "utf8"
    );
  }
  if (!fs.existsSync(distillJournalPath(projectRoot))) {
    fs.writeFileSync(distillJournalPath(projectRoot), "", "utf8");
  }
}

export function readProcessedSessionsState(projectRoot) {
  ensureRuntimeState(projectRoot);
  try {
    const parsed = JSON.parse(fs.readFileSync(processedSessionsPath(projectRoot), "utf8"));
    if (!parsed || typeof parsed !== "object") {
      return defaultProcessedSessionsState();
    }
    const sessions = parsed.sessions && typeof parsed.sessions === "object" ? parsed.sessions : {};
    return {
      distill_version: String(parsed.distill_version || DISTILL_VERSION),
      sessions
    };
  } catch {
    return defaultProcessedSessionsState();
  }
}

export function writeProcessedSessionsState(projectRoot, state) {
  ensureRuntimeState(projectRoot);
  fs.writeFileSync(processedSessionsPath(projectRoot), JSON.stringify(state, null, 2) + "\n", "utf8");
}

export function appendDistillJournal(projectRoot, event) {
  ensureRuntimeState(projectRoot);
  fs.appendFileSync(
    distillJournalPath(projectRoot),
    JSON.stringify({ ts: new Date().toISOString(), ...event }) + "\n",
    "utf8"
  );
}

export function nextMemoryId(existingIds) {
  const max = existingIds.reduce((acc, id) => {
    const match = /^MEM-(\d+)$/.exec(id);
    if (!match) return acc;
    return Math.max(acc, Number(match[1]));
  }, 0);
  return `MEM-${String(max + 1).padStart(3, "0")}`;
}

export function nextTaskId(projectRoot) {
  ensureLingxiLayout(projectRoot);
  const ids = fs.readdirSync(tasksDir(projectRoot))
    .map((name) => /^(\d{3})\./.exec(name))
    .filter(Boolean)
    .map((match) => Number(match[1]));
  const nextId = ids.length === 0 ? 1 : Math.max(...ids) + 1;
  return String(nextId).padStart(3, "0");
}

export function renderFrontmatterArray(key, values) {
  if (!values || values.length === 0) {
    return `${key}: []`;
  }
  return `${key}:\n${values.map((value) => `  - ${escapeYamlScalar(value)}`).join("\n")}`;
}

function escapeYamlScalar(value) {
  const normalized = String(value || "").replace(/\r\n/g, "\n").trim();
  if (normalized === "") return '""';
  if (/[:#[\]{}]/.test(normalized)) {
    return JSON.stringify(normalized);
  }
  return normalized;
}

export function renderMemoryNote(note) {
  const evidence = (note.evidence || []).map((item) => `- ${item}`).join("\n");
  return `---
id: ${note.id}
title: ${escapeYamlScalar(note.title)}
kind: ${escapeYamlScalar(note.kind)}
scope: ${escapeYamlScalar(note.scope)}
source: ${escapeYamlScalar(note.source)}
updated_at: ${escapeYamlScalar(note.updated_at)}
${renderFrontmatterArray("when_to_load", note.when_to_load || [])}
---

# One-liner

${note.one_liner}

# Decision / Preference

${note.decision}

# Evidence

${evidence || "- No explicit evidence captured."}
`;
}

function parseFrontmatterBlock(block) {
  const lines = block.split("\n");
  const data = {};
  let currentArrayKey = null;
  for (const line of lines) {
    if (!line.trim()) continue;
    if (/^\s*-\s+/.test(line) && currentArrayKey) {
      data[currentArrayKey].push(line.replace(/^\s*-\s+/, "").trim().replace(/^"(.*)"$/, "$1"));
      continue;
    }
    const match = /^([a-zA-Z0-9_]+):\s*(.*)$/.exec(line);
    if (!match) {
      currentArrayKey = null;
      continue;
    }
    const [, key, rawValue] = match;
    if (rawValue === "[]") {
      data[key] = [];
      currentArrayKey = null;
      continue;
    }
    if (rawValue === "") {
      data[key] = [];
      currentArrayKey = key;
      continue;
    }
    data[key] = rawValue.trim().replace(/^"(.*)"$/, "$1");
    currentArrayKey = null;
  }
  return data;
}

function extractSection(body, heading) {
  const pattern = new RegExp(`^##? ${heading}\\n\\n([\\s\\S]*?)(?=\\n##? |$)`, "m");
  const match = pattern.exec(body);
  return match ? match[1].trim() : "";
}

export function parseMemoryNote(content, file) {
  const normalized = content.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    throw new Error(`Memory note missing frontmatter: ${file}`);
  }
  const end = normalized.indexOf("\n---\n", 4);
  if (end === -1) {
    throw new Error(`Memory note frontmatter is not closed: ${file}`);
  }
  const frontmatter = parseFrontmatterBlock(normalized.slice(4, end));
  const body = normalized.slice(end + 5);
  const evidenceSection = extractSection(body, "Evidence");
  return {
    id: frontmatter.id || "",
    title: frontmatter.title || "",
    kind: frontmatter.kind || "",
    scope: frontmatter.scope || "project",
    source: frontmatter.source || "",
    updated_at: frontmatter.updated_at || "",
    when_to_load: Array.isArray(frontmatter.when_to_load) ? frontmatter.when_to_load : [],
    one_liner: extractSection(body, "One-liner"),
    decision: extractSection(body, "Decision / Preference"),
    evidence: evidenceSection
      .split("\n")
      .map((line) => line.replace(/^\s*-\s+/, "").trim())
      .filter(Boolean),
    file
  };
}

export function listMemoryFiles(projectRoot) {
  const scopes = ["project", "share"];
  const files = [];
  for (const scope of scopes) {
    const dir = memoryDir(projectRoot, scope);
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      files.push(path.join(dir, entry.name));
    }
  }
  return files.sort();
}

export function loadMemoryNotes(projectRoot) {
  ensureRuntimeState(projectRoot);
  return listMemoryFiles(projectRoot).map((file) =>
    parseMemoryNote(fs.readFileSync(file, "utf8"), file)
  );
}

export function buildIndexMarkdown(notes, projectRoot) {
  const header = [
    "# LingXi Memory Index",
    "",
    `| ${INDEX_COLUMNS.join(" | ")} |`,
    `| ${INDEX_COLUMNS.map(() => "---").join(" | ")} |`
  ];
  const rows = notes
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((note) => {
      const relativeFile = path.relative(projectRoot, note.file).replaceAll(path.sep, "/");
      const whenToLoad = (note.when_to_load || []).join("; ").replaceAll("|", "\\|");
      const cells = [
        note.id,
        note.kind,
        note.title,
        whenToLoad,
        note.source,
        note.updated_at,
        relativeFile
      ].map((value) => String(value || "").replaceAll("|", "\\|"));
      return `| ${cells.join(" | ")} |`;
    });
  return `${header.concat(rows).join("\n")}\n`;
}

export function rebuildMemoryIndex(projectRoot) {
  const notes = loadMemoryNotes(projectRoot);
  const markdown = buildIndexMarkdown(notes, projectRoot);
  fs.writeFileSync(indexPath(projectRoot), markdown, "utf8");
  return notes;
}

export function tokenizeQuery(query) {
  return String(query || "")
    .toLowerCase()
    .split(/[^a-z0-9\u4e00-\u9fff]+/u)
    .filter(Boolean);
}

export function scoreNote(note, query) {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) return 0;
  const haystack = [
    note.title,
    ...(note.when_to_load || []),
    note.one_liner,
    note.decision,
    ...(note.evidence || [])
  ].join(" ").toLowerCase();
  let score = note.scope === "project" ? 2 : 0;
  for (const token of tokens) {
    if (haystack.includes(token)) score += 1;
    if (String(note.title || "").toLowerCase().includes(token)) score += 2;
  }
  return score;
}

export function normalizeSignaturePart(value) {
  return normalizeText(value).toLowerCase();
}

export function memorySignature(noteLike) {
  return [
    normalizeSignaturePart(noteLike.kind),
    normalizeSignaturePart(noteLike.title),
    normalizeSignaturePart(noteLike.one_liner),
    normalizeSignaturePart(noteLike.decision)
  ].join("::");
}

export function mergeStringArrays(...lists) {
  const seen = new Set();
  const merged = [];
  for (const list of lists) {
    for (const item of list || []) {
      const normalized = normalizeText(item);
      if (!normalized) continue;
      const key = normalized.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(normalized);
    }
  }
  return merged;
}

export function upsertMemoryNote(projectRoot, input, scope = "project") {
  ensureRuntimeState(projectRoot);
  const notes = loadMemoryNotes(projectRoot);
  const updatedAt = new Date().toISOString();
  const candidate = {
    title: normalizeText(input.title),
    kind: normalizeText(input.kind),
    scope,
    source: normalizeText(input.source),
    updated_at: updatedAt,
    when_to_load: mergeStringArrays(input.when_to_load || []),
    one_liner: normalizeText(input.one_liner),
    decision: normalizeText(input.decision),
    evidence: mergeStringArrays(input.evidence || [])
  };
  const signature = memorySignature(candidate);
  const existing = notes.find((note) => note.scope === scope && memorySignature(note) === signature);

  if (existing) {
    const merged = {
      ...existing,
      source: existing.source === candidate.source ? existing.source : `${existing.source}, ${candidate.source}`,
      updated_at: updatedAt,
      when_to_load: mergeStringArrays(existing.when_to_load, candidate.when_to_load),
      evidence: mergeStringArrays(existing.evidence, candidate.evidence)
    };
    fs.writeFileSync(existing.file, renderMemoryNote(merged), "utf8");
    rebuildMemoryIndex(projectRoot);
    return {
      operation: "merged",
      note_id: existing.id,
      file: existing.file,
      scope,
      updated_at: updatedAt
    };
  }

  const noteId = nextMemoryId(notes.map((note) => note.id));
  const filename = `${noteId}.${slugify(candidate.title)}.md`;
  const file = path.join(memoryDir(projectRoot, scope), filename);
  const note = { ...candidate, id: noteId, file };
  fs.writeFileSync(file, renderMemoryNote(note), "utf8");
  rebuildMemoryIndex(projectRoot);
  return {
    operation: "created",
    note_id: noteId,
    file,
    scope,
    updated_at: updatedAt
  };
}

export function fingerprintMessages(messages) {
  const normalized = (messages || [])
    .map((message) => ({
      role: normalizeText(message.role),
      content: normalizeText(message.content)
    }))
    .filter((message) => message.role && message.content);
  return `sha256:${crypto
    .createHash("sha256")
    .update(JSON.stringify(normalized))
    .digest("hex")}`;
}

export function recordProcessedSession(projectRoot, sessionId, entry) {
  const state = readProcessedSessionsState(projectRoot);
  state.sessions[sessionId] = entry;
  writeProcessedSessionsState(projectRoot, state);
}

export function sectionList(sectionContent) {
  return sectionContent
    .split("\n")
    .map((line) => line.replace(/^\s*-\s+/, "").trim())
    .filter(Boolean);
}

export function renderTaskDocument(task) {
  const renderBullets = (items) => items.map((item) => `- ${item}`).join("\n");
  const memoryApplied = (task.memory_refs || []).length > 0
    ? `\n## Memory Applied\n\n${renderBullets(task.memory_refs)}\n`
    : "";
  return `# ${task.id} ${task.title}

## Goal

${task.goal}

## Scope

${renderBullets(task.scope)}

## Constraints

${renderBullets(task.constraints)}

## Acceptance Criteria

${renderBullets(task.acceptance_criteria)}${memoryApplied}`;
}

export function parseTaskDocument(content, file) {
  const normalized = content.replace(/\r\n/g, "\n");
  const titleMatch = /^#\s+(\d{3})\s+(.+)$/m.exec(normalized);
  if (!titleMatch) {
    throw new Error(`Task document title line is invalid: ${file}`);
  }
  const [, id, title] = titleMatch;
  const goal = extractSection(normalized, "Goal");
  const scope = sectionList(extractSection(normalized, "Scope"));
  const constraints = sectionList(extractSection(normalized, "Constraints"));
  const acceptanceCriteria = sectionList(extractSection(normalized, "Acceptance Criteria"));
  const memoryRefs = sectionList(extractSection(normalized, "Memory Applied"));
  return {
    id,
    title: normalizeText(title),
    goal,
    scope,
    constraints,
    acceptance_criteria: acceptanceCriteria,
    memory_refs: memoryRefs,
    file
  };
}

export function findTaskFile(projectRoot, taskId) {
  ensureLingxiLayout(projectRoot);
  const prefix = `${taskId}.task.`;
  const matches = fs.readdirSync(tasksDir(projectRoot)).filter((name) => name.startsWith(prefix));
  if (matches.length === 0) return null;
  return path.join(tasksDir(projectRoot), matches[0]);
}
