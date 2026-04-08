import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { afterEach, describe, it } from "node:test";
import assert from "node:assert";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const bootstrapScriptPath = path.join(repoRoot, "scripts", "lx-bootstrap.mjs");

function createTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function runNode(scriptPath, projectRoot, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: repoRoot,
      env: { ...process.env, CODEX_PROJECT_DIR: projectRoot, ...extraEnv },
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

describe("lx-bootstrap", () => {
  let projectDir;
  let codexHome;

  afterEach(() => {
    for (const dir of [projectDir, codexHome]) {
      if (dir && fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  it("completes runtime setup and automation registration in one step", async () => {
    projectDir = createTempDir("lingxi-bootstrap-project-");
    codexHome = createTempDir("lingxi-bootstrap-codex-home-");

    const result = await runNode(bootstrapScriptPath, projectDir, { CODEX_HOME: codexHome });
    assert.strictEqual(result.code, 0, result.stderr);

    const summary = JSON.parse(result.stdout);
    assert.strictEqual(summary.operation, "bootstrapped");
    assert.strictEqual(summary.project_root, projectDir);
    assert.strictEqual(summary.memory_loop_ready, true);
    assert.strictEqual(summary.setup.target_root, projectDir);
    assert.ok(summary.automation.automation_id.startsWith("lingxi-session-distill-"));

    assert.ok(fs.existsSync(path.join(projectDir, ".lingxi", "memory", "INDEX.md")));
    assert.ok(fs.existsSync(path.join(projectDir, ".codex", "agents", "lingxi-session-distill.toml")));
    assert.ok(fs.existsSync(summary.automation.automation_path));
  });
});
