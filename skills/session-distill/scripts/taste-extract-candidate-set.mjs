export const TASTE_EXTRACT_CANDIDATE_SET_SCHEMA_VERSION = "draft-2026-04-11-extract";

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

function issue(path, code, message) {
  return { path, code, message };
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
  if (!Array.isArray(candidate.alternatives) || !candidate.alternatives.every((item) => typeof item === "string")) {
    issues.push(issue(`${base}.alternatives`, "invalid_type", `${base}.alternatives must be a string array.`));
  }
  if (!isNonEmptyString(candidate.choice)) {
    issues.push(issue(`${base}.choice`, "invalid_type", `${base}.choice must be a non-empty string.`));
  }
  if (!isNonEmptyString(candidate.rationale)) {
    issues.push(issue(`${base}.rationale`, "invalid_type", `${base}.rationale must be a non-empty string.`));
  }
  if (!isStringArray(candidate.evidence) || candidate.evidence.length === 0) {
    issues.push(issue(`${base}.evidence`, "invalid_type", `${base}.evidence must be a non-empty string array.`));
  }
  if (!isNonEmptyString(candidate.pattern_hint)) {
    issues.push(issue(`${base}.pattern_hint`, "invalid_type", `${base}.pattern_hint must be a non-empty string.`));
  }
  if (!isConfidence(candidate.confidence)) {
    issues.push(issue(`${base}.confidence`, "invalid_type", `${base}.confidence must be a number between 0 and 1.`));
  }
  return issues;
}

export function validateTasteExtractCandidateSetShape(value) {
  const issues = [];
  if (!isPlainObject(value)) {
    return [issue("root", "invalid_type", "TasteExtractCandidateSet must be an object.")];
  }
  if (value.schema_version !== TASTE_EXTRACT_CANDIDATE_SET_SCHEMA_VERSION) {
    issues.push(
      issue(
        "schema_version",
        "invalid_type",
        `TasteExtractCandidateSet.schema_version must equal ${TASTE_EXTRACT_CANDIDATE_SET_SCHEMA_VERSION}.`
      )
    );
  }
  if (!isNonEmptyString(value.session_id)) {
    issues.push(issue("session_id", "invalid_type", "TasteExtractCandidateSet.session_id must be a non-empty string."));
  }
  if (!isNonEmptyString(value.content_fingerprint)) {
    issues.push(
      issue("content_fingerprint", "invalid_type", "TasteExtractCandidateSet.content_fingerprint must be a non-empty string.")
    );
  }
  if (!isNonEmptyString(value.distill_version)) {
    issues.push(issue("distill_version", "invalid_type", "TasteExtractCandidateSet.distill_version must be a non-empty string."));
  }
  if (!isPlainObject(value.summary)) {
    issues.push(issue("summary", "invalid_type", "TasteExtractCandidateSet.summary must be an object."));
  } else {
    if (!isNonEmptyString(value.summary.session_summary)) {
      issues.push(
        issue("summary.session_summary", "invalid_type", "TasteExtractCandidateSet.summary.session_summary must be a non-empty string.")
      );
    }
    if (!isNonNegativeInteger(value.summary.extracted_candidate_count)) {
      issues.push(
        issue(
          "summary.extracted_candidate_count",
          "invalid_type",
          "TasteExtractCandidateSet.summary.extracted_candidate_count must be a non-negative integer."
        )
      );
    }
    if (!isNonNegativeInteger(value.summary.discarded_signal_count)) {
      issues.push(
        issue(
          "summary.discarded_signal_count",
          "invalid_type",
          "TasteExtractCandidateSet.summary.discarded_signal_count must be a non-negative integer."
        )
      );
    }
  }
  if (!Array.isArray(value.candidates)) {
    issues.push(issue("candidates", "invalid_type", "TasteExtractCandidateSet.candidates must be an array."));
  } else {
    value.candidates.forEach((candidate, index) => {
      issues.push(...validateCandidateShape(candidate, index));
    });
  }
  return issues;
}

export function buildTasteExtractCandidateSetValidationReport(value) {
  const issues = validateTasteExtractCandidateSetShape(value);
  return {
    ok: issues.length === 0,
    validator: "taste_extract_candidate_set",
    schema_version: TASTE_EXTRACT_CANDIDATE_SET_SCHEMA_VERSION,
    issue_count: issues.length,
    issues
  };
}

export function assertValidTasteExtractCandidateSet(value) {
  const report = buildTasteExtractCandidateSetValidationReport(value);
  if (!report.ok) {
    const error = new Error(
      report.issues.map((item) => `${item.path}: ${item.message}`).join(" | ") || "Invalid TasteExtractCandidateSet."
    );
    error.validation_report = report;
    throw error;
  }
}

export function tasteExtractCandidateSetJsonSchema() {
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
      schema_version: { type: "string", const: TASTE_EXTRACT_CANDIDATE_SET_SCHEMA_VERSION },
      session_id: { type: "string", minLength: 1 },
      content_fingerprint: { type: "string", minLength: 1 },
      distill_version: { type: "string", minLength: 1 },
      summary: {
        type: "object",
        additionalProperties: false,
        required: ["session_summary", "extracted_candidate_count", "discarded_signal_count"],
        properties: {
          session_summary: { type: "string", minLength: 1 },
          extracted_candidate_count: { type: "integer", minimum: 0 },
          discarded_signal_count: { type: "integer", minimum: 0 }
        }
      },
      candidates: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "scene",
            "content_type",
            "alternatives",
            "choice",
            "rationale",
            "evidence",
            "pattern_hint",
            "confidence"
          ],
          properties: {
            scene: { type: "string", minLength: 1 },
            content_type: { type: "string", enum: [...TASTE_CONTENT_TYPE_VALUES] },
            alternatives: {
              type: "array",
              items: { type: "string" }
            },
            choice: { type: "string", minLength: 1 },
            rationale: { type: "string", minLength: 1 },
            evidence: {
              type: "array",
              minItems: 1,
              items: { type: "string", minLength: 1 }
            },
            pattern_hint: { type: "string", minLength: 1 },
            confidence: { type: "number", minimum: 0, maximum: 1 }
          }
        }
      }
    }
  };
}
