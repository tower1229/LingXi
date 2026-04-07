import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import assert from "node:assert";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../..");
const SCHEMA_PATH = path.join(
  REPO_ROOT,
  ".cursor",
  "hooks",
  "schemas",
  "memory-audit-events.schema.json"
);

const EXPECTED_EVENTS = [
  "memory_note_created",
  "memory_note_updated",
  "memory_note_deleted",
  "memory_index_updated",
  "memory.retrieve.performed",
  "memory.retrieve.skipped",
  "memory.retrieve.missing",
  "memory.retrieve.invalid",
  "memory.merge.diagnosed",
  "memory.merge.invalid",
  "memory.dedupe.applied",
  "memory.dedupe.suggested",
  "memory.new.created_but_related_exists",
  "memory.improvement.proposed",
  "memory.improvement.approved",
  "memory.improvement.rejected",
  "memory.improvement.applied",
  "memory.improvement.failed",
];

describe("memory audit schema contract", () => {
  it("covers current supported memory audit events", () => {
    const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, "utf8"));
    const actual = schema?.$defs?.eventEnum?.enum;
    assert.ok(Array.isArray(actual));
    assert.deepStrictEqual(actual, EXPECTED_EVENTS);
  });
});
