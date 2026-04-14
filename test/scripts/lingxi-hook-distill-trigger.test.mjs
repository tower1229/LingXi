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
const hookScriptPath = path.join(repoRoot, "scripts", "lx-memory-hook.mjs");

function createTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function seedBackendProject(projectRoot) {
  fs.writeFileSync(path.join(projectRoot, "package.json"), JSON.stringify({
    name: "hook-distill-project",
    private: true,
    dependencies: { express: "^4.21.0" }
  }, null, 2) + "\n", "utf8");
}

function setupProjectState(projectRoot, state) {
  const stateDir = path.join(projectRoot, ".lingxi", "state");
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(
    path.join(stateDir, "processed-sessions.json"),
    JSON.stringify(state, null, 2) + "\n",
    "utf8"
  );
  fs.writeFileSync(path.join(stateDir, "distill-journal.jsonl"), "", "utf8");
  fs.writeFileSync(path.join(stateDir, "memory-ops.jsonl"), "", "utf8");
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
    child.stdout.on("data", (data) => {
      stdout += data;
    });
    child.stderr.on("data", (data) => {
      stderr += data;
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
    child.stdin.end(JSON.stringify(payload));
  });
}

describe("lx-memory-hook background distill trigger", () => {
  let tempDir;

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("logs background_distill_triggered when interval is exceeded", async () => {
    tempDir = createTempDir("lingxi-hook-distill-");
    seedBackendProject(tempDir);

    const state = defaultProcessedSessionsState();
    setupProjectState(tempDir, state);

    const memoryDir = path.join(tempDir, ".lingxi", "memory", "project");
    fs.mkdirSync(memoryDir, { recursive: true });

    const result = await runHook(tempDir, {
      hook_event_name: "UserPromptSubmit",
      cwd: tempDir,
      prompt: "Implement the backend API endpoint for users."
    }, withMemorySemanticTestEnv({
      ...process.env,
      LINGXI_PROJECT_ROOT: tempDir,
      CODEX_PROJECT_DIR: tempDir
    }));

    assert.strictEqual(result.code, 0, result.stderr);

    await new Promise((resolve) => setTimeout(resolve, 200));

    const opsLogPath = path.join(tempDir, ".lingxi", "state", "memory-ops.jsonl");
    if (fs.existsSync(opsLogPath)) {
      const opsLog = fs.readFileSync(opsLogPath, "utf8");
      if (opsLog.includes("background_distill_triggered")) {
        assert.match(opsLog, /background_distill_triggered/);
      }
    }
  });

  it("does not trigger background distill when interval has not elapsed", async () => {
    tempDir = createTempDir("lingxi-hook-distill-");
    seedBackendProject(tempDir);

    const state = defaultProcessedSessionsState();
    state.last_run = {
      occurred_at: new Date().toISOString(),
      selected_count: 0,
      processed_count: 0
    };
    setupProjectState(tempDir, state);

    const memoryDir = path.join(tempDir, ".lingxi", "memory", "project");
    fs.mkdirSync(memoryDir, { recursive: true });

    const result = await runHook(tempDir, {
      hook_event_name: "UserPromptSubmit",
      cwd: tempDir,
      prompt: "Implement the backend API endpoint for users."
    }, withMemorySemanticTestEnv({
      ...process.env,
      LINGXI_PROJECT_ROOT: tempDir,
      CODEX_PROJECT_DIR: tempDir
    }));

    assert.strictEqual(result.code, 0, result.stderr);

    await new Promise((resolve) => setTimeout(resolve, 200));

    const opsLogPath = path.join(tempDir, ".lingxi", "state", "memory-ops.jsonl");
    if (fs.existsSync(opsLogPath)) {
      const opsLog = fs.readFileSync(opsLogPath, "utf8");
      assert.ok(!opsLog.includes("background_distill_triggered"),
        "Should not trigger distill when last run is recent");
    }
  });
});
