# 灵犀架构概览

## 概述

LingXi AgentOS 旨在将自然流散的 AI 聊天对话，升维改造为具备**确定性状态机**和**多线程并发安全**的后台批处理系统。
其工程核心理念如下：
1. **无锁隔离 (Session Isolation)**：所有状态和长下文都以用户的会话窗口 (`session_id`) 为边界隔离，绝无全局锁死与多开串台。
2. **读写分离与职责剥离 (Orchestrator-Worker)**：主 Agent 仅负责大盘调度与状态扭转，具体的代码实体操作、环境分析等高复杂性执行均下放给专用 Subagent 隔离执行。
3. **强制后置收敛 (Post-Processing Guarantee)**：大模型禁止以模糊推断直接结案响应，生命周期必须经过“意图解析 -> 沙盒执行 -> 文件状态同步 -> 经验提取与收尾”的完整刚性闭环。
4. **主进程主动引导 (Active Bootstrapping)**：放弃依赖外部 Hook 强行注入系统指令的不稳定做法，全面拥抱“主 Agent 被法典约束，在响应任何用户输入前必须首步主动读取环境状态文件”的硬核自洽解法。

## 核心组件

### 工作流由 Skill 驱动

工作流（task → vet → plan → build → review）由 **Skills** 直接驱动，不再以 Command 为入口。用户通过输入 `/task`、`/plan`、`/build`、`/review`、`/vet`（Cursor 会列出同名 Skill）或自然语言（如「创建任务文档」「做一下任务规划」）触发对应 Skill。除 task 作为常见需求起点外，其余环节均可选；**选型责任在用户**，workflow 不规定何时使用哪个 Skill。

**工作流 Skills**：`task`、`vet`、`plan`、`build`、`review`（见 `.cursor/skills/` 下同名目录）。

### Commands（辅助入口）

灵犀保留以下 Command 作为辅助入口：

| 命令        | 职责                                                                                            | 委托/说明                                                                                       |
| ----------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `/remember` | 写入记忆（随时可用，无需依赖任务编号）                                                          | **taste-recognition** 识别后压入 `HOT_RAM.md` 队列，由 **lingxi-memory-write** 消费 |
| `/init`     | 初始化项目上下文（首次使用：引导式理解现有项目并生成可选记忆候选）                               | `workspace-bootstrap`（Step 0 预检）；init command（Step 1–7）；写入时委派 **lingxi-memory-write**（Subagent） |

### 记忆系统（实现"心有灵犀"的核心能力）

记忆系统分为四部分：**记忆沉淀**（用户通过 Command 触发）、**记忆写入**、**记忆提取**。沉淀经 taste-recognition 产出 payload 后交由 lingxi-memory-write 写入。

- **记忆沉淀**（用户触发 + 记忆写入）
  - **触发**：用户通过 `/remember` 主动发起记忆捕获；**工作流内置品味嗅探**（task/plan/build/review 等 **skill** 环节在情境驱动时经 ask-questions 收集用户选择，payload source=choice）同样产生沉淀；`/init` 在初始化流程中可将确认草稿可选写入，为初始化额外产物，非惯常捕获入口。
  - **准入口径**：由 taste-recognition 在识别与升维流程内统一执行（Exclusions 前置拦截，Inclusion 语义综合判定）。
  - **手动记忆**：用户主动发起，经 taste-recognition 转为 payload 后压入 `HOT_RAM.md` 队列。
  - **记忆写入**：由 **Subagent lingxi-memory-write**（`.cursor/agents/lingxi-memory-write.md`）作为 `POST_PROCESSING_REQUIRED` 阶段的特权执行器，在独立沙盒中消费队列执行。
- **记忆提取**：由 `memory-retrieve`（Skill）承担。
  - **Pre-Phase**：主 Agent 处于 `IDLE` 状态收到新指令时，以用户输入为 Query 调用，结果写入 `HOT_RAM.md` 的 `[PRE-MEMORY]` 区块。
  - **Post-Phase**：主 Agent 处于 `POST_PROCESSING_REQUIRED` 状态消费队列时，以 Subagent 返回的 `<Execution_Summary>` 中的 `Touched Assets` 为 Query 调用，命中滞后义务则压入队列。

### Hooks（仅用于异步治理）

- **post-command**（`post-command.mjs`）：在用户执行完命令后静默触发。调用 `heartbeat-check`，让其将需要执行的异步任务（如 30 分钟的会话提炼和 24 小时的自我迭代）写入 `WAL_BUFFER.md`。

## 目录结构

```
.cursor/
├── commands/              # 辅助入口（init、remember 等）
├── skills/                # 执行逻辑 (task, plan, build, taste-recognition 等)
├── agents/                # Subagents（独立上下文）
│   ├── lingxi-subagent.md         # 通用算力容器
│   ├── lingxi-memory-write.md     # 记忆写入特权代理
│   ├── lingxi-session-distill.md  # 会话提炼（后台消费 WAL_BUFFER）
│   └── lingxi-self-iterate.md     # 自我迭代（后台消费 WAL_BUFFER）
├── hooks/                 # post-command 异步治理触发器
├── rules/                 # 全局法典
│   └── agentos-kernel.mdc # 核心状态机与引导协议
├──.lingxi/
        ├── tasks/                 # 任务文档（统一目录）
        ├── memory/                # 统一记忆系统
        │   ├── INDEX.md           # 统一索引（SSoT）
        │   ├── project/           # 项目级记忆文件
        │   └── share/             # 共享记忆目录
        └── os/                    # AgentOS 状态与沙盒
            ├── sessions/          # 单会话状态控制台 (HOT_RAM.md, SESSION_TRACE.md)
            └── WAL_BUFFER.md      # 全局预写日志缓冲池
```
