# LíngXī（灵犀）

基于 Cursor 的 Development Workflow

---

## Why（远景）

为创造者打造 AI 时代的专属法宝。

## How（路径）

### 1) 心有灵犀

灵犀会记住你的指引，并在未来按你的方式做事。

### 2) AI Native

灵犀尊重 AI 作为能力源泉，并持续为其进化预留空间。

### 3) 称心如意

灵犀追求最好的 AI 驱动体验，助你所求称心，所行如意。

---

## What（实现）

- **可伸缩工作流**：无状态、任意组合、可并行的工作流，兼顾工程严谨与轻便快捷
- **质量资产化**：过程产物、经验库、规则库自动沉淀，让 AI 不止聪明，还懂你
- **知识整合**：基于大模型自然语言理解，实现质量资产主动治理，让知识始终保鲜
- **人工门控**：关键决策遵从创造者的指引，相信你拥有真正的判断力、品味和责任感
- **上下文运营**：智能匹配相关经验，让模型聚焦关键信息，提高输出质量
- **开箱即用**：跨平台一键安装，使用 `/init` 迅速在现有项目中落地 LingXi Workflow
---

## 安装与快速开始

### 安装

#### 新项目：使用 LingXi 模板

如果您要创建一个新项目，推荐直接基于 LíngXī [创建 GitHub 仓库 ⇗](https://github.com/new?template_name=LingXi&template_owner=tower1229)。

或者，直接到 [LingXi repository](https://github.com/tower1229/LingXi) 下载源码作为本地开发目录。


#### 现有项目：一键安装

如果您要在已有项目中集成 LíngXī，可以使用远程安装脚本，无需克隆仓库。

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
| `/review` | `/review 001` | **审查交付**<br><br>自动进行文档一致性、安全性、性能等多维度审查，生成审查报告。 |

#### 辅助工具

| 命令 | 用法 | 说明 |
|------|------|------|
| `/remember` | `/remember <经验描述>`<br><br>**示例**：<br>`/remember 用户是唯一拥有价值判断能力的人`<br>`/remember 吸取刚才这个bug的经验`<br>`/remember 钱包选择问题` | **沉淀经验（随时可用）**<br><br>无需依赖任务编号，可随时沉淀经验到经验库或规则库。<br><br>**使用场景**：<br>- **直接经验表达**：直接陈述经验/原则/判断<br>- **历史提取**：从对话历史中提取刚解决的问题/踩的坑<br>- **提示词定位**：提供关键词帮助定位要提取的内容 |
| `/init` | `/init` | **初始化项目（首次使用）**<br><br>引导式收集项目信息（技术栈、常用模式、开发规则等），建立项目初始经验库。建议首次在现有项目中使用 LingXi 时运行。 |


