import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { afterEach, describe, it } from "node:test";
import assert from "node:assert";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const setupScriptPath = path.join(repoRoot, "scripts", "lingxi-setup.mjs");
const createAutomationScriptPath = path.join(repoRoot, "scripts", "lx-create-automation.mjs");

function createTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function runNode(scriptPath, projectRoot, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: repoRoot,
      env: { ...process.env, CODEX_PROJECT_DIR: projectRoot, LINGXI_PROJECT_ROOT: projectRoot, ...extraEnv },
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

describe("lx-create-automation", () => {
  let projectDir;
  let codexHome;

  afterEach(() => {
    for (const dir of [projectDir, codexHome]) {
      if (dir && fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  it("creates a Codex automation from the generated LingXi automation artifact", async () => {
    projectDir = createTempDir("lingxi-project-");
    codexHome = createTempDir("lingxi-codex-home-");

    const setup = await runNode(setupScriptPath, projectDir);
    assert.strictEqual(setup.code, 0, setup.stderr);

    const result = await runNode(createAutomationScriptPath, projectDir, { CODEX_HOME: codexHome });
    assert.strictEqual(result.code, 0, result.stderr);

    const summary = JSON.parse(result.stdout);
    assert.strictEqual(summary.created, true);
    assert.ok(summary.automation_id.startsWith("lingxi-session-distill-"));
    const automationToml = fs.readFileSync(summary.automation_path, "utf8");
    assert.match(automationToml, /^version = 1$/m);
    assert.match(automationToml, /^name = "LingXi Session Distill"$/m);
    assert.match(automationToml, /^rrule = "RRULE:FREQ=HOURLY;INTERVAL=6"$/m);
    assert.match(automationToml, /^execution_environment = "local"$/m);
    assert.match(automationToml, /lx-distill-sessions\.mjs/);
    assert.match(automationToml, new RegExp(`^cwds = \\["${projectDir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\/g, "\\\\")}"\\]$`, "m"));
  });

  it("updates an existing automation in place and preserves created_at", async () => {
    projectDir = createTempDir("lingxi-project-");
    codexHome = createTempDir("lingxi-codex-home-");

    const setup = await runNode(setupScriptPath, projectDir);
    assert.strictEqual(setup.code, 0, setup.stderr);

    const first = await runNode(createAutomationScriptPath, projectDir, { CODEX_HOME: codexHome });
    assert.strictEqual(first.code, 0, first.stderr);
    const firstSummary = JSON.parse(first.stdout);
    const firstToml = fs.readFileSync(firstSummary.automation_path, "utf8");
    const createdAt = Number(firstToml.match(/^created_at = (\d+)$/m)?.[1]);
    assert.ok(Number.isFinite(createdAt));

    const second = await runNode(createAutomationScriptPath, projectDir, { CODEX_HOME: codexHome });
    assert.strictEqual(second.code, 0, second.stderr);
    const secondSummary = JSON.parse(second.stdout);
    assert.strictEqual(secondSummary.created, false);
    assert.strictEqual(secondSummary.automation_path, firstSummary.automation_path);

    const secondToml = fs.readFileSync(secondSummary.automation_path, "utf8");
    assert.match(secondToml, new RegExp(`^created_at = ${createdAt}$`, "m"));
  });

  it("fails with guidance when setup has not generated the automation artifact", async () => {
    projectDir = createTempDir("lingxi-project-");
    codexHome = createTempDir("lingxi-codex-home-");

    const result = await runNode(createAutomationScriptPath, projectDir, { CODEX_HOME: codexHome });
    assert.strictEqual(result.code, 1);
    assert.match(result.stderr, /请先运行 node scripts\/lingxi-setup\.mjs/);
  });
});
