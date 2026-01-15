# cursor-workflow（灵犀）

为创造者打造 AI 时代的专属法宝。

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

## What（我们做了什么）

What 不是"如何使用"，而是：为了通过 How 实现 Why，我们把系统做成了什么样子（设计目标、功能规划与工程原则）。

### 0) 系统形态（我们把什么做成了资产）

- **单入口协议**：`/flow <REQ-xxx | 需求描述>`
- **分层资产（位置即语义）**：
  - **requirements**：需求与执行账本（`.workflow/requirements/`，含 INDEX SSoT）
  - **experience**：长期判断资产（可治理、可演化）（`.workflow/context/experience/`）
  - **rules / skills**：质量表达与流程能力资产（`.cursor/rules/`、`.cursor/skills/`）
  - **hooks**：门控与提醒（`.cursor/hooks/`、`.cursor/hooks.json`）

### 1) 质量资产管理（沉淀 + 治理 + 升级）

- **即时捕获 + 确认式沉淀**：过程里结构化捕获经验候选，先暂存，必须经创造者确认才进入长期资产（confirm-only）。
- **沉淀分流（ROI 优先）**：同一候选进入最合适载体：经验 / 规则 / Skill / 长期上下文。
- **治理与升级**：合并/取代/谱系保持资产精炼，并将高频判断升级为更强的质量表达（规则/门控等，需人工采纳）。

### 2) 人工门控（让魂在场）

- **阶段推进门控**：req → plan → audit → work → review → archive 的推进需人工确认，避免静默漂移。
- **写入门控**：经验写入与质量准则采纳都必须显式确认，责任边界清晰、可追溯。

### 3) 上下文运营（最小高信号上下文）

- **指针优先、按需展开**：优先文件/函数/配置等指针，避免一次性灌入长上下文导致偏航。
- **触发加载**：按场景触发加载相关历史经验与关键提醒，使上下文"少而准"。

### 4) 能力下沉与可演进架构（为 AI 进化留空间）

- **Skills-first**：把阶段 Playbook（模板/清单/写入规范）下沉为 Skills，避免硬编码在主命令里，便于演进与复用。
- **AI Native 取向**：优先依赖模型的语义理解与综合推理，让流程约束可演进、可退场（而质量资产长存）。
- **（待实现）**：反馈闭环与有效性评估（让"这些质量资产是否真的带来收益"可被验证）。

---

## 使用（安装与快速开始）

### 安装

从 GitHub 下载并安装到当前项目，无需克隆仓库。

**Linux/macOS/Git Bash**

```bash
curl -fsSL https://raw.githubusercontent.com/tower1229/cursor-workflow/main/install-remote.sh | bash
```

**Windows PowerShell**

```powershell
irm https://raw.githubusercontent.com/tower1229/cursor-workflow/main/install.ps1 | iex
```

如果 PowerShell 执行失败（执行策略限制），请先运行：

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
irm https://raw.githubusercontent.com/tower1229/cursor-workflow/main/install.ps1 | iex
```

> **注意**：安装脚本会在当前项目目录创建 `.cursor/` 和 `.workflow/` 目录结构。如果这些目录已存在，脚本会提示是否覆盖。

---

### 快速开始

#### 1) 开始一个需求

在 Cursor 输入：

```
/flow <一句话需求描述>
```

也可以继续已有需求或自动查找进行中的任务：

```
/flow REQ-xxx    # 继续指定需求
/flow            # 自动查找并继续进行中的任务
```

#### 2) 沉淀经验

使用 `/remember` 命令随时沉淀经验，无需依赖 REQ-xxx：

```
/remember 用户是唯一拥有价值判断能力的人
/remember 吸取刚才这个bug的经验
/remember 钱包选择问题
```

**使用场景**：

- **直接经验表达**：直接陈述经验/原则/判断
- **历史提取**：从对话历史中提取刚解决的问题/踩的坑
- **提示词定位**：提供关键词帮助定位要提取的内容

## 更多文档（维护者入口）

- 文档总览：[docs/00-README.md](docs/00-README.md)
- Why/How（归档）：[docs/01-concepts/why-how.md](docs/01-concepts/why-how.md)
- 价值观 SSoT：[docs/01-concepts/lingxi-charter.md](docs/01-concepts/lingxi-charter.md)
- 分层映射（价值观 → 设计原则 → 工程手段）：[docs/01-concepts/principle-ladder.md](docs/01-concepts/principle-ladder.md)
- 设计原则与硬约束：[docs/01-concepts/key-principles.md](docs/01-concepts/key-principles.md)
