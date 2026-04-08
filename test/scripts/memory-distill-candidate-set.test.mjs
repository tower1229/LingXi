import { describe, it } from "node:test";
import assert from "node:assert";
import {
  MEMORY_DISTILL_CANDIDATE_SET_SCHEMA_VERSION,
  buildMemoryDistillCandidateSetValidationReport
} from "../../skills/session-distill/scripts/memory-distill-candidate-set.mjs";

describe("memory distill candidate set", () => {
  it("accepts a valid distill candidate set shape", () => {
    const report = buildMemoryDistillCandidateSetValidationReport({
      schema_version: MEMORY_DISTILL_CANDIDATE_SET_SCHEMA_VERSION,
      session_id: "session-001",
      content_fingerprint: "sha256:test",
      distill_version: "v1",
      summary: {
        session_summary: "The session contains durable engineering taste.",
        durable_candidate_count: 1,
        discarded_signal_count: 0
      },
      candidates: [
        {
          title: "Prefer explicit interfaces",
          kind: "preference",
          one_liner: "Prefer explicit interfaces over hidden coupling.",
          decision: "Use explicit interfaces when module boundaries matter.",
          when_to_load: ["When defining module boundaries"],
          evidence: ["Repeated architecture preference."],
          confidence: 0.92,
          durability_reason: "This preference should shape future implementation and review.",
          reusability_scope: "project"
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
      distill_version: "v1",
      summary: {
        session_summary: "",
        durable_candidate_count: 1,
        discarded_signal_count: 0
      },
      candidates: [
        {
          title: "Broken candidate",
          kind: "principle",
          one_liner: "",
          decision: "Decision",
          when_to_load: [],
          evidence: [],
          confidence: 2,
          durability_reason: "",
          reusability_scope: "global"
        }
      ]
    });

    assert.strictEqual(report.ok, false);
    assert.ok(report.issues.some((item) => item.path === "summary.session_summary"));
    assert.ok(report.issues.some((item) => item.path === "candidates[0].kind"));
    assert.ok(report.issues.some((item) => item.path === "candidates[0].confidence"));
  });
});
