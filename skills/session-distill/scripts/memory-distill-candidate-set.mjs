export const MEMORY_DISTILL_CANDIDATE_SET_SCHEMA_VERSION = "draft-2026-04-11";

export const MEMORY_KIND_VALUES = new Set([
  "preference",
  "constraint",
  "anti_pattern",
  "review_tendency",
  "heuristic"
]);

export const TASTE_CONTENT_TYPE_VALUES = new Set([
  "preference",
  "decision_experience",
  "domain_knowledge",
  "product_knowledge",
  "org_experience",
  "heuristic",
  "pattern",
  "anti_pattern_signal",
  "troubleshooting"
]);

export const REUSABILITY_SCOPE_VALUES = new Set(["project", "share"]);
const VALUE_SCORE_KEYS = ["decision_gain", "reusability", "trigger_clarity", "verifiability", "stability"];

function issue(path, code, message) {
  return { path, code, message };
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => isNonEmptyString(item));
}

function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function isConfidence(value) {
  return typeof value === "number" && !Number.isNaN(value) && value >= 0 && value <= 1;
}

function isValueScore(value) {
  return Number.isInteger(value) && value >= 0 && value <= 3;
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function validateValueScores(value, base) {
  const issues = [];
  if (!isPlainObject(value)) {
    issues.push(issue(base, "invalid_type", `${base} must be an object.`));
    return issues;
  }
  VALUE_SCORE_KEYS.forEach((key) => {
    if (!isValueScore(value[key])) {
      issues.push(issue(`${base}.${key}`, "invalid_type", `${base}.${key} must be an integer between 0 and 3.`));
    }
  });
  return issues;
}

function validateCandidateShape(candidate, index) {
  const base = `candidates[${index}]`;
  const issues = [];
  if (!isPlainObject(candidate)) {
    issues.push(issue(base, "invalid_type", `${base} must be an object.`));
    return issues;
  }
  if (!isNonEmptyString(candidate.title)) {
    issues.push(issue(`${base}.title`, "invalid_type", `${base}.title must be a non-empty string.`));
  }
  if (!isNonEmptyString(candidate.scene)) {
    issues.push(issue(`${base}.scene`, "invalid_type", `${base}.scene must be a non-empty string.`));
  }
  if (!TASTE_CONTENT_TYPE_VALUES.has(candidate.content_type)) {
    issues.push(
      issue(
        `${base}.content_type`,
        "invalid_type",
        `${base}.content_type must be one of: ${[...TASTE_CONTENT_TYPE_VALUES].join(", ")}.`
      )
    );
  }
  if (!isStringArray(candidate.alternatives)) {
    issues.push(issue(`${base}.alternatives`, "invalid_type", `${base}.alternatives must be a string array.`));
  }
  if (!isNonEmptyString(candidate.choice)) {
    issues.push(issue(`${base}.choice`, "invalid_type", `${base}.choice must be a non-empty string.`));
  }
  if (!isNonEmptyString(candidate.rationale)) {
    issues.push(issue(`${base}.rationale`, "invalid_type", `${base}.rationale must be a non-empty string.`));
  }
  if (!MEMORY_KIND_VALUES.has(candidate.kind)) {
    issues.push(
      issue(
        `${base}.kind`,
        "invalid_type",
        `${base}.kind must be one of: ${[...MEMORY_KIND_VALUES].join(", ")}.`
      )
    );
  }
  if (!isNonEmptyString(candidate.one_liner)) {
    issues.push(issue(`${base}.one_liner`, "invalid_type", `${base}.one_liner must be a non-empty string.`));
  }
  if (!isNonEmptyString(candidate.decision)) {
    issues.push(issue(`${base}.decision`, "invalid_type", `${base}.decision must be a non-empty string.`));
  }
  if (!isNonEmptyString(candidate.pattern_hint)) {
    issues.push(issue(`${base}.pattern_hint`, "invalid_type", `${base}.pattern_hint must be a non-empty string.`));
  }
  if (!isStringArray(candidate.when_to_load) || candidate.when_to_load.length === 0) {
    issues.push(issue(`${base}.when_to_load`, "invalid_type", `${base}.when_to_load must be a non-empty string array.`));
  }
  if (!isStringArray(candidate.evidence) || candidate.evidence.length === 0) {
    issues.push(issue(`${base}.evidence`, "invalid_type", `${base}.evidence must be a non-empty string array.`));
  }
  if (!isConfidence(candidate.confidence)) {
    issues.push(issue(`${base}.confidence`, "invalid_type", `${base}.confidence must be a number between 0 and 1.`));
  }
  if (!isNonEmptyString(candidate.durability_reason)) {
    issues.push(
      issue(`${base}.durability_reason`, "invalid_type", `${base}.durability_reason must be a non-empty string.`)
    );
  }
  issues.push(...validateValueScores(candidate.value_scores, `${base}.value_scores`));
  if (!REUSABILITY_SCOPE_VALUES.has(candidate.reusability_scope)) {
    issues.push(
      issue(
        `${base}.reusability_scope`,
        "invalid_type",
        `${base}.reusability_scope must be one of: ${[...REUSABILITY_SCOPE_VALUES].join(", ")}.`
      )
    );
  }
  if (!MEMORY_KIND_VALUES.has(candidate.suggested_storage_kind)) {
    issues.push(
      issue(
        `${base}.suggested_storage_kind`,
        "invalid_type",
        `${base}.suggested_storage_kind must be one of: ${[...MEMORY_KIND_VALUES].join(", ")}.`
      )
    );
  }
  return issues;
}

export function validateMemoryDistillCandidateSetShape(value) {
  const issues = [];
  if (!isPlainObject(value)) {
    return [issue("root", "invalid_type", "MemoryDistillCandidateSet must be an object.")];
  }

  if (value.schema_version !== MEMORY_DISTILL_CANDIDATE_SET_SCHEMA_VERSION) {
    issues.push(
      issue(
        "schema_version",
        "invalid_type",
        `MemoryDistillCandidateSet.schema_version must equal ${MEMORY_DISTILL_CANDIDATE_SET_SCHEMA_VERSION}.`
      )
    );
  }
  if (!isNonEmptyString(value.session_id)) {
    issues.push(issue("session_id", "invalid_type", "MemoryDistillCandidateSet.session_id must be a non-empty string."));
  }
  if (!isNonEmptyString(value.content_fingerprint)) {
    issues.push(
      issue("content_fingerprint", "invalid_type", "MemoryDistillCandidateSet.content_fingerprint must be a non-empty string.")
    );
  }
  if (!isNonEmptyString(value.distill_version)) {
    issues.push(issue("distill_version", "invalid_type", "MemoryDistillCandidateSet.distill_version must be a non-empty string."));
  }
  if (!isPlainObject(value.summary)) {
    issues.push(issue("summary", "invalid_type", "MemoryDistillCandidateSet.summary must be an object."));
  } else {
    if (!isNonEmptyString(value.summary.session_summary)) {
      issues.push(
        issue("summary.session_summary", "invalid_type", "MemoryDistillCandidateSet.summary.session_summary must be a non-empty string.")
      );
    }
    if (!isNonNegativeInteger(value.summary.durable_candidate_count)) {
      issues.push(
        issue(
          "summary.durable_candidate_count",
          "invalid_type",
          "MemoryDistillCandidateSet.summary.durable_candidate_count must be a non-negative integer."
        )
      );
    }
    if (!isNonNegativeInteger(value.summary.discarded_signal_count)) {
      issues.push(
        issue(
          "summary.discarded_signal_count",
          "invalid_type",
          "MemoryDistillCandidateSet.summary.discarded_signal_count must be a non-negative integer."
        )
      );
    }
  }
  if (!Array.isArray(value.candidates)) {
    issues.push(issue("candidates", "invalid_type", "MemoryDistillCandidateSet.candidates must be an array."));
  } else {
    value.candidates.forEach((candidate, index) => {
      issues.push(...validateCandidateShape(candidate, index));
    });
  }

  return issues;
}

export function buildMemoryDistillCandidateSetValidationReport(value) {
  const issues = validateMemoryDistillCandidateSetShape(value);
  return {
    ok: issues.length === 0,
    validator: "memory_distill_candidate_set",
    schema_version: MEMORY_DISTILL_CANDIDATE_SET_SCHEMA_VERSION,
    issue_count: issues.length,
    issues
  };
}

export function assertValidMemoryDistillCandidateSet(value) {
  const report = buildMemoryDistillCandidateSetValidationReport(value);
  if (!report.ok) {
    const error = new Error(
      report.issues.map((item) => `${item.path}: ${item.message}`).join(" | ") || "Invalid MemoryDistillCandidateSet."
    );
    error.validation_report = report;
    throw error;
  }
}

export function memoryDistillCandidateSetJsonSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "schema_version",
      "session_id",
      "content_fingerprint",
      "distill_version",
      "summary",
      "candidates"
    ],
    properties: {
      schema_version: { type: "string", const: MEMORY_DISTILL_CANDIDATE_SET_SCHEMA_VERSION },
      session_id: { type: "string", minLength: 1 },
      content_fingerprint: { type: "string", minLength: 1 },
      distill_version: { type: "string", minLength: 1 },
      summary: {
        type: "object",
        additionalProperties: false,
        required: ["session_summary", "durable_candidate_count", "discarded_signal_count"],
        properties: {
          session_summary: { type: "string", minLength: 1 },
          durable_candidate_count: { type: "integer", minimum: 0 },
          discarded_signal_count: { type: "integer", minimum: 0 }
        }
      },
      candidates: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "title",
            "scene",
            "content_type",
            "alternatives",
            "choice",
            "rationale",
            "kind",
            "one_liner",
            "decision",
            "pattern_hint",
            "when_to_load",
            "evidence",
            "confidence",
            "durability_reason",
            "value_scores",
            "reusability_scope",
            "suggested_storage_kind"
          ],
          properties: {
            title: { type: "string", minLength: 1 },
            scene: { type: "string", minLength: 1 },
            content_type: { type: "string", enum: [...TASTE_CONTENT_TYPE_VALUES] },
            alternatives: {
              type: "array",
              items: { type: "string", minLength: 1 }
            },
            choice: { type: "string", minLength: 1 },
            rationale: { type: "string", minLength: 1 },
            kind: { type: "string", enum: [...MEMORY_KIND_VALUES] },
            one_liner: { type: "string", minLength: 1 },
            decision: { type: "string", minLength: 1 },
            pattern_hint: { type: "string", minLength: 1 },
            when_to_load: {
              type: "array",
              minItems: 1,
              items: { type: "string", minLength: 1 }
            },
            evidence: {
              type: "array",
              minItems: 1,
              items: { type: "string", minLength: 1 }
            },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            durability_reason: { type: "string", minLength: 1 },
            value_scores: {
              type: "object",
              additionalProperties: false,
              required: VALUE_SCORE_KEYS,
              properties: Object.fromEntries(
                VALUE_SCORE_KEYS.map((key) => [key, { type: "integer", minimum: 0, maximum: 3 }])
              )
            },
            reusability_scope: { type: "string", enum: [...REUSABILITY_SCOPE_VALUES] },
            suggested_storage_kind: { type: "string", enum: [...MEMORY_KIND_VALUES] }
          }
        }
      }
    }
  };
}
