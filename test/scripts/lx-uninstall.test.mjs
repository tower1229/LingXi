/**
 * lx-uninstall script tests (TC-003 to TC-006).
 * Uses temp dir + fixture manifest; runs node scripts/lx-uninstall.mjs --yes with CURSOR_PROJECT_DIR=tmpDir.
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
const SCRIPT_PATH = path.join(REPO_ROOT, "scripts", "lx-uninstall.mjs");
const FIXTURE_MANIFEST = path.join(__dirname, "../fixtures/lx-uninstall-manifest.json");

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "lingxi-test-"));
}

function setupUninstallFixture(tmpDir) {
  const installDir = path.join(tmpDir, "install");
  fs.mkdirSync(installDir, { recursive: true });
  const manifest = JSON.parse(fs.readFileSync(FIXTURE_MANIFEST, "utf8"));
  fs.writeFileSync(
    path.join(installDir, "install-manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8"
  );

  fs.mkdirSync(path.join(tmpDir, ".cursor", ".lingxi", "tasks"), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, ".cursor", ".lingxi", "tasks", "dummy"), "", "utf8");
  fs.mkdirSync(path.join(tmpDir, ".cursor", "commands"), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, ".cursor", "commands", "task.md"), "# task", "utf8");
  fs.writeFileSync(path.join(tmpDir, ".cursor", "hooks.json"), "{}", "utf8");
  fs.mkdirSync(path.join(tmpDir, "scripts"), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, "scripts", "lx-uninstall.mjs"), "dummy", "utf8");

  fs.writeFileSync(path.join(tmpDir, ".cursor", "user-rule.md"), "# user", "utf8");
  fs.writeFileSync(path.join(tmpDir, "scripts", "user-script.js"), "dummy", "utf8");
}

function runUninstall(cwd, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [SCRIPT_PATH, "--yes"], {
      cwd: REPO_ROOT,
      env: { ...process.env, CURSOR_PROJECT_DIR: cwd, ...env },
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

describe("lx-uninstall", () => {
  let tmpDir;

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      try { fs.rmSync(tmpDir, { recursive: true }); } catch (_) {}
    }
  });

  it("TC-003: removes .cursor/.lingxi and manifest paths with --yes", async () => {
    tmpDir = createTempDir();
    setupUninstallFixture(tmpDir);
    const lingxiPath = path.join(tmpDir, ".cursor", ".lingxi");
    assert.ok(fs.existsSync(lingxiPath), "fixture should have .cursor/.lingxi");

    const { code } = await runUninstall(tmpDir);
    assert.strictEqual(code, 0, "exit code 0");
    assert.ok(!fs.existsSync(lingxiPath), ".cursor/.lingxi should be deleted");
  });

  it("TC-004: removes only manifest-listed .cursor and scripts paths", async () => {
    tmpDir = createTempDir();
    setupUninstallFixture(tmpDir);
    const inListCommands = path.join(tmpDir, ".cursor", "commands", "task.md");
    const inListScripts = path.join(tmpDir, "scripts", "lx-uninstall.mjs");
    const userRule = path.join(tmpDir, ".cursor", "user-rule.md");
    const userScript = path.join(tmpDir, "scripts", "user-script.js");

    await runUninstall(tmpDir);

    assert.ok(!fs.existsSync(inListCommands), "manifest commands path should be deleted");
    assert.ok(!fs.existsSync(inListScripts), "manifest scripts path should be deleted");
    assert.ok(fs.existsSync(userRule), "off-manifest .cursor file should remain");
    assert.ok(fs.existsSync(userScript), "off-manifest scripts file should remain");
  });

  it("TC-005: leaves off-manifest content intact", async () => {
    tmpDir = createTempDir();
    setupUninstallFixture(tmpDir);
    const userRule = path.join(tmpDir, ".cursor", "user-rule.md");
    const userScript = path.join(tmpDir, "scripts", "user-script.js");

    await runUninstall(tmpDir);

    assert.strictEqual(fs.readFileSync(userRule, "utf8"), "# user");
    assert.strictEqual(fs.readFileSync(userScript, "utf8"), "dummy");
  });

  it("TC-003 boundary: exit 0 when no install files present", async () => {
    tmpDir = createTempDir();
    const installDir = path.join(tmpDir, "install");
    fs.mkdirSync(installDir, { recursive: true });
    // Manifest with no paths that exist: omit manifestCopyPath so only .cursor/.lingxi is in list (we don't create it)
    fs.writeFileSync(
      path.join(installDir, "install-manifest.json"),
      JSON.stringify({
        commands: [],
        hooks: { files: [] },
        agents: { files: [] },
        references: {},
        scripts: [],
      }),
      "utf8"
    );

    const { code, stdout, stderr } = await runUninstall(tmpDir);
    assert.strictEqual(code, 0);
    const out = stdout + stderr;
    assert.ok(out.includes("未发现灵犀安装文件") || out.includes("无需卸载"), "message in stdout or stderr");
  });
});
