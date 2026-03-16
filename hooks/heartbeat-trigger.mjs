#!/usr/bin/env node
/**
 * 心跳触发 Hook。仅用于 beforeSubmitPrompt / UserPromptSubmit：
 * 用户每次提交消息时同步触发，Agent 处理消息前必然执行完毕。
 *
 * 职责（按顺序）：
 * 1. [session-init] 幂等初始化会话文件——确保 HOT_RAM.md 已存在，主 Agent 开始时无需自行创建。
 * 2. [heartbeat-check] 将 30min/24h 等任务写入 WAL_BUFFER.md，并扫描 WAL 唤起后台进程（如 SELF_ITERATE）。
 */
import fs from "node:fs/promises";
import path from "node:path";
import { readStdinJson, writeStdoutJson, fileExists, getProjectRootFromHookScriptUrl } from "./_hook-utils.mjs";
import { runHeartbeatCheck } from "./heartbeat-check.mjs";

/**
 * 幂等会话初始化。
 * 以 conversationId 为 sessionId，确保：
 * - 会话目录存在
 * - HOT_RAM.md 存在（不存在则从模板创建）
 * 若任意步骤失败，静默继续——主 Agent 的兜底逻辑仍可处理。
 */
async function runSessionInit(projectRoot, conversationId) {
  if (!conversationId) return;

  const sessionDir = path.join(projectRoot, ".lingxi", "os", "sessions", conversationId);
  const hotRamPath = path.join(sessionDir, "HOT_RAM.md");

  if (await fileExists(hotRamPath)) return;

  const templateCandidates = [
    path.join(projectRoot, ".cursor", "skills", "workspace-bootstrap", "references", "HOT_RAM.default.md"),
    path.join(projectRoot, ".claude", "skills", "workspace-bootstrap", "references", "HOT_RAM.default.md"),
  ];
  let templatePath = "";
  for (const candidate of templateCandidates) {
    if (await fileExists(candidate)) {
      templatePath = candidate;
      break;
    }
  }
  if (!templatePath) return;

  try {
    await fs.mkdir(sessionDir, { recursive: true });

    let template = await fs.readFile(templatePath, "utf8");
    const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
    template = template
      .replace(/\{\{SESSION_ID\}\}/g, conversationId)
      .replace(/\{\{TIMESTAMP\}\}/g, timestamp);

    await fs.writeFile(hotRamPath, template, "utf8");
  } catch (err) {
    console.error("[heartbeat-trigger] session-init failed, agent will handle fallback:", err.message);
  }
}

async function main() {
  const input = await readStdinJson();
  // Prefer explicit env vars, then workspace_roots from hook input (Cursor 2.6+),
  // then fall back to script-relative path resolution.
  // On Windows, Cursor may pass workspace_roots as Unix-style paths like "/C:/path/to/project".
  // Normalize by stripping the leading slash before a drive letter.
  const rawWorkspaceRoot = Array.isArray(input.workspace_roots) && input.workspace_roots[0]
    ? input.workspace_roots[0]
    : "";
  const workspaceRoot = process.platform === "win32" && /^\/[A-Za-z]:/.test(rawWorkspaceRoot)
    ? rawWorkspaceRoot.slice(1)
    : rawWorkspaceRoot;
  const projectRoot =
    process.env.CURSOR_PROJECT_DIR ||
    process.env.CLAUDE_PROJECT_DIR ||
    workspaceRoot ||
    getProjectRootFromHookScriptUrl(import.meta.url);
  const conversationId = (input.conversation_id ?? input.session_id ?? "").trim();

  // 1. 幂等初始化会话文件
  await runSessionInit(projectRoot, conversationId);

  // 2. 运行心跳检查，将任务写入 WAL_BUFFER.md
  runHeartbeatCheck(projectRoot, conversationId);

  writeStdoutJson({ continue: true });
}

main().catch((err) => {
  console.error("[heartbeat-trigger hook]", err);
  writeStdoutJson({ continue: true });
});
