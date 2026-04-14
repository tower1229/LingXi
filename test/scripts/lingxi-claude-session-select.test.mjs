import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import assert from "node:assert";
import { defaultProcessedSessionsState, fingerprintMessages } from "../../scripts/_lingxi-memory.mjs";
import { selectClaudeSessions } from "../../scripts/_lingxi-claude-session-select.mjs";

function createTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function encodeProjectPath(projectRoot) {
  return path.resolve(projectRoot).replace(/^\//, "").replaceAll("/", "-");
}

function writeClaudeTranscript(claudeProjectsDir, projectRoot, sessionId, events) {
  const encoded = encodeProjectPath(projectRoot);
  const dir = path.join(claudeProjectsDir, encoded);
  fs.mkdirSync(dir, { recursive: true });
  const lines = events.map((event) => JSON.stringify(event)).join("\n") + "\n";
  fs.writeFileSync(path.join(dir, `${sessionId}.jsonl`), lines, "utf8");
}

function setupProjectRuntime(projectRoot) {
  const stateDir = path.join(projectRoot, ".lingxi", "state");
  fs.mkdirSync(stateDir, { recursive: true });
  fs.mkdirSync(path.join(projectRoot, ".lingxi", "memory", "project"), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, ".lingxi", "memory", "share"), { recursive: true });
  fs.writeFileSync(
    path.join(projectRoot, ".lingxi", "memory", "INDEX.md"),
    "# Memory Index\n",
    "utf8"
  );
  fs.writeFileSync(
    path.join(stateDir, "processed-sessions.json"),
    JSON.stringify(defaultProcessedSessionsState(), null, 2) + "\n",
    "utf8"
  );
  fs.writeFileSync(path.join(stateDir, "distill-journal.jsonl"), "", "utf8");
}

describe("lingxi claude session select", () => {
  let tempDir;

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("selects engineering sessions and skips self-distill and no-signal sessions", () => {
    tempDir = createTempDir("lingxi-claude-select-");
    const projectRoot = path.join(tempDir, "project");
    const claudeProjectsDir = path.join(tempDir, "claude-projects");
    fs.mkdirSync(projectRoot, { recursive: true });
    setupProjectRuntime(projectRoot);

    writeClaudeTranscript(claudeProjectsDir, projectRoot, "good-session", [
      { role: "user", content: "Implement the backend API endpoint for user auth." },
      { role: "assistant", content: "I'll create the endpoint." }
    ]);

    writeClaudeTranscript(claudeProjectsDir, projectRoot, "self-distill", [
      { role: "assistant", content: "Running lingxi-session-distill now." }
    ]);

    writeClaudeTranscript(claudeProjectsDir, projectRoot, "no-signal", [
      { role: "user", content: "Thanks and goodbye." }
    ]);

    const result = selectClaudeSessions(projectRoot, {
      sinceHours: 24,
      claudeProjectsDir
    });

    assert.strictEqual(result.operation, "selected_sessions");
    assert.strictEqual(result.host, "claude");
    assert.strictEqual(result.selected.length, 1);
    assert.strictEqual(result.selected[0].session_id, "good-session");
    assert.strictEqual(result.selected[0].selection_reason, "repo_relevant_unprocessed");
    assert.ok(result.skipped.some((s) => s.skip_reason === "self_distill_current_run"));
    assert.ok(result.skipped.some((s) => s.skip_reason === "no_engineering_signal"));
  });

  it("skips duplicate unchanged sessions", () => {
    tempDir = createTempDir("lingxi-claude-select-");
    const projectRoot = path.join(tempDir, "project");
    const claudeProjectsDir = path.join(tempDir, "claude-projects");
    fs.mkdirSync(projectRoot, { recursive: true });
    setupProjectRuntime(projectRoot);

    const messages = [
      { role: "user", content: "Prefer explicit interfaces when module boundaries matter." }
    ];
    writeClaudeTranscript(claudeProjectsDir, projectRoot, "dup-session", messages);

    const state = defaultProcessedSessionsState();
    state.sessions["dup-session"] = {
      content_fingerprint: fingerprintMessages(messages),
      distilled_at: new Date().toISOString(),
      result: "written",
      run_reason: "first_distill",
      candidate_count: 1,
      notes: ["MEM-001"]
    };
    state.summary.tracked_sessions = 1;
    fs.writeFileSync(
      path.join(projectRoot, ".lingxi", "state", "processed-sessions.json"),
      JSON.stringify(state, null, 2) + "\n",
      "utf8"
    );

    const result = selectClaudeSessions(projectRoot, {
      sinceHours: 24,
      claudeProjectsDir
    });

    assert.strictEqual(result.selected.length, 0);
    assert.ok(result.skipped.some((s) => s.skip_reason === "duplicate_unchanged"));
  });

  it("respects the limit option", () => {
    tempDir = createTempDir("lingxi-claude-select-");
    const projectRoot = path.join(tempDir, "project");
    const claudeProjectsDir = path.join(tempDir, "claude-projects");
    fs.mkdirSync(projectRoot, { recursive: true });
    setupProjectRuntime(projectRoot);

    for (let i = 0; i < 5; i++) {
      writeClaudeTranscript(claudeProjectsDir, projectRoot, `session-${i}`, [
        { role: "user", content: `Fix the bug in module ${i} src/index.ts` }
      ]);
    }

    const result = selectClaudeSessions(projectRoot, {
      sinceHours: 24,
      limit: 2,
      claudeProjectsDir
    });

    assert.strictEqual(result.selected.length, 2);
  });

  it("returns empty selection when no sessions exist", () => {
    tempDir = createTempDir("lingxi-claude-select-");
    const projectRoot = path.join(tempDir, "project");
    fs.mkdirSync(projectRoot, { recursive: true });
    setupProjectRuntime(projectRoot);

    const result = selectClaudeSessions(projectRoot, {
      sinceHours: 24,
      claudeProjectsDir: path.join(tempDir, "nonexistent")
    });

    assert.strictEqual(result.operation, "selected_sessions");
    assert.strictEqual(result.host, "claude");
    assert.strictEqual(result.selected.length, 0);
    assert.strictEqual(result.summary.scanned_count, 0);
  });
});
