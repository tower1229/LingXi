#!/usr/bin/env node

import fs from "node:fs";
import process from "node:process";
import {
  ensureLingxiLayout,
  nextTaskId,
  resolveProjectRoot
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
    throw new Error("Expected TaskSpec JSON on stdin.");
  }
  return JSON.parse(raw);
}

async function main() {
  const projectRoot = resolveProjectRoot();
  ensureLingxiLayout(projectRoot);
  const taskSpec = await readJsonStdin();
  assertValidTaskSpec(taskSpec);
  const compilation = compileTaskDocument(projectRoot, {
    ...taskSpec,
    task_id: taskSpec.task_id || taskSpec.id || nextTaskId(projectRoot)
  });
  fs.writeFileSync(compilation.file, compilation.document, "utf8");
  process.stdout.write(
    JSON.stringify(
      {
        operation: compilation.operation,
        task_id: compilation.task_id,
        file: compilation.file,
        task_spec_version: TASK_SPEC_SCHEMA_VERSION,
        quality_gate: "ready"
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
