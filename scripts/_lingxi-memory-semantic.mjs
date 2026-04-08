import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import {
  MEMORY_DISTILL_CANDIDATE_SET_SCHEMA_VERSION,
  assertValidMemoryDistillCandidateSet,
  memoryDistillCandidateSetJsonSchema
} from "../skills/session-distill/scripts/memory-distill-candidate-set.mjs";

const MEMORY_SEMANTIC_RESPONSE_VERSION = "draft-2026-04-08";
const GOVERNANCE_ACTION_VALUES = new Set(["create", "merge_into_existing", "skip_as_not_durable"]);
const MEMORY_KIND_VALUES = new Set([
  "preference",
  "constraint",
  "anti_pattern",
  "review_tendency",
  "heuristic"
]);
const MEMORY_SCOPE_VALUES = new Set(["project", "share"]);
let cachedRunnerPromise = null;
let cachedRunnerKey = "";

function normalizeText(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueStrings(values) {
  const out = [];
  const seen = new Set();
  for (const value of values || []) {
    const normalized = normalizeText(value);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out;
}

function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => isNonEmptyString(item));
}

function isConfidence(value) {
  return typeof value === "number" && !Number.isNaN(value) && value >= 0 && value <= 1;
}

function buildGovernanceSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["schema_version", "action", "reason", "confidence"],
    properties: {
      schema_version: { const: MEMORY_SEMANTIC_RESPONSE_VERSION },
      action: { type: "string", enum: [...GOVERNANCE_ACTION_VALUES] },
      reason: { type: "string", minLength: 1 },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      target_note_id: { type: "string", minLength: 1 },
      note: {
        type: "object",
        additionalProperties: false,
        required: ["title", "kind", "one_liner", "decision", "when_to_load", "evidence"],
        properties: {
          title: { type: "string", minLength: 1 },
          kind: { type: "string", enum: [...MEMORY_KIND_VALUES] },
          one_liner: { type: "string", minLength: 1 },
          decision: { type: "string", minLength: 1 },
          when_to_load: {
            type: "array",
            minItems: 1,
            items: { type: "string", minLength: 1 }
          },
          evidence: {
            type: "array",
            minItems: 1,
            items: { type: "string", minLength: 1 }
          }
        }
      }
    }
  };
}

function buildRankingSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["schema_version", "query", "hits"],
    properties: {
      schema_version: { const: MEMORY_SEMANTIC_RESPONSE_VERSION },
      query: { type: "string" },
      hits: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["note_id", "score", "reason"],
          properties: {
            note_id: { type: "string", minLength: 1 },
            score: { type: "integer", minimum: 1, maximum: 100 },
            reason: { type: "string", minLength: 1 }
          }
        }
      }
    }
  };
}

function buildGovernanceBatchSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["schema_version", "decisions"],
    properties: {
      schema_version: { const: MEMORY_SEMANTIC_RESPONSE_VERSION },
      decisions: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["action", "reason", "confidence"],
          properties: {
            action: { type: "string", enum: [...GOVERNANCE_ACTION_VALUES] },
            reason: { type: "string", minLength: 1 },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            target_note_id: { type: "string", minLength: 1 },
            target_candidate_index: { type: "integer", minimum: 0 },
            note: {
              type: "object",
              additionalProperties: false,
              required: ["title", "kind", "one_liner", "decision", "when_to_load", "evidence"],
              properties: {
                title: { type: "string", minLength: 1 },
                kind: { type: "string", enum: [...MEMORY_KIND_VALUES] },
                one_liner: { type: "string", minLength: 1 },
                decision: { type: "string", minLength: 1 },
                when_to_load: {
                  type: "array",
                  minItems: 1,
                  items: { type: "string", minLength: 1 }
                },
                evidence: {
                  type: "array",
                  minItems: 1,
                  items: { type: "string", minLength: 1 }
                }
              }
            }
          }
        }
      }
    }
  };
}

function stripFileFields(notes) {
  return (notes || []).map((note) => ({
    id: normalizeText(note.id),
    title: normalizeText(note.title),
    kind: normalizeText(note.kind),
    scope: normalizeText(note.scope),
    source: normalizeText(note.source),
    updated_at: normalizeText(note.updated_at),
    when_to_load: uniqueStrings(note.when_to_load || []),
    one_liner: normalizeText(note.one_liner),
    decision: normalizeText(note.decision),
    evidence: uniqueStrings(note.evidence || [])
  }));
}

