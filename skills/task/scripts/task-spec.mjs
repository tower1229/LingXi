export const TASK_SPEC_SCHEMA_VERSION = "draft-2026-04-07";

export const TASK_SPEC_REQUIRED_FIELDS = [
  "schema_version",
  "title",
  "type",
  "complexity",
  "project_context",
  "background",
  "problem",
  "solution_overview",
  "goals",
  "non_goals",
  "success_criteria",
  "user_stories",
  "functional_requirements",
  "constraints",
  "memory_refs",
  "open_questions",
  "confidence"
];

const ALLOWED_VERIFICATION_METHODS = new Set(["unit", "integration", "e2e", "manual", "rubric"]);
const ALLOWED_PRIORITIES = new Set(["必须", "应该", "可选"]);
const ALLOWED_PROJECT_CONTEXT_KINDS = new Set(["docs", "frontend", "backend", "mixed", "unknown"]);

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
  return Array.isArray(value) && value.every((item) => isNonEmptyString(item));
}

function isLooseStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function validateProjectContextShape(projectContext) {
  const issues = [];
  if (projectContext === null) {
    return issues;
  }
  if (!isPlainObject(projectContext)) {
    issues.push(issue("project_context", "invalid_type", "TaskSpec.project_context must be an object or null."));
    return issues;
  }
  if (!ALLOWED_PROJECT_CONTEXT_KINDS.has(projectContext.kind)) {
    issues.push(
      issue(
        "project_context.kind",
        "invalid_type",
        `TaskSpec.project_context.kind must be one of: ${[...ALLOWED_PROJECT_CONTEXT_KINDS].join(", ")}.`
      )
    );
  }
  if (!isLooseStringArray(projectContext.stack)) {
    issues.push(issue("project_context.stack", "invalid_type", "TaskSpec.project_context.stack must be a string array."));
  }
  if (!isLooseStringArray(projectContext.cues)) {
    issues.push(issue("project_context.cues", "invalid_type", "TaskSpec.project_context.cues must be a string array."));
  }
  if (typeof projectContext.summary !== "string") {
    issues.push(issue("project_context.summary", "invalid_type", "TaskSpec.project_context.summary must be a string."));
  }
  if (typeof projectContext.impact !== "string") {
    issues.push(issue("project_context.impact", "invalid_type", "TaskSpec.project_context.impact must be a string."));
  }
  for (const key of ["frontend_strength", "backend_strength", "docs_strength"]) {
    if (!Number.isInteger(projectContext[key]) || projectContext[key] < 0) {
      issues.push(
        issue(
          `project_context.${key}`,
          "invalid_type",
          `TaskSpec.project_context.${key} must be a non-negative integer.`
        )
      );
    }
  }
  return issues;
}

function validateUserStoryShape(story, index) {
  const issues = [];
  const base = `user_stories[${index}]`;
  if (!isPlainObject(story)) {
    issues.push(issue(base, "invalid_type", `${base} must be an object.`));
    return issues;
  }
  if (!isNonEmptyString(story?.as_a)) issues.push(issue(`${base}.as_a`, "missing_field", "User story must include as_a."));
  if (!isNonEmptyString(story?.i_want)) issues.push(issue(`${base}.i_want`, "missing_field", "User story must include i_want."));
  if (!isNonEmptyString(story?.so_that)) issues.push(issue(`${base}.so_that`, "missing_field", "User story must include so_that."));
  if (!isStringArray(story?.acceptance_criteria) || story.acceptance_criteria.length === 0) {
    issues.push(issue(`${base}.acceptance_criteria`, "missing_field", "User story must include acceptance_criteria[]."));
  }
  return issues;
}

