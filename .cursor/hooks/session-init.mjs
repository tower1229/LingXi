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

  return `【记忆提取约定】以下协议在整个会话内持续有效。每一轮都必须按步骤执行，不得跳步。

<execution_protocol>
  <description>This protocol is effective for the entire session. Each turn is independent. Regardless of the user's input, you MUST execute in the following order. NO EXCEPTIONS.</description>
${stepA}  <rule id="B">步骤 B：Memory Retrieval Agreement（Must choose one）：
    - [Skip]：如果用户消息仅是命令（如 \`/task\`）或命令参数（如 \`/remember <content>\`），且不包含独立用户意图，则不要执行 memory-retrieve；改为写入 \`memory.retrieve.skipped\` 审计。
    - [Perform]：否则，先执行 \`/memory-retrieve <当前用户消息>\`，再写入 \`memory.retrieve.performed\` 审计。
    - 禁止：在完成步骤 B 的检索审计前，不要开始回答或执行主请求。
    - 决策：若有命中（top 0-2），必须逐条做 adopt / reject / ask 决策；仅对 adopt 给出一行极简提醒，reject 不对用户展示；引用记忆时自然带上来源（如 [MEM-003]）。
  </rule>
  <rule id="C">步骤 C：执行主流程，回答用户并落实请求。</rule>
  <rule id="D">步骤 D：若步骤 C 发生文件写入或其他实际产物变更，则进入 post 模式的 memory-retrieve：
    - 用“实际变更摘要”作为检索 query 再执行一次 memory-retrieve。
    - 仅对 \`trigger_timing=post\` 或 \`trigger_timing=both\` 的记忆执行 adopt / reject；\`trigger_timing=pre\` 在 post 模式跳过。
    - 若 note 未声明 \`trigger_timing\`，默认按 \`pre\` 处理（向后兼容）。
    - post 模式命中的义务要立即履约，例如运行测试、更新版本号、补齐发布动作等；不要把这些义务留到下一轮。
  </rule>
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
