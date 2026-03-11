/**
 * session-init hook tests (001 TC-005).
 * Pipes stdin JSON; asserts stdout has continue and additional_context with convention keywords.
 */
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import assert from "node:assert";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const HOOK_PATH = path.join(REPO_ROOT, ".cursor", "hooks", "session-init.mjs");

function runSessionInit(stdinJson, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [HOOK_PATH], {
      cwd: REPO_ROOT,
      env: { ...process.env, ...extraEnv },
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

describe("session-init", () => {
  function createTempProjectRoot() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "lingxi-session-init-"));
    fs.mkdirSync(path.join(root, ".cursor", ".lingxi", "workspace"), { recursive: true });
    return root;
  }

  it("TC-005: returns continue and additional_context with convention text", async () => {
    const tempRoot = createTempProjectRoot();
    const { code, stdout } = await runSessionInit("{}", { CURSOR_PROJECT_DIR: tempRoot });
    assert.strictEqual(code, 0);
    const out = JSON.parse(stdout.trim());
    assert.strictEqual(out.continue, true);
    assert.ok(typeof out.additional_context === "string");
    assert.ok(out.additional_context.includes("记忆提取约定"));
    assert.ok(out.additional_context.includes("conversation_id"));
  });

  it("injects background self-iteration context", async () => {
    const tempRoot = createTempProjectRoot();
    const { code, stdout } = await runSessionInit("{}", { CURSOR_PROJECT_DIR: tempRoot });
    assert.strictEqual(code, 0);
    const out = JSON.parse(stdout.trim());
    assert.ok(out.additional_context.includes("lingxi-self-iterate"));
    assert.ok(out.additional_context.includes("run_in_background=true"));
  });

  it("injects self-iteration context only once per session id", async () => {
    const tempRoot = createTempProjectRoot();
    const input = JSON.stringify({ conversation_id: "session-once" });
    const first = await runSessionInit(input, { CURSOR_PROJECT_DIR: tempRoot });
    const second = await runSessionInit(input, { CURSOR_PROJECT_DIR: tempRoot });
    assert.strictEqual(first.code, 0);
    assert.strictEqual(second.code, 0);
    const out1 = JSON.parse(first.stdout.trim());
    const out2 = JSON.parse(second.stdout.trim());
    assert.ok(out1.additional_context.includes("lingxi-self-iterate"));
    assert.ok(!out2.additional_context.includes("lingxi-self-iterate"));
  });
});
