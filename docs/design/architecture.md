## 核心组件架构

灵犀基于 Cursor 的 Commands、Skills、Hooks、Subagents 等机制构建，遵循职责分离和 AI Native 设计原则。

### Commands（命令入口）

Commands 作为纯入口，负责参数解析和调用说明，执行逻辑委托给 Skills。

| 命令 | 职责 | 委托的 Skill |
|------|------|-------------|
| `/req` | 创建任务文档 | `req-executor` |
| `/plan` | 任务规划 | `plan-executor` |
| `/build` | 代码实现 | `build-executor` |
| `/review` | 审查交付 | `review-executor` |
| `/remember` | 经验沉淀 | `experience-depositor` |
| `/init` | 项目初始化 | 多个 Skills 协作 |

### Skills（执行逻辑）

Skills 承载详细的工作流指导，按职责分为：

- **Executor Skills**：执行核心工作流
  - `req-executor`：需求分析、提纯、放大和文档生成
  - `plan-executor`：任务规划、测试设计和文档生成
  - `build-executor`：代码实现、测试编写和执行
  - `review-executor`：多维度审查和交付质量保证

- **记忆系统 Skills**：实现"心有灵犀"的核心能力
  - `experience-capture`：由 stop hook 触发，扫描对话历史识别经验信号，生成经验候选并执行评估，在会话中展示候选供用户选择
  - `experience-depositor`：从会话上下文获取候选，执行治理（语义搜索 + 关键词匹配双重验证）并沉淀经验到记忆库（团队级标准/经验或项目级经验）
  - `memory-index`：统一索引和匹配，支持跨维度匹配（Experience/Tech/Business），主动提醒风险与指针

- **工具类 Skills**：提供辅助能力
  - `about-lingxi`：快速了解灵犀的背景知识、架构设计和核心机制，提供调优指导、价值判定和评价准则
  - `service-loader`：服务上下文加载和考古
  - `write-doc`：文档编写和风格一致性保证
  - `style-fusion`：风格画像提取和融合

### 经验沉淀机制

灵犀的核心能力是自动捕获和沉淀经验，让 AI 具备项目级记忆：

1. **stop hook 触发**：任务完成时，stop hook 引导调用 `experience-capture` skill
2. **经验捕获和评估**：`experience-capture` 扫描整个对话历史，识别经验信号（判断、取舍、边界、约束等），生成 EXP-CANDIDATE，执行评估（结构完整性、判断结构质量、可复用性、知识可获得性、经验类型、Level 判断），在会话中展示候选供用户选择
3. **沉淀分流**：用户选择候选后，`experience-depositor` 从会话上下文获取候选，执行治理并沉淀到：
   - 团队级标准（`memory/experience/team/standards/`）：强约束、执行底线
   - 团队级经验（`memory/experience/team/knowledge/`）：复杂判断、认知触发
   - 项目级经验（`memory/experience/project/`）：项目特定、长期复用
4. **智能治理**：`experience-depositor` 使用语义搜索 + 关键词匹配双重验证，自动检测冲突和重复，智能合并或取代，统一更新 `memory/INDEX.md`，保持知识库的整洁和一致性
5. **主动提醒**：`memory-index` 在执行任务时根据命令自动匹配相关记忆（`/init` → Experience Level=team，`/req`/`/plan`/`/build`/`/review` → 所有维度），支持跨维度匹配（Experience/Tech/Business），主动提醒风险和提供指针

### 其他机制

- **Hooks**：自动化审计和门控（如 `stop.mjs`），在关键节点执行检查
- **Subagents**：多维度审查助手（doc-consistency、e2e、performance、security），提供独立的审查上下文
