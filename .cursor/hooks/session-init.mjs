#!/usr/bin/env node
/**
 * sessionStart hook：在会话开始时注入「记忆提取约定」与「conversation_id 传入约定」；
 * 若距上次会话提炼超过 30 分钟则执行心跳检查，从 transcript 增量中入队待提炼会话并注入「调用后台会话提炼子代理」约定。
 * 参考：https://cursor.com/cn/docs/agent/hooks#sessionstart
 */
import { readStdinJson, writeStdoutJson } from "./_hook-utils.mjs";
import { runHeartbeatCheck } from "./heartbeat-check.mjs";

const BASE_CONTEXT = `【本回合执行顺序】本约定在整场会话中持续有效，每轮独立、不继承上一轮。**无论用户本轮回合输入为何（含仅 command/skill 调用），均须按以下顺序执行，无例外。**

- **步骤 A**（若存在下方「会话提炼心跳」或「自我迭代心跳」）：先执行其 mcp_task 步骤（后台，无需等待），再进入步骤 B。
- **步骤 B**（记忆提取约定）：执行下方「记忆提取约定」二选一，写审计（performed 或 skipped），**禁止未写审计即作答**。
- **步骤 C**：作答。

【记忆提取约定】每轮必须二选一：
- **仅 command/skill 调用**（满足以下任一条件）：不执行 memory-retrieve，写入 \`memory.retrieve.skipped\`（含 query、reason: "仅 command/skill 调用"）：
  - 用户消息仅为一条零参数命令（如 \`/task\`、\`/review\`、\`/start-tuning\`）；
  - 用户消息为一条**携带参数的命令**（如 \`/remember <内容>\`、\`/task <描述>\`），参数内容是命令的形式输入，而非独立的用户意图表达；判断依据：消息以已知命令前缀开头且其后内容为该命令的直接参数。
- **否则**（存在独立的用户自由输入，如命令后附带了与命令无关的分析/提问）：先执行 \`/memory-retrieve <当前用户消息>\`；执行后写入 \`memory.retrieve.performed\`（必含 query、hits、adopted、rejected、semantic_called、keyword_called、candidate_read_count、decision）。

若执行了检索且命中（top 0–2）：必须先对每条命中做 \`adopt\`/\`reject\`/\`ask\` 决策；仅对 adopt 做一行极简提示，reject 不展示；若依据某条记忆做方案选择，表述中自然引用来源（如 \`[MEM-003]\`）。未记录 performed 或 skipped 时审计系统会追加 \`memory.retrieve.missing\`（不阻断主流程）。

【conversation_id 传入约定】调用 lingxi-memory-write 子代理时在 input 中传入 conversation_id（及可选 generation_id）。
`;

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
  const additional_context = BASE_CONTEXT + heartbeatContext + improvementContext;
  writeStdoutJson({
    continue: true,
    additional_context,
  });
}

main().catch((err) => {
  console.error("[session-init hook]", err);
  writeStdoutJson({ continue: true });
});
