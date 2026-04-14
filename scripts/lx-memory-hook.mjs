#!/usr/bin/env node

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

  const brief = await buildConversationMemoryBrief(hookProjectRoot, prompt, {
    caller,
    interaction_mode: "conversation"
  });

  // Schedule background distill after memory retrieval (non-blocking)
  triggerBackgroundDistill(hookProjectRoot);

  if (brief.operation !== "applied_memory" || !normalizeText(brief.active_memory_brief)) {
    return;
  }

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: brief.active_memory_brief
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
