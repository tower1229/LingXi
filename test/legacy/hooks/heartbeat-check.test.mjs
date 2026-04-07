/**
 * heartbeat-check.mjs unit tests.
 * Temp dir as project root; mock heartbeat-control.json and transcript index/source; import runHeartbeatCheck; assert return and control state.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, it, afterEach } from "node:test";
import assert from "node:assert";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../..");
const { runHeartbeatCheck } = await import(pathToFileURL(path.join(REPO_ROOT, ".cursor", "hooks", "heartbeat-check.mjs")));

const CONTROL_REL = ".cursor/.lingxi/workspace/heartbeat-control.json";
const INDEX_REL = ".cursor/.lingxi/workspace/heartbeat-transcript-index.json";

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "lingxi-heartbeat-"));
}

function writeControl(dir, obj) {
  const p = path.join(dir, CONTROL_REL);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2), "utf8");
}

function readIndex(dir) {
  const p = path.join(dir, INDEX_REL);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function writeTranscript(root, conversationId, mtimeMs = Date.now()) {
  const p = path.join(root, `${conversationId}.jsonl`);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify({ role: "user", content: "hello" }) + "\n", "utf8");
  const t = new Date(mtimeMs);
  fs.utimesSync(p, t, t);
  return p;
}

describe("heartbeat-check", () => {
  let tmpDir;
  let transcriptRoot;
  let prevTranscriptEnv;

  afterEach(() => {
    if (prevTranscriptEnv === undefined) {
      delete process.env.CURSOR_AGENT_TRANSCRIPTS_DIR;
    } else {
      process.env.CURSOR_AGENT_TRANSCRIPTS_DIR = prevTranscriptEnv;
    }
    prevTranscriptEnv = undefined;
    if (tmpDir && fs.existsSync(tmpDir)) {
      try {
        fs.rmSync(tmpDir, { recursive: true });
      } catch (_) {}
    }
  });

  it("returns no trigger when no control and no transcript root", () => {
    tmpDir = createTempDir();
    prevTranscriptEnv = process.env.CURSOR_AGENT_TRANSCRIPTS_DIR;
    delete process.env.CURSOR_AGENT_TRANSCRIPTS_DIR;
    const out = runHeartbeatCheck(tmpDir, "cur-conv");
    assert.strictEqual(out.trigger_heartbeat, false);
    assert.deepStrictEqual(out.candidate_ids, []);
  });

  it("returns no trigger when transcript root has no files", () => {
    tmpDir = createTempDir();
    transcriptRoot = path.join(tmpDir, "agent-transcripts");
    fs.mkdirSync(transcriptRoot, { recursive: true });
    prevTranscriptEnv = process.env.CURSOR_AGENT_TRANSCRIPTS_DIR;
    process.env.CURSOR_AGENT_TRANSCRIPTS_DIR = transcriptRoot;
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
    transcriptRoot = path.join(tmpDir, "agent-transcripts");
    fs.mkdirSync(transcriptRoot, { recursive: true });
    prevTranscriptEnv = process.env.CURSOR_AGENT_TRANSCRIPTS_DIR;
    process.env.CURSOR_AGENT_TRANSCRIPTS_DIR = transcriptRoot;
    writeControl(tmpDir, {
      last_distillation_completed_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      processed_conversation_ids: [],
    });
    writeTranscript(transcriptRoot, "conv-1");
    const out = runHeartbeatCheck(tmpDir, "cur-conv");
    assert.strictEqual(out.trigger_heartbeat, false);
    assert.deepStrictEqual(out.candidate_ids, []);
  });

  it("returns no trigger when lock is running and not stale", () => {
    tmpDir = createTempDir();
    transcriptRoot = path.join(tmpDir, "agent-transcripts");
    fs.mkdirSync(transcriptRoot, { recursive: true });
    prevTranscriptEnv = process.env.CURSOR_AGENT_TRANSCRIPTS_DIR;
    process.env.CURSOR_AGENT_TRANSCRIPTS_DIR = transcriptRoot;
    writeControl(tmpDir, {
      last_distillation_completed_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      heartbeat: {
        running: true,
        started_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        run_id: "other-conv",
      },
      processed_conversation_ids: [],
    });
    writeTranscript(transcriptRoot, "conv-1");
    const out = runHeartbeatCheck(tmpDir, "cur-conv");
    assert.strictEqual(out.trigger_heartbeat, false);
    assert.deepStrictEqual(out.candidate_ids, []);
  });

  it("returns no trigger when changed transcript only belongs to current conversation", () => {
    tmpDir = createTempDir();
    transcriptRoot = path.join(tmpDir, "agent-transcripts");
    fs.mkdirSync(transcriptRoot, { recursive: true });
    prevTranscriptEnv = process.env.CURSOR_AGENT_TRANSCRIPTS_DIR;
    process.env.CURSOR_AGENT_TRANSCRIPTS_DIR = transcriptRoot;
    writeControl(tmpDir, {
      last_distillation_completed_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      processed_conversation_ids: [],
    });
    writeTranscript(transcriptRoot, "cur-conv");
    const out = runHeartbeatCheck(tmpDir, "cur-conv");
    assert.strictEqual(out.trigger_heartbeat, false);
    assert.deepStrictEqual(out.candidate_ids, []);
    const index = readIndex(tmpDir);
    assert.ok(index, "index should be created even when no candidates");
  });

  it("triggers and writes control when >30min since last and transcript has delta", () => {
    tmpDir = createTempDir();
    transcriptRoot = path.join(tmpDir, "agent-transcripts");
    fs.mkdirSync(transcriptRoot, { recursive: true });
    prevTranscriptEnv = process.env.CURSOR_AGENT_TRANSCRIPTS_DIR;
    process.env.CURSOR_AGENT_TRANSCRIPTS_DIR = transcriptRoot;
    const older = Date.now() - 60 * 60 * 1000;
    writeControl(tmpDir, {
      last_distillation_completed_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      processed_conversation_ids: [],
    });
    writeTranscript(transcriptRoot, "conv-a", older);
    const out = runHeartbeatCheck(tmpDir, "cur-conv");
    assert.strictEqual(out.trigger_heartbeat, true);
    assert.deepStrictEqual(out.candidate_ids, ["conv-a"]);

    const controlPath = path.join(tmpDir, CONTROL_REL);
    const control = JSON.parse(fs.readFileSync(controlPath, "utf8"));
    assert.strictEqual(control.heartbeat.running, true);
    assert.strictEqual(control.heartbeat.run_id, "cur-conv");
    assert.deepStrictEqual(control.pending_distillation.candidate_ids, ["conv-a"]);
    assert.ok(control.pending_distillation.enqueued_at);

    const index = readIndex(tmpDir);
    assert.ok(index && index.transcripts, "index should be written");
    assert.ok(Object.keys(index.transcripts).length >= 1);
  });

  it("excludes current conversation_id from candidates", () => {
    tmpDir = createTempDir();
    transcriptRoot = path.join(tmpDir, "agent-transcripts");
    fs.mkdirSync(transcriptRoot, { recursive: true });
    prevTranscriptEnv = process.env.CURSOR_AGENT_TRANSCRIPTS_DIR;
    process.env.CURSOR_AGENT_TRANSCRIPTS_DIR = transcriptRoot;
    const ts = Date.now() - 60 * 60 * 1000;
    writeControl(tmpDir, {
      last_distillation_completed_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      processed_conversation_ids: [],
    });
    writeTranscript(transcriptRoot, "current-conv", ts);
    const out = runHeartbeatCheck(tmpDir, "current-conv");
    assert.strictEqual(out.trigger_heartbeat, false);
    assert.deepStrictEqual(out.candidate_ids, []);
  });

  it("excludes processed_conversation_ids from candidates", () => {
    tmpDir = createTempDir();
    transcriptRoot = path.join(tmpDir, "agent-transcripts");
    fs.mkdirSync(transcriptRoot, { recursive: true });
    prevTranscriptEnv = process.env.CURSOR_AGENT_TRANSCRIPTS_DIR;
    process.env.CURSOR_AGENT_TRANSCRIPTS_DIR = transcriptRoot;
    const ts = Date.now() - 60 * 60 * 1000;
    writeControl(tmpDir, {
      last_distillation_completed_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      processed_conversation_ids: ["conv-done"],
    });
    writeTranscript(transcriptRoot, "conv-done", ts);
    const out = runHeartbeatCheck(tmpDir, "cur-conv");
    assert.strictEqual(out.trigger_heartbeat, false);
    assert.deepStrictEqual(out.candidate_ids, []);
  });

  it("returns at most 3 candidates ordered by transcript mtime desc", () => {
    tmpDir = createTempDir();
    transcriptRoot = path.join(tmpDir, "agent-transcripts");
    fs.mkdirSync(transcriptRoot, { recursive: true });
    prevTranscriptEnv = process.env.CURSOR_AGENT_TRANSCRIPTS_DIR;
    process.env.CURSOR_AGENT_TRANSCRIPTS_DIR = transcriptRoot;
    const base = Date.now() - 120 * 60 * 1000;
    writeControl(tmpDir, {
      last_distillation_completed_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      processed_conversation_ids: [],
    });
    writeTranscript(transcriptRoot, "old", base);
    writeTranscript(transcriptRoot, "new", base + 60 * 60 * 1000);
    writeTranscript(transcriptRoot, "mid", base + 30 * 60 * 1000);
    writeTranscript(transcriptRoot, "extra", base + 10 * 60 * 1000);
    const out = runHeartbeatCheck(tmpDir, "cur-conv");
    assert.strictEqual(out.trigger_heartbeat, true);
    assert.deepStrictEqual(out.candidate_ids, ["new", "mid", "extra"]);
  });

  it("acquires lock when lock is stale (>5 min); does not hold running to avoid stuck lock", () => {
    tmpDir = createTempDir();
    transcriptRoot = path.join(tmpDir, "agent-transcripts");
    fs.mkdirSync(transcriptRoot, { recursive: true });
    prevTranscriptEnv = process.env.CURSOR_AGENT_TRANSCRIPTS_DIR;
    process.env.CURSOR_AGENT_TRANSCRIPTS_DIR = transcriptRoot;
    const ts = Date.now() - 60 * 60 * 1000;
    writeControl(tmpDir, {
      last_distillation_completed_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      heartbeat: {
        running: true,
        started_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        run_id: "zombie-conv",
      },
      processed_conversation_ids: [],
    });
    writeTranscript(transcriptRoot, "conv-1", ts);
    const out = runHeartbeatCheck(tmpDir, "cur-conv");
    assert.strictEqual(out.trigger_heartbeat, true);
    assert.deepStrictEqual(out.candidate_ids, ["conv-1"]);
    const controlPath = path.join(tmpDir, CONTROL_REL);
    const control = JSON.parse(fs.readFileSync(controlPath, "utf8"));
    assert.strictEqual(control.heartbeat.running, false, "when re-triggering due to stale lock, running is false to avoid stuck lock");
  });

  it("updates index mtime and removes deleted transcript entries", () => {
    tmpDir = createTempDir();
    transcriptRoot = path.join(tmpDir, "agent-transcripts");
    fs.mkdirSync(transcriptRoot, { recursive: true });
    prevTranscriptEnv = process.env.CURSOR_AGENT_TRANSCRIPTS_DIR;
    process.env.CURSOR_AGENT_TRANSCRIPTS_DIR = transcriptRoot;

    const ts = Date.now() - 60 * 60 * 1000;
    const keepPath = writeTranscript(transcriptRoot, "keep-conv", ts);
    const deletePath = writeTranscript(transcriptRoot, "delete-conv", ts - 1000);

    writeControl(tmpDir, {
      last_distillation_completed_at: null,
      processed_conversation_ids: [],
    });

    runHeartbeatCheck(tmpDir, "cur-conv");
    fs.rmSync(deletePath);
    fs.utimesSync(keepPath, new Date(ts + 2000), new Date(ts + 2000));
    writeControl(tmpDir, {
      last_distillation_completed_at: null,
      processed_conversation_ids: [],
    });
    runHeartbeatCheck(tmpDir, "cur-conv");

    const index = readIndex(tmpDir);
    const keys = Object.keys(index.transcripts);
    assert.strictEqual(keys.length, 1);
    assert.ok(keys[0].endsWith("keep-conv.jsonl"));
  });
});
