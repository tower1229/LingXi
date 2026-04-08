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
  buildTaskSpecValidationReport
} from "./task-spec.mjs";
import { compileTaskDocument } from "./task-compiler.mjs";

const TASK_REPAIR_LOOP_VERSION = "draft-2026-04-07";

async function readJsonStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) {
    throw new Error("Expected repair-loop JSON on stdin.");
  }
  return JSON.parse(raw);
}

function compileAndPersist(projectRoot, spec) {
  const compilation = compileTaskDocument(projectRoot, {
    ...spec,
    task_id: spec.task_id || spec.id || nextTaskId(projectRoot)
  });
  fs.writeFileSync(compilation.file, compilation.document, "utf8");
  return compilation;
}

async function main() {
  const payload = await readJsonStdin();
  const projectRoot = resolveProjectRoot();
  ensureLingxiLayout(projectRoot);

  const initialSpec = payload.initial_spec || payload;
  const repairedSpec = payload.repaired_spec || null;
  const initialValidation = buildTaskSpecValidationReport(initialSpec);

  if (initialValidation.ok) {
    const compilation = compileAndPersist(projectRoot, initialSpec);
    process.stdout.write(
      JSON.stringify(
        {
          loop_version: TASK_REPAIR_LOOP_VERSION,
          task_spec_version: TASK_SPEC_SCHEMA_VERSION,
          status: "compiled",
          phase: "initial",
          initial_validation: initialValidation,
          compiled_task: {
            operation: compilation.operation,
            task_id: compilation.task_id,
            file: compilation.file
          }
        },
        null,
        2
      ) + "\n"
    );
    return;
  }

  if (!repairedSpec) {
    process.stdout.write(
      JSON.stringify(
        {
          loop_version: TASK_REPAIR_LOOP_VERSION,
          task_spec_version: TASK_SPEC_SCHEMA_VERSION,
          status: "needs_repair",
          phase: "initial",
          initial_validation: initialValidation,
          suggested_next_action: "Provide repaired_spec and rerun the repair loop."
        },
        null,
        2
      ) + "\n"
    );
    return;
  }

  const repairValidation = buildTaskSpecValidationReport(repairedSpec);
  if (!repairValidation.ok) {
    process.stdout.write(
      JSON.stringify(
        {
          loop_version: TASK_REPAIR_LOOP_VERSION,
          task_spec_version: TASK_SPEC_SCHEMA_VERSION,
          status: "repair_failed",
          phase: "repair",
          initial_validation: initialValidation,
          repair_validation: repairValidation,
          suggested_next_action: "Repair the TaskSpec again until the validator returns ok=true."
        },
        null,
        2
      ) + "\n"
    );
    return;
  }

  const compilation = compileAndPersist(projectRoot, repairedSpec);
  process.stdout.write(
    JSON.stringify(
      {
        loop_version: TASK_REPAIR_LOOP_VERSION,
        task_spec_version: TASK_SPEC_SCHEMA_VERSION,
        status: "compiled",
        phase: "repair",
        initial_validation: initialValidation,
        repair_validation: repairValidation,
        compiled_task: {
          operation: compilation.operation,
          task_id: compilation.task_id,
          file: compilation.file
        }
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
