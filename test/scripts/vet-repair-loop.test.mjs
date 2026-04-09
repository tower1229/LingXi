import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { afterEach, describe, it } from "node:test";
import assert from "node:assert";
import { fileURLToPath } from "node:url";
import { VET_REPORT_SCHEMA_VERSION } from "../../skills/vet/scripts/vet-report.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const repairLoopPath = path.join(repoRoot, "skills", "vet", "scripts", "vet-repair-loop.mjs");

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "lingxi-vet-repair-"));
}

function buildValidVetReport(overrides = {}) {
  return {
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
    implementation_readiness: "Task can proceed.",
    ...overrides
  };
}

function runNode(script, projectRoot, stdinJson = null) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], {
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

describe("vet repair loop", () => {
  let tempDir;

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("returns needs_repair with structured validator issues when the initial report is invalid", async () => {
    tempDir = createTempDir();
    const result = await runNode(repairLoopPath, tempDir, {
      initial_report: {
        task_id: "001",
        file: "/tmp/example.md"
      }
    });
    assert.strictEqual(result.code, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.strictEqual(payload.loop_version, "draft-2026-04-07");
    assert.strictEqual(payload.report_version, VET_REPORT_SCHEMA_VERSION);
    assert.strictEqual(payload.status, "needs_repair");
    assert.strictEqual(payload.phase, "initial");
    assert.strictEqual(payload.initial_validation.ok, false);
    assert.ok(payload.initial_validation.issue_count > 0, result.stdout);
    assert.match(payload.suggested_next_action, /repaired_report/i);
  });

  it("returns repair_failed when the repaired report is still invalid", async () => {
    tempDir = createTempDir();
    const result = await runNode(repairLoopPath, tempDir, {
      initial_report: {
        task_id: "001",
        file: "/tmp/example.md"
      },
      repaired_report: {
        ...buildValidVetReport(),
        recommended_next_action: ""
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

  it("accepts the initial report when it is already valid", async () => {
    tempDir = createTempDir();
    const result = await runNode(repairLoopPath, tempDir, {
      initial_report: buildValidVetReport()
    });
    assert.strictEqual(result.code, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.strictEqual(payload.status, "accepted");
    assert.strictEqual(payload.phase, "initial");
    assert.strictEqual(payload.initial_validation.ok, true);
    assert.strictEqual(payload.validated_report.task_id, "001");
    assert.strictEqual(payload.validated_report.recommended_next_action, "Task framing is solid and can proceed.");
  });

  it("accepts the repaired report after validator-guided correction", async () => {
    tempDir = createTempDir();
    const result = await runNode(repairLoopPath, tempDir, {
      initial_report: {
        task_id: "001",
        file: "/tmp/example.md"
      },
      repaired_report: buildValidVetReport()
    });
    assert.strictEqual(result.code, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.strictEqual(payload.status, "accepted");
    assert.strictEqual(payload.phase, "repair");
    assert.strictEqual(payload.initial_validation.ok, false);
    assert.strictEqual(payload.repair_validation.ok, true);
    assert.strictEqual(payload.validated_report.summary.readiness, "ready");
  });
});
