import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { afterEach, describe, it } from "node:test";
import assert from "node:assert";
import { fileURLToPath } from "node:url";
import {
  TASK_SPEC_REQUIRED_FIELDS,
  TASK_SPEC_SCHEMA_VERSION,
  validateTaskSpecShape
} from "../../skills/task/scripts/task-spec.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const setupPath = path.join(repoRoot, "scripts", "lingxi-setup.mjs");
const taskPath = path.join(repoRoot, "skills", "task", "scripts", "write-task.mjs");
const validateTaskSpecPath = path.join(repoRoot, "skills", "task", "scripts", "validate-task-spec.mjs");
const compileTaskSpecPath = path.join(repoRoot, "skills", "task", "scripts", "compile-task-spec.mjs");
const schemaPath = path.join(repoRoot, "skills", "task", "references", "task-spec.schema.json");

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "lingxi-task-spec-"));
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

describe("task spec contract", () => {
  let tempDir;

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("keeps required validator fields in sync with the TaskSpec schema draft", () => {
    const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
    assert.deepStrictEqual(schema.required, TASK_SPEC_REQUIRED_FIELDS);
  });

  it("accepts a valid TaskSpec shape", () => {
    const issues = validateTaskSpecShape({
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
      constraints: ["Do not change runtime behavior"],
      memory_refs: [],
      open_questions: [],
      confidence: 0.82
    });
    assert.deepStrictEqual(issues, []);
  });

  it("returns structured validator output when TaskSpec input is not ready", async () => {
    tempDir = createTempDir();
    await runNode(setupPath, tempDir);
    const result = await runNode(taskPath, tempDir, {
      title: "Status flow",
      goal: "Improve dashboard flow.",
      complexity: "中等",
      type: "前端",
      background: "Dashboard needs clearer states.",
      problem: "Users cannot understand the current flow.",
      solution_overview: "Improve dashboard flow.",
      scope: ["Update dashboard states", "Refine dashboard layout"],
      constraints: ["Do not change routes"],
      acceptance_criteria: ["Dashboard is better for users"]
    });
    assert.notStrictEqual(result.code, 0);
    const payload = JSON.parse(result.stderr);
    assert.strictEqual(payload.error_type, "task_spec_invalid");
    assert.strictEqual(payload.schema_version, TASK_SPEC_SCHEMA_VERSION);
    assert.ok(Array.isArray(payload.issues));
    assert.ok(payload.issues.some((item) => item.message.includes("non_goals")), result.stderr);
  });

  it("validate-task-spec CLI returns structured issues for invalid TaskSpec JSON", async () => {
    tempDir = createTempDir();
    const result = await runNode(validateTaskSpecPath, tempDir, {
      title: "API seam",
      type: "后端"
    });
    assert.notStrictEqual(result.code, 0);
    const payload = JSON.parse(result.stdout);
    assert.strictEqual(payload.validator, "task_spec");
    assert.strictEqual(payload.schema_version, TASK_SPEC_SCHEMA_VERSION);
    assert.ok(payload.issue_count > 0);
  });

  it("compile-task-spec CLI persists a valid TaskSpec independently of write-task", async () => {
    tempDir = createTempDir();
    await runNode(setupPath, tempDir);
    const result = await runNode(compileTaskSpecPath, tempDir, {
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
      constraints: ["Do not change runtime behavior"],
      memory_refs: [],
      open_questions: [],
      confidence: 0.82
    });
    assert.strictEqual(result.code, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.strictEqual(payload.task_spec_version, TASK_SPEC_SCHEMA_VERSION);
    assert.ok(fs.existsSync(payload.file), result.stdout);
  });
});
