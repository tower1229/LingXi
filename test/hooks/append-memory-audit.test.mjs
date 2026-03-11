/**
 * append-memory-audit hook tests (001 TC-006, TC-007).
 * Calls script with argv[2] JSON; asserts audit.log written line payload.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, it, afterEach } from "node:test";
import assert from "node:assert";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const HOOK_PATH = path.join(REPO_ROOT, ".cursor", "hooks", "append-memory-audit.mjs");

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "lingxi-mem-audit-"));
}

function runAppendMemoryAudit(projectRoot, jsonArg) {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [HOOK_PATH, jsonArg], {
      cwd: REPO_ROOT,
      env: { ...process.env, CURSOR_PROJECT_DIR: projectRoot },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d) => { stdout += d; });
    child.stderr?.on("data", (d) => { stderr += d; });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
    child.on("error", reject);
  });
}

function getLastAuditLine(auditPath) {
  if (!fs.existsSync(auditPath)) return null;
  const content = fs.readFileSync(auditPath, "utf8");
  const lines = content.trim().split("\n").filter(Boolean);
  return lines.length ? JSON.parse(lines[lines.length - 1]) : null;
}

describe("append-memory-audit", () => {
  let tmpDir;

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      try { fs.rmSync(tmpDir, { recursive: true }); } catch (_) {}
    }
  });

  it("writes memory.retrieve.performed payload to audit.log", async () => {
    tmpDir = createTempDir();
    fs.mkdirSync(path.join(tmpDir, ".cursor", ".lingxi", "workspace"), { recursive: true });
    const input = {
      event: "memory.retrieve.performed",
      conversation_id: "c1",
      query: "test query",
      hits: [],
      adopted: [],
      rejected: [],
      semantic_called: true,
      keyword_called: false,
      candidate_read_count: 0,
      decision: "none",
    };
    const { code } = await runAppendMemoryAudit(tmpDir, JSON.stringify(input));
    assert.strictEqual(code, 0);
    const auditPath = path.join(tmpDir, ".cursor", ".lingxi", "workspace", "audit.log");
    const payload = getLastAuditLine(auditPath);
    assert.ok(payload);
    assert.strictEqual(payload.event, "memory.retrieve.performed");
    assert.strictEqual(payload.query, "test query");
    assert.strictEqual(payload.decision, "none");
  });

  it("writes memory.retrieve.skipped payload", async () => {
    tmpDir = createTempDir();
    fs.mkdirSync(path.join(tmpDir, ".cursor", ".lingxi", "workspace"), { recursive: true });
    const input = {
      event: "memory.retrieve.skipped",
      conversation_id: "c1",
      query: "cmd only",
      reason: "command_only",
    };
    const { code } = await runAppendMemoryAudit(tmpDir, JSON.stringify(input));
    assert.strictEqual(code, 0);
    const auditPath = path.join(tmpDir, ".cursor", ".lingxi", "workspace", "audit.log");
    const payload = getLastAuditLine(auditPath);
    assert.ok(payload);
    assert.strictEqual(payload.event, "memory.retrieve.skipped");
    assert.strictEqual(payload.reason, "command_only");
  });

  it("writes memory.retrieve.invalid for invalid event", async () => {
    tmpDir = createTempDir();
    fs.mkdirSync(path.join(tmpDir, ".cursor", ".lingxi", "workspace"), { recursive: true });
    const input = { event: "memory.retrieve.performed", query: "x" };
    const { code } = await runAppendMemoryAudit(tmpDir, JSON.stringify(input));
    assert.strictEqual(code, 0);
    const auditPath = path.join(tmpDir, ".cursor", ".lingxi", "workspace", "audit.log");
    const payload = getLastAuditLine(auditPath);
    assert.ok(payload);
    assert.strictEqual(payload.event, "memory.retrieve.invalid");
  });

  it("writes memory.merge.diagnosed when payload is valid", async () => {
    tmpDir = createTempDir();
    fs.mkdirSync(path.join(tmpDir, ".cursor", ".lingxi", "workspace"), { recursive: true });
    const input = {
      event: "memory.merge.diagnosed",
      conversation_id: "c-merge",
      note_id: "MEM-001",
      source: "heartbeat",
      diagnosis_tags: ["scope_too_narrow", "trigger_miss"],
      primary_tag: "scope_too_narrow",
      merge_context: { same_scenario: true, same_conclusion: true },
      action_plan: [{ type: "expand_when_to_load", risk: "medium" }],
      status: "observed",
    };
    const { code } = await runAppendMemoryAudit(tmpDir, JSON.stringify(input));
    assert.strictEqual(code, 0);
    const auditPath = path.join(tmpDir, ".cursor", ".lingxi", "workspace", "audit.log");
    const payload = getLastAuditLine(auditPath);
    assert.ok(payload);
    assert.strictEqual(payload.event, "memory.merge.diagnosed");
    assert.strictEqual(payload.note_id, "MEM-001");
    assert.strictEqual(payload.primary_tag, "scope_too_narrow");
  });

  it("writes memory.merge.diagnosed with governance_context", async () => {
    tmpDir = createTempDir();
    fs.mkdirSync(path.join(tmpDir, ".cursor", ".lingxi", "workspace"), { recursive: true });
    const input = {
      event: "memory.merge.diagnosed",
      note_id: "MEM-009",
      source: "remember",
      diagnosis_tags: ["merge_opportunity"],
      primary_tag: "merge_opportunity",
      action_plan: [{ type: "expand_merge_policy", risk: "medium" }],
      merge_kind: "subject_expansion",
      governance_context: {
        subject_relation: "same_subject",
        conclusion_relation: "non_conflicting",
        target_note_id: "MEM-003",
        applied_changes: ["append_policy"],
      },
    };
    const { code } = await runAppendMemoryAudit(tmpDir, JSON.stringify(input));
    assert.strictEqual(code, 0);
    const auditPath = path.join(tmpDir, ".cursor", ".lingxi", "workspace", "audit.log");
    const payload = getLastAuditLine(auditPath);
    assert.ok(payload);
    assert.strictEqual(payload.event, "memory.merge.diagnosed");
    assert.strictEqual(payload.merge_kind, "subject_expansion");
  });

  it("downgrades invalid governance_context enum to memory.merge.invalid", async () => {
    tmpDir = createTempDir();
    fs.mkdirSync(path.join(tmpDir, ".cursor", ".lingxi", "workspace"), { recursive: true });
    const input = {
      event: "memory.merge.diagnosed",
      note_id: "MEM-009",
      source: "remember",
      diagnosis_tags: ["merge_opportunity"],
      primary_tag: "merge_opportunity",
      action_plan: [{ type: "expand_merge_policy", risk: "medium" }],
      merge_kind: "subject_expansion",
      governance_context: {
        subject_relation: "bad_value",
        conclusion_relation: "non_conflicting",
      },
    };
    const { code } = await runAppendMemoryAudit(tmpDir, JSON.stringify(input));
    assert.strictEqual(code, 0);
    const auditPath = path.join(tmpDir, ".cursor", ".lingxi", "workspace", "audit.log");
    const payload = getLastAuditLine(auditPath);
    assert.ok(payload);
    assert.strictEqual(payload.event, "memory.merge.invalid");
    assert.match(payload.reason, /subject_relation/);
  });

  it("downgrades invalid merge diagnosis to memory.merge.invalid", async () => {
    tmpDir = createTempDir();
    fs.mkdirSync(path.join(tmpDir, ".cursor", ".lingxi", "workspace"), { recursive: true });
    const input = {
      event: "memory.merge.diagnosed",
      note_id: "MEM-001",
      source: "heartbeat",
      diagnosis_tags: ["scope_too_narrow"],
      primary_tag: "trigger_miss",
      merge_context: { same_scenario: true, same_conclusion: true },
      action_plan: [],
    };
    const { code } = await runAppendMemoryAudit(tmpDir, JSON.stringify(input));
    assert.strictEqual(code, 0);
    const auditPath = path.join(tmpDir, ".cursor", ".lingxi", "workspace", "audit.log");
    const payload = getLastAuditLine(auditPath);
    assert.ok(payload);
    assert.strictEqual(payload.event, "memory.merge.invalid");
    assert.match(payload.reason, /primary_tag/);
  });

  it("writes memory.dedupe.applied when payload is valid", async () => {
    tmpDir = createTempDir();
    fs.mkdirSync(path.join(tmpDir, ".cursor", ".lingxi", "workspace"), { recursive: true });
    const input = {
      event: "memory.dedupe.applied",
      note_id: "MEM-010",
      source: "remember",
      deduped_note_ids: ["MEM-003"],
      reason: "same_subject_same_conclusion",
    };
    const { code } = await runAppendMemoryAudit(tmpDir, JSON.stringify(input));
    assert.strictEqual(code, 0);
    const auditPath = path.join(tmpDir, ".cursor", ".lingxi", "workspace", "audit.log");
    const payload = getLastAuditLine(auditPath);
    assert.ok(payload);
    assert.strictEqual(payload.event, "memory.dedupe.applied");
    assert.deepStrictEqual(payload.deduped_note_ids, ["MEM-003"]);
  });

  it("writes memory.new.created_but_related_exists when payload is valid", async () => {
    tmpDir = createTempDir();
    fs.mkdirSync(path.join(tmpDir, ".cursor", ".lingxi", "workspace"), { recursive: true });
    const input = {
      event: "memory.new.created_but_related_exists",
      note_id: "MEM-011",
      source: "remember",
      related_note_ids: ["MEM-003", "MEM-006"],
      reason: "gate_confidence_high_created_new",
    };
    const { code } = await runAppendMemoryAudit(tmpDir, JSON.stringify(input));
    assert.strictEqual(code, 0);
    const auditPath = path.join(tmpDir, ".cursor", ".lingxi", "workspace", "audit.log");
    const payload = getLastAuditLine(auditPath);
    assert.ok(payload);
    assert.strictEqual(payload.event, "memory.new.created_but_related_exists");
    assert.deepStrictEqual(payload.related_note_ids, ["MEM-003", "MEM-006"]);
  });
});