function validateSemanticNote(note, pathLabel = "note") {
  if (!isPlainObject(note)) {
    throw new Error(`${pathLabel} must be an object.`);
  }
  if (!isNonEmptyString(note.title)) {
    throw new Error(`${pathLabel}.title must be a non-empty string.`);
  }
  if (!MEMORY_KIND_VALUES.has(note.kind)) {
    throw new Error(`${pathLabel}.kind must be one of: ${[...MEMORY_KIND_VALUES].join(", ")}.`);
  }
  if (!isNonEmptyString(note.one_liner)) {
    throw new Error(`${pathLabel}.one_liner must be a non-empty string.`);
  }
  if (!isNonEmptyString(note.decision)) {
    throw new Error(`${pathLabel}.decision must be a non-empty string.`);
  }
  if (!isStringArray(note.when_to_load) || note.when_to_load.length === 0) {
    throw new Error(`${pathLabel}.when_to_load must be a non-empty string array.`);
  }
  if (!isStringArray(note.evidence) || note.evidence.length === 0) {
    throw new Error(`${pathLabel}.evidence must be a non-empty string array.`);
  }
}

function assertValidGovernanceDecision(value, existingNotes, options = {}) {
  if (!isPlainObject(value)) {
    throw new Error("Memory governance result must be an object.");
  }
  if (value.schema_version !== MEMORY_SEMANTIC_RESPONSE_VERSION) {
    throw new Error(`Memory governance result schema_version must equal ${MEMORY_SEMANTIC_RESPONSE_VERSION}.`);
  }
  if (!GOVERNANCE_ACTION_VALUES.has(value.action)) {
    throw new Error(`Memory governance result action must be one of: ${[...GOVERNANCE_ACTION_VALUES].join(", ")}.`);
  }
  if (!isNonEmptyString(value.reason)) {
    throw new Error("Memory governance result reason must be a non-empty string.");
  }
  if (!isConfidence(value.confidence)) {
    throw new Error("Memory governance result confidence must be a number between 0 and 1.");
  }
  if (value.action === "create" || value.action === "merge_into_existing") {
    validateSemanticNote(value.note, "Memory governance result note");
  }
  if (value.action === "merge_into_existing") {
    const targetNoteId = normalizeText(value.target_note_id);
    const allowCandidateTarget = Boolean(options.allowCandidateTarget);
    const hasTargetCandidateIndex = Number.isInteger(value.target_candidate_index);
    if (!targetNoteId && !allowCandidateTarget) {
      throw new Error("Memory governance merge result must include target_note_id.");
    }
    if (!targetNoteId && allowCandidateTarget && !hasTargetCandidateIndex) {
      throw new Error("Memory governance merge result must include target_note_id or target_candidate_index.");
    }
    if (targetNoteId && !(existingNotes || []).some((note) => normalizeText(note.id) === targetNoteId)) {
      throw new Error(`Memory governance merge target does not exist: ${targetNoteId}.`);
    }
  }
}

function assertValidRankingResult(value, notes, limit) {
  if (!isPlainObject(value)) {
    throw new Error("Memory ranking result must be an object.");
  }
  if (value.schema_version !== MEMORY_SEMANTIC_RESPONSE_VERSION) {
    throw new Error(`Memory ranking result schema_version must equal ${MEMORY_SEMANTIC_RESPONSE_VERSION}.`);
  }
  if (typeof value.query !== "string") {
    throw new Error("Memory ranking result query must be a string.");
  }
  if (!Array.isArray(value.hits)) {
    throw new Error("Memory ranking result hits must be an array.");
  }
  if (value.hits.length > limit) {
    throw new Error(`Memory ranking result returned ${value.hits.length} hits; limit is ${limit}.`);
  }
  const noteIds = new Set((notes || []).map((note) => normalizeText(note.id)));
  const seen = new Set();
  value.hits.forEach((hit, index) => {
    if (!isPlainObject(hit)) {
      throw new Error(`Memory ranking hit[${index}] must be an object.`);
    }
    if (!isNonEmptyString(hit.note_id) || !noteIds.has(normalizeText(hit.note_id))) {
      throw new Error(`Memory ranking hit[${index}].note_id must reference an existing note.`);
    }
    if (!Number.isInteger(hit.score) || hit.score < 1 || hit.score > 100) {
      throw new Error(`Memory ranking hit[${index}].score must be an integer between 1 and 100.`);
    }
    if (!isNonEmptyString(hit.reason)) {
      throw new Error(`Memory ranking hit[${index}].reason must be a non-empty string.`);
    }
    const key = normalizeText(hit.note_id);
    if (seen.has(key)) {
      throw new Error(`Memory ranking returned duplicate note_id: ${key}.`);
    }
    seen.add(key);
  });
}

