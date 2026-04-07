#!/usr/bin/env node

import fs from "node:fs";
import process from "node:process";
import {
  findTaskFile,
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

function vetTask(task) {
  const findings = [];

  if (!task.goal || task.goal.length < 12) {
    findings.push(finding("blocking", "goal_missing_or_weak", "Goal is missing or too weak to guide implementation.", "Goal"));
  }
  if (task.scope.length === 0) {
    findings.push(finding("blocking", "scope_missing", "Scope is missing.", "Scope"));
  }
  if (task.acceptance_criteria.length === 0) {
    findings.push(finding("blocking", "acceptance_missing", "Acceptance criteria are missing.", "Acceptance Criteria"));
  }
  if (task.constraints.length === 0) {
    findings.push(finding("warning", "constraints_missing", "Constraints are empty. This often hides assumptions that should be explicit.", "Constraints"));
  }
  if (task.scope.length > 8) {
    findings.push(finding("warning", "scope_too_broad", "Scope appears broad enough that the task may need to be split.", "Scope"));
  }
  if (hasAmbiguousLanguage(task.goal)) {
    findings.push(finding("warning", "goal_ambiguous", "Goal uses ambiguous language without measurable detail.", "Goal"));
  }
  for (const criterion of task.acceptance_criteria) {
    if (hasAmbiguousLanguage(criterion)) {
      findings.push(finding("warning", "acceptance_ambiguous", "Acceptance criterion uses ambiguous language without measurable detail.", "Acceptance Criteria"));
      break;
    }
  }

  return {
    findings,
    summary: {
      blocking_count: findings.filter((item) => item.severity === "blocking").length,
      warning_count: findings.filter((item) => item.severity === "warning").length
    }
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectRoot = resolveProjectRoot();
  let file = normalizeText(args.taskPath);
  if (!file) {
    const taskId = normalizeText(args.taskId);
    if (!taskId) {
      throw new Error("Provide --task-id or --task-path");
    }
    file = findTaskFile(projectRoot, taskId);
    if (!file) {
      throw new Error(`Task file not found for id ${taskId}`);
    }
  }

  const task = parseTaskDocument(fs.readFileSync(file, "utf8"), file);
  const result = vetTask(task);
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
