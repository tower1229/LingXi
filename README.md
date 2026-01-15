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

- **极简入口**：
- **可伸缩工作流**：
- **质量资产化**：持续沉淀过程产物，实时提取质量标准（requirements / experience / rules / skills / hooks）
- **自迭代体系**：支持合并/取代/去噪，让经验库保持精炼；稳定规则可定义为 rules
- **人工门控**：关键阶段推进与关键写入都需要显式确认，边界清晰、责任可追溯
- **上下文运营**：指针优先、按需展开；并按场景触发加载相关经验与提醒，让上下文“少而准”
- **显式沉淀入口**：用 `/remember` 随时把经验写入系统（不依赖某个 REQ），把“刚学到的”立刻变成可复用资产
- **开箱即用**：提供跨平台安装脚本，一键在当前项目落地 `.cursor/` + `.workflow/` 目录骨架

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
