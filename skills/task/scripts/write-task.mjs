#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  ensureLingxiLayout,
  findTaskFile,
  incrementVersion,
  parseTaskDocument,
  nextTaskId,
  normalizeText,
  renderTaskDocument,
  resolveProjectRoot,
  slugify,
  tasksDir
} from "../../../scripts/_lingxi-memory.mjs";

async function readJsonStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) {
    throw new Error("Expected task JSON on stdin.");
  }
  return JSON.parse(raw);
}

function normalizeList(value, field) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`Missing required field: ${field}[]`);
  }
  const items = value.map((item) => normalizeText(item)).filter(Boolean);
  if (items.length === 0) {
    throw new Error(`Missing required field: ${field}[]`);
  }
  return items;
}

function inferTaskType(input, scope, constraints) {
  if (normalizeText(input.type)) {
    return normalizeText(input.type);
  }
  const corpus = [input.title, input.goal, ...(scope || []), ...(constraints || [])]
    .map((item) => normalizeText(item).toLowerCase())
    .join(" ");
  if (/(ui|页面|前端|组件|样式|交互|homepage|screen|layout)/i.test(corpus)) return "前端";
  if (/(api|后端|接口|数据库|service|endpoint|schema|migration)/i.test(corpus)) return "后端";
  if (/(sdk|library|库|包|cli|command)/i.test(corpus)) return "其他";
  return scope.length <= 2 ? "简单功能" : "其他";
}

function inferComplexity(input, scope, constraints) {
  if (normalizeText(input.complexity)) {
    return normalizeText(input.complexity);
  }
  const score =
    (scope.length >= 4 ? 1 : 0) +
    (constraints.length >= 3 ? 1 : 0) +
    ((Array.isArray(input.functional_requirements) && input.functional_requirements.length >= 3) ? 1 : 0);
  if (score >= 2) return "中等";
  return "简单";
}

function assertTitleQuality(title) {
  const normalized = normalizeText(title);
  const chineseChars = (normalized.match(/[\u4e00-\u9fff]/g) || []).length;
  const latinChars = normalized.replace(/[\u4e00-\u9fff\s]/g, "").length;
  if (chineseChars > 10 || latinChars > 20) {
    throw new Error("Title is too long. Keep it within 10 Chinese chars or 20 English chars of intent.");
  }
}

function ensureBinaryAcceptanceCriteria(items) {
  const vagueMarkers = [
    "优化",
    "提升",
    "更好",
    "友好",
    "稳定",
    "improve",
    "better",
    "optimize",
    "robust"
  ];
  const badItem = items.find((item) => {
    const normalized = normalizeText(item).toLowerCase();
    return vagueMarkers.some((marker) => normalized.includes(marker)) && !/\d/.test(normalized);
  });
  if (badItem) {
    throw new Error(`Acceptance criteria must be testable and binary; found ambiguous item: ${badItem}`);
  }
}

function collectBinaryAcceptanceIssues(items, fieldLabel) {
  const vagueMarkers = [
    "优化",
    "提升",
    "更好",
    "友好",
    "稳定",
    "improve",
    "better",
    "optimize",
    "robust"
  ];
  const issues = [];
  for (const item of items || []) {
    const normalized = normalizeText(item).toLowerCase();
    if (vagueMarkers.some((marker) => normalized.includes(marker)) && !/\d/.test(normalized)) {
      issues.push(`${fieldLabel} contains ambiguous non-binary item: ${item}`);
    }
  }
  return issues;
}

function collectScopeQualityIssues(scope) {
  const vagueMarkers = [
    "优化",
    "提升",
    "改进",
    "完善",
    "支持更多",
    "improve",
    "optimize",
    "enhance",
    "refine"
  ];
  const issues = [];
  const seen = new Set();
  for (const item of scope || []) {
    const normalized = normalizeText(item);
    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      issues.push(`scope contains duplicated item: ${item}`);
    }
    seen.add(key);
    if (vagueMarkers.some((marker) => key.includes(marker)) && !/(api|interface|state|error|loading|schema|contract|route|layout)/i.test(key)) {
      issues.push(`scope item is too vague and should be rewritten concretely: ${item}`);
    }
  }
  return issues;
}

