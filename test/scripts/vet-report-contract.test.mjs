import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { afterEach, describe, it } from "node:test";
import assert from "node:assert";
import { fileURLToPath } from "node:url";
import {
  VET_REPORT_REQUIRED_FIELDS,
  VET_REPORT_SCHEMA_VERSION,
  validateVetReportShape
} from "../../skills/vet/scripts/vet-report.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const setupPath = path.join(repoRoot, "scripts", "lingxi-setup.mjs");
const taskPath = path.join(repoRoot, "skills", "task", "scripts", "write-task.mjs");
const vetPath = path.join(repoRoot, "skills", "vet", "scripts", "vet-task.mjs");
const schemaPath = path.join(repoRoot, "skills", "vet", "references", "vet-report.schema.json");

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "lingxi-vet-report-"));
}

function runNode(script, projectRoot, args = [], stdinJson = null) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], {
      cwd: repoRoot,
      env: { ...process.env, CODEX_PROJECT_DIR: projectRoot },
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
    if (stdinJson != null) {
      child.stdin.write(JSON.stringify(stdinJson));
    }
    child.stdin.end();
  });
}

describe("vet report contract", () => {
  let tempDir;

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("keeps required validator fields in sync with the VetReport schema draft", () => {
    const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
    assert.deepStrictEqual(schema.required, VET_REPORT_REQUIRED_FIELDS);
  });

  it("emits a VetReport that satisfies the stable contract", async () => {
    tempDir = createTempDir();
    await runNode(setupPath, tempDir);
    const created = await runNode(taskPath, tempDir, [], {
      title: "API seam",
      goal: "Clarify the backend API boundary.",
      complexity: "中等",
      type: "后端",
      background: "Service behavior currently crosses modules implicitly.",
      problem: "The current integration seam is difficult to review safely.",
      solution_overview: "Introduce one explicit backend seam for the service layer.",
      scope: [
        "Add one explicit integration interface",
        "Constrain the service change to the current module seam"
      ],
      constraints: ["Do not change runtime behavior", "Keep external API stable"],
      acceptance_criteria: [
        "The backend API exposes one explicit documented seam",
        "The change stays inside the current service boundary"
      ],
      non_goals: ["不调整无关接口或数据模型"],
      user_stories: [
        {
          as_a: "service maintainer",
          i_want: "a clear backend seam",
          so_that: "I can review the change against an explicit contract",
          acceptance_criteria: ["The backend API exposes one explicit documented seam"]
        }
      ]
    });
    assert.strictEqual(created.code, 0, created.stderr);
    const vet = await runNode(vetPath, tempDir);
    assert.strictEqual(vet.code, 0, vet.stderr);
    const report = JSON.parse(vet.stdout);
    assert.strictEqual(report.report_version, VET_REPORT_SCHEMA_VERSION);
    assert.deepStrictEqual(validateVetReportShape(report), []);
    assert.ok(Array.isArray(report.revision_targets));
  });
});
