[English](./README.md)

# LíngXī（灵犀）

**一个面向 Codex 的工程工作流产品：把模糊需求整理成可执行任务，在动手前完成高质量审查，并把团队稳定的工程判断沉淀成可复用记忆。**

LingXi 2.0 已完成当前产品范围内的实现并可发布。

LingXi 刻意把表层做得很小：

- `task`：把模糊请求整理成工程师可直接执行的任务文档
- `vet`：在实现前挑战任务质量，提前暴露风险
- `memory`：在后台沉淀可复用的工程偏好，并在有意义的仓库对话里应用这些判断

Cursor 时代的仓库内容已经从主树中移除，相关退役记录保留在 [Cursor 时代资产分层](./docs/cursor-era-asset-classification.md)。

## 为什么是 LingXi

很多 AI 工作流擅长“快速生成”，但不擅长“长期保持标准”。

LingXi 的重点不是多给一点输出，而是让工作在开始前就更像一份高质量技术交付：

- 把模糊需求收敛成边界清晰、可以开工的任务
- 提前发现隐藏风险、薄弱验收标准和空泛表述
- 把稳定的工程偏好沉淀下来，而不是每次会话都重新解释
- 让输出保持结构化、可审查、可验证，而不只是自然语言看起来合理

## 你会得到什么

- **Codex-native 插件表层**：[`.codex-plugin/plugin.json`](./.codex-plugin/plugin.json)
- **可见工作流**：[`skills/task/`](./skills/task/) 和 [`skills/vet/`](./skills/vet/)
- **持久记忆核心**：[`skills/memory-retrieve/`](./skills/memory-retrieve/)、[`skills/memory-write/`](./skills/memory-write/)、[`skills/session-distill/`](./skills/session-distill/)
- **项目本地运行时**：`.lingxi/`
- **后台 distill agent 模板**：[`templates/agents/lingxi-session-distill.toml.tmpl`](./templates/agents/lingxi-session-distill.toml.tmpl)
- **确定性 setup / runtime 辅助脚本**：[`scripts/`](./scripts/)

## 工作方式

1. 把 LingXi 安装到目标仓库。
2. 运行 setup，生成项目本地运行时和后台 agent 配置。
3. 用 `task` 生成强约束、可执行的任务文档。
4. 用 `vet` 在实现前挑战任务质量。
5. 让 `session-distill` 持续把工程判断沉淀进项目记忆。

在 Codex 运行时里，会话提炼现在走“确定性 selector + runner”路径：

- 由 Codex 专用 adapter 发现并过滤 session artifact
- 由 `node scripts/lx-distill-sessions.mjs` 编排整批扫描
- `skills/session-distill/scripts/distill-session.mjs` 继续只负责单个 session 的 durable memory 提炼

表层很克制，但底层会随着项目使用不断积累质量。

在 LingXi 里，`task` 和 `vet` 是显式工作流，而 memory 是全局上下文层。它不应该只服务于工作流命令，也应该提升普通实现、调试、分析和评审对话的质量。

## 安装

远程安装脚本会直接分发当前受支持的 LingXi 2.0 表层：

- `.codex-plugin/plugin.json`
- `skills/`
- `scripts/`
- `templates/`
- 生成到目标仓库中的 `.lingxi/` 与 `.codex/agents/`

### 远程安装脚本

请在**目标仓库根目录**执行以下任一命令。

**Linux / macOS / Git Bash**

```bash
curl -fsSL https://raw.githubusercontent.com/tower1229/LingXi/main/install/bash.sh | bash
```

**Windows PowerShell**

```powershell
irm https://raw.githubusercontent.com/tower1229/LingXi/main/install/powershell.ps1 | iex
```

### 本地 Bootstrap

如果你要让 LingXi 的记忆沉淀与提取循环真正闭环，本地必须执行：

```bash
node scripts/lx-bootstrap.mjs
```

这是必需步骤。它会同时：

- `.lingxi/`
- `.codex/agents/lingxi-session-distill.toml`
- `.lingxi/setup/automation.session-distill.toml`
- 在 Codex 中注册 session-distill 自动化任务

生成出来的 Codex automation 与 agent 属于 LingXi memory core 之上的 runtime adapter。它们应当启动确定性 distill runner，而不是手工挑选会话。

如果不注册自动化，LingXi 的后台记忆沉淀循环实际上并没有闭环。

### 底层命令

如果你只是为了调试或检查中间产物，也可以拆开执行：

```bash
node scripts/lingxi-setup.mjs
node scripts/lx-create-automation.mjs
node scripts/lx-distill-sessions.mjs
node scripts/lx-memory-brief.mjs --prompt "当前请求"
```

或者直接执行：

```bash
npm run lx:bootstrap
```

## 当前产品范围

LingXi 2.0 是刻意收敛的产品。

当前正式支持：

- `task`
- `vet`
- `memory-retrieve`
- `memory-write`
- `session-distill`

当前不打算做成：

- 一个范围很宽的多阶段工作流套件
- 每轮对话都强插入的重型实时分析
- 永久保留的 Cursor 兼容层

## 质量理念

LingXi 从一开始就不是“先把范围铺开再慢慢补质量”的路线，而是：

- 该稳定的地方，用强约束和确定性合同来兜住
- 该输出清晰的地方，优先可读、可审、可验证
- 该长期积累的地方，把工程判断沉淀成记忆而不是临时对话
- 与其做一个很宽但很松的产品，不如先做一个很窄但可信的产品

当前 2.0 的发布状态和设计基线见：

- [架构文档](./docs/architecture.md)
- [Roadmap](./docs/lingxi-2-roadmap.md)
- [质量标准](./docs/quality-baseline.md)
- [Phase 5/6 收口计划](./docs/phase-5-6-closure-plan.md)
- [记忆质量深化状态](./docs/memory-quality-deepening-status.md)

## 开发

运行当前受支持产品面的测试套件：

```bash
npm test
```

在 LingXi 里，“当前产品测试全绿”与“产品表层一致性”都属于发布门槛。
