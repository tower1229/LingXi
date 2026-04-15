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

function isDistillLockActive(lockPath) {
  try {
    const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
    if (Date.now() - lock.started_at > 30 * 60 * 1000) return false;
    try { process.kill(lock.pid, 0); return true; } catch { return false; }
  } catch {
    return false;
  }
}

function triggerBackgroundDistill(projectRoot) {
  try {
    if (!shouldTriggerBackgroundDistill(projectRoot)) return;
    const lockPath = path.join(projectRoot, ".lingxi", "state", "distill.lock");
    if (isDistillLockActive(lockPath)) return;
    const scriptPath = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "lx-distill-sessions.mjs"
    );
    const child = spawn(process.execPath, [scriptPath, "--host", isClaudeHost ? "claude" : "codex", "--project-root", projectRoot, "--lock-file", lockPath], {
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

  triggerBackgroundDistill(hookProjectRoot);

  const contextParts = [];
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
