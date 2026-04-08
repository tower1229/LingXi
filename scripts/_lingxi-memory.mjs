import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  governMemoryCandidates,
  rankRelevantMemories
} from "./_lingxi-memory-semantic.mjs";

export const INDEX_COLUMNS = ["Id", "Kind", "Title", "When to load", "Source", "UpdatedAt", "File"];
export const DISTILL_VERSION = "v1";
export const PROCESSED_SESSIONS_SCHEMA_VERSION = "v2";
export const MEMORY_KIND_VALUES = new Set([
  "preference",
  "constraint",
  "anti_pattern",
  "review_tendency",
  "heuristic"
]);
export const SESSION_RESULT_VALUES = new Set([
  "written",
  "merged",
  "skipped_no_signal",
  "skipped_duplicate",
  "failed"
]);

export const SESSION_RUN_REASON_VALUES = new Set([
  "first_distill",
  "content_changed",
  "distill_version_changed",
  "forced_reprocess",
  "duplicate_unchanged"
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

function readJsonFile(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function hasFile(projectRoot, file) {
  return fs.existsSync(path.join(projectRoot, file));
}

function summarizeStack(parts) {
  return [...new Set(parts.filter(Boolean))].join(" / ");
}

export function detectProjectContext(projectRoot) {
  const stack = [];
  const cues = [];
  let frontendStrength = 0;
  let backendStrength = 0;
  let docsStrength = 0;

  const packageJsonFile = path.join(projectRoot, "package.json");
  if (fs.existsSync(packageJsonFile)) {
    const pkg = readJsonFile(packageJsonFile);
    if (pkg) {
      stack.push("Node.js");
      cues.push("package.json");
      const deps = {
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {})
      };
      const depNames = Object.keys(deps);
      if (depNames.some((name) => /react|next|vue|nuxt|svelte|solid|vite/i.test(name))) frontendStrength += 2;
      if (depNames.some((name) => /express|koa|fastify|hono|nest|prisma|drizzle/i.test(name))) backendStrength += 2;
      if (depNames.some((name) => /docusaurus|vitepress|docsify|mdx|mkdocs/i.test(name))) docsStrength += 2;
    }
  }

  if (hasFile(projectRoot, "tsconfig.json")) {
    stack.push("TypeScript");
    cues.push("tsconfig.json");
  }
  if (hasFile(projectRoot, "next.config.js") || hasFile(projectRoot, "next.config.mjs")) {
    frontendStrength += 2;
    cues.push("next.config");
  }
  if (hasFile(projectRoot, "vite.config.js") || hasFile(projectRoot, "vite.config.ts")) {
    frontendStrength += 1;
    cues.push("vite.config");
  }
  if (hasFile(projectRoot, "pyproject.toml")) {
    stack.push("Python");
    cues.push("pyproject.toml");
    backendStrength += 1;
  }
  if (hasFile(projectRoot, "Cargo.toml")) {
    stack.push("Rust");
    cues.push("Cargo.toml");
    backendStrength += 1;
  }
  if (hasFile(projectRoot, "go.mod")) {
    stack.push("Go");
    cues.push("go.mod");
    backendStrength += 1;
  }
  if (hasFile(projectRoot, "README.md")) {
    cues.push("README.md");
    docsStrength += 1;
  }
  if (fs.existsSync(path.join(projectRoot, "docs"))) {
    cues.push("docs/");
    docsStrength += 1;
  }

  const kind =
    docsStrength > 0 && frontendStrength === 0 && backendStrength === 0
      ? "docs"
      : frontendStrength > 0 && backendStrength > 0
        ? "mixed"
        : frontendStrength > 0
          ? "frontend"
          : backendStrength > 0
            ? "backend"
            : "unknown";

  const stackSummary = summarizeStack(stack);
  const summary =
    cues.length === 0
      ? ""
      : kind === "docs"
        ? `Detected a documentation-oriented workspace${stackSummary ? ` built around ${stackSummary}` : ""}.`
        : kind === "frontend"
          ? `Detected a frontend-oriented workspace${stackSummary ? ` using ${stackSummary}` : ""}.`
          : kind === "backend"
            ? `Detected a backend-oriented workspace${stackSummary ? ` using ${stackSummary}` : ""}.`
            : kind === "mixed"
              ? `Detected a mixed frontend/backend workspace${stackSummary ? ` using ${stackSummary}` : ""}.`
              : `Detected workspace cues${stackSummary ? ` for ${stackSummary}` : ""}.`;

  const impact =
    cues.length === 0
      ? ""
      : kind === "frontend"
        ? "Prefer existing frontend structure and avoid inventing a parallel backend-heavy path."
        : kind === "backend"
          ? "Prefer existing service and contract boundaries instead of introducing UI-shaped scope."
          : kind === "docs"
            ? "Keep the task inside documentation surfaces unless the user explicitly expands scope."
            : "Prefer existing repo structure and avoid cross-stack rewrites unless they are explicitly required.";

  return {
    kind,
    stack: [...new Set(stack)],
    cues: [...new Set(cues)],
    summary,
    impact,
    frontend_strength: frontendStrength,
    backend_strength: backendStrength,
    docs_strength: docsStrength
  };
}

export function slugify(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "item";
}

export function ensureDirectoryPath(targetPath) {
  const resolved = path.resolve(targetPath);
  const parsed = path.parse(resolved);
  const relativeSegments = resolved
    .slice(parsed.root.length)
    .split(path.sep)
    .filter(Boolean);

  let current = parsed.root;
  for (const segment of relativeSegments) {
    current = path.join(current, segment);
    if (!fs.existsSync(current)) continue;
    const stat = fs.statSync(current);
    if (!stat.isDirectory()) {
      throw new Error(
        `LingXi cannot initialize because "${current}" exists as a file, but a directory is required there. Remove or rename that file and rerun bootstrap.`
      );
    }
  }

  fs.mkdirSync(resolved, { recursive: true });
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
    ensureDirectoryPath(dir);
  }
}

export function defaultProcessedSessionsState() {
  return {
    state_schema_version: PROCESSED_SESSIONS_SCHEMA_VERSION,
    distill_version: DISTILL_VERSION,
    summary: {
      tracked_sessions: 0,
      total_runs: 0,
      written_runs: 0,
      merged_runs: 0,
      skipped_duplicate_runs: 0,
      skipped_no_signal_runs: 0,
      failed_runs: 0,
      reprocessed_runs: 0
    },
    last_run: null,
    sessions: {}
  };
}

function normalizeProcessedSessionsSummary(summary, sessions) {
  return {
    tracked_sessions: Number.isInteger(summary?.tracked_sessions) ? summary.tracked_sessions : Object.keys(sessions).length,
    total_runs: Number.isInteger(summary?.total_runs) ? summary.total_runs : 0,
    written_runs: Number.isInteger(summary?.written_runs) ? summary.written_runs : 0,
    merged_runs: Number.isInteger(summary?.merged_runs) ? summary.merged_runs : 0,
    skipped_duplicate_runs: Number.isInteger(summary?.skipped_duplicate_runs) ? summary.skipped_duplicate_runs : 0,
    skipped_no_signal_runs: Number.isInteger(summary?.skipped_no_signal_runs) ? summary.skipped_no_signal_runs : 0,
    failed_runs: Number.isInteger(summary?.failed_runs) ? summary.failed_runs : 0,
    reprocessed_runs: Number.isInteger(summary?.reprocessed_runs) ? summary.reprocessed_runs : 0
  };
}

function normalizeLastRun(lastRun) {
  if (!lastRun || typeof lastRun !== "object") {
    return null;
  }
  return {
    occurred_at: normalizeText(lastRun.occurred_at),
    session_id: normalizeText(lastRun.session_id),
    operation: normalizeText(lastRun.operation),
    run_reason: normalizeText(lastRun.run_reason),
    content_fingerprint: normalizeText(lastRun.content_fingerprint),
    candidate_count: Number.isInteger(lastRun.candidate_count) ? lastRun.candidate_count : 0,
    note_count: Number.isInteger(lastRun.note_count) ? lastRun.note_count : 0
  };
}

function normalizeProcessedSessionEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  return {
    content_fingerprint: normalizeText(entry.content_fingerprint),
    distilled_at: normalizeText(entry.distilled_at),
    result: normalizeText(entry.result),
    run_reason: normalizeText(entry.run_reason),
    candidate_count: Number.isInteger(entry.candidate_count) ? entry.candidate_count : 0,
    notes: Array.isArray(entry.notes) ? entry.notes.map((item) => normalizeText(item)).filter(Boolean) : []
  };
}

