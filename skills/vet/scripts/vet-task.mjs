#!/usr/bin/env node

import fs from "node:fs";
import process from "node:process";
import {
  detectProjectContext,
  findTaskFile,
  latestTaskId,
  normalizeText,
  parseTaskDocument,
  resolveProjectRoot
} from "../../../scripts/_lingxi-memory.mjs";

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

function revisionTargetForFinding(item) {
  switch (item.code) {
    case "goal_missing_or_weak":
    case "goal_ambiguous":
      return "重写目标与问题描述，让任务目标可判定且不含模糊措辞。";
    case "acceptance_missing":
    case "acceptance_ambiguous":
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
      return "改写解决方案概述，明确 chosen direction、边界与为什么这样落地。";
    case "non_goals_missing":
    case "non_goals_overlap_scope":
      return "补齐真正的非目标，明确这次不会做什么来防止 scope drift。";
    case "requirement_spec_incomplete":
    case "requirement_granularity_thin":
      return "补全功能需求行，让实现方案、验收、验证方式和边界情况一一对应。";
    case "frontend_state_coverage_weak":
    case "frontend_interaction_surface_thin":
    case "frontend_runtime_constraint_thin":
      return "补强前端状态、交互面和运行时边界，让页面行为覆盖 loading/empty/error 与设备约束。";
    case "backend_verification_weak":
    case "backend_contract_surface_thin":
      return "把后端接口/契约边界写清楚，并补足更可信的验证方式。";
    case "docs_audience_missing":
    case "docs_delivery_missing":
      return "明确文档任务的目标读者与具体交付物，避免只有“改文档”这种宽泛表述。";
    case "sdk_contract_missing":
    case "sdk_compatibility_missing":
      return "明确 SDK/public API contract、兼容策略和是否存在 breaking change。";
    case "evidence_specificity_thin":
      return "把证据形式从占位词改成可审阅的具体证据，例如哪类 diff、截图、契约检查或 walkthrough。";
    case "verification_strategy_thin":
      return "为复杂任务补上更强的验证策略，不要只依赖 manual/rubric。";
    default:
      return "";
  }
}

function buildRevisionTargets(findings) {
  const prioritized = [...findings].sort(
    (a, b) => severityRank(b.severity) - severityRank(a.severity) || a.code.localeCompare(b.code)
  );
  const out = [];
  const seen = new Set();
  for (const item of prioritized) {
    const target = revisionTargetForFinding(item);
    if (!target || seen.has(target)) continue;
    seen.add(target);
    out.push(target);
    if (out.length >= 4) break;
  }
  return out;
}

function tagSpecificD4Checks(task) {
  const findings = [];
  const tags = new Set((task.tags || []).map((item) => normalizeText(item)));
  const hasDocsTag = tags.has("文档为主") || tags.has("文档") || tags.has("docs");
  const hasSdkTag = tags.has("库/SDK") || tags.has("库") || tags.has("SDK");
  if (hasDocsTag) {
    const hasAudienceSignal = [task.background, task.problem, ...task.goals, ...task.success_criteria]
      .join(" ")
      .match(/读者|受众|reader|audience|用户文档|文档/i);
    if (!hasAudienceSignal) {
      findings.push(
        finding("warning", "docs_audience_missing", "Documentation-oriented task should state target readers or audience explicitly.", "D4")
      );
    }
    const hasDeliverySignal = (task.functional_requirements || []).some((req) =>
      /readme|guide|publish|release|交付|文档页面|章节|section/i.test(
        [req.title, req.description, req.implementation_scheme, ...(req.acceptance_criteria || [])].join(" ")
      )
    );
    if (!hasDeliverySignal) {
      findings.push(
        finding("warning", "docs_delivery_missing", "Documentation-oriented task should describe the concrete delivery artifact or publication surface.", "D4")
      );
    }
  }
  if (hasSdkTag) {
    const hasContractSignal = (task.functional_requirements || []).some((req) =>
      /api|接口|signature|参数|返回|public|entrypoint|surface|contract|兼容/i.test(
        [req.title, req.description, req.implementation_scheme, ...(req.acceptance_criteria || [])].join(" ")
      )
    );
    if (!hasContractSignal) {
      findings.push(
        finding("warning", "sdk_contract_missing", "Library/SDK task should define external API or behavior contract expectations.", "D4")
      );
    }
    const hasCompatibilitySignal = [task.solution_overview, ...(task.constraints || []), ...(task.acceptance_criteria || [])]
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

function vetTask(task, projectContext) {
  const findings = [];
  const goalText = [task.background, task.problem, ...(task.goals || [])].filter(Boolean).join(" ");
  const scopeCount = (task.functional_requirements || []).length;
  const dimensions = reviewDimensions(task);
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
  if (dimensions.includes("D3") && task.type !== "简单功能" && (task.non_goals || []).length === 0) {
    findings.push(finding("warning", "non_goals_missing", "Non-trivial task should state non-goals to prevent scope drift.", "D3"));
  }
  if (
    dimensions.includes("D3") &&
    (task.non_goals || []).some((item) => goalScopeSet.has(normalizeText(item).toLowerCase()))
  ) {
    findings.push(finding("warning", "non_goals_overlap_scope", "Non-goals repeat goals or scope instead of declaring true exclusions.", "D3"));
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
    findings.push(...tagSpecificD4Checks(task));
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
      warning: dedupedFindings.filter((item) => item.severity === "warning")
    },
    issues_only_dimensions: dimensionSummaries.filter((item) => item.finding_count > 0).map((item) => item.dimension),
    revision_targets: revisionTargets,
    recommended_next_action: dedupedFindings.some((item) => item.severity === "blocking")
      ? (revisionTargets[0] || "Revise the task document before implementation.")
      : dedupedFindings.some((item) => item.severity === "high")
        ? (revisionTargets[0] || "Address the high-priority issues, then continue.")
        : revisionTargets.length > 0
          ? `Task can proceed after reviewing these points: ${revisionTargets.slice(0, 2).join(" ")}`
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

function main() {
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
  const result = vetTask(task, detectProjectContext(projectRoot));
  process.stdout.write(
    JSON.stringify(
      {
        task_id: task.id,
        file,
        ...result
      },
      null,
      2
    ) + "\n"
  );
}

main();
