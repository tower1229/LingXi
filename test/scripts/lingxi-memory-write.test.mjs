import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { afterEach, describe, it } from "node:test";
import assert from "node:assert";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const scriptPath = path.join(repoRoot, "skills", "memory-write", "scripts", "write-memory.mjs");

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "lingxi-write-test-"));
}

function runWrite(projectRoot, payload) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, "--project-root", projectRoot], {
      cwd: repoRoot,
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"]
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
    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

describe("lingxi memory write", () => {
  let tempDir;

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("creates a memory note and syncs the index", async () => {
    tempDir = createTempDir();
    const payload = {
      title: "Prefer explicit interfaces",
      kind: "preference",
      when_to_load: ["When adding integration boundaries"],
      one_liner: "Prefer explicit interfaces over hidden coupling.",
      decision: "Use explicit interfaces when module boundaries matter.",
      evidence: ["Repeated user preference across architecture discussions."],
      source: "session-distill"
    };

    const result = await runWrite(tempDir, payload);
    assert.strictEqual(result.code, 0, result.stderr);
    const summary = JSON.parse(result.stdout);
    assert.strictEqual(summary.operation, "created");
    assert.ok(fs.existsSync(summary.file));

    const indexContent = fs.readFileSync(path.join(tempDir, ".lingxi", "memory", "INDEX.md"), "utf8");
    assert.ok(indexContent.includes(summary.note_id));
    assert.ok(indexContent.includes("Prefer explicit interfaces"));
  });

  it("merges an identical durable note instead of creating a duplicate", async () => {
    tempDir = createTempDir();
    const payload = {
      title: "Prefer explicit interfaces",
      kind: "preference",
      when_to_load: ["When adding integration boundaries"],
      one_liner: "Prefer explicit interfaces over hidden coupling.",
      decision: "Use explicit interfaces when module boundaries matter.",
      evidence: ["Evidence A"],
      source: "session-distill"
    };

    const first = await runWrite(tempDir, payload);
    assert.strictEqual(first.code, 0, first.stderr);
    const second = await runWrite(tempDir, { ...payload, evidence: ["Evidence B"] });
    assert.strictEqual(second.code, 0, second.stderr);
    const summary = JSON.parse(second.stdout);
    assert.strictEqual(summary.operation, "merged");

    const memoryDir = path.join(tempDir, ".lingxi", "memory", "project");
    const files = fs.readdirSync(memoryDir).filter((name) => name.endsWith(".md"));
    assert.strictEqual(files.length, 1);
    const noteContent = fs.readFileSync(path.join(memoryDir, files[0]), "utf8");
    assert.ok(noteContent.includes("Evidence A"));
    assert.ok(noteContent.includes("Evidence B"));
  });
});
