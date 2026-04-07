#!/usr/bin/env node

import process from "node:process";
import {
  VET_REPORT_SCHEMA_VERSION,
  validateVetReportShape
} from "./vet-report.mjs";

async function readJsonStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) {
    throw new Error("Expected VetReport JSON on stdin.");
  }
  return JSON.parse(raw);
}

async function main() {
  const report = await readJsonStdin();
  const issues = validateVetReportShape(report);
  const payload = {
    ok: issues.length === 0,
    validator: "vet_report",
    schema_version: VET_REPORT_SCHEMA_VERSION,
    issue_count: issues.length,
    issues
  };
  process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
  if (issues.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
