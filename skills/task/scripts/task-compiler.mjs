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
