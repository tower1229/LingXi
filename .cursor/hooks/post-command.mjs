#!/usr/bin/env node
/**
 * post-command hook：在用户执行完命令后静默触发。
 * 职责：调用 heartbeat-check，让其将需要执行的异步任务写入 WAL_BUFFER.md，
 * 并扫描 WAL_BUFFER.md 唤起后台进程。
 */
import { readStdinJson, writeStdoutJson } from "./_hook-utils.mjs";
import { runHeartbeatCheck } from "./heartbeat-check.mjs";

async function main() {
  const input = await readStdinJson();
  const projectRoot = process.env.CURSOR_PROJECT_DIR || process.cwd();
  const conversationId = (input.conversation_id ?? input.session_id ?? "").trim();
  
  // 运行心跳检查，它会自动将任务写入 WAL_BUFFER.md
  runHeartbeatCheck(projectRoot, conversationId);
  
  // post-command 不需要修改大模型的上下文，直接返回 continue
  writeStdoutJson({
    continue: true
  });
}

main().catch((err) => {
  console.error("[post-command hook]", err);
  writeStdoutJson({ continue: true });
});