function normalizeProcessedSessionsState(parsed) {
  const sessionsRaw = parsed?.sessions && typeof parsed.sessions === "object" ? parsed.sessions : {};
  const sessions = Object.fromEntries(
    Object.entries(sessionsRaw)
      .map(([sessionId, entry]) => [normalizeText(sessionId), normalizeProcessedSessionEntry(entry)])
      .filter(([sessionId, entry]) => sessionId && entry)
  );

  return {
    state_schema_version: String(parsed?.state_schema_version || PROCESSED_SESSIONS_SCHEMA_VERSION),
    distill_version: String(parsed?.distill_version || DISTILL_VERSION),
    summary: normalizeProcessedSessionsSummary(parsed?.summary, sessions),
    last_run: normalizeLastRun(parsed?.last_run),
    sessions
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
    return normalizeProcessedSessionsState(parsed);
  } catch {
    return defaultProcessedSessionsState();
  }
}

export function writeProcessedSessionsState(projectRoot, state) {
  ensureRuntimeState(projectRoot);
  const normalized = normalizeProcessedSessionsState(state);
  normalized.state_schema_version = PROCESSED_SESSIONS_SCHEMA_VERSION;
  normalized.distill_version = DISTILL_VERSION;
  normalized.summary.tracked_sessions = Object.keys(normalized.sessions).length;
  fs.writeFileSync(processedSessionsPath(projectRoot), JSON.stringify(normalized, null, 2) + "\n", "utf8");
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

export function latestTaskId(projectRoot) {
  ensureLingxiLayout(projectRoot);
  const ids = fs.readdirSync(tasksDir(projectRoot))
    .map((name) => /^(\d{3})\./.exec(name))
    .filter(Boolean)
    .map((match) => Number(match[1]));
  if (ids.length === 0) return null;
  return String(Math.max(...ids)).padStart(3, "0");
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
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(?:^|\\n)#{1,3} ${escapedHeading}\\n\\n([\\s\\S]*?)(?=\\n(?:---\\n\\n)?#{1,3} |\\s*$)`);
  const match = pattern.exec(body);
  return match ? match[1].trim() : "";
}

function extractTopLevelSection(body, heading) {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(?:^|\\n)## ${escapedHeading}\\n\\n([\\s\\S]*?)(?=\\n(?:---\\n\\n)?## |\\s*$)`);
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

export async function retrieveRelevantMemoryHits(projectRoot, query, limit = 3, context = {}) {
  ensureRuntimeState(projectRoot);
  const resolvedLimit = Number.isFinite(limit) && limit > 0 ? limit : 3;
  const notes = loadMemoryNotes(projectRoot);
  if (notes.length === 0) return [];

  const ranking = await rankRelevantMemories(projectRoot, query, notes, {
    limit: resolvedLimit,
    context
  });
  const noteById = new Map(notes.map((note) => [note.id, note]));
  return ranking.hits
    .map((hit) => {
      const note = noteById.get(hit.note_id);
      return note
        ? {
            ...note,
            score: hit.score,
            ranking_reason: hit.reason
          }
        : null;
    })
    .filter(Boolean);
}

export function formatMemoryRef(note) {
  const id = normalizeText(note?.id);
  const title = normalizeText(note?.title);
  const oneLiner = normalizeText(note?.one_liner);
  const whenToLoad = Array.isArray(note?.when_to_load) ? note.when_to_load.map((item) => normalizeText(item)).filter(Boolean) : [];
  const parts = [];
  if (id || title) {
    parts.push([id, title].filter(Boolean).join(" "));
  }
  if (oneLiner) {
    parts.push(oneLiner);
  }
  if (whenToLoad.length > 0) {
    parts.push(`When to load: ${whenToLoad.join("; ")}`);
  }
  return parts.join(" — ");
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

function resolveMemoryScope(value, fallback = "project") {
  const normalized = normalizeText(value || fallback);
  return normalized === "share" ? "share" : "project";
}

function normalizeMemoryCandidateInput(input, scope = "project") {
  const updatedAt = new Date().toISOString();
  const kind = normalizeText(input.kind);
  if (!MEMORY_KIND_VALUES.has(kind)) {
    throw new Error(`Unsupported memory kind: ${kind}`);
  }
  return {
    title: normalizeText(input.title),
    kind,
    scope: resolveMemoryScope(input.scope || input.reusability_scope || scope, scope),
    source: normalizeText(input.source),
    updated_at: updatedAt,
    when_to_load: mergeStringArrays(input.when_to_load || []),
    one_liner: normalizeText(input.one_liner),
    decision: normalizeText(input.decision),
    evidence: mergeStringArrays(input.evidence || []),
    confidence: typeof input.confidence === "number" ? input.confidence : undefined,
    durability_reason: normalizeText(input.durability_reason),
    reusability_scope: resolveMemoryScope(input.reusability_scope || input.scope || scope, scope)
  };
}

function writeMemoryNoteFile(projectRoot, note) {
  const filename = `${note.id}.${slugify(note.title)}.md`;
  const file = note.file || path.join(memoryDir(projectRoot, note.scope), filename);
  const noteWithFile = { ...note, file };
  fs.writeFileSync(file, renderMemoryNote(noteWithFile), "utf8");
  return noteWithFile;
}

function replaceWorkingNote(notes, updatedNote) {
  const index = notes.findIndex((note) => note.id === updatedNote.id);
  if (index === -1) {
    notes.push(updatedNote);
    return;
  }
  notes[index] = updatedNote;
}

export async function upsertMemoryNotes(projectRoot, inputs, defaultScope = "project") {
  ensureRuntimeState(projectRoot);
  const normalizedInputs = (inputs || []).map((input) => normalizeMemoryCandidateInput(input, defaultScope));
  if (normalizedInputs.length === 0) return [];
  const workingNotes = loadMemoryNotes(projectRoot);
  const results = new Array(normalizedInputs.length);
  let mutated = false;

  for (const scope of ["project", "share"]) {
    const entries = normalizedInputs
      .map((candidate, index) => ({ candidate, index }))
      .filter((entry) => entry.candidate.scope === scope);
    if (entries.length === 0) continue;

    const governance = await governMemoryCandidates(
      projectRoot,
      entries.map((entry) => entry.candidate),
      workingNotes,
      scope
    );
    const resolvedBatchTargets = new Map();

    governance.decisions.forEach((decision, localIndex) => {
      const { candidate, index } = entries[localIndex];
      const updatedAt = candidate.updated_at;

      if (decision.action === "skip_as_not_durable") {
        results[index] = {
          operation: "skipped",
          note_id: "",
          file: "",
          scope,
          updated_at: "",
          reason: decision.reason
        };
        return;
      }

      if (decision.action === "merge_into_existing") {
        const targetNote = decision.target_note_id
          ? workingNotes.find((note) => note.id === decision.target_note_id)
          : resolvedBatchTargets.get(decision.target_candidate_index);
        if (!targetNote) {
          throw new Error(
            decision.target_note_id
              ? `Memory governance merge target not found: ${decision.target_note_id}`
              : `Memory governance batch target not found: ${decision.target_candidate_index}`
          );
        }
        const mergedNote = writeMemoryNoteFile(projectRoot, {
          ...targetNote,
          title: normalizeText(decision.note.title),
          kind: normalizeText(decision.note.kind),
          scope,
          source: mergeStringArrays(
            String(targetNote.source || "").split(","),
            String(candidate.source || "").split(",")
          ).join(", "),
          updated_at: updatedAt,
          when_to_load: mergeStringArrays(decision.note.when_to_load || []),
          one_liner: normalizeText(decision.note.one_liner),
          decision: normalizeText(decision.note.decision),
          evidence: mergeStringArrays(decision.note.evidence || [])
        });
        replaceWorkingNote(workingNotes, mergedNote);
        resolvedBatchTargets.set(localIndex, mergedNote);
        mutated = true;
        results[index] = {
          operation: "merged",
          note_id: mergedNote.id,
          file: mergedNote.file,
          scope,
          updated_at: updatedAt
        };
        return;
      }

      const note = writeMemoryNoteFile(projectRoot, {
        id: nextMemoryId(workingNotes.map((item) => item.id)),
        title: normalizeText(decision.note.title),
        kind: normalizeText(decision.note.kind),
        scope,
        source: candidate.source,
        updated_at: updatedAt,
        when_to_load: mergeStringArrays(decision.note.when_to_load || []),
        one_liner: normalizeText(decision.note.one_liner),
        decision: normalizeText(decision.note.decision),
        evidence: mergeStringArrays(decision.note.evidence || [])
      });
      workingNotes.push(note);
      resolvedBatchTargets.set(localIndex, note);
      mutated = true;
      results[index] = {
        operation: "created",
        note_id: note.id,
        file: note.file,
        scope,
        updated_at: updatedAt
      };
    });
  }

  if (mutated) {
    rebuildMemoryIndex(projectRoot);
  }
  return results;
}

export async function upsertMemoryNote(projectRoot, input, scope = "project") {
  const [result] = await upsertMemoryNotes(projectRoot, [input], scope);
  return result;
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

export function recordProcessedSession(projectRoot, sessionId, entry, runMeta = null) {
  const state = readProcessedSessionsState(projectRoot);
  state.state_schema_version = PROCESSED_SESSIONS_SCHEMA_VERSION;
  state.distill_version = DISTILL_VERSION;
  state.sessions[sessionId] = normalizeProcessedSessionEntry(entry);
  state.summary.tracked_sessions = Object.keys(state.sessions).length;

  if (runMeta && typeof runMeta === "object") {
    state.summary.total_runs += 1;
    if (runMeta.operation === "written") state.summary.written_runs += 1;
    if (runMeta.operation === "merged") state.summary.merged_runs += 1;
    if (runMeta.operation === "skipped_duplicate") state.summary.skipped_duplicate_runs += 1;
    if (runMeta.operation === "skipped_no_signal") state.summary.skipped_no_signal_runs += 1;
    if (runMeta.operation === "failed") state.summary.failed_runs += 1;
    if (runMeta.run_reason && runMeta.run_reason !== "first_distill" && runMeta.run_reason !== "duplicate_unchanged") {
      state.summary.reprocessed_runs += 1;
    }
    state.last_run = normalizeLastRun({
      occurred_at: runMeta.occurred_at || new Date().toISOString(),
      session_id: sessionId,
      operation: runMeta.operation,
      run_reason: runMeta.run_reason,
      content_fingerprint: runMeta.content_fingerprint,
      candidate_count: runMeta.candidate_count,
      note_count: runMeta.note_count
    });
  }

  writeProcessedSessionsState(projectRoot, state);
}

export function sectionList(sectionContent) {
  return sectionContent
    .split("\n")
    .map((line) => line.replace(/^\s*-\s+/, "").trim())
    .filter(Boolean);
}

const GUIDANCE_TITLE_BY_KIND = {
  frontend_guidance: "前端实现指导",
  backend_contract_guidance: "契约与边界指导",
  integration_guidance: "集成与回滚指导",
  docs_delivery_guidance: "文档交付指导",
  sdk_surface_guidance: "SDK / Surface 指导",
  risk_guidance: "风险与收口指导"
};

function normalizeGuidanceBlocks(blocks) {
  const out = [];
  const seen = new Set();
  for (const block of blocks || []) {
    const kind = normalizeText(block?.kind);
    const title = normalizeText(block?.title) || GUIDANCE_TITLE_BY_KIND[kind] || "";
    const bullets = (block?.bullets || []).map((item) => normalizeText(item)).filter(Boolean);
    if (!kind || !title || bullets.length === 0) continue;
    if (seen.has(kind)) continue;
    seen.add(kind);
    out.push({
      kind,
      title,
      bullets
    });
  }
  return out;
}

function guidanceKindFromTitle(title) {
  const normalized = normalizeText(title);
  const matched = Object.entries(GUIDANCE_TITLE_BY_KIND).find(([, label]) => label === normalized);
  if (matched) return matched[0];
  if (/前端|状态|交互/i.test(normalized)) return "frontend_guidance";
  if (/契约|边界|contract/i.test(normalized)) return "backend_contract_guidance";
  if (/集成|回滚|integration/i.test(normalized)) return "integration_guidance";
  if (/文档|交付|reader|读者/i.test(normalized)) return "docs_delivery_guidance";
  if (/sdk|surface|api|兼容/i.test(normalized)) return "sdk_surface_guidance";
  if (/风险|收口|risk/i.test(normalized)) return "risk_guidance";
  return "";
}

function parseGuidanceBlocks(sectionContent) {
  const normalized = normalizeText(sectionContent) ? sectionContent.replace(/\r\n/g, "\n") : "";
  if (!normalized) return [];
  const blockPattern = /(?:<!--\s*lingxi_guidance_kind:\s*([a-z_]+)\s*-->\n)?###\s+(.+)\n([\s\S]*?)(?=(?:\n<!--\s*lingxi_guidance_kind:|\n###\s+)|\s*$)/g;
  return [...normalized.matchAll(blockPattern)].map((match) => {
    const explicitKind = normalizeText(match[1] || "");
    const title = normalizeText(match[2]);
    return {
      kind: explicitKind || guidanceKindFromTitle(title),
      title,
      bullets: sectionList(match[3] || "")
    };
  }).filter((item) => item.kind && item.bullets.length > 0);
}

export function renderTaskDocument(task) {
  const renderBullets = (items) => (items || []).map((item) => `- ${item}`).join("\n");
  const renderRequirements = (requirements) =>
    (requirements || [])
      .map(
        (req, index) => `### F${index + 1}: ${req.title}

- 需求描述：${req.description}
- 实现方案：${req.implementation_scheme}
- 验收标准：
${(req.acceptance_criteria || []).map((item) => `  - ${item}`).join("\n")}
- 验证方式：${req.verification_method}
- 边界/异常：
${(req.edge_cases || []).map((item) => `  - ${item}`).join("\n")}
- 证据形式：${req.evidence}
- 优先级：${req.priority}`
      )
      .join("\n\n");
  const renderStories = (stories) =>
    (stories || [])
      .map(
        (story, index) => `### US-${index + 1}

- 作为：${story.as_a}
- 我想要：${story.i_want}
- 以便：${story.so_that}
- 验收标准：
${(story.acceptance_criteria || []).map((item) => `  - ${item}`).join("\n")}`
      )
      .join("\n\n");
  const guidanceBlocks = normalizeGuidanceBlocks(task.guidance_blocks || []);
  const renderGuidance = (blocks) =>
    blocks
      .map((block) => `<!-- lingxi_guidance_kind: ${block.kind} -->\n### ${block.title}\n\n${renderBullets(block.bullets)}`)
      .join("\n\n");
  const hasGuidance = guidanceBlocks.length > 0;
  const constraintsSectionNumber = hasGuidance ? 6 : 5;
  const acceptanceSectionNumber = hasGuidance ? 7 : 6;
  const memorySectionNumber = hasGuidance ? 8 : 7;
  const changelogSectionNumber = hasGuidance ? 9 : 8;
  const guidanceSection = hasGuidance
    ? `\n---\n\n## 5. 开发指导\n\n${renderGuidance(guidanceBlocks)}\n`
    : "";
  const memoryApplied = (task.memory_refs || []).length > 0
    ? `\n## ${memorySectionNumber}. Memory Applied\n\n${renderBullets(task.memory_refs)}\n`
    : "";
  const projectContext = task.project_context?.summary
    ? `### 1.0 项目上下文\n\n- 栈概览：${task.project_context.summary}\n- 线索：${(task.project_context.cues || []).join(", ")}\n- 对本任务的影响：${task.project_context.impact}\n\n`
    : "";
  const tagsLine = (task.tags || []).length > 0 ? `| 特性标签 | ${(task.tags || []).join(" / ")} |` : "";
  const changelogRows = (task.changelog || []).length > 0
    ? (task.changelog || [])
        .map((item) => `| ${item.date} | ${item.source} | ${item.trigger} | ${item.summary} | ${item.related || ""} |`)
        .join("\n")
    : "| - | - | - | - | - |";
  return `# ${task.id}.task.${slugify(task.title)}.md

| 属性 | 值 |
| --- | --- |
| 版本 | ${task.version} |
| 状态 | ${task.status} |
| 创建日期 | ${task.created_at} |
| 需求类型 | ${task.type} |
| 复杂度 | ${task.complexity} |
${tagsLine}

---

## 1. 概述

${projectContext}### 1.1 背景

${task.background}

### 1.2 问题描述

${task.problem}

### 1.3 解决方案概述

${task.solution_overview}

---

## 2. 目标与指标

### 2.1 目标

${renderBullets(task.goals)}

### 2.2 非目标

${renderBullets(task.non_goals)}

### 2.3 成功标准

${renderBullets(task.success_criteria)}

---

## 3. 用户故事

${renderStories(task.user_stories)}

---

## 4. 功能需求

${renderRequirements(task.functional_requirements)}
${guidanceSection}

---

## ${constraintsSectionNumber}. 约束

${renderBullets(task.constraints)}

---

## ${acceptanceSectionNumber}. 验收检查清单

${renderBullets(task.acceptance_criteria.map((item) => `[ ] ${item}`))}${memoryApplied}

## ${changelogSectionNumber}. 变更记录

| 日期 | 来源 | 触发 | 变更摘要 | 关联维度/问题 |
| --- | --- | --- | --- | --- |
${changelogRows}
`;
}

export function parseTaskDocument(content, file) {
  const normalized = content.replace(/\r\n/g, "\n");
  const titleMatch = /^#\s+(\d{3})\.task\.(.+)\.md$/m.exec(normalized);
  if (!titleMatch) {
    throw new Error(`Task document title line is invalid: ${file}`);
  }
  const [, id, title] = titleMatch;
  const metadata = {};
  for (const line of normalized.split("\n")) {
    const match = /^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/.exec(line);
    if (!match) continue;
    const key = normalizeText(match[1]);
    const value = normalizeText(match[2]);
    if (key === "属性" || key === "---") continue;
    metadata[key] = value;
  }
  const goals = sectionList(extractSection(normalized, "2.1 目标"));
  const nonGoals = sectionList(extractSection(normalized, "2.2 非目标"));
  const successCriteria = sectionList(extractSection(normalized, "2.3 成功标准"));
  const guidanceBlocks = parseGuidanceBlocks(extractTopLevelSection(normalized, "5. 开发指导"));
  const constraints = sectionList(extractSection(normalized, "6. 约束") || extractSection(normalized, "5. 约束"));
  const acceptanceChecklist = sectionList(extractSection(normalized, "7. 验收检查清单") || extractSection(normalized, "6. 验收检查清单")).map((item) =>
    item.replace(/^\[\s\]\s*/, "").trim()
  );
  const memoryRefs = sectionList(extractSection(normalized, "8. Memory Applied") || extractSection(normalized, "7. Memory Applied"));
  const userStoriesSection = extractTopLevelSection(normalized, "3. 用户故事");
  const userStoryMatches = [...userStoriesSection.matchAll(/^###\s+US-(\d+)$/gm)];
  const userStories = userStoryMatches.map((match, index) => {
    const start = match.index ?? 0;
    const end = index + 1 < userStoryMatches.length
      ? (userStoryMatches[index + 1].index ?? userStoriesSection.length)
      : userStoriesSection.length;
    const block = userStoriesSection.slice(start, end === -1 ? userStoriesSection.length : end);
    const field = (label) => {
      const regex = new RegExp(`- ${label}：(.+)`);
      const matched = regex.exec(block);
      return matched ? normalizeText(matched[1]) : "";
    };
    const acceptance = /- 验收标准：\n([\s\S]*?)(?=\n- [^\n]+：|$)/.exec(block);
    return {
      id: `US-${match[1]}`,
      as_a: field("作为"),
      i_want: field("我想要"),
      so_that: field("以便"),
      acceptance_criteria: acceptance ? sectionList(acceptance[1]) : []
    };
  });
  const changelogSection = extractSection(normalized, "9. 变更记录") || extractSection(normalized, "8. 变更记录");
  const changelog = [...changelogSection.matchAll(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/gm)]
    .map((match) => ({
      date: normalizeText(match[1]),
      source: normalizeText(match[2]),
      trigger: normalizeText(match[3]),
      summary: normalizeText(match[4]),
      related: normalizeText(match[5])
    }))
    .filter((row) => row.date !== "日期" && row.date !== "---" && row.date !== "-");
  const requirementsSection = extractTopLevelSection(normalized, "4. 功能需求");
  const requirementMatches = [...requirementsSection.matchAll(/^###\s+F(\d+):\s+(.+)$/gm)];
  const functionalRequirements = requirementMatches.map((match, index) => {
    const start = match.index ?? 0;
    const end = index + 1 < requirementMatches.length ? (requirementMatches[index + 1].index ?? requirementsSection.length) : requirementsSection.length;
    const block = requirementsSection.slice(start, end === -1 ? requirementsSection.length : end);
    const field = (label) => {
      const regex = new RegExp(`- ${label}：(.+)`);
      const matched = regex.exec(block);
      return matched ? normalizeText(matched[1]) : "";
    };
    const listField = (label) => {
      const regex = new RegExp(`- ${label}：\\n([\\s\\S]*?)(?=\\n- [^\\n]+：|$)`);
      const matched = regex.exec(block);
      return matched ? sectionList(matched[1]) : [];
    };
    return {
      id: `F${match[1]}`,
      title: normalizeText(match[2]),
      description: field("需求描述"),
      implementation_scheme: field("实现方案"),
      acceptance_criteria: listField("验收标准"),
      verification_method: field("验证方式"),
      edge_cases: listField("边界/异常"),
      evidence: field("证据形式"),
      priority: field("优先级")
    };
  });
  return {
    id,
    title: title.replaceAll("-", " "),
    version: metadata["版本"] || "1.0",
    status: metadata["状态"] || "草稿",
    created_at: metadata["创建日期"] || "",
    type: metadata["需求类型"] || "简单功能",
    complexity: metadata["复杂度"] || "简单",
    tags: metadata["特性标签"]
      ? metadata["特性标签"] === "库/SDK"
        ? ["库/SDK"]
        : metadata["特性标签"].split("/").map((item) => normalizeText(item)).filter(Boolean)
      : [],
    project_context: extractSection(normalized, "1.0 项目上下文"),
    background: extractSection(normalized, "1.1 背景"),
    problem: extractSection(normalized, "1.2 问题描述"),
    solution_overview: extractSection(normalized, "1.3 解决方案概述"),
    goals,
    non_goals: nonGoals,
    success_criteria: successCriteria,
    user_stories: userStories,
    guidance_blocks: guidanceBlocks,
    constraints,
    acceptance_criteria: acceptanceChecklist,
    memory_refs: memoryRefs,
    functional_requirements: functionalRequirements,
    changelog,
    file
  };
}

export function incrementVersion(version) {
  const normalized = normalizeText(version || "1.0");
  const match = /^(\d+)\.(\d+)$/.exec(normalized);
  if (!match) return "1.1";
  const major = Number(match[1]);
  const minor = Number(match[2]) + 1;
  return `${major}.${minor}`;
}

export function findTaskFile(projectRoot, taskId) {
  ensureLingxiLayout(projectRoot);
  const prefix = `${taskId}.task.`;
  const matches = fs.readdirSync(tasksDir(projectRoot)).filter((name) => name.startsWith(prefix));
  if (matches.length === 0) return null;
  return path.join(tasksDir(projectRoot), matches[0]);
}
