import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { afterEach, describe, it } from "node:test";
import assert from "node:assert";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const setupPath = path.join(repoRoot, "scripts", "lingxi-setup.mjs");
const scriptPath = path.join(repoRoot, "skills", "session-distill", "scripts", "distill-session.mjs");

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "lingxi-distill-test-"));
}

function runNode(script, projectRoot, stdinJson) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], {
      cwd: repoRoot,
      env: { ...process.env, CODEX_PROJECT_DIR: projectRoot },
      stdio: ["pipe", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data) => {
      stdout += data;
    });
    child.stderr.on("data", (data) => {
      stderr += data;
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
    if (stdinJson != null) {
      child.stdin.write(JSON.stringify(stdinJson));
    }
    child.stdin.end();
  });
}

describe("lingxi session distill", () => {
  let tempDir;

  afterEach(async () => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("writes durable preferences and records processed session state", async () => {
    tempDir = createTempDir();
    await runNode(setupPath, tempDir);
    const input = {
      session_id: "session-001",
      messages: [
        { role: "user", content: "I prefer explicit interfaces over hidden coupling." },
        { role: "assistant", content: "Understood." }
      ]
    };
    const result = await runNode(scriptPath, tempDir, input);
    assert.strictEqual(result.code, 0, result.stderr);
    const summary = JSON.parse(result.stdout);
    assert.strictEqual(summary.operation, "written");
    assert.ok(summary.notes.length > 0);

    const state = JSON.parse(fs.readFileSync(path.join(tempDir, ".lingxi", "state", "processed-sessions.json"), "utf8"));
    assert.strictEqual(state.sessions["session-001"].result, "written");
  });

  it("skips duplicate distillation for unchanged session content", async () => {
    tempDir = createTempDir();
    await runNode(setupPath, tempDir);
    const input = {
      session_id: "session-dup",
      messages: [{ role: "user", content: "Avoid broad refactors when a small patch is enough." }]
    };
    const first = await runNode(scriptPath, tempDir, input);
    assert.strictEqual(first.code, 0, first.stderr);
    const second = await runNode(scriptPath, tempDir, input);
    assert.strictEqual(second.code, 0, second.stderr);
    const summary = JSON.parse(second.stdout);
    assert.strictEqual(summary.operation, "skipped_duplicate");
  });
});
