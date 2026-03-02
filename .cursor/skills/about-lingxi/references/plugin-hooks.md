# 灵犀 Hooks 说明

## 约定

灵犀安装后，`hooks.json` 中的 `command` 使用相对路径，例如：

- `node .cursor/hooks/session-init.mjs`（sessionStart：注入记忆检索约定及 conversation_id 传入约定）
- `node .cursor/hooks/lingxi-audit.mjs`（审计：9 类 Hook 事件）

灵犀还配置了多种**审计 hooks**（`lingxi-audit.mjs`），在 beforeSubmitPrompt、afterAgentResponse、preToolUse、postToolUse、postToolUseFailure、subagentStart、subagentStop、sessionEnd、stop 等 9 类事件触发时写入 `.cursor/.lingxi/workspace/audit.log`，用于审计追溯。其中 `preToolUse` 与 `postToolUse`/`postToolUseFailure` 通过 `tool_use_id` 关联，形成一次工具调用的完整链路。具体配置见 `hooks.json`。

## 健康度指标口径（基于 audit.log）

- `tool_attempt_total`：`event=pre_tool_use` 的总条数。
- `tool_success_rate`：`count(post_tool_use) / count(pre_tool_use)`。
- `tool_failure_rate`：`count(post_tool_use_failure) / count(pre_tool_use)`。
- `tool_p95_latency_ms`：按 `post_tool_use.duration_ms` 计算 P95。
- `tool_orphan_rate`：存在 `pre_tool_use` 但无同 `tool_use_id` 的 post 事件占比，用于发现中断/丢日志。

## 工作目录说明

Cursor 执行 plugin hooks 时的**当前工作目录**以官方文档为准（[构建插件](https://cursor.com/cn/docs/plugins/building)）。若 Cursor 以**工作区根**为 cwd，则 `node .cursor/hooks/...` 会解析工作区内的 `.cursor`；安装时，该 `.cursor` 由安装过程提供并映射到工作区。若遇 hook 未触发或路径找不到，请查阅 Cursor 插件文档中 hooks 的 cwd 与路径解析规则，必要时在仓库内更新本文档或调整 `hooks.json` 中的路径格式。
