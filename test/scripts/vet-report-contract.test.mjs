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
  buildVetReportValidationReport,
  validateVetReportShape
} from "../../skills/vet/scripts/vet-report.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const setupPath = path.join(repoRoot, "scripts", "lingxi-setup.mjs");
const taskPath = path.join(repoRoot, "skills", "task", "scripts", "write-task.mjs");
const vetPath = path.join(repoRoot, "skills", "vet", "scripts", "vet-task.mjs");
const validateVetReportPath = path.join(repoRoot, "skills", "vet", "scripts", "validate-vet-report.mjs");
const schemaPath = path.join(repoRoot, "skills", "vet", "references", "vet-report.schema.json");

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "lingxi-vet-report-"));
}

function runNode(script, projectRoot, args = [], stdinJson = null) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], {
      cwd: repoRoot,
      env: { ...process.env, CODEX_PROJECT_DIR: projectRoot, LINGXI_PROJECT_ROOT: projectRoot },
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

  it("validate-vet-report CLI validates a stable VetReport payload", async () => {
    tempDir = createTempDir();
    const result = await runNode(validateVetReportPath, tempDir, [], {
      report_version: VET_REPORT_SCHEMA_VERSION,
      task_id: "001",
      file: "/tmp/example.md",
      review_scope: { type: "后端", complexity: "中等", tags: [], dimensions: ["D1", "D2"] },
      project_context_summary: "",
      summary: { blocking_count: 0, high_count: 0, warning_count: 0, readiness: "ready" },
      findings: [],
      findings_by_dimension: { D1: [], D2: [] },
      dimension_summaries: [],
      review_range_statement: "Reviewed 后端/中等 task across D1, D2.",
      overall_evaluation: "Task framing is solid and can proceed.",
      execution_readiness_breakdown: {
        can_start_implementation: true,
        should_revise_first: false,
        primary_risk_area: "none"
      },
      improvement_priority: { blockers: [], high: [], warning: [], top_fixes: [] },
      issues_only_dimensions: [],
      revision_targets: [],
      recommended_next_action: "Task framing is solid and can proceed.",
      next_step_options: [
        { id: "A", label: "开始实现", action: "proceed" },
        { id: "B", label: "补强 task", action: "revise_task" },
        { id: "C", label: "跳过", action: "skip" }
      ],
      implementation_readiness: "Task can proceed."
    });
    assert.strictEqual(result.code, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.strictEqual(payload.validator, "vet_report");
    assert.strictEqual(payload.schema_version, VET_REPORT_SCHEMA_VERSION);
    assert.strictEqual(payload.issue_count, 0);
  });

  it("builds a stable validator payload for invalid VetReport input", () => {
    const payload = buildVetReportValidationReport({
      report_version: "draft-old",
      task_id: "001",
      file: "/tmp/example.md"
    });
    assert.strictEqual(payload.ok, false);
    assert.strictEqual(payload.validator, "vet_report");
    assert.strictEqual(payload.schema_version, VET_REPORT_SCHEMA_VERSION);
    assert.ok(payload.issue_count > 0);
  });

  it("rejects malformed nested finding and next-step structures", () => {
    const payload = buildVetReportValidationReport({
      report_version: VET_REPORT_SCHEMA_VERSION,
      task_id: "001",
      file: "/tmp/example.md",
      review_scope: { type: "后端", complexity: "中等", tags: [], dimensions: ["D1", "DX"] },
      project_context_summary: "",
      summary: { blocking_count: 0, high_count: 0, warning_count: 0, readiness: "almost_ready" },
      findings: [{ severity: "critical", code: "", message: "", section: "DX" }],
      findings_by_dimension: { DX: [{}] },
      dimension_summaries: [{ dimension: "DX", finding_count: -1, status: "unknown" }],
      review_range_statement: "",
      overall_evaluation: "",
      execution_readiness_breakdown: {
        can_start_implementation: "yes",
        should_revise_first: "no",
        primary_risk_area: ""
      },
      improvement_priority: { blockers: [{}], high: [], warning: [], top_fixes: [12] },
      issues_only_dimensions: ["DX"],
      revision_targets: [12],
      recommended_next_action: "",
      next_step_options: [{ id: "", label: "", action: "invented" }],
      implementation_readiness: ""
    });
    assert.strictEqual(payload.ok, false);
    assert.ok(payload.issues.some((item) => item.path === "review_scope.dimensions[1]"));
    assert.ok(payload.issues.some((item) => item.path === "summary.readiness"));
    assert.ok(payload.issues.some((item) => item.path === "findings[0].severity"));
    assert.ok(payload.issues.some((item) => item.path === "improvement_priority.top_fixes"));
    assert.ok(payload.issues.some((item) => item.path === "next_step_options[0].action"));
  });
});
