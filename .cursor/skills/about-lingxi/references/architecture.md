# 灵犀架构概览

## 概述

灵犀基于 Cursor 的 Commands、Skills、Rules 等机制构建，遵循职责分离与 `references/core-values.md` 中的设计原则（含 AI Native：尊重 AI 能力，预留进化空间；关键决策以人为主、门控保障）。目前推荐通过**远程安装脚本**将灵犀加入项目（见 README 安装章节）；安装后在任意工作区可用，项目内的 `.cursor/.lingxi/` 由运行 `/init` 或首次使用相关命令时在项目内创建。

## 核心组件

### 工作流由 Skill 驱动

工作流（task → vet → plan → build → review）由 **Skills** 直接驱动，不再以 Command 为入口。用户通过输入 `/task`、`/plan`、`/build`、`/review`、`/vet`（Cursor 会列出同名 Skill）或自然语言（如「创建任务文档」「做一下任务规划」）触发对应 Skill。除 task 作为常见需求起点外，其余环节均可选；**选型责任在用户**，workflow 不规定何时使用哪个 Skill。

**工作流 Skills**：`task`、`vet`、`plan`、`build`、`review`（见 `.cursor/skills/` 下同名目录）。

### Commands（辅助入口）

灵犀保留以下 Command 作为辅助入口：

| 命令        | 职责                                                                                            | 委托/说明                                                                                       |
| ----------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `/remember` | 写入记忆（随时可用，无需依赖任务编号）                                                          | **lingxi-memory-write**（Subagent）                                                                    |
| 会话提炼（心跳） | 新会话时若距上次提炼 >30 分钟，按 transcript 增量自动入队最多 3 个未提炼候选会话，由 **lingxi-session-distill**（Background 子代理）异步提炼并写入记忆 | taste-recognition + **lingxi-memory-write**（Subagent，payloads 的 source=heartbeat）                   |
| 自我迭代（心跳） | 新会话时若距上次 24h 诊断 >24 小时，由 sessionStart 注入约定，主 Agent 在步骤 A 发起 **lingxi-self-iterate**（Background 子代理）执行诊断与仅 low risk 的自动改进，主会话不等待 | **lingxi-self-iterate**（Subagent，后台）                                                        |
| `/init`     | 初始化项目上下文（首次使用：引导式理解现有项目并生成可选记忆候选）                               | `workspace-bootstrap`（Step 0 预检）；init command（Step 1–7）；写入时委派 **lingxi-memory-write**（Subagent） |

**特性**：

- 工作流入口为 task/vet/plan/build/review **Skills**，可经 `/task` 等或自然语言触发
- 多入口设计：所有工作流 Skill 独立执行，不依赖前一阶段完成
- 流程解耦：所有环节可跳过，按需执行

### Skills（执行逻辑）

Skills 承载详细的工作流指导，按职责分为：

#### 工作流 Skills（执行核心工作流）

- `task`：需求分析、提纯、放大和任务文档生成（含可判定验收标准）
- `vet`：对 task 文档进行多维度审查，辅助提升任务文档质量；vet 后用户反馈若导致 task 修改，会在 task 附录的「变更记录」中留下结构化历史。
- `plan`：任务规划、测试设计及计划文档与测试用例文档生成
- `build`：代码实现、测试编写和执行
- `review`：多维度审查和交付质量保证

#### 记忆系统（实现"心有灵犀"的核心能力）

记忆系统分为四部分：**记忆沉淀**（用户通过 Command 触发）、**记忆写入**、**记忆提取**。沉淀经 taste-recognition 产出 payload 后交由 lingxi-memory-write 写入。

- **记忆沉淀**（用户触发 + 记忆写入）
  - **触发**：用户通过 `/remember` 主动发起记忆捕获；**会话提炼**由**心跳**自动触发（新会话时若距上次提炼超过 30 分钟，按 transcript 增量入队最多 3 个候选会话，由 lingxi-session-distill 后台子代理提炼，source=heartbeat）；**工作流内置品味嗅探**（task/plan/build/review 等 **skill** 环节在情境驱动时经 ask-questions 收集用户选择，payload source=choice）同样产生沉淀；`/init` 在初始化流程中可将确认草稿可选写入，为初始化额外产物，非惯常捕获入口。
  - **准入口径**：由 taste-recognition 在识别与升维流程内统一执行（Exclusions 前置拦截，Inclusion 语义综合判定）。
  - **手动记忆**：用户主动发起，经 taste-recognition 转为 payload 后以 **payloads 数组**交由 lingxi-memory-write。
  - **记忆写入**：由 **Subagent lingxi-memory-write**（`.cursor/agents/lingxi-memory-write.md`）在独立上下文中执行；**仅接受** taste-recognition skill 产出的扩展品味 **payloads 数组**（必填 7 字段 + layer；可选 l0OneLiner、l1OneLiner、patternHint、patternConfidence），不产候选；完成校验后调用 **memory-write** skill（`.cursor/skills/memory-write/SKILL.md`）执行映射 → 治理 → 门控 → **直接文件写入**（memory/project/、memory/share/ + INDEX），主对话收简报。升维（价值判定与模式靠拢）在 taste-recognition 完成，判定不写时不产出 payload、不调用 lingxi-memory-write。
