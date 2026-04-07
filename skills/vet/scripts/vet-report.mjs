export const VET_REPORT_SCHEMA_VERSION = "draft-2026-04-07";

export const VET_REPORT_REQUIRED_FIELDS = [
  "task_id",
  "file",
  "review_scope",
  "project_context_summary",
  "summary",
  "findings",
  "findings_by_dimension",
  "dimension_summaries",
  "improvement_priority",
  "recommended_next_action",
  "implementation_readiness"
];

function issue(path, code, message) {
  return { path, code, message };
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
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

  if (!isNonEmptyString(report?.task_id)) issues.push(issue("task_id", "invalid_type", "VetReport.task_id must be a non-empty string."));
  if (!isNonEmptyString(report?.file)) issues.push(issue("file", "invalid_type", "VetReport.file must be a non-empty string."));
  if (!report?.review_scope || typeof report.review_scope !== "object") {
    issues.push(issue("review_scope", "invalid_type", "VetReport.review_scope must be an object."));
  }
  if (typeof report?.project_context_summary !== "string") {
    issues.push(issue("project_context_summary", "invalid_type", "VetReport.project_context_summary must be a string."));
  }
  if (!report?.summary || typeof report.summary !== "object") {
    issues.push(issue("summary", "invalid_type", "VetReport.summary must be an object."));
  }
  if (!Array.isArray(report?.findings)) issues.push(issue("findings", "invalid_type", "VetReport.findings must be an array."));
  if (!report?.findings_by_dimension || typeof report.findings_by_dimension !== "object") {
    issues.push(issue("findings_by_dimension", "invalid_type", "VetReport.findings_by_dimension must be an object."));
  }
  if (!Array.isArray(report?.dimension_summaries)) {
    issues.push(issue("dimension_summaries", "invalid_type", "VetReport.dimension_summaries must be an array."));
  }
  if (!report?.improvement_priority || typeof report.improvement_priority !== "object") {
    issues.push(issue("improvement_priority", "invalid_type", "VetReport.improvement_priority must be an object."));
  }
  if (!isNonEmptyString(report?.recommended_next_action)) {
    issues.push(issue("recommended_next_action", "invalid_type", "VetReport.recommended_next_action must be a non-empty string."));
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
