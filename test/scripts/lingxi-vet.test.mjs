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
const taskPath = path.join(repoRoot, "skills", "task", "scripts", "write-task.mjs");
const vetPath = path.join(repoRoot, "skills", "vet", "scripts", "vet-task.mjs");

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "lingxi-vet-test-"));
}

function runNode(script, projectRoot, args = [], stdinJson = null) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], {
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

describe("lingxi vet", () => {
  let tempDir;

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("flags ambiguous task language and missing constraints", async () => {
    tempDir = createTempDir();
    await runNode(setupPath, tempDir);
    const task = await runNode(taskPath, tempDir, [], {
      title: "Improve homepage",
      goal: "Improve homepage experience",
      scope: ["Adjust homepage layout", "Refine styling"],
      constraints: ["Keep existing routes unchanged"],
      acceptance_criteria: ["Homepage is better for users"]
    });
    assert.strictEqual(task.code, 0, task.stderr);
    const summary = JSON.parse(task.stdout);
    const vet = await runNode(vetPath, tempDir, ["--task-id", summary.task_id]);
    assert.strictEqual(vet.code, 0, vet.stderr);
    const vetResult = JSON.parse(vet.stdout);
    assert.ok(vetResult.findings.some((item) => item.code === "goal_ambiguous"));
    assert.ok(vetResult.findings.some((item) => item.code === "acceptance_ambiguous"));
  });

  it("falls back to the latest task when no task id is provided", async () => {
    tempDir = createTempDir();
    await runNode(setupPath, tempDir);
    await runNode(taskPath, tempDir, [], {
      title: "Add explicit module seam",
      goal: "Clarify the integration seam.",
      scope: ["Introduce an explicit integration boundary"],
      constraints: ["Do not change behavior"],
      acceptance_criteria: ["Integration boundary is documented and explicit"]
    });
    const vet = await runNode(vetPath, tempDir);
    assert.strictEqual(vet.code, 0, vet.stderr);
    const vetResult = JSON.parse(vet.stdout);
    assert.strictEqual(vetResult.task_id, "001");
  });
});