function assertValidGovernanceBatchResult(value, candidates, existingNotes) {
  if (!isPlainObject(value)) {
    throw new Error("Memory batch governance result must be an object.");
  }
  if (value.schema_version !== MEMORY_SEMANTIC_RESPONSE_VERSION) {
    throw new Error(`Memory batch governance result schema_version must equal ${MEMORY_SEMANTIC_RESPONSE_VERSION}.`);
  }
  if (!Array.isArray(value.decisions)) {
    throw new Error("Memory batch governance result decisions must be an array.");
  }
  if (value.decisions.length !== (candidates || []).length) {
    throw new Error(
      `Memory batch governance result returned ${value.decisions.length} decisions for ${(candidates || []).length} candidates.`
    );
  }
  const existingIds = new Set((existingNotes || []).map((note) => normalizeText(note.id)));
  value.decisions.forEach((decision, index) => {
    if (!isPlainObject(decision)) {
      throw new Error(`Memory batch governance decision[${index}] must be an object.`);
    }
    if (!GOVERNANCE_ACTION_VALUES.has(decision.action)) {
      throw new Error(`Memory batch governance decision[${index}] action must be one of: ${[...GOVERNANCE_ACTION_VALUES].join(", ")}.`);
    }
    if (!isNonEmptyString(decision.reason)) {
      throw new Error(`Memory batch governance decision[${index}] reason must be a non-empty string.`);
    }
    if (!isConfidence(decision.confidence)) {
      throw new Error(`Memory batch governance decision[${index}] confidence must be a number between 0 and 1.`);
    }
    if (decision.action === "create" || decision.action === "merge_into_existing") {
      validateSemanticNote(decision.note, `Memory batch governance decision[${index}].note`);
    }
    if (decision.action !== "merge_into_existing") {
      if (decision.target_candidate_index != null) {
        throw new Error(`Memory batch governance decision[${index}] cannot set target_candidate_index unless action is merge_into_existing.`);
      }
      return;
    }
    const hasTargetNoteId = isNonEmptyString(decision.target_note_id);
    const hasTargetCandidateIndex = Number.isInteger(decision.target_candidate_index);
    if (hasTargetNoteId && hasTargetCandidateIndex) {
      throw new Error(`Memory batch governance decision[${index}] must target either target_note_id or target_candidate_index, not both.`);
    }
    if (!hasTargetNoteId && !hasTargetCandidateIndex) {
      throw new Error(`Memory batch governance decision[${index}] must include target_note_id or target_candidate_index.`);
    }
    if (hasTargetNoteId && !existingIds.has(normalizeText(decision.target_note_id))) {
      throw new Error(`Memory batch governance decision[${index}] target_note_id must reference an existing note.`);
    }
    if (hasTargetCandidateIndex) {
      if (decision.target_candidate_index >= index) {
        throw new Error(`Memory batch governance decision[${index}] target_candidate_index must reference an earlier candidate.`);
      }
    }
  });
}

function distillPrompt(payload) {
  return [
    "You are LingXi's memory semantic engine for session distillation.",
    "Your job is to extract only durable, reusable engineering taste from the provided historical Codex session.",
    "Reject one-off implementation chatter, transient debugging detail, and generic conversation summaries.",
    "Return JSON only. Do not use shell commands or tools.",
    "Prefer precision over recall. If there is no durable engineering taste, return an empty candidates array.",
    "",
    "Output rules:",
    `- schema_version must be ${MEMORY_DISTILL_CANDIDATE_SET_SCHEMA_VERSION}`,
    `- distill_version must be ${payload.distill_version}`,
    `- allowed candidate kinds: ${[...MEMORY_KIND_VALUES].join(", ")}`,
    `- allowed reusability_scope values: ${[...MEMORY_SCOPE_VALUES].join(", ")}`,
    "",
    "Input JSON:",
    JSON.stringify(payload, null, 2)
  ].join("\n");
}

function governancePrompt(payload) {
  return [
    "You are LingXi's memory governance engine.",
    "Decide whether the candidate should create a new memory note, merge into an existing note, or be skipped as not durable enough.",
    "Base the decision on semantic meaning, not wording overlap.",
    "Merge materially identical or stronger rephrasings into the same note.",
    "Skip noisy or one-off candidate content.",
    "Return JSON only. Do not use shell commands or tools.",
    "",
    "Output rules:",
    `- schema_version must be ${MEMORY_SEMANTIC_RESPONSE_VERSION}`,
    `- action must be one of: ${[...GOVERNANCE_ACTION_VALUES].join(", ")}`,
    `- note.kind must be one of: ${[...MEMORY_KIND_VALUES].join(", ")}`,
    "",
    "Input JSON:",
    JSON.stringify(payload, null, 2)
  ].join("\n");
}

