# 灵犀架构概览

## 概述

灵犀基于 Cursor 的 Commands、Skills、Rules 等机制构建，遵循职责分离与 `references/core-values.md` 中的设计原则（含 AI Native：尊重 AI 能力，预留进化空间；关键决策以人为主、门控保障）。目前推荐通过**远程安装脚本**将灵犀加入项目（见 README 安装章节）；安装后在任意工作区可用，项目内的 `.cursor/.lingxi/` 由运行 `/init` 或首次使用相关命令时在项目内创建。

## 核心组件

### Commands（命令入口）

Commands 作为纯入口，负责参数解析和调用说明，执行逻辑委托给 Skills。灵犀以**工具包**形式提供 req、plan、build、review 等命令，除 `/req` 作为需求起点外，其余环节均可选；**选型责任在用户**，workflow 不规定何时使用哪条命令。

| 命令          | 职责                                                                           | 委托的 Skill                                                                                     |
| ------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `/req`        | 创建任务文档（自动生成任务编号和标题）                                         | `req-executor`                                                                                   |
| `/review-req` | 审查 req 文档（可选，可多次执行，不产出文件）；taskId 可选，省略时使用最新任务 | `review-req-executor`                                                                            |
| `/plan`       | 任务规划（可选，适用于复杂任务）；taskId 可选，省略时使用最新任务              | `plan-executor`                                                                                  |
| `/build`      | 执行构建（可选，Plan-driven / Req-driven）；taskId 可选，省略时使用最新任务    | `build-executor`                                                                                 |
| `/review`     | 审查交付；taskId 可选，省略时使用最新任务                                      | `review-executor`                                                                                |
| `/remember`   | 写入记忆（随时可用，无需依赖任务编号）                                         | **lingxi-memory**（Subagent）                                                                    |
| `/init`       | 初始化项目（首次使用：创建 .cursor/.lingxi/ 骨架，引导式收集并可选写入记忆）   | `workspace-bootstrap`（Step 0）；init command（0.5–8）；写入时委派 **lingxi-memory**（Subagent） |

**特性**：

- 多入口设计：所有命令独立执行，不依赖前一阶段完成
- 流程解耦：所有环节可跳过，按需执行

### Skills（执行逻辑）

Skills 承载详细的工作流指导，按职责分为：

#### Executor Skills（执行核心工作流）

- `req-executor`：需求分析、提纯、放大和任务文档生成
- `review-req-executor`：对 req 文档进行多维度审查，辅助提升任务文档质量
- `plan-executor`：任务规划、测试设计和计划文档文档及测试用例文档生成
- `build-executor`：代码实现、测试编写和执行
- `review-executor`：多维度审查和交付质量保证
- `workspace-bootstrap`：检测并创建缺失的灵犀目录结构和文件（若 .cursor/.lingxi/ 不存在则创建骨架）

#### 记忆系统（实现"心有灵犀"的核心能力）

记忆系统分为四部分：**自动沉淀**、**手动记忆**、**记忆写入**、**记忆提取**。其中**自动沉淀**、**手动记忆**、**记忆写入**共同组成**记忆沉淀**。

- **记忆沉淀**（三部分）  
  - **自动沉淀**：由 session 约定触发，主 Agent 每轮先 memory-retrieve、再按约定调用 taste-recognition skill，若产出 payload 则调用 lingxi-memory。  
  - **手动记忆**：用户通过 `/remember` 或 `/init` 主动发起，经 taste-recognition 转为 payload 后交由 lingxi-memory。  
  - **记忆写入**：由 **Subagent lingxi-memory**（`.cursor/agents/lingxi-memory.md`）在独立上下文中执行；**仅接受** taste-recognition skill 产出的 7 字段品味 payload（scene, principles, choice, evidence, source, confidence, apply），不产候选；完成校验 → 映射 → 评分卡 → 治理 → 门控 → **直接文件写入**（notes + INDEX），主对话仅收一句结果。  
- **记忆提取**：由 `memory-retrieve`（Skill）承担，每轮回答前对 `memory/notes/` 做**语义+关键词双路径**混合检索、并集加权合并与降级，取 top 0–2 最小注入（由 sessionStart hook 注入的约定触发）。

#### 工具类 Skills（提供辅助能力）

- `about-lingxi`：快速了解灵犀的背景知识、架构设计和核心机制，提供调优指导、价值判定和评价准则
- `ask-questions`：统一 ask-questions 交互协议与结果校验（`question_id + option id`，返回 option id 列表），供 remember/init/记忆治理等高频交互场景复用

#### 审查类 Skills（Review 阶段专用）

- `reviewer-doc-consistency`：文档一致性审查
- `reviewer-security`：安全审查
- `reviewer-performance`：性能审查
- `reviewer-e2e`：端到端测试审查

### 记忆库机制（Memory-first）

灵犀的核心能力是自动捕获与治理记忆，并在每一轮对话前进行最小注入。记忆系统分为四部分：**自动沉淀**、**手动记忆**、**记忆写入**、**记忆提取**；其中**自动沉淀**、**手动记忆**、**记忆写入**共同组成**记忆沉淀**。