function ensureBoundedScope(scope) {
  if (scope.length > 8) {
    throw new Error("Scope is too broad for a single task. Split the task before writing it.");
  }
}

function ensureNonTrivialFraming(input, complexity) {
  if (complexity === "简单") return;
  const required = [
    ["background", input.background],
    ["problem", input.problem],
    ["solution_overview", input.solution_overview],
    ["non_goals", Array.isArray(input.non_goals) ? input.non_goals.join(" ") : input.non_goals]
  ];
  for (const [key, value] of required) {
    if (!normalizeText(value)) {
      throw new Error(`Missing required field for non-trivial task: ${key}`);
    }
  }
  if (!Array.isArray(input.user_stories) || input.user_stories.length === 0) {
    throw new Error("Missing required field for non-trivial task: user_stories[]");
  }
}

function validateFunctionalRequirements(requirements) {
  const allowedVerificationMethods = new Set(["unit", "integration", "e2e", "manual", "rubric"]);
  const allowedPriorities = new Set(["必须", "应该", "可选"]);
  if (!Array.isArray(requirements) || requirements.length === 0) {
    throw new Error("Missing required field: functional_requirements[]");
  }
  for (const requirement of requirements) {
    if (!normalizeText(requirement.description)) {
      throw new Error("Each functional requirement must include a description");
    }
    if (!Array.isArray(requirement.acceptance_criteria) || requirement.acceptance_criteria.length === 0) {
      throw new Error("Each functional requirement must include acceptance_criteria[]");
    }
    ensureBinaryAcceptanceCriteria(requirement.acceptance_criteria);
    if (!normalizeText(requirement.verification_method)) {
      throw new Error("Each functional requirement must include verification_method");
    }
    if (!allowedVerificationMethods.has(normalizeText(requirement.verification_method))) {
      throw new Error(`Unsupported verification method: ${requirement.verification_method}`);
    }
    if (!Array.isArray(requirement.edge_cases) || requirement.edge_cases.length === 0) {
      throw new Error("Each functional requirement must include edge_cases[]");
    }
    if (!normalizeText(requirement.implementation_scheme)) {
      throw new Error("Each functional requirement must include implementation_scheme");
    }
    if (!normalizeText(requirement.evidence)) {
      throw new Error("Each functional requirement must include evidence");
    }
    if (!allowedPriorities.has(normalizeText(requirement.priority))) {
      throw new Error(`Unsupported priority: ${requirement.priority}`);
    }
  }
}

function ensureConsistency({ goals, successCriteria, scope, functionalRequirements }) {
  if (successCriteria.length < goals.length) {
    throw new Error("Success criteria should be at least as complete as goals.");
  }
  if (functionalRequirements.length < scope.length) {
    throw new Error("Functional requirements should cover the declared scope.");
  }
}

function overlapsAny(items, comparisonSet) {
  return (items || []).some((item) => comparisonSet.has(normalizeText(item).toLowerCase()));
}