function governanceBatchPrompt(payload) {
  return [
    "You are LingXi's memory governance engine.",
    "Process the candidate list sequentially and return one governance decision per candidate in the same order as input.",
    "Decide whether each candidate should create a new memory note, merge into an existing note, or be skipped as not durable enough.",
    "Base the decision on semantic meaning, not wording overlap.",
    "Merge materially identical or stronger rephrasings into the same note.",
    "If a later candidate should merge into a note created earlier in this same batch, set target_candidate_index to that earlier candidate index and omit target_note_id.",
    "Skip noisy or one-off candidate content.",
    "Return JSON only. Do not use shell commands or tools.",
    "",
    "Output rules:",
    `- schema_version must be ${MEMORY_SEMANTIC_RESPONSE_VERSION}`,
    "- decisions must be in the same order as input candidates",
    `- each decision.action must be one of: ${[...GOVERNANCE_ACTION_VALUES].join(", ")}`,
    `- each decision.note.kind must be one of: ${[...MEMORY_KIND_VALUES].join(", ")}`,
    "",
    "Input JSON:",
    JSON.stringify(payload, null, 2)
  ].join("\n");
}

function retrievalPrompt(payload) {
  return [
    "You are LingXi's memory retrieval engine.",
    "Select only the smallest useful set of notes that should materially shape the current task or vet work.",
    "Rank by semantic relevance, not keyword overlap alone.",
    "Prefer project memory over share memory when relevance is otherwise similar.",
    "Return JSON only. Do not use shell commands or tools.",
    "",
    "Output rules:",
    `- schema_version must be ${MEMORY_SEMANTIC_RESPONSE_VERSION}`,
    `- return at most ${payload.limit} hits`,
    "- each hit must reference an existing note_id from the input",
    "",
    "Input JSON:",
    JSON.stringify(payload, null, 2)
  ].join("\n");
}

function writeTempJson(prefix, value) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
  const file = path.join(dir, "payload.json");
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf8");
  return { dir, file };
}

