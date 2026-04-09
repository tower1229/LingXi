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
const taskPath = path.join(repoRoot, "skills", "task", "scripts", "write-task.mjs");
const vetPath = path.join(repoRoot, "skills", "vet", "scripts", "vet-task.mjs");
const distillPath = path.join(repoRoot, "skills", "session-distill", "scripts", "distill-session.mjs");

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "lingxi-task-vet-closure-"));
}

function runNode(script, projectRoot, args = [], stdinJson = null) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], {
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

describe("task vet closure", () => {
  let tempDir;

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("improves readiness after task is revised from vet feedback", async () => {
    tempDir = createTempDir();
    await runNode(setupPath, tempDir);

    const created = await runNode(taskPath, tempDir, [], {
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
      ],
      functional_requirements: [
        {
          title: "Define backend seam",
          description: "Describe the backend request and response boundary",
          implementation_scheme: "Document one explicit request/response contract for the current integration seam",
          acceptance_criteria: ["The backend request/response seam is explicit and reviewable"],
          verification_method: "manual",
          edge_cases: ["invalid input"],
          evidence: "Diff review",
          priority: "必须"
        },
        {
          title: "Constrain rollout path",
          description: "Keep the implementation inside the current integration seam",
          implementation_scheme: "Restrict the change to the current service boundary",
          acceptance_criteria: ["The rollback path is documented for maintainers"],
          verification_method: "manual",
          edge_cases: ["dependency timeout"],
          evidence: "Manual walkthrough",
          priority: "必须"
        }
      ],
      guidance_blocks: [
        {
          kind: "risk_guidance",
          title: "风险与收口指导",
          bullets: ["保持当前结构。"]
        }
      ]
    });
    assert.strictEqual(created.code, 0, created.stderr);
    const createdSummary = JSON.parse(created.stdout);

    const initialVet = await runNode(vetPath, tempDir);
    assert.strictEqual(initialVet.code, 0, initialVet.stderr);
    const initialReport = JSON.parse(initialVet.stdout);
    assert.ok(initialReport.revision_targets.length > 0, initialVet.stdout);
    assert.ok(initialReport.findings.some((item) => item.code === "guidance_sufficiency_thin"), initialVet.stdout);
    assert.ok(initialReport.findings.some((item) => item.code === "constraints_generic_only"), initialVet.stdout);
    assert.ok(initialReport.findings.some((item) => item.code === "non_goals_generic_only"), initialVet.stdout);

    const updated = await runNode(taskPath, tempDir, [], {
      task_id: "001",
      title: "API seam",
      goal: "Clarify the backend integration seam.",
      complexity: "中等",
      type: "后端",
      background: "External dependency behavior currently crosses module boundaries implicitly.",
      problem: "The current seam is hard to review and rollback safely.",
      solution_overview: "Introduce one explicit backend seam for the service layer. 这样更稳，因为 request/response contract、rollback 边界和依赖顺序可以先被审阅，再决定最小实现改动。",
      scope: ["Define the backend request/response seam", "Constrain the integration rollout path"],
      constraints: [
        "Do not change runtime behavior",
        "Keep external API stable",
        "Document rollback order before implementation"
      ],
      acceptance_criteria: [
        "The backend request/response seam is explicit and reviewable",
        "The rollback path is documented for maintainers"
      ],
      non_goals: ["不扩展为新的服务能力", "不在本任务内扩展到无关接口或数据模型"],
      user_stories: [
        {
          as_a: "service maintainer",
          i_want: "one explicit backend seam",
          so_that: "I can reason about integration changes before rollout",
          acceptance_criteria: ["The backend request/response seam is explicit and reviewable"]
        }
      ],
      functional_requirements: [
        {
          title: "Define backend seam",
          description: "Describe the backend request and response boundary",
          implementation_scheme: "先固定 request/response contract，再把变更限制在当前 service seam 内实现。",
          acceptance_criteria: ["The backend request/response seam is explicit and reviewable"],
          verification_method: "integration",
          edge_cases: ["invalid input", "unexpected dependency response"],
          evidence: "Contract diff with one integration check",
          priority: "必须"
        },
        {
          title: "Constrain rollout path",
          description: "Keep the implementation inside the current integration seam",
          implementation_scheme: "先写清 rollback 顺序和 dependency coordination，再执行最小实现改动。",
          acceptance_criteria: ["The rollback path is documented for maintainers"],
          verification_method: "integration",
          edge_cases: ["dependency timeout", "rollback coordination"],
          evidence: "Rollback note with one dependency coordination record",
          priority: "必须"
        }
      ],
      guidance_blocks: [
        {
          kind: "backend_contract_guidance",
          title: "契约与边界指导",
          bullets: [
            "先把 request/response contract 写清楚，再进入实现。",
            "让每条需求都能对应到可审阅的 contract 或 schema 边界。",
            "把变更收在当前服务边界内，避免实现阶段扩散到无关接口。"
          ]
        },
        {
          kind: "integration_guidance",
          title: "集成与回滚指导",
          bullets: [
            "列清 dependency edge、失败模式和 rollback 顺序，再决定实施步骤。",
            "说明谁提供输入、谁消费输出，以及跨模块变更的先后顺序。",
            "为关键集成路径准备 integration check 和 rollback record。"
          ]
        },
        {
          kind: "risk_guidance",
          title: "风险与收口指导",
          bullets: [
            "实现前先确认成功标准和 rollback 边界，避免中途重定义任务。",
            "所有实现动作都必须服务于当前 seam，而不是扩展到新能力面。"
          ]
        }
      ],
      change_source: "vet",
      change_trigger: initialReport.revision_targets[0] || "采纳 vet 修订建议",
      change_summary: "补强方案理由、契约指导和集成回滚指导",
      change_related: initialReport.issues_only_dimensions.join("/")
    });
    assert.strictEqual(updated.code, 0, updated.stderr);

    const content = fs.readFileSync(createdSummary.file, "utf8");
    assert.match(content, /\| 版本 \| 1\.1 \|/);
    assert.match(content, /\| vet \|/);

    const updatedVet = await runNode(vetPath, tempDir);
    assert.strictEqual(updatedVet.code, 0, updatedVet.stderr);
    const updatedReport = JSON.parse(updatedVet.stdout);
    assert.ok(updatedReport.summary.warning_count < initialReport.summary.warning_count, updatedVet.stdout);
    assert.ok(!updatedReport.findings.some((item) => item.code === "guidance_sufficiency_thin"), updatedVet.stdout);
    assert.ok(!updatedReport.findings.some((item) => item.code === "constraints_generic_only"), updatedVet.stdout);
    assert.ok(!updatedReport.findings.some((item) => item.code === "non_goals_generic_only"), updatedVet.stdout);
  });

  it("feeds distilled memory into task drafting and keeps vet from flagging missing memory context", async () => {
    tempDir = createTempDir();
    await runNode(setupPath, tempDir);

    const distilled = await runNode(distillPath, tempDir, [], {
      session_id: "session-memory-loop",
      messages: [
        {
          role: "user",
          content: "For backend integration seam changes, prefer small reviewable patches and document rollback path before implementation."
        }
      ]
    });
    assert.strictEqual(distilled.code, 0, distilled.stderr);
    const distillSummary = JSON.parse(distilled.stdout);
    assert.ok(distillSummary.notes.length > 0, distilled.stdout);

    const created = await runNode(taskPath, tempDir, [], {
      title: "API seam",
      goal: "Clarify the backend integration seam.",
      complexity: "中等",
      type: "后端",
      background: "External dependency behavior currently crosses module boundaries implicitly.",
      problem: "The current seam is hard to review and rollback safely.",
      solution_overview: "Introduce one explicit backend seam for the service layer. 这样更稳，因为 request/response contract 和 rollback 边界可以先被审阅。",
      scope: ["Define the backend request/response seam", "Constrain the integration rollout path"],
      constraints: [
        "Do not change runtime behavior",
        "Keep external API stable",
        "Document rollback order before implementation"
      ],
      acceptance_criteria: [
        "The backend request/response seam is explicit and reviewable",
        "The rollback path is documented for maintainers"
      ],
      non_goals: ["不扩展为新的服务能力", "不在本任务内扩展到无关接口或数据模型"],
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
    const content = fs.readFileSync(createdSummary.file, "utf8");
    assert.match(content, /Memory Applied/);
    assert.match(content, /MEM-001/);
    assert.match(content, /rollback path before implementation|small reviewable patches/i);

    const vet = await runNode(vetPath, tempDir);
    assert.strictEqual(vet.code, 0, vet.stderr);
    const vetResult = JSON.parse(vet.stdout);
    assert.ok(!vetResult.findings.some((item) => item.code === "memory_context_missing"), vet.stdout);
  });
});
