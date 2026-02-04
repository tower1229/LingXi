#!/usr/bin/env node
/**
 * sessionStart hook：在会话开始时注入「每轮先执行 /memory-retrieve <当前用户消息>」的约定。
 * sessionStart 无本轮用户输入，约定中的「当前用户消息」由 agent 每轮代入。
 * 参考：https://cursor.com/cn/docs/agent/hooks#sessionstart
 */
import { readStdinJson, writeStdoutJson } from "./_hook-utils.mjs";

const BASE_CONTEXT = `【记忆库约定】每轮在回答前，先执行 \`/memory-retrieve <当前用户消息>\`，按 \`.cursor/skills/memory-retrieve/SKILL.md\` 执行后再回答；有依据记忆做判断时在回复中自然提及来源。
【沟通约定】对用户描述时用自然语言说明正在做的事（如「正在整理需求」「正在跑测试」），不要罗列内部组件名（如 req-executor、memory-retrieve 等）。`;

async function main() {
  const input = await readStdinJson();
  const sessionId = input.session_id ?? input.conversation_id ?? "";
  const auditContext =
    sessionId === ""
      ? "【审计约定】当前会话 ID 由运行时提供；调用 lingxi-memory 子代理时请在 input 中传入 conversation_id（及可选 generation_id），以便记忆审计与主审计按会话关联。"
      : `【审计约定】当前会话 ID：${sessionId}；调用 lingxi-memory 子代理时请在 input 中传入 conversation_id（及可选 generation_id），以便记忆审计与主审计按会话关联。`;
  const ADDITIONAL_CONTEXT = `${BASE_CONTEXT}\n${auditContext}`;
  writeStdoutJson({
    continue: true,
    additional_context: ADDITIONAL_CONTEXT,
  });
}

main().catch((err) => {
  console.error("[session-init hook]", err);
  writeStdoutJson({ continue: true });
});
