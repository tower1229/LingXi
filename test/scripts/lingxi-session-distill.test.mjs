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
    assert.strictEqual(summary.run_reason, "first_distill");
    assert.strictEqual(summary.note_count, summary.notes.length);
    assert.ok(summary.notes.length > 0);

    const state = JSON.parse(fs.readFileSync(path.join(tempDir, ".lingxi", "state", "processed-sessions.json"), "utf8"));
    assert.strictEqual(state.sessions["session-001"].result, "written");
    assert.strictEqual(state.sessions["session-001"].run_reason, "first_distill");
    assert.ok(Number.isInteger(state.sessions["session-001"].candidate_count));
    assert.strictEqual(state.summary.total_runs, 1);
    assert.strictEqual(state.summary.written_runs, 1);
    assert.strictEqual(state.summary.tracked_sessions, 1);
    assert.strictEqual(state.last_run.operation, "written");
    assert.strictEqual(state.last_run.run_reason, "first_distill");
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
    assert.strictEqual(summary.run_reason, "duplicate_unchanged");
    assert.strictEqual(summary.previous_result, "written");

    const state = JSON.parse(fs.readFileSync(path.join(tempDir, ".lingxi", "state", "processed-sessions.json"), "utf8"));
    assert.strictEqual(state.summary.total_runs, 2);
    assert.strictEqual(state.summary.written_runs, 1);
    assert.strictEqual(state.summary.skipped_duplicate_runs, 1);
    assert.strictEqual(state.last_run.operation, "skipped_duplicate");
    assert.strictEqual(state.last_run.run_reason, "duplicate_unchanged");
  });

  it("re-distills when the distill version changes and records the reason explicitly", async () => {
    tempDir = createTempDir();
    await runNode(setupPath, tempDir);
    const input = {
      session_id: "session-version-bump",
      messages: [{ role: "user", content: "Prefer stable contracts over clever shortcuts." }]
    };
    const first = await runNode(scriptPath, tempDir, input);
    assert.strictEqual(first.code, 0, first.stderr);

    const stateFile = path.join(tempDir, ".lingxi", "state", "processed-sessions.json");
    const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    state.distill_version = "v0";
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2) + "\n", "utf8");

    const second = await runNode(scriptPath, tempDir, input);
    assert.strictEqual(second.code, 0, second.stderr);
    const summary = JSON.parse(second.stdout);
    assert.notStrictEqual(summary.operation, "skipped_duplicate");
    assert.strictEqual(summary.run_reason, "distill_version_changed");

    const updatedState = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    assert.strictEqual(updatedState.distill_version, "v1");
    assert.strictEqual(updatedState.summary.total_runs, 2);
    assert.strictEqual(updatedState.summary.reprocessed_runs, 1);
    assert.strictEqual(updatedState.last_run.run_reason, "distill_version_changed");
  });

  it("skips low-signal non-engineering preferences instead of writing noisy memory", async () => {
    tempDir = createTempDir();
    await runNode(setupPath, tempDir);
    const input = {
      session_id: "session-noise",
      messages: [{ role: "user", content: "I prefer tea in the morning and nicer conversations." }]
    };
    const result = await runNode(scriptPath, tempDir, input);
    assert.strictEqual(result.code, 0, result.stderr);
    const summary = JSON.parse(result.stdout);
    assert.strictEqual(summary.operation, "skipped_no_signal");
    assert.strictEqual(summary.candidate_count, 0);

    const projectMemoryDir = path.join(tempDir, ".lingxi", "memory", "project");
    const files = fs.existsSync(projectMemoryDir) ? fs.readdirSync(projectMemoryDir).filter((item) => item.endsWith(".md")) : [];
    assert.strictEqual(files.length, 0);
  });
});
