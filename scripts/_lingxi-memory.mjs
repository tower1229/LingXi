import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const INDEX_COLUMNS = ["Id", "Kind", "Title", "When to load", "Source", "UpdatedAt", "File"];
export const DISTILL_VERSION = "v1";
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
  const pattern = new RegExp(`^#{1,3} ${escapedHeading}\\n\\n([\\s\\S]*?)(?=\\n#{1,3} |$)`, "m");
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
  const kind = normalizeText(input.kind);
  if (!MEMORY_KIND_VALUES.has(kind)) {
    throw new Error(`Unsupported memory kind: ${kind}`);
  }
  const candidate = {
    title: normalizeText(input.title),
    kind,
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
      source: mergeStringArrays(String(existing.source || "").split(","), String(candidate.source || "").split(",")).join(", "),
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
  const memoryApplied = (task.memory_refs || []).length > 0
    ? `\n## 7. Memory Applied\n\n${renderBullets(task.memory_refs)}\n`
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

---

## 5. 约束

${renderBullets(task.constraints)}

---

## 6. 验收检查清单

${renderBullets(task.acceptance_criteria.map((item) => `[ ] ${item}`))}${memoryApplied}

## 8. 变更记录

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
  const constraints = sectionList(extractSection(normalized, "5. 约束"));
  const acceptanceChecklist = sectionList(extractSection(normalized, "6. 验收检查清单")).map((item) =>
    item.replace(/^\[\s\]\s*/, "").trim()
  );
  const memoryRefs = sectionList(extractSection(normalized, "7. Memory Applied"));
  const userStoryMatches = [...normalized.matchAll(/^###\s+US-(\d+)$/gm)];
  const userStories = userStoryMatches.map((match, index) => {
    const start = match.index ?? 0;
    const end = index + 1 < userStoryMatches.length
      ? (userStoryMatches[index + 1].index ?? normalized.length)
      : normalized.indexOf("\n---\n\n## 4. 功能需求");
    const block = normalized.slice(start, end === -1 ? normalized.length : end);
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
  const changelogSection = extractSection(normalized, "8. 变更记录");
  const changelog = [...changelogSection.matchAll(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/gm)]
    .map((match) => ({
      date: normalizeText(match[1]),
      source: normalizeText(match[2]),
      trigger: normalizeText(match[3]),
      summary: normalizeText(match[4]),
      related: normalizeText(match[5])
    }))
    .filter((row) => row.date !== "日期" && row.date !== "---" && row.date !== "-");
  const requirementMatches = [...normalized.matchAll(/^###\s+F(\d+):\s+(.+)$/gm)];
  const functionalRequirements = requirementMatches.map((match, index) => {
    const start = match.index ?? 0;
    const end = index + 1 < requirementMatches.length ? (requirementMatches[index + 1].index ?? normalized.length) : normalized.indexOf("\n---\n\n## 5. 约束");
    const block = normalized.slice(start, end === -1 ? normalized.length : end);
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
