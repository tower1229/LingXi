#!/usr/bin/env node
/**
 * sessionStart hook：在会话开始时注入「每轮先执行 /memory-retrieve <当前用户消息>」的约定。
 * sessionStart 无本轮用户输入，约定中的「当前用户消息」由 agent 每轮代入。
 * 参考：https://cursor.com/cn/docs/agent/hooks#sessionstart
 */
import { readStdinJson, writeStdoutJson } from "./_hook-utils.mjs";

const BASE_CONTEXT = `【记忆库提取约定】每轮在回答前，先执行 \`/memory-retrieve <当前用户消息>\`，按 \`.cursor/skills/memory-retrieve/SKILL.md\` 执行后再回答；有依据记忆做判断时在回复中自然提及来源。
【沟通约定】对用户描述时用自然语言说明正在做的事（如「正在整理需求」「正在跑测试」），不要罗列内部组件名（如 req-executor、memory-retrieve 等）。`;

const PRECIPITATE_CONTEXT = `【记忆沉淀约定】当发生以下情况时，应显式调用 lingxi-memory 子代理写入记忆（\`/lingxi-memory mode=auto input=<本轮要点>\` 或自然语言「使用 lingxi-memory 子代理将可沉淀内容写入记忆库」）：任务完成或关键决策出现；需求固化、范围调整、优先级变更；目标纠正、方案选择、约束添加；边界明确、验收调整、风险确认；用户拒绝、纠正、排除（如不要/别用/改成…）时也识别并传入。原则：宁可多候选再门控，对「是否可沉淀」的判断宜放宽，交由子代理与用户门控做最终筛选。`;

async function main() {
  const input = await readStdinJson();
  const sessionId = input.session_id ?? input.conversation_id ?? "";
  const auditContext =
    sessionId === ""
      ? "【审计约定】当前会话 ID 由运行时提供；调用 lingxi-memory 子代理时请在 input 中传入 conversation_id（及可选 generation_id），以便记忆审计与主审计按会话关联。"
      : `【审计约定】当前会话 ID：${sessionId}；调用 lingxi-memory 子代理时请在 input 中传入 conversation_id（及可选 generation_id），以便记忆审计与主审计按会话关联。`;
  const ADDITIONAL_CONTEXT = `${BASE_CONTEXT}\n${PRECIPITATE_CONTEXT}\n${auditContext}`;
  writeStdoutJson({
    continue: true,
    additional_context: ADDITIONAL_CONTEXT,
  });
}

main().catch((err) => {
  console.error("[session-init hook]", err);
  writeStdoutJson({ continue: true });
});
