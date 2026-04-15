import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import { afterEach, describe, it } from "node:test";
import assert from "node:assert";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const installerPath = path.join(repoRoot, "install", "bash.sh");

function createTempDir(prefix) {
  return fs.mkdtempSync(path.join("/tmp", prefix));
}

function createStaticServer(rootDir) {
  const server = http.createServer((req, res) => {
    const requestPath = decodeURIComponent((req.url || "/").split("?")[0]);
    const relativePath = requestPath.replace(/^\/+/, "");
    const filePath = path.resolve(rootDir, relativePath);
    const relativeFromRoot = path.relative(rootDir, filePath);

    if (relativeFromRoot.startsWith("..") || path.isAbsolute(relativeFromRoot)) {
      res.writeHead(403);
      res.end("forbidden");
      return;
    }

    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      res.writeHead(404);
      res.end("not found");
      return;
    }

    res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    fs.createReadStream(filePath).pipe(res);
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("failed to resolve local install test server address"));
        return;
      }
      resolve({ server, baseUrl: `http://127.0.0.1:${address.port}` });
    });
  });
}

function runInstaller(projectRoot, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn("bash", [installerPath], {
      cwd: projectRoot,
      env: { ...process.env, ...extraEnv },
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

describe("install/bash.sh smoke", () => {
  let projectDir;
  let codexHome;
  let server;

  afterEach(async () => {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
      server = null;
    }

    for (const dir of [projectDir, codexHome]) {
      if (dir && fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  it("installs the supported Codex runtime surface and bootstraps automation end to end", async () => {
    projectDir = createTempDir("lingxi-install-project-");
    codexHome = createTempDir("lingxi-install-codex-home-");

    fs.writeFileSync(
      path.join(projectDir, "package.json"),
      "\uFEFF" + JSON.stringify({
        name: "install-smoke-project",
        private: true
      }, null, 2) + "\n",
      "utf8"
    );
    fs.mkdirSync(path.join(projectDir, ".codex", "agents"), { recursive: true });
    fs.mkdirSync(path.join(projectDir, ".lingxi", "setup"), { recursive: true });
    fs.writeFileSync(
      path.join(projectDir, ".codex", "agents", "lingxi-session-distill.toml"),
      "legacy agent prompt\n",
      "utf8"
    );
    const localServer = await createStaticServer(repoRoot);
    server = localServer.server;

    const result = await runInstaller(projectDir, {
      BASE_URL: localServer.baseUrl,
      AUTO_CONFIRM: "true",
      NONINTERACTIVE: "1",
      CODEX_HOME: codexHome
    });

    assert.strictEqual(result.code, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /LingXi 2\.0 runtime and automation bootstrap completed/);
    assert.match(result.stdout, /Install complete/);

    const pkg = JSON.parse(fs.readFileSync(path.join(projectDir, "package.json"), "utf8"));
    assert.strictEqual(pkg.scripts["lx:bootstrap"], "node scripts/lx-bootstrap.mjs");
    assert.strictEqual(pkg.scripts["lx:distill-sessions"], "node scripts/lx-distill-sessions.mjs");
    assert.strictEqual(pkg.scripts["lx:setup"], "node scripts/lingxi-setup.mjs");
    assert.strictEqual(pkg.scripts["lx:uninstall"], "node scripts/lx-uninstall.mjs");

    assert.ok(fs.existsSync(path.join(projectDir, ".lingxi", "memory", "INDEX.md")));
    assert.ok(!fs.existsSync(path.join(projectDir, ".lingxi", "setup", "automation.session-distill.toml")));
    assert.ok(fs.existsSync(path.join(projectDir, ".codex", "config.toml")));
    assert.ok(fs.existsSync(path.join(projectDir, ".codex", "hooks.json")));
    assert.ok(fs.existsSync(path.join(projectDir, ".codex", "agents", "lingxi-session-distill.toml")));
    assert.ok(fs.existsSync(path.join(projectDir, "AGENTS.md")));

    const generatedAgent = fs.readFileSync(
      path.join(projectDir, ".codex", "agents", "lingxi-session-distill.toml"),
      "utf8"
    );
    assert.match(generatedAgent, /Run `node scripts\/lx-distill-sessions\.mjs`/);
    assert.match(generatedAgent, /Do not bypass the runner by manually reading Codex session artifacts\./);

    assert.ok(!fs.existsSync(path.join(codexHome, "automations")));
  });
});
