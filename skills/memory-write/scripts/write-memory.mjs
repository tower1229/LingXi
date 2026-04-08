#!/usr/bin/env node

import process from "node:process";
import {
  resolveProjectRoot,
  upsertMemoryNote
} from "../../../scripts/_lingxi-memory.mjs";

function parseArgs(argv) {
  const args = { projectRoot: null, scope: "project" };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--project-root") {
      args.projectRoot = argv[i + 1] || null;
      i += 1;
      continue;
    }
    if (arg === "--scope") {
      args.scope = argv[i + 1] || "project";
      i += 1;
    }
  }
  return args;
}

async function readJsonStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) {
    throw new Error("Expected JSON payload on stdin.");
  }
  return JSON.parse(raw);
}

function validateInput(input) {
  const required = ["title", "kind", "one_liner", "decision", "source"];
  for (const key of required) {
    if (!String(input[key] || "").trim()) {
      throw new Error(`Missing required field: ${key}`);
    }
  }
  if (!Array.isArray(input.when_to_load) || input.when_to_load.length === 0) {
    throw new Error("Missing required field: when_to_load[]");
  }
  if (!Array.isArray(input.evidence)) {
    throw new Error("Missing required field: evidence[]");
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectRoot = resolveProjectRoot(args.projectRoot);
  const input = await readJsonStdin();
  validateInput(input);
  const scope = args.scope === "share" ? "share" : "project";
  const result = upsertMemoryNote(projectRoot, input, scope);
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
