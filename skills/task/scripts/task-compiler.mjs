import fs from "node:fs";
import path from "node:path";
import {
  findTaskFile,
  incrementVersion,
  parseTaskDocument,
  renderTaskDocument,
  slugify,
  tasksDir
} from "../../../scripts/_lingxi-memory.mjs";

function normalizedUnique(items) {
  return [...new Set((items || []).map((item) => String(item || "").trim()).filter(Boolean))];
}

function compiledAcceptanceCriteria(taskSpec) {
  if (Array.isArray(taskSpec.acceptance_criteria) && taskSpec.acceptance_criteria.length > 0) {
    return normalizedUnique(taskSpec.acceptance_criteria);
  }
  if (Array.isArray(taskSpec.success_criteria) && taskSpec.success_criteria.length > 0) {
    return normalizedUnique(taskSpec.success_criteria);
  }
  return normalizedUnique(
    (taskSpec.functional_requirements || []).flatMap((req) => req.acceptance_criteria || [])
  );
}

export function compileTaskDocument(projectRoot, taskSpec) {
  const taskId = taskSpec.task_id || taskSpec.id;
  let file = findTaskFile(projectRoot, taskId);
  const operation = file ? "updated" : "created";
  let existing = null;

  if (file) {
    existing = parseTaskDocument(fs.readFileSync(file, "utf8"), file);
  }
  if (!file) {
    file = path.join(tasksDir(projectRoot), `${taskId}.task.${slugify(taskSpec.title)}.md`);
  }

  const shouldAppendChangeLog =
    operation === "updated" &&
    taskSpec.change_source === "vet" &&
    taskSpec.change_trigger &&
    taskSpec.change_summary;
  const changelog = shouldAppendChangeLog
    ? [
        {
          date: new Date().toISOString().slice(0, 10),
          source: taskSpec.change_source,
          trigger: taskSpec.change_trigger,
          summary: taskSpec.change_summary,
          related: taskSpec.change_related || ""
        },
        ...(existing?.changelog || [])
      ]
    : existing?.changelog || taskSpec.changelog;

  const document = renderTaskDocument({
    ...taskSpec,
    acceptance_criteria: compiledAcceptanceCriteria(taskSpec),
    id: taskId,
    version: shouldAppendChangeLog ? incrementVersion(existing?.version || "1.0") : existing?.version || "1.0",
    status: existing?.status || "草稿",
    created_at: existing?.created_at || new Date().toISOString().slice(0, 10),
    changelog
  });

  return {
    operation,
    task_id: taskId,
    file,
    document
  };
}
