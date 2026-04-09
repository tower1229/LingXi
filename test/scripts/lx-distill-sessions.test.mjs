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
const runnerScriptPath = path.join(repoRoot, "scripts", "lx-distill-sessions.mjs");
const workerFixturePath = path.join(repoRoot, "test", "fixtures", "distill-worker-runner-fixture.mjs");

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

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

describe("lx-distill-sessions", () => {
  let projectDir;
  let sessionsRoot;

  afterEach(() => {
    for (const dir of [projectDir, sessionsRoot]) {
      if (dir && fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  it("returns a successful no-op summary when no sessions are selected", async () => {
    projectDir = createTempDir("lingxi-distill-project-");
    sessionsRoot = createTempDir("lingxi-distill-sessions-");

    const setup = await runNode(setupScriptPath, projectDir);
    assert.strictEqual(setup.code, 0, setup.stderr);

    writeJson(path.join(sessionsRoot, "irrelevant.json"), {
      session_id: "session-irrelevant",
      cwd: path.join(sessionsRoot, "other-project"),
      messages: [{ role: "user", content: "Implement stable contracts in another repo." }]
    });

    const result = await runNode(runnerScriptPath, projectDir, [
      "--sessions-root", sessionsRoot,
      "--limit", "10",
      "--since-hours", "24"
    ], withMemorySemanticTestEnv({}));
    assert.strictEqual(result.code, 0, result.stderr);

    const summary = JSON.parse(result.stdout);
    assert.strictEqual(summary.operation, "distill_scan_completed");
    assert.strictEqual(summary.selected_count, 0);
    assert.strictEqual(summary.processed_count, 0);
    assert.deepStrictEqual(summary.results, []);
  });

  it("processes mixed batches and preserves single-session worker behavior", async () => {
    projectDir = createTempDir("lingxi-distill-project-");
    sessionsRoot = createTempDir("lingxi-distill-sessions-");

    const setup = await runNode(setupScriptPath, projectDir);
    assert.strictEqual(setup.code, 0, setup.stderr);

    writeJson(path.join(sessionsRoot, "written.json"), {
      session_id: "session-written",
      cwd: projectDir,
      messages: [{ role: "user", content: "Prefer explicit interfaces over hidden coupling." }]
    });
    writeJson(path.join(sessionsRoot, "merged.json"), {
      session_id: "session-merged",
      cwd: projectDir,
      messages: [{ role: "user", content: "When module seams get fuzzy, make the interface explicit so hidden coupling does not leak into implementation." }]
    });
    writeJson(path.join(sessionsRoot, "no-signal.json"), {
      session_id: "session-skip",
      cwd: projectDir,
      messages: [{ role: "user", content: "Please debug the backend service logs and update the docs for the deployment issue." }]
    });

    const result = await runNode(runnerScriptPath, projectDir, [
      "--sessions-root", sessionsRoot,
      "--limit", "10",
      "--since-hours", "24"
    ], withMemorySemanticTestEnv({}));
    assert.strictEqual(result.code, 0, result.stderr);

    const summary = JSON.parse(result.stdout);
    assert.strictEqual(summary.selected_count, 3);
    assert.strictEqual(summary.processed_count, 3);
    assert.strictEqual(summary.written_count, 1);
    assert.strictEqual(summary.merged_count, 1);
    assert.strictEqual(summary.skipped_count, 1);
    assert.strictEqual(summary.failed_count, 0);
    assert.ok(summary.results.some((item) => item.operation === "written"));
    assert.ok(summary.results.some((item) => item.operation === "merged"));
    assert.ok(summary.results.some((item) => item.session_id === "session-written"));
    assert.ok(summary.results.some((item) => item.session_id === "session-merged"));
    assert.ok(summary.results.some((item) => item.operation === "skipped_no_signal" && item.session_id === "session-skip"));
  });

  it("isolates single-session failures instead of aborting the whole batch", async () => {
    projectDir = createTempDir("lingxi-distill-project-");
    sessionsRoot = createTempDir("lingxi-distill-sessions-");

    const setup = await runNode(setupScriptPath, projectDir);
    assert.strictEqual(setup.code, 0, setup.stderr);

    writeJson(path.join(sessionsRoot, "ok.json"), {
      session_id: "session-ok",
      cwd: projectDir,
      messages: [{ role: "user", content: "Prefer stable contracts over clever shortcuts." }]
    });
    writeJson(path.join(sessionsRoot, "fail.json"), {
      session_id: "session-fail",
      cwd: projectDir,
      messages: [{ role: "user", content: "Prefer explicit rollback notes for backend integration changes." }]
    });

    const result = await runNode(runnerScriptPath, projectDir, [
      "--sessions-root", sessionsRoot,
      "--limit", "10",
      "--since-hours", "24"
    ], {
      LINGXI_DISTILL_WORKER_SCRIPT: workerFixturePath
    });
    assert.strictEqual(result.code, 0, result.stderr);

    const summary = JSON.parse(result.stdout);
    assert.strictEqual(summary.selected_count, 2);
    assert.strictEqual(summary.processed_count, 2);
    assert.strictEqual(summary.written_count, 1);
    assert.strictEqual(summary.failed_count, 1);
    assert.ok(summary.results.some((item) => item.operation === "written" && item.session_id === "session-ok"));
    assert.ok(summary.results.some((item) => item.operation === "failed" && item.session_id === "session-fail"));
  });
});
