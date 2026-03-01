#!/usr/bin/env node
/**
 * sessionStart hook：在会话开始时注入「记忆提取约定」与「conversation_id 传入约定」。
 * 记忆提取约定：每轮先执行 /memory-retrieve <当前用户消息>；约定中的「当前用户消息」由 agent 每轮代入。
 * conversation_id：调用 lingxi-memory 时请在 input 中传入 conversation_id（及可选 generation_id），供审计与会话级关联。
 * 参考：https://cursor.com/cn/docs/agent/hooks#sessionstart
 */
import { readStdinJson, writeStdoutJson } from "./_hook-utils.mjs";

const BASE_CONTEXT = `【记忆提取约定】每轮在回答前，如果存在用户自由输入（非仅command调用或skills调用）时，需执行记忆提取 skills \`/memory-retrieve <当前用户消息>\` 做记忆提取，
若有依据记忆做判断时在回复中自然提及来源。
【conversation_id 传入约定】当前会话 ID 由运行时提供；调用 lingxi-memory 子代理时请在 input 中传入 conversation_id（及可选 generation_id），供记忆审计与会话级关联。
`;

async function main() {
  await readStdinJson();
  writeStdoutJson({
    continue: true,
    additional_context: BASE_CONTEXT,
  });
}

main().catch((err) => {
  console.error("[session-init hook]", err);
  writeStdoutJson({ continue: true });
});
