## 核心组件架构

灵犀基于 Cursor 的 Commands、Skills、Hooks 等机制构建，遵循职责分离和 AI Native 设计原则。

### Commands（命令入口）

Commands 作为纯入口，负责参数解析和调用说明，执行逻辑委托给 Skills。

| 命令 | 职责 | 委托的 Skill |
|------|------|-------------|
| `/req` | 创建任务文档 | `req-executor` |
| `/plan` | 任务规划 | `plan-executor` |
| `/build` | 代码实现 | `build-executor` |
| `/review` | 审查交付 | `review-executor` |
| `/remember` | 记忆写入（含治理） | `memory-curator` |
| `/init` | 项目初始化 | 多个 Skills 协作 |

### Skills（执行逻辑）

Skills 承载详细的工作流指导，按职责分为：

- **Executor Skills**：执行核心工作流
  - `req-executor`：需求分析、提纯、放大和文档生成
  - `plan-executor`：任务规划、测试设计和文档生成
  - `build-executor`：代码实现、测试编写和执行
  - `review-executor`：多维度审查和交付质量保证

- **记忆系统 Skills**：实现“心有灵犀”的核心能力
  - `memory-retrieve`：每轮语义检索记忆笔记并做最小高信号注入（由 Always Apply Rule 强保证触发）
  - `memory-capture`：尽力而为扫描对话历史识别记忆信号，产出记忆候选供用户选择
  - `memory-curator`：记忆治理与写入（merge/replace/new/veto），写入 notes 并更新 INDEX

- **工具类 Skills**：提供辅助能力
  - `about-lingxi`：快速了解灵犀的背景知识、架构设计和核心机制，提供调优指导、价值判定和评价准则
  - `service-loader`：服务上下文加载和考古
  - `write-doc`：文档编写和风格一致性保证
  - `style-fusion`：风格画像提取和融合

### 记忆库机制

灵犀的核心能力是“写入可提取”的记忆库，让 AI 具备项目级记忆：

1. **强保证提取与注入**：每轮对话在响应前由 Always Apply Rule 触发 `memory-retrieve`，从 `memory/notes/` 语义检索并注入 0-3 条最小提醒
2. **尽力而为捕获**：`memory-capture` 尝试识别记忆信号并生成候选，是否写入由用户门控
3. **写入时治理**：`memory-curator` 在每次写入时做语义 TopK 治理（优先合并，其次新增；支持冲突检测与否决），产物为：
   - 记忆笔记：`memory/notes/MEM-*.md`
   - 统一索引：`memory/INDEX.md`

### 其他机制

- **Hooks**：自动化审计和门控（当前无活跃的 hooks）
- **审查类 Skills**：多维度审查助手（doc-consistency、e2e、performance、security），由 review-executor 显式调用，共享上下文
