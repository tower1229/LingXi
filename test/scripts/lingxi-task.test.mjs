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
const scriptPath = path.join(repoRoot, "skills", "task", "scripts", "write-task.mjs");

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "lingxi-task-test-"));
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

describe("lingxi task", () => {
  let tempDir;

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("creates a task document with deterministic structure", async () => {
    tempDir = createTempDir();
    await runNode(setupPath, tempDir);
    const result = await runNode(scriptPath, tempDir, {
      title: "Add explicit API boundary",
      goal: "Clarify module boundaries for integration code.",
      scope: ["Create an explicit interface for the integration module"],
      constraints: ["Do not change runtime behavior"],
      acceptance_criteria: ["Integration module exposes a documented explicit interface"],
      memory_refs: ["MEM-001 Prefer explicit interfaces"]
    });
    assert.strictEqual(result.code, 0, result.stderr);
    const summary = JSON.parse(result.stdout);
    assert.strictEqual(summary.task_id, "001");
    const content = fs.readFileSync(summary.file, "utf8");
    assert.ok(content.includes("## Goal"));
    assert.ok(content.includes("## Acceptance Criteria"));
    assert.ok(content.includes("MEM-001"));
  });
});
