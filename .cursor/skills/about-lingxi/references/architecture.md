# 灵犀架构概览

## 概述

灵犀基于 Cursor 的 Commands、Skills、Hooks、Subagents 等机制构建，遵循职责分离和 AI Native 设计原则。

## What（实现）

灵犀通过以下方式实现核心价值：

- **可伸缩工作流**：可任意组合的开发流程，兼顾工程严谨与轻便快捷，是工作流，也是工具包
- **质量资产化**：过程产物、实践经验自动沉淀，让 AI 不止聪明，还懂你
- **知识整合**：基于自然语言理解实现质量资产主动治理，让知识始终保鲜
- **人工门控**：关键决策始终遵从创造者的指引，相信你拥有真正的判断力、品味和责任感
- **上下文运营**：让模型聚焦关键信息，提高输出质量
- **开箱即用**：跨平台一键安装，使用 `/init` 迅速在现有项目中落地 LingXi Workflow

## 核心组件

### Commands（命令入口）

Commands 作为纯入口，负责参数解析和调用说明，执行逻辑委托给 Skills。

| 命令 | 职责 | 委托的 Skill |
|------|------|-------------|
| `/req` | 创建任务文档（自动生成任务编号和标题） | `req-executor` |
| `/review-req` | 审查 req 文档（可选，可多次执行，不产出文件） | - |
| `/plan` | 任务规划（可选，适用于复杂任务） | `plan-executor` |
| `/build` | 执行构建（可选，支持 Plan-driven 和 Agent-driven 两种模式） | `build-executor` |
| `/review` | 审查交付（核心审查和按需审查，测试执行） | `review-executor` |
| `/remember` | 沉淀经验（随时可用，无需依赖任务编号） | `experience-depositor` |
| `/init` | 初始化项目（首次使用，引导式收集项目信息） | 多个 Skills 协作 |

**特性**：
- 多入口设计：所有命令独立执行，不依赖前一阶段完成
- 流程解耦：所有环节可跳过，按需执行
- 手动指定任务编号：除 `/req` 外所有命令必须手动指定任务编号（001, 002, ...）

### Skills（执行逻辑）

Skills 承载详细的工作流指导，按职责分为：

#### Executor Skills（执行核心工作流）
- `req-executor`：需求分析、提纯、放大和文档生成
- `plan-executor`：任务规划、测试设计和文档生成
- `build-executor`：代码实现、测试编写和执行
- `review-executor`：多维度审查和交付质量保证

#### 记忆系统 Skills（实现"心有灵犀"的核心能力）
- `experience-capture`：由 stop hook 触发，扫描对话历史识别经验信号，生成经验候选并执行评估，在会话中展示候选供用户选择
- `experience-depositor`：从会话上下文获取候选，执行治理（合并/取代，使用语义搜索 + 关键词匹配）并沉淀经验到记忆库（团队级标准/经验或项目级经验）
- `memory-index`：统一索引和匹配，支持跨维度匹配（Experience/Tech/Business），主动提醒风险与指针

#### 工具类 Skills（提供辅助能力）
- `about-lingxi`：快速了解灵犀的背景知识、架构设计和核心机制，提供调优指导、价值判定和评价准则
- `service-loader`：服务上下文加载和考古
- `write-doc`：文档编写和风格一致性保证
- `style-fusion`：风格画像提取和融合

### 经验沉淀机制

灵犀的核心能力是自动捕获和沉淀经验，让 AI 具备项目级记忆：

1. **stop hook 触发**：任务完成时，stop hook 引导调用 `experience-capture` skill

2. **经验捕获和评估**：`experience-capture` 扫描整个对话历史，识别经验信号（判断、取舍、边界、约束等），生成 EXP-CANDIDATE，执行评估（结构完整性、判断结构质量、可复用性、知识可获得性、经验类型、Level 判断），在会话中展示候选供用户选择

