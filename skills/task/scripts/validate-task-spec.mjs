#!/usr/bin/env node

import process from "node:process";
import {
  buildTaskSpecValidationReport
} from "./task-spec.mjs";

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
  const spec = await readJsonStdin();
  const payload = buildTaskSpecValidationReport(spec);
  process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
  if (!payload.ok) {
    process.exit(1);
  }
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
