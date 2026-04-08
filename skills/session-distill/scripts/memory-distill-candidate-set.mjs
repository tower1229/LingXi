export const MEMORY_DISTILL_CANDIDATE_SET_SCHEMA_VERSION = "draft-2026-04-08";

const MEMORY_KIND_VALUES = new Set([
  "preference",
  "constraint",
  "anti_pattern",
  "review_tendency",
  "heuristic"
]);

const REUSABILITY_SCOPE_VALUES = new Set(["project", "share"]);

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

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
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
  if (!REUSABILITY_SCOPE_VALUES.has(candidate.reusability_scope)) {
    issues.push(
      issue(
        `${base}.reusability_scope`,
        "invalid_type",
        `${base}.reusability_scope must be one of: ${[...REUSABILITY_SCOPE_VALUES].join(", ")}.`
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
      schema_version: { const: MEMORY_DISTILL_CANDIDATE_SET_SCHEMA_VERSION },
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
            "kind",
            "one_liner",
            "decision",
            "when_to_load",
            "evidence",
            "confidence",
            "durability_reason",
            "reusability_scope"
          ],
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
            },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            durability_reason: { type: "string", minLength: 1 },
            reusability_scope: { type: "string", enum: [...REUSABILITY_SCOPE_VALUES] }
          }
        }
      }
    }
  };
}
