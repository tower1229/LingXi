#!/usr/bin/env node
/**
 * sessionStart hook：在会话开始时注入「记忆提取约定」与「conversation_id 传入约定」；
 * 若距上次会话提炼超过 30 分钟则执行心跳检查，从 transcript 增量中入队待提炼会话并注入「调用后台会话提炼子代理」约定。
 * 参考：https://cursor.com/cn/docs/agent/hooks#sessionstart
 */
import { readStdinJson, writeStdoutJson } from "./_hook-utils.mjs";
import { runHeartbeatCheck } from "./heartbeat-check.mjs";

const BASE_CONTEXT_FOOTER = `
【conversation_id 传入约定】调用 lingxi-memory-write 子代理时在 input 中传入 conversation_id（及可选 generation_id）。
`;

function buildDynamicBaseContext(trigger_heartbeat, trigger_improvement) {
  let stepA = (trigger_heartbeat || trigger_improvement) ? 
    `  <rule id="A" condition="If [会话提炼心跳] or [自我迭代心跳] context is provided below">Invoke subagent using mcp_task in the background, no need to wait.</rule>\n` : "";

  return `<execution_protocol>
  <description>This protocol is effective for the entire session. Each turn is independent. Regardless of the user's input, you MUST execute in the following order. NO EXCEPTIONS.</description>
${stepA}  <rule id="B">Memory Retrieval Agreement (Must choose one):
    - [Skip]: If the user message is ONLY a command (like \`/task\`) or a command with parameters (like \`/remember <content>\`) without independent user intent, DO NOT execute memory-retrieve. Write \`memory.retrieve.skipped\` to audit.
    - [Perform]: Otherwise, FIRST execute \`/memory-retrieve <current user message>\`. Then write \`memory.retrieve.performed\` to audit.
    PROHIBITION: DO NOT start answering or doing requests before writing the audit log for step B!
    Decision: If there are hits (top 0-2), you must make an adopt/reject/ask decision for each. Only give a one-line prompt for adopt, don't show reject. Cite the source (e.g., [MEM-003]) naturally when used.
  </rule>
  <rule id="C">Make responses and implement the user requests.</rule>
</execution_protocol>` + BASE_CONTEXT_FOOTER;
}


function buildHeartbeatContext(trigger_heartbeat, candidate_ids, conversationId) {
  if (!trigger_heartbeat || !candidate_ids || candidate_ids.length === 0) return "";
  const idsJson = JSON.stringify(candidate_ids);
  const enqueuedBy = (conversationId || "").trim();
  return `

【会话提炼心跳】本会话已触发会话提炼心跳，待提炼会话已按 transcript 增量入队（candidate_ids: ${idsJson}）。**步骤 A 中必须**使用 mcp_task 工具发起 **lingxi-session-distill** 子代理，在 **prompt** 中明确传入 **candidate_ids**: ${idsJson} 与 **enqueued_by**: "${enqueuedBy}"（当前会话的 conversation_id）。子代理会在其内部先写入 \`heartbeat.triggered\` 再执行提炼，主会话无需再写 audit。无需等待提炼完成即进入步骤 B。

说明：\`heartbeat-control.json\` 中的 \`heartbeat.running\` 只有会话提炼子代理在收尾步骤会置为 false；若子代理未被调用或未执行到收尾，running 会一直为 true，下次心跳（约 5 分钟锁超时后）可重新入队。
`;
}

function buildImprovementContext(triggerImprovementDiagnosis) {
  if (!triggerImprovementDiagnosis) return "";
  return `

【自我迭代心跳】本会话已进入 24h 低频窗口。**本会话仅触发一次**：在首次触发轮次的步骤 A 中必须使用 mcp_task 工具发起 **lingxi-self-iterate** 子代理（subagent_type=lingxi-self-iterate），并设置 **run_in_background=true**，在 prompt 中说明执行“诊断 + 自动改进（仅 low risk）”。同一会话后续轮次无需重复触发。无需等待子代理完成即进入步骤 B。
`;
}

async function main() {
  const input = await readStdinJson();
  const projectRoot = process.env.CURSOR_PROJECT_DIR || process.cwd();
  const conversationId = (input.conversation_id ?? input.session_id ?? "").trim();
  const { trigger_heartbeat, candidate_ids, trigger_improvement_diagnosis } = runHeartbeatCheck(
    projectRoot,
    conversationId
  );
  const heartbeatContext = buildHeartbeatContext(trigger_heartbeat, candidate_ids, conversationId);
  const improvementContext = buildImprovementContext(trigger_improvement_diagnosis);
  const additional_context = buildDynamicBaseContext(trigger_heartbeat, trigger_improvement_diagnosis) + heartbeatContext + improvementContext;
  writeStdoutJson({
    continue: true,
    additional_context,
  });
}

main().catch((err) => {
  console.error("[session-init hook]", err);
  writeStdoutJson({ continue: true });
});
