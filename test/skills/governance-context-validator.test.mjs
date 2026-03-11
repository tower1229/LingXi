import { describe, it } from "node:test";
import assert from "node:assert";
import {
  normalizeGovernanceContext,
  validateMergeKind,
} from "../../.cursor/skills/memory-write/scripts/governance-context-validator.mjs";

describe("governance context validator", () => {
  it("accepts valid governance_context", () => {
    const out = normalizeGovernanceContext(
      {
        subject_relation: "same_subject",
        conclusion_relation: "non_conflicting",
        target_note_id: "MEM-003",
        applied_changes: ["append_policy"],
      },
      "memory.merge.diagnosed"
    );
    assert.strictEqual(out.ok, true);
    assert.ok(out.value);
  });

  it("rejects invalid subject_relation", () => {
    const out = normalizeGovernanceContext(
      { subject_relation: "bad", conclusion_relation: "non_conflicting" },
      "memory.merge.diagnosed"
    );
    assert.strictEqual(out.ok, false);
  });

  it("accepts valid merge_kind", () => {
    assert.strictEqual(validateMergeKind("subject_expansion").ok, true);
    assert.strictEqual(validateMergeKind("scope_expansion").ok, true);
  });

  it("rejects invalid merge_kind", () => {
    assert.strictEqual(validateMergeKind("other").ok, false);
  });
});

