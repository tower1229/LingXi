#!/usr/bin/env node

import process from "node:process";
import {
  buildConversationMemoryBrief,
  normalizeText,
  resolveProjectRoot
} from "./_lingxi-memory.mjs";

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
  try {
    payload = await readJsonStdin();
  } catch {
    return;
  }

  if (!payload) {
    return;
  }

  const eventName = normalizeText(payload.hook_event_name);
  if (eventName !== "UserPromptSubmit") {
    return;
  }

  const projectRoot = resolveProjectRoot(payload.cwd || process.cwd());
  const prompt = normalizeText(payload.prompt);
  if (!prompt) {
    return;
  }

  const brief = await buildConversationMemoryBrief(projectRoot, prompt, {
    caller: "memory-hook-claude",
    interaction_mode: "conversation"
  });

  if (brief.operation !== "applied_memory" || !normalizeText(brief.active_memory_brief)) {
    return;
  }

  // Claude Code UserPromptSubmit: additionalContext goes in hookSpecificOutput
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: brief.active_memory_brief
    }
  }, null, 2) + "\n");
}

main().catch(() => {
  process.exit(0);
});