function validateTaskReadiness({
  input,
  complexity,
  type,
  scope,
  constraints,
  acceptanceCriteria,
  goals,
  nonGoals,
  successCriteria,
  userStories,
  functionalRequirements
}) {
  const issues = [];
  const allowedVerificationMethods = new Set(["unit", "integration", "e2e", "manual", "rubric"]);
  const allowedPriorities = new Set(["必须", "应该", "可选"]);
  if (scope.length > 8) {
    issues.push("scope is too broad for a single task; split it before writing");
  }
  issues.push(...collectScopeQualityIssues(scope));
  issues.push(...collectBinaryAcceptanceIssues(acceptanceCriteria, "acceptance_criteria"));
  issues.push(...collectBinaryAcceptanceIssues(successCriteria, "success_criteria"));

  if (complexity !== "简单") {
    for (const [key, value] of [
      ["background", input.background],
      ["problem", input.problem],
      ["solution_overview", input.solution_overview]
    ]) {
      if (!normalizeText(value)) {
        issues.push(`missing required field for non-trivial task: ${key}`);
      }
    }
    if (nonGoals.length === 0) {
      issues.push("missing required field for non-trivial task: non_goals[]");
    }
    if (userStories.length === 0) {
      issues.push("missing required field for non-trivial task: user_stories[]");
    }
  }

  if (successCriteria.length < goals.length) {
    issues.push("success criteria should be at least as complete as goals");
  }
  if (functionalRequirements.length < scope.length) {
    issues.push("functional requirements should cover the declared scope");
  }

  const goalScopeSet = new Set([...goals, ...scope].map((item) => normalizeText(item).toLowerCase()).filter(Boolean));
  if (nonGoals.length > 0 && overlapsAny(nonGoals, goalScopeSet)) {
    issues.push("non_goals should state exclusions, not restate goals or scope");
  }

  const normalizedSolution = normalizeText(input.solution_overview);
  const normalizedProblem = normalizeText(input.problem);
  const normalizedGoal = normalizeText(input.goal);
  if (
    complexity !== "简单" &&
    normalizedSolution &&
    (normalizedSolution === normalizedGoal || normalizedSolution === normalizedProblem)
  ) {
    issues.push("solution_overview is too thin; it currently repeats the goal/problem instead of explaining the approach");
  }

  const userStoryCoverage = userStories.filter(
    (story) => story.as_a && story.i_want && story.so_that && story.acceptance_criteria.length > 0
  ).length;
  if (complexity !== "简单" && userStoryCoverage < Math.min(1, functionalRequirements.length)) {
    issues.push("user stories are too thin to cover the non-trivial task");
  }

  for (const requirement of functionalRequirements) {
    if (!normalizeText(requirement.description)) {
      issues.push(`functional requirement ${requirement.id} is missing description`);
    }
    if (!normalizeText(requirement.implementation_scheme)) {
      issues.push(`functional requirement ${requirement.id} is missing implementation_scheme`);
    }
    if (!Array.isArray(requirement.acceptance_criteria) || requirement.acceptance_criteria.length === 0) {
      issues.push(`functional requirement ${requirement.id} is missing acceptance_criteria[]`);
    } else {
      issues.push(...collectBinaryAcceptanceIssues(requirement.acceptance_criteria, `${requirement.id}.acceptance_criteria`));
    }
    if (!normalizeText(requirement.verification_method)) {
      issues.push(`functional requirement ${requirement.id} is missing verification_method`);
    } else if (!allowedVerificationMethods.has(normalizeText(requirement.verification_method))) {
      issues.push(`functional requirement ${requirement.id} has unsupported verification_method: ${requirement.verification_method}`);
    }
    if (!Array.isArray(requirement.edge_cases) || requirement.edge_cases.length === 0) {
      issues.push(`functional requirement ${requirement.id} is missing edge_cases[]`);
    }
    if (!normalizeText(requirement.evidence)) {
      issues.push(`functional requirement ${requirement.id} is missing evidence`);
    }
    if (!normalizeText(requirement.priority)) {
      issues.push(`functional requirement ${requirement.id} is missing priority`);
    } else if (!allowedPriorities.has(normalizeText(requirement.priority))) {
      issues.push(`functional requirement ${requirement.id} has unsupported priority: ${requirement.priority}`);
    }
  }

  if (type === "前端") {
    const hasUiStateCoverage = functionalRequirements.some((req) =>
      req.edge_cases.some((item) => /状态|state|loading|empty|error/i.test(item))
    );
    if (complexity !== "简单" && !hasUiStateCoverage) {
      issues.push("frontend task should include state-oriented edge cases such as loading, empty, or error");
    }
  }

  if (type === "后端") {
    const hasInterfaceBoundary = functionalRequirements.some((req) =>
      /api|接口|endpoint|schema|contract|response|request/i.test(
        [req.title, req.description, req.implementation_scheme].join(" ")
      )
    );
    if (complexity !== "简单" && !hasInterfaceBoundary) {
      issues.push("backend task should describe at least one explicit interface or contract boundary");
    }
  }

  const allVerificationMethods = [...new Set(functionalRequirements.map((req) => normalizeText(req.verification_method)).filter(Boolean))];
  if (
    complexity === "复杂" &&
    type !== "前端" &&
    !allVerificationMethods.some((method) => method === "unit" || method === "integration" || method === "e2e")
  ) {
    issues.push("complex non-frontend task should not rely solely on manual/rubric verification");
  }

  if (issues.length > 0) {
    const uniqueIssues = [...new Set(issues)];
    throw new Error(`Task input is not ready:\n- ${uniqueIssues.join("\n- ")}`);
  }
}

