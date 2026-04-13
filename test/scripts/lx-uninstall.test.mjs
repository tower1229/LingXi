/**
 * lx-uninstall script tests.
 * Uses temp dir + fixture manifest; runs node scripts/lx-uninstall.mjs --yes with CODEX_PROJECT_DIR=tmpDir.
 */
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, it, afterEach } from "node:test";
import assert from "node:assert";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const SCRIPT_PATH = path.join(REPO_ROOT, "scripts", "lx-uninstall.mjs");
const FIXTURE_MANIFEST = path.join(__dirname, "../fixtures/lx-uninstall-manifest.json");

function createTempDir() {
  return fs.mkdtempSync(path.join("/tmp", "lingxi-test-"));
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

  fs.mkdirSync(path.join(tmpDir, ".codex-plugin"), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, ".codex-plugin", "plugin.json"), "{}", "utf8");
  fs.mkdirSync(path.join(tmpDir, "skills", "task", "scripts"), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, "skills", "task", "SKILL.md"), "---\nname: task\ndescription: test\n---\n", "utf8");
  fs.writeFileSync(path.join(tmpDir, "skills", "task", "scripts", "write-task.mjs"), "dummy", "utf8");
  fs.mkdirSync(path.join(tmpDir, "scripts"), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, "scripts", "_lingxi-memory.mjs"), "dummy", "utf8");
  fs.writeFileSync(path.join(tmpDir, "scripts", "lx-bootstrap.mjs"), "dummy", "utf8");
  fs.writeFileSync(path.join(tmpDir, "scripts", "lx-create-automation.mjs"), "dummy", "utf8");
  fs.writeFileSync(path.join(tmpDir, "scripts", "lx-memory-hook.mjs"), "dummy", "utf8");
  fs.writeFileSync(path.join(tmpDir, "scripts", "lingxi-memory-index.mjs"), "dummy", "utf8");
  fs.writeFileSync(path.join(tmpDir, "scripts", "lingxi-setup.mjs"), "dummy", "utf8");
  fs.writeFileSync(path.join(tmpDir, "scripts", "lx-uninstall.mjs"), "dummy", "utf8");
  fs.mkdirSync(path.join(tmpDir, "templates", "agents"), { recursive: true });
  fs.mkdirSync(path.join(tmpDir, "templates", "automations"), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, "templates", "agents", "lingxi-session-distill.toml.tmpl"), "dummy", "utf8");
  fs.writeFileSync(path.join(tmpDir, "templates", "automations", "session-distill.toml.tmpl"), "dummy", "utf8");
  fs.mkdirSync(path.join(tmpDir, ".lingxi", "state"), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, ".lingxi", "state", "processed-sessions.json"), "{}", "utf8");
  fs.mkdirSync(path.join(tmpDir, ".codex", "agents"), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, ".codex", "config.toml"), "[features]\ncodex_hooks = true\n", "utf8");
  fs.writeFileSync(path.join(tmpDir, ".codex", "hooks.json"), "{\n  \"hooks\": {}\n}\n", "utf8");
  fs.writeFileSync(path.join(tmpDir, ".codex", "agents", "lingxi-session-distill.toml"), "dummy", "utf8");
  fs.writeFileSync(
    path.join(tmpDir, "package.json"),
    JSON.stringify({
      name: "fixture-project",
      private: true,
      scripts: {
        test: "node --test",
        "lx:bootstrap": "node scripts/lx-bootstrap.mjs",
        "lx:create-automation": "node scripts/lx-create-automation.mjs",
        "lx:setup": "node scripts/lingxi-setup.mjs",
        "lx:uninstall": "node scripts/lx-uninstall.mjs"
      }
    }, null, 2) + "\n",
    "utf8"
  );

  fs.writeFileSync(path.join(tmpDir, ".codex-plugin", "user-extension.json"), "{}", "utf8");
  fs.writeFileSync(path.join(tmpDir, "scripts", "user-script.js"), "dummy", "utf8");
}

