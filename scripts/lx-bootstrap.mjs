#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const args = { host: "all" };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--host" && argv[i + 1]) {
      args.host = argv[i + 1];
      i++;
    }
  }
  return args;
}

function runNodeScript(relativePath, extraArgs = []) {
  const scriptPath = path.join(repoRoot, relativePath);
  const result = spawnSync(process.execPath, [scriptPath, ...extraArgs], {
    cwd: repoRoot,
    env: process.env,
    encoding: "utf8"
  });

  if (result.status !== 0) {
    if (result.stdout) {
      process.stdout.write(result.stdout);
    }
    if (result.stderr) {
      process.stderr.write(result.stderr);
    }
    process.exit(result.status ?? 1);
  }

  return JSON.parse(result.stdout);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const setup = runNodeScript("scripts/lingxi-setup.mjs", ["--host", args.host]);

  // Codex automation registration only applies when Codex adapter is enabled
  const codexEnabled = args.host === "codex" || args.host === "all";
  const automation = codexEnabled ? runNodeScript("scripts/lx-create-automation.mjs") : null;

  process.stdout.write(JSON.stringify({
    operation: "bootstrapped",
    project_root: setup.target_root,
    host: setup.host,
    memory_loop_ready: true,
    setup,
    ...(automation ? { automation } : {})
  }, null, 2) + "\n");
}

main();
