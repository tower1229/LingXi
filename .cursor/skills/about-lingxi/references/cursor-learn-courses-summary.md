# Cursor 官方课程提炼总结

> 基于 [Cursor 官方学习路径](https://cursor.com/cn/learn/how-ai-models-work) 系列课程整理，用于灵犀开发与优化时对照参考。课程涵盖：AI 模型原理、幻觉与局限、Token 与定价、上下文、工具调用、代理、与代理协作、理解代码库、开发功能、调试、审查测试、自定义 Agent、综合运用。

---

## 1. 基础原理

### 1.1 AI 模型如何工作

- **心智模型**：AI 模型可视为「超智能的通用 API」；与 Stripe、Twilio 等 API 不同，**相同输入不保证相同输出**，具备**概率性**。
- **输出依赖**：模型基于 (1) 训练过的信息 (2) 你提供的输入（prompt）来预测下一个 token。
- **选型**：模型在智能、速度、成本、专长上各异；编码场景下当前模型已能胜任多种任务；前沿在持续演进。

**灵犀参考**：设计 Skills/Commands 时不对单次模型输出做确定性假设；可依赖「重试 / 门控 / 可观测」来收敛结果（如记忆写入的治理与审计）。

### 1.2 幻觉与局限

- **幻觉**：模型会自信地生成看似合理但实际错误的信息（如不存在的 API、混用语法、伪造配置）。
- **原因**：基于模式预测下一 token，在「不知道」时仍可能生成「最像」的内容；受 knowledge cutoff 限制。
- **应对**：对模型建议保持怀疑、独立验证；用编辑器/环境即时反馈（如错误 import）并反馈给模型。

**灵犀参考**：记忆沉淀、req/plan 等产出需可验证、可修正；门控与半静默（高可靠性静默、低可靠性显性确认）是在「信任」与「纠错」之间的权衡。

### 1.3 Token 与定价

- **Token**：模型实际处理的「词」级片段，不等同于自然词；用于计费与衡量速度（如 TPS）。
- **计费**：输入 token（prompt + 历史）+ 输出 token；输出通常比输入贵 2–4 倍。
- **流式**：模型按序一次生成一个 token，可流式返回，便于早停与中断。

**灵犀参考**：控制注入到模型的信息量（如 memory-retrieve 的「最小注入」、Rules/Skills 的按需加载）；长对话或子代理会放大 token 消耗，需在「上下文充分」与「成本/窗口」间平衡。

### 1.4 上下文

- **本质**：与 AI 协作的核心是**管理上下文**——系统提示 + 用户消息 + 附加内容（代码、图片等）；工具可自动注入（当前文件、终端、linter 等）。
- **限制**：上下文有上限；超限后需压缩/总结或新开对话。
- **类比**：做菜——输入（食材/代码/目标）、步骤（计划/待办）、输出（汤/代码）；上下文即「工作记忆列表」。

**灵犀参考**：Session 内 hooks 注入约定、memory-retrieve 的「最小高信号」注入、子代理（如 lingxi-memory、explore）独立上下文，都是在做上下文运营；避免规则/Skill 全文常驻，采用「按需加载、引用式说明」。

### 1.5 工具调用

- **作用**：让模型不止生成文本，能**动态执行操作并获取信息**（读文件、搜索、运行命令、查文档等）。
- **流程**：模型识别需要能力 → 生成工具名 + 参数（JSON）→ 应用执行 → 结果回填上下文 → 模型继续。
- **成本**：工具定义与结果都占 token；大量工具调用会更快占满窗口并增加成本。MCP 可扩展外部工具。

**灵犀参考**：灵犀依赖 Cursor 内置工具（Semantic search、Grep、Read/Edit、Terminal、Browser 等）；Skills 描述中可引导「何时用哪种工具」；参考 [cursor-agent-tools.md](cursor-agent-tools.md)。

### 1.6 代理（Agents）

- **定义**：**工具在循环中运行**——给目标而非步步指令，由 Agent 自行规划步骤、调用工具、根据结果决定下一步。
- **优势**：任务管理者而非执行者；可多 Agent 并行处理不同部分。
- **局限**：目标清晰、模式成熟的任务表现好；复杂调试、像素级还原、新库等易遇困难；易遗忘、易陷入循环；token 消耗大，需监督与验证。

**灵犀参考**：灵犀的 Commands（/req、/plan、/build、/review 等）本质是「带 harness 的 Agent 流程」；子代理（lingxi-memory、explore）承担专门任务并返回精简结果，以保护主对话上下文与成本。**选型**：子代理适合独立上下文、多步、需隔离或静默的任务；可一次性完成的任务优先用 Skill，避免不必要子代理以控制 token 消耗。

---

## 2. 与代理协作

### 2.1 Agent harness 三要素

- **Instructions**：系统提示与规则，引导行为。
- **Tools**：编辑、搜索、终端等能力。
- **Messages**：用户的提示与后续对话。

### 2.2 编写高效 prompt

- **避免模糊**：如「加一个用户设置页」缺少布局、组件、存储等约束。
- **推荐**：引用现有文件与模式、明确范围与验收点（如「用 xxx 的 Form，遵循 xxx 的 API 模式」）。

**灵犀参考**：req/plan 产出的任务文档即「结构化 prompt + 范围」，供 build/review 使用；Skill 的 description 与步骤相当于「可复用的指令集」。

### 2.3 管理上下文

- 关注上下文占用；新任务或 Agent 开始犯错时考虑新开对话。
- 可引用历史对话把旧会话上下文带入当前会话。
- 语义搜索等工具让 Agent 按需拉取文件；已知文件可直接 @ 引用。

**灵犀参考**：记忆检索（memory-retrieve）与 INDEX/notes 是在「跨会话」维度做上下文管理；单会话内依赖 Cursor 的 @file、@codebase 等。

### 2.4 常见失败：需求膨胀

- 一次要求改动范围过大 → Agent 做无关修改、改错文件、失去重点。
- **应对**：拆成更小、可独立验证的步骤；大功能先规划再分多轮小对话迭代。

**灵犀参考**：plan 的「任务拆解、里程碑」与 build 的「按步骤验证」就是在约束范围、防止膨胀。

---

## 3. 理解代码库

- **精确匹配**：函数名、变量名、代码片段 → grep/ripgrep；Cursor 的 Instant Grep 在大型库上更快。
- **语义搜索**：按「含义」找代码（如「认证在哪」→ `middleware/session.ts`）；与 grep 结合可提升准确率。
- **Explore 子代理**：独立上下文、更快模型、并行搜索，只向主对话返回关键信息，利于控制上下文。
- **架构图**：可让 Agent 生成 Mermaid 等图，用于上手、文档与设计评审。

**灵犀参考**：Skills 中可约定「先探索再修改」「先理解现有模式再请求改动」；explore 子代理与语义搜索的配合在 about-lingxi 的组件指南中可提及。

---

## 4. 开发功能

- **先规划**：用 Plan Mode 分析代码库、澄清问题、生成可编辑的分步计划与里程碑。
- **偏离时**：从计划重来（撤销、写清计划、再执行）往往比在错误方向上打补丁更快。
- **TDD**：先写测试 → 确认失败 → 提交测试 → Agent 写代码通过测试；测试给 Agent 明确验证信号。
- **设计到代码**：可贴截图/线框图，或接 Figma MCP；集成浏览器可预览与验证 UI。
- **验证**：测试、类型检查、linter、浏览器/MCP 等，让 Agent 能自验输出。

**灵犀参考**：plan-executor、build-executor 与测试设计/执行对应「规划 → 实现 → 验证」；review 时强调可验证目标（测试、类型、lint）。

---

## 5. 查找与修复缺陷

- **调试原则**：可靠复现、最小复现、隔离变量、具体假设、加日志、用测试防回归。
- **简单错误**：堆栈清晰时可直接把错误与场景交给 Agent 修复。
- **调试模式**：先假设 → 加探针 → 复现并收集数据 → 分析 → 针对性修复。
- **运行时证据**：终端输出、EXPLAIN ANALYZE、日志、性能数据、浏览器 Console/Network、Sentry/Datadog 等 MCP，都能提升排查效率。
- **避免**：接受未理解的修复（要追问根因，区分根本原因与掩盖症状）。

**灵犀参考**：review 中的专项 reviewer（如 reviewer-performance、reviewer-security）与 E2E 审查，是在「可验证」维度补足；灵犀不替代用户对根因的理解与确认。

---

## 6. 审查与测试

- **自我评审**：观察 Agent 的 diff、及时中断重定向；用 @Branch 让 Agent 审查当前分支全部变更。
- **提交策略**：小且语义清晰的提交 + 明确描述，便于人工与 Agent 评审。
- **Agent Review**：对本地更改与主分支做对比，运行专用审查流程。
- **Bugbot**：PR 级自动审查，可配规则与 Autofix。
- **可验证目标**：Tests、Type checking、Linting 越完善，越可放心委派。
- **Cloud agents**：远程沙盒、分支、PR、通知，适合修 bug、补测试、更文档等「可搁置」任务。

**灵犀参考**：review-executor 与 review-req 对应「代码/需求审查」；文档一致性、E2E、性能、安全等 reviewer 是不同维度的可验证目标。

---

## 7. 自定义 Agent

- **Rules**（`.cursor/rules/`）：每次对话加载；适合构建/测试命令、代码约定、示例引用、防护规则；宜简短、具体，用引用代替长文粘贴。
- **Skills**（`SKILL.md`）：按需动态加载；适合专门工作流与领域知识；可 `/` 触发为可复用流程。
- **区别**：Rules 始终占用上下文；Skills 仅在相关时加载，更省上下文。
- **MCP**：连接 Slack、Datadog、Sentry、数据库、Figma 等；Agent 也可用 gh、aws、kubectl 等 CLI。
- **避免**：规则过多、过度设计；偶尔需要的放 Skill 而非 Rule。

**灵犀参考**：灵犀以 Skills 为主（req/plan/build/review、memory-retrieve、about-lingxi 等），Rules 作补充；about-lingxi 的「按需加载 references」与「渐进式披露」与 Cursor 的 Rules/Skills 取舍一致。

---

## 8. 综合运用（端到端）

课程示例：为结账加折扣码——**先探索流程与定价** → **Plan Mode 出方案与任务** → **Build** → **测试失败时用调试模式找根因** → **推送前自我审查 / Agent Review** → **把学到的定价规则写成 Rule 沉淀**。

**灵犀对应**：req（需求与范围）→ plan（方案与任务）→ build（实现与测试）→ review（审查与可验证目标）→ 记忆/规则（沉淀约定与模式）。

---

## 9. 对话与上下文使用建议（灵犀）

- **新任务或 Agent 反复犯错时**：可新开对话，避免上下文膨胀或重复无效尝试。
- **延续旧任务时**：可引用旧对话（如 @chat 或自然语言「继续某对话中的某需求」），让主 Agent 按需拉取历史。
- **记忆检索**：灵犀的 memory-retrieve 为跨会话记忆；新对话仍会注入相关记忆，无需在同一对话内完成所有步骤。

---

## 10. 灵犀开发与优化对照表

| 课程要点           | 灵犀对应点 |
| ------------------ | ---------- |
| 概率性、不保证同输出 | 门控、审计、半静默（高可靠静默 / 低可靠确认） |
| 幻觉、需验证       | 记忆/req/plan 可修正、可观测；用户保留最终判断 |
| Token/上下文管理    | memory-retrieve 最小注入；子代理独立上下文；按需加载 references |
| 工具在循环、Agent  | Commands + Skills 构成 harness；子代理专责、结果精简 |
| 高效 prompt、范围  | req/plan 产出结构化任务与验收点；避免需求膨胀 |
| 先理解再改、可验证 | 先探索再修改；测试/类型/lint/浏览器/E2E 等 reviewer |
| Rules 常驻、Skills 按需 | 灵犀以 Skills + 引用式 references 为主，Rules 为辅 |
| 规划 → 实现 → 验证 → 沉淀 | req → plan → build → review；记忆与规则沉淀 |
| 子代理 token 成本、选型 | 子代理适合独立/多步/隔离任务；可一次性完成优先用 Skill，避免不必要子代理 |

---

## 11. 参考链接

- [AI 模型如何工作](https://cursor.com/cn/learn/how-ai-models-work)
- [幻觉](https://cursor.com/cn/learn/hallucination-limitations)
- [Token 与定价](https://cursor.com/cn/learn/tokens-pricing)
- [上下文](https://cursor.com/cn/learn/context)
- [工具调用](https://cursor.com/cn/learn/tool-calling)
- [代理](https://cursor.com/cn/learn/agents)
- [与代理协作](https://cursor.com/cn/learn/working-with-agents)
- [理解代码库](https://cursor.com/cn/learn/understanding-your-codebase)
- [开发功能](https://cursor.com/cn/learn/creating-features)
- [查找并修复缺陷](https://cursor.com/cn/learn/finding-fixing-bugs)
- [审查和测试](https://cursor.com/cn/learn/reviewing-testing)
- [自定义 Agent](https://cursor.com/cn/learn/customizing-agents)
- [综合运用](https://cursor.com/cn/learn/putting-it-together)
