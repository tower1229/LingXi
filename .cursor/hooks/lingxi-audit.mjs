#!/usr/bin/env node
/**
 * 主审计脚本：被 8 类 Hook 调用，从 stdin 读入参，写一条 NDJSON 到 audit.log，返回放行 JSON。
 * 参考：001.req.灵犀审计系统.md §8.2；Cursor Hooks 文档。
 */
import fs from "node:fs";
import path from "node:path";
import { readStdinJson, writeStdoutJson } from "./_hook-utils.mjs";

const AUDIT_REL = ".cursor/.lingxi/workspace/audit.log";
const MAX_PREVIEW = 200;

const HOOK_TO_EVENT = {
  beforeSubmitPrompt: "before_submit_prompt",
  afterAgentResponse: "after_agent_response",
  postToolUse: "post_tool_use",
  postToolUseFailure: "post_tool_use_failure",
  subagentStart: "subagent_start",
  subagentStop: "subagent_stop",
  sessionEnd: "session_end",
  stop: "stop",
};

function truncate(s, max = MAX_PREVIEW) {
  if (typeof s !== "string") return undefined;
  return s.length <= max ? s : s.slice(0, max) + "...";
}

function buildPayload(input) {
  const ts = new Date().toISOString();
  const conversation_id = input.conversation_id ?? "";
  const generation_id = input.generation_id ?? "";
  const hookName = input.hook_event_name ?? "";
  const event = HOOK_TO_EVENT[hookName] ?? "unknown";

  const base = { ts, event, conversation_id, generation_id };

  switch (event) {
    case "before_submit_prompt":
      return { ...base, prompt_preview: truncate(input.prompt) };
    case "after_agent_response":
      return {
        ...base,
        reply_preview: truncate(input.text),
        duration_ms: input.duration_ms,
      };
    case "post_tool_use":
      return {
        ...base,
        tool_name: input.tool_name,
        duration_ms: input.duration,
        result_preview: truncate(input.tool_output),
      };
    case "post_tool_use_failure":
      return {
        ...base,
        tool_name: input.tool_name,
        error_preview: truncate(input.error_message),
      };
    case "subagent_start":
      return { ...base, agent_name: input.subagent_type ?? input.subagent_name };
    case "subagent_stop":
      return {
        ...base,
        agent_name: input.subagent_type ?? input.subagent_name,
        duration_ms: input.duration,
      };
    case "session_end":
    case "stop":
    default:
      return base;
  }
}

function getAllowOutput(hookName) {
  if (hookName === "beforeSubmitPrompt") return { continue: true };
  if (hookName === "subagentStart") return { decision: "allow" };
  return {};
}

async function main() {
  const input = await readStdinJson();
  const projectRoot = process.env.CURSOR_PROJECT_DIR || process.cwd();
  const auditPath = path.join(projectRoot, AUDIT_REL);
  const workspaceDir = path.dirname(auditPath);

  const payload = buildPayload(input);
  const line = JSON.stringify(payload) + "\n";

  if (!fs.existsSync(workspaceDir)) {
    fs.mkdirSync(workspaceDir, { recursive: true });
  }
  fs.appendFileSync(auditPath, line, "utf8");

  const out = getAllowOutput(input.hook_event_name);
  writeStdoutJson(out);
}

main().catch((err) => {
  console.error("[lingxi-audit]", err);
  writeStdoutJson({ continue: true, decision: "allow" });
});
