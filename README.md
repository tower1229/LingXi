# LíngXī（灵犀）

基于 Cursor 的 Development Workflow

---

## Why（远景）

为创造者打造 AI 时代的专属法宝。

## How（路径）

### 1) 心有灵犀

持久化记忆，让 AI 按你的方式做事。

### 2) AI Native

尊重 AI 能力，预留进化空间。

### 3) 称心如意

降低认知负担，提供友好体验。

---

## What（实现）

- **可伸缩工作流**：可任意组合的开发流程，兼顾工程严谨与轻便快捷，是工作流，也是工具包
- **持久化记忆库**：将判断与取舍沉淀为可检索记忆，写入前自动治理（合并优先/冲突否决），并在每轮对话前最小注入，让 AI 不止聪明，还懂你
- **人工门控**：关键决策始终遵从创造者的指引，相信你拥有真正的判断力、品味和责任感
- **上下文运营**：让模型聚焦关键信息，减少上下文挤占
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
| `/remember` | `/remember <记忆描述>`<br><br>**示例**：<br>`/remember 用户是唯一拥有价值判断能力的人`<br>`/remember 吸取刚才这个 bug 的经验`<br>`/remember 钱包选择问题` | **写入记忆（随时可用）**<br><br>无需依赖任务编号，可随时把“判断/取舍/排障路径/验证方式”写入记忆库（`memory/notes/`），用于后续每轮的检索注入。<br><br>**使用场景**：<br>- **直接记忆表达**：直接陈述原则/判断<br>- **历史提取**：从对话历史中提取刚解决的问题/踩的坑<br>- **提示词定位**：提供关键词帮助定位要提取的内容 |
| `/init` | `/init` | **初始化项目（首次使用）**<br><br>引导式收集项目信息（技术栈、常用模式、开发规则等），生成并写入初始记忆（`memory/notes/`）。建议首次在现有项目中使用 LingXi 时运行。 |

#### 记忆注入（强保证）

默认启用 Always Apply Rule：`.cursor/rules/memory-injection.mdc`。
它会在**每轮回答前**要求先检索 `memory/notes/` 并做最小注入（无匹配静默，失败可降级继续回答）。

#### 经验共享（跨项目复用：share 目录 + git submodule）

灵犀提供一个硬性约定的共享目录，用于承载“可跨项目复用”的团队经验：

- 共享目录：`.cursor/.lingxi/memory/notes/share/`（建议作为 **git submodule**）

**1) 添加 share 仓库（submodule）**

```bash
git submodule add <shareRepoUrl> .cursor/.lingxi/memory/notes/share
```

**2) 更新 share 仓库**

```bash
git submodule update --remote --merge
```

**3) 同步记忆索引（新增共享经验后执行）**

```bash
npm run memory-sync
```

> `memory-sync` 会递归扫描 `.cursor/.lingxi/memory/notes/**` 并更新 `.cursor/.lingxi/memory/INDEX.md`。

## 相关文档
- [核心组件架构](./docs/design/architecture.md)
