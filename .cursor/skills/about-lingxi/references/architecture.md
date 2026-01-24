# 灵犀架构概览

## 概述

灵犀基于 Cursor 的 Commands、Skills、Rules 等机制构建，遵循职责分离和 AI Native 设计原则。

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
| `/remember` | 写入记忆（随时可用，无需依赖任务编号） | `memory-curator` |
| `/init` | 初始化项目（首次使用，引导式收集项目信息并生成连续编号的记忆候选清单，需用户门控写入） | `init-executor`（主）；按需协作：`memory-capture` / `memory-curator` |

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
- `init-executor`：项目初始化（分类型收集清单 → 连续编号候选清单 → 用户门控后可选写入）

#### 记忆系统 Skills（实现"心有灵犀"的核心能力）
- `memory-retrieve`：每轮回答前检索 `memory/notes/` 并最小注入（由 Always Apply Rule 强保证触发）
- `memory-capture`：尽力而为捕获对话中的判断/取舍/边界/排障路径，生成记忆候选供用户选择写入
- `memory-curator`：写入前自动治理（合并优先/冲突否决），写入 `memory/notes/` 并更新 `memory/INDEX.md`

#### 工具类 Skills（提供辅助能力）
- `about-lingxi`：快速了解灵犀的背景知识、架构设计和核心机制，提供调优指导、价值判定和评价准则
- `write-doc`：文档编写和风格一致性保证
- `style-fusion`：风格画像提取和融合

#### 审查类 Skills（Review 阶段专用）
- `reviewer-doc-consistency`：文档一致性审查
- `reviewer-security`：安全审查
- `reviewer-performance`：性能审查
- `reviewer-e2e`：端到端测试审查

### 记忆库机制（Memory-first）

灵犀的核心能力是自动捕获与治理记忆，并在每一轮对话前进行最小注入：

1. **强保证注入**：通过 Always Apply Rule（`.cursor/rules/memory-injection.mdc`）要求每轮先执行 `memory-retrieve`
2. **尽力而为捕获**：`memory-capture` 识别对话中的“判断/取舍/边界/排障路径”，生成候选并展示给用户
3. **写入前治理**：`memory-curator` 对新候选做语义近邻 TopK 治理（合并优先、冲突否决/取代），并更新 `memory/INDEX.md`

### Hooks（自动化审计和门控）
（可选机制）

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
│   ├── build-executor/
│   ├── review-executor/
│   ├── reviewer-doc-consistency/
│   ├── reviewer-security/
│   ├── reviewer-performance/
│   ├── reviewer-e2e/
│   ├── memory-retrieve/
│   ├── memory-capture/
│   ├── memory-curator/
│   └── ...
├── rules/                 # Rules（可用作强保证触发器）
│   ├── memory-injection.mdc
└── hooks/                 # 自动化审计和门控

.cursor/.lingxi/
├── requirements/          # 任务文档（统一目录）
│   ├── 001.req.<标题>.md
│   ├── 001.plan.<标题>.md
│   └── ...
├── memory/                # 统一记忆系统
│   ├── INDEX.md           # 统一索引（SSoT）
│   ├── notes/             # 扁平记忆文件（语义检索的主搜索面）
│   └── references/        # 模板与规范
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

### 记忆写入流程

1. `memory-capture`（尽力而为）生成候选并展示
2. 用户通过 `/remember ...` 或 `/remember 1,3` 选择要写入的候选/内容
3. `memory-curator` 执行写入前治理（merge/replace/new/veto）
4. 写入 `memory/notes/` 并更新 `memory/INDEX.md`

## 参考

- **核心组件架构**：`docs/design/architecture.md`
- **2.0 重构方案**：`docs/prd/lingxi-2.0-refactor.md`
- **工作流生命周期**：`.cursor/.lingxi/memory/notes/MEM-workflow-lifecycle.md`
