import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  GOVERNANCE_CONCLUSION_RELATIONS,
  GOVERNANCE_SUBJECT_RELATIONS,
  MERGE_KINDS,
  normalizeGovernanceContext,
  validateMergeKind,
} from "../../skills/memory-write/scripts/governance-context-validator.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");

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

  it("keeps validator enums in sync with JSON schema", () => {
    const schemaPath = path.join(
      REPO_ROOT,
      "plugin",
      "skills",
      "memory-write",
      "references",
      "governance-context.schema.json"
    );
    const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
    assert.deepStrictEqual(
      schema.properties.subject_relation.enum,
      GOVERNANCE_SUBJECT_RELATIONS
    );
    assert.deepStrictEqual(
      schema.properties.conclusion_relation.enum,
      GOVERNANCE_CONCLUSION_RELATIONS
    );
    assert.deepStrictEqual(MERGE_KINDS, ["subject_expansion", "scope_expansion"]);
    assert.ok(Array.isArray(schema.required));
    assert.ok(schema.required.includes("subject_relation"));
    assert.ok(schema.required.includes("conclusion_relation"));
  });
});