1. **记忆沉淀**（自动沉淀 + 手动记忆 + 记忆写入）
   - **触发**：**自动沉淀**由 session 约定触发——每轮先执行 memory-retrieve，再按约定调用 taste-recognition skill，若产出 7 字段 payload 则调用 lingxi-memory；**手动记忆**由用户执行 `/remember` 或 `/init` 后选择写入。上述约定由 sessionStart hook（`.cursor/hooks/session-init.mjs`）注入，安装后即生效。
   - **写入**：所有写入**必须先经 taste-recognition** 产出 7 字段品味 payload；**lingxi-memory** 子代理**仅接受**该 payload（禁止原始对话或旧形态 input），在独立上下文中执行：校验 → 映射生成 note → 评分卡（5 维）→ 治理（TopK）→ 门控 → 直接读写 `memory/notes/` 与 `memory/INDEX.md`，主对话仅收一句结果或静默。门控：半静默仅限 new 且 confidence=high；merge/replace/删除须用户确认。  
2. **记忆提取**：每轮在回答前执行 `memory-retrieve`（由 sessionStart 约定触发），对 `memory/notes/` 做语义+关键词双路径检索与最小注入。  
3. **记忆共享机制**（跨项目复用）：
   - **共享目录**：`.cursor/.lingxi/memory/notes/share/`（推荐作为 git submodule）
   - **识别**：通过记忆元数据中的 `Audience`（team/project/personal）和 `Portability`（cross-project/project-only）字段标识可共享记忆；推荐约定：团队级经验（Audience=team，Portability=cross-project）应进入 share 仓库
   - **写入**：`lingxi-memory` 子代理支持写入到 `share/` 目录；写入位置由用户门控时决定，或根据 `Portability` 字段提示用户
   - **读取**：`memory-retrieve` 递归检索 `memory/notes/` 目录（包括 `share/` 子目录），语义+关键词混合检索会自动包含共享记忆；语义不可用时降级为仅关键词路径，仍无匹配则静默
   - **索引同步**：`memory-sync` 脚本（`npm run memory-sync`）递归扫描 `notes/**` 并更新 `INDEX.md`，支持 project 覆盖 share 的冲突优先级规则

### Hooks（sessionStart 记忆注入 + 可选审计/门控）

- **sessionStart**（`session-init.mjs`）：在会话开始时注入「每轮先执行 /memory-retrieve <当前用户消息>」的约定**以及【记忆沉淀约定】**（先调用 taste-recognition skill，有 payload 再调 lingxi-memory），保证**记忆沉淀**（自动沉淀与手动记忆 /remember、/init）在安装后即生效；其他审计/门控为可选。
- **不使用 stop hook 的 followup_message 触发沉淀**：该方式会在模型每次响应后显式追加一条 prompt，严重干扰对话；灵犀追求尽可能「静默」执行，沉淀依赖主 Agent 判断后显式调用 lingxi-memory（或用户 `/remember`），而非在每次 stop 时追加系统提示

## 目录结构

```
.cursor/
├── commands/              # 命令入口
│   ├── req.md
│   ├── plan.md
│   ├── build.md
│   ├── review.md
│   └── ...
├── skills/                # 执行逻辑
│   ├── req-executor/
│   ├── review-req-executor/
│   ├── plan-executor/
│   ├── build-executor/
│   ├── review-executor/
│   ├── reviewer-doc-consistency/
│   ├── reviewer-security/
│   ├── reviewer-performance/
│   ├── reviewer-e2e/
│   ├── memory-retrieve/
│   └── ...
├── agents/                # Subagents（独立上下文）
│   └── lingxi-memory.md   # 记忆写入
├── hooks/                 # sessionStart 记忆注入约定 + 可选审计/门控
├──.lingxi/
        ├── tasks/                 # 任务文档（统一目录）
        │   ├── 001.req.<标题>.md
        │   ├── 001.plan.<标题>.md
        │   └── ...
        ├── memory/                # 统一记忆系统
        │   ├── INDEX.md           # 统一索引（SSoT）
        │   ├── notes/             # 扁平记忆文件（语义+关键词混合检索的主搜索面）
        │   │   └── share/          # 共享记忆目录（推荐作为 git submodule，跨项目复用）
        │   └── references/         # 模板与规范
        └── workspace/             # 工作空间
            └── audit.log           # 审计日志
```

## 工作流生命周期

### 需求推进流程

1. `/req <描述>`：创建任务文档（自动生成任务编号和标题，产出：`001.req.<标题>.md`）
2. `/review-req 001`（可选）：审查 req 文档（可多次执行，不产出文件，仅输出审查结果和建议到对话中）
3. `/plan 001`（可选）：任务规划（基于 req 文档生成任务规划文档和测试用例文档，适用于复杂任务，简单任务可跳过）
4. `/build 001`（可选）：执行构建（支持两种模式：Plan-driven 有 plan 文档时按计划结构化执行，Req-driven 无 plan 文档时 Agent 基于 req 自行决策执行）
5. `/review 001`：审查交付（自动进行多维度审查，生成审查报告，包含核心审查和按需审查）

**特性**：

- 所有环节可跳过，按需执行
- 无生命周期管理，无状态路由
- 每个命令独立执行，不依赖前一阶段完成
