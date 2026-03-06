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
});
