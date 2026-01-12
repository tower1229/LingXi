# cursor-workflow

一个可直接复刻 **Plan → Work → Review → Compound** 闭环的 Cursor 项目模板仓库：以 **单入口 `/flow`** 驱动状态机（可循环、可纠偏）、产物落盘、上下文工程与复合沉淀（复利）。

> 核心理念：上下文工程 + 复合工程 + 工具隐形化（入口极简，但“人工闸门”强控制）

## 安装到现有项目

> **重要**：本工作流依赖 Cursor Nightly 的 Agent Skills 功能（仅 Nightly 渠道可用），详见 [Cursor Agent Skills](https://cursor.com/cn/docs/context/skills) 与 [Agent Skills](https://agentskills.io/home)。

### 方式 1：一键远程安装（推荐）

直接在项目目录中运行以下命令，脚本会自动从 GitHub 下载并安装：

#### Linux/macOS/Git Bash

```bash
curl -fsSL https://raw.githubusercontent.com/tower1229/cursor-workflow/main/install-remote.sh | bash
```

#### Windows PowerShell

```powershell
irm https://raw.githubusercontent.com/tower1229/cursor-workflow/main/install.ps1 | iex
```

#### 如果上述命令失败（需要设置执行策略）

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
irm https://raw.githubusercontent.com/tower1229/cursor-workflow/main/install.ps1 | iex
```

### 方式 2：下载后本地安装

如果不想直接执行远程脚本，也可以先下载：

```bash
# 下载脚本
curl -fsSL https://raw.githubusercontent.com/tower1229/cursor-workflow/main/install-remote.sh -o install.sh
chmod +x install.sh

# 运行脚本
./install.sh
```

### 方式 3：手动复制

如果不想使用脚本，也可以手动复制文件：

1. **复制 `.cursor` 目录**：

   ```bash
   cp -r cursor-workflow/.cursor /path/to/your-project/
   ```

2. **复制 `ai` 目录结构**：

   ```bash
   # 创建目录结构
   mkdir -p ai/requirements/{in-progress,completed}
   mkdir -p ai/context/{business,tech/services,experience,session}
   mkdir -p ai/workspace

   # 复制索引文件
   cp cursor-workflow/ai/requirements/INDEX.md ai/requirements/
   cp cursor-workflow/ai/context/experience/INDEX.md ai/context/experience/
   ```

3. **更新 `.gitignore`**（如果存在）：

   ```gitignore
   # Local workspace for temp code clones, generated artifacts, etc.
   ai/workspace/

   # Session-level context (ephemeral, not a knowledge base)
   ai/context/session/
   ```

### 验证安装

安装完成后，检查以下文件是否存在：

- `.cursor/commands/`（至少包含 `flow.md`）
- `.cursor/rules/`（7 个规则文件）
- `.cursor/hooks.json`（Hooks 配置：门控 + 候选沉淀确认）
- `.cursor/skills/`（Agent Skills：Nightly）
- `ai/requirements/INDEX.md`
- `ai/context/experience/INDEX.md`

## 你能得到什么

- **单入口命令**：`/flow <REQ|描述>`（内部状态机路由 + 循环选项 + 人工闸门）
- **产物落盘**：每一步输出写入固定目录，形成可交接、可回放、可复用的状态文件
- **上下文工程**：只沉淀"最小高信号"上下文（概要 + 指针），避免文档膨胀
- **复合沉淀（复利）**：把踩坑/流程/可自动化拦截点转为 `ai/context/` 资产，让下一次更快
- **候选沉淀确认（Hooks）**：检测到“复利候选”后自动弹出确认（你确认后才会写入 `ai/context/experience/`）
- **经验自动加载**：在 `/flow` 进入任一阶段前自动检索匹配历史经验（experience-index）
- **结构化状态文件**：状态文件包含当前阶段、下一步动作、阻塞项等信息，便于 Subagent 快速理解状态
- **阶段性笔记保存**：Work 阶段支持阶段性保存 checkpoint，避免上下文占满，支持长时间任务和跨会话恢复
- **Context7 集成**：在 Plan 和 Work 阶段自动查询技术文档，确保实现的准确性和最佳实践

> **输出质量如何保证？** `/flow` 不会把原先分散在各命令里的“高质量提示词/模板”丢掉：这些内容被保留在 `.cursor/commands/{req,audit,plan,work,review,compound}.md` 作为阶段 Playbook，`/flow` 进入对应阶段时必须遵循。

## 快速开始（建议路径）

### 1) 用 `/flow` 创建或继续需求

在 Cursor 中运行：

```
/flow <需求描述>
```

或者继续已有需求：

```
/flow REQ-xxx
```

`/flow` 会在每一轮结束输出一个“循环选项菜单”（人工闸门），你可以反复 audit/plan/work/review，直到满意再推进。

### 2) Hooks 自动发现候选沉淀（但写入必须确认）

当系统在输出中检测到“复利候选（Compounding Candidates）”时，会自动弹出确认提示。

你需要继续使用单入口 `/flow` 来确认：

```
/flow 沉淀 1,3
/flow 沉淀 全部
/flow 忽略沉淀
```

## 目录结构（位置即语义）

```
.
├── .cursor/
│   ├── commands/                 # 单入口命令：/flow
│   ├── rules/                    # 工作流规则与编码规范（自动生效）
│   └── hooks.json                # Hooks：门控 + 候选沉淀确认
├── ai/
│   ├── requirements/             # 需求产物（索引/进行中/已完成）
│   │   ├── INDEX.md              # 状态索引（包含当前阶段、下一步动作、阻塞项）
│   │   ├── in-progress/
│   │   └── completed/
│   ├── context/                  # 长期上下文（业务/技术/经验）
│   │   ├── business/
│   │   ├── tech/
│   │   │   └── services/
│   │   ├── experience/
│   │   └── session/              # 会话临时信息（checkpoint、临时笔记等）
│   └── workspace/                # 临时工作区（默认忽略）
```

## 核心规则（务必读一遍）

- `.cursor/rules/workflow.mdc`
- `.cursor/rules/development-specifications.mdc`

## Skill 型 rules（能力库）

本模板把可复用流程拆成 **skill rules**（模拟原文的 Skills）。Commands 只负责入口与路由，Skill rules 负责“如何落盘/如何约束/如何回写索引”：

- `.cursor/rules/skill-index-manager.mdc`：索引与状态（SSoT）
- `.cursor/rules/skill-experience-depositor.mdc`：Experience 沉淀与索引
- `.cursor/rules/skill-experience-index.mdc`：经验自动检索与加载（在需求分析/方案设计/代码编写前自动匹配与提醒）
- `.cursor/rules/skill-context-engineering.mdc`：最小高信号上下文原则