- **记忆提取**：由 `memory-retrieve`（Skill）承担。通过在结构化 XML Prompt 的约定中严格执行：作答前必须由步骤 B 执行检索（对 `memory/project/`、`memory/share/` 做语义+关键词双路径混合检索，并集加权合并，取 top 0–2 最小注入）。命中后主 Agent 需完成 `adopt/reject/ask` 决策，并遵循“仅对 adopt 一行极简提示、reject 不展示”的低打扰输出约束，且在采用时自然引用记忆来源。

#### 工具类 Skills（提供辅助能力）

- `workspace-bootstrap`：创建缺失的灵犀目录骨架（.cursor/.lingxi/ 等），由 /init 或安装脚本显式调用，勿自动加载。
- `testcase-designer`：由 plan（主产出）、build（Task-driven 且无 testcase 时）、review（覆盖审计）显式调用，从 task 文档产出结构化 testcase 文档，保证 F→TC 映射与验证方式一致
- `about-lingxi`：快速了解灵犀的背景知识、架构设计和核心机制，提供调优指导、价值判定和评价准则
- `ask-questions`：统一 ask-questions 交互协议与结果校验（`question_id + option id`，返回 option id 列表），供 remember/init/记忆治理等高频交互场景复用

#### 审查类 Skills（Review 阶段专用）

- `reviewer-doc-consistency`：文档一致性审查
- `reviewer-security`：安全审查
- `reviewer-performance`：性能审查
- `reviewer-e2e`：端到端测试审查

### 记忆库机制（Memory-first）

灵犀的核心能力是捕获与治理记忆，并在每一轮对话前进行最小注入。**沉淀内容类型**（偏好、决策经验、领域知识、产品/业务知识、行业/组织经验、启发式、模式、反例与约束、排障与根因等）见 memory-system 与 taste-recognition 的 `references/content-types.md`。记忆系统分为四部分：**记忆沉淀**（用户触发）、**记忆写入**、**记忆提取**。

1. **记忆沉淀**（用户触发 + 记忆写入）
   - **数据流**：taste-recognition（识别 → 模式靠拢 → 升维判定）→ 仅对判定为写的条目标产扩展 payload；**主 Agent 仅当 payloads 非空时**调用 lingxi-memory-write；lingxi-memory-write 校验后调用 **memory-write** skill 执行：按 payload 映射生成 note → 治理（TopK）→ 门控 → 直接读写 `memory/project/`、`memory/share/` 与 `memory/INDEX.md`，主对话收简报。判定不写时不产出 payload、不调用 lingxi-memory-write。
   - **触发**：用户通过 `/remember` 主动发起记忆捕获；**会话提炼**由**心跳**自动触发（新会话时若距上次提炼超过 30 分钟，按 transcript 增量入队最多 3 个候选会话，由 lingxi-session-distill 后台子代理提炼）；**工作流内置品味嗅探**（task/plan/build/review 等 **skill** 环节在情境驱动时经 ask-questions 收集用户选择，payload source=choice）同样产生沉淀；`/init` 在初始化时可将确认草稿可选写入，为初始化额外产物。sessionStart hook 仅注入记忆提取约定及 conversation_id 传入约定。
   - **门控**：半静默仅限 new 且 confidence=high；merge/replace/删除须用户确认。
