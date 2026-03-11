# 灵犀 Hooks 说明

## 约定

灵犀安装后，`hooks.json` 中的 `command` 使用相对路径，例如：

- `node .cursor/hooks/session-init.mjs`（sessionStart：注入记忆检索与 conversation_id 约定，并执行心跳检查，必要时注入会话提炼/自我迭代心跳约定）
- `node .cursor/hooks/lingxi-audit.mjs`（审计：9 类 Cursor Hook 事件，按「核心 / Debug」策略写入 audit.log）

## sessionStart（session-init.mjs）

**职责**：在会话开始时注入约定并执行心跳检查。

1. **注入约定**  
   - 每轮先执行 `/memory-retrieve <当前用户消息>` 的记忆提取约定，以及调用 lingxi-memory-write 时传入 conversation_id 的约定。

2. **心跳检查**  
   脚本读取 `.cursor/.lingxi/workspace/heartbeat-control.json` 与 transcript 增量索引（`heartbeat-transcript-index.json`），并视情况向当轮上下文追加约定：
   - **会话提炼心跳**：若距上次会话提炼完成超过 30 分钟且锁可用，则从 transcript 增量中入队最多 3 个未提炼候选会话，写入 `pending_distillation` 与锁，并注入约定：主 Agent 在步骤 A 必须发起 **lingxi-session-distill** 子代理（传入 candidate_ids、enqueued_by），后台运行，无需等待。
   - **自我迭代心跳**：若距上次 24h 诊断完成超过 24 小时（依据 `last_improvement_cycle_at`），则注入约定：主 Agent 在步骤 A 必须发起 **lingxi-self-iterate** 子代理（run_in_background=true），执行“诊断 + 自动改进（仅 low risk）”，无需等待。

两种心跳均由主 Agent 在步骤 A 通过 mcp_task 调用对应子代理，主会话不等待子代理完成即进入步骤 B（记忆提取）与步骤 C（作答）。

## 审计与 audit.log：核心事件 vs Debug 事件

写入 `.cursor/.lingxi/workspace/audit.log` 的事件分为两路，且 Hook 事件采用**核心 / Debug** 分离策略。

### 写入来源

| 来源 | 说明 |
|------|------|
| **lingxi-audit.mjs** | 由 9 类 Cursor Hook（beforeSubmitPrompt、afterAgentResponse、preToolUse、postToolUse、postToolUseFailure、subagentStart、subagentStop、sessionEnd、stop）触发；**默认仅写入部分事件**（见下），受环境变量 `LINGXI_AUDIT_DEBUG` 控制是否写入其余事件。 |
| **append-memory-audit.mjs** | 由主 Agent、lingxi-memory-write、lingxi-self-iterate 等通过命令行传入 JSON 调用；写入记忆与心跳相关业务事件，**与 LINGXI_AUDIT_DEBUG 无关**，始终写入。 |
| **子代理/脚本直接写 audit.log** | 如 lingxi-session-distill 按 agent 说明向 audit.log 追加 `heartbeat.triggered`、`heartbeat.distillation_completed`、`heartbeat.distillation_failed` 等 NDJSON。 |

### 核心事件（默认会写入 audit.log）

- **由 lingxi-audit.mjs 写入的 Hook 事件（默认）**：仅 `session_end`、`stop`。即未设置 `LINGXI_AUDIT_DEBUG` 时，其余 7 类 Hook 事件**不**写入，以控制日志体积与高频调用成本。
- **由 append-memory-audit.mjs 或子代理/脚本写入的事件**：始终写入，包括：
  - `memory_note_created`、`memory_note_updated`、`memory_note_deleted`、`memory_index_updated`
  - `memory.retrieve.performed`、`memory.retrieve.skipped`、`memory.retrieve.missing`、`memory.retrieve.invalid`
  - `heartbeat.triggered`、`heartbeat.distillation_completed`、`heartbeat.distillation_failed`（会话提炼子代理写入）
  - `memory.merge.diagnosed`、`memory.merge.invalid`
  - `memory.improvement.proposed`、`memory.improvement.approved`、`memory.improvement.rejected`、`memory.improvement.applied`、`memory.improvement.failed`（自我迭代相关）

上述与 memory-system 中的「审计事件集（默认最小集）」一致，用于记忆、心跳与自我迭代的可观测与审计。

### Debug 事件（LINGXI_AUDIT_DEBUG=1 时额外写入）

当设置环境变量 `LINGXI_AUDIT_DEBUG=1` 或 `true` 时，**lingxi-audit.mjs** 会：

1. **写入全部 9 类 Hook 事件**  
   即除 `session_end`、`stop` 外，还会写入：`before_submit_prompt`、`after_agent_response`、`pre_tool_use`、`post_tool_use`、`post_tool_use_failure`、`subagent_start`、`subagent_stop`。其中 `pre_tool_use` 与 `post_tool_use`/`post_tool_use_failure` 通过 `tool_use_id` 关联，形成单次工具调用的完整链路。

2. **执行记忆检索完整性审计**  
   在 `afterAgentResponse` 触发时，检查本轮回合内是否出现过 `memory.retrieve.performed` 或 `memory.retrieve.skipped`；若未出现则追加写入 `memory.retrieve.missing`（含 reason、expected_events）；若已出现且需验证关键词路径，则可能追加 `memory.retrieve.keyword_path_verified`。

因此，**健康度指标**（tool_attempt_total、tool_success_rate、tool_orphan_rate 等）依赖 `pre_tool_use`/`post_tool_use` 等事件，仅在开启 `LINGXI_AUDIT_DEBUG` 时才有完整工具链数据。

## 健康度指标口径（基于 audit.log）

以下指标依赖 lingxi-audit 写入的 Hook 事件，**需 LINGXI_AUDIT_DEBUG=1 时才有完整数据**：

- `tool_attempt_total`：`event=pre_tool_use` 的总条数。
- `tool_success_rate`：`count(post_tool_use) / count(pre_tool_use)`。
- `tool_failure_rate`：`count(post_tool_use_failure) / count(pre_tool_use)`。
- `tool_p95_latency_ms`：按 `post_tool_use.duration_ms` 计算 P95。
- `tool_orphan_rate`：存在 `pre_tool_use` 但无同 `tool_use_id` 的 post 事件占比，用于发现中断/丢日志。

## 工作目录说明

Cursor 执行 plugin hooks 时的**当前工作目录**以官方文档为准（[构建插件](https://cursor.com/cn/docs/plugins/building)）。若 Cursor 以**工作区根**为 cwd，则 `node .cursor/hooks/...` 会解析工作区内的 `.cursor`；安装时，该 `.cursor` 由安装过程提供并映射到工作区。若遇 hook 未触发或路径找不到，请查阅 Cursor 插件文档中 hooks 的 cwd 与路径解析规则，必要时在仓库内更新本文档或调整 `hooks.json` 中的路径格式。
