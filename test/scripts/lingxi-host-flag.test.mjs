import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { afterEach, describe, it } from "node:test";
import assert from "node:assert";
import { fileURLToPath } from "node:url";
import { withMemorySemanticTestEnv } from "../helpers/memory-semantic-env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const setupScriptPath = path.join(repoRoot, "scripts", "lingxi-setup.mjs");
const selectScriptPath = path.join(repoRoot, "scripts", "lx-select-sessions.mjs");
const distillScriptPath = path.join(repoRoot, "scripts", "lx-distill-sessions.mjs");

function createTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function runNode(scriptPath, args = [], extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: repoRoot,
      env: { ...process.env, ...extraEnv },
      stdio: ["ignore", "pipe", "pipe"]
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
  });
}

describe("--host claude flag", () => {
  let projectDir;

  afterEach(() => {
    if (projectDir && fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it("lx-select-sessions --host claude routes to the Claude session selector", async () => {
    projectDir = createTempDir("lingxi-host-project-");

    const setup = await runNode(setupScriptPath, [], {
      CODEX_PROJECT_DIR: projectDir,
      LINGXI_PROJECT_ROOT: projectDir
    });
    assert.strictEqual(setup.code, 0, setup.stderr);

    const result = await runNode(selectScriptPath, [
      "--host", "claude",
      "--project-root", projectDir,
      "--since-hours", "24"
    ], {
      LINGXI_PROJECT_ROOT: projectDir
    });
    assert.strictEqual(result.code, 0, result.stderr);

    const summary = JSON.parse(result.stdout);
    assert.strictEqual(summary.operation, "selected_sessions");
    assert.strictEqual(summary.host, "claude");
    assert.ok(Array.isArray(summary.selected));
    assert.ok(Array.isArray(summary.skipped));
  });

  it("lx-distill-sessions --host claude runs with Claude session selection", async () => {
    projectDir = createTempDir("lingxi-host-project-");

    const setup = await runNode(setupScriptPath, [], {
      CODEX_PROJECT_DIR: projectDir,
      LINGXI_PROJECT_ROOT: projectDir
    });
    assert.strictEqual(setup.code, 0, setup.stderr);

    const result = await runNode(distillScriptPath, [
      "--host", "claude",
      "--project-root", projectDir,
      "--since-hours", "24"
    ], {
      ...withMemorySemanticTestEnv({}),
      LINGXI_PROJECT_ROOT: projectDir
    });
    assert.strictEqual(result.code, 0, result.stderr);

    const summary = JSON.parse(result.stdout);
    assert.strictEqual(summary.operation, "distill_scan_completed");
    assert.strictEqual(summary.host, "claude");
    assert.strictEqual(summary.selected_count, 0);
  });

  it("auto-detects Claude host via CLAUDE_PROJECT_DIR env", async () => {
    projectDir = createTempDir("lingxi-host-project-");

    const setup = await runNode(setupScriptPath, [], {
      CODEX_PROJECT_DIR: projectDir,
      LINGXI_PROJECT_ROOT: projectDir
    });
    assert.strictEqual(setup.code, 0, setup.stderr);

    const result = await runNode(selectScriptPath, [
      "--project-root", projectDir,
      "--since-hours", "24"
    ], {
      CLAUDE_PROJECT_DIR: projectDir,
      LINGXI_PROJECT_ROOT: projectDir
    });
    assert.strictEqual(result.code, 0, result.stderr);

    const summary = JSON.parse(result.stdout);
    assert.strictEqual(summary.host, "claude");
  });
});
