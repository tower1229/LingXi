#!/usr/bin/env node

import process from "node:process";
import { latestTaskId, resolveProjectRoot } from "../../../scripts/_lingxi-memory.mjs";

const taskId = latestTaskId(resolveProjectRoot());
if (!taskId) {
  process.stderr.write("No existing LingXi task found.\n");
  process.exit(1);
}
process.stdout.write(`${taskId}\n`);
