# LingXi OS 组件选择与开发指南 (Component Guides)

## 概述

基于 Cursor 官方文档的组件能力边界和 LingXi AgentOS 架构，提供组件选择与开发指南。在 AgentOS 架构下，组件的职责被严格剥离。

## 组件对比

| 组件         | 设计目标                          | 在 LingXi OS 中的角色                                        | 限制                         |
| ------------ | --------------------------------- | ------------------------------------------------------------ | ---------------------------- |
| **Command**  | 可复用的工作流，单一用途          | **辅助入口**。如 `/remember`, `/init`。                      | 不需要单独的上下文窗口       |
| **Skill**    | 教会 Agent 如何执行特定领域的任务 | **显式调用的专业工具**。如 `task`, `plan`, `memory-retrieve`。 | 与主 Agent 共享上下文窗口    |
| **Rule**     | 系统级指令，持久、可重用的上下文  | **内核法典**。`.cursor/rules/agentos-kernel.mdc` 是唯一核心。 | 作用于提示级别，Always Apply |
| **Hook**     | 观察、控制和扩展 agent 循环       | **异步守护进程触发器**。仅用于触发 Watchdog 检查。           | 脚本执行，必须快速执行       |
| **Subagent** | 专门 AI 助手，可委派任务          | **隔离的算力容器**。主 Agent 必须将复杂任务委派给它们。      | 启动开销和 Token 消耗更高    |

---

## 1. Rules (全局法典)

### 在灵犀中的应用
LingXi OS 摒弃了零散的 Rules，将所有核心约束收敛于唯一的内核文件：
- **`agentos-kernel.mdc`**：这是整个 IDE 全局置顶（`alwaysApply: true`）的规则。它的作用是让大模型认清自己的 Orchestrator（主控调度器）身份，强制其遵守引导协议 (Law 1)、职能隔离 (Law 2)、后置处理 (Law 3) 和强制自省 (Law 4)。

---

## 2. Commands (辅助入口)

### 设计目标
- 创建**可复用的工作流**，在聊天输入框中使用简单的 `/` 前缀触发。
- 单一用途、可重复的操作。

### 在灵犀中的应用
- **`/remember`**：用户主动触发记忆写入。调用 `taste-recognition` 识别后压入 `HOT_RAM.md` 队列。
- **`/init`**：初始化项目上下文。

---

## 3. Skills (专业技能)

### 设计目标
- 可移植、受版本控制的包，用于**教会 Agent 如何执行特定领域的任务**。

### 在灵犀中的应用
在 AgentOS 架构下，Skill **不再自动拦截和干预核心业务逻辑**（如自动写记忆），而是作为被主 Agent 或用户**显式调用**的工具。

**工作流 Skills**（用户显式触发）：
- `task`：需求分析、提纯、放大和任务文档生成。
- `plan`：任务规划、测试设计和文档生成。
- `build`：代码实现、测试编写和执行。
- `review`：多维度审查和交付质量保证。

**系统级 Skills**（主 Agent 显式调用）：
- `taste-recognition`：从输入中识别可沉淀的「品味」，产出 payload 压入后处理队列。
- `memory-retrieve`：执行 Pre-Phase 和 Post-Phase 的记忆检索。
- `memory-write`：由 `lingxi-memory-write` 子代理调用，执行实际的文件写入。

**审查类 Skills**（由 `review` 显式调用）：
- `reviewer-doc-consistency`, `reviewer-security`, `reviewer-performance`, `reviewer-e2e`。

---

## 4. Subagents (隔离算力容器)

### 设计目标
- 专门 AI 助手，可以**委派任务**。每个子代理都有**独立的上下文窗口**。

### 在灵犀中的应用
Subagent 是 AgentOS 架构中执行“脏活累活”的核心。主 Agent 严禁直接修改代码，必须委派给 Subagent。

- **`lingxi-subagent`**：通用算力容器。主 Agent 将业务任务（如写代码、排错）打包成 Megaprompt 交给它。它在独立沙盒中执行，完成后必须返回严格的 `<Execution_Summary>` XML 结构。
- **`lingxi-memory-write`**：特权子代理。专门负责在后置收敛阶段消费 `HOT_RAM.md` 中的记忆写入队列，执行高复杂度的数据合并与防冲突门控。
- **`lingxi-session-distill`**：会话提炼子代理。由主 Agent 在消费 `WAL_BUFFER.md` 时显式唤起，负责读取历史对话并提炼记忆。

---

## 5. Hooks & Watchdog (异步守护进程)

### 设计目标
- 通过自定义脚本**观察、控制和扩展 agent 循环**。

### 在灵犀中的应用
LingXi OS 放弃了使用 Hook 强行注入 Prompt 的做法，转而将其作为**纯粹的异步任务守护进程**。

1. **`heartbeat-trigger.mjs` (心跳触发 Hook)**：
   - 注册于 `.cursor/hooks.json` 的 **`beforeSubmitPrompt`** 事件（用户每次提交消息时触发，不依赖 Agent 响应完成）。
   - 作用极简：仅调用 `heartbeat-check.mjs`，不阻塞主流程、不注入上下文；使心跳与「用户使用」对齐，触发更及时。

2. **`heartbeat-check.mjs` (Watchdog)**：
   - 真正的异步调度器；从 `.cursor/heartbeat-plugins/registry.mjs` 加载插件，按注册表执行入队与消费。
   - **会话提炼 (30min)**：由插件 `session-distill.mjs` 判定，若距上次提炼超过 30 分钟则将 `[SESSION_DISTILL]` 任务写入 `.cursor/.lingxi/os/WAL_BUFFER.md`，由主 Agent 后处理消费。
   - **自我迭代 (24h)**：由插件 `self-iterate.mjs` 判定，若距上次诊断超过 24 小时则入队；Watchdog 在消费阶段**直接在后台 `exec` 执行** `lingxi-self-iterate` 的 Node 脚本，不占用大模型 API 额度。
