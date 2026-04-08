#!/usr/bin/env node

import fs from "node:fs";
import process from "node:process";
import {
  detectProjectContext,
  ensureLingxiLayout,
  findTaskFile,
  formatMemoryRef,
  normalizeText,
  parseTaskDocument,
  retrieveRelevantMemoryHits,
  resolveProjectRoot,
  nextTaskId
} from "../../../scripts/_lingxi-memory.mjs";
import {
  TASK_SPEC_SCHEMA_VERSION,
  assertValidTaskSpec,
  coerceTaskSpecValidationError,
  renderTaskSpecValidationFailure
} from "./task-spec.mjs";
import { compileTaskDocument } from "./task-compiler.mjs";

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

function inferTaskType(input, scope, constraints, projectContext) {
  if (normalizeText(input.type)) {
    return normalizeText(input.type);
  }
  const corpus = [input.title, input.goal, ...(scope || []), ...(constraints || [])]
    .map((item) => normalizeText(item).toLowerCase())
    .join(" ");
  if (/(docs|documentation|文档|手册|guide|readme)/i.test(corpus)) return "其他";
  if (/(\bui\b|页面|前端|组件|样式|交互|homepage|screen|layout)/i.test(corpus)) return "前端";
  if (/(api|后端|接口|数据库|service|endpoint|schema|migration)/i.test(corpus)) return "后端";
  if (/(sdk|library|库|包|cli|command)/i.test(corpus)) return "其他";
  if (projectContext.kind === "frontend") return "前端";
  if (projectContext.kind === "backend") return "后端";
  if (projectContext.kind === "docs") return "其他";
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

function inferBackground(goal, scope, constraints) {
  const normalizedGoal = normalizeText(goal);
  const firstScope = normalizeText(scope[0]);
  const firstConstraint = normalizeText(constraints[0]);
  if (!normalizedGoal) return "";
  return [
    `当前任务聚焦于：${normalizedGoal}`,
    firstScope ? `核心工作项是：${firstScope}` : "",
    firstConstraint ? `同时必须满足约束：${firstConstraint}` : ""
  ].filter(Boolean).join(" ");
}

function inferProblem(goal, scope) {
  const normalizedGoal = normalizeText(goal);
  const firstScope = normalizeText(scope[0]);
  if (!normalizedGoal) return "";
  return `当前缺少一份可以直接驱动实现的任务边界说明；需要把“${normalizedGoal}”收敛成可执行的范围${firstScope ? `，并明确“${firstScope}”` : ""}。`;
}

function inferSolutionOverview(type, scope, constraints) {
  const firstScope = normalizeText(scope[0]);
  const firstConstraint = normalizeText(constraints[0]);
  const mode =
    type === "前端"
      ? "通过收敛交互状态与界面边界来落地"
      : type === "后端"
        ? "通过明确接口/契约边界来落地"
        : "通过最小变更收敛任务边界来落地";
  return [firstScope ? `优先围绕“${firstScope}”展开，` : "", mode, firstConstraint ? `，并保持“${firstConstraint}”` : ""].join("");
}

function inferSimpleNonGoals(type, goal, scope, constraints, signals) {
  const defaults = [];
  if (signals.docs) {
    defaults.push(
      `不新增独立的${signals.delivery_artifact}之外的发布面`,
      "不把运行时实现细节混入面向读者的说明",
      "不在本任务内改动运行时代码行为"
    );
  } else if (signals.sdk) {
    defaults.push(
      "不暴露 internal-only surface",
      "不引入未声明的 breaking change",
      "不把本任务扩展为新的 public API 能力面"
    );
  } else if (type === "前端") {
    defaults.push(
      "不在本任务内改动无关路由或跨页面交互流",
      "不在本任务内重做整套页面视觉",
      "不把当前页面调整扩展为跨模块前端重构"
    );
  } else if (type === "后端") {
    defaults.push(
      "不在本任务内扩展到额外服务边界、数据库 schema 或无关接口",
      "不引入未声明的外部 contract 变化",
      "不把当前收口扩展为新的服务能力"
    );
  } else {
    defaults.push(
      "不把当前任务扩展为跨模块重构",
      "不在本任务内引入额外能力面"
    );
  }

  if (
    constraints.some((item) => /route|路由/i.test(normalizeText(item))) &&
    !defaults.some((item) => /route|路由/i.test(item))
  ) {
    defaults.push("不在本任务内改动现有路由结构");
  }
  if (
    scope.some((item) => /api|接口|schema|contract|entrypoint/i.test(normalizeText(item))) &&
    !defaults.some((item) => /api|接口|schema|contract|entrypoint/i.test(item))
  ) {
    defaults.push("不在本任务内扩展到无关 API 或额外 contract surface");
  }
  if (
    /docs|documentation|文档|guide|readme/i.test(normalizeText(goal)) &&
    !defaults.some((item) => /运行时|runtime/i.test(item))
  ) {
    defaults.push("不在本任务内改动运行时代码行为");
  }

  return uniqueNormalizedList(defaults);
}

function inferTaskSpecConfidence(input, projectContext, complexity) {
  let confidence = 0.68;
  if (normalizeText(input.type)) confidence += 0.05;
  if (normalizeText(input.complexity)) confidence += 0.04;
  if (normalizeText(input.background) && normalizeText(input.problem) && normalizeText(input.solution_overview)) confidence += 0.08;
  if (Array.isArray(input.functional_requirements) && input.functional_requirements.length > 0) confidence += 0.05;
  if (projectContext.kind && projectContext.kind !== "unknown") confidence += 0.05;
  if (complexity === "简单") confidence += 0.03;
  return Number(Math.min(0.95, confidence).toFixed(2));
}

function uniqueNormalizedList(items) {
  const out = [];
  const seen = new Set();
  for (const item of items || []) {
    const normalized = normalizeText(item);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out;
}

function hasSignal(text, pattern) {
  return pattern.test(normalizeText(text));
}

function inferAudience(input, scope) {
  const corpus = [input.title, input.goal, ...(scope || [])].join(" ");
  if (/contributor|贡献者|maintainer|维护者/i.test(corpus)) return "贡献者";
  if (/developer|dev|开发者/i.test(corpus)) return "开发者";
  if (/operator|ops|运维/i.test(corpus)) return "运维人员";
  if (/admin|管理员/i.test(corpus)) return "管理员";
  if (/reader|读者/i.test(corpus)) return "读者";
  if (/user|用户/i.test(corpus)) return "用户";
  return "目标读者";
}

function inferDeliveryArtifact(input, scope) {
  const corpus = [input.title, input.goal, ...(scope || [])].join(" ");
  if (/readme/i.test(corpus)) return "README";
  if (/runbook|playbook/i.test(corpus)) return "runbook";
  if (/guide|指南|onboarding/i.test(corpus)) return "guide";
  if (/api doc|api guide|接口文档/i.test(corpus)) return "API 文档";
  if (/section|章节/i.test(corpus)) return "文档章节";
  if (/doc|documentation|文档/i.test(corpus)) return "文档交付面";
  return "目标交付面";
}

function buildTaskSignals(input, scope, constraints, type, tags) {
  const corpus = [input.title, input.goal, ...(scope || []), ...(constraints || []), ...(tags || [])]
    .map((item) => normalizeText(item))
    .join(" ");
  const docs = /(docs|documentation|文档|guide|readme|onboarding|playbook|runbook)/i.test(corpus);
  const sdk = /(sdk|library|库|package|public api|entrypoint|cli)/i.test(corpus);
  const integration = /(集成|integration|第三方|third-party|external|依赖|upstream|downstream|rollback|回滚|sync|webhook)/i.test(corpus);
  const contract_surface = /(api|接口|request|response|schema|contract|payload|entrypoint|public api|surface)/i.test(corpus);
  const frontend_surface = /(state|状态|loading|empty|error|交互|interaction|layout|screen|route|页面)/i.test(corpus);
  const rationale = /(because|why|因此|所以|更稳|safer|稳妥|风险)/i.test(corpus);
  return {
    docs,
    sdk,
    integration,
    contract_surface,
    frontend_surface,
    rationale,
    audience: docs ? inferAudience(input, scope) : "",
    delivery_artifact: docs ? inferDeliveryArtifact(input, scope) : "",
    corpus
  };
}

const GUIDANCE_TITLE_BY_KIND = {
  frontend_guidance: "前端实现指导",
  backend_contract_guidance: "契约与边界指导",
  integration_guidance: "集成与回滚指导",
  docs_delivery_guidance: "文档交付指导",
  sdk_surface_guidance: "SDK / Surface 指导",
  risk_guidance: "风险与收口指导"
};

function firstRoleFromInput(input, signals) {
  const firstStoryRole = Array.isArray(input.user_stories) && input.user_stories.length > 0
    ? normalizeText(input.user_stories[0]?.as_a)
    : "";
  return firstStoryRole || signals.audience || "工程师";
}

function buildTaskRefinement(input, scope, constraints, acceptanceCriteria, signals) {
  return {
    why: normalizeText(input.goal),
    for_whom: firstRoleFromInput(input, signals),
    boundary: uniqueNormalizedList([...scope.slice(0, 2), ...constraints.slice(0, 2)]),
    success_anchor: uniqueNormalizedList((acceptanceCriteria || []).slice(0, 2))
  };
}

function buildTaskMemoryQuery(input, scope, constraints, acceptanceCriteria, tags) {
  return [
    input.title,
    input.goal,
    ...(scope || []),
    ...(constraints || []),
    ...(acceptanceCriteria || []),
    ...(tags || [])
  ]
    .map((item) => normalizeText(item))
    .filter(Boolean)
    .join(" ");
}

function buildTaskMemoryContext(input, projectContext, scope, constraints, acceptanceCriteria, tags, type, complexity, signals) {
  return {
    caller: "task",
    title: normalizeText(input.title),
    goal: normalizeText(input.goal),
    type: normalizeText(type),
    complexity: normalizeText(complexity),
    background: normalizeText(input.background),
    problem: normalizeText(input.problem),
    solution_overview: normalizeText(input.solution_overview),
    scope: uniqueNormalizedList(scope || []),
    constraints: uniqueNormalizedList(constraints || []),
    acceptance_criteria: uniqueNormalizedList(acceptanceCriteria || []),
    tags: uniqueNormalizedList(tags || []),
    project_context: {
      kind: normalizeText(projectContext?.kind),
      stack: normalizeText(projectContext?.summary),
      cues: uniqueNormalizedList(projectContext?.cues || [])
    },
    semantic_focus: {
      docs: Boolean(signals?.docs),
      sdk: Boolean(signals?.sdk),
      integration: Boolean(signals?.integration),
      contract_surface: Boolean(signals?.contract_surface),
      frontend_surface: Boolean(signals?.frontend_surface)
    }
  };
}

function resolveExistingTask(projectRoot, taskId) {
  const normalizedTaskId = normalizeText(taskId);
  if (!normalizedTaskId) return null;
  const file = findTaskFile(projectRoot, normalizedTaskId);
  if (!file || !fs.existsSync(file)) return null;
  return parseTaskDocument(fs.readFileSync(file, "utf8"), file);
}

function guidanceBlock(kind, bullets) {
  const normalizedBullets = uniqueNormalizedList(bullets);
  if (normalizedBullets.length === 0) return null;
  return {
    kind,
    title: GUIDANCE_TITLE_BY_KIND[kind],
    bullets: normalizedBullets
  };
}

function inferGuidanceBlocks({
  type,
  complexity,
  scope,
  constraints,
  functionalRequirements,
  signals,
  refinement
}) {
  if (complexity === "简单") {
    return [];
  }

  const scopeFocus = normalizeText(scope[0] || functionalRequirements[0]?.title || "当前主流程");
  const secondaryFocus = normalizeText(scope[1] || functionalRequirements[1]?.title || "");
  const primaryConstraint = normalizeText(constraints[0] || "");
  const blocks = [];

  if (type === "前端") {
    blocks.push(
      guidanceBlock("frontend_guidance", [
        `先围绕“${scopeFocus}”拆清用户可见状态、触发条件和界面反馈，再进入具体样式调整。`,
        `至少明确 loading / empty / error / success 中与本任务相关的状态切换，避免工程实现时自行补猜交互边界。`,
        primaryConstraint
          ? `保持“${primaryConstraint}”这类现有页面边界，不把当前任务扩散成跨页面或跨路由重构。`
          : "保持现有页面与路由边界，不把当前任务扩散成跨页面或跨路由重构。"
      ])
    );
  }

  if (type === "后端") {
    blocks.push(
      guidanceBlock("backend_contract_guidance", [
        `先把“${scopeFocus}”对应的 request/response、schema 或行为 contract 写清楚，再落具体实现。`,
        `每条需求都应能对应到一个可审阅的边界说明，避免先改实现、再回头补契约。`,
        primaryConstraint
          ? `在实现时持续对照“${primaryConstraint}”，确保契约调整不会把任务推出当前服务边界。`
          : "在实现时持续对照当前服务边界，确保契约调整不会把任务推出既有系统分层。"
      ])
    );
  }

  if (signals.docs) {
    blocks.push(
      guidanceBlock("docs_delivery_guidance", [
        `从${refinement.for_whom}的阅读路径出发组织${signals.delivery_artifact}，明确入口、顺序和最终交付落点。`,
        `文档只解释完成“${refinement.why}”所必需的信息，不把无关运行时实现细节直接暴露给读者。`,
        secondaryFocus
          ? `把“${secondaryFocus}”这类次级信息作为补充说明处理，避免冲淡主阅读路径。`
          : "交付时保留可审阅证据，例如文档 diff、章节导航变化或读者 walkthrough。"
      ])
    );
  }

  if (signals.sdk) {
    blocks.push(
      guidanceBlock("sdk_surface_guidance", [
        `先明确 public API / entrypoint / exported surface，再决定内部模块如何配合“${scopeFocus}”。`,
        "显式说明 compatibility、migration 或 breaking-change 预期，让调用方能判断升级风险。",
        "把 internal-only 能力与外部 contract 分开描述，避免实现过程中误扩 surface。"
      ])
    );
  }

  if (type === "后端" || signals.sdk || signals.integration) {
    blocks.push(
      guidanceBlock("integration_guidance", [
        `列清“${scopeFocus}”涉及的上下游依赖、失败模式和回滚边界，不要把集成风险留给实现阶段自行发现。`,
        secondaryFocus
          ? `如果“${secondaryFocus}”需要跨模块配合，说明输入输出边界和变更顺序。`
          : "如果需要跨模块配合，说明输入输出边界和变更顺序。",
        "为关键集成路径准备至少一种可审阅的检查记录，例如 integration check、contract diff 或 rollback 验证。"
      ])
    );
  }

  blocks.push(
    guidanceBlock("risk_guidance", [
      `实现前先确认为什么做：${refinement.why || "任务目标"}，并确保开发动作始终服务于这个目标。`,
      refinement.success_anchor.length > 0
        ? `以“${refinement.success_anchor.join("；")}”作为收口标准，避免任务做到一半又重新解释成功条件。`
        : "把成功条件前置成可判定检查项，避免实现过程中再临时解释验收标准。",
      refinement.boundary.length > 0
        ? `始终把边界收在“${refinement.boundary.join("；")}”之内；超出这些边界的内容应进入非目标或后续任务。`
        : "始终把边界收在当前任务范围内；超出边界的内容应进入非目标或后续任务。"
    ])
  );

  return blocks.filter(Boolean);
}

function inferSuccessCriteria(input, acceptanceCriteria, type, complexity, signals) {
  if (Array.isArray(input.success_criteria) && input.success_criteria.length > 0) {
    return input.success_criteria.map((item) => normalizeText(item)).filter(Boolean);
  }

  const out = uniqueNormalizedList(acceptanceCriteria);
  if (
    signals.docs &&
    !out.some((item) => /读者|受众|reader|audience|contributor|贡献者|developer|开发者|operator|管理员|maintainer|用户/i.test(item))
  ) {
    out.push(`${signals.audience}可以在${signals.delivery_artifact}中定位到明确入口`);
  }
  if (
    signals.sdk &&
    !out.some((item) => /兼容|compat|breaking|migration|public api|entrypoint/i.test(item))
  ) {
    out.push("现有消费者无需额外迁移即可继续使用当前 public API 入口");
  }
  if (
    type === "后端" &&
    complexity !== "简单" &&
    !out.some((item) => /api|接口|request|response|schema|contract/i.test(item))
  ) {
    out.push("至少一个 request/response 或 schema contract 边界被明确记录");
  }
  if (
    type === "前端" &&
    !out.some((item) => /loading|empty|error/i.test(item))
  ) {
    out.push(complexity === "简单"
      ? "关键页面状态与当前路由边界对用户可见且可理解"
      : "loading、empty、error 等关键状态都有明确界面反馈");
  }
  return uniqueNormalizedList(out);
}

function strengthenBackground(background, signals) {
  let out = normalizeText(background);
  if (!out) return out;
  if (
    signals.docs &&
    !hasSignal(out, /读者|受众|reader|audience|contributor|maintainer|developer|用户|operator|管理员/i)
  ) {
    out = `${out} 目标读者是${signals.audience}。`;
  }
  if (signals.sdk && !hasSignal(out, /兼容|compat|breaking|migration|semver|public api|contract/i)) {
    out = `${out} 同时需要把外部可见契约与兼容预期说明清楚。`;
  }
  return out;
}

function strengthenProblem(problem, signals) {
  let out = normalizeText(problem);
  if (!out) return out;
  if (signals.docs && !hasSignal(out, /读者|受众|reader|audience|contributor|maintainer|developer|用户/i)) {
    out = `${out} 当前${signals.audience}仍缺少稳定、可定位的阅读路径。`;
  }
  if (signals.sdk && !hasSignal(out, /contract|surface|public api|兼容|breaking|entrypoint/i)) {
    out = `${out} 当前外部 surface 与 compatibility 边界也不够明确。`;
  }
  return out;
}

function strengthenSolutionOverview(solution, type, signals) {
  let out = normalizeText(solution);
  if (!out) return out;
  if (
    signals.docs &&
    !hasSignal(out, /readme|guide|publish|release|交付|文档页面|章节|section|documentation/i)
  ) {
    out = `${out} 交付物聚焦于${signals.delivery_artifact}，并保持读者入口清晰。`;
  }
  if (signals.sdk && !hasSignal(out, /兼容|compat|breaking|migration|semver/i)) {
    out = `${out} 同时保持现有消费者兼容，不引入未声明的 breaking change。`;
  }
  if (type === "后端" && !hasSignal(out, /api|接口|endpoint|request|response|schema|contract|payload/i)) {
    out = `${out} 实施时要先明确 request/response 或 schema contract 边界。`;
  }
  if (type === "前端" && !hasSignal(out, /state|状态|loading|empty|error|交互|layout/i)) {
    out = `${out} 实施时要覆盖 loading、empty、error 等关键状态与交互边界。`;
  }
  if (signals.docs && !hasSignal(out, /为什么|because|更稳|更安全|更易审阅|safer/i)) {
    out = `${out} 这样比把范围扩散到代码或额外发布面更稳，因为交付面和读者入口可以先被固定。`;
  } else if (signals.sdk && !hasSignal(out, /为什么|because|更稳|更安全|更易审阅|safer/i)) {
    out = `${out} 这样更稳，因为 external surface 会先被固定，兼容风险可以在实现前被审阅。`;
  } else if (type === "后端" && !hasSignal(out, /为什么|because|更稳|更安全|更易审阅|safer/i)) {
    out = `${out} 这样更稳，因为 contract 可以先被审查，再决定最小实现改动。`;
  } else if (type === "前端" && !hasSignal(out, /为什么|because|更稳|更安全|更易审阅|safer/i)) {
    out = `${out} 这样更稳，因为关键状态和交互边界会先被固定，而不是在实现中临时补齐。`;
  }
  return out;
}

function inferGeneratedEvidence(type, signals) {
  if (signals.docs) {
    return "文档 diff 与读者 walkthrough";
  }
  if (signals.sdk) {
    return "public API diff、compat 检查或 integration record";
  }
  if (type === "后端") {
    return "接口契约验证、集成测试结果或回滚检查记录";
  }
  if (type === "前端") {
    return "状态切换 walkthrough 与关键界面差异记录";
  }
  return "关键差异说明与验收 walkthrough 记录";
}

function inferGeneratedRequirement(item, index, acceptanceCriteria, constraints, type, complexity, signals) {
  const title = normalizeText(item) || `需求 ${index + 1}`;
  const matchedAcceptance = acceptanceCriteria.slice(index, index + 1).length > 0
    ? [acceptanceCriteria[index]]
    : acceptanceCriteria;

  if (signals.docs) {
    return {
      id: `F${index + 1}`,
      title,
      description: title,
      implementation_scheme: `在现有${signals.delivery_artifact}中明确${signals.audience}的阅读路径和交付边界，不扩展到无关实现表层。`,
      acceptance_criteria: matchedAcceptance,
      verification_method: "rubric",
      edge_cases: uniqueNormalizedList([
        ...constraints.slice(0, 2),
        `避免让${signals.audience}无法定位入口`,
        "避免把运行时实现细节混入面向读者的说明"
      ]),
      evidence: "文档 diff 与读者 walkthrough",
      priority: "必须"
    };
  }

  if (signals.sdk) {
    return {
      id: `F${index + 1}`,
      title,
      description: title,
      implementation_scheme: "围绕 public API / entrypoint 明确外部 contract，并保持 compatibility 预期与变更边界可审阅。",
      acceptance_criteria: matchedAcceptance,
      verification_method: "integration",
      edge_cases: uniqueNormalizedList([
        ...constraints.slice(0, 2),
        "避免暴露 internal-only surface",
        "避免引入 breaking change"
      ]),
      evidence: inferGeneratedEvidence(type, signals),
      priority: "必须"
    };
  }

  if (type === "后端") {
    return {
      id: `F${index + 1}`,
      title,
      description: title,
      implementation_scheme: "在现有服务边界内先明确 request/response 或 schema contract，再以最小实现变更完成交付。",
      acceptance_criteria: matchedAcceptance,
      verification_method: "integration",
      edge_cases: uniqueNormalizedList([
        ...constraints.slice(0, 2),
        "invalid input",
        "unexpected dependency response"
      ]),
      evidence: inferGeneratedEvidence(type, signals),
      priority: "必须"
    };
  }

  if (type === "前端") {
    return {
      id: `F${index + 1}`,
      title,
      description: title,
      implementation_scheme: "在现有交互和布局边界内明确状态切换与界面反馈，不扩散到无关页面。",
      acceptance_criteria: matchedAcceptance,
      verification_method: "manual",
      edge_cases: uniqueNormalizedList([
        ...constraints.slice(0, 2),
        ...(complexity === "简单" ? [] : ["loading state", "empty state", "error state"])
      ]),
      evidence: inferGeneratedEvidence(type, signals),
      priority: "必须"
    };
  }

  return {
    id: `F${index + 1}`,
    title,
    description: title,
    implementation_scheme: "遵循现有架构，以最小变更满足验收标准",
    acceptance_criteria: matchedAcceptance,
    verification_method: "manual",
    edge_cases: uniqueNormalizedList(constraints.slice(0, 2)),
    evidence: inferGeneratedEvidence(type, signals),
    priority: "必须"
  };
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

async function validateInput(input, projectRoot) {
  const projectContext = detectProjectContext(projectRoot);
  const existingTask = resolveExistingTask(projectRoot, input.task_id);
  if (!normalizeText(input.title)) throw new Error("Missing required field: title");
  assertTitleQuality(input.title);
  if (!normalizeText(input.goal)) throw new Error("Missing required field: goal");
  const scope = normalizeList(input.scope, "scope");
  const constraints = normalizeList(input.constraints, "constraints");
  const acceptanceCriteria = normalizeList(input.acceptance_criteria, "acceptance_criteria");
  const complexity = inferComplexity(input, scope, constraints);
  const type = inferTaskType(input, scope, constraints, projectContext);
  const inferredTags = [];
  const tagCorpus = [input.title, input.goal, input.background, input.problem, ...scope]
    .map((item) => normalizeText(item))
    .join(" ");
  if (/(docs|documentation|文档|手册|guide|readme)/i.test(tagCorpus)) {
    inferredTags.push("文档为主");
  }
  if (type === "其他" && /(sdk|库|package|library|cli)/i.test([input.title, input.goal].join(" "))) {
    inferredTags.push("库/SDK");
  }
  const tags = [...new Set([
    ...(Array.isArray(input.tags) ? input.tags.map((item) => normalizeText(item)).filter(Boolean) : []),
    ...inferredTags
  ])];
  const signals = buildTaskSignals(input, scope, constraints, type, tags);
  const refinement = buildTaskRefinement(input, scope, constraints, acceptanceCriteria, signals);
  const goals = Array.isArray(input.goals) && input.goals.length > 0
    ? input.goals.map((item) => normalizeText(item)).filter(Boolean)
    : [normalizeText(input.goal)];
  const successCriteria = inferSuccessCriteria(input, acceptanceCriteria, type, complexity, signals);
  const nonGoals = Array.isArray(input.non_goals)
    ? input.non_goals.map((item) => normalizeText(item)).filter(Boolean)
    : complexity === "简单"
      ? inferSimpleNonGoals(type, input.goal, scope, constraints, signals)
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
    : scope.map((item, index) => inferGeneratedRequirement(item, index, acceptanceCriteria, constraints, type, complexity, signals));
  const guidanceBlocks = Array.isArray(input.guidance_blocks) && input.guidance_blocks.length > 0
    ? input.guidance_blocks.map((block) => ({
        kind: normalizeText(block.kind),
        title: normalizeText(block.title || GUIDANCE_TITLE_BY_KIND[normalizeText(block.kind)] || ""),
        bullets: uniqueNormalizedList(block.bullets || [])
      }))
    : inferGuidanceBlocks({
        type,
        complexity,
        scope,
        constraints,
        functionalRequirements,
        signals,
        refinement
      });
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
  return {
    schema_version: TASK_SPEC_SCHEMA_VERSION,
    title: normalizeText(input.title),
    goal: normalizeText(input.goal),
    scope,
    constraints,
    acceptance_criteria: acceptanceCriteria,
    memory_refs: Array.isArray(input.memory_refs)
      ? input.memory_refs.map((item) => normalizeText(item)).filter(Boolean)
      : existingTask
        ? (existingTask.memory_refs || []).map((item) => normalizeText(item)).filter(Boolean)
      : (await retrieveRelevantMemoryHits(
          projectRoot,
          buildTaskMemoryQuery(input, scope, constraints, acceptanceCriteria, tags),
          3,
          buildTaskMemoryContext(input, projectContext, scope, constraints, acceptanceCriteria, tags, type, complexity, signals)
        )).map((note) => formatMemoryRef(note)),
    task_id: input.task_id ? normalizeText(input.task_id) : "",
    type,
    complexity,
    tags,
    project_context: projectContext.summary ? projectContext : null,
    background: strengthenBackground(normalizeText(input.background || inferBackground(input.goal, scope, constraints)), signals),
    problem: strengthenProblem(normalizeText(input.problem || inferProblem(input.goal, scope)), signals),
    solution_overview: strengthenSolutionOverview(
      normalizeText(input.solution_overview || inferSolutionOverview(type, scope, constraints)),
      type,
      signals
    ),
    goals,
    non_goals: nonGoals,
    success_criteria: successCriteria,
    user_stories: userStories,
    functional_requirements: functionalRequirements,
    guidance_blocks: guidanceBlocks,
    open_questions: Array.isArray(input.open_questions)
      ? input.open_questions.map((item) => normalizeText(item)).filter(Boolean)
      : [],
    confidence: inferTaskSpecConfidence(input, projectContext, complexity),
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
  const taskSpec = await validateInput(await readJsonStdin(), projectRoot);
  assertValidTaskSpec(taskSpec);
  const compilation = compileTaskDocument(projectRoot, {
    ...taskSpec,
    task_id: taskSpec.task_id || nextTaskId(projectRoot)
  });
  fs.writeFileSync(compilation.file, compilation.document, "utf8");

  process.stdout.write(
    JSON.stringify(
      {
        operation: compilation.operation,
        task_id: compilation.task_id,
        file: compilation.file,
        task_spec_version: TASK_SPEC_SCHEMA_VERSION,
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
  const validationError = coerceTaskSpecValidationError(error);
  process.stderr.write(JSON.stringify(renderTaskSpecValidationFailure(validationError), null, 2) + "\n");
  process.exit(1);
});