function validateInput(input) {
  if (!normalizeText(input.title)) throw new Error("Missing required field: title");
  assertTitleQuality(input.title);
  if (!normalizeText(input.goal)) throw new Error("Missing required field: goal");
  const scope = normalizeList(input.scope, "scope");
  const constraints = normalizeList(input.constraints, "constraints");
  const acceptanceCriteria = normalizeList(input.acceptance_criteria, "acceptance_criteria");
  const complexity = inferComplexity(input, scope, constraints);
  const type = inferTaskType(input, scope, constraints);
  const goals = Array.isArray(input.goals) && input.goals.length > 0
    ? input.goals.map((item) => normalizeText(item)).filter(Boolean)
    : [normalizeText(input.goal)];
  const successCriteria = Array.isArray(input.success_criteria) && input.success_criteria.length > 0
    ? input.success_criteria.map((item) => normalizeText(item)).filter(Boolean)
    : acceptanceCriteria;
  const nonGoals = Array.isArray(input.non_goals)
    ? input.non_goals.map((item) => normalizeText(item)).filter(Boolean)
    : [];
  const userStories = Array.isArray(input.user_stories) && input.user_stories.length > 0
    ? input.user_stories.map((story) => ({
        as_a: normalizeText(story.as_a),
        i_want: normalizeText(story.i_want),
        so_that: normalizeText(story.so_that),
        acceptance_criteria: normalizeList(story.acceptance_criteria || acceptanceCriteria, "user_story.acceptance_criteria")
      }))
    : complexity === "简单"
      ? [
        {
          as_a: "项目维护者",
          i_want: normalizeText(input.goal),
          so_that: "任务目标可以被明确实现并验证",
          acceptance_criteria: acceptanceCriteria
        }
      ]
      : [];
  const functionalRequirements = Array.isArray(input.functional_requirements) && input.functional_requirements.length > 0
    ? input.functional_requirements.map((req, index) => ({
        id: `F${index + 1}`,
        title: normalizeText(req.title || req.description || `需求 ${index + 1}`),
        description: normalizeText(req.description || req.title),
        implementation_scheme: normalizeText(
          req.implementation_scheme || "遵循现有架构，以最小变更满足验收标准"
        ),
        acceptance_criteria: normalizeList(req.acceptance_criteria || acceptanceCriteria, "functional_requirements.acceptance_criteria"),
        verification_method: normalizeText(req.verification_method || "manual"),
        edge_cases: normalizeList(req.edge_cases || constraints.slice(0, 2), "functional_requirements.edge_cases"),
        evidence: normalizeText(req.evidence || "手工验证记录"),
        priority: normalizeText(req.priority || "必须")
      }))
    : scope.map((item, index) => ({
        id: `F${index + 1}`,
        title: item,
        description: item,
        implementation_scheme: "遵循现有架构，以最小变更满足验收标准",
        acceptance_criteria: acceptanceCriteria.slice(index, index + 1).length > 0 ? [acceptanceCriteria[index]] : acceptanceCriteria,
        verification_method: "manual",
        edge_cases: constraints.slice(0, 2),
        evidence: "手工验证记录",
        priority: "必须"
      }));
  validateTaskReadiness({
    input,
    complexity,
    type,
    scope,
    constraints,
    acceptanceCriteria,
    goals,
    nonGoals,
    successCriteria,
    userStories,
    functionalRequirements
  });
  const tags = Array.isArray(input.tags) ? input.tags.map((item) => normalizeText(item)).filter(Boolean) : [];
  const corpus = [input.title, input.goal, input.background, input.problem, ...scope]
    .map((item) => normalizeText(item))
    .join(" ");
  if (/(docs|documentation|文档|手册|guide|readme)/i.test(corpus)) {
    tags.push("文档为主");
  }
  if (type === "其他" && /(sdk|库|package|library|cli)/i.test([input.title, input.goal].join(" "))) {
    tags.push("库/SDK");
  }
  return {
    title: normalizeText(input.title),
    goal: normalizeText(input.goal),
    scope,
    constraints,
    acceptance_criteria: acceptanceCriteria,
    memory_refs: Array.isArray(input.memory_refs)
      ? input.memory_refs.map((item) => normalizeText(item)).filter(Boolean)
      : [],
    task_id: input.task_id ? normalizeText(input.task_id) : "",
    type,
    complexity,
    tags: [...new Set(tags)],
    background: normalizeText(input.background || input.goal),
    problem: normalizeText(input.problem || input.goal),
    solution_overview: normalizeText(input.solution_overview || scope.join("；")),
    goals,
    non_goals: nonGoals,
    success_criteria: successCriteria,
    user_stories: userStories,
    functional_requirements: functionalRequirements,
    changelog: Array.isArray(input.changelog) ? input.changelog : [],
    change_source: normalizeText(input.change_source || ""),
    change_trigger: normalizeText(input.change_trigger || ""),
    change_summary: normalizeText(input.change_summary || ""),
    change_related: normalizeText(input.change_related || "")
  };
}

