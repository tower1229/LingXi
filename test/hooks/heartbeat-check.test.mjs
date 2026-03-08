/**
 * heartbeat-check.mjs unit tests.
 * Temp dir as project root; mock heartbeat-control.json and audit.log; import runHeartbeatCheck; assert return and control state.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, it, afterEach } from "node:test";
import assert from "node:assert";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const { runHeartbeatCheck } = await import(pathToFileURL(path.join(REPO_ROOT, ".cursor", "hooks", "heartbeat-check.mjs")));

const CONTROL_REL = ".cursor/.lingxi/workspace/heartbeat-control.json";
const AUDIT_REL = ".cursor/.lingxi/workspace/audit.log";

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "lingxi-heartbeat-"));
}

function writeControl(dir, obj) {
  const p = path.join(dir, CONTROL_REL);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2), "utf8");
}

function writeAudit(dir, lines) {
  const p = path.join(dir, AUDIT_REL);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, lines.map((l) => JSON.stringify(l)).join("\n") + "\n", "utf8");
}

describe("heartbeat-check", () => {
  let tmpDir;

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      try {
        fs.rmSync(tmpDir, { recursive: true });
      } catch (_) {}
    }
  });

  it("returns no trigger when no control and no audit", () => {
    tmpDir = createTempDir();
    const out = runHeartbeatCheck(tmpDir, "cur-conv");
    assert.strictEqual(out.trigger_heartbeat, false);
    assert.deepStrictEqual(out.candidate_ids, []);
  });

  it("returns no trigger when no audit file", () => {
    tmpDir = createTempDir();
    writeControl(tmpDir, {
      last_distillation_completed_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      processed_conversation_ids: [],
    });
    const out = runHeartbeatCheck(tmpDir, "cur-conv");
    assert.strictEqual(out.trigger_heartbeat, false);
    assert.deepStrictEqual(out.candidate_ids, []);
  });

  it("returns no trigger when last_distillation was less than 30 min ago", () => {
    tmpDir = createTempDir();
    writeControl(tmpDir, {
      last_distillation_completed_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      processed_conversation_ids: [],
    });
    writeAudit(tmpDir, [
      { event: "session_end", conversation_id: "conv-1", ts: new Date().toISOString() },
    ]);
    const out = runHeartbeatCheck(tmpDir, "cur-conv");
    assert.strictEqual(out.trigger_heartbeat, false);
    assert.deepStrictEqual(out.candidate_ids, []);
  });

  it("returns no trigger when lock is running and not stale", () => {
    tmpDir = createTempDir();
    writeControl(tmpDir, {
      last_distillation_completed_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      heartbeat: {
        running: true,
        started_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        run_id: "other-conv",
      },
      processed_conversation_ids: [],
    });
    writeAudit(tmpDir, [
      { event: "session_end", conversation_id: "conv-1", ts: new Date().toISOString() },
    ]);
    const out = runHeartbeatCheck(tmpDir, "cur-conv");
    assert.strictEqual(out.trigger_heartbeat, false);
    assert.deepStrictEqual(out.candidate_ids, []);
  });

  it("returns no trigger when audit has no session_end", () => {
    tmpDir = createTempDir();
    writeControl(tmpDir, {
      last_distillation_completed_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      processed_conversation_ids: [],
    });
    writeAudit(tmpDir, [
      { event: "session_start", conversation_id: "conv-1", ts: new Date().toISOString() },
    ]);
    const out = runHeartbeatCheck(tmpDir, "cur-conv");
    assert.strictEqual(out.trigger_heartbeat, false);
    assert.deepStrictEqual(out.candidate_ids, []);
  });

  it("triggers and writes control when >30min since last, audit has session_end, no lock", () => {
    tmpDir = createTempDir();
    const older = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    writeControl(tmpDir, {
      last_distillation_completed_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      processed_conversation_ids: [],
    });
    writeAudit(tmpDir, [
      { event: "session_end", conversation_id: "conv-a", ts: older },
    ]);
    const out = runHeartbeatCheck(tmpDir, "cur-conv");
    assert.strictEqual(out.trigger_heartbeat, true);
    assert.deepStrictEqual(out.candidate_ids, ["conv-a"]);

    const controlPath = path.join(tmpDir, CONTROL_REL);
    const control = JSON.parse(fs.readFileSync(controlPath, "utf8"));
    assert.strictEqual(control.heartbeat.running, true);
    assert.strictEqual(control.heartbeat.run_id, "cur-conv");
    assert.deepStrictEqual(control.pending_distillation.candidate_ids, ["conv-a"]);
    assert.ok(control.pending_distillation.enqueued_at);
  });

  it("excludes current conversation_id from candidates", () => {
    tmpDir = createTempDir();
    const ts = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    writeControl(tmpDir, {
      last_distillation_completed_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      processed_conversation_ids: [],
    });
    writeAudit(tmpDir, [
      { event: "session_end", conversation_id: "current-conv", ts },
    ]);
    const out = runHeartbeatCheck(tmpDir, "current-conv");
    assert.strictEqual(out.trigger_heartbeat, false);
    assert.deepStrictEqual(out.candidate_ids, []);
  });

  it("excludes processed_conversation_ids from candidates", () => {
    tmpDir = createTempDir();
    const ts = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    writeControl(tmpDir, {
      last_distillation_completed_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      processed_conversation_ids: ["conv-done"],
    });
    writeAudit(tmpDir, [
      { event: "session_end", conversation_id: "conv-done", ts },
    ]);
    const out = runHeartbeatCheck(tmpDir, "cur-conv");
    assert.strictEqual(out.trigger_heartbeat, false);
    assert.deepStrictEqual(out.candidate_ids, []);
  });

  it("returns at most 3 candidates ordered by session_end ts desc", () => {
    tmpDir = createTempDir();
    const base = Date.now() - 120 * 60 * 1000;
    writeControl(tmpDir, {
      last_distillation_completed_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      processed_conversation_ids: [],
    });
    writeAudit(tmpDir, [
      { event: "session_end", conversation_id: "old", ts: new Date(base).toISOString() },
      { event: "session_end", conversation_id: "new", ts: new Date(base + 60 * 60 * 1000).toISOString() },
      { event: "session_end", conversation_id: "mid", ts: new Date(base + 30 * 60 * 1000).toISOString() },
    ]);
    const out = runHeartbeatCheck(tmpDir, "cur-conv");
    assert.strictEqual(out.trigger_heartbeat, true);
    assert.deepStrictEqual(out.candidate_ids, ["new", "mid", "old"]);
  });

  it("acquires lock when lock is stale (>5 min)", () => {
    tmpDir = createTempDir();
    const ts = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    writeControl(tmpDir, {
      last_distillation_completed_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      heartbeat: {
        running: true,
        started_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        run_id: "zombie-conv",
      },
      processed_conversation_ids: [],
    });
    writeAudit(tmpDir, [
      { event: "session_end", conversation_id: "conv-1", ts },
    ]);
    const out = runHeartbeatCheck(tmpDir, "cur-conv");
    assert.strictEqual(out.trigger_heartbeat, true);
    assert.deepStrictEqual(out.candidate_ids, ["conv-1"]);
  });
});
