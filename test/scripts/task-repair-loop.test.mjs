import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { afterEach, describe, it } from "node:test";
import assert from "node:assert";
import { fileURLToPath } from "node:url";
import { TASK_SPEC_SCHEMA_VERSION } from "../../skills/task/scripts/task-spec.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const setupPath = path.join(repoRoot, "scripts", "lingxi-setup.mjs");
const repairLoopPath = path.join(repoRoot, "skills", "task", "scripts", "task-repair-loop.mjs");

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "lingxi-task-repair-"));
}

function buildValidTaskSpec(overrides = {}) {
  return {
    schema_version: TASK_SPEC_SCHEMA_VERSION,
    title: "API seam",
    type: "后端",
    complexity: "中等",
    project_context: null,
    background: "Integration boundaries are currently implicit.",
    problem: "The current module seam is hard to review safely.",
    solution_overview: "Introduce one explicit backend contract and keep the change bounded.",
    goals: ["Clarify the backend seam"],
    non_goals: ["不扩展为新的服务能力"],
    success_criteria: ["The backend seam is explicit and reviewable"],
    user_stories: [
      {
        as_a: "service maintainer",
        i_want: "one explicit backend seam",
        so_that: "I can review the change against a stable contract",
        acceptance_criteria: ["The backend seam is explicit and reviewable"]
      }
    ],
    functional_requirements: [
      {
        id: "F1",
        title: "Define seam",
        description: "Describe the request and response boundary",
        implementation_scheme: "Document one explicit contract for the current service seam",
        acceptance_criteria: ["The backend seam is explicit and reviewable"],
        verification_method: "integration",
        edge_cases: ["invalid input"],
        evidence: "Contract review with one integration check",
        priority: "必须"
      }
    ],
    guidance_blocks: [
      {
        kind: "backend_contract_guidance",
        title: "契约与边界指导",
        bullets: [
          "先把 request/response contract 写清楚，再进入实现。",
          "把变更收在当前服务边界和既有回滚路径内。"
        ]
      }
    ],
    constraints: ["Do not change runtime behavior"],
    memory_refs: [],
    open_questions: [],
    confidence: 0.82,
    ...overrides
  };
}

function runNode(script, projectRoot, stdinJson = null) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], {
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

describe("task repair loop", () => {
  let tempDir;

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("returns needs_repair with structured validator issues when the initial spec is invalid", async () => {
    tempDir = createTempDir();
    const result = await runNode(repairLoopPath, tempDir, {
      initial_spec: {
        title: "API seam",
        type: "后端"
      }
    });
    assert.strictEqual(result.code, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.strictEqual(payload.loop_version, "draft-2026-04-07");
    assert.strictEqual(payload.task_spec_version, TASK_SPEC_SCHEMA_VERSION);
    assert.strictEqual(payload.status, "needs_repair");
    assert.strictEqual(payload.phase, "initial");
    assert.strictEqual(payload.initial_validation.ok, false);
    assert.ok(payload.initial_validation.issue_count > 0, result.stdout);
    assert.match(payload.suggested_next_action, /repaired_spec/i);
  });

  it("returns repair_failed when the repaired spec is still invalid", async () => {
    tempDir = createTempDir();
    const result = await runNode(repairLoopPath, tempDir, {
      initial_spec: {
        title: "API seam",
        type: "后端"
      },
      repaired_spec: {
        ...buildValidTaskSpec(),
        non_goals: []
      }
    });
    assert.strictEqual(result.code, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.strictEqual(payload.status, "repair_failed");
    assert.strictEqual(payload.phase, "repair");
    assert.strictEqual(payload.initial_validation.ok, false);
    assert.strictEqual(payload.repair_validation.ok, false);
    assert.ok(payload.repair_validation.issue_count > 0, result.stdout);
  });

  it("compiles immediately when the initial spec is already valid", async () => {
    tempDir = createTempDir();
    await runNode(setupPath, tempDir);
    const result = await runNode(repairLoopPath, tempDir, {
      initial_spec: buildValidTaskSpec()
    });
    assert.strictEqual(result.code, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.strictEqual(payload.status, "compiled");
    assert.strictEqual(payload.phase, "initial");
    assert.strictEqual(payload.initial_validation.ok, true);
    assert.ok(payload.compiled_task?.file, result.stdout);
    assert.ok(fs.existsSync(payload.compiled_task.file), result.stdout);
    const document = fs.readFileSync(payload.compiled_task.file, "utf8");
    assert.match(document, /^# \d+\.task\.api-seam\.md/m);
    assert.match(document, /## 4\. 功能需求/);
    assert.match(document, /## 5\. 开发指导/);
    assert.match(document, /### F1: Define seam/);
  });

  it("compiles the repaired spec after validator-guided correction", async () => {
    tempDir = createTempDir();
    await runNode(setupPath, tempDir);
    const result = await runNode(repairLoopPath, tempDir, {
      initial_spec: {
        title: "API seam",
        type: "后端"
      },
      repaired_spec: buildValidTaskSpec()
    });
    assert.strictEqual(result.code, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.strictEqual(payload.status, "compiled");
    assert.strictEqual(payload.phase, "repair");
    assert.strictEqual(payload.initial_validation.ok, false);
    assert.strictEqual(payload.repair_validation.ok, true);
    assert.ok(payload.compiled_task?.task_id, result.stdout);
    assert.ok(fs.existsSync(payload.compiled_task.file), result.stdout);
    const document = fs.readFileSync(payload.compiled_task.file, "utf8");
    assert.match(document, /## 4\. 功能需求/);
    assert.match(document, /## 5\. 开发指导/);
    assert.match(document, /Define seam/);
  });
});
