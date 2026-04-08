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
const scriptPath = path.join(repoRoot, "scripts", "lx-memory-brief.mjs");

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "lingxi-memory-brief-test-"));
}

function runBrief(projectRoot, prompt) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [scriptPath, "--project-root", projectRoot, "--prompt", prompt],
      {
        cwd: repoRoot,
        env: withMemorySemanticTestEnv(process.env),
        stdio: ["ignore", "pipe", "pipe"]
      }
    );
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

describe("lx-memory-brief", () => {
  let tempDir;

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("applies relevant memory for meaningful repository work", async () => {
    tempDir = createTempDir();
    const memoryDir = path.join(tempDir, ".lingxi", "memory", "project");
    fs.mkdirSync(memoryDir, { recursive: true });
    fs.writeFileSync(path.join(tempDir, "package.json"), JSON.stringify({
      name: "memory-brief-project",
      private: true,
      dependencies: {
        express: "^4.21.0"
      }
    }, null, 2) + "\n", "utf8");
    fs.writeFileSync(
      path.join(memoryDir, "MEM-001.rollback.md"),
      `---
id: MEM-001
title: Prefer explicit rollback notes
kind: preference
scope: project
source: session-distill
updated_at: 2026-04-07T12:00:00Z
when_to_load:
  - When reviewing backend integration changes
---

# One-liner

Prefer explicit rollback notes for backend integration changes.

# Decision / Preference

Document rollback path and rollback order before implementation for backend integration changes.

# Evidence

- Rollback visibility repeatedly reduces review risk.
`,
      "utf8"
    );

    const result = await runBrief(tempDir, "Please implement the backend integration seam and make the rollback path explicit.");
    assert.strictEqual(result.code, 0, result.stderr);
    const summary = JSON.parse(result.stdout);
    assert.strictEqual(summary.operation, "applied_memory");
    assert.strictEqual(summary.request_kind, "implementation");
    assert.strictEqual(summary.project_context.kind, "backend");
    assert.strictEqual(summary.hit_count, 1);
    assert.strictEqual(summary.hits[0].note_id, "MEM-001");
    assert.match(summary.active_memory_brief, /Active LingXi Memory:/);
    assert.match(summary.active_memory_brief, /Prefer explicit rollback notes/);
  });

  it("skips trivial conversation turns", async () => {
    tempDir = createTempDir();
    const result = await runBrief(tempDir, "谢谢");
    assert.strictEqual(result.code, 0, result.stderr);
    const summary = JSON.parse(result.stdout);
    assert.strictEqual(summary.operation, "skipped_not_meaningful");
    assert.strictEqual(summary.skip_reason, "trivial_conversation");
    assert.strictEqual(summary.hit_count, 0);
  });
});