3. **沉淀分流**：用户选择候选后，`experience-depositor` 从会话上下文获取候选，执行治理并沉淀到：
   - 团队级标准（`memory/experience/team/standards/`）：强约束、执行底线
   - 团队级经验（`memory/experience/team/knowledge/`）：复杂判断、认知触发
   - 项目级经验（`memory/experience/project/`）：项目特定、长期复用

4. **智能治理**：`experience-depositor` 使用语义搜索 + 关键词匹配双重验证，自动检测冲突和重复，智能合并或取代，统一更新 `memory/INDEX.md`，保持知识库的整洁和一致性

5. **主动提醒**：`memory-index` 在执行任务时根据命令自动匹配相关记忆（`/init` → Experience Level=team，`/req`/`/plan`/`/build`/`/review` → 所有维度），支持跨维度匹配（Experience/Tech/Business），主动提醒风险和提供指针

### Hooks（自动化审计和门控）

- `audit-after-shell-execution.mjs`：在关键节点执行检查
- `stop.mjs`：任务完成时引导调用 `experience-capture` skill 进行经验捕获

### Subagents（多维度审查助手）

- `reviewer-doc-consistency`：文档一致性审查
- `reviewer-e2e`：端到端测试审查
- `reviewer-performance`：性能审查
- `reviewer-security`：安全审查

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
│   ├── plan-executor/
│   ├── experience-capture/
│   └── ...
├── hooks/                 # 自动化审计和门控
│   └── audit-after-shell-execution.mjs
└── agents/                # 多维度审查助手
    └── reviewer-*.md

.cursor/.lingxi/
├── requirements/          # 任务文档（统一目录）
│   ├── 001.req.<标题>.md
│   ├── 001.plan.<标题>.md
│   └── ...
├── memory/                # 统一记忆系统
│   ├── INDEX.md           # 统一索引（SSoT）
│   ├── experience/        # 经验记忆
│   │   ├── team/          # 团队级标准和经验
│   │   │   ├── standards/
│   │   │   └── knowledge/
│   │   └── project/       # 项目级经验
│   ├── tech/              # 技术记忆
│   │   └── services/      # 服务上下文
│   └── business/          # 业务记忆
│       └── references/    # 业务上下文参考资料
├── style-fusion/          # 风格融合数据
└── workspace/             # 工作空间
    └── processed-sessions.json  # 会话去重记录
```

## 工作流生命周期

### 需求推进流程

1. `/req <描述>`：创建任务文档（自动生成任务编号和标题，产出：`001.req.<标题>.md`）
2. `/review-req 001`（可选）：审查 req 文档（可多次执行，不产出文件，仅输出审查结果和建议到对话中）
3. `/plan 001`（可选）：任务规划（基于 req 文档生成任务规划文档和测试用例文档，适用于复杂任务，简单任务可跳过）
4. `/build 001`（可选）：执行构建（支持两种模式：Plan-driven 有 plan 文档时按计划结构化执行，Agent-driven 无 plan 文档时 Agent 基于 req 自行决策执行）
5. `/review 001`：审查交付（自动进行多维度审查，生成审查报告，包含核心审查和按需审查）

**特性**：
- 所有环节可跳过，按需执行
- 无生命周期管理，无状态路由
- 每个命令独立执行，不依赖前一阶段完成

### 经验沉淀流程

1. 任务完成时，stop hook 引导调用 `experience-capture` skill
2. `experience-capture` 扫描对话历史，识别经验信号并生成 EXP-CANDIDATE，执行评估，在会话中展示候选
3. 用户选择要沉淀的候选（输入编号，如 `1,3` 或 `全部`）
4. `experience-depositor` 从会话上下文获取候选，执行治理（使用语义搜索 + 关键词匹配）并沉淀
5. 写入经验到 `.cursor/.lingxi/memory/experience/`
6. 更新统一索引 `memory/INDEX.md`
7. `experience-depositor` 写入前执行最终治理检查（合并/取代）

## 参考

- **核心组件架构**：`docs/design/architecture.md`
- **2.0 重构方案**：`docs/prd/lingxi-2.0-refactor.md`
- **工作流生命周期**：`.cursor/.lingxi/memory/business/workflow-lifecycle.md`
