import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import assert from "node:assert";
import { ensureRuntimeState, resolveProjectRoot } from "../../scripts/_lingxi-memory.mjs";

function createTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

describe("lingxi memory runtime core", () => {
  let tempDir;

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    delete process.env.LINGXI_PROJECT_ROOT;
    delete process.env.CODEX_PROJECT_DIR;
  });

  it("resolves the project root from LINGXI_PROJECT_ROOT without depending on CODEX_PROJECT_DIR", () => {
    tempDir = createTempDir("lingxi-memory-runtime-");
    process.env.LINGXI_PROJECT_ROOT = tempDir;
    process.env.CODEX_PROJECT_DIR = path.join(tempDir, "wrong-root");

    assert.strictEqual(resolveProjectRoot(), tempDir);
  });

  it("creates only the LingXi runtime core directories", () => {
    tempDir = createTempDir("lingxi-memory-runtime-");

    ensureRuntimeState(tempDir);

    assert.ok(fs.existsSync(path.join(tempDir, ".lingxi", "memory", "INDEX.md")));
    assert.ok(fs.existsSync(path.join(tempDir, ".lingxi", "state", "processed-sessions.json")));
    assert.ok(!fs.existsSync(path.join(tempDir, ".codex", "agents")));
  });
});
