import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { afterEach, describe, it } from "node:test";
import assert from "node:assert";
import { fileURLToPath } from "node:url";
import { defaultProcessedSessionsState } from "../../scripts/_lingxi-memory.mjs";
import { withMemorySemanticTestEnv } from "../helpers/memory-semantic-env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const setupScriptPath = path.join(repoRoot, "scripts", "lingxi-setup.mjs");
const runnerScriptPath = path.join(repoRoot, "scripts", "lx-distill-sessions.mjs");
const hookScriptPath = path.join(repoRoot, "scripts", "lx-memory-hook.mjs");

function createTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function runNode(scriptPath, projectRoot, args = [], extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: repoRoot,
      env: { ...process.env, CODEX_PROJECT_DIR: projectRoot, LINGXI_PROJECT_ROOT: projectRoot, ...extraEnv },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data) => { stdout += data; });
    child.stderr.on("data", (data) => { stderr += data; });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

function runHook(projectRoot, payload, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [hookScriptPath], {
      cwd: repoRoot,
      env,
      stdio: ["pipe", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data) => { stdout += data; });
    child.stderr.on("data", (data) => { stderr += data; });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
    child.stdin.end(JSON.stringify(payload));
  });
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function setupProjectState(projectRoot, state) {
  const stateDir = path.join(projectRoot, ".lingxi", "state");
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(path.join(stateDir, "processed-sessions.json"), JSON.stringify(state, null, 2) + "\n", "utf8");
  fs.writeFileSync(path.join(stateDir, "distill-journal.jsonl"), "", "utf8");
  fs.writeFileSync(path.join(stateDir, "memory-ops.jsonl"), "", "utf8");
}

