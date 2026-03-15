# 🧠 OS HOT RAM - Session: 9f418ae7-a618-4643-a191-f16192a29ea1

> **[SYSTEM_WARNING]**: DO NOT EDIT THIS HEADER.
> Current State MUST be one of: [IDLE | WAITING_SUBAGENT | POST_PROCESSING_REQUIRED | HUMAN_INTERVENTION_REQUIRED]

**Current State**: `IDLE`
**Last Updated**: `2026-03-15 10:30:58`

---

## 🧑 [GLOBAL CONFIG] (用户全局行为配置)

> 由主 Agent 在会话首轮读取 `USER.md` 后注入。对本会话**所有 Tier** 的响应均生效。
> 若此区块已有内容，本轮无需再次读取 USER.md。

_(空)_

---

## 📥 [PRE-MEMORY] (前置上下文与约束)

> 存放由 `memory-retrieve` 预检索出的项目规范与历史教训。主 Agent 需将此区域内容编译进 Megaprompt。

_(空)_

---

## ⚙️ [DYNAMIC TASK QUEUE] (动态执行队列)

> 当前轮次需要 Subagent 执行的具体任务拆解。

_(空)_

---

## 📤 [POST-PROCESSING QUEUE] (后置处理队列)

> 存放等待主 Agent 消费的系统级义务。必须使用严格的 Markdown Checkbox。主 Agent 消费完毕后需打勾。
> **注意**：`[POST_RETRIEVE]`、`[WAL_BUFFER_SYNC]` 和 `[USER_REPORT]` 是每次状态机流转固有的默认任务，必须始终存在于队列中。

- [ ] `[POST_RETRIEVE]`: 主 Agent 必须以 Subagent 返回的 `Touched Assets` 为 Query，调用 `memory-retrieve` (Post 模式) 检查是否触发滞后义务。若检索到新义务，必须将其作为新 Checkbox 追加到本队列下方。
- [ ] `[WAL_BUFFER_SYNC]`: 主 Agent 必须读取 `.lingxi/os/WAL_BUFFER.md`，如果发现有未处理的 `- [ ] \`[SESSION_DISTILL]\`` 任务，主 Agent 必须调用 `lingxi-session-distill` Subagent 去执行提炼。**执行完毕后**必须更新状态：在项目根目录执行 `node plugin/hooks/heartbeat-distill-done.mjs --candidate-ids '<本次处理的 candidate_ids 的 JSON 字符串>'`（将本次任务 payload 中的 candidate_ids 序列化为 JSON 传入），以更新 `heartbeat-control.json`（last_distillation_completed_at、processed_conversation_ids、heartbeat.running）并在 `WAL_BUFFER.md` 中将该行打勾。
- [ ] `[USER_REPORT]`: 队列中所有其他任务消费完毕（打勾）后，向用户汇报最终执行结果。
