#!/usr/bin/env node

import fs from "node:fs";
import process from "node:process";
import {
  detectProjectContext,
  findTaskFile,
  formatMemoryRef,
  latestTaskId,
  normalizeText,
  parseTaskDocument,
  retrieveRelevantMemoryHits,
  resolveProjectRoot
} from "../../../scripts/_lingxi-memory.mjs";
import { VET_REPORT_SCHEMA_VERSION, assertValidVetReport } from "./vet-report.mjs";

const AMBIGUOUS_TERMS = [
  "optimize",
  "improve",
  "better",
  "fast",
  "robust",
  "user-friendly",
  "优化",
  "提升",
  "更好",
  "稳定",
  "友好"
];

const GENERIC_CONSTRAINT_TERMS = [
  /do not change runtime behavior/i,
  /keep (the )?diff minimal/i,
  /keep (the )?repo layout/i,
  /keep (the )?existing structure/i,
  /do not change routes/i,
  /do not alter backend apis/i,
  /keep external api stable/i,
  /不改运行时行为/,
  /保持 diff 最小/,
  /保持仓库结构/,
  /不改路由/,
  /保持外部 api 稳定/
];

const GENERIC_NON_GOAL_TERMS = [
  /do not change runtime behavior/i,
  /keep (the )?diff minimal/i,
  /do not introduce extra capability surface/i,
  /do not expand into unrelated refactors/i,
  /do not alter unrelated apis/i,
  /do not expand into a new service/i,
  /不改运行时行为/,
  /保持 diff 最小/,
  /不在本任务内引入额外能力面/,
  /不扩展为大范围重构/,
  /不调整无关接口/,
  /不扩展为新的服务能力/,
  /不扩展为新的功能包/,
  /不重做整套页面视觉/
];

const GENERIC_EVIDENCE_TERMS = [
  /手工验证记录/i,
  /documentation review/i,
  /diff review/i,
  /manual walkthrough/i,
  /browser capture/i,
  /文档评审/,
  /diff review/i,
  /截图/i
];

function parseArgs(argv) {
  const args = { taskId: "", taskPath: "" };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--task-id") {
      args.taskId = argv[i + 1] || "";
      i += 1;
      continue;
    }
    if (arg === "--task-path") {
      args.taskPath = argv[i + 1] || "";
      i += 1;
    }
  }
  return args;
}

function hasAmbiguousLanguage(text) {
  const normalized = normalizeText(text).toLowerCase();
  return AMBIGUOUS_TERMS.some((term) => normalized.includes(term)) && !/\d/.test(normalized);
}

function finding(severity, code, message, section) {
  return { severity, code, message, section };
}

function reviewDimensions(task) {
  if (task.complexity === "简单" || task.type === "简单功能") {
    return ["D1", "D2"];
  }
  if (task.type === "前端") {
    return task.complexity === "复杂" ? ["D1", "D2", "D3", "D4", "D5"] : ["D1", "D2", "D3", "D4"];
  }
  return ["D1", "D2", "D3", "D4", "D5"];
}

function severityRank(severity) {
  switch (severity) {
    case "blocking":
      return 4;
    case "high":
      return 3;
    case "warning":
      return 2;
    default:
      return 1;
  }
}

function typeSpecificD4Check(task) {
  if (task.type === "前端") {
    if (task.functional_requirements.some((req) => !req.edge_cases.some((item) => /状态|state|loading|error/i.test(item)))) {
      return finding("warning", "frontend_state_coverage_weak", "Frontend task lacks explicit state-oriented edge case coverage.", "D4");
    }
    const hasInteractionSignal = task.functional_requirements.some((req) =>
      /click|input|form|交互|点击|提交|响应式|layout|screen/i.test(
        [req.title, req.description, req.implementation_scheme, ...(req.acceptance_criteria || [])].join(" ")
      )
    );
    if (!hasInteractionSignal && task.complexity !== "简单") {
      return finding("warning", "frontend_interaction_surface_thin", "Frontend task should describe interaction or layout surface more explicitly.", "D4");
    }
    return null;
  }
  if (task.type === "后端") {
    if (task.functional_requirements.some((req) => !/unit|integration|manual/i.test(req.verification_method))) {
      return finding("warning", "backend_verification_weak", "Backend requirement has weak verification method coverage.", "D4");
    }
    const hasContractBoundary = task.functional_requirements.some((req) =>
      /api|接口|endpoint|request|response|schema|contract|payload/i.test(
        [req.title, req.description, req.implementation_scheme, ...(req.acceptance_criteria || [])].join(" ")
      )
    );
    if (!hasContractBoundary) {
      return finding("warning", "backend_contract_surface_thin", "Backend task should define request/response/schema or contract boundaries.", "D4");
    }
    return null;
  }
  return null;
}

function classifyReadiness(findings) {
  if (findings.some((item) => item.severity === "blocking")) return "not_ready";
  if (findings.some((item) => item.severity === "high")) return "revise_first";
  if (findings.some((item) => item.severity === "warning")) return "ready_with_notes";
  return "ready";
}

