import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { afterEach, describe, it } from "node:test";
import assert from "node:assert";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const setupPath = path.join(repoRoot, "scripts", "lingxi-setup.mjs");
const scriptPath = path.join(repoRoot, "skills", "task", "scripts", "write-task.mjs");

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "lingxi-task-test-"));
}

function runNode(script, projectRoot, stdinJson) {
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

describe("lingxi task", () => {
  let tempDir;

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("creates a task document with deterministic structure", async () => {
    tempDir = createTempDir();
    await runNode(setupPath, tempDir);
    const result = await runNode(scriptPath, tempDir, {
      title: "API seam",
      goal: "Clarify module boundaries for integration code.",
      scope: ["Create an explicit interface for the integration module"],
      constraints: ["Do not change runtime behavior"],
      acceptance_criteria: ["Integration module exposes a documented explicit interface"],
      memory_refs: ["MEM-001 Prefer explicit interfaces"]
    });
    assert.strictEqual(result.code, 0, result.stderr);
    const summary = JSON.parse(result.stdout);
    assert.strictEqual(summary.task_id, "001");
    assert.strictEqual(summary.quality_gate, "ready");
    assert.ok(Array.isArray(summary.next_step_options));
    const content = fs.readFileSync(summary.file, "utf8");
    assert.ok(content.includes("## 1. 概述"));
    assert.ok(content.includes("## 4. 功能需求"));
    assert.ok(content.includes("| 复杂度 | 简单 |"));
    assert.ok(content.includes("MEM-001"));
    assert.ok(!content.includes("### 1.1 背景\n\nClarify module boundaries for integration code."));
  });

  it("infers task type when the content clearly indicates backend work", async () => {
    tempDir = createTempDir();
    await runNode(setupPath, tempDir);
    const result = await runNode(scriptPath, tempDir, {
      title: "API seam",
      goal: "Clarify the backend API boundary.",
      scope: ["Add an explicit API interface"],
      constraints: ["Do not change database schema"],
      acceptance_criteria: ["The backend API exposes one documented explicit entrypoint."]
    });
    assert.strictEqual(result.code, 0, result.stderr);
    const summary = JSON.parse(result.stdout);
    const content = fs.readFileSync(summary.file, "utf8");
    assert.ok(content.includes("| 需求类型 | 后端 |"));
  });

  it("increments version and prepends changelog when updating from vet feedback", async () => {
    tempDir = createTempDir();
    await runNode(setupPath, tempDir);
    const created = await runNode(scriptPath, tempDir, {
      title: "API seam",
      goal: "Clarify module boundaries for integration code.",
      scope: ["Create an explicit interface for the integration module"],
      constraints: ["Do not change runtime behavior"],
      acceptance_criteria: ["Integration module exposes a documented explicit interface"]
    });
    assert.strictEqual(created.code, 0, created.stderr);
    const first = JSON.parse(created.stdout);

    const updated = await runNode(scriptPath, tempDir, {
      task_id: "001",
      title: "API seam",
      goal: "Clarify module boundaries for integration code.",
      scope: ["Create an explicit interface for the integration module"],
      constraints: ["Do not change runtime behavior", "Keep external API stable"],
      acceptance_criteria: ["Integration module exposes a documented explicit interface"],
      change_source: "vet",
      change_trigger: "采纳 D2 改进建议",
      change_summary: "补充约束并收紧任务边界",
      change_related: "D2"
    });
    assert.strictEqual(updated.code, 0, updated.stderr);
    const content = fs.readFileSync(first.file, "utf8");
    assert.ok(content.includes("| 版本 | 1.1 |"));
    assert.ok(content.includes("| vet | 采纳 D2 改进建议 | 补充约束并收紧任务边界 | D2 |"));
  });

  it("fails fast when acceptance criteria are ambiguous and not testable", async () => {
    tempDir = createTempDir();
    await runNode(setupPath, tempDir);
    const result = await runNode(scriptPath, tempDir, {
      title: "Improve homepage",
      goal: "Improve homepage experience.",
      scope: ["Adjust homepage layout"],
      constraints: ["Do not change routes"],
      acceptance_criteria: ["Homepage is better for users"]
    });
    assert.notStrictEqual(result.code, 0);
    assert.ok(result.stderr.includes("acceptance_criteria contains ambiguous non-binary item"), result.stderr);
  });

  it("fails fast when a non-trivial task lacks non-goals or user stories", async () => {
    tempDir = createTempDir();
    await runNode(setupPath, tempDir);
    const result = await runNode(scriptPath, tempDir, {
      title: "API seam",
      goal: "Clarify module boundaries for integration code.",
      complexity: "中等",
      type: "后端",
      background: "Integration boundaries are currently implicit.",
      problem: "The current module seam is hard to review safely.",
      solution_overview: "Introduce an explicit interface and move call sites behind it.",
      scope: ["Add an explicit integration interface"],
      constraints: ["Do not change behavior"],
      acceptance_criteria: ["The integration interface is documented with one explicit entrypoint."]
    });
    assert.notStrictEqual(result.code, 0);
    assert.ok(
      result.stderr.includes("non_goals") || result.stderr.includes("user_stories"),
      result.stderr
    );
  });

  it("reports multiple readiness gaps in one pass for non-trivial frontend tasks", async () => {
    tempDir = createTempDir();
    await runNode(setupPath, tempDir);
    const result = await runNode(scriptPath, tempDir, {
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
    assert.ok(result.stderr.includes("Task input is not ready"), result.stderr);
    assert.ok(result.stderr.includes("non_goals"), result.stderr);
    assert.ok(result.stderr.includes("user_stories"), result.stderr);
    assert.ok(result.stderr.includes("frontend task should include state-oriented edge cases"), result.stderr);
  });

  it("fails fast when scope wording is vague instead of concrete", async () => {
    tempDir = createTempDir();
    await runNode(setupPath, tempDir);
    const result = await runNode(scriptPath, tempDir, {
      title: "Doc polish",
      goal: "Clarify the contributor guide.",
      scope: ["Improve documentation", "Refine docs flow"],
      constraints: ["Keep the existing repo structure"],
      acceptance_criteria: ["Contributor guide has one explicit onboarding section"]
    });
    assert.notStrictEqual(result.code, 0);
    assert.ok(result.stderr.includes("scope item is too vague"), result.stderr);
  });

  it("infers richer framing and simple non-goals for simple tasks", async () => {
    tempDir = createTempDir();
    await runNode(setupPath, tempDir);
    const result = await runNode(scriptPath, tempDir, {
      title: "Doc guide",
      goal: "Clarify the contributor guide.",
      scope: ["Add one onboarding section to the contributor guide"],
      constraints: ["Keep the repo structure unchanged"],
      acceptance_criteria: ["Contributor guide contains one explicit onboarding section"]
    });
    assert.strictEqual(result.code, 0, result.stderr);
    const summary = JSON.parse(result.stdout);
    const content = fs.readFileSync(summary.file, "utf8");
    assert.ok(content.includes("当前任务聚焦于：Clarify the contributor guide."));
    assert.ok(content.includes("当前缺少一份可以直接驱动实现的任务边界说明"));
    assert.ok(content.includes("不在本任务内改动运行时代码行为"));
    assert.ok(content.includes("| 特性标签 | 文档为主 |"));
  });

  it("captures project context from repository cues", async () => {
    tempDir = createTempDir();
    fs.writeFileSync(
      path.join(tempDir, "package.json"),
      JSON.stringify(
        {
          name: "demo-app",
          dependencies: {
            react: "^19.0.0"
          },
          devDependencies: {
            typescript: "^5.0.0"
          }
        },
        null,
        2
      ),
      "utf8"
    );
    fs.writeFileSync(path.join(tempDir, "tsconfig.json"), "{}\n", "utf8");
    await runNode(setupPath, tempDir);
    const result = await runNode(scriptPath, tempDir, {
      title: "Status pane",
      goal: "Clarify the dashboard pane.",
      scope: ["Add one explicit dashboard state pane"],
      constraints: ["Keep the current React structure"],
      acceptance_criteria: ["Dashboard pane renders one explicit state surface"]
    });
    assert.strictEqual(result.code, 0, result.stderr);
    const summary = JSON.parse(result.stdout);
    const content = fs.readFileSync(summary.file, "utf8");
    assert.ok(content.includes("### 1.0 项目上下文"));
    assert.ok(content.includes("Detected a frontend-oriented workspace"));
    assert.ok(content.includes("package.json"));
    assert.ok(content.includes("tsconfig.json"));
  });
});
