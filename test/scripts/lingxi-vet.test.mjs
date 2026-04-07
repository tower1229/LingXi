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

  it("flags missing documentation audience and delivery framing for docs tasks", async () => {
    tempDir = createTempDir();
    await runNode(setupPath, tempDir);
    const taskFile = path.join(tempDir, ".lingxi", "tasks", "001.task.docs-map.md");
    fs.mkdirSync(path.dirname(taskFile), { recursive: true });
    fs.writeFileSync(
      taskFile,
      `# 001.task.docs-map.md

| 属性 | 值 |
| --- | --- |
| 版本 | 1.0 |
| 状态 | 草稿 |
| 创建日期 | 2026-04-07 |
| 需求类型 | 其他 |
| 复杂度 | 中等 |
| 特性标签 | 文档为主 |

---

## 1. 概述

### 1.1 背景

The repo docs are difficult to follow.

### 1.2 问题描述

The current docs path is fragmented.

### 1.3 解决方案概述

Restructure the docs guidance around contributor tasks.

---

## 2. 目标与指标

### 2.1 目标

- Clarify the contributor documentation

### 2.2 非目标

- 不扩展为代码重构

### 2.3 成功标准

- Contributor documentation contains one explicit onboarding path
- The update stays within the documentation scope

---

## 3. 用户故事

### US-1

- 作为：new contributor
- 我想要：one clear doc path
- 以便：I can find the right onboarding steps
- 验收标准：
  - Contributor documentation contains one explicit onboarding path

---

## 4. 功能需求

### F1: Describe onboarding path

- 需求描述：Explain the contributor documentation flow
- 实现方案：Restructure existing docs guidance by contributor task
- 验收标准：
  - Contributor documentation contains one explicit onboarding path
- 验证方式：manual
- 边界/异常：
  - Avoid expanding into code change guidance
- 证据形式：Documentation review
- 优先级：必须

### F2: Limit scope

- 需求描述：Keep the change inside the docs structure
- 实现方案：Revise the existing structure only
- 验收标准：
  - The update stays within the documentation scope
- 验证方式：manual
- 边界/异常：
  - Do not create a new publication surface
- 证据形式：Diff review
- 优先级：必须

---

## 5. 约束

- Do not change code behavior
- Keep the repo layout intact

---

## 6. 验收检查清单

- [ ] Contributor documentation contains one explicit onboarding path
- [ ] The update stays within the documentation scope

## 8. 变更记录

| 日期 | 来源 | 触发 | 变更摘要 | 关联维度/问题 |
| --- | --- | --- | --- | --- |
| - | - | - | - | - |
`,
      "utf8"
    );
    const vet = await runNode(vetPath, tempDir);
    assert.strictEqual(vet.code, 0, vet.stderr);
    const vetResult = JSON.parse(vet.stdout);
    assert.ok(vetResult.findings.some((item) => item.code === "docs_audience_missing"));
    assert.ok(vetResult.findings.some((item) => item.code === "docs_delivery_missing"));
  });

  it("flags missing frontend runtime constraints for non-trivial frontend tasks", async () => {
    tempDir = createTempDir();
    await runNode(setupPath, tempDir);
    const created = await runNode(taskPath, tempDir, [], {
      title: "Status pane",
      goal: "Clarify the dashboard state surface.",
      complexity: "复杂",
      type: "前端",
      background: "Dashboard states are hard to understand.",
      problem: "Users cannot tell what the page is doing in each state.",
      solution_overview: "Define explicit state handling and layout boundaries for the dashboard pane.",
      scope: ["Add state-specific dashboard panes", "Clarify dashboard interaction layout"],
      constraints: ["Keep routes unchanged", "Do not alter backend APIs"],
      acceptance_criteria: [
        "Dashboard states render with one explicit state pane per user-visible condition",
        "Dashboard interaction layout stays within the existing route"
      ],
      non_goals: ["不重做整套页面视觉"],
      user_stories: [
        {
          as_a: "dashboard user",
          i_want: "clear state feedback",
          so_that: "I can understand loading and failure conditions",
          acceptance_criteria: ["Dashboard states render with one explicit state pane per user-visible condition"]
        }
      ],
      functional_requirements: [
        {
          title: "State panes",
          description: "Render separate loading, empty, and error panes",
          implementation_scheme: "Split the dashboard pane into explicit visual states",
          acceptance_criteria: ["Dashboard states render with one explicit state pane per user-visible condition"],
          verification_method: "manual",
          edge_cases: ["loading state", "empty state", "error state"],
          evidence: "Browser capture",
          priority: "必须"
        },
        {
          title: "Interaction layout",
          description: "Keep the dashboard interactions within the existing layout",
          implementation_scheme: "Adjust the dashboard pane structure without changing routes",
          acceptance_criteria: ["Dashboard interaction layout stays within the existing route"],
          verification_method: "manual",
          edge_cases: ["state switch without route change"],
          evidence: "Manual walkthrough",
          priority: "必须"
        }
      ]
    });
    assert.strictEqual(created.code, 0, created.stderr);
    const vet = await runNode(vetPath, tempDir);
    assert.strictEqual(vet.code, 0, vet.stderr);
    const vetResult = JSON.parse(vet.stdout);
    assert.ok(vetResult.findings.some((item) => item.code === "frontend_runtime_constraint_thin"));
  });

  it("flags missing SDK compatibility framing", async () => {
    tempDir = createTempDir();
    await runNode(setupPath, tempDir);
    const taskFile = path.join(tempDir, ".lingxi", "tasks", "001.task.sdk-surf.md");
    fs.mkdirSync(path.dirname(taskFile), { recursive: true });
    fs.writeFileSync(
      taskFile,
      `# 001.task.sdk-surf.md

| 属性 | 值 |
| --- | --- |
| 版本 | 1.0 |
| 状态 | 草稿 |
| 创建日期 | 2026-04-07 |
| 需求类型 | 其他 |
| 复杂度 | 中等 |
| 特性标签 | 库/SDK |

---

## 1. 概述

### 1.1 背景

Consumers depend on a stable SDK surface.

### 1.2 问题描述

The current SDK surface is implicit.

### 1.3 解决方案概述

Define one explicit public SDK surface for the integration layer.

---

## 2. 目标与指标

### 2.1 目标

- Clarify the SDK surface

### 2.2 非目标

- 不扩展为新的功能包

### 2.3 成功标准

- The SDK surface is documented with one explicit public entrypoint
- The change stays within the scoped SDK modules

---

## 3. 用户故事

### US-1

- 作为：SDK consumer
- 我想要：a clear SDK surface
- 以便：integration usage remains predictable
- 验收标准：
  - The SDK surface is documented with one explicit public entrypoint

---

## 4. 功能需求

### F1: Define SDK surface

- 需求描述：Describe the public SDK entrypoint
- 实现方案：Document the public SDK surface and route internal modules behind it
- 验收标准：
  - The SDK surface is documented with one explicit public entrypoint
- 验证方式：manual
- 边界/异常：
  - Do not expose internal-only modules
- 证据形式：Documentation review
- 优先级：必须

### F2: Constrain scope

- 需求描述：Keep the change inside the scoped SDK modules
- 实现方案：Restrict the update to the scoped SDK modules
- 验收标准：
  - The change stays within the scoped SDK modules
- 验证方式：manual
- 边界/异常：
  - Avoid accidental package surface expansion
- 证据形式：Diff review
- 优先级：必须

---

## 5. 约束

- Do not change runtime behavior
- Keep the diff minimal

---

## 6. 验收检查清单

- [ ] The SDK surface is documented with one explicit public entrypoint
- [ ] The change stays within the scoped SDK modules

## 8. 变更记录

| 日期 | 来源 | 触发 | 变更摘要 | 关联维度/问题 |
| --- | --- | --- | --- | --- |
| - | - | - | - | - |
`,
      "utf8"
    );
    const vet = await runNode(vetPath, tempDir);
    assert.strictEqual(vet.code, 0, vet.stderr);
    const vetResult = JSON.parse(vet.stdout);
    assert.ok(vetResult.findings.some((item) => item.code === "sdk_compatibility_missing"));
  });

  it("flags mismatch between task type and repository context", async () => {
    tempDir = createTempDir();
    fs.writeFileSync(
      path.join(tempDir, "package.json"),
      JSON.stringify(
        {
          name: "service-app",
          dependencies: {
            express: "^5.0.0"
          }
        },
        null,
        2
      ),
      "utf8"
    );
    await runNode(setupPath, tempDir);
    const created = await runNode(taskPath, tempDir, [], {
      title: "UI polish",
      goal: "Clarify the admin dashboard.",
      complexity: "中等",
      type: "前端",
      background: "Operators need clearer state visibility.",
      problem: "Current state transitions are hard to understand.",
      solution_overview: "Add explicit dashboard state panes and keep the interaction surface bounded.",
      scope: ["Add dashboard state panes", "Clarify dashboard layout"],
      constraints: ["Do not change API behavior", "Keep routes unchanged", "Do not add new endpoints"],
      acceptance_criteria: [
        "Dashboard exposes one explicit pane for each visible state",
        "Dashboard layout stays within the current route"
      ],
      non_goals: ["不扩展为新的后端接口"],
      user_stories: [
        {
          as_a: "operator",
          i_want: "clear dashboard states",
          so_that: "I can understand the current service condition",
          acceptance_criteria: ["Dashboard exposes one explicit pane for each visible state"]
        }
      ],
      functional_requirements: [
        {
          title: "Dashboard state panes",
          description: "Render separate loading and error panes for the dashboard",
          implementation_scheme: "Split the dashboard surface into explicit visual states",
          acceptance_criteria: ["Dashboard exposes one explicit pane for each visible state"],
          verification_method: "manual",
          edge_cases: ["loading state", "error state"],
          evidence: "Browser capture",
          priority: "必须"
        },
        {
          title: "Dashboard layout",
          description: "Keep the dashboard interaction layout bounded",
          implementation_scheme: "Adjust the admin layout without changing routes",
          acceptance_criteria: ["Dashboard layout stays within the current route"],
          verification_method: "manual",
          edge_cases: ["state switch without route change"],
          evidence: "Manual walkthrough",
          priority: "必须"
        }
      ]
    });
    assert.strictEqual(created.code, 0, created.stderr);
    const vet = await runNode(vetPath, tempDir);
    assert.strictEqual(vet.code, 0, vet.stderr);
    const vetResult = JSON.parse(vet.stdout);
    assert.ok(vetResult.findings.some((item) => item.code === "repo_context_frontend_mismatch"));
    assert.ok(typeof vetResult.project_context_summary === "string");
    assert.ok(vetResult.project_context_summary.includes("backend-oriented workspace"));
  });
});