function validateFunctionalRequirementShape(req, index) {
  const issues = [];
  const base = `functional_requirements[${index}]`;
  if (!isPlainObject(req)) {
    issues.push(issue(base, "invalid_type", `${base} must be an object.`));
    return issues;
  }
  if (!isNonEmptyString(req?.id)) issues.push(issue(`${base}.id`, "missing_field", "Functional requirement must include id."));
  if (!isNonEmptyString(req?.title)) issues.push(issue(`${base}.title`, "missing_field", "Functional requirement must include title."));
  if (!isNonEmptyString(req?.description)) issues.push(issue(`${base}.description`, "missing_field", "Functional requirement must include description."));
  if (!isNonEmptyString(req?.implementation_scheme)) {
    issues.push(issue(`${base}.implementation_scheme`, "missing_field", "Functional requirement must include implementation_scheme."));
  }
  if (!isStringArray(req?.acceptance_criteria) || req.acceptance_criteria.length === 0) {
    issues.push(issue(`${base}.acceptance_criteria`, "missing_field", "Functional requirement must include acceptance_criteria[]."));
  }
  if (!isNonEmptyString(req?.verification_method)) {
    issues.push(issue(`${base}.verification_method`, "missing_field", "Functional requirement must include verification_method."));
  } else if (!ALLOWED_VERIFICATION_METHODS.has(req.verification_method)) {
    issues.push(
      issue(
        `${base}.verification_method`,
        "invalid_type",
        `Functional requirement verification_method must be one of: ${[...ALLOWED_VERIFICATION_METHODS].join(", ")}.`
      )
    );
  }
  if (!isStringArray(req?.edge_cases) || req.edge_cases.length === 0) {
    issues.push(issue(`${base}.edge_cases`, "missing_field", "Functional requirement must include edge_cases[]."));
  }
  if (!isNonEmptyString(req?.evidence)) issues.push(issue(`${base}.evidence`, "missing_field", "Functional requirement must include evidence."));
  if (!isNonEmptyString(req?.priority)) {
    issues.push(issue(`${base}.priority`, "missing_field", "Functional requirement must include priority."));
  } else if (!ALLOWED_PRIORITIES.has(req.priority)) {
    issues.push(
      issue(
        `${base}.priority`,
        "invalid_type",
        `Functional requirement priority must be one of: ${[...ALLOWED_PRIORITIES].join(", ")}.`
      )
    );
  }
  return issues;
}

