#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  appendMemoryOpsLog,
  buildConversationMemoryBrief,
  normalizeText,
  resolveProjectRoot,
  shouldTriggerBackgroundDistill
} from "./_lingxi-memory.mjs";

const isClaudeHost = Boolean(process.env.CLAUDE_PROJECT_DIR);

function resolveProjectRootSafe() {
  try {
    return resolveProjectRoot(
      process.env.CLAUDE_PROJECT_DIR || process.cwd()
    );
  } catch {
    return null;
  }
}

function logHookError(projectRoot, operation, error) {
  if (!projectRoot) return;
  try {
    appendMemoryOpsLog(projectRoot, {
      operation,
      caller: isClaudeHost ? "memory-hook-claude" : "memory-hook",
      error_message: normalizeText(error?.message),
      error_stack: normalizeText(error?.stack?.split("\n").slice(0, 3).join(" | "))
    });
  } catch {
    // fail-open
  }
}

function triggerBackgroundDistill(projectRoot) {
  try {
    if (!shouldTriggerBackgroundDistill(projectRoot)) return;
    const scriptPath = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "lx-distill-sessions.mjs"
    );
    const child = spawn(process.execPath, [scriptPath, "--host", isClaudeHost ? "claude" : "codex", "--project-root", projectRoot], {
      cwd: projectRoot,
      stdio: "ignore",
      detached: true
    });
    child.unref();
    appendMemoryOpsLog(projectRoot, {
      operation: "background_distill_triggered",
      caller: isClaudeHost ? "memory-hook-claude" : "memory-hook",
      host: isClaudeHost ? "claude" : "codex"
    });
  } catch {
    // non-critical, fail silently
  }
}

function readCronStatus(projectRoot) {
  try {
    const setupDir = path.join(projectRoot, ".lingxi", "setup");
    if (fs.existsSync(path.join(setupDir, "claude-cron-state.json"))) return "active";
    if (fs.existsSync(path.join(setupDir, "claude-cron-pending.json"))) return "pending";
    // Neither file exists: treat as pending for legacy installs
    return "pending";
  } catch {
    return "unknown";
  }
}

function buildCronSetupInstruction(projectRoot) {
  if (readCronStatus(projectRoot) !== "pending") return null;
  const now = new Date();
  const next = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  const cron = `${next.getMinutes()} ${next.getHours()} ${next.getDate()} ${next.getMonth() + 1} *`;
  return `[LingXi Schedule Setup Needed]
Please set up the LingXi session distillation schedule now:
1. Use CronCreate with { recurring: false, durable: true, cron: "${cron}" } and this exact prompt:
   "LingXi scheduled session distillation: use the Agent tool with subagent_type \\"lingxi-session-distill\\" to process recent Claude Code sessions for this project."
2. Write the returned job ID to .lingxi/setup/claude-cron-state.json:
   { "job_id": "<returned-id>", "scheduled_at": "${now.toISOString()}", "interval_hours": 6 }
3. Delete the file .lingxi/setup/claude-cron-pending.json
This is a one-time setup. The agent will self-renew the schedule after each run.`;
}

async function readJsonStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return null;
  return JSON.parse(raw);
}

async function main() {
  let payload = null;
  const projectRoot = resolveProjectRootSafe();

  try {
    payload = await readJsonStdin();
  } catch (error) {
    logHookError(projectRoot, "stdin_parse_failed", error);
    return;
  }

  if (!payload) return;

  const eventName = normalizeText(payload.hook_event_name);
  if (eventName !== "UserPromptSubmit") return;

  const hookProjectRoot = resolveProjectRoot(
    payload.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd()
  );
  const caller = isClaudeHost ? "memory-hook-claude" : "memory-hook";
  const prompt = normalizeText(payload.prompt);

  if (!prompt) return;

  // Check cron schedule status (Claude host only — Codex uses its own automation system)
  const cronInstruction = isClaudeHost ? buildCronSetupInstruction(hookProjectRoot) : null;

  const brief = await buildConversationMemoryBrief(hookProjectRoot, prompt, {
    caller,
    interaction_mode: "conversation"
  });

  // Background distill: Codex host only.
  // Claude host uses CronCreate-based scheduled tasks instead of hook-triggered spawns.
  if (!isClaudeHost) {
    triggerBackgroundDistill(hookProjectRoot);
  }

  const contextParts = [];
  if (cronInstruction) contextParts.push(cronInstruction);
  if (brief.operation === "applied_memory" && normalizeText(brief.active_memory_brief)) {
    contextParts.push(brief.active_memory_brief);
  }

  if (contextParts.length === 0) return;

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: contextParts.join("\n\n")
    }
  }, null, 2) + "\n");
}

main().catch((error) => {
  try {
    const projectRoot = resolveProjectRootSafe();
    logHookError(projectRoot, "hook_fatal_error", error);
  } catch {
    // fail-open
  }
  process.exit(0);
});
