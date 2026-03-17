#!/usr/bin/env node
/**
 * 心跳触发 Hook。仅用于 beforeSubmitPrompt / UserPromptSubmit：
 * 用户每次提交消息时同步触发，Agent 处理消息前必然执行完毕。
 *
 * 职责（按顺序）：
 * 1. [session-init] 幂等初始化会话文件——确保 HOT_RAM.md 已存在，主 Agent 开始时无需自行创建。
 * 2. [heartbeat-check] 将 30min/24h 等任务写入 WAL_BUFFER.md，并扫描 WAL 唤起后台进程（如 SELF_ITERATE）。
 * 3. [user-config-inject] 幂等读取 USER.md，若 HOT_RAM [GLOBAL CONFIG] 为空则注入，每会话只执行一次。
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

/**
 * 幂等注入用户全局配置。
 * 读取 USER.md，若 HOT_RAM [GLOBAL CONFIG] 区块仍为占位符则写入。
 * 每会话只执行一次（幂等检查基于占位符内容）。
 * 若任意步骤失败，静默继续——主 Agent 的兜底逻辑仍可处理。
 */
async function runUserConfigInject(projectRoot, conversationId) {
  if (!conversationId) return;

  const hotRamPath = path.join(
    projectRoot, ".lingxi", "os", "sessions", conversationId, "HOT_RAM.md"
  );

  const userMdCandidates = [
    path.join(projectRoot, ".lingxi", "memory", "USER.md"),
  ];

  try {
    if (!(await fileExists(hotRamPath))) return;

    const hotRamContent = await fs.readFile(hotRamPath, "utf8");

    // 检查 [GLOBAL CONFIG] 区块是否已有实质内容（占位符判断）
    const globalConfigMatch = hotRamContent.match(
      /##\s+🧑\s+\[GLOBAL CONFIG\][^\n]*\n([\s\S]*?)(?=\n##\s+|\n---\s*\n|$)/
    );
    if (!globalConfigMatch) return;

    const configBody = globalConfigMatch[1].trim();
    // 区块内容可能包含 > 注释行，需要去掉注释行后再判断是否为占位符
    const configBodyWithoutComments = configBody
      .split("\n")
      .filter(line => !line.trim().startsWith(">"))
      .join("\n")
      .trim();
    // 若已有实质内容（非空、非占位符），跳过
    const isEmpty = !configBodyWithoutComments || /^_\(空[^)]*\)_$/.test(configBodyWithoutComments);
    if (!isEmpty) return;

    // 查找 USER.md
    let userMdPath = "";
    for (const candidate of userMdCandidates) {
      if (await fileExists(candidate)) {
        userMdPath = candidate;
        break;
      }
    }
    if (!userMdPath) return;

    const userMdContent = await fs.readFile(userMdPath, "utf8");

    // 提取 USER.md 中 "## 行为偏好" 之后的内容（跳过文件头注释）
    const prefMatch = userMdContent.match(/##\s+行为偏好\s*\n([\s\S]*)/);
    const prefContent = prefMatch ? prefMatch[1].trim() : userMdContent.trim();
    if (!prefContent || prefContent === "_(空 — 通过 `/remember` 或在对话中表达偏好来填充)_") return;

    // 将 [GLOBAL CONFIG] 区块中的占位符替换为实际内容
    // 策略：找到 [GLOBAL CONFIG] 区块的起止位置，只在该区块内做替换
    const gcStart = hotRamContent.indexOf("[GLOBAL CONFIG]");
    const gcEnd = hotRamContent.indexOf("\n---", gcStart);
    if (gcStart === -1 || gcEnd === -1) return;

    const gcSection = hotRamContent.slice(gcStart, gcEnd);
    const gcUpdated = gcSection.replace(/_\(空[^)]*\)_/, prefContent);
    if (gcUpdated === gcSection) return; // 没有找到占位符

    const updated = hotRamContent.slice(0, gcStart) + gcUpdated + hotRamContent.slice(gcEnd);

    if (updated !== hotRamContent) {
      await fs.writeFile(hotRamPath, updated, "utf8");
    }
  } catch (err) {
    console.error("[heartbeat-trigger] user-config-inject failed, agent will handle fallback:", err.message);
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

  // 3. 幂等注入用户全局配置到 HOT_RAM [GLOBAL CONFIG]
  await runUserConfigInject(projectRoot, conversationId);

  writeStdoutJson({ continue: true });
}

main().catch((err) => {
  console.error("[heartbeat-trigger hook]", err);
  writeStdoutJson({ continue: true });
});
