import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { afterEach, describe, it } from "node:test";
import assert from "node:assert";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const scriptPath = path.join(repoRoot, "scripts", "lingxi-memory-index.mjs");

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "lingxi-index-test-"));
}

function runIndex(projectRoot, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, "--project-root", projectRoot, ...args], {
      cwd: repoRoot,
      env: process.env,
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

describe("lingxi-memory-index", () => {
  let tempDir;

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("writes index rows from memory notes", async () => {
    tempDir = createTempDir();
    const memoryDir = path.join(tempDir, ".lingxi", "memory", "project");
    fs.mkdirSync(memoryDir, { recursive: true });
    fs.writeFileSync(
      path.join(memoryDir, "MEM-001.small-patches.md"),
      `---
id: MEM-001
title: Prefer small patches
kind: preference
scope: project
source: session-distill
updated_at: 2026-04-07T12:00:00Z
when_to_load:
  - When planning code changes
---

# One-liner

Prefer small patches.

# Decision / Preference

Prefer small patches over broad changes.

# Evidence

- Seen in multiple sessions.
`,
      "utf8"
    );

    const result = await runIndex(tempDir, ["--write"]);
    assert.strictEqual(result.code, 0, result.stderr);
    const indexContent = fs.readFileSync(path.join(tempDir, ".lingxi", "memory", "INDEX.md"), "utf8");
    assert.ok(indexContent.includes("MEM-001"));
    assert.ok(indexContent.includes("Prefer small patches"));
  });
});
