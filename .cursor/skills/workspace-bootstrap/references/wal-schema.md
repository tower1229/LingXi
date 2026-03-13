# WAL Buffer 行格式契约 (WAL Schema)

本文档是 `WAL_BUFFER.md` 任务行的**唯一格式约定**。heartbeat-check、主 Agent 侧读 WAL 的脚本或指引均应与此一致。

## 行格式

- **未勾选**：`- [ ] \`[TYPE]\`: <JSON>`
- **已勾选**：`- [x] \`[TYPE]\`: <JSON>`

其中 `TYPE` 为大写任务类型标识，`<JSON>` 为该任务 payload 的 JSON 字符串（单行，无换行）。

## 任务类型与 Payload 结构

### SESSION_DISTILL

由 Watchdog 在满足 30 分钟条件时入队；由主 Agent 在后处理阶段消费并唤起 lingxi-session-distill。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `candidate_ids` | `string[]` | 是 | 待提炼的 conversation_id 列表，最多 5 条（由 Watchdog 按 transcript 索引与 processed_conversation_ids 计算） |
| `enqueued_by` | `string` | 是 | 触发入队的当前会话 id |

**示例**：`- [ ] \`[SESSION_DISTILL]\`: {"candidate_ids": ["uuid1","uuid2"], "enqueued_by": "current-session-id"}`

### SELF_ITERATE

由 Watchdog 在满足 24 小时条件时入队；由 Watchdog 扫描 WAL 后 exec 脚本消费，成功后勾选。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `session_id` | `string` | 是 | 触发入队的会话 id（用于防重复提示等） |

**示例**：`- [ ] \`[SELF_ITERATE]\`: {"session_id": "uuid"}`

## 解析与写入

- **写入**：使用 `appendWalTask(projectRoot, type, payload)` 追加一行未勾选任务。
- **解析**：使用 `parseWalLines(content)` 得到 `{ type, payload, checked }[]`，或 `getPendingTasks(content)` 得到未勾选任务列表。

实现见 `.cursor/hooks/wal-utils.mjs`。
