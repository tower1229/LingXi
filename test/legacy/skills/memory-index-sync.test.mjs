/**
 * memory-index-sync.mjs tests.
 * Builds temp memory root (INDEX.md + notes); runs script with --root; asserts stdout JSON.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, it, afterEach } from "node:test";
import assert from "node:assert";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../..");
const SCRIPT_PATH = path.join(REPO_ROOT, ".cursor", "skills", "memory-govern", "scripts", "memory-index-sync.mjs");

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "lingxi-memory-"));
}

function runMemoryIndexSync(memoryRoot) {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [SCRIPT_PATH, "--root", memoryRoot], {
      cwd: REPO_ROOT,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d) => { stdout += d; });
    child.stderr?.on("data", (d) => { stderr += d; });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
    child.on("error", reject);
  });
}

const INDEX_HEADER = `# Memory Index

## Memories

| Id | Kind | Title | When to load | Status | Strength | Scope | File |
| --- | ---- | ----- | ------------ | ------ | -------- | ----- | ---- |
`;

describe("memory-index-sync", () => {
  let tmpDir;

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      try { fs.rmSync(tmpDir, { recursive: true }); } catch (_) {}
    }
  });

  it("outputs JSON with orphanDeleted, unindexedNotes, duplicateIds", async () => {
    tmpDir = createTempDir();
    fs.mkdirSync(path.join(tmpDir, "project"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "INDEX.md"), INDEX_HEADER, "utf8");
    const noteContent = `---
- **Id**: MEM-001
- **Kind**: preference
- **Status**: active
---
# Title
`;
    fs.writeFileSync(path.join(tmpDir, "project", "MEM-001.md"), noteContent, "utf8");

    const { code, stdout } = await runMemoryIndexSync(tmpDir);
    assert.strictEqual(code, 0);
    const out = JSON.parse(stdout.trim());
    assert.ok(Array.isArray(out.orphanDeleted));
    assert.ok(Array.isArray(out.unindexedNotes));
    assert.ok(Array.isArray(out.duplicateIds));
  });

  it("reports unindexed note when INDEX has no row for it", async () => {
    tmpDir = createTempDir();
    fs.mkdirSync(path.join(tmpDir, "project"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "INDEX.md"), INDEX_HEADER, "utf8");
    fs.writeFileSync(
      path.join(tmpDir, "project", "NEW.md"),
      "---\n- **Id**: NEW\n---\n# New\n",
      "utf8"
    );

    const { code, stdout } = await runMemoryIndexSync(tmpDir);
    assert.strictEqual(code, 0);
    const out = JSON.parse(stdout.trim());
    assert.ok(out.unindexedNotes.length >= 1);
  });

  it("returns empty result when memory root does not exist", async () => {
    const notExist = path.join(os.tmpdir(), "lingxi-nonexistent-" + Date.now());
    const { code, stdout } = await runMemoryIndexSync(notExist);
    assert.strictEqual(code, 0);
    const out = JSON.parse(stdout.trim());
    assert.deepStrictEqual(out.orphanDeleted, []);
    assert.deepStrictEqual(out.unindexedNotes, []);
    assert.deepStrictEqual(out.duplicateIds, []);
  });
});
