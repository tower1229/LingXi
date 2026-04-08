export const VET_REPORT_SCHEMA_VERSION = "draft-2026-04-07";

export const VET_REPORT_REQUIRED_FIELDS = [
  "report_version",
  "task_id",
  "file",
  "review_scope",
  "project_context_summary",
  "summary",
  "findings",
  "findings_by_dimension",
  "dimension_summaries",
  "review_range_statement",
  "overall_evaluation",
  "execution_readiness_breakdown",
  "improvement_priority",
  "issues_only_dimensions",
  "revision_targets",
  "recommended_next_action",
  "next_step_options",
  "implementation_readiness"
];

const REVIEW_DIMENSIONS = new Set(["D1", "D2", "D3", "D4", "D5"]);
const FINDING_SEVERITIES = new Set(["blocking", "high", "warning", "info"]);
const SUMMARY_READINESS = new Set(["ready", "ready_with_notes", "revise_first", "not_ready"]);
const DIMENSION_STATUSES = new Set(["blocking", "needs_attention", "warning", "clear"]);
const NEXT_STEP_ACTIONS = new Set(["revise_task", "rerun_vet", "skip", "proceed"]);

function issue(path, code, message) {
  return { path, code, message };
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function validateFindingShape(item, path) {
  const issues = [];
  if (!isPlainObject(item)) {
    issues.push(issue(path, "invalid_type", `${path} must be an object.`));
    return issues;
  }
  if (!FINDING_SEVERITIES.has(item.severity)) {
    issues.push(issue(`${path}.severity`, "invalid_type", `${path}.severity must be one of: ${[...FINDING_SEVERITIES].join(", ")}.`));
  }
  if (!isNonEmptyString(item.code)) {
    issues.push(issue(`${path}.code`, "invalid_type", `${path}.code must be a non-empty string.`));
  }
  if (!isNonEmptyString(item.message)) {
    issues.push(issue(`${path}.message`, "invalid_type", `${path}.message must be a non-empty string.`));
  }
  if (!REVIEW_DIMENSIONS.has(item.section)) {
    issues.push(issue(`${path}.section`, "invalid_type", `${path}.section must be one of: ${[...REVIEW_DIMENSIONS].join(", ")}.`));
  }
  return issues;
}

export function buildVetReportValidationReport(report) {
  const issues = validateVetReportShape(report);
  return {
    ok: issues.length === 0,
    validator: "vet_report",
    schema_version: VET_REPORT_SCHEMA_VERSION,
    issue_count: issues.length,
    issues
  };
}

export function validateVetReportShape(report) {
  const issues = [];

  for (const field of VET_REPORT_REQUIRED_FIELDS) {
    if (!(field in (report || {}))) {
      issues.push(issue(field, "missing_field", `VetReport is missing required field: ${field}.`));
    }
  }

  if (report?.report_version !== VET_REPORT_SCHEMA_VERSION) {
    issues.push(
      issue(
        "report_version",
        "invalid_type",
        `VetReport.report_version must equal ${VET_REPORT_SCHEMA_VERSION}.`
      )
    );
  }
  if (!isNonEmptyString(report?.task_id)) issues.push(issue("task_id", "invalid_type", "VetReport.task_id must be a non-empty string."));
  if (!isNonEmptyString(report?.file)) issues.push(issue("file", "invalid_type", "VetReport.file must be a non-empty string."));
  if (!isPlainObject(report?.review_scope)) {
    issues.push(issue("review_scope", "invalid_type", "VetReport.review_scope must be an object."));
  } else {
    if (!isNonEmptyString(report.review_scope.type)) {
      issues.push(issue("review_scope.type", "invalid_type", "VetReport.review_scope.type must be a non-empty string."));
    }
    if (!isNonEmptyString(report.review_scope.complexity)) {
      issues.push(issue("review_scope.complexity", "invalid_type", "VetReport.review_scope.complexity must be a non-empty string."));
    }
    if (!isStringArray(report.review_scope.tags)) {
      issues.push(issue("review_scope.tags", "invalid_type", "VetReport.review_scope.tags must be a string array."));
    }
    if (!isStringArray(report.review_scope.dimensions) || report.review_scope.dimensions.length === 0) {
      issues.push(issue("review_scope.dimensions", "invalid_type", "VetReport.review_scope.dimensions must be a non-empty string array."));
    } else {
      report.review_scope.dimensions.forEach((dimension, index) => {
        if (!REVIEW_DIMENSIONS.has(dimension)) {
          issues.push(
            issue(
              `review_scope.dimensions[${index}]`,
              "invalid_type",
              `VetReport.review_scope.dimensions[${index}] must be one of: ${[...REVIEW_DIMENSIONS].join(", ")}.`
            )
          );
        }
      });
    }
  }
  if (typeof report?.project_context_summary !== "string") {
    issues.push(issue("project_context_summary", "invalid_type", "VetReport.project_context_summary must be a string."));
  }
  if (!isPlainObject(report?.summary)) {
    issues.push(issue("summary", "invalid_type", "VetReport.summary must be an object."));
  } else {
    if (!isNonNegativeInteger(report.summary.blocking_count)) {
      issues.push(issue("summary.blocking_count", "invalid_type", "VetReport.summary.blocking_count must be a non-negative integer."));
    }
    if (!isNonNegativeInteger(report.summary.high_count)) {
      issues.push(issue("summary.high_count", "invalid_type", "VetReport.summary.high_count must be a non-negative integer."));
    }
    if (!isNonNegativeInteger(report.summary.warning_count)) {
      issues.push(issue("summary.warning_count", "invalid_type", "VetReport.summary.warning_count must be a non-negative integer."));
    }
    if (!SUMMARY_READINESS.has(report.summary.readiness)) {
      issues.push(
        issue(
          "summary.readiness",
          "invalid_type",
          `VetReport.summary.readiness must be one of: ${[...SUMMARY_READINESS].join(", ")}.`
        )
      );
    }
  }
  if (!Array.isArray(report?.findings)) {
    issues.push(issue("findings", "invalid_type", "VetReport.findings must be an array."));
  } else {
    report.findings.forEach((item, index) => {
      issues.push(...validateFindingShape(item, `findings[${index}]`));
    });
  }
  if (!isPlainObject(report?.findings_by_dimension)) {
    issues.push(issue("findings_by_dimension", "invalid_type", "VetReport.findings_by_dimension must be an object."));
  } else {
    for (const [dimension, dimensionFindings] of Object.entries(report.findings_by_dimension)) {
      if (!REVIEW_DIMENSIONS.has(dimension)) {
        issues.push(
          issue(
            `findings_by_dimension.${dimension}`,
            "invalid_type",
            `VetReport.findings_by_dimension keys must be one of: ${[...REVIEW_DIMENSIONS].join(", ")}.`
          )
        );
        continue;
      }
      if (!Array.isArray(dimensionFindings)) {
        issues.push(
          issue(
            `findings_by_dimension.${dimension}`,
            "invalid_type",
            `VetReport.findings_by_dimension.${dimension} must be an array.`
          )
        );
        continue;
      }
      dimensionFindings.forEach((item, index) => {
        issues.push(...validateFindingShape(item, `findings_by_dimension.${dimension}[${index}]`));
      });
    }
  }
  if (!Array.isArray(report?.dimension_summaries)) {
    issues.push(issue("dimension_summaries", "invalid_type", "VetReport.dimension_summaries must be an array."));
  } else {
    report.dimension_summaries.forEach((item, index) => {
      const base = `dimension_summaries[${index}]`;
      if (!isPlainObject(item)) {
        issues.push(issue(base, "invalid_type", `${base} must be an object.`));
        return;
      }
      if (!REVIEW_DIMENSIONS.has(item.dimension)) {
        issues.push(issue(`${base}.dimension`, "invalid_type", `${base}.dimension must be one of: ${[...REVIEW_DIMENSIONS].join(", ")}.`));
      }
      if (!isNonNegativeInteger(item.finding_count)) {
        issues.push(issue(`${base}.finding_count`, "invalid_type", `${base}.finding_count must be a non-negative integer.`));
      }
      if (!DIMENSION_STATUSES.has(item.status)) {
        issues.push(issue(`${base}.status`, "invalid_type", `${base}.status must be one of: ${[...DIMENSION_STATUSES].join(", ")}.`));
      }
    });
  }
  if (!isNonEmptyString(report?.review_range_statement)) {
    issues.push(issue("review_range_statement", "invalid_type", "VetReport.review_range_statement must be a non-empty string."));
  }
  if (!isNonEmptyString(report?.overall_evaluation)) {
    issues.push(issue("overall_evaluation", "invalid_type", "VetReport.overall_evaluation must be a non-empty string."));
  }
  if (!isPlainObject(report?.execution_readiness_breakdown)) {
    issues.push(issue("execution_readiness_breakdown", "invalid_type", "VetReport.execution_readiness_breakdown must be an object."));
  } else {
    if (typeof report.execution_readiness_breakdown.can_start_implementation !== "boolean") {
      issues.push(
        issue(
          "execution_readiness_breakdown.can_start_implementation",
          "invalid_type",
          "VetReport.execution_readiness_breakdown.can_start_implementation must be a boolean."
        )
      );
    }
    if (typeof report.execution_readiness_breakdown.should_revise_first !== "boolean") {
      issues.push(
        issue(
          "execution_readiness_breakdown.should_revise_first",
          "invalid_type",
          "VetReport.execution_readiness_breakdown.should_revise_first must be a boolean."
        )
      );
    }
    if (!isNonEmptyString(report.execution_readiness_breakdown.primary_risk_area)) {
      issues.push(
        issue(
          "execution_readiness_breakdown.primary_risk_area",
          "invalid_type",
          "VetReport.execution_readiness_breakdown.primary_risk_area must be a non-empty string."
        )
      );
    }
  }
  if (!isPlainObject(report?.improvement_priority)) {
    issues.push(issue("improvement_priority", "invalid_type", "VetReport.improvement_priority must be an object."));
  } else {
    for (const key of ["blockers", "high", "warning"]) {
      if (!Array.isArray(report.improvement_priority[key])) {
        issues.push(
          issue(
            `improvement_priority.${key}`,
            "invalid_type",
            `VetReport.improvement_priority.${key} must be an array.`
          )
        );
        continue;
      }
      report.improvement_priority[key].forEach((item, index) => {
        issues.push(...validateFindingShape(item, `improvement_priority.${key}[${index}]`));
      });
    }
    if (!isStringArray(report.improvement_priority.top_fixes)) {
      issues.push(
        issue(
          "improvement_priority.top_fixes",
          "invalid_type",
          "VetReport.improvement_priority.top_fixes must be a string array."
        )
      );
    }
  }
  if (!isStringArray(report?.issues_only_dimensions)) {
    issues.push(issue("issues_only_dimensions", "invalid_type", "VetReport.issues_only_dimensions must be a string array."));
  } else {
    report.issues_only_dimensions.forEach((dimension, index) => {
      if (!REVIEW_DIMENSIONS.has(dimension)) {
        issues.push(
          issue(
            `issues_only_dimensions[${index}]`,
            "invalid_type",
            `VetReport.issues_only_dimensions[${index}] must be one of: ${[...REVIEW_DIMENSIONS].join(", ")}.`
          )
        );
      }
    });
  }
  if (!isStringArray(report?.revision_targets)) {
    issues.push(issue("revision_targets", "invalid_type", "VetReport.revision_targets must be a string array."));
  }
  if (!isNonEmptyString(report?.recommended_next_action)) {
    issues.push(issue("recommended_next_action", "invalid_type", "VetReport.recommended_next_action must be a non-empty string."));
  }
  if (!Array.isArray(report?.next_step_options) || report.next_step_options.length === 0) {
    issues.push(issue("next_step_options", "invalid_type", "VetReport.next_step_options must be a non-empty array."));
  } else {
    report.next_step_options.forEach((item, index) => {
      const base = `next_step_options[${index}]`;
      if (!isPlainObject(item)) {
        issues.push(issue(base, "invalid_type", `${base} must be an object.`));
        return;
      }
      if (!isNonEmptyString(item.id)) {
        issues.push(issue(`${base}.id`, "invalid_type", `${base}.id must be a non-empty string.`));
      }
      if (!isNonEmptyString(item.label)) {
        issues.push(issue(`${base}.label`, "invalid_type", `${base}.label must be a non-empty string.`));
      }
      if (!NEXT_STEP_ACTIONS.has(item.action)) {
        issues.push(issue(`${base}.action`, "invalid_type", `${base}.action must be one of: ${[...NEXT_STEP_ACTIONS].join(", ")}.`));
      }
    });
  }
  if (!isNonEmptyString(report?.implementation_readiness)) {
    issues.push(issue("implementation_readiness", "invalid_type", "VetReport.implementation_readiness must be a non-empty string."));
  }

  return issues;
}

export class VetReportValidationError extends Error {
  constructor(issues, summary = "VetReport validation failed.") {
    super(summary);
    this.name = "VetReportValidationError";
    this.issues = issues;
  }
}

export function assertValidVetReport(report) {
  const issues = validateVetReportShape(report);
  if (issues.length > 0) {
    throw new VetReportValidationError(issues);
  }
}
