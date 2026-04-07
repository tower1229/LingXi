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
const taskPath = path.join(repoRoot, "skills", "task", "scripts", "write-task.mjs");
const vetPath = path.join(repoRoot, "skills", "vet", "scripts", "vet-task.mjs");

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "lingxi-vet-test-"));
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

describe("lingxi vet", () => {
  let tempDir;

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("flags ambiguous task language and missing constraints", async () => {
    tempDir = createTempDir();
    await runNode(setupPath, tempDir);
    const taskFile = path.join(tempDir, ".lingxi", "tasks", "001.task.improve-homepage.md");
    fs.mkdirSync(path.dirname(taskFile), { recursive: true });
    fs.writeFileSync(
      taskFile,
      `# 001.task.improve-homepage.md

| 属性 | 值 |
| --- | --- |
| 版本 | 1.0 |
| 状态 | 草稿 |
| 创建日期 | 2026-04-07 |
| 需求类型 | 简单功能 |
| 复杂度 | 简单 |

---

## 1. 概述

### 1.1 背景

Improve homepage experience

### 1.2 问题描述

The homepage should feel better.

### 1.3 解决方案概述

Adjust homepage layout.

---

## 2. 目标与指标

### 2.1 目标

- Improve homepage experience

### 2.2 非目标

- Rebuild the app

### 2.3 成功标准

- Homepage is better for users

---

## 3. 用户故事

### US-1

- 作为：用户
- 我想要：主页更好
- 以便：体验更佳
- 验收标准：
  - Homepage is better for users

---

## 4. 功能需求

### F1: Adjust homepage layout

- 需求描述：Adjust homepage layout
- 实现方案：Refine the homepage structure
- 验收标准：
  - Homepage is better for users
- 验证方式：manual
- 边界/异常：
  - Missing state coverage
- 证据形式：手工验证记录
- 优先级：必须

---

## 5. 约束

- Keep existing routes unchanged

---

## 6. 验收检查清单

- [ ] Homepage is better for users

## 8. 变更记录

| 日期 | 来源 | 触发 | 变更摘要 | 关联维度/问题 |
| --- | --- | --- | --- | --- |
| - | - | - | - | - |
`,
      "utf8"
    );
    const vet = await runNode(vetPath, tempDir, ["--task-id", "001"]);
    assert.strictEqual(vet.code, 0, vet.stderr);
    const vetResult = JSON.parse(vet.stdout);
    assert.ok(vetResult.findings.some((item) => item.code === "goal_ambiguous"));
    assert.ok(vetResult.findings.some((item) => item.code === "acceptance_ambiguous"));
    assert.ok(vetResult.review_scope.dimensions.includes("D1"));
    assert.ok(Array.isArray(vetResult.improvement_priority.high));
    assert.ok(typeof vetResult.review_range_statement === "string");
    assert.ok(Array.isArray(vetResult.dimension_summaries));
    assert.ok(typeof vetResult.recommended_next_action === "string");
    assert.ok(typeof vetResult.execution_readiness_breakdown.primary_risk_area === "string");
  });

  it("falls back to the latest task when no task id is provided", async () => {
    tempDir = createTempDir();
    await runNode(setupPath, tempDir);
    await runNode(taskPath, tempDir, [], {
      title: "Module seam",
      goal: "Clarify the integration seam.",
      scope: ["Introduce an explicit integration boundary"],
      constraints: ["Do not change behavior"],
      acceptance_criteria: ["Integration boundary is documented and explicit"]
    });
    const vet = await runNode(vetPath, tempDir);
    assert.strictEqual(vet.code, 0, vet.stderr);
    const vetResult = JSON.parse(vet.stdout);
    assert.strictEqual(vetResult.task_id, "001");
  });

  it("flags missing SDK contract framing for library tasks", async () => {
    tempDir = createTempDir();
    await runNode(setupPath, tempDir);
    const created = await runNode(taskPath, tempDir, [], {
      title: "SDK guard",
      goal: "Clarify the package seam.",
      complexity: "中等",
      type: "其他",
      tags: ["库/SDK"],
      background: "Consumers depend on a stable package surface.",
      problem: "Current module seam is implicit.",
      solution_overview: "Introduce a stable package boundary for internal modules.",
      scope: ["Define the package seam", "Constrain behavior changes"],
      constraints: ["Do not change runtime behavior", "Keep migration cost low"],
      acceptance_criteria: [
        "The package seam is documented for maintainers",
        "The change stays within the scoped package modules"
      ],
      non_goals: ["不扩展为新的功能包"],
      user_stories: [
        {
          as_a: "SDK consumer",
          i_want: "a clear package boundary",
          so_that: "integration code remains predictable",
          acceptance_criteria: ["The package seam is documented for maintainers"]
        }
      ],
      functional_requirements: [
        {
          title: "Define package seam",
          description: "Describe the package boundary for integration modules",
          implementation_scheme: "Document the module seam and route internal modules behind it",
          acceptance_criteria: ["The package seam is documented for maintainers"],
          verification_method: "manual",
          edge_cases: ["Do not expose internal-only modules"],
          evidence: "Documentation review",
          priority: "必须"
        },
        {
          title: "Constrain behavior changes",
          description: "Constrain the refactor while the seam is introduced",
          implementation_scheme: "Keep the change inside the scoped modules",
          acceptance_criteria: ["The change stays within the scoped package modules"],
          verification_method: "manual",
          edge_cases: ["Avoid accidental package surface expansion"],
          evidence: "Diff review",
          priority: "必须"
        }
      ]
    });
    assert.strictEqual(created.code, 0, created.stderr);
    const vet = await runNode(vetPath, tempDir);
    assert.strictEqual(vet.code, 0, vet.stderr);
    const vetResult = JSON.parse(vet.stdout);
    assert.ok(vetResult.findings.some((item) => item.code === "sdk_contract_missing"));
    assert.ok(Array.isArray(vetResult.next_step_options));
    assert.ok(vetResult.review_scope.tags.includes("库/SDK"));
  });
});
