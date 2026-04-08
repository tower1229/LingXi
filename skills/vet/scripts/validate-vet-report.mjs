#!/usr/bin/env node

import process from "node:process";
import {
  VET_REPORT_SCHEMA_VERSION,
  buildVetReportValidationReport
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
  const payload = buildVetReportValidationReport(report);
  process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
  if (!payload.ok) {
    process.exit(1);
  }
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
