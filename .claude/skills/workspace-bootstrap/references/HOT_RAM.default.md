# 🧠 OS HOT RAM - Session: {{SESSION_ID}}

> **[SYSTEM_WARNING]**: DO NOT EDIT THIS HEADER.
> Current State MUST be one of: [IDLE | WAITING_SUBAGENT | POST_PROCESSING_REQUIRED | HUMAN_INTERVENTION_REQUIRED]

**Current State**: `IDLE`
**Last Updated**: `{{TIMESTAMP}}`

---

## 🧑 [GLOBAL CONFIG] (用户全局行为配置)

> 由 `beforeSubmitPrompt` 脚本在 Agent 启动前从 `USER.md` 注入（每会话一次，幂等）。
> 对本会话**所有阶段**的响应均生效。Agent 只读，不修改此区块。

_(空)_

---

## 📥 [PRE-MEMORY] (前置上下文与约束)

> 由阶段一 `memory-retrieve`（Pre 模式）写入，存放检索到的项目规范与历史教训。
> 阶段二 `megaprompt-assembly` 将此区域内容注入 Megaprompt。

_(空)_

---

## ⚙️ [TASK-CONTEXT] (当前轮次任务上下文)

> 存放当前轮次的任务拆解与执行上下文，供 Subagent 参考。

_(空)_

---

## 📤 [POST-PROCESSING QUEUE] (后置处理队列)

> 存放等待主 Agent 消费的系统级义务。必须使用严格的 Markdown Checkbox。主 Agent 消费完毕后需打勾。
> **注意**：`[POST_RETRIEVE]`、`[WAL_BUFFER_SYNC]` 和 `[USER_REPORT]` 是每次状态机流转固有的默认任务，必须始终存在于队列中。
> `[MEMORY_WRITE]` 由阶段一 `taste-recognition` 产出时动态压入，格式为 `- [ ] [MEMORY_WRITE]: <payload_json>`。

- [ ] `[POST_RETRIEVE]`: 主 Agent 必须以 Subagent 返回的 `Touched Assets` 为 Query，调用 `memory-retrieve` (Post 模式) 检查是否触发滞后义务。若检索到新义务，必须将其作为新 Checkbox 追加到本队列下方。
- [ ] `[WAL_BUFFER_SYNC]`: 主 Agent 必须读取 `.lingxi/os/WAL_BUFFER.md`，**循环处理所有**未勾选的 `- [ ] \`[SESSION_DISTILL]\`` 任务（每条任务独立调用一次 `lingxi-session-distill` Subagent）。每条任务**执行完毕后**必须立即更新状态：在项目根目录执行 `node hooks/heartbeat-distill-done.mjs --candidate-ids '<本次处理的 candidate_ids 的 JSON 字符串>'`（将本次任务 payload 中的 candidate_ids 序列化为 JSON 传入），以更新 `heartbeat-control.json`（last_distillation_completed_at、processed_conversation_ids、heartbeat.running）并在 `WAL_BUFFER.md` 中将该行打勾。直到所有未勾选的 `[SESSION_DISTILL]` 行均已处理完毕，本任务才可打勾。
- [ ] `[USER_REPORT]`: 队列中所有其他任务消费完毕（打勾）后，向用户汇报最终执行结果。
