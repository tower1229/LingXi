import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { afterEach, describe, it } from "node:test";
import assert from "node:assert";
import { fileURLToPath } from "node:url";
import { withMemorySemanticTestEnv } from "../helpers/memory-semantic-env.mjs";
import { buildConversationMemoryBrief } from "../../scripts/_lingxi-memory.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const scriptPath = path.join(repoRoot, "scripts", "lx-memory-hook.mjs");

function createTempDir() {
  return fs.mkdtempSync(path.join("/tmp", "lingxi-memory-hook-test-"));
}

function seedBackendProject(projectRoot) {
  fs.writeFileSync(path.join(projectRoot, "package.json"), JSON.stringify({
    name: "memory-hook-project",
    private: true,
    dependencies: {
      express: "^4.21.0"
    }
  }, null, 2) + "\n", "utf8");
}

function seedProjectWithMemory(projectRoot) {
  const memoryDir = path.join(projectRoot, ".lingxi", "memory", "project");
  fs.mkdirSync(memoryDir, { recursive: true });
  seedBackendProject(projectRoot);
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
}

function runHook(projectRoot, payload, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [scriptPath],
      {
        cwd: repoRoot,
        env,
        stdio: ["pipe", "pipe", "pipe"]
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
    child.stdin.end(JSON.stringify(payload));
  });
}

async function withSemanticEnv(fn) {
  const originalEnv = { ...process.env };
  Object.assign(process.env, withMemorySemanticTestEnv(process.env));
  try {
    return await fn();
  } finally {
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, originalEnv);
  }
}

describe("lx-memory-hook", () => {
  let tempDir;

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("builds a conversation memory brief for meaningful repository work", async () => {
    tempDir = createTempDir();
    seedProjectWithMemory(tempDir);

    const summary = await withSemanticEnv(() => buildConversationMemoryBrief(
      tempDir,
      "Please implement the backend integration seam and make the rollback path explicit.",
      { caller: "memory-hook" }
    ));

    assert.strictEqual(summary.operation, "applied_memory");
    assert.strictEqual(summary.request_kind, "implementation");
    assert.strictEqual(summary.project_context.kind, "backend");
    assert.strictEqual(summary.hit_count, 1);
    assert.strictEqual(summary.hits[0].note_id, "MEM-001");
    assert.match(summary.active_memory_brief, /Active LingXi Memory:/);
    assert.match(summary.active_memory_brief, /Prefer explicit rollback notes/);
  });

  it("skips trivial conversation turns in the core API", async () => {
    tempDir = createTempDir();
    const summary = await withSemanticEnv(() => buildConversationMemoryBrief(tempDir, "谢谢", { caller: "memory-hook" }));

    assert.strictEqual(summary.operation, "skipped_not_meaningful");
    assert.strictEqual(summary.skip_reason, "trivial_conversation");
    assert.strictEqual(summary.hit_count, 0);
  });

  it("injects additionalContext for meaningful prompts with relevant memory", async () => {
    tempDir = createTempDir();
    seedProjectWithMemory(tempDir);

    const result = await runHook(tempDir, {
      hook_event_name: "UserPromptSubmit",
      cwd: tempDir,
      prompt: "Please implement the backend integration seam and make the rollback path explicit."
    }, withMemorySemanticTestEnv(process.env));

    assert.strictEqual(result.code, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.strictEqual(output.hookSpecificOutput.hookEventName, "UserPromptSubmit");
    assert.match(output.hookSpecificOutput.additionalContext, /Active LingXi Memory:/);
    assert.match(output.hookSpecificOutput.additionalContext, /Prefer explicit rollback notes/);
  });

  it("returns no output for trivial prompts or when no memory applies", async () => {
    tempDir = createTempDir();
    seedProjectWithMemory(tempDir);

    const trivial = await runHook(tempDir, {
      hook_event_name: "UserPromptSubmit",
      cwd: tempDir,
      prompt: "谢谢"
    }, withMemorySemanticTestEnv(process.env));
    assert.strictEqual(trivial.code, 0, trivial.stderr);
    assert.strictEqual(trivial.stdout, "");

    fs.rmSync(tempDir, { recursive: true, force: true });
    tempDir = createTempDir();
    seedBackendProject(tempDir);

    const noHits = await runHook(tempDir, {
      hook_event_name: "UserPromptSubmit",
      cwd: tempDir,
      prompt: "Please help me rename a backend route handler for clarity."
    }, withMemorySemanticTestEnv(process.env));
    assert.strictEqual(noHits.code, 0, noHits.stderr);
    assert.strictEqual(noHits.stdout, "");
  });

  it("fails open when semantic retrieval errors", async () => {
    tempDir = createTempDir();
    seedProjectWithMemory(tempDir);

    const result = await runHook(tempDir, {
      hook_event_name: "UserPromptSubmit",
      cwd: tempDir,
      prompt: "Please implement the backend integration seam and make the rollback path explicit."
    }, {
      ...process.env,
      LINGXI_MEMORY_SEMANTIC_RUNNER_MODULE: path.join(tempDir, "missing-runner.mjs")
    });

    assert.strictEqual(result.code, 0, result.stderr);
    assert.strictEqual(result.stdout, "");

    const opsLog = fs.readFileSync(path.join(tempDir, ".lingxi", "state", "memory-ops.jsonl"), "utf8");
    assert.match(opsLog, /conversation_memory_failed_open/);
    assert.match(opsLog, /missing-runner\.mjs/);
  });
});
