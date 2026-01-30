## 核心组件架构

灵犀基于 Cursor 的 Commands、Skills、Rules 等机制构建，遵循职责分离和 AI Native 设计原则。

### Commands（命令入口）

Commands 作为纯入口，负责参数解析和调用说明，执行逻辑委托给 Skills。

| 命令 | 职责 | 委托的 Skill |
|------|------|-------------|
| `/req` | 创建任务文档 | `req-executor` |
| `/plan` | 任务规划 | `plan-executor` |
| `/build` | 代码实现 | `build-executor` |
| `/review` | 审查交付 | `review-executor` |
| `/remember` | 记忆写入（含治理） | **lingxi-memory**（Subagent） |
| `/init` | 项目初始化 | `init-executor`（主）；写入时委派 **lingxi-memory**（Subagent） |

### Skills（执行逻辑）

Skills 承载详细的工作流指导，按职责分为：

- **Executor Skills**：执行核心工作流
  - `req-executor`：需求分析、提纯、放大和文档生成
  - `plan-executor`：任务规划、测试设计和文档生成
  - `build-executor`：代码实现、测试编写和执行
  - `review-executor`：多维度审查和交付质量保证

- **记忆系统**：实现“心有灵犀”的核心能力
  - **Subagent lingxi-memory**：记忆写入（双入口 auto/remember）；在独立上下文中完成产候选、治理、门控与直接文件写入（notes + INDEX）
  - `memory-retrieve`（Skill）：每轮语义检索记忆笔记并做最小高信号注入（由 Always Apply Rule 强保证触发）

- **工具类 Skills**：提供辅助能力
  - `about-lingxi`：快速了解灵犀的背景知识、架构设计和核心机制，提供调优指导、价值判定和评价准则
  - `write-doc`：文档编写和风格一致性保证
  - `style-fusion`：风格画像提取和融合

### 记忆库机制

灵犀的核心能力是“写入可提取”的记忆库，让 AI 具备持久化记忆：

1. **强保证提取与注入**：每轮对话在响应前由 Always Apply Rule 触发 `memory-retrieve`，从 `memory/notes/` 语义检索并注入 0-3 条最小提醒
2. **记忆写入**：由 **Subagent lingxi-memory** 在独立上下文中执行（用户 `/remember` 或主 Agent 委派 mode=auto）；产候选 → 治理（TopK）→ 门控 → 直接读写 `memory/notes/` 与 `memory/INDEX.md`，主对话仅收一句结果

### 其他机制

- **Hooks**：自动化审计和门控
- **审查类 Skills**：多维度审查助手（doc-consistency、e2e、performance、security），由 review-executor 显式调用，共享上下文
