import { describe, it } from "node:test";
import assert from "node:assert";
import {
  MEMORY_DISTILL_CANDIDATE_SET_SCHEMA_VERSION,
  buildMemoryDistillCandidateSetValidationReport,
  memoryDistillCandidateSetJsonSchema
} from "../../skills/session-distill/scripts/memory-distill-candidate-set.mjs";

describe("memory distill candidate set", () => {
  it("accepts a valid distill candidate set shape", () => {
    const report = buildMemoryDistillCandidateSetValidationReport({
      schema_version: MEMORY_DISTILL_CANDIDATE_SET_SCHEMA_VERSION,
      session_id: "session-001",
      content_fingerprint: "sha256:test",
      distill_version: "v2",
      summary: {
        session_summary: "The session contains durable engineering taste.",
        durable_candidate_count: 1,
        discarded_signal_count: 0
      },
      candidates: [
        {
          title: "Prefer explicit interfaces",
          scene: "When defining module boundaries",
          content_type: "preference",
          alternatives: ["Keep the current implicit seam"],
          choice: "Use explicit interfaces when module boundaries matter.",
          rationale: "Explicit seams reduce hidden coupling and make future work safer.",
          kind: "preference",
          one_liner: "Prefer explicit interfaces over hidden coupling.",
          decision: "Use explicit interfaces when module boundaries matter.",
          pattern_hint: "Boundary-heavy work benefits from explicit seams.",
          when_to_load: ["When defining module boundaries"],
          evidence: ["Repeated architecture preference."],
          confidence: 0.92,
          durability_reason: "This preference should shape future implementation and review.",
          value_scores: {
            decision_gain: 3,
            reusability: 3,
            trigger_clarity: 2,
            verifiability: 2,
            stability: 3
          },
          reusability_scope: "project",
          suggested_storage_kind: "preference"
        }
      ]
    });

    assert.strictEqual(report.ok, true);
    assert.strictEqual(report.issue_count, 0);
  });

  it("rejects malformed candidate fields", () => {
    const report = buildMemoryDistillCandidateSetValidationReport({
      schema_version: MEMORY_DISTILL_CANDIDATE_SET_SCHEMA_VERSION,
      session_id: "session-001",
      content_fingerprint: "sha256:test",
      distill_version: "v2",
      summary: {
        session_summary: "",
        durable_candidate_count: 1,
        discarded_signal_count: 0
      },
      candidates: [
        {
          title: "Broken candidate",
          scene: "",
          content_type: "unknown",
          alternatives: [""],
          choice: "",
          rationale: "",
          kind: "principle",
          one_liner: "",
          decision: "Decision",
          pattern_hint: "",
          when_to_load: [],
          evidence: [],
          confidence: 2,
          durability_reason: "",
          value_scores: {
            decision_gain: 5,
            reusability: -1,
            trigger_clarity: 2,
            verifiability: 2,
            stability: 2
          },
          reusability_scope: "global",
          suggested_storage_kind: "principle"
        }
      ]
    });

    assert.strictEqual(report.ok, false);
    assert.ok(report.issues.some((item) => item.path === "summary.session_summary"));
    assert.ok(report.issues.some((item) => item.path === "candidates[0].content_type"));
    assert.ok(report.issues.some((item) => item.path === "candidates[0].kind"));
    assert.ok(report.issues.some((item) => item.path === "candidates[0].value_scores.decision_gain"));
    assert.ok(report.issues.some((item) => item.path === "candidates[0].confidence"));
  });

  it("declares schema_version as a typed string in JSON Schema output", () => {
    const schema = memoryDistillCandidateSetJsonSchema();
    assert.strictEqual(schema.properties.schema_version.type, "string");
    assert.strictEqual(schema.properties.schema_version.const, MEMORY_DISTILL_CANDIDATE_SET_SCHEMA_VERSION);
  });
});
