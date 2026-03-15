/**
 * workspace-bootstrap.mjs tests.
 * Temp dir as project root; run script with CURSOR_PROJECT_DIR; assert dirs and template files exist; idempotent.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, it, afterEach } from "node:test";
import assert from "node:assert";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const SCRIPT_PATH = path.join(REPO_ROOT, "plugin", "skills", "workspace-bootstrap", "scripts", "workspace-bootstrap.mjs");

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "lingxi-bootstrap-"));
}

function runBootstrap(projectRoot) {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [SCRIPT_PATH], {
      cwd: REPO_ROOT,
      env: { ...process.env, CURSOR_PROJECT_DIR: projectRoot },
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

describe("workspace-bootstrap", () => {
  let tmpDir;

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      try { fs.rmSync(tmpDir, { recursive: true }); } catch (_) {}
    }
  });

  it("creates .lingxi dirs and INDEX.md", async () => {
    tmpDir = createTempDir();
    const { code } = await runBootstrap(tmpDir);
    assert.strictEqual(code, 0);

    const indexPath = path.join(tmpDir, ".lingxi", "memory", "INDEX.md");
    const projectDir = path.join(tmpDir, ".lingxi", "memory", "project");
    const shareDir = path.join(tmpDir, ".lingxi", "memory", "share");
    assert.ok(fs.existsSync(indexPath), "INDEX.md should exist");
    assert.ok(fs.existsSync(projectDir), "memory/project should exist");
    assert.ok(fs.existsSync(shareDir), "memory/share should exist");
  });

  it("is idempotent", async () => {
    tmpDir = createTempDir();
    await runBootstrap(tmpDir);
    const { code } = await runBootstrap(tmpDir);
    assert.strictEqual(code, 0);
  });
});
