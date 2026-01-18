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

- **可伸缩工作流**：可组合、可并行的任务系统，兼顾工程严谨与轻便快捷
- **质量资产化**：过程产物、经验库、规则库自动沉淀，越用越聪明，越用越懂你
- **知识整合**：基于大模型自然语言理解，实现质量资产主动治理，让知识始终保鲜
- **人工门控**：灵犀始终遵从创造者的指引，相信你拥有真正的判断力、品味和责任感
- **上下文运营**：智能匹配相关经验，让模型聚焦关键信息，提高输出质量
- **开箱即用**：跨平台一键安装，使用 `/init` 迅速在现有项目中落地 LingXi Workflow
---

## 安装与快速开始

### 安装

#### 新项目：使用 LingXi 模板

如果您要创建一个新项目，推荐直接基于 LíngXī [创建 GitHub 仓库 ⇗](https://github.com/new?template_name=LingXi&template_owner=tower1229)。

或者，直接到 [LingXi repository](https://github.com/tower1229/LingXi) 下载源码作为本地开发目录。

这种方式可以确保项目从一开始就拥有完整的 LíngXī 工作流结构。

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

#### 1) 初始化项目（首次使用）

如果是首次在现有项目中使用 LingXi，建议先运行初始化命令：

```
/init
```

这会引导你收集项目信息（技术栈、常用模式、开发规则等），建立项目初始经验库。

#### 2) 开始一个需求

使用 `/req` 命令创建造物计划：

```
/req <需求描述>
```

**示例**：
```
/req 添加用户登录功能，支持邮箱和手机号登录
/req 优化首页加载性能，目标首屏时间 < 1s
```

命令会自动生成任务编号（001, 002...）和标题，创建造物计划文档：`.cursor/.lingxi/requirements/001.req.<标题>.md`

#### 3) 任务规划（可选）

对于复杂任务，可以使用 `/plan` 命令进行详细规划：

```
/plan 001
```

这会基于 req 文档生成任务规划文档和测试用例文档。

#### 4) 执行构建

使用 `/build` 命令实现功能：

```
/build 001
```

支持两种模式：
- **Plan-driven**：有 plan 文档时，按计划结构化执行（推荐）
- **Agent-driven**：无 plan 文档时，Agent 基于 req 自行决策执行

#### 5) 审查交付

使用 `/review` 命令进行多维度审查：

```
/review 001
```

会自动进行文档一致性、安全性、性能等多维度审查，生成审查报告。

#### 6) 沉淀经验（随时可用）

使用 `/remember` 命令随时沉淀经验，无需依赖任务编号：

```
/remember 用户是唯一拥有价值判断能力的人
/remember 吸取刚才这个bug的经验
/remember 钱包选择问题
```

**使用场景**：

- **直接经验表达**：直接陈述经验/原则/判断
- **历史提取**：从对话历史中提取刚解决的问题/踩的坑
- **提示词定位**：提供关键词帮助定位要提取的内容


