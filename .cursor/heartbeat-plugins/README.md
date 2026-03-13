# 心跳插件目录 (Heartbeat Plugins)

本目录为灵犀心跳系统的**专用插件目录**：每个插件一个独立 `.mjs` 文件，通过 `registry.mjs` 注册进心跳，由 `.cursor/hooks/heartbeat-check.mjs` 在入队/消费阶段调用。

## 插件契约

每个插件文件**默认导出一个对象**，包含：

| 字段 | 必填 | 说明 |
|------|------|------|
| `id` | 是 | WAL 任务类型（与 wal-schema 一致），如 `SESSION_DISTILL`、`SELF_ITERATE` |
| `shouldEnqueue(env)` | 是 | 入队阶段调用；返回 `payload` 则入队，返回 `null` 则不入队；可在此写 control/index |
| `consumer` | 是 | `'main-agent'`：仅入队，由主 Agent 读 WAL 消费；`'watchdog'`：由 heartbeat-check 执行并勾选 |
| `execCommand(projectRoot, payload)` | 可选 | 仅 `consumer === 'watchdog'` 时使用；返回要执行的 shell 命令 |
| `onFailure(projectRoot, payload)` | 可选 | 仅 watchdog；执行失败时调用 |

## env 入参（由 heartbeat-check 注入）

- `projectRoot`, `control`, `now`, `nowIso`, `conversationId`
- `writeControl(control)`, `writeTranscriptIndex(index)`, `getTranscriptCandidates()`（30min 相关）
- `improvementThresholdHours`（可选，如 24）

## 新增插件

1. 在本目录下新建 `xxx.mjs`，按契约导出 `default` 对象。
2. 在 `registry.mjs` 中 `import xxx from "./xxx.mjs"`，并将 `xxx` 加入 `PLUGINS` 数组。

顺序即入队顺序；无需修改 `heartbeat-check.mjs`。
