#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function runNodeScript(relativePath) {
  const scriptPath = path.join(repoRoot, relativePath);
  const result = spawnSync(process.execPath, [scriptPath], {
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
  const setup = runNodeScript("scripts/lingxi-setup.mjs");
  const automation = runNodeScript("scripts/lx-create-automation.mjs");

  process.stdout.write(JSON.stringify({
    operation: "bootstrapped",
    project_root: setup.target_root,
    memory_loop_ready: true,
    setup,
    automation
  }, null, 2) + "\n");
}

main();
