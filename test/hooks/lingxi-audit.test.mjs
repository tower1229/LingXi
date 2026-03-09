/**
 * lingxi-audit hook tests (001 TC-001, TC-002, TC-003, TC-009).
 * Spawns hook with stdin JSON; asserts stdout allow JSON and audit.log NDJSON line.
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
const HOOK_PATH = path.join(REPO_ROOT, ".cursor", "hooks", "lingxi-audit.mjs");

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "lingxi-hook-"));
}

function runLingxiAudit(projectRoot, stdinJson, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [HOOK_PATH], {
      cwd: REPO_ROOT,
      env: { ...process.env, CURSOR_PROJECT_DIR: projectRoot, ...extraEnv },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d) => { stdout += d; });
    child.stderr?.on("data", (d) => { stderr += d; });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
    child.on("error", reject);
    child.stdin?.write(stdinJson);
    child.stdin?.end();
  });
}

describe("lingxi-audit", () => {
  let tmpDir;

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      try { fs.rmSync(tmpDir, { recursive: true }); } catch (_) {}
    }
  });

  it("TC-001: returns allow JSON and defaults to minimal hook events", async () => {
    tmpDir = createTempDir();
    fs.mkdirSync(path.join(tmpDir, ".cursor", ".lingxi", "workspace"), { recursive: true });
    const input = {
      hook_event_name: "beforeSubmitPrompt",
      prompt: "hello",
      conversation_id: "conv-1",
    };
    const { code, stdout } = await runLingxiAudit(tmpDir, JSON.stringify(input));
    assert.strictEqual(code, 0, "exit 0");
    const out = JSON.parse(stdout.trim());
    assert.strictEqual(out.continue, true, "return allow");

    const auditPath = path.join(tmpDir, ".cursor", ".lingxi", "workspace", "audit.log");
    if (fs.existsSync(auditPath)) {
      const lines = fs.readFileSync(auditPath, "utf8").trim().split("\n").filter(Boolean);
      assert.strictEqual(lines.length, 0, "before_submit_prompt is skipped in default mode");
    }
  });

  it("TC-003: returns allow for preToolUse", async () => {
    tmpDir = createTempDir();
    fs.mkdirSync(path.join(tmpDir, ".cursor", ".lingxi", "workspace"), { recursive: true });
    const input = {
      hook_event_name: "preToolUse",
      tool_name: "Grep",
      tool_use_id: "id-1",
      conversation_id: "c",
    };
    const { code, stdout } = await runLingxiAudit(tmpDir, JSON.stringify(input));
    assert.strictEqual(code, 0);
    const out = JSON.parse(stdout.trim());
    assert.strictEqual(out.decision, "allow");
  });

  it("TC-009: returns allow on invalid/empty input", async () => {
    tmpDir = createTempDir();
    fs.mkdirSync(path.join(tmpDir, ".cursor", ".lingxi", "workspace"), { recursive: true });
    const { code, stdout } = await runLingxiAudit(tmpDir, "{}");
    assert.strictEqual(code, 0);
    const out = JSON.parse(stdout.trim());
    // Empty input yields {} (no block); or explicit allow
    assert.ok(
      out.continue === true || out.decision === "allow" || Object.keys(out).length === 0,
      "still allow (no block)"
    );
  });

  it("writes hook trace when debug mode is enabled", async () => {
    tmpDir = createTempDir();
    fs.mkdirSync(path.join(tmpDir, ".cursor", ".lingxi", "workspace"), { recursive: true });
    const input = {
      hook_event_name: "beforeSubmitPrompt",
      prompt: "hello debug",
      conversation_id: "conv-debug",
    };
    const { code } = await runLingxiAudit(tmpDir, JSON.stringify(input), { LINGXI_AUDIT_DEBUG: "1" });
    assert.strictEqual(code, 0);
    const auditPath = path.join(tmpDir, ".cursor", ".lingxi", "workspace", "audit.log");
    const lines = fs.readFileSync(auditPath, "utf8").trim().split("\n").filter(Boolean);
    assert.ok(lines.length >= 1, "debug mode should write audit lines");
    const payload = JSON.parse(lines[lines.length - 1]);
    assert.strictEqual(payload.event, "before_submit_prompt");
  });
});
