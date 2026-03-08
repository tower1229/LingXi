#!/usr/bin/env node
/**
 * sessionStart hook：在会话开始时注入「记忆提取约定」与「conversation_id 传入约定」；
 * 若距上次会话提炼超过 30 分钟则执行心跳检查，将待提炼会话入队并注入「调用后台会话提炼子代理」约定。
 * 参考：https://cursor.com/cn/docs/agent/hooks#sessionstart
 */
import { readStdinJson, writeStdoutJson } from "./_hook-utils.mjs";
import { runHeartbeatCheck } from "./heartbeat-check.mjs";

const BASE_CONTEXT = `【记忆提取约定】本约定在整场会话中持续有效，不因对话轮次增加、上下文变长或压缩而失效；每一轮（包括第 2 轮及之后）均须遵守。
每轮回答前的第一步：若存在用户自由输入（非仅 command 调用或 skills 调用），必须、不可省略地先执行 \`/memory-retrieve <当前用户消息>\`，再开始作答；不可跳过或认为「上一轮已做过」而省略。即使上一轮已执行过 memory-retrieve，本轮仍须针对**本轮**用户消息重新执行一次；每轮独立、不继承上一轮。
若命中记忆（top 0-2），必须先做一轮决策：\`adopt\`（采用）/\`reject\`（不采用，给出一句理由）/\`ask\`（需向用户确认）。
对用户呈现要求：未采纳（reject）的命中不展示；已采纳（adopt）的命中仅允许一行极简提示，不展开过程，不罗列列表。
若本轮回答依据某条记忆做方案选择，需在表述中自然引用记忆来源（如 \`[MEM-003]\`）；禁止只检索不决策。
每轮记忆检索后，需写入一条审计：\`memory.retrieve.performed\`（执行检索）或 \`memory.retrieve.skipped\`（显式跳过）。
其中 \`memory.retrieve.performed\` 必含 query、hits、adopted、rejected、semantic_called、keyword_called、candidate_read_count、decision。
每轮若未记录上述事件，审计系统会追加 \`memory.retrieve.missing\` 作为完整性告警（不阻断主流程）。
【conversation_id 传入约定】当前会话 ID 由运行时提供；调用 lingxi-memory 子代理时请在 input 中传入 conversation_id（及可选 generation_id），供记忆审计与会话级关联。
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
