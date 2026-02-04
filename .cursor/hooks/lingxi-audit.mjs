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
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

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

/**
 * 获取系统当前时间戳（ISO 8601格式，UTC）
 */
function getSystemTimestamp() {
  // 使用系统API获取当前时间，转换为ISO 8601格式
  return new Date().toISOString();
}

function buildPayload(input) {
  const ts = getSystemTimestamp();
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

/**
 * 轮转审计日志文件：当文件超过大小限制时，删除总条数一半的旧日志
 */
function rotateAuditFile(auditPath) {
  try {
    const stats = fs.statSync(auditPath, { throwIfNoEntry: false });
    if (!stats || stats.size < MAX_FILE_SIZE) {
      return; // 无需轮转
    }

    // 读取所有日志行
    const content = fs.readFileSync(auditPath, { encoding: "utf8" });
    const lines = content.split("\n").filter((line) => line.trim().length > 0);

    // 计算需要保留的行数（保留后一半）
    const totalLines = lines.length;
    const keepLines = Math.ceil(totalLines / 2); // 保留后一半，向上取整

    if (keepLines >= totalLines) {
      // 如果保留行数等于总行数，说明只有1行或0行，无需清理
      return;
    }

    // 保留后一半的行
    const linesToKeep = lines.slice(-keepLines);
    const newContent = linesToKeep.join("\n") + "\n";

    // 写回文件（使用临时文件确保原子性）
    const tempPath = auditPath + ".tmp";
    fs.writeFileSync(tempPath, newContent, { encoding: "utf8" });
    fs.renameSync(tempPath, auditPath);
  } catch (err) {
    // 轮转失败不影响主流程，静默降级
    console.error("[lingxi-audit] Rotation failed:", err.message);
  }
}

async function main() {
  const input = await readStdinJson();
  const projectRoot = process.env.CURSOR_PROJECT_DIR || process.cwd();
  let auditPath = path.join(projectRoot, AUDIT_REL);
  const workspaceDir = path.dirname(auditPath);

  // 确保目录存在
  if (!fs.existsSync(workspaceDir)) {
    fs.mkdirSync(workspaceDir, { recursive: true });
  }

  // 检查文件大小并轮转（如果存在且超过限制）
  if (fs.existsSync(auditPath)) {
    rotateAuditFile(auditPath);
  }

  // 构建 payload，确保 JSON.stringify 正确处理 Unicode
  const payload = buildPayload(input);
  // JSON.stringify 默认会将非 ASCII 字符转义为 \uXXXX，这是 JSON 标准
  // 如果需要保留原始字符，可以使用 JSON.stringify(payload, null, 0) 但输出会更大
  const line = JSON.stringify(payload) + "\n";

  // 使用 UTF-8 编码写入（明确指定，确保跨平台一致性）
  fs.appendFileSync(auditPath, line, { encoding: "utf8", flag: "a" });

  const out = getAllowOutput(input.hook_event_name);
  writeStdoutJson(out);
}

main().catch((err) => {
  console.error("[lingxi-audit]", err);
  writeStdoutJson({ continue: true, decision: "allow" });
});
