#!/usr/bin/env node

import process from "node:process";
import { selectCodexSessions } from "./_lingxi-codex-session-select.mjs";

function parseArgs(argv) {
  const args = {
    projectRoot: null,
    sessionsRoot: null,
    limit: 20,
    sinceHours: 6
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--project-root") {
      args.projectRoot = argv[index + 1] || null;
      index += 1;
      continue;
    }
    if (arg === "--sessions-root") {
      args.sessionsRoot = argv[index + 1] || null;
      index += 1;
      continue;
    }
    if (arg === "--limit") {
      args.limit = Number(argv[index + 1] || "20");
      index += 1;
      continue;
    }
    if (arg === "--since-hours") {
      args.sinceHours = Number(argv[index + 1] || "6");
      index += 1;
    }
  }

  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = selectCodexSessions(args.projectRoot, args);
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}

main();