export function validateTaskSpecShape(spec) {
  const issues = [];

  for (const field of TASK_SPEC_REQUIRED_FIELDS) {
    if (!(field in (spec || {}))) {
      issues.push(issue(field, "missing_field", `TaskSpec is missing required field: ${field}.`));
    }
  }

  if (spec?.schema_version !== TASK_SPEC_SCHEMA_VERSION) {
    issues.push(
      issue(
        "schema_version",
        "invalid_type",
        `TaskSpec.schema_version must equal ${TASK_SPEC_SCHEMA_VERSION}.`
      )
    );
  }
  if (!isNonEmptyString(spec?.title)) issues.push(issue("title", "invalid_type", "TaskSpec.title must be a non-empty string."));
  if (!isNonEmptyString(spec?.type)) issues.push(issue("type", "invalid_type", "TaskSpec.type must be a non-empty string."));
  if (!isNonEmptyString(spec?.complexity)) issues.push(issue("complexity", "invalid_type", "TaskSpec.complexity must be a non-empty string."));
  issues.push(...validateProjectContextShape(spec?.project_context));
  if (!isNonEmptyString(spec?.background)) issues.push(issue("background", "invalid_type", "TaskSpec.background must be a non-empty string."));
  if (!isNonEmptyString(spec?.problem)) issues.push(issue("problem", "invalid_type", "TaskSpec.problem must be a non-empty string."));
  if (!isNonEmptyString(spec?.solution_overview)) {
    issues.push(issue("solution_overview", "invalid_type", "TaskSpec.solution_overview must be a non-empty string."));
  }
  if (!isStringArray(spec?.goals) || spec.goals.length === 0) issues.push(issue("goals", "invalid_type", "TaskSpec.goals must be a non-empty string array."));
  if (!isStringArray(spec?.non_goals) || spec.non_goals.length === 0) issues.push(issue("non_goals", "invalid_type", "TaskSpec.non_goals must be a non-empty string array."));
  if (!isStringArray(spec?.success_criteria) || spec.success_criteria.length === 0) {
    issues.push(issue("success_criteria", "invalid_type", "TaskSpec.success_criteria must be a non-empty string array."));
  }
  if (!Array.isArray(spec?.user_stories) || spec.user_stories.length === 0) {
    issues.push(issue("user_stories", "invalid_type", "TaskSpec.user_stories must be a non-empty array."));
  } else {
    spec.user_stories.forEach((story, index) => {
      issues.push(...validateUserStoryShape(story, index));
    });
  }
  if (!Array.isArray(spec?.functional_requirements) || spec.functional_requirements.length === 0) {
    issues.push(issue("functional_requirements", "invalid_type", "TaskSpec.functional_requirements must be a non-empty array."));
  } else {
    spec.functional_requirements.forEach((req, index) => {
      issues.push(...validateFunctionalRequirementShape(req, index));
    });
  }
  if (!isStringArray(spec?.constraints) || spec.constraints.length === 0) {
    issues.push(issue("constraints", "invalid_type", "TaskSpec.constraints must be a non-empty string array."));
  }
  if (!isLooseStringArray(spec?.memory_refs)) issues.push(issue("memory_refs", "invalid_type", "TaskSpec.memory_refs must be a string array."));
  if (!isLooseStringArray(spec?.open_questions)) issues.push(issue("open_questions", "invalid_type", "TaskSpec.open_questions must be a string array."));
  if (typeof spec?.confidence !== "number" || Number.isNaN(spec.confidence) || spec.confidence < 0 || spec.confidence > 1) {
    issues.push(issue("confidence", "invalid_type", "TaskSpec.confidence must be a number between 0 and 1."));
  }
  if ("goal" in (spec || {}) && !isNonEmptyString(spec.goal)) {
    issues.push(issue("goal", "invalid_type", "TaskSpec.goal must be a non-empty string when provided."));
  }
  if ("scope" in (spec || {}) && !isStringArray(spec.scope)) {
    issues.push(issue("scope", "invalid_type", "TaskSpec.scope must be a non-empty string array when provided."));
  }
  if ("acceptance_criteria" in (spec || {}) && !isStringArray(spec.acceptance_criteria)) {
    issues.push(
      issue(
        "acceptance_criteria",
        "invalid_type",
        "TaskSpec.acceptance_criteria must be a non-empty string array when provided."
      )
    );
  }
  if ("task_id" in (spec || {}) && spec.task_id !== "" && !isNonEmptyString(spec.task_id)) {
    issues.push(issue("task_id", "invalid_type", "TaskSpec.task_id must be a non-empty string when provided."));
  }
  if ("tags" in (spec || {}) && !isLooseStringArray(spec.tags)) {
    issues.push(issue("tags", "invalid_type", "TaskSpec.tags must be a string array when provided."));
  }

  return issues;
}

export function buildTaskSpecValidationReport(spec) {
  const issues = validateTaskSpecShape(spec);
  return {
    ok: issues.length === 0,
    validator: "task_spec",
    schema_version: TASK_SPEC_SCHEMA_VERSION,
    issue_count: issues.length,
    issues
  };
}

export class TaskSpecValidationError extends Error {
  constructor(issues, summary = "TaskSpec validation failed.") {
    super(summary);
    this.name = "TaskSpecValidationError";
    this.issues = issues;
  }
}

export function assertValidTaskSpec(spec) {
  const issues = validateTaskSpecShape(spec);
  if (issues.length > 0) {
    throw new TaskSpecValidationError(issues);
  }
}

export function coerceTaskSpecValidationError(error) {
  if (error instanceof TaskSpecValidationError) {
    return error;
  }

  const message = String(error?.message || "TaskSpec validation failed.").trim();
  const issueLines = message.startsWith("Task input is not ready:")
    ? message
        .split("\n")
        .slice(1)
        .map((line) => line.replace(/^\s*-\s*/, "").trim())
        .filter(Boolean)
    : [message];
  const issues = issueLines.map((item, index) =>
    issue(`task_spec.issue_${index + 1}`, "validation_error", item)
  );
  return new TaskSpecValidationError(issues, message);
}

export function renderTaskSpecValidationFailure(error) {
  return {
    quality_gate: "not_ready",
    error_type: "task_spec_invalid",
    schema_version: TASK_SPEC_SCHEMA_VERSION,
    validator: "task_spec",
    message: error.message,
    issue_count: error.issues.length,
    issues: error.issues,
    suggested_next_action: "Revise the task input or repaired TaskSpec, then rerun task generation."
  };
}
