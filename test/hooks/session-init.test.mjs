/**
 * session-init hook tests (001 TC-005).
 * Pipes stdin JSON; asserts stdout has continue and additional_context with convention keywords.
 */
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import assert from "node:assert";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const HOOK_PATH = path.join(REPO_ROOT, ".cursor", "hooks", "session-init.mjs");

function runSessionInit(stdinJson) {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [HOOK_PATH], {
      cwd: REPO_ROOT,
      env: process.env,
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
  it("TC-005: returns continue and additional_context with convention text", async () => {
    const { code, stdout } = await runSessionInit("{}");
    assert.strictEqual(code, 0);
    const out = JSON.parse(stdout.trim());
    assert.strictEqual(out.continue, true);
    assert.ok(typeof out.additional_context === "string");
    assert.ok(out.additional_context.includes("记忆提取约定"));
    assert.ok(out.additional_context.includes("conversation_id"));
  });
});
