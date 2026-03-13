#!/usr/bin/env node
/**
 * 心跳触发 Hook。仅用于 beforeSubmitPrompt：用户每次提交消息时触发（不依赖 Agent 响应完成）。
 * 职责：调用 heartbeat-check，将 30min/24h 等任务写入 WAL_BUFFER.md，并扫描 WAL 唤起后台进程（如 SELF_ITERATE）。
 * 选用 beforeSubmitPrompt 可使心跳与「用户使用」对齐，触发更及时、覆盖更完整。
 */
import { readStdinJson, writeStdoutJson } from "./_hook-utils.mjs";
import { runHeartbeatCheck } from "./heartbeat-check.mjs";

async function main() {
  const input = await readStdinJson();
  const projectRoot = process.env.CURSOR_PROJECT_DIR || process.cwd();
  const conversationId = (input.conversation_id ?? input.session_id ?? "").trim();

  // 运行心跳检查，它会自动将任务写入 WAL_BUFFER.md
  runHeartbeatCheck(projectRoot, conversationId);

  // 不需要修改大模型的上下文，直接返回 continue
  writeStdoutJson({
    continue: true
  });
}

main().catch((err) => {
  console.error("[heartbeat-trigger hook]", err);
  writeStdoutJson({ continue: true });
});