function removeTempDir(dir) {
  if (dir && fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function resolveCodexBin() {
  return process.env.LINGXI_MEMORY_SEMANTIC_CODEX_BIN || "codex";
}

function runCodexStructuredOutput(projectRoot, prompt, schema, operation) {
  const schemaTmp = writeTempJson("lingxi-memory-schema", schema);
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "lingxi-memory-output-"));
  const outputFile = path.join(outputDir, "response.json");
  try {
    const result = spawnSync(
      resolveCodexBin(),
      [
        "exec",
        "-C",
        projectRoot,
        "--skip-git-repo-check",
        "-s",
        "read-only",
        "-a",
        "never",
        "--color",
        "never",
        "--output-schema",
        schemaTmp.file,
        "-o",
        outputFile,
        "-"
      ],
      {
        cwd: projectRoot,
        input: prompt,
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024
      }
    );
    if (result.error) {
      throw result.error;
    }
    if (result.status !== 0) {
      throw new Error(
        `codex exec failed for ${operation}: ${normalizeText(result.stderr) || normalizeText(result.stdout) || "unknown error"}`
      );
    }
    const raw = fs.readFileSync(outputFile, "utf8").trim();
    if (!raw) {
      throw new Error(`codex exec returned an empty response for ${operation}.`);
    }
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Memory semantic engine failed for ${operation}: ${error.message}`);
  } finally {
    removeTempDir(schemaTmp.dir);
    removeTempDir(outputDir);
  }
}

async function loadRunnerFromModule(modulePath) {
  const imported = await import(pathToFileURL(path.resolve(modulePath)).href);
  const runner =
    imported.runMemorySemanticTask ||
    imported.default?.runMemorySemanticTask ||
    imported.default;
  if (typeof runner !== "function") {
    throw new Error(`Memory semantic runner module must export runMemorySemanticTask(): ${modulePath}`);
  }
  return runner;
}

async function resolveRunner() {
  const customRunnerModule = normalizeText(process.env.LINGXI_MEMORY_SEMANTIC_RUNNER_MODULE);
  const cacheKey = customRunnerModule || "__codex_exec__";
  if (!cachedRunnerPromise || cachedRunnerKey !== cacheKey) {
    cachedRunnerKey = cacheKey;
    cachedRunnerPromise = (async () => {
      if (customRunnerModule) {
        return loadRunnerFromModule(customRunnerModule);
      }
      return async ({ operation, projectRoot, payload, schema, prompt }) =>
        runCodexStructuredOutput(projectRoot, prompt, schema, operation, payload);
    })();
  }
  return cachedRunnerPromise;
}

async function runSemanticOperation({ operation, projectRoot, payload, schema, prompt }) {
  const runner = await resolveRunner();
  return runner({
    operation,
    projectRoot,
    payload,
    schema,
    prompt
  });
}

export async function distillSessionToCandidates(projectRoot, session) {
  const payload = {
    session_id: normalizeText(session.session_id),
    content_fingerprint: normalizeText(session.content_fingerprint),
    distill_version: normalizeText(session.distill_version),
    messages: (session.messages || []).map((message) => ({
      role: normalizeText(message.role),
      content: normalizeText(message.content)
    }))
  };
  const result = await runSemanticOperation({
    operation: "distill",
    projectRoot,
    payload,
    schema: memoryDistillCandidateSetJsonSchema(),
    prompt: distillPrompt(payload)
  });
  assertValidMemoryDistillCandidateSet(result);
  return result;
}

export async function governMemoryCandidate(projectRoot, candidate, existingNotes, scope = "project") {
  const resolvedScope = MEMORY_SCOPE_VALUES.has(scope) ? scope : "project";
  const payload = {
    candidate: {
      title: normalizeText(candidate.title),
      kind: normalizeText(candidate.kind),
      scope: resolvedScope,
      one_liner: normalizeText(candidate.one_liner),
      decision: normalizeText(candidate.decision),
      when_to_load: uniqueStrings(candidate.when_to_load || []),
      evidence: uniqueStrings(candidate.evidence || []),
      source: normalizeText(candidate.source),
      confidence: typeof candidate.confidence === "number" ? candidate.confidence : null,
      durability_reason: normalizeText(candidate.durability_reason),
      reusability_scope: normalizeText(candidate.reusability_scope || resolvedScope)
    },
    existing_notes: stripFileFields(existingNotes).filter((note) => note.scope === resolvedScope),
    scope: resolvedScope
  };
  const result = await runSemanticOperation({
    operation: "govern",
    projectRoot,
    payload,
    schema: buildGovernanceSchema(),
    prompt: governancePrompt(payload)
  });
  assertValidGovernanceDecision(result, existingNotes);
  return result;
}

export async function governMemoryCandidates(projectRoot, candidates, existingNotes, scope = "project") {
  const resolvedScope = MEMORY_SCOPE_VALUES.has(scope) ? scope : "project";
  const payload = {
    candidates: (candidates || []).map((candidate) => ({
      title: normalizeText(candidate.title),
      kind: normalizeText(candidate.kind),
      scope: resolvedScope,
      one_liner: normalizeText(candidate.one_liner),
      decision: normalizeText(candidate.decision),
      when_to_load: uniqueStrings(candidate.when_to_load || []),
      evidence: uniqueStrings(candidate.evidence || []),
      source: normalizeText(candidate.source),
      confidence: typeof candidate.confidence === "number" ? candidate.confidence : null,
      durability_reason: normalizeText(candidate.durability_reason),
      reusability_scope: normalizeText(candidate.reusability_scope || resolvedScope)
    })),
    existing_notes: stripFileFields(existingNotes).filter((note) => note.scope === resolvedScope),
    scope: resolvedScope
  };
  const result = await runSemanticOperation({
    operation: "govern_batch",
    projectRoot,
    payload,
    schema: buildGovernanceBatchSchema(),
    prompt: governanceBatchPrompt(payload)
  });
  assertValidGovernanceBatchResult(result, candidates, existingNotes);
  return result;
}

export async function rankRelevantMemories(projectRoot, query, notes, options = {}) {
  const limit = Number.isFinite(options.limit) && options.limit > 0 ? options.limit : 3;
  const payload = {
    query: normalizeText(query),
    limit,
    context: isPlainObject(options.context) ? options.context : {},
    notes: stripFileFields(notes)
  };
  const result = await runSemanticOperation({
    operation: "retrieve",
    projectRoot,
    payload,
    schema: buildRankingSchema(),
    prompt: retrievalPrompt(payload)
  });
  assertValidRankingResult(result, notes, limit);
  return result;
}
