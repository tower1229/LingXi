# cursor-workflow

让 AI workflow 具备“项目级成长能力”。

---

## Why（为什么要用）

你可能已经在用 AI 写代码，但经常会遇到：

- **同类问题反复发生**：同一类坑/风险不断出现，AI 每次都像第一次遇到。
- **判断不稳定**：今天建议 A，明天建议 B，很难形成“这个项目里我们长期相信的判断”。
- **过程知识难沉淀**：排查路径、验证方式、关键取舍只存在于当次对话里。
- **重复任务不变快**：每次会话都从零开始，同样的任务做 100 次所需要的时间差不多。

这个 workflow 的目标是：让 AI 可以在项目工作中积累经验，并把经验提炼为 **可复用的质量准则**，从而获得长期的成长性。

---

## How（怎么实现成长性）

我们不靠“训练模型”，靠机制设计。
核心是三件事：怎么提取经验、怎么治理经验、怎么把经验升级为判断标准。

### 1) 经验提取：自动捕获 + 人工确认

- 自动收集候选：在工作过程中持续产出“复利候选”，避免靠人记得总结。
- 候选先暂存：先把信息留在“项目记录”里，不直接进入长期经验库。
- 人工确认沉淀：只有你明确执行 `/flow 沉淀 ...`，候选才会进入长期经验库。

这套机制的分工是：机器负责不漏，人负责不滥。

### 2) 经验治理：让经验会演化，而不是无限堆积

- 经验不是“越记越多的条目”，而是一组会演化的判断单元。
- 新经验允许覆盖旧经验，但旧经验不会被删除，会保留可追溯关系。
- 经验会被持续整理：合并重复、取代过时、让经验库保持精炼。
- 写入长期经验时，强调“如何判断”，而不是“步骤复现”。

目标不是“记得越来越多”，而是“判断越来越准”。

### 3) 质量准则：从判断中长出来

- 经验是“我学到了什么”。
- 质量准则是“我以后愿意长期复用什么判断”。
- 系统会给出质量准则建议草案，你决定采纳与否。

---

## What（怎么用）

它表现为：

- 一个单入口工作流：`/flow <REQ-xxx | 需求描述>`
- 一套分层产物：
  - requirements：需求状态与执行账本
  - experience：长期判断资产（可治理、可演化）
  - rules / skills：被采纳的质量准则与流程能力
  - hooks：把高频错误自动拦住

### 1) 安装

**Linux/macOS/Git Bash**

```bash
curl -fsSL https://raw.githubusercontent.com/tower1229/cursor-workflow/main/install-remote.sh | bash
```

**Windows PowerShell**

```powershell
irm https://raw.githubusercontent.com/tower1229/cursor-workflow/main/install.ps1 | iex
```

如果 PowerShell 执行失败：

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
irm https://raw.githubusercontent.com/tower1229/cursor-workflow/main/install.ps1 | iex
```

### 2) 开始一个需求

在 Cursor 输入：

```
/flow <一句话需求描述>
```

### 3) 沉淀经验

当系统提示“检测到复利候选”时，选择：

```
/flow 沉淀 1,3
/flow 沉淀 全部
/flow 忽略沉淀
```

沉淀时你需要过一道“成长过滤器”：

- 一年后，在完全不同的项目里，这条经验还能否帮助我提前做出正确判断？
  - 否：留在项目记录（session / worklog）
  - 是：进入 experience（长期判断资产）

写入 experience 时，不写“步骤复现”，写“如何判断”：

- 我察觉到什么信号？
- 我担心的风险是什么？
- 我最终依赖的决定性变量是什么？

### 4) 采纳质量准则

当系统给出“质量准则建议”时，选择：

```
/flow 采纳质量准则 1,3
/flow 忽略质量准则
```

### 5) 去哪里看结果

- 需求过程：`.workflow/requirements/`
- 经验库：`.workflow/context/experience/`
- 质量准则（可复用）：`.cursor/rules/qs-*`（参考 `.workflow/context/tech/quality-standards-index.md`）

