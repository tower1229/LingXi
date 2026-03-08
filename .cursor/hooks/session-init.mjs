#!/usr/bin/env node
/**
 * sessionStart hook：在会话开始时注入「记忆提取约定」与「conversation_id 传入约定」；
 * 若距上次会话提炼超过 30 分钟则执行心跳检查，将待提炼会话入队并注入「调用后台会话提炼子代理」约定。
 * 参考：https://cursor.com/cn/docs/agent/hooks#sessionstart
 */
import { readStdinJson, writeStdoutJson } from "./_hook-utils.mjs";
import { runHeartbeatCheck } from "./heartbeat-check.mjs";

const BASE_CONTEXT = `【记忆提取约定】本约定在整场会话中持续有效，每轮独立、不继承上一轮。

每轮回答前必须先做**二选一**（禁止未写审计即作答）：
- **仅 command/skill 调用**（用户消息仅为一条 command 如 \`/start-tuning\`、\`/task\` 或 skill 调用，无其它自然语言）：不执行 memory-retrieve，写入 \`memory.retrieve.skipped\`（含 query、reason: "仅 command/skill 调用"），然后直接作答。
- **否则**（存在用户自由输入）：先执行 \`/memory-retrieve <当前用户消息>\`，再作答；执行后写入 \`memory.retrieve.performed\`（必含 query、hits、adopted、rejected、semantic_called、keyword_called、candidate_read_count、decision）。

若执行了检索且命中（top 0–2）：必须先对每条命中做 \`adopt\`/\`reject\`/\`ask\` 决策；仅对 adopt 做一行极简提示，reject 不展示；若依据某条记忆做方案选择，表述中自然引用来源（如 \`[MEM-003]\`）。未记录 performed 或 skipped 时审计系统会追加 \`memory.retrieve.missing\`（不阻断主流程）。

【conversation_id 传入约定】调用 lingxi-memory 子代理时在 input 中传入 conversation_id（及可选 generation_id）。
`;

function buildHeartbeatContext(trigger_heartbeat, candidate_ids, conversationId) {
  if (!trigger_heartbeat || !candidate_ids || candidate_ids.length === 0) return "";
  const idsJson = JSON.stringify(candidate_ids);
  const enqueuedBy = (conversationId || "").trim();
  return `

【会话提炼心跳】本会话已触发会话提炼心跳，待提炼会话已入队（candidate_ids: ${idsJson}）。请按以下顺序执行：
1. **必须使用 mcp_task 工具**发起 **lingxi-session-distill** 子代理，在 **prompt** 中明确传入 **candidate_ids**: ${idsJson} 与 **enqueued_by**: "${enqueuedBy}"（当前会话的 conversation_id）。子代理会在其内部先写入 \`heartbeat.triggered\` 再执行提炼，主会话**无需**再写 audit。
2. 然后直接执行记忆提取约定并作答，无需等待提炼完成。

说明：\`heartbeat-control.json\` 中的 \`heartbeat.running\` 只有会话提炼子代理在**收尾步骤**会置为 false；若子代理未被调用或未执行到收尾，running 会一直为 true，下次心跳（约 5 分钟锁超时后）可重新入队。
`;
}

async function main() {
  const input = await readStdinJson();
  const projectRoot = process.env.CURSOR_PROJECT_DIR || process.cwd();
  const conversationId = (input.conversation_id ?? input.session_id ?? "").trim();
  const { trigger_heartbeat, candidate_ids } = runHeartbeatCheck(projectRoot, conversationId);
  const heartbeatContext = buildHeartbeatContext(trigger_heartbeat, candidate_ids, conversationId);
  const additional_context = BASE_CONTEXT + heartbeatContext;
  writeStdoutJson({
    continue: true,
    additional_context,
  });
}

main().catch((err) => {
  console.error("[session-init hook]", err);
  writeStdoutJson({ continue: true });
});
