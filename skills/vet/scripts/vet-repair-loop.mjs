#!/usr/bin/env node

import process from "node:process";
import {
  VET_REPORT_SCHEMA_VERSION,
  buildVetReportValidationReport
} from "./vet-report.mjs";

const VET_REPAIR_LOOP_VERSION = "draft-2026-04-07";

async function readJsonStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) {
    throw new Error("Expected vet repair-loop JSON on stdin.");
  }
  return JSON.parse(raw);
}

async function main() {
  const payload = await readJsonStdin();
  const initialReport = payload.initial_report || payload;
  const repairedReport = payload.repaired_report || null;
  const initialValidation = buildVetReportValidationReport(initialReport);

  if (initialValidation.ok) {
    process.stdout.write(
      JSON.stringify(
        {
          loop_version: VET_REPAIR_LOOP_VERSION,
          report_version: VET_REPORT_SCHEMA_VERSION,
          status: "accepted",
          phase: "initial",
          initial_validation: initialValidation,
          validated_report: initialReport
        },
        null,
        2
      ) + "\n"
    );
    return;
  }

  if (!repairedReport) {
    process.stdout.write(
      JSON.stringify(
        {
          loop_version: VET_REPAIR_LOOP_VERSION,
          report_version: VET_REPORT_SCHEMA_VERSION,
          status: "needs_repair",
          phase: "initial",
          initial_validation: initialValidation,
          suggested_next_action: "Provide repaired_report and rerun the vet repair loop."
        },
        null,
        2
      ) + "\n"
    );
    return;
  }

  const repairValidation = buildVetReportValidationReport(repairedReport);
  if (!repairValidation.ok) {
    process.stdout.write(
      JSON.stringify(
        {
          loop_version: VET_REPAIR_LOOP_VERSION,
          report_version: VET_REPORT_SCHEMA_VERSION,
          status: "repair_failed",
          phase: "repair",
          initial_validation: initialValidation,
          repair_validation: repairValidation,
          suggested_next_action: "Repair the VetReport again until the validator returns ok=true."
        },
        null,
        2
      ) + "\n"
    );
    return;
  }

  process.stdout.write(
    JSON.stringify(
      {
        loop_version: VET_REPAIR_LOOP_VERSION,
        report_version: VET_REPORT_SCHEMA_VERSION,
        status: "accepted",
        phase: "repair",
        initial_validation: initialValidation,
        repair_validation: repairValidation,
        validated_report: repairedReport
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