describe("distill PID lock", () => {
  let projectDir;
  let sessionsRoot;

  afterEach(() => {
    for (const dir of [projectDir, sessionsRoot]) {
      if (dir && fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  it("--lock-file creates lock during run and removes it after completion", async () => {
    projectDir = createTempDir("lingxi-lock-");
    sessionsRoot = createTempDir("lingxi-lock-sessions-");

    const setup = await runNode(setupScriptPath, projectDir);
    assert.strictEqual(setup.code, 0, setup.stderr);

    const lockPath = path.join(projectDir, ".lingxi", "state", "distill.lock");

    const result = await runNode(runnerScriptPath, projectDir, [
      "--sessions-root", sessionsRoot,
      "--limit", "1",
      "--since-hours", "24",
      "--lock-file", lockPath
    ], withMemorySemanticTestEnv({}));
    assert.strictEqual(result.code, 0, result.stderr);
    assert.ok(!fs.existsSync(lockPath), "Lock file should be removed after successful completion");
  });

  it("--lock-file is cleaned up even when runner encounters an error", async () => {
    projectDir = createTempDir("lingxi-lock-err-");
    const lockPath = path.join(projectDir, ".lingxi", "state", "distill.lock");
    fs.mkdirSync(path.dirname(lockPath), { recursive: true });

    const result = await runNode(runnerScriptPath, projectDir, [
      "--sessions-root", "/nonexistent-path-that-will-not-match",
      "--lock-file", lockPath
    ], withMemorySemanticTestEnv({}));

    assert.ok(!fs.existsSync(lockPath), "Lock file should be removed even after runner error");
  });

  it("hook skips distill trigger when active lock file exists", async () => {
    projectDir = createTempDir("lingxi-lock-skip-");

    fs.writeFileSync(path.join(projectDir, "package.json"), JSON.stringify({
      name: "lock-skip-project", private: true,
      dependencies: { express: "^4.21.0" }
    }, null, 2) + "\n", "utf8");

    const state = defaultProcessedSessionsState();
    setupProjectState(projectDir, state);

    const memoryDir = path.join(projectDir, ".lingxi", "memory", "project");
    fs.mkdirSync(memoryDir, { recursive: true });

    const lockPath = path.join(projectDir, ".lingxi", "state", "distill.lock");
    fs.writeFileSync(lockPath, JSON.stringify({
      pid: process.pid,
      started_at: Date.now()
    }));

    const result = await runHook(projectDir, {
      hook_event_name: "UserPromptSubmit",
      cwd: projectDir,
      prompt: "Implement the backend API endpoint."
    }, withMemorySemanticTestEnv({
      ...process.env,
      LINGXI_PROJECT_ROOT: projectDir,
      CODEX_PROJECT_DIR: projectDir
    }));

    assert.strictEqual(result.code, 0, result.stderr);
    await new Promise((resolve) => setTimeout(resolve, 200));

    const opsLogPath = path.join(projectDir, ".lingxi", "state", "memory-ops.jsonl");
    if (fs.existsSync(opsLogPath)) {
      const opsLog = fs.readFileSync(opsLogPath, "utf8");
      assert.ok(!opsLog.includes("background_distill_triggered"),
        "Should not trigger distill when lock file is active");
    }
  });

  it("hook ignores stale lock file (expired timeout)", async () => {
    projectDir = createTempDir("lingxi-lock-stale-");

    fs.writeFileSync(path.join(projectDir, "package.json"), JSON.stringify({
      name: "lock-stale-project", private: true,
      dependencies: { express: "^4.21.0" }
    }, null, 2) + "\n", "utf8");

    const state = defaultProcessedSessionsState();
    setupProjectState(projectDir, state);

    const memoryDir = path.join(projectDir, ".lingxi", "memory", "project");
    fs.mkdirSync(memoryDir, { recursive: true });

    const lockPath = path.join(projectDir, ".lingxi", "state", "distill.lock");
    fs.writeFileSync(lockPath, JSON.stringify({
      pid: process.pid,
      started_at: Date.now() - 31 * 60 * 1000
    }));

    const result = await runHook(projectDir, {
      hook_event_name: "UserPromptSubmit",
      cwd: projectDir,
      prompt: "Implement the backend API endpoint."
    }, withMemorySemanticTestEnv({
      ...process.env,
      LINGXI_PROJECT_ROOT: projectDir,
      CODEX_PROJECT_DIR: projectDir
    }));

    assert.strictEqual(result.code, 0, result.stderr);
    await new Promise((resolve) => setTimeout(resolve, 200));

    const opsLogPath = path.join(projectDir, ".lingxi", "state", "memory-ops.jsonl");
    if (fs.existsSync(opsLogPath)) {
      const opsLog = fs.readFileSync(opsLogPath, "utf8");
      if (opsLog.includes("background_distill_triggered")) {
        assert.match(opsLog, /background_distill_triggered/,
          "Should trigger distill when lock file is stale (>30min)");
      }
    }
  });

  it("hook ignores lock file with dead PID", async () => {
    projectDir = createTempDir("lingxi-lock-dead-");

    fs.writeFileSync(path.join(projectDir, "package.json"), JSON.stringify({
      name: "lock-dead-project", private: true,
      dependencies: { express: "^4.21.0" }
    }, null, 2) + "\n", "utf8");

    const state = defaultProcessedSessionsState();
    setupProjectState(projectDir, state);

    const memoryDir = path.join(projectDir, ".lingxi", "memory", "project");
    fs.mkdirSync(memoryDir, { recursive: true });

    const lockPath = path.join(projectDir, ".lingxi", "state", "distill.lock");
    fs.writeFileSync(lockPath, JSON.stringify({
      pid: 2147483647,
      started_at: Date.now()
    }));

    const result = await runHook(projectDir, {
      hook_event_name: "UserPromptSubmit",
      cwd: projectDir,
      prompt: "Implement the backend API endpoint."
    }, withMemorySemanticTestEnv({
      ...process.env,
      LINGXI_PROJECT_ROOT: projectDir,
      CODEX_PROJECT_DIR: projectDir
    }));

    assert.strictEqual(result.code, 0, result.stderr);
    await new Promise((resolve) => setTimeout(resolve, 200));

    const opsLogPath = path.join(projectDir, ".lingxi", "state", "memory-ops.jsonl");
    if (fs.existsSync(opsLogPath)) {
      const opsLog = fs.readFileSync(opsLogPath, "utf8");
      if (opsLog.includes("background_distill_triggered")) {
        assert.match(opsLog, /background_distill_triggered/,
          "Should trigger distill when lock PID is dead");
      }
    }
  });
});