async function main() {
  const projectRoot = resolveProjectRoot();
  ensureLingxiLayout(projectRoot);
  const input = validateInput(await readJsonStdin());

  const taskId = input.task_id || nextTaskId(projectRoot);
  let file = findTaskFile(projectRoot, taskId);
  const operation = file ? "updated" : "created";
  let existing = null;
  if (file) {
    existing = parseTaskDocument(fs.readFileSync(file, "utf8"), file);
  }
  if (!file) {
    file = path.join(tasksDir(projectRoot), `${taskId}.task.${slugify(input.title)}.md`);
  }

  const shouldAppendChangeLog =
    operation === "updated" &&
    input.change_source === "vet" &&
    input.change_trigger &&
    input.change_summary;
  const changelog = shouldAppendChangeLog
    ? [
        {
          date: new Date().toISOString().slice(0, 10),
          source: input.change_source,
          trigger: input.change_trigger,
          summary: input.change_summary,
          related: input.change_related || ""
        },
        ...(existing?.changelog || [])
      ]
    : existing?.changelog || input.changelog;
  const document = renderTaskDocument({
    ...input,
    id: taskId,
    version: shouldAppendChangeLog ? incrementVersion(existing?.version || "1.0") : existing?.version || "1.0",
    status: existing?.status || "草稿",
    created_at: existing?.created_at || new Date().toISOString().slice(0, 10),
    changelog
  });
  fs.writeFileSync(file, document, "utf8");

  process.stdout.write(
    JSON.stringify(
      {
        operation,
        task_id: taskId,
        file,
        quality_gate: "ready",
        next_step_options: [
          { id: "A", label: "执行 vet", action: "run_vet" },
          { id: "B", label: "补充 task", action: "revise_task" },
          { id: "C", label: "跳过", action: "skip" }
        ]
      },
      null,
      2
    ) + "\n"
  );
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
