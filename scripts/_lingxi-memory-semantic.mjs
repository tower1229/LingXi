import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  MEMORY_DISTILL_CANDIDATE_SET_SCHEMA_VERSION,
  assertValidMemoryDistillCandidateSet,
  memoryDistillCandidateSetJsonSchema
} from "../skills/session-distill/scripts/memory-distill-candidate-set.mjs";
import {
  TASTE_EXTRACT_CANDIDATE_SET_SCHEMA_VERSION,
  TASTE_CONTENT_TYPE_VALUES,
  assertValidTasteExtractCandidateSet,
  tasteExtractCandidateSetJsonSchema
} from "../skills/session-distill/scripts/taste-extract-candidate-set.mjs";

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
const cachedGoldenPackByName = new Map();

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

function goldenPacksDir() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../skills/session-distill/references/semantic-goldens");
}

function loadSemanticGoldenPack(name) {
  const normalized = normalizeText(name);
  if (!normalized) return null;
  if (cachedGoldenPackByName.has(normalized)) {
    return cachedGoldenPackByName.get(normalized);
  }
  const file = path.join(goldenPacksDir(), `${normalized}.json`);
  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  cachedGoldenPackByName.set(normalized, parsed);
  return parsed;
}

function formatFewShotExamples(name) {
  const pack = loadSemanticGoldenPack(name);
  const examples = Array.isArray(pack?.examples) ? pack.examples : [];
  if (examples.length === 0) return "";
  return examples
    .map((example, index) => [
      `Example ${index + 1}: ${normalizeText(example.label) || `sample-${index + 1}`}`,
      "Input:",
      JSON.stringify(example.input || {}, null, 2),
      "Ideal Output:",
      JSON.stringify(example.output || {}, null, 2)
    ].join("\n"))
    .join("\n\n");
}

function tasteAdjudicationRubric() {
  return {
    precision_over_recall: true,
    durability_priority: "high",
    selective_output: true,
    value_dimensions: ["decision_gain", "reusability", "trigger_clarity", "verifiability", "stability"],
    scoring_scale: "0_to_3",
    guidance: [
      "Reject candidates that are too personal, too transient, too generic, or too weakly grounded in reusable engineering judgment.",
      "Prefer candidates that encode a future-reusable engineering choice, boundary, heuristic, anti-pattern, or review tendency.",
      "Map recognized content_type to the most stable suggested_storage_kind.",
      "Generate note-ready fields only after the candidate passes adjudication."
    ]
  };
}

function buildTasteAdjudicationContext(payload, extractedCandidateSet) {
  return {
    session: {
      session_id: payload.session_id,
      content_fingerprint: payload.content_fingerprint,
      distill_version: payload.distill_version
    },
    durable_memory_kind_taxonomy: [...MEMORY_KIND_VALUES],
    adjudication_rubric: tasteAdjudicationRubric(),
    extracted_candidate_set: extractedCandidateSet
  };
}

function buildGovernanceSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["schema_version", "action", "reason", "confidence", "target_note_id", "target_candidate_index", "note"],
    properties: {
      schema_version: { type: "string", const: MEMORY_SEMANTIC_RESPONSE_VERSION },
      action: { type: "string", enum: [...GOVERNANCE_ACTION_VALUES] },
      reason: { type: "string", minLength: 1 },
      reason_code: { type: "string", minLength: 1 },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      target_note_id: { type: ["string", "null"], minLength: 1 },
      target_candidate_index: { type: ["integer", "null"], minimum: 0 },
      note: {
        anyOf: [
          {
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
        ,
          { type: "null" }
        ]
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
      schema_version: { type: "string", const: MEMORY_SEMANTIC_RESPONSE_VERSION },
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
      schema_version: { type: "string", const: MEMORY_SEMANTIC_RESPONSE_VERSION },
      decisions: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["action", "reason", "confidence", "target_note_id", "target_candidate_index", "note"],
          properties: {
            action: { type: "string", enum: [...GOVERNANCE_ACTION_VALUES] },
            reason: { type: "string", minLength: 1 },
            reason_code: { type: "string", minLength: 1 },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            target_note_id: { type: ["string", "null"], minLength: 1 },
            target_candidate_index: { type: ["integer", "null"], minimum: 0 },
            note: {
              anyOf: [
                {
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
              ,
                { type: "null" }
              ]
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
    evidence: uniqueStrings(note.evidence || []),
    content_type: normalizeText(note.content_type),
    decision_gain: Number.isInteger(note.decision_gain) ? note.decision_gain : null,
    reusability: Number.isInteger(note.reusability) ? note.reusability : null,
    trigger_clarity: Number.isInteger(note.trigger_clarity) ? note.trigger_clarity : null,
    verifiability: Number.isInteger(note.verifiability) ? note.verifiability : null,
    stability: Number.isInteger(note.stability) ? note.stability : null,
    source_session_ids: uniqueStrings(note.source_session_ids || [])
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
  if (value.reason_code != null && !isNonEmptyString(value.reason_code)) {
    throw new Error("Memory governance result reason_code must be a non-empty string when provided.");
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
    if (decision.reason_code != null && !isNonEmptyString(decision.reason_code)) {
      throw new Error(`Memory batch governance decision[${index}] reason_code must be a non-empty string when provided.`);
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

function tasteExtractPrompt(payload) {
  const fewShots = formatFewShotExamples("taste-extract");
  return [
    "You are LingXi's taste extraction engine.",
    "Your job is high-recall identification of durable engineering judgment candidates from a historical Codex session.",
    "Do not jump directly from session transcript to a memory note draft.",
    "Extract immature candidates when they might become durable after adjudication, but reject obvious noise.",
    "Reject one-off implementation chatter, transient debugging detail, and generic conversation summaries.",
    "Return JSON only. Do not use shell commands or tools.",
    "Favor recall over polish at this stage. If there is no plausible durable engineering taste, return an empty candidates array.",
    "",
    "Output rules for every candidate:",
    `- schema_version must be ${TASTE_EXTRACT_CANDIDATE_SET_SCHEMA_VERSION}`,
    "- scene must name the concrete engineering context or trigger situation",
    "- content_type must describe the recognized judgment type, not the storage kind",
    "- alternatives can be incomplete, but include nearby options when recoverable from context",
    "- choice must state the preferred path or judgment",
    "- rationale must explain why this choice is favored",
    "- evidence must quote or paraphrase the supporting session signal",
    "- pattern_hint should summarize the reusable trigger or pattern",
    "- confidence should reflect extraction confidence, not final durability confidence",
    "",
    fewShots ? `Few-shot examples:\n${fewShots}\n` : "",
    "",
    "Input JSON:",
    JSON.stringify(payload, null, 2)
  ].join("\n");
}

function tasteAdjudicatePrompt(payload) {
  const fewShots = formatFewShotExamples("taste-adjudicate");
  return [
    "You are LingXi's taste adjudication engine.",
    "Your job is precision-first adjudication of extracted engineering judgment candidates.",
    "Only keep candidates that deserve durable memory treatment.",
    "Generate note-ready durable-memory candidates only after the extracted candidate has passed adjudication.",
    "Return JSON only. Do not use shell commands or tools.",
    "",
    "Adjudication rules:",
    "- reject false positives, low-value candidates, unclear triggers, and unstable one-off observations",
    "- assign value_scores from 0 to 3 for decision_gain, reusability, trigger_clarity, verifiability, and stability",
    "- map content_type to the best suggested_storage_kind",
    "- produce title, one_liner, decision, and when_to_load only for accepted candidates",
    "- prefer precision over recall at this stage",
    "",
    "Output rules:",
    `- schema_version must be ${MEMORY_DISTILL_CANDIDATE_SET_SCHEMA_VERSION}`,
    `- distill_version must be ${payload.session?.distill_version || payload.distill_version}`,
    `- allowed candidate kinds: ${[...MEMORY_KIND_VALUES].join(", ")}`,
    `- allowed content_type values: ${[...TASTE_CONTENT_TYPE_VALUES].join(", ")}`,
    `- allowed reusability_scope values: ${[...MEMORY_SCOPE_VALUES].join(", ")}`,
    "",
    fewShots ? `Few-shot examples:\n${fewShots}\n` : "",
    "",
    "Input JSON:",
    JSON.stringify(payload, null, 2)
  ].join("\n");
}

function governancePrompt(payload) {
  const fewShots = formatFewShotExamples("governance");
  return [
    "You are LingXi's memory governance engine.",
    "Decide whether the candidate should create a new memory note, merge into an existing note, or be skipped as not durable enough.",
    "Base the decision on semantic meaning, not wording overlap.",
    "Use content_type, value_scores, and suggested_storage_kind as primary governance signals.",
    "Merge materially identical or stronger rephrasings into the same note.",
    "Skip noisy or one-off candidate content.",
    "When possible, include a compact reason_code such as merge_equivalent, merge_strengthen, skip_low_value, or skip_unclear_trigger.",
    "Return JSON only. Do not use shell commands or tools.",
    "",
    "Output rules:",
    `- schema_version must be ${MEMORY_SEMANTIC_RESPONSE_VERSION}`,
    `- action must be one of: ${[...GOVERNANCE_ACTION_VALUES].join(", ")}`,
    `- note.kind must be one of: ${[...MEMORY_KIND_VALUES].join(", ")}`,
    "- always include target_note_id, target_candidate_index, and note",
    "- use null for target_note_id, target_candidate_index, or note when that field does not apply",
    "",
    fewShots ? `Few-shot examples:\n${fewShots}\n` : "",
    "",
    "Input JSON:",
    JSON.stringify(payload, null, 2)
  ].join("\n");
}

function governanceBatchPrompt(payload) {
  const fewShots = formatFewShotExamples("governance");
  return [
    "You are LingXi's memory governance engine.",
    "Process the candidate list sequentially and return one governance decision per candidate in the same order as input.",
    "Decide whether each candidate should create a new memory note, merge into an existing note, or be skipped as not durable enough.",
    "Base the decision on semantic meaning, not wording overlap.",
    "Use content_type, value_scores, and suggested_storage_kind as primary governance signals.",
    "Merge materially identical or stronger rephrasings into the same note.",
    "If a later candidate should merge into a note created earlier in this same batch, set target_candidate_index to that earlier candidate index and omit target_note_id.",
    "Skip noisy or one-off candidate content.",
    "When possible, include a compact reason_code such as merge_equivalent, merge_strengthen, skip_low_value, or skip_unclear_trigger.",
    "Return JSON only. Do not use shell commands or tools.",
    "",
    "Output rules:",
    `- schema_version must be ${MEMORY_SEMANTIC_RESPONSE_VERSION}`,
    "- decisions must be in the same order as input candidates",
    `- each decision.action must be one of: ${[...GOVERNANCE_ACTION_VALUES].join(", ")}`,
    `- each decision.note.kind must be one of: ${[...MEMORY_KIND_VALUES].join(", ")}`,
    "- each decision must include target_note_id, target_candidate_index, and note",
    "- use null for target_note_id, target_candidate_index, or note when that field does not apply",
    "",
    fewShots ? `Few-shot examples:\n${fewShots}\n` : "",
    "",
    "Input JSON:",
    JSON.stringify(payload, null, 2)
  ].join("\n");
}

function retrievalPromptTask(payload) {
  const fewShots = formatFewShotExamples("retrieve-task");
  return [
    "You are LingXi's memory retrieval engine.",
    "Select only the smallest useful set of notes that should materially shape the current task or vet work.",
    "Rank by semantic relevance, not keyword overlap alone.",
    "Prefer project memory over share memory when relevance is otherwise similar.",
    "This is task intent: prioritize implementation boundaries, rollback guidance, contract constraints, and practical engineering preferences.",
    "Prefer notes that can directly shape planning, sequencing, implementation scope, and safe execution.",
    "Return JSON only. Do not use shell commands or tools.",
    "",
    "Output rules:",
    `- schema_version must be ${MEMORY_SEMANTIC_RESPONSE_VERSION}`,
    `- return at most ${payload.limit} hits`,
    "- each hit must reference an existing note_id from the input",
    "",
    fewShots ? `Few-shot examples:\n${fewShots}\n` : "",
    "",
    "Input JSON:",
    JSON.stringify(payload, null, 2)
  ].join("\n");
}

function retrievalPromptVet(payload) {
  const fewShots = formatFewShotExamples("retrieve-vet");
  return [
    "You are LingXi's memory retrieval engine.",
    "Select only the smallest useful set of notes that should materially shape the current task or vet work.",
    "Rank by semantic relevance, not keyword overlap alone.",
    "Prefer project memory over share memory when relevance is otherwise similar.",
    "This is vet intent: prioritize anti-patterns, review tendencies, hidden risks, missing constraints, and historical pitfalls.",
    "Prefer notes that help challenge weak plans, expose missing memory application, or reveal prior failure modes.",
    "Return JSON only. Do not use shell commands or tools.",
    "",
    "Output rules:",
    `- schema_version must be ${MEMORY_SEMANTIC_RESPONSE_VERSION}`,
    `- return at most ${payload.limit} hits`,
    "- each hit must reference an existing note_id from the input",
    "",
    fewShots ? `Few-shot examples:\n${fewShots}\n` : "",
    "",
    "Input JSON:",
    JSON.stringify(payload, null, 2)
  ].join("\n");
}

function retrievalPrompt(payload) {
  const intent = normalizeText(payload?.context?.intent || payload?.context?.caller);
  return intent === "vet" ? retrievalPromptVet(payload) : retrievalPromptTask(payload);
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

export async function extractTasteCandidatesFromSession(projectRoot, session) {
  const payload = {
    session_id: normalizeText(session.session_id),
    content_fingerprint: normalizeText(session.content_fingerprint),
    distill_version: normalizeText(session.distill_version),
    messages: (session.messages || []).map((message) => ({
      role: normalizeText(message.role),
      content: normalizeText(message.content)
    }))
  };
  const startedAt = Date.now();
  const result = await runSemanticOperation({
    operation: "taste_extract",
    projectRoot,
    payload,
    schema: tasteExtractCandidateSetJsonSchema(),
    prompt: tasteExtractPrompt(payload)
  });
  assertValidTasteExtractCandidateSet(result);
  return {
    ...result,
    semantic_trace: {
      operation: "taste_extract_completed",
      duration_ms: Date.now() - startedAt,
      candidate_count: Array.isArray(result.candidates) ? result.candidates.length : 0
    }
  };
}

export async function adjudicateTasteCandidates(projectRoot, session, extractedCandidateSet) {
  const payload = buildTasteAdjudicationContext({
    session_id: normalizeText(session.session_id),
    content_fingerprint: normalizeText(session.content_fingerprint),
    distill_version: normalizeText(session.distill_version)
  }, {
    schema_version: extractedCandidateSet.schema_version,
    session_id: normalizeText(extractedCandidateSet.session_id),
    content_fingerprint: normalizeText(extractedCandidateSet.content_fingerprint),
    distill_version: normalizeText(extractedCandidateSet.distill_version),
    summary: extractedCandidateSet.summary,
    candidates: extractedCandidateSet.candidates
  });
  const startedAt = Date.now();
  const result = await runSemanticOperation({
    operation: "taste_adjudicate",
    projectRoot,
    payload,
    schema: memoryDistillCandidateSetJsonSchema(),
    prompt: tasteAdjudicatePrompt(payload)
  });
  assertValidMemoryDistillCandidateSet(result);
  return {
    ...result,
    semantic_trace: {
      operation: "taste_adjudicate_completed",
      duration_ms: Date.now() - startedAt,
      candidate_count: Array.isArray(result.candidates) ? result.candidates.length : 0
    }
  };
}

export async function distillSessionToCandidates(projectRoot, session) {
  const extracted = await extractTasteCandidatesFromSession(projectRoot, session);
  const adjudicated = await adjudicateTasteCandidates(projectRoot, session, extracted);
  return {
    ...adjudicated,
    semantic_trace: {
      taste_extract: extracted.semantic_trace || null,
      taste_adjudicate: adjudicated.semantic_trace || null
    }
  };
}

export async function governMemoryCandidate(projectRoot, candidate, existingNotes, scope = "project") {
  const resolvedScope = MEMORY_SCOPE_VALUES.has(scope) ? scope : "project";
  const payload = {
    candidate: {
      title: normalizeText(candidate.title),
      scene: normalizeText(candidate.scene),
      content_type: normalizeText(candidate.content_type),
      alternatives: uniqueStrings(candidate.alternatives || []),
      choice: normalizeText(candidate.choice),
      rationale: normalizeText(candidate.rationale),
      kind: normalizeText(candidate.kind),
      scope: resolvedScope,
      one_liner: normalizeText(candidate.one_liner),
      decision: normalizeText(candidate.decision),
      pattern_hint: normalizeText(candidate.pattern_hint),
      when_to_load: uniqueStrings(candidate.when_to_load || []),
      evidence: uniqueStrings(candidate.evidence || []),
      source: normalizeText(candidate.source),
      confidence: typeof candidate.confidence === "number" ? candidate.confidence : null,
      durability_reason: normalizeText(candidate.durability_reason),
      value_scores: isPlainObject(candidate.value_scores) ? candidate.value_scores : null,
      reusability_scope: normalizeText(candidate.reusability_scope || resolvedScope),
      suggested_storage_kind: normalizeText(candidate.suggested_storage_kind),
      source_session_ids: uniqueStrings(candidate.source_session_ids || [])
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
      scene: normalizeText(candidate.scene),
      content_type: normalizeText(candidate.content_type),
      alternatives: uniqueStrings(candidate.alternatives || []),
      choice: normalizeText(candidate.choice),
      rationale: normalizeText(candidate.rationale),
      kind: normalizeText(candidate.kind),
      scope: resolvedScope,
      one_liner: normalizeText(candidate.one_liner),
      decision: normalizeText(candidate.decision),
      pattern_hint: normalizeText(candidate.pattern_hint),
      when_to_load: uniqueStrings(candidate.when_to_load || []),
      evidence: uniqueStrings(candidate.evidence || []),
      source: normalizeText(candidate.source),
      confidence: typeof candidate.confidence === "number" ? candidate.confidence : null,
      durability_reason: normalizeText(candidate.durability_reason),
      value_scores: isPlainObject(candidate.value_scores) ? candidate.value_scores : null,
      reusability_scope: normalizeText(candidate.reusability_scope || resolvedScope),
      suggested_storage_kind: normalizeText(candidate.suggested_storage_kind),
      source_session_ids: uniqueStrings(candidate.source_session_ids || [])
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
