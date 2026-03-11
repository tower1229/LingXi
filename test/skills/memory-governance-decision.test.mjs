import { describe, it } from "node:test";
import assert from "node:assert";
import { decideGovernance } from "../../.cursor/skills/memory-write/scripts/governance-decision.mjs";

describe("memory governance hard-threshold decision tree", () => {
  it("returns dedupe for same subject and conclusion", () => {
    const out = decideGovernance({ same_subject: true, same_conclusion: true, target_note_id: "MEM-003" });
    assert.strictEqual(out.decision, "dedupe");
  });

  it("returns merge subject_expansion for same subject non-conflicting", () => {
    const out = decideGovernance({ same_subject: true, non_conflicting: true, target_note_id: "MEM-003" });
    assert.strictEqual(out.decision, "merge");
    assert.strictEqual(out.merge_kind, "subject_expansion");
  });

  it("returns merge scope_expansion for different subject same conclusion", () => {
    const out = decideGovernance({ same_subject: false, same_conclusion: true, target_note_id: "MEM-003" });
    assert.strictEqual(out.decision, "merge");
    assert.strictEqual(out.merge_kind, "scope_expansion");
  });

  it("returns replace for conflicting with decisive choice", () => {
    const out = decideGovernance({ conflicting: true, decisive_choice: true, target_note_id: "MEM-003" });
    assert.strictEqual(out.decision, "replace");
  });

  it("returns veto for conflicting without decisive choice", () => {
    const out = decideGovernance({ conflicting: true, decisive_choice: false, target_note_id: "MEM-003" });
    assert.strictEqual(out.decision, "veto");
  });
});

