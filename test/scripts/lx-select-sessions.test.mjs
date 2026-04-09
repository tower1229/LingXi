import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { afterEach, describe, it } from "node:test";
import assert from "node:assert";
import { fileURLToPath } from "node:url";
import { defaultProcessedSessionsState, fingerprintMessages } from "../../scripts/_lingxi-memory.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const setupScriptPath = path.join(repoRoot, "scripts", "lingxi-setup.mjs");
const selectorScriptPath = path.join(repoRoot, "scripts", "lx-select-sessions.mjs");

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

describe("lx-select-sessions", () => {
  let projectDir;
  let sessionsRoot;

  afterEach(() => {
    for (const dir of [projectDir, sessionsRoot]) {
      if (dir && fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  it("selects repo-relevant unprocessed sessions and reports deterministic skip reasons", async () => {
    projectDir = createTempDir("lingxi-select-project-");
    sessionsRoot = createTempDir("lingxi-select-sessions-");

    const setup = await runNode(setupScriptPath, projectDir);
    assert.strictEqual(setup.code, 0, setup.stderr);

    const duplicateMessages = [
      { role: "user", content: "Prefer explicit rollback notes for backend integration changes." }
    ];
    const state = defaultProcessedSessionsState();
    state.sessions["session-duplicate"] = {
      content_fingerprint: fingerprintMessages(duplicateMessages),
      distilled_at: "2026-04-08T00:00:00.000Z",
      result: "written",
      run_reason: "first_distill",
      candidate_count: 1,
      notes: ["MEM-001"]
    };
    state.summary.tracked_sessions = 1;
    fs.writeFileSync(
      path.join(projectDir, ".lingxi", "state", "processed-sessions.json"),
      JSON.stringify(state, null, 2) + "\n",
      "utf8"
    );

    writeJson(path.join(sessionsRoot, "relevant.json"), {
      session_id: "session-relevant",
      cwd: projectDir,
      messages: [
        { role: "user", content: "Use explicit interfaces when module boundaries matter." }
      ]
    });
    writeJson(path.join(sessionsRoot, "duplicate.json"), {
      session_id: "session-duplicate",
      cwd: projectDir,
      messages: duplicateMessages
    });
    writeJson(path.join(sessionsRoot, "current-run.json"), {
      session_id: "session-current",
      cwd: projectDir,
      automation_name: "LingXi Session Distill",
      agent_name: "lingxi-session-distill",
      messages: [
        { role: "assistant", content: "Run node scripts/lx-distill-sessions.mjs and report the summary." }
      ]
    });
    writeJson(path.join(sessionsRoot, "historical-self.json"), {
      session_id: "session-historical-self",
      cwd: projectDir,
      messages: [
        { role: "user", content: "Let's improve our session-distill memory about memory flow." },
        { role: "assistant", content: "We should avoid self-distill chatter in LingXi memory." }
      ]
    });
    writeJson(path.join(sessionsRoot, "no-signal.json"), {
      session_id: "session-no-signal",
      cwd: projectDir,
      messages: [
        { role: "user", content: "Thanks again and have a great day." }
      ]
    });
    writeJson(path.join(sessionsRoot, "irrelevant.json"), {
      session_id: "session-irrelevant",
      cwd: path.join(sessionsRoot, "other-project"),
      messages: [
        { role: "user", content: "Implement stable contracts in another workspace." }
      ]
    });
    fs.writeFileSync(path.join(sessionsRoot, "broken.json"), "{not valid json\n", "utf8");

    const result = await runNode(selectorScriptPath, projectDir, [
      "--sessions-root", sessionsRoot,
      "--limit", "10",
      "--since-hours", "24"
    ]);
    assert.strictEqual(result.code, 0, result.stderr);

    const summary = JSON.parse(result.stdout);
    assert.strictEqual(summary.operation, "selected_sessions");
    assert.strictEqual(summary.host, "codex");
    assert.strictEqual(summary.selected.length, 1);
    assert.strictEqual(summary.selected[0].session_id, "session-relevant");
    assert.strictEqual(summary.selected[0].selection_reason, "repo_relevant_unprocessed");
    assert.ok(Array.isArray(summary.selected[0].messages));
    assert.ok(summary.skipped.some((item) => item.skip_reason === "duplicate_unchanged"));
    assert.ok(summary.skipped.some((item) => item.skip_reason === "self_distill_current_run"));
    assert.ok(summary.skipped.some((item) => item.skip_reason === "self_distill_historical"));
    assert.ok(summary.skipped.some((item) => item.skip_reason === "no_engineering_signal"));
    assert.ok(summary.skipped.some((item) => item.skip_reason === "repo_irrelevant"));
    assert.ok(summary.skipped.some((item) => item.skip_reason === "artifact_unreadable"));
    assert.strictEqual(summary.summary.skip_reasons.duplicate_unchanged, 1);
  });

  it("parses jsonl session artifacts into normalized selected sessions", async () => {
    projectDir = createTempDir("lingxi-select-project-");
    sessionsRoot = createTempDir("lingxi-select-sessions-");

    const setup = await runNode(setupScriptPath, projectDir);
    assert.strictEqual(setup.code, 0, setup.stderr);

    const lines = [
      JSON.stringify({ session_id: "session-jsonl", cwd: projectDir }),
      JSON.stringify({ role: "user", content: "Prefer stable contracts over clever shortcuts." }),
      JSON.stringify({ role: "assistant", content: "Understood." })
    ].join("\n") + "\n";
    fs.writeFileSync(path.join(sessionsRoot, "session-jsonl.jsonl"), lines, "utf8");

    const result = await runNode(selectorScriptPath, projectDir, [
      "--sessions-root", sessionsRoot,
      "--limit", "10",
      "--since-hours", "24"
    ]);
    assert.strictEqual(result.code, 0, result.stderr);

    const summary = JSON.parse(result.stdout);
    assert.strictEqual(summary.selected.length, 1);
    assert.strictEqual(summary.selected[0].session_id, "session-jsonl");
    assert.strictEqual(summary.selected[0].messages.length, 2);
  });

  it("keeps scanning recent artifacts past early noisy sessions until it finds valid candidates", async () => {
    projectDir = createTempDir("lingxi-select-project-");
    sessionsRoot = createTempDir("lingxi-select-sessions-");

    const setup = await runNode(setupScriptPath, projectDir);
    assert.strictEqual(setup.code, 0, setup.stderr);

    for (let index = 0; index < 8; index += 1) {
      writeJson(path.join(sessionsRoot, `noise-${index}.json`), {
        session_id: `session-noise-${index}`,
        cwd: path.join(sessionsRoot, `other-project-${index}`),
        messages: [{ role: "user", content: "Implement stable contracts in another repo." }]
      });
    }

    writeJson(path.join(sessionsRoot, "valid-late.json"), {
      session_id: "session-valid-late",
      cwd: projectDir,
      messages: [{ role: "user", content: "Prefer stable contracts over clever shortcuts." }]
    });

    const result = await runNode(selectorScriptPath, projectDir, [
      "--sessions-root", sessionsRoot,
      "--limit", "1",
      "--since-hours", "24"
    ]);
    assert.strictEqual(result.code, 0, result.stderr);

    const summary = JSON.parse(result.stdout);
    assert.strictEqual(summary.selected.length, 1);
    assert.strictEqual(summary.selected[0].session_id, "session-valid-late");
  });
});
