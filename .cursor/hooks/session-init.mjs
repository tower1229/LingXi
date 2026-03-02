#!/usr/bin/env node
/**
 * sessionStart hook：在会话开始时注入「记忆提取约定」与「conversation_id 传入约定」。
 * 记忆提取约定：每轮先执行 /memory-retrieve <当前用户消息>；约定中的「当前用户消息」由 agent 每轮代入。
 * conversation_id：调用 lingxi-memory 时请在 input 中传入 conversation_id（及可选 generation_id），供审计与会话级关联。
 * 参考：https://cursor.com/cn/docs/agent/hooks#sessionstart
 */
import { readStdinJson, writeStdoutJson } from "./_hook-utils.mjs";

const BASE_CONTEXT = `【记忆提取约定】每轮在回答前，如果存在用户自由输入（非仅command调用或skills调用）时，必须先执行 \`/memory-retrieve <当前用户消息>\`。
若命中记忆（top 0-2），必须先做一轮决策：\`adopt\`（采用）/\`reject\`（不采用，给出一句理由）/\`ask\`（需向用户确认）。
对用户呈现要求：未采纳（reject）的命中不展示；已采纳（adopt）的命中仅允许一行极简提示，不展开过程，不罗列列表。
若本轮回答依据某条记忆做方案选择，需在表述中自然引用记忆来源（如 \`[MEM-003]\`）；禁止只检索不决策。
每轮记忆检索后，需写入一条审计（event=\`memory_retrieve\`，含 query、hits、adopted、rejected、semantic_called、keyword_called、candidate_read_count）。
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