function runUninstall(cwd, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [SCRIPT_PATH, "--yes"], {
      cwd: REPO_ROOT,
      env: { ...process.env, CODEX_PROJECT_DIR: cwd, ...env },
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
      try { fs.rmSync(tmpDir, { recursive: true }); } catch (_) { }
    }
  });

  it("removes runtime paths and manifest-managed files with --yes", async () => {
    tmpDir = createTempDir();
    setupUninstallFixture(tmpDir);
    const lingxiPath = path.join(tmpDir, ".lingxi");
    assert.ok(fs.existsSync(lingxiPath), "fixture should have .lingxi");

    const { code } = await runUninstall(tmpDir);
    assert.strictEqual(code, 0, "exit code 0");
    assert.ok(!fs.existsSync(lingxiPath), ".lingxi should be deleted");
  });

  it("removes only manifest-listed files", async () => {
    tmpDir = createTempDir();
    setupUninstallFixture(tmpDir);
    const inListPlugin = path.join(tmpDir, ".codex-plugin", "plugin.json");
    const inListScripts = path.join(tmpDir, "scripts", "lx-uninstall.mjs");
    const userExtension = path.join(tmpDir, ".codex-plugin", "user-extension.json");
    const userScript = path.join(tmpDir, "scripts", "user-script.js");

    await runUninstall(tmpDir);

    assert.ok(!fs.existsSync(inListPlugin), "manifest plugin path should be deleted");
    assert.ok(!fs.existsSync(inListScripts), "manifest scripts path should be deleted");
    assert.ok(fs.existsSync(userExtension), "off-manifest plugin file should remain");
    assert.ok(fs.existsSync(userScript), "off-manifest scripts file should remain");
  });

  it("removes generated LingXi 2.0 runtime paths declared by the install manifest", async () => {
    tmpDir = createTempDir();
    setupUninstallFixture(tmpDir);

    const runtimeRoot = path.join(tmpDir, ".lingxi");
    const codexConfig = path.join(tmpDir, ".codex", "config.toml");
    const codexHooks = path.join(tmpDir, ".codex", "hooks.json");
    const codexAgent = path.join(tmpDir, ".codex", "agents", "lingxi-session-distill.toml");

    await runUninstall(tmpDir);

    assert.ok(!fs.existsSync(runtimeRoot), ".lingxi runtime root should be deleted");
    assert.ok(!fs.existsSync(codexConfig), ".codex config should be deleted");
    assert.ok(!fs.existsSync(codexHooks), ".codex hooks should be deleted");
    assert.ok(!fs.existsSync(codexAgent), ".codex agent file should be deleted");
  });

  it("leaves off-manifest content intact", async () => {
    tmpDir = createTempDir();
    setupUninstallFixture(tmpDir);
    const userExtension = path.join(tmpDir, ".codex-plugin", "user-extension.json");
    const userScript = path.join(tmpDir, "scripts", "user-script.js");

    await runUninstall(tmpDir);

    assert.strictEqual(fs.readFileSync(userExtension, "utf8"), "{}");
    assert.strictEqual(fs.readFileSync(userScript, "utf8"), "dummy");
  });

  it("removes LingXi-managed package scripts but preserves unrelated scripts", async () => {
    tmpDir = createTempDir();
    setupUninstallFixture(tmpDir);

    await runUninstall(tmpDir);

    const pkg = JSON.parse(fs.readFileSync(path.join(tmpDir, "package.json"), "utf8"));
    assert.deepStrictEqual(pkg.scripts, {
      test: "node --test"
    });
  });

  it("exit 0 when no install files present", async () => {
    tmpDir = createTempDir();
    const installDir = path.join(tmpDir, "install");
    fs.mkdirSync(installDir, { recursive: true });
    fs.writeFileSync(
      path.join(installDir, "install-manifest.json"),
      JSON.stringify({
        files: [],
        runtimeFiles: [],
      }),
      "utf8"
    );

    const { code, stdout, stderr } = await runUninstall(tmpDir);
    assert.strictEqual(code, 0);
    const out = stdout + stderr;
    assert.ok(out.includes("未发现灵犀安装文件") || out.includes("无需卸载"), "message in stdout or stderr");
  });

  it("fails fast when the manifest is missing but LingXi-managed assets still remain", async () => {
    tmpDir = createTempDir();
    setupUninstallFixture(tmpDir);
    fs.rmSync(path.join(tmpDir, "install", "install-manifest.json"));

    const { code, stdout, stderr } = await runUninstall(tmpDir);
    assert.strictEqual(code, 1);
    const out = stdout + stderr;
    assert.ok(out.includes("未找到安装清单"), out);
    assert.ok(out.includes(".codex-plugin/plugin.json") || out.includes(".lingxi"), out);
  });

  it("is idempotent when uninstall runs twice", async () => {
    tmpDir = createTempDir();
    setupUninstallFixture(tmpDir);

    const first = await runUninstall(tmpDir);
    assert.strictEqual(first.code, 0, first.stderr);
    const second = await runUninstall(tmpDir);
    assert.strictEqual(second.code, 0, second.stderr);
    const out = second.stdout + second.stderr;
    assert.ok(out.includes("未发现灵犀安装文件") || out.includes("无需卸载"), out);
  });
});
