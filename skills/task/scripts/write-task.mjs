#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  ensureLingxiLayout,
  findTaskFile,
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

function validateInput(input) {
  if (!normalizeText(input.title)) throw new Error("Missing required field: title");
  if (!normalizeText(input.goal)) throw new Error("Missing required field: goal");
  return {
    title: normalizeText(input.title),
    goal: normalizeText(input.goal),
    scope: normalizeList(input.scope, "scope"),
    constraints: normalizeList(input.constraints, "constraints"),
    acceptance_criteria: normalizeList(input.acceptance_criteria, "acceptance_criteria"),
    memory_refs: Array.isArray(input.memory_refs)
      ? input.memory_refs.map((item) => normalizeText(item)).filter(Boolean)
      : [],
    task_id: input.task_id ? normalizeText(input.task_id) : ""
  };
}

async function main() {
  const projectRoot = resolveProjectRoot();
  ensureLingxiLayout(projectRoot);
  const input = validateInput(await readJsonStdin());

  const taskId = input.task_id || nextTaskId(projectRoot);
  let file = findTaskFile(projectRoot, taskId);
  const operation = file ? "updated" : "created";
  if (!file) {
    file = path.join(tasksDir(projectRoot), `${taskId}.task.${slugify(input.title)}.md`);
  }

  const document = renderTaskDocument({
    ...input,
    id: taskId
  });
  fs.writeFileSync(file, document, "utf8");

  process.stdout.write(
    JSON.stringify(
      {
        operation,
        task_id: taskId,
        file
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