2. **记忆提取**：每轮通过 sessionStart 使用 XML `<execution_protocol>` 约束自动执行核心的前置检索与决策。
3. **记忆共享机制**（跨项目复用）：
   - **共享目录**：`.cursor/.lingxi/memory/share/`（推荐作为 git submodule）
   - **识别**：Audience 为 project（项目级）或 team（团队级）；**团队级=写入 memory/share/**，**项目级=写入 memory/project/**；Portability 为 project-only / cross-project。
   - **写入**：lingxi-memory-write 调用的 memory-write skill 根据 **payload.apply** 决定路径：`apply === "team"` 时写入 `memory/share/`，否则写入 `memory/project/`；门控可提示「项目级 / 团队级」选择。
   - **读取**：`memory-retrieve` 检索 `memory/project/` 与 `memory/share/` 目录，语义+关键词混合检索会自动包含共享记忆；仍无匹配则静默
   - **索引同步**：使用 **memory-govern** Skill（在 Cursor 中输入 `/memory-govern`）做索引同步与治理；由该 Skill 调用脚本删除孤儿行并将未索引 note 交模型补全 INDEX，支持 project 覆盖 share 的冲突优先级规则

### Hooks（sessionStart 记忆注入 + 心跳检查 + 可选审计/门控）

- **sessionStart**（`session-init.mjs`）：在会话开始时注入执行顺序约定（基于 XML 结构的步骤 A/B/C）与 conversation_id 传入约定；并执行**心跳检查**（读 `heartbeat-control.json` 与 transcript 增量索引）。若距上次会话提炼超过 30 分钟且锁可用，则入队待提炼会话并动态注入「会话提炼心跳」约束（作为步骤 A），主 Agent 调用 **lingxi-session-distill** 后台子代理；若距上次 24h 诊断超过 24 小时，则动态注入「自我迭代心跳」约束（步骤 A），调用 **lingxi-self-iterate**。两种心跳均在后台执行，主会话无需等待。不满足触发条件时，步骤 A 在 Prompt 中被省略。
- **不使用 stop hook 的 followup_message 触发沉淀**：该方式会在模型每次响应后显式追加一条 prompt，严重干扰对话；灵犀追求尽可能「静默」执行，沉淀由用户通过 Command（/remember）或**心跳自动会话提炼**触发，而非在每次 stop 时追加系统提示

## 目录结构

```
.cursor/
├── commands/              # 辅助入口（init、remember 等）
│   ├── init.md
│   ├── remember.md
│   └── ...
├── skills/                # 执行逻辑
│   ├── task/
│   ├── vet/
│   ├── plan/
│   ├── build/
│   ├── review/
│   ├── reviewer-doc-consistency/
│   ├── reviewer-security/
│   ├── reviewer-performance/
│   ├── reviewer-e2e/
│   ├── memory-retrieve/
│   └── ...
├── agents/                # Subagents（独立上下文）
│   ├── lingxi-memory-write.md   # 记忆写入
│   ├── lingxi-session-distill.md  # 会话提炼（后台，30min 心跳触发）
│   └── lingxi-self-iterate.md     # 自我迭代（后台，24h 心跳触发）
├── hooks/                 # sessionStart 记忆注入约定 + 心跳检查 + 可选审计/门控
├──.lingxi/
        ├── tasks/                 # 任务文档（统一目录）
        │   ├── 001.task.<标题>.md
        │   ├── 001.plan.<标题>.md
        │   └── ...
        ├── memory/                # 统一记忆系统
        │   ├── INDEX.md           # 统一索引（SSoT）
        │   ├── project/           # 项目级记忆文件（语义+关键词混合检索的主搜索面）
        │   └── share/             # 共享记忆目录（推荐作为 git submodule，跨项目复用）
        └── workspace/             # 工作空间
            ├── audit.log           # 审计日志（NDJSON，含核心事件与可选 Debug 事件，见 plugin-hooks）
            ├── heartbeat-control.json  # 心跳控制：会话提炼（入队、锁、已提炼会话）；自我迭代（last_improvement_cycle_at 用于 24h 触发判断）
            └── heartbeat-transcript-index.json  # transcript 增量索引（mtime + lastProcessedAt）
```

## 工作流顶层设计

### 设计目标

在保持多入口与流程解耦的前提下，将需求从「可判定目标」推进到「可执行实现」再到「可验证交付」：

- 用 `task` 锁定目标、范围、验收标准与架构级决策
- 用 `plan` 细化实施路径并拆解任务，降低 `build` 失败率
- 用 `build` 承接有/无 plan 两种输入，保证简单任务也可直达实现
- 用 `review` 做按需求编号（F）的独立验收审计，形成证据闭环

### 分层契约（task / plan / build / review）

1. **task（架构级）**
   - 产出任务目标、边界、验收标准、验证方式与证据形式
   - 不承载实施级细节，实施细化下沉到 plan

2. **plan（实施级）**
   - 对 task 做实施级方案细化（改动点、依赖、顺序、风险）
   - 产出 `plan + testcase`，建立 `F→T→TC` 映射
   - 为可单测单元建立 `Txa(测试) -> Txb(实现)` 依赖
   - plan 为可选环节；简单任务可跳过

3. **build（执行级）**
   - Plan-driven：按 plan 结构化执行
   - Task-driven（skip-plan）：由 task 直接承接，但必须补齐 testcase 与覆盖校验后再编码
   - 对 `unit/integration` 执行先测后实现闭环

4. **review（验收级）**
   - 按 F 独立判定 Pass/Fail 并给出证据引用
   - 证据缺失或不可验证时对应 F 必须 Fail；总结论不得为通过

### 生命周期（按需推进，不强制串行）

推荐推进顺序：

1. 执行 **task**（如输入 `/task <描述>` 或自然语言）：创建 `001.task.<标题>.md`
2. **vet**（可选）：审查 task 质量
3. **plan**（可选）：生成 `001.plan.<标题>.md` 与 `001.testcase.<标题>.md`
4. **build**（可选）：实现与测试
5. **review**：交付审查与验收结论

工作流特性：

- 所有环节可跳过，按需执行
- 无生命周期状态机与路由中心
- 工作流 Skill 相互解耦，执行入口独立（经 `/task` 等或自然语言触发）

### 多任务特性（Multi-task）

工作流天然支持多任务并行推进，`taskId` 是唯一任务上下文锚点：

- 文档按 `taskId` 命名与隔离：`001.task.*`、`001.plan.*`、`001.testcase.*`、`001.review.*`
- 执行 task/vet/plan/build/review 时可显式指定 `taskId` 在任意任务间切换，不要求单任务串行完成
- 未指定 `taskId` 时可回退到最新任务编号用于便捷操作
- 多任务场景建议显式携带 `taskId`，避免上下文歧义与串线
