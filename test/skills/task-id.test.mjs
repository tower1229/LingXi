/**
 * latest-task-id.mjs and next-task-id.mjs tests.
 * Temp .lingxi/tasks with *.task.*.md; assert stdout and exit codes.
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
const LATEST_PATH = path.join(REPO_ROOT, "plugin", "skills", "task", "scripts", "latest-task-id.mjs");
const NEXT_PATH = path.join(REPO_ROOT, "plugin", "skills", "task", "scripts", "next-task-id.mjs");

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "lingxi-tasks-"));
}

function runScript(scriptPath, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [scriptPath], {
      cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d) => { stdout += d; });
    child.stderr?.on("data", (d) => { stderr += d; });
    child.on("close", (code) => resolve({ code, stdout: stdout.trim(), stderr }));
    child.on("error", reject);
  });
}

describe("task-id", () => {
  let tmpDir;

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      try { fs.rmSync(tmpDir, { recursive: true }); } catch (_) {}
    }
  });

  it("latest outputs max task id", async () => {
    tmpDir = createTempDir();
    const tasksDir = path.join(tmpDir, ".lingxi", "tasks");
    fs.mkdirSync(tasksDir, { recursive: true });
    fs.writeFileSync(path.join(tasksDir, "001.task.a.md"), "# A", "utf8");
    fs.writeFileSync(path.join(tasksDir, "002.task.b.md"), "# B", "utf8");

    const { code, stdout } = await runScript(LATEST_PATH, tmpDir);
    assert.strictEqual(code, 0);
    assert.strictEqual(stdout, "002");
  });

  it("next outputs max+1", async () => {
    tmpDir = createTempDir();
    const tasksDir = path.join(tmpDir, ".lingxi", "tasks");
    fs.mkdirSync(tasksDir, { recursive: true });
    fs.writeFileSync(path.join(tasksDir, "001.task.a.md"), "# A", "utf8");
    fs.writeFileSync(path.join(tasksDir, "002.task.b.md"), "# B", "utf8");

    const { code, stdout } = await runScript(NEXT_PATH, tmpDir);
    assert.strictEqual(code, 0);
    assert.strictEqual(stdout, "003");
  });

  it("latest exits 1 when no task files", async () => {
    tmpDir = createTempDir();
    fs.mkdirSync(path.join(tmpDir, ".lingxi", "tasks"), { recursive: true });

    const { code } = await runScript(LATEST_PATH, tmpDir);
    assert.strictEqual(code, 1);
  });

  it("next outputs 001 when tasks dir missing", async () => {
    tmpDir = createTempDir();

    const { code, stdout } = await runScript(NEXT_PATH, tmpDir);
    assert.strictEqual(code, 0);
    assert.strictEqual(stdout, "001");
  });
});