function distinctFindingCodes(findings) {
  const seen = new Set();
  return findings.filter((item) => {
    const key = `${item.severity}:${item.code}:${item.section}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizedUnique(items) {
  return [...new Set((items || []).map((item) => normalizeText(item)).filter(Boolean))];
}

function criterionKey(value) {
  return normalizeText(value).toLowerCase();
}

function looksGenericConstraint(value) {
  const normalized = normalizeText(value);
  return GENERIC_CONSTRAINT_TERMS.some((pattern) => pattern.test(normalized));
}

function looksGenericEvidence(value) {
  const normalized = normalizeText(value);
  return GENERIC_EVIDENCE_TERMS.some((pattern) => pattern.test(normalized));
}

function looksGenericNonGoal(value) {
  const normalized = normalizeText(value);
  return GENERIC_NON_GOAL_TERMS.some((pattern) => pattern.test(normalized));
}

function acceptanceCoverageGap(task) {
  const topLevel = normalizedUnique(task.acceptance_criteria || []);
  if (topLevel.length === 0) return [];
  const requirementCriteria = new Set(
    (task.functional_requirements || [])
      .flatMap((req) => req.acceptance_criteria || [])
      .map((item) => criterionKey(item))
      .filter(Boolean)
  );
  return topLevel.filter((item) => !requirementCriteria.has(criterionKey(item)));
}

function genericOnlyConstraints(task) {
  if (task.complexity === "简单") return false;
  const constraints = normalizedUnique(task.constraints || []);
  if (constraints.length === 0) return false;
  return constraints.every((item) => looksGenericConstraint(item));
}

function genericEvidenceFootprint(task) {
  const evidenceItems = normalizedUnique((task.functional_requirements || []).map((req) => req.evidence));
  if (evidenceItems.length === 0) return false;
  return evidenceItems.every((item) => looksGenericEvidence(item));
}

function genericOnlyNonGoals(task) {
  if (task.complexity === "简单") return false;
  const nonGoals = normalizedUnique(task.non_goals || []);
  if (nonGoals.length === 0) return false;
  return nonGoals.every((item) => looksGenericNonGoal(item));
}

function taskReviewSignals(task) {
  const corpus = [
    task.title,
    task.type,
    ...(task.tags || []),
    task.background,
    task.problem,
    task.solution_overview,
    ...(task.goals || []),
    ...(task.non_goals || []),
    ...(task.success_criteria || []),
    ...(task.constraints || []),
    ...(task.acceptance_criteria || []),
    ...((task.functional_requirements || []).flatMap((req) => [
      req.title,
      req.description,
      req.implementation_scheme,
      req.evidence,
      ...(req.acceptance_criteria || []),
      ...(req.edge_cases || [])
    ])),
    ...((task.guidance_blocks || []).flatMap((block) => [block.title, ...(block.bullets || [])]))
  ]
    .map((item) => normalizeText(item))
    .filter(Boolean)
    .join(" ");

  return {
    docs: /(docs|documentation|文档|guide|readme|onboarding|playbook|runbook)/i.test(corpus),
    sdk: /(sdk|library|库|package|public api|entrypoint|surface|compat|兼容|migration|breaking)/i.test(corpus),
    integration: /(集成|integration|第三方|third-party|external|依赖|rollback|回滚|timeout|webhook|sync|upstream|downstream)/i.test(corpus),
    contract_surface: /(api|接口|request|response|schema|contract|payload|entrypoint|surface)/i.test(corpus),
    frontend_surface: /(state|状态|loading|empty|error|交互|interaction|layout|screen|route|页面)/i.test(corpus)
  };
}

function buildVetMemoryQuery(task) {
  return [
    task.title,
    task.type,
    task.background,
    task.problem,
    task.solution_overview,
    ...(task.tags || []),
    ...(task.goals || []),
    ...(task.constraints || []),
    ...(task.acceptance_criteria || []),
    ...((task.functional_requirements || []).flatMap((req) => [
      req.title,
      req.description,
      req.implementation_scheme,
      ...(req.acceptance_criteria || [])
    ]))
  ]
    .map((item) => normalizeText(item))
    .filter(Boolean)
    .join(" ");
}

function buildVetMemoryContext(task, projectContext, signals) {
  return {
    caller: "vet",
    task_id: normalizeText(task.id),
    title: normalizeText(task.title),
    type: normalizeText(task.type),
    complexity: normalizeText(task.complexity),
    background: normalizeText(task.background),
    problem: normalizeText(task.problem),
    solution_overview: normalizeText(task.solution_overview),
    goals: normalizedUnique(task.goals || []),
    constraints: normalizedUnique(task.constraints || []),
    acceptance_criteria: normalizedUnique(task.acceptance_criteria || []),
    memory_refs: normalizedUnique(task.memory_refs || []),
    tags: normalizedUnique(task.tags || []),
    project_context: {
      kind: normalizeText(projectContext?.kind),
      stack: normalizeText(projectContext?.summary),
      cues: normalizedUnique(projectContext?.cues || [])
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

function taskAppliesMemory(task, note) {
  const refs = (task.memory_refs || []).map((item) => normalizeText(item).toLowerCase());
  if (refs.length === 0) return false;
  const id = normalizeText(note.id).toLowerCase();
  const title = normalizeText(note.title).toLowerCase();
  return refs.some((item) => (id && item.includes(id)) || (title && item.includes(title)));
}

function guidanceBullets(task, kind) {
  return normalizedUnique(
    (task.guidance_blocks || [])
      .filter((block) => normalizeText(block.kind) === kind)
      .flatMap((block) => block.bullets || [])
  );
}

function guidanceContentLooksSubstantive(task, kind) {
  const bullets = guidanceBullets(task, kind);
  if (bullets.length === 0) return false;
  const joined = bullets.join(" ");
  const coverage = new Set();
  if (kind === "frontend_guidance") {
    if (/loading|empty|error|state|状态/i.test(joined)) coverage.add("state");
    if (/交互|interaction|layout|route|页面|screen/i.test(joined)) coverage.add("surface");
    if (/边界|不扩散|保持|route|layout/i.test(joined)) coverage.add("boundary");
    return coverage.size >= 2;
  }
  if (kind === "backend_contract_guidance") {
    if (/request|response|schema|contract|api|接口/i.test(joined)) coverage.add("contract");
    if (/边界|service|模块|interface|scope/i.test(joined)) coverage.add("boundary");
    if (/实现|审阅|review|before/i.test(joined)) coverage.add("workflow");
    return coverage.size >= 2;
  }
  if (kind === "integration_guidance") {
    if (/integration|依赖|external|第三方|upstream|downstream/i.test(joined)) coverage.add("dependency");
    if (/rollback|回滚|失败|failure|timeout|change order|顺序/i.test(joined)) coverage.add("risk");
    if (/check|record|验证|contract diff|integration check/i.test(joined)) coverage.add("verification");
    return coverage.size >= 2;
  }
  if (kind === "docs_delivery_guidance") {
    if (/reader|audience|读者|受众/i.test(joined)) coverage.add("audience");
    if (/文档|guide|readme|交付|publish|章节|入口/i.test(joined)) coverage.add("delivery");
    if (/diff|walkthrough|导航|evidence|证据/i.test(joined)) coverage.add("reviewability");
    return coverage.size >= 2;
  }
  if (kind === "sdk_surface_guidance") {
    if (/public api|entrypoint|surface|export/i.test(joined)) coverage.add("surface");
    if (/compat|兼容|migration|breaking/i.test(joined)) coverage.add("compatibility");
    if (/internal-only|contract|调用方|consumer/i.test(joined)) coverage.add("boundary");
    return coverage.size >= 2;
  }
  if (kind === "risk_guidance") {
    if (/why|为什么|目标|goal/i.test(joined)) coverage.add("why");
    if (/success|验收|完成|标准/i.test(joined)) coverage.add("success");
    if (/边界|scope|后续|非目标/i.test(joined)) coverage.add("boundary");
    return coverage.size >= 2;
  }
  return bullets.length >= 2;
}

function equivalentGuidanceCoverage(task, kind) {
  const corpus = [
    task.solution_overview,
    ...(task.constraints || []),
    ...(task.success_criteria || []),
    ...(task.acceptance_criteria || []),
    ...((task.functional_requirements || []).flatMap((req) => [
      req.implementation_scheme,
      req.evidence,
      ...(req.edge_cases || []),
      ...(req.acceptance_criteria || [])
    ]))
  ]
    .map((item) => normalizeText(item))
    .filter(Boolean)
    .join(" ");
  if (kind === "frontend_guidance") return /loading|empty|error|state|状态|交互|layout|route/i.test(corpus);
  if (kind === "backend_contract_guidance") return /request|response|schema|contract|api|接口/i.test(corpus);
  if (kind === "integration_guidance") return /integration|依赖|rollback|回滚|timeout|external|第三方|upstream|downstream/i.test(corpus);
  if (kind === "docs_delivery_guidance") return /reader|audience|读者|文档|guide|readme|交付|publish|章节/i.test(corpus);
  if (kind === "sdk_surface_guidance") return /public api|entrypoint|surface|compat|兼容|migration|breaking/i.test(corpus);
  return false;
}

function expectedGuidanceKinds(task, signals) {
  if (task.complexity === "简单" || task.type === "简单功能") return [];
  const kinds = [];
  if (task.type === "前端") kinds.push("frontend_guidance");
  if (task.type === "后端") kinds.push("backend_contract_guidance");
  if (signals.integration || task.type === "后端" || signals.sdk) kinds.push("integration_guidance");
  if (signals.docs) kinds.push("docs_delivery_guidance");
  if (signals.sdk) kinds.push("sdk_surface_guidance");
  return [...new Set(kinds)];
}

function guidanceMissingFindings(task, signals) {
  const findings = [];
  for (const kind of expectedGuidanceKinds(task, signals)) {
    if (guidanceContentLooksSubstantive(task, kind) || equivalentGuidanceCoverage(task, kind)) continue;
    if (kind === "frontend_guidance") {
      findings.push(finding("warning", "frontend_guidance_missing", "Frontend task should include implementation guidance for states, interaction boundaries, and route/layout constraints.", "D4"));
    }
    if (kind === "backend_contract_guidance") {
      findings.push(finding("warning", "backend_contract_guidance_missing", "Backend task should include explicit guidance for contract-first implementation and service boundaries.", "D4"));
    }
    if (kind === "integration_guidance") {
      findings.push(finding("warning", "integration_guidance_missing", "Integration-flavored task should describe dependency edges, rollback expectations, and change order before implementation starts.", "D5"));
    }
    if (kind === "docs_delivery_guidance") {
      findings.push(finding("warning", "docs_delivery_guidance_missing", "Documentation-oriented task should include reader-path and delivery-surface guidance, not just generic doc edits.", "D4"));
    }
    if (kind === "sdk_surface_guidance") {
      findings.push(finding("warning", "sdk_surface_guidance_missing", "Library/SDK task should include public-surface and compatibility guidance for implementers.", "D4"));
    }
  }
  return findings;
}

function guidanceSufficiencyThin(task, signals) {
  const expectedKinds = expectedGuidanceKinds(task, signals);
  if (expectedKinds.length === 0) return false;
  const satisfied = expectedKinds.filter((kind) => guidanceContentLooksSubstantive(task, kind) || equivalentGuidanceCoverage(task, kind));
  const totalGuidanceBullets = normalizedUnique((task.guidance_blocks || []).flatMap((block) => block.bullets || [])).length;
  if (satisfied.length === 0) return true;
  if (task.guidance_blocks?.length > 0 && totalGuidanceBullets < Math.min(3, expectedKinds.length + 1)) return true;
  if (task.complexity === "复杂" && satisfied.length < Math.min(expectedKinds.length, 2)) return true;
  return false;
}

function solutionRationaleThin(task) {
  if (task.complexity === "简单" || task.type === "简单功能") return false;
  const normalized = normalizeText(task.solution_overview);
  if (!normalized) return false;
  if (/因为|因此|所以|why|because|更稳|更安全|safer|risk|风险|审阅|review|兼容|rollback|回滚/i.test(normalized)) {
    return false;
  }
  return true;
}

function revisionTargetForFinding(item) {
  switch (item.code) {
    case "goal_missing_or_weak":
    case "goal_ambiguous":
      return "重写目标与问题描述，让任务目标可判定且不含模糊措辞。";
    case "acceptance_missing":
    case "acceptance_ambiguous":
    case "success_criteria_ambiguous":
      return "补强验收标准，确保每条都可二值判定并且可直接验证。";
    case "acceptance_coverage_gap":
      return "把顶层验收检查清单逐条映射到对应功能需求，避免出现无人承接的验收项。";
    case "constraints_missing":
    case "constraints_generic_only":
    case "risk_underexplored":
    case "integration_risk_thin":
      return "补充与当前任务直接相关的约束、依赖边界和回滚/风险条件，不要只写模板化限制。";
    case "solution_missing":
    case "solution_too_thin":
    case "solution_repeats_problem":
    case "solution_rationale_thin":
      return "改写解决方案概述，明确 chosen direction、边界与为什么这样落地。";
    case "guidance_sufficiency_thin":
      return "补强开发指导，让工程师在开工前就知道边界、顺序、验证与回滚，不要只靠功能需求自行推断。";
    case "non_goals_missing":
    case "non_goals_overlap_scope":
    case "non_goals_generic_only":
      return "补齐真正的非目标，明确这次不会做什么来防止 scope drift。";
    case "memory_context_missing":
      return "先应用当前仓库里已经存在的相关 LingXi memory，把可复用偏好或约束写进 task，避免重复踩同样的工程判断。";
    case "requirement_spec_incomplete":
    case "requirement_granularity_thin":
      return "补全功能需求行，让实现方案、验收、验证方式和边界情况一一对应。";
    case "frontend_state_coverage_weak":
    case "frontend_interaction_surface_thin":
    case "frontend_runtime_constraint_thin":
    case "frontend_guidance_missing":
      return "补强前端状态、交互面和运行时边界，让页面行为覆盖 loading/empty/error 与设备约束。";
    case "backend_verification_weak":
    case "backend_contract_surface_thin":
    case "backend_contract_guidance_missing":
      return "把后端接口/契约边界写清楚，并补足更可信的验证方式。";
    case "docs_audience_missing":
    case "docs_delivery_missing":
    case "docs_delivery_guidance_missing":
      return "明确文档任务的目标读者与具体交付物，避免只有“改文档”这种宽泛表述。";
    case "sdk_contract_missing":
    case "sdk_compatibility_missing":
    case "sdk_surface_guidance_missing":
      return "明确 SDK/public API contract、兼容策略和是否存在 breaking change。";
    case "integration_guidance_missing":
      return "补一段集成指导，明确上下游依赖、失败模式、回滚路径和变更顺序。";
    case "evidence_specificity_thin":
      return "把证据形式从占位词改成可审阅的具体证据，例如哪类 diff、截图、契约检查或 walkthrough。";
    case "verification_strategy_thin":
      return "为复杂任务补上更强的验证策略，不要只依赖 manual/rubric。";
    default:
      return "";
  }
}

function buildRevisionTargets(findings) {
  const themeDefinitions = [
    {
      id: "goal_acceptance",
      message: "先收紧目标、成功标准与验收映射，让工程师知道什么算完成。",
      codes: ["goal_missing_or_weak", "goal_ambiguous", "acceptance_missing", "acceptance_ambiguous", "success_criteria_ambiguous", "acceptance_coverage_gap", "scope_acceptance_mismatch"]
    },
    {
      id: "solution_guidance",
      message: "补强方案与开发指导，说明 chosen direction 为什么成立、实现顺序是什么、为什么这样更稳。",
      codes: ["solution_missing", "solution_too_thin", "solution_repeats_problem", "solution_rationale_thin", "guidance_sufficiency_thin"]
    },
    {
      id: "scope_risk",
      message: "补齐非目标、约束与风险边界，把任务收回到当前真正负责的范围。",
      codes: ["constraints_missing", "constraints_generic_only", "risk_underexplored", "integration_risk_thin", "non_goals_missing", "non_goals_overlap_scope", "non_goals_generic_only", "scope_too_broad"]
    },
    {
      id: "frontend",
      message: "补强前端指导：明确状态、交互面、布局/路由边界与运行时约束。",
      codes: ["frontend_state_coverage_weak", "frontend_interaction_surface_thin", "frontend_runtime_constraint_thin", "frontend_guidance_missing"]
    },
    {
      id: "backend",
      message: "补强后端契约与集成指导：先写清 contract、依赖边界、失败模式和回滚路径，再进入实现。",
      codes: ["backend_verification_weak", "backend_contract_surface_thin", "backend_contract_guidance_missing", "integration_guidance_missing"]
    },
    {
      id: "docs",
      message: "补强文档任务的读者与交付指导：明确谁来读、从哪里进入、最终交付到哪一个文档 surface。",
      codes: ["docs_audience_missing", "docs_delivery_missing", "docs_delivery_guidance_missing"]
    },
    {
      id: "sdk",
      message: "补强 SDK/public surface 指导：明确 exported surface、compatibility/migration 和 breaking-change 预期。",
      codes: ["sdk_contract_missing", "sdk_compatibility_missing", "sdk_surface_guidance_missing"]
    },
    {
      id: "evidence_verification",
      message: "把验证策略和证据形式具体化，让 reviewer 知道该看什么、如何确认改动可接受。",
      codes: ["requirement_spec_incomplete", "requirement_granularity_thin", "evidence_specificity_thin", "verification_strategy_thin"]
    }
  ];

  const prioritized = themeDefinitions
    .map((theme) => {
      const matched = findings.filter((item) => theme.codes.includes(item.code));
      if (matched.length === 0) return null;
      return {
        id: theme.id,
        target: theme.message,
        matched,
        severity: Math.max(...matched.map((item) => severityRank(item.severity)))
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.severity - a.severity || a.id.localeCompare(b.id));

  const out = prioritized.map((item) => item.target);
  const fallbackTargets = [...new Set(findings.map((item) => revisionTargetForFinding(item)).filter(Boolean))];
  for (const target of fallbackTargets) {
    if (out.includes(target)) continue;
    out.push(target);
  }
  return out.slice(0, 4);
}

function tagSpecificD4Checks(task, signals) {
  const findings = [];
  const tags = new Set((task.tags || []).map((item) => normalizeText(item)));
  const hasDocsTag = signals.docs || tags.has("文档为主") || tags.has("文档") || tags.has("docs");
  const hasSdkTag = signals.sdk || tags.has("库/SDK") || tags.has("库") || tags.has("SDK");
  if (hasDocsTag) {
    const hasAudienceSignal = [
      task.background,
      task.problem,
      ...task.goals,
      ...task.success_criteria,
      ...(guidanceBullets(task, "docs_delivery_guidance") || [])
    ]
      .join(" ")
      .match(/读者|受众|reader|audience|用户文档|文档/i);
    if (!hasAudienceSignal) {
      findings.push(
        finding("warning", "docs_audience_missing", "Documentation-oriented task should state target readers or audience explicitly.", "D4")
      );
    }
    const hasDeliverySignal =
      (task.functional_requirements || []).some((req) =>
        /readme|guide|publish|release|交付|文档页面|章节|section/i.test(
          [req.title, req.description, req.implementation_scheme, ...(req.acceptance_criteria || [])].join(" ")
        )
      ) || guidanceContentLooksSubstantive(task, "docs_delivery_guidance");
    if (!hasDeliverySignal) {
      findings.push(
        finding("warning", "docs_delivery_missing", "Documentation-oriented task should describe the concrete delivery artifact or publication surface.", "D4")
      );
    }
  }
  if (hasSdkTag) {
    const hasContractSignal =
      (task.functional_requirements || []).some((req) =>
        /api|接口|signature|参数|返回|public|entrypoint|surface|contract|兼容/i.test(
          [req.title, req.description, req.implementation_scheme, ...(req.acceptance_criteria || [])].join(" ")
        )
      ) || guidanceContentLooksSubstantive(task, "sdk_surface_guidance");
    if (!hasContractSignal) {
      findings.push(
        finding("warning", "sdk_contract_missing", "Library/SDK task should define external API or behavior contract expectations.", "D4")
      );
    }
    const hasCompatibilitySignal = [
      task.solution_overview,
      ...(task.constraints || []),
      ...(task.acceptance_criteria || []),
      ...(guidanceBullets(task, "sdk_surface_guidance") || [])
    ]
      .join(" ")
      .match(/兼容|compat|breaking|migration|semver/i);
    if (!hasCompatibilitySignal) {
      findings.push(
        finding("warning", "sdk_compatibility_missing", "Library/SDK task should state compatibility or migration expectations.", "D4")
      );
    }
  }
  return findings;
}

function vetTask(task, projectContext, relevantMemory = []) {
  const findings = [];
  const goalText = [task.background, task.problem, ...(task.goals || [])].filter(Boolean).join(" ");
  const scopeCount = (task.functional_requirements || []).length;
  const dimensions = reviewDimensions(task);
  const signals = taskReviewSignals(task);
  const goalScopeSet = new Set([...(task.goals || []), ...(task.functional_requirements || []).map((req) => req.title)]
    .map((item) => normalizeText(item).toLowerCase())
    .filter(Boolean));

  if (!goalText || goalText.length < 12) {
    findings.push(finding("blocking", "goal_missing_or_weak", "Goal framing is missing or too weak to guide implementation.", "D1"));
  }
  if (projectContext?.summary) {
    if (task.type === "前端" && projectContext.frontend_strength === 0 && projectContext.backend_strength > 0) {
      findings.push(
        finding("warning", "repo_context_frontend_mismatch", "Task is marked as frontend, but the repository currently looks backend-oriented.", "D3")
      );
    }
    if (task.type === "后端" && projectContext.backend_strength === 0 && projectContext.frontend_strength > 0) {
      findings.push(
        finding("warning", "repo_context_backend_mismatch", "Task is marked as backend, but the repository currently looks frontend-oriented.", "D3")
      );
    }
  }
  if (scopeCount === 0) {
    findings.push(finding("blocking", "scope_missing", "Functional scope is missing.", "D1"));
  }
  if (task.acceptance_criteria.length === 0) {
    findings.push(finding("blocking", "acceptance_missing", "Acceptance criteria are missing.", "D2"));
  }
  if ((task.success_criteria || []).length < (task.goals || []).length) {
    findings.push(finding("warning", "success_criteria_thin", "Success criteria are thinner than the stated goals.", "D2"));
  }
  for (const criterion of task.success_criteria || []) {
    if (hasAmbiguousLanguage(criterion)) {
      findings.push(finding("warning", "success_criteria_ambiguous", "Success criterion uses ambiguous language without measurable detail.", "D2"));
      break;
    }
  }
  if (task.constraints.length === 0) {
    findings.push(finding("warning", "constraints_missing", "Constraints are empty. This often hides assumptions that should be explicit.", "D1"));
  }
  if (scopeCount > 8) {
    findings.push(finding("warning", "scope_too_broad", "Scope appears broad enough that the task may need to be split.", "D1"));
  }
  if (scopeCount > 0 && scopeCount !== (task.acceptance_criteria || []).length) {
    findings.push(finding("warning", "scope_acceptance_mismatch", "Scope and acceptance checklist are not obviously aligned one-to-one.", "D2"));
  }
  const uncoveredAcceptance = acceptanceCoverageGap(task);
  if (uncoveredAcceptance.length > 0) {
    findings.push(
      finding(
        "warning",
        "acceptance_coverage_gap",
        `Top-level acceptance items are not clearly mapped into functional requirements: ${uncoveredAcceptance.join("; ")}`,
        "D2"
      )
    );
  }
  if (hasAmbiguousLanguage(goalText)) {
    findings.push(finding("high", "goal_ambiguous", "Goal uses ambiguous language without measurable detail.", "D1"));
  }
  for (const criterion of task.acceptance_criteria) {
    if (hasAmbiguousLanguage(criterion)) {
      findings.push(finding("high", "acceptance_ambiguous", "Acceptance criterion uses ambiguous language without measurable detail.", "D2"));
      break;
    }
  }
  if (dimensions.includes("D3") && !task.solution_overview) {
    findings.push(finding("warning", "solution_missing", "Solution overview is missing for a non-trivial task.", "D3"));
  }
  if (dimensions.includes("D3") && task.type !== "简单功能" && task.solution_overview.length < 12) {
    findings.push(finding("warning", "solution_too_thin", "Solution overview is too thin for a non-trivial task.", "D3"));
  }
  if (
    dimensions.includes("D3") &&
    task.type !== "简单功能" &&
    task.solution_overview &&
    [normalizeText(task.problem).toLowerCase(), normalizeText((task.goals || [])[0]).toLowerCase()].includes(
      normalizeText(task.solution_overview).toLowerCase()
    )
  ) {
    findings.push(finding("warning", "solution_repeats_problem", "Solution overview mostly repeats the goal/problem instead of explaining the chosen direction.", "D3"));
  }
  if (dimensions.includes("D3") && solutionRationaleThin(task)) {
    findings.push(
      finding(
        "warning",
        "solution_rationale_thin",
        "Solution overview states the direction, but does not explain why this path is safer or more appropriate than nearby alternatives.",
        "D3"
      )
    );
  }
  if (dimensions.includes("D3") && task.type !== "简单功能" && (task.non_goals || []).length === 0) {
    findings.push(finding("warning", "non_goals_missing", "Non-trivial task should state non-goals to prevent scope drift.", "D3"));
  }
  if (
    dimensions.includes("D3") &&
    (task.non_goals || []).some((item) => goalScopeSet.has(normalizeText(item).toLowerCase()))
  ) {
    findings.push(finding("warning", "non_goals_overlap_scope", "Non-goals repeat goals or scope instead of declaring true exclusions.", "D3"));
  }
  if (dimensions.includes("D3") && genericOnlyNonGoals(task)) {
    findings.push(
      finding(
        "warning",
        "non_goals_generic_only",
        "Non-goals currently read like generic template exclusions; add task-specific boundaries that clarify what this task still will not cover.",
        "D3"
      )
    );
  }
  if (relevantMemory.length > 0 && !relevantMemory.some((note) => taskAppliesMemory(task, note))) {
    findings.push(
      finding(
        "warning",
        "memory_context_missing",
        `Relevant LingXi memory exists but is not reflected in the task yet: ${relevantMemory.map((note) => formatMemoryRef(note)).join(" | ")}`,
        "D3"
      )
    );
  }
  if (dimensions.includes("D4")) {
    const incompleteReq = (task.functional_requirements || []).find(
      (req) => !req.verification_method || req.acceptance_criteria.length === 0 || req.edge_cases.length === 0
    );
    if (incompleteReq) {
      findings.push(finding("warning", "requirement_spec_incomplete", "At least one functional requirement is missing verification detail or edge cases.", "D4"));
    }
    const typeSpecific = typeSpecificD4Check(task);
    if (typeSpecific) {
      findings.push(typeSpecific);
    }
    findings.push(...guidanceMissingFindings(task, signals));
    findings.push(...tagSpecificD4Checks(task, signals));
    if (guidanceSufficiencyThin(task, signals)) {
      findings.push(
        finding(
          "warning",
          "guidance_sufficiency_thin",
          "Task still lacks enough implementation guidance for engineers to start safely without filling key gaps themselves.",
          "D4"
        )
      );
    }
  }
  if (dimensions.includes("D5") && task.complexity !== "简单" && task.constraints.length < 2) {
    findings.push(finding("warning", "risk_underexplored", "Non-trivial task has too little explicit constraint or risk framing.", "D5"));
  }
  if (dimensions.includes("D5") && genericOnlyConstraints(task)) {
    findings.push(
      finding("warning", "constraints_generic_only", "Non-trivial task currently lists only generic constraints; add task-specific operational boundaries and risk conditions.", "D5")
    );
  }
  if (dimensions.includes("D5") && task.complexity !== "简单" && (task.user_stories || []).length === 0) {
    findings.push(finding("warning", "user_story_missing", "Non-trivial task lacks explicit user stories, which weakens risk and scenario coverage.", "D5"));
  }
  if (task.functional_requirements.length === 1 && task.complexity !== "简单") {
    findings.push(finding("warning", "requirement_granularity_thin", "Non-trivial task has only one functional requirement, which may indicate under-specified scope.", "D4"));
  }
  if (
    dimensions.includes("D5") &&
    /集成|integration|第三方|third-party|external|依赖/i.test(
      [task.background, task.problem, task.solution_overview, ...task.goals].join(" ")
    ) &&
    task.constraints.length < 3
  ) {
    findings.push(
      finding("warning", "integration_risk_thin", "Integration-flavored task should state more explicit dependency or rollback constraints.", "D5")
    );
  }
  if (
    dimensions.includes("D5") &&
    task.complexity === "复杂" &&
    task.type !== "前端" &&
    !task.functional_requirements.some((req) => /unit|integration|e2e/i.test(normalizeText(req.verification_method)))
  ) {
    findings.push(
      finding("warning", "verification_strategy_thin", "Complex non-frontend task relies too heavily on manual review without stronger verification coverage.", "D5")
    );
  }
  if (
    dimensions.includes("D5") &&
    task.type === "前端" &&
    task.complexity !== "简单" &&
    !task.constraints.some((item) => /responsive|mobile|desktop|浏览器|兼容|性能/i.test(normalizeText(item)))
  ) {
    findings.push(
      finding("warning", "frontend_runtime_constraint_thin", "Non-trivial frontend task should state runtime constraints such as responsive, browser, or performance boundaries.", "D5")
    );
  }
  if (dimensions.includes("D4") && task.complexity !== "简单" && genericEvidenceFootprint(task)) {
    findings.push(
      finding("warning", "evidence_specificity_thin", "Evidence fields still look like placeholders; name the concrete artifact or proof the reviewer should expect.", "D4")
    );
  }

  const dedupedFindings = distinctFindingCodes(findings).sort(
    (a, b) => severityRank(b.severity) - severityRank(a.severity) || a.code.localeCompare(b.code)
  );
  const readiness = classifyReadiness(dedupedFindings);
  const revisionTargets = buildRevisionTargets(dedupedFindings);
  const topFixes = revisionTargets.slice(0, 3);

  const dimensionSummaries = dimensions.map((dimension) => {
    const dimensionFindings = dedupedFindings.filter((item) => item.section === dimension);
    return {
      dimension,
      finding_count: dimensionFindings.length,
      status: dimensionFindings.some((item) => item.severity === "blocking")
        ? "blocking"
        : dimensionFindings.some((item) => item.severity === "high")
          ? "needs_attention"
          : dimensionFindings.length > 0
            ? "warning"
            : "clear"
    };
  });

  return {
    report_version: VET_REPORT_SCHEMA_VERSION,
    review_scope: {
      type: task.type,
      complexity: task.complexity,
      tags: task.tags || [],
      dimensions
    },
    project_context_summary: projectContext?.summary || "",
    findings: dedupedFindings,
    findings_by_dimension: dimensions.reduce((acc, dimension) => {
      acc[dimension] = dedupedFindings.filter((item) => item.section === dimension);
      return acc;
    }, {}),
    dimension_summaries: dimensionSummaries,
    summary: {
      blocking_count: dedupedFindings.filter((item) => item.severity === "blocking").length,
      high_count: dedupedFindings.filter((item) => item.severity === "high").length,
      warning_count: dedupedFindings.filter((item) => item.severity === "warning").length,
      readiness
    },
    review_range_statement: `Reviewed ${task.type}/${task.complexity}${task.tags?.length ? ` (${task.tags.join("/")})` : ""} task across ${dimensions.join(", ")}.`,
    overall_evaluation:
      dedupedFindings.length === 0
        ? "Task framing is solid and can proceed."
        : dedupedFindings.some((item) => item.severity === "blocking")
          ? "Task has blocking issues and should be revised before implementation."
          : dedupedFindings.some((item) => item.severity === "high")
            ? "Task is directionally usable, but high-priority framing issues should be revised first."
            : "Task is directionally usable, but the highlighted issues should be addressed first.",
    execution_readiness_breakdown: {
      can_start_implementation: !dedupedFindings.some((item) => item.severity === "blocking"),
      should_revise_first: dedupedFindings.some((item) => item.severity === "blocking" || item.severity === "high"),
      primary_risk_area: dedupedFindings[0]?.section || "none"
    },
    improvement_priority: {
      blockers: dedupedFindings.filter((item) => item.severity === "blocking"),
      high: dedupedFindings.filter((item) => item.severity === "high"),
      warning: dedupedFindings.filter((item) => item.severity === "warning"),
      top_fixes: topFixes
    },
    issues_only_dimensions: dimensionSummaries.filter((item) => item.finding_count > 0).map((item) => item.dimension),
    revision_targets: revisionTargets,
    recommended_next_action: dedupedFindings.some((item) => item.severity === "blocking")
      ? (topFixes.length > 0
          ? `先补这${topFixes.length}件事再开工：${topFixes.map((item, index) => `${index + 1}. ${item}`).join(" ")} 这些问题会让工程师在关键边界上自行补猜。`
          : "Revise the task document before implementation.")
      : dedupedFindings.some((item) => item.severity === "high")
        ? (topFixes.length > 0
            ? `继续前先补这${topFixes.length}件事：${topFixes.map((item, index) => `${index + 1}. ${item}`).join(" ")} 这些问题会直接影响工程师是否能安全开工。`
            : "Address the high-priority issues, then continue.")
        : revisionTargets.length > 0
          ? `建议先补前 ${Math.min(3, topFixes.length || revisionTargets.length)} 项修订：${(topFixes.length > 0 ? topFixes : revisionTargets).slice(0, 3).join(" ")} 这样能减少实现阶段返工。`
          : "Task can proceed after reviewing the warnings.",
    next_step_options: dedupedFindings.some((item) => item.severity === "blocking" || item.severity === "high")
      ? [
          { id: "A", label: "调整 task", action: "revise_task" },
          { id: "B", label: "重新执行 vet", action: "rerun_vet" },
          { id: "C", label: "跳过", action: "skip" }
        ]
      : [
          { id: "A", label: "开始实现", action: "proceed" },
          { id: "B", label: "补强 task", action: "revise_task" },
          { id: "C", label: "跳过", action: "skip" }
        ],
    implementation_readiness: dedupedFindings.some((item) => item.severity === "blocking")
      ? "Task has blocking issues and should be revised before implementation."
      : dedupedFindings.some((item) => item.severity === "high")
        ? "Task has high-priority framing issues and should be revised before implementation."
        : "Task can proceed, but warnings should be reviewed before implementation."
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectRoot = resolveProjectRoot();
  let file = normalizeText(args.taskPath);
  if (!file) {
    const taskId = normalizeText(args.taskId) || latestTaskId(projectRoot);
    if (!taskId) {
      throw new Error("Provide --task-id or --task-path, or create a task first");
    }
    file = findTaskFile(projectRoot, taskId);
    if (!file) {
      throw new Error(`Task file not found for id ${taskId}`);
    }
  }

  const task = parseTaskDocument(fs.readFileSync(file, "utf8"), file);
  const projectContext = detectProjectContext(projectRoot);
  const signals = taskReviewSignals(task);
  const result = vetTask(
    task,
    projectContext,
    await retrieveRelevantMemoryHits(projectRoot, buildVetMemoryQuery(task), 3, {
      ...buildVetMemoryContext(task, projectContext, signals)
    })
  );
  const report = {
    task_id: task.id,
    file,
    ...result
  };
  assertValidVetReport(report);
  process.stdout.write(
    JSON.stringify(report, null, 2) + "\n"
  );
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
