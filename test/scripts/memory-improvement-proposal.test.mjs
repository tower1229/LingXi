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
  "memory-improvement-proposal.mjs"
);

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "lingxi-proposal-"));
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

describe("memory-improvement-proposal script", () => {
  let tmpDir;

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      try {
        fs.rmSync(tmpDir, { recursive: true });
      } catch {}
    }
  });

  it("generates proposal json and diagnostics md", async () => {
    tmpDir = createTempDir();
    const workspace = path.join(tmpDir, ".cursor", ".lingxi", "workspace");
    fs.mkdirSync(workspace, { recursive: true });
    const now = new Date().toISOString();
    const audit = [
      {
        ts: now,
        event: "memory.merge.diagnosed",
        note_id: "MEM-001",
        source: "heartbeat",
        diagnosis_tags: ["scope_too_narrow"],
        primary_tag: "scope_too_narrow",
        merge_context: { same_scenario: true, same_conclusion: true },
        action_plan: [],
      },
    ];
    fs.writeFileSync(path.join(workspace, "audit.log"), audit.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");

    const { code, stdout } = await runScript(tmpDir, ["--window-hours", "24"]);
    assert.strictEqual(code, 0);
    const result = JSON.parse(stdout.trim());
    assert.strictEqual(result.ok, true);
    assert.ok(result.proposal_id);
    assert.ok(result.summary);
    assert.ok(result.confirmation_hint);

    const proposalPath = path.join(workspace, "improvement-proposal.json");
    const mdPath = path.join(workspace, "memory-diagnostics.md");
    const pendingPath = path.join(workspace, "improvement-pending-confirmation.json");
    assert.ok(fs.existsSync(proposalPath));
    assert.ok(fs.existsSync(mdPath));
    assert.ok(fs.existsSync(pendingPath));

    const proposal = JSON.parse(fs.readFileSync(proposalPath, "utf8"));
    assert.ok(Array.isArray(proposal.findings));
    assert.ok(Array.isArray(proposal.actions));
    assert.strictEqual(proposal.findings.length, 1);
    assert.strictEqual(proposal.actions.length, 1);

    const controlPath = path.join(workspace, "heartbeat-control.json");
    const control = JSON.parse(fs.readFileSync(controlPath, "utf8"));
    assert.ok(control.last_improvement_cycle_at);

    const pending = JSON.parse(fs.readFileSync(pendingPath, "utf8"));
    assert.strictEqual(pending.proposal_id, proposal.proposal_id);
    assert.strictEqual(pending.status, "pending_confirmation");
  });
});
