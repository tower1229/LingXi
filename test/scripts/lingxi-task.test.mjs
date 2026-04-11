import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { afterEach, describe, it } from "node:test";
import assert from "node:assert";
import { fileURLToPath } from "node:url";
import { withMemorySemanticTestEnv } from "../helpers/memory-semantic-env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const setupPath = path.join(repoRoot, "scripts", "lingxi-setup.mjs");
const scriptPath = path.join(repoRoot, "skills", "task", "scripts", "write-task.mjs");
const vetPath = path.join(repoRoot, "skills", "vet", "scripts", "vet-task.mjs");

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "lingxi-task-test-"));
}

function runNode(script, projectRoot, stdinJson) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], {
      cwd: repoRoot,
      env: withMemorySemanticTestEnv({ ...process.env, CODEX_PROJECT_DIR: projectRoot, LINGXI_PROJECT_ROOT: projectRoot }),
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
    assert.ok(result.stderr.includes("solution_overview is too thin"), result.stderr);
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
    assert.ok(content.includes("不新增独立的guide之外的发布面"), content);
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

  it("auto-applies relevant memory when drafting a task", async () => {
    tempDir = createTempDir();
    await runNode(setupPath, tempDir);
    const memoryDir = path.join(tempDir, ".lingxi", "memory", "project");
    fs.mkdirSync(memoryDir, { recursive: true });
    fs.writeFileSync(
      path.join(memoryDir, "MEM-001.rollback-contracts.md"),
      `---
id: MEM-001
title: Prefer explicit contracts and rollback notes
kind: preference
scope: project
source: session-distill
updated_at: 2026-04-07T12:00:00Z
when_to_load:
  - When drafting backend integration tasks
---

# One-liner

Prefer explicit contracts and rollback notes for backend integration changes.

# Decision / Preference

Prefer explicit contracts and rollback notes for backend integration changes.

# Evidence

- The team repeatedly wants explicit backend seams and rollback visibility.
`,
      "utf8"
    );

    const result = await runNode(scriptPath, tempDir, {
      title: "API seam",
      goal: "Clarify the backend integration seam.",
      complexity: "中等",
      type: "后端",
      background: "External dependency behavior currently crosses module boundaries implicitly.",
      problem: "The current seam is hard to review and rollback safely.",
      solution_overview: "Introduce one explicit backend seam for the service layer.",
      scope: ["Define the backend request/response seam", "Constrain the integration rollout path"],
      constraints: ["Do not change runtime behavior", "Keep external API stable"],
      acceptance_criteria: [
        "The backend request/response seam is explicit and reviewable",
        "The rollback path is documented for maintainers"
      ],
      non_goals: ["不扩展为新的服务能力"],
      user_stories: [
        {
          as_a: "service maintainer",
          i_want: "one explicit backend seam",
          so_that: "I can reason about integration changes before rollout",
          acceptance_criteria: ["The backend request/response seam is explicit and reviewable"]
        }
      ]
    });
    assert.strictEqual(result.code, 0, result.stderr);
    const summary = JSON.parse(result.stdout);
    const content = fs.readFileSync(summary.file, "utf8");
    assert.match(content, /## 8\. Memory Applied|## 7\. Memory Applied/);
    assert.match(content, /MEM-001/);
    assert.match(content, /Prefer explicit contracts and rollback notes/);
    const opsLog = fs.readFileSync(path.join(tempDir, ".lingxi", "state", "memory-ops.jsonl"), "utf8")
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    assert.ok(
      opsLog.some(
        (entry) =>
          entry.operation === "retrieve_applied" &&
          entry.caller === "task" &&
          entry.hit_count >= 1 &&
          Number.isInteger(entry.duration_ms)
      )
    );
  });

  it("preserves existing memory refs when updating a task without explicit memory input", async () => {
    tempDir = createTempDir();
    await runNode(setupPath, tempDir);
    const memoryDir = path.join(tempDir, ".lingxi", "memory", "project");
    fs.mkdirSync(memoryDir, { recursive: true });
    fs.writeFileSync(
      path.join(memoryDir, "MEM-001.rollback-contracts.md"),
      `---
id: MEM-001
title: Prefer explicit contracts and rollback notes
kind: preference
scope: project
source: session-distill
updated_at: 2026-04-07T12:00:00Z
when_to_load:
  - When drafting backend integration tasks
---

# One-liner

Prefer explicit contracts and rollback notes for backend integration changes.

# Decision / Preference

Prefer explicit contracts and rollback notes for backend integration changes.

# Evidence

- The team repeatedly wants explicit backend seams and rollback visibility.
`,
      "utf8"
    );

    const created = await runNode(scriptPath, tempDir, {
      title: "API seam",
      goal: "Clarify the backend integration seam.",
      complexity: "中等",
      type: "后端",
      background: "External dependency behavior currently crosses module boundaries implicitly.",
      problem: "The current seam is hard to review and rollback safely.",
      solution_overview: "Introduce one explicit backend seam for the service layer.",
      scope: ["Define the backend request/response seam", "Constrain the integration rollout path"],
      constraints: ["Do not change runtime behavior", "Keep external API stable"],
      acceptance_criteria: [
        "The backend request/response seam is explicit and reviewable",
        "The rollback path is documented for maintainers"
      ],
      non_goals: ["不扩展为新的服务能力"],
      user_stories: [
        {
          as_a: "service maintainer",
          i_want: "one explicit backend seam",
          so_that: "I can reason about integration changes before rollout",
          acceptance_criteria: ["The backend request/response seam is explicit and reviewable"]
        }
      ]
    });
    assert.strictEqual(created.code, 0, created.stderr);
    const createdSummary = JSON.parse(created.stdout);

    fs.writeFileSync(
      path.join(memoryDir, "MEM-002.new-memory.md"),
      `---
id: MEM-002
title: Prefer integration change order notes
kind: preference
scope: project
source: session-distill
updated_at: 2026-04-08T12:00:00Z
when_to_load:
  - When drafting backend integration tasks
---

# One-liner

Prefer integration change order notes.

# Decision / Preference

Prefer integration change order notes before implementation.

# Evidence

- Later memory should not silently rewrite old task context.
`,
      "utf8"
    );

    const updated = await runNode(scriptPath, tempDir, {
      task_id: "001",
      title: "API seam",
      goal: "Clarify the backend integration seam.",
      complexity: "中等",
      type: "后端",
      background: "External dependency behavior currently crosses module boundaries implicitly.",
      problem: "The current seam is hard to review and rollback safely.",
      solution_overview: "Introduce one explicit backend seam for the service layer.",
      scope: ["Define the backend request/response seam", "Constrain the integration rollout path"],
      constraints: ["Do not change runtime behavior", "Keep external API stable", "Document rollback order before implementation"],
      acceptance_criteria: [
        "The backend request/response seam is explicit and reviewable",
        "The rollback path is documented for maintainers"
      ],
      non_goals: ["不扩展为新的服务能力"],
      user_stories: [
        {
          as_a: "service maintainer",
          i_want: "one explicit backend seam",
          so_that: "I can reason about integration changes before rollout",
          acceptance_criteria: ["The backend request/response seam is explicit and reviewable"]
        }
      ],
      change_source: "vet",
      change_trigger: "补强约束",
      change_summary: "增加 rollback 约束"
    });
    assert.strictEqual(updated.code, 0, updated.stderr);
    const content = fs.readFileSync(createdSummary.file, "utf8");
    assert.match(content, /MEM-001/);
    assert.doesNotMatch(content, /MEM-002/);
  });

  it("strengthens docs-oriented non-trivial tasks even when functional requirements are omitted", async () => {
    tempDir = createTempDir();
    await runNode(setupPath, tempDir);
    const created = await runNode(scriptPath, tempDir, {
      title: "Guide map",
      goal: "Clarify the contributor guide.",
      complexity: "中等",
      type: "其他",
      background: "Current onboarding information is fragmented across files.",
      problem: "The current documentation path is hard to follow safely.",
      solution_overview: "Restructure the documentation around one explicit onboarding path.",
      scope: [
        "Add one onboarding section to the contributor guide",
        "Keep the change inside existing documentation surfaces"
      ],
      constraints: ["Do not change runtime behavior", "Keep the repo layout unchanged"],
      acceptance_criteria: [
        "Contributor guide contains one explicit onboarding path",
        "The update stays within the documentation scope"
      ],
      non_goals: ["不扩展为代码重构"],
      user_stories: [
        {
          as_a: "new contributor",
          i_want: "one clear onboarding path",
          so_that: "I can find the right guide entrypoint quickly",
          acceptance_criteria: ["Contributor guide contains one explicit onboarding path"]
        }
      ]
    });
    assert.strictEqual(created.code, 0, created.stderr);
    const createdSummary = JSON.parse(created.stdout);
    const content = fs.readFileSync(createdSummary.file, "utf8");
    assert.ok(content.includes("| 特性标签 | 文档为主 |"), content);
    assert.ok(content.includes("目标读者是贡献者"), content);
    assert.ok(content.includes("文档 diff 与读者 walkthrough"), content);
    assert.ok(content.includes("Contributor guide"), content);
    assert.ok(content.includes("## 5. 开发指导"), content);
    assert.ok(content.includes("### 文档交付指导"), content);

    const vet = await runNode(vetPath, tempDir);
    assert.strictEqual(vet.code, 0, vet.stderr);
    const vetResult = JSON.parse(vet.stdout);
    assert.ok(!vetResult.findings.some((item) => item.code === "docs_audience_missing"), vet.stdout);
    assert.ok(!vetResult.findings.some((item) => item.code === "docs_delivery_missing"), vet.stdout);
    assert.ok(!vetResult.findings.some((item) => item.code === "docs_delivery_guidance_missing"), vet.stdout);
  });

  it("generates backend functional requirements with explicit contract and verification defaults", async () => {
    tempDir = createTempDir();
    await runNode(setupPath, tempDir);
    const created = await runNode(scriptPath, tempDir, {
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
    const createdSummary = JSON.parse(created.stdout);
    const content = fs.readFileSync(createdSummary.file, "utf8");
    assert.ok(content.includes("request/response 或 schema contract"), content);
    assert.ok(content.includes("- 验证方式：integration"), content);
    assert.ok(content.includes("接口契约验证、集成测试结果或回滚检查记录"), content);
    assert.ok(content.includes("### 契约与边界指导"), content);
    assert.ok(content.includes("### 集成与回滚指导"), content);

    const vet = await runNode(vetPath, tempDir);
    assert.strictEqual(vet.code, 0, vet.stderr);
    const vetResult = JSON.parse(vet.stdout);
    assert.ok(!vetResult.findings.some((item) => item.code === "backend_contract_surface_thin"), vet.stdout);
    assert.ok(!vetResult.findings.some((item) => item.code === "backend_contract_guidance_missing"), vet.stdout);
    assert.ok(!vetResult.findings.some((item) => item.code === "integration_guidance_missing"), vet.stdout);
  });

  it("generates frontend state coverage defaults for non-trivial tasks without explicit requirement rows", async () => {
    tempDir = createTempDir();
    await runNode(setupPath, tempDir);
    const created = await runNode(scriptPath, tempDir, {
      title: "State pane",
      goal: "Clarify the dashboard state surface.",
      complexity: "复杂",
      type: "前端",
      background: "Dashboard states are hard to understand.",
      problem: "Users cannot tell what the page is doing in each state.",
      solution_overview: "Define explicit state handling and layout boundaries for the dashboard pane.",
      scope: [
        "Add state-specific dashboard panes",
        "Clarify dashboard interaction layout"
      ],
      constraints: ["Keep routes unchanged", "Keep mobile and desktop layouts aligned"],
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
      ]
    });
    assert.strictEqual(created.code, 0, created.stderr);
    const createdSummary = JSON.parse(created.stdout);
    const content = fs.readFileSync(createdSummary.file, "utf8");
    assert.ok(content.includes("关键页面状态与当前路由边界对用户可见且可理解") || content.includes("loading、empty、error 等关键状态都有明确界面反馈"), content);
    assert.ok(content.includes("loading state"), content);
    assert.ok(content.includes("empty state"), content);
    assert.ok(content.includes("error state"), content);
    assert.ok(content.includes("状态切换 walkthrough 与关键界面差异记录"), content);
    assert.ok(content.includes("### 前端实现指导"), content);

    const vet = await runNode(vetPath, tempDir);
    assert.strictEqual(vet.code, 0, vet.stderr);
    const vetResult = JSON.parse(vet.stdout);
    assert.ok(!vetResult.findings.some((item) => item.code === "frontend_state_coverage_weak"), vet.stdout);
    assert.ok(!vetResult.findings.some((item) => item.code === "frontend_guidance_missing"), vet.stdout);
  });

  it("generates sdk surface guidance that survives vet review", async () => {
    tempDir = createTempDir();
    await runNode(setupPath, tempDir);
    const created = await runNode(scriptPath, tempDir, {
      title: "SDK seam",
      goal: "Clarify the public SDK surface.",
      complexity: "中等",
      type: "其他",
      tags: ["库/SDK"],
      background: "Consumers depend on a stable package surface.",
      problem: "Current external entrypoints and compatibility boundaries are implicit.",
      solution_overview: "Define one explicit public SDK entrypoint and keep compatibility expectations reviewable.",
      scope: [
        "Define the public SDK entrypoint",
        "Constrain compatibility expectations for existing consumers"
      ],
      constraints: ["Do not change runtime behavior", "Keep migration cost low"],
      acceptance_criteria: [
        "The SDK surface is documented with one explicit public entrypoint",
        "Existing consumers can continue without an unplanned migration step"
      ],
      non_goals: ["不扩展为新的功能包"],
      user_stories: [
        {
          as_a: "SDK consumer",
          i_want: "a clear public entrypoint",
          so_that: "integration code remains predictable across upgrades",
          acceptance_criteria: ["The SDK surface is documented with one explicit public entrypoint"]
        }
      ]
    });
    assert.strictEqual(created.code, 0, created.stderr);
    const createdSummary = JSON.parse(created.stdout);
    const content = fs.readFileSync(createdSummary.file, "utf8");
    assert.ok(content.includes("### SDK / Surface 指导"), content);
    assert.ok(content.includes("### 集成与回滚指导"), content);
    assert.ok(content.includes("compatibility"), content);

    const vet = await runNode(vetPath, tempDir);
    assert.strictEqual(vet.code, 0, vet.stderr);
    const vetResult = JSON.parse(vet.stdout);
    assert.ok(!vetResult.findings.some((item) => item.code === "sdk_surface_guidance_missing"), vet.stdout);
    assert.ok(!vetResult.findings.some((item) => item.code === "sdk_compatibility_missing"), vet.stdout);
  });
});
