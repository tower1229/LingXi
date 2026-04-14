import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import assert from "node:assert";
import {
  loadClaudeCandidateSessions,
  isClaudeSessionRelevantToProject,
  hasClaudeEngineeringSignal,
  detectClaudeSelfDistillSkipReason
} from "../../scripts/_lingxi-claude-sessions.mjs";

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

describe("lingxi claude sessions", () => {
  let tempDir;
  let claudeProjectsDir;
  let projectRoot;

  afterEach(() => {
    for (const dir of [tempDir]) {
      if (dir && fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  it("loads candidate sessions from Claude Code project directory", () => {
    tempDir = createTempDir("lingxi-claude-sessions-");
    projectRoot = path.join(tempDir, "myproject");
    claudeProjectsDir = path.join(tempDir, "claude-projects");
    fs.mkdirSync(projectRoot, { recursive: true });

    writeClaudeTranscript(claudeProjectsDir, projectRoot, "session-a", [
      { role: "user", content: "Fix the bug in src/index.ts" },
      { role: "assistant", content: "I'll look at the code." }
    ]);
    writeClaudeTranscript(claudeProjectsDir, projectRoot, "session-b", [
      { role: "user", content: "Prefer stable contracts." },
      { role: "assistant", content: "Understood." }
    ]);

    const sessions = loadClaudeCandidateSessions(projectRoot, claudeProjectsDir);
    assert.strictEqual(sessions.length, 2);
    assert.ok(sessions.some((s) => s.session_id === "session-a"));
    assert.ok(sessions.some((s) => s.session_id === "session-b"));

    const sessionA = sessions.find((s) => s.session_id === "session-a");
    assert.strictEqual(sessionA.messages.length, 2);
    assert.strictEqual(sessionA.messages[0].role, "user");
    assert.strictEqual(sessionA.messages[0].content, "Fix the bug in src/index.ts");
    assert.strictEqual(sessionA.cwd, projectRoot);
    assert.ok(sessionA.source_path.endsWith("session-a.jsonl"));
  });

  it("returns empty array when Claude project directory does not exist", () => {
    tempDir = createTempDir("lingxi-claude-sessions-");
    projectRoot = path.join(tempDir, "myproject");
    fs.mkdirSync(projectRoot, { recursive: true });

    const sessions = loadClaudeCandidateSessions(projectRoot, path.join(tempDir, "nonexistent"));
    assert.strictEqual(sessions.length, 0);
  });

  it("skips transcripts with no parseable messages", () => {
    tempDir = createTempDir("lingxi-claude-sessions-");
    projectRoot = path.join(tempDir, "myproject");
    claudeProjectsDir = path.join(tempDir, "claude-projects");
    fs.mkdirSync(projectRoot, { recursive: true });

    const encoded = encodeProjectPath(projectRoot);
    const dir = path.join(claudeProjectsDir, encoded);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "empty.jsonl"), "{}\n{}\n", "utf8");

    const sessions = loadClaudeCandidateSessions(projectRoot, claudeProjectsDir);
    assert.strictEqual(sessions.length, 0);
  });

  it("treats all Claude sessions as relevant to the project (scoped by directory)", () => {
    const session = { session_id: "test", messages: [] };
    assert.ok(isClaudeSessionRelevantToProject("/any/path", session));
  });

  it("detects engineering signal in Claude sessions", () => {
    assert.ok(hasClaudeEngineeringSignal({
      messages: [{ role: "user", content: "Implement the backend API endpoint" }]
    }));
    assert.ok(!hasClaudeEngineeringSignal({
      messages: [{ role: "user", content: "Thanks and goodbye" }]
    }));
  });

  it("detects self-distill sessions for Claude", () => {
    assert.strictEqual(
      detectClaudeSelfDistillSkipReason({
        context_text: "",
        messages: [{ role: "assistant", content: "Running lingxi-session-distill now" }]
      }),
      "self_distill_current_run"
    );

    assert.strictEqual(
      detectClaudeSelfDistillSkipReason({
        context_text: "",
        messages: [{ role: "user", content: "Prefer explicit interfaces." }]
      }),
      null
    );
  });
});
