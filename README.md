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

- **可伸缩工作流**：可灵活组合的并行任务系统（req→plan→audit→work→review→archive），兼顾工程严谨与轻便快捷
- **极简入口**：一个命令(`/flow`)驱动任务全生命周期，降低认知负担，统一体验
- **质量资产化**：持续沉淀过程产物，全自动或使用 `/remember` 沉淀实践经验，（requirements / experience / rules / skills / hooks）
- **知识治理体系**：发挥大模型的自然语言理解优势，实现经验主动治理，让经验库始终保鲜
- **人工门控**：灵犀始终遵从创造者的指引，相信你拥有真正的判断力、品味和责任感
- **上下文运营**：指针优先、按需展开；并按场景触发加载相关经验与提醒，让上下文“少而准”
- **开箱即用**：跨平台一键安装，使用 `/init` 迅速在当前项目落地 LinkXi Workflow
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
curl -fsSL https://raw.githubusercontent.com/tower1229/LingXi/main/install-remote.sh | bash
```

**Windows PowerShell**

```powershell
irm https://raw.githubusercontent.com/tower1229/LingXi/main/install.ps1 | iex
```

如果 PowerShell 执行失败（执行策略限制），请先运行：

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
irm https://raw.githubusercontent.com/tower1229/LingXi/main/install.ps1 | iex
```

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
