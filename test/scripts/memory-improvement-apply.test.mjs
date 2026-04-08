import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, it, afterEach } from "node:test";
import assert from "node:assert";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const SCRIPT_PATH = path.join(
  REPO_ROOT,
  ".cursor",
  "agents",
  "lingxi-self-iterate",
  "scripts",
  "memory-improvement-apply.mjs"
);

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "lingxi-apply-"));
}

function runScript(projectRoot, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [SCRIPT_PATH, ...args], {
      cwd: REPO_ROOT,
      env: { ...process.env, CURSOR_PROJECT_DIR: projectRoot },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d) => {
      stdout += d;
    });
    child.stderr?.on("data", (d) => {
      stderr += d;
    });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
    child.on("error", reject);
  });
}

describe("memory-improvement-apply script", () => {
  let tmpDir;

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      try {
        fs.rmSync(tmpDir, { recursive: true });
      } catch {}
    }
  });

  it("queues only low-risk actions by default", async () => {
    tmpDir = createTempDir();
    const workspace = path.join(tmpDir, ".lingxi", "workspace");
    fs.mkdirSync(workspace, { recursive: true });
    const proposal = {
      proposal_id: "proposal-001",
      actions: [
        { action_id: "action-001", note_id: "MEM-001", type: "rewrite_one_liner", risk: "low" },
        { action_id: "action-002", note_id: "MEM-002", type: "split_note", risk: "medium" },
      ],
    };
    fs.writeFileSync(path.join(workspace, "improvement-proposal.json"), JSON.stringify(proposal, null, 2), "utf8");

    const { code, stdout } = await runScript(tmpDir, ["--approve-all"]);
    assert.strictEqual(code, 0);
    const result = JSON.parse(stdout.trim());
    assert.strictEqual(result.approved, 2);
    assert.strictEqual(result.applied, 1);
    assert.strictEqual(result.failed, 1);

    const queuePath = path.join(workspace, "improvement-actions.queue.json");
    const queue = JSON.parse(fs.readFileSync(queuePath, "utf8"));
    assert.strictEqual(queue.queued_actions.length, 1);
    assert.strictEqual(queue.queued_actions[0].action_id, "action-001");
  });

  it("is idempotent for repeated proposal_id + action_id", async () => {
    tmpDir = createTempDir();
    const workspace = path.join(tmpDir, ".lingxi", "workspace");
    fs.mkdirSync(workspace, { recursive: true });
    const proposal = {
      proposal_id: "proposal-dup",
      actions: [{ action_id: "action-001", note_id: "MEM-001", type: "rewrite_one_liner", risk: "low" }],
    };
    fs.writeFileSync(path.join(workspace, "improvement-proposal.json"), JSON.stringify(proposal, null, 2), "utf8");

    const first = await runScript(tmpDir, ["--approve-all"]);
    assert.strictEqual(first.code, 0);
    const firstResult = JSON.parse(first.stdout.trim());
    assert.strictEqual(firstResult.applied, 1);
    assert.strictEqual(firstResult.skipped, 0);

    const second = await runScript(tmpDir, ["--approve-all"]);
    assert.strictEqual(second.code, 0);
    const secondResult = JSON.parse(second.stdout.trim());
    assert.strictEqual(secondResult.applied, 0);
    assert.strictEqual(secondResult.skipped, 1);

    const queuePath = path.join(workspace, "improvement-actions.queue.json");
    const queue = JSON.parse(fs.readFileSync(queuePath, "utf8"));
    assert.strictEqual(queue.queued_actions.length, 1);
  });

});
