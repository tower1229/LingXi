#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { normalizeText, resolveProjectRoot } from "./_lingxi-memory.mjs";
import { selectCodexSessions } from "./_lingxi-codex-session-select.mjs";
import { selectClaudeSessions } from "./_lingxi-claude-session-select.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const defaultWorkerScriptPath = path.join(repoRoot, "skills", "session-distill", "scripts", "distill-session.mjs");

function detectHost() {
  if (normalizeText(process.env.CLAUDE_PROJECT_DIR)) return "claude";
  return "codex";
}

function parseArgs(argv) {
  const args = {
    projectRoot: null,
    sessionsRoot: null,
    host: null,
    limit: 20,
    sinceHours: 6,
    force: false,
    lockFile: null
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
    if (arg === "--host") {
      args.host = argv[index + 1] || null;
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
      continue;
    }
    if (arg === "--force") {
      args.force = true;
    }
    if (arg === "--lock-file") {
      args.lockFile = argv[index + 1] || null;
      index += 1;
    }
  }

  return args;
}

function distillWorkerScriptPath() {
  return path.resolve(process.env.LINGXI_DISTILL_WORKER_SCRIPT || defaultWorkerScriptPath);
}

function runSingleDistill(scriptPath, projectRoot, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: repoRoot,
      env: { ...process.env, LINGXI_PROJECT_ROOT: projectRoot },
      stdio: ["pipe", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data) => {
      stdout += data;
    });
    child.stderr.on("data", (data) => {
      stderr += data;
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
    child.stdin.write(JSON.stringify(input));
    child.stdin.end();
  });
}

function summarizeProcessed(results) {
  const summary = {
    processed_count: results.length,
    written_count: 0,
    merged_count: 0,
    skipped_count: 0,
    failed_count: 0
  };

  for (const result of results) {
    if (result.operation === "written") summary.written_count += 1;
    else if (result.operation === "merged") summary.merged_count += 1;
    else if (String(result.operation || "").startsWith("skipped")) summary.skipped_count += 1;
    else if (result.operation === "failed") summary.failed_count += 1;
  }

  return summary;
}

function selectSessions(host, projectRoot, args) {
  if (host === "claude") {
    return selectClaudeSessions(projectRoot, args);
  }
  return selectCodexSessions(projectRoot, args);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const host = args.host || detectHost();
  const projectRoot = resolveProjectRoot(args.projectRoot);

  if (args.lockFile) {
    fs.writeFileSync(args.lockFile, JSON.stringify({ pid: process.pid, started_at: Date.now() }));
  }

  try {
    const selection = selectSessions(host, projectRoot, args);
    const workerScriptPath = distillWorkerScriptPath();
    const results = [];

    for (const session of selection.selected) {
      const input = {
        session_id: session.session_id,
        messages: session.messages
      };
      if (args.force) {
        input.force = true;
      }

      try {
        const result = await runSingleDistill(workerScriptPath, projectRoot, input);
        if (result.code !== 0) {
          results.push({
            operation: "failed",
            session_id: session.session_id,
            source_path: session.source_path,
            error: (result.stderr || result.stdout || "distill worker failed").trim()
          });
          continue;
        }

        const parsed = JSON.parse(result.stdout);
        results.push({
          ...parsed,
          source_path: session.source_path
        });
      } catch (error) {
        results.push({
          operation: "failed",
          session_id: session.session_id,
          source_path: session.source_path,
          error: String(error.message || error)
        });
      }
    }

    const processedSummary = summarizeProcessed(results);
    process.stdout.write(JSON.stringify({
      operation: "distill_scan_completed",
      host,
      selected_count: selection.selected.length,
      processed_count: processedSummary.processed_count,
      written_count: processedSummary.written_count,
      merged_count: processedSummary.merged_count,
      skipped_count: processedSummary.skipped_count,
      failed_count: processedSummary.failed_count,
      selection,
      results
    }, null, 2) + "\n");
  } finally {
    if (args.lockFile) {
      try { fs.unlinkSync(args.lockFile); } catch {}
    }
  }
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
