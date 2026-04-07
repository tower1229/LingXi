import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { afterEach, describe, it } from "node:test";
import assert from "node:assert";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const scriptPath = path.join(repoRoot, "scripts", "lingxi-setup.mjs");

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "lingxi-setup-test-"));
}

function runSetup(projectRoot) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: repoRoot,
      env: { ...process.env, CODEX_PROJECT_DIR: projectRoot },
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

describe("lingxi-setup", () => {
  let tempDir;

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("creates the runtime skeleton", async () => {
    tempDir = createTempDir();
    const result = await runSetup(tempDir);
    assert.strictEqual(result.code, 0, result.stderr);
    assert.ok(fs.existsSync(path.join(tempDir, ".lingxi", "memory", "INDEX.md")));
    assert.ok(fs.existsSync(path.join(tempDir, ".codex", "agents", "lingxi-session-distill.toml")));
    assert.ok(fs.existsSync(path.join(tempDir, "AGENTS.md")));
    const state = JSON.parse(fs.readFileSync(path.join(tempDir, ".lingxi", "state", "processed-sessions.json"), "utf8"));
    const automation = fs.readFileSync(path.join(tempDir, ".lingxi", "setup", "automation.session-distill.toml"), "utf8");
    const summary = JSON.parse(result.stdout);
    assert.strictEqual(summary.default_distill_rrule, "FREQ=HOURLY;INTERVAL=6");
    assert.strictEqual(state.state_schema_version, "v2");
    assert.strictEqual(state.distill_version, "v1");
    assert.deepStrictEqual(state.summary, {
      tracked_sessions: 0,
      total_runs: 0,
      written_runs: 0,
      merged_runs: 0,
      skipped_duplicate_runs: 0,
      skipped_no_signal_runs: 0,
      failed_runs: 0,
      reprocessed_runs: 0
    });
    assert.strictEqual(state.last_run, null);
    assert.deepStrictEqual(state.sessions, {});
    assert.match(automation, /rrule = "FREQ=HOURLY;INTERVAL=6"/);
    assert.match(automation, /agent = "\.codex\/agents\/lingxi-session-distill\.toml"/);
    assert.match(automation, /state_file = "\.lingxi\/state\/processed-sessions\.json"/);
    assert.match(automation, /journal_file = "\.lingxi\/state\/distill-journal\.jsonl"/);
  });

  it("does not overwrite an existing AGENTS.md", async () => {
    tempDir = createTempDir();
    const agentsMd = path.join(tempDir, "AGENTS.md");
    fs.writeFileSync(agentsMd, "# Existing\n", "utf8");
    const result = await runSetup(tempDir);
    assert.strictEqual(result.code, 0, result.stderr);
    assert.strictEqual(fs.readFileSync(agentsMd, "utf8"), "# Existing\n");
    const summary = JSON.parse(result.stdout);
    assert.strictEqual(summary.wrote_agents_md, false);
  });
});
