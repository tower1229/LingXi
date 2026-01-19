# LíngXī（灵犀）

基于 Cursor 的 Development Workflow

---

## Why（远景）

为创造者打造 AI 时代的专属法宝。

## How（路径）

### 1) 心有灵犀

项目级记忆，让 AI 按你的方式做事。

### 2) AI Native

尊重 AI 能力，预留进化空间。

### 3) 称心如意

降低认知负担，提供友好体验。

---

## What（实现）

- **可伸缩工作流**：可任意组合的开发流程，兼顾工程严谨与轻便快捷，是工作流，也是工具包
- **质量资产化**：过程产物、实践经验自动沉淀，让 AI 不止聪明，还懂你
- **知识整合**：基于自然语言理解实现质量资产主动治理，让知识始终保鲜
- **人工门控**：关键决策始终遵从创造者的指引，相信你拥有真正的判断力、品味和责任感
- **上下文运营**：让模型聚焦关键信息，提高输出质量
- **开箱即用**：跨平台一键安装，使用 `/init` 迅速在现有项目中落地 LingXi Workflow
---

## 安装与快速开始

### 安装

#### 新项目

如果您要创建新项目，推荐直接基于 LíngXī 模板 [创建 GitHub 仓库 ⇗](https://github.com/new?template_name=LingXi&template_owner=tower1229)。

或者，直接到 [LingXi repository](https://github.com/tower1229/LingXi) 下载源码作为本地开发目录。


#### 现有项目

如果您要在已有项目中集成 LíngXī，可以使用安装脚本。

**Linux/macOS/Git Bash**

```bash
curl -fsSL https://raw.githubusercontent.com/tower1229/LingXi/main/install/bash.sh | bash
```

**Windows PowerShell**

```powershell
irm https://raw.githubusercontent.com/tower1229/LingXi/main/install/powershell.ps1 | iex
```

如果 PowerShell 执行失败（执行策略限制），请先运行：

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
irm https://raw.githubusercontent.com/tower1229/LingXi/main/install/powershell.ps1 | iex
```

---

### 快速开始

#### 核心工作流命令

按生命周期顺序使用以下命令完成开发任务：

| 命令 | 用法 | 说明 |
|------|------|------|
| `/req` | `/req <需求描述>`<br><br>**示例**：<br>`/req 添加用户登录功能，支持邮箱和手机号登录`<br>`/req 优化首页加载性能，目标首屏时间 < 1s` | **创建任务文档**<br><br>自动生成任务编号（001, 002...）和标题，创建任务文档：<br>`.cursor/.lingxi/requirements/001.req.<标题>.md`<br><br>这是整个流程的核心文档，包含需求提纯、技术方案等。 |
| `/review-req` | `/review-req 001` | **审查 req 文档（可选）**<br><br>对 req 文档展开多维度审查，用于辅助提升 req 文档质量。可省略，也可以多次执行。<br><br>不产出文件，仅输出审查结果和建议到对话中。 |
| `/plan` | `/plan 001` | **任务规划（可选）**<br><br>基于 req 文档生成任务规划文档和测试用例文档。适用于复杂任务，简单任务可跳过。<br><br>**提示**：可以配合 Cursor 的 plan 模式使用。|
| `/build` | `/build 001` | **执行构建（可选）**<br><br>支持两种模式：<br>- **Plan-driven**：有 plan 文档时，按计划结构化执行（推荐）<br>- **Agent-driven**：无 plan 文档时，Agent 基于 req 自行决策执行 <br><br>**提示**：当使用 plan 模式时，也可以使用规划模式内置的 build 功能，从而跳过灵犀的 `/build` 命令。|
| `/review` | `/review 001` | **审查交付**<br><br>自动进行多维度审查，生成审查报告：<br><br>**核心审查**：功能、测试覆盖、架构、可维护性、回归风险<br><br>**按需审查**：文档一致性、安全性、性能、E2E 测试<br><br>**测试执行**：单元测试、集成测试、端到端测试（如适用） |

#### 辅助工具

| 命令 | 用法 | 说明 |
|------|------|------|
| `/remember` | `/remember <经验描述>`<br><br>**示例**：<br>`/remember 用户是唯一拥有价值判断能力的人`<br>`/remember 吸取刚才这个bug的经验`<br>`/remember 钱包选择问题` | **沉淀经验（随时可用）**<br><br>无需依赖任务编号，可随时沉淀经验到经验库或规则库。<br><br>**使用场景**：<br>- **直接经验表达**：直接陈述经验/原则/判断<br>- **历史提取**：从对话历史中提取刚解决的问题/踩的坑<br>- **提示词定位**：提供关键词帮助定位要提取的内容 |
| `/init` | `/init` | **初始化项目（首次使用）**<br><br>引导式收集项目信息（技术栈、常用模式、开发规则等），建立项目初始经验库。建议首次在现有项目中使用 LingXi 时运行。 |

## 核心组件架构

灵犀基于 Cursor 的 Commands、Skills、Rules、Hooks、Subagents 等机制构建，遵循职责分离和 AI Native 设计原则。

### Commands（命令入口）

Commands 作为纯入口，负责参数解析和调用说明，执行逻辑委托给 Skills。

| 命令 | 职责 | 委托的 Skill |
|------|------|-------------|
| `/req` | 创建任务文档 | `req-executor` |
| `/plan` | 任务规划 | `plan-executor` |
| `/build` | 代码实现 | `build-executor` |
| `/review` | 审查交付 | `review-executor` |
| `/remember` | 经验沉淀 | `experience-depositor` |
| `/init` | 项目初始化 | 多个 Skills 协作 |

### Skills（执行逻辑）

Skills 承载详细的工作流指导，按职责分为：

- **Executor Skills**：执行核心工作流
  - `req-executor`：需求分析、提纯、放大和文档生成
  - `plan-executor`：任务规划、测试设计和文档生成
  - `build-executor`：代码实现、测试编写和执行
  - `review-executor`：多维度审查和交付质量保证

- **经验系统 Skills**：实现"心有灵犀"的核心能力
  - `experience-capture`：自动捕获经验候选（在 req/plan/build/review 阶段自动激活）
  - `experience-depositor`：评估并沉淀经验到经验库或规则库
  - `experience-curator`：智能治理经验（合并/取代关系）
  - `experience-index`：经验索引和匹配，主动提醒风险与指针
  - `candidate-evaluator`：统一评估经验候选的质量和分类决策

- **工具类 Skills**：提供辅助能力
  - `workflow-optimizer`：工作流调优和价值判定
  - `rules-creator`：创建或更新 Cursor Rules
  - `service-loader`：服务上下文加载和考古
  - `write-doc`：文档编写和风格一致性保证
  - `style-fusion`：风格画像提取和融合

### 经验沉淀机制

灵犀的核心能力是自动捕获和沉淀经验，让 AI 具备项目级记忆：

1. **自动捕获**：`experience-capture` 在 req/plan/build/review 阶段自动扫描用户输入，识别经验信号（判断、取舍、边界、约束等），生成 EXP-CANDIDATE
2. **评估沉淀**：`experience-depositor` 评估候选经验的可复用性和沉淀载体适配性，支持存入经验库或规则库
3. **智能治理**：`experience-curator` 自动检测冲突和重复，智能合并或取代，保持知识库的整洁和一致性
4. **主动提醒**：`experience-index` 在执行任务时自动匹配相关经验，主动提醒风险和提供指针

### 其他机制

- **Rules**：系统级约束规则（如 `qs-always-general.mdc`），通过 Cursor Rules 机制自动加载
- **Hooks**：自动化审计和门控（如 `audit-after-shell-execution.mjs`），在关键节点执行检查
- **Subagents**：多维度审查助手（doc-consistency、e2e、performance、security），提供独立的审查上下文
