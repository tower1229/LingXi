# 记忆系统机制（Memory-first）

## 概述

记忆系统是灵犀实现“心有灵犀”的核心能力。它以 **更好的检索与注入** 为最终目的：把对话中的判断与取舍沉淀为可检索资产，并在每一轮对话前做最小注入，提升一致性与长期复用能力。

本版本采用 **扁平化记忆库**：

- `memory/INDEX.md`：统一索引（SSoT，最小元数据）
- `memory/notes/`：扁平记忆文件（语义搜索的主搜索面）
- `memory/references/`：模板与规范（按需加载）

## 每轮参与

检索与注入在**每次用户输入**时由 sessionStart 约定触发（每轮先执行 memory-retrieve），因此每一轮都有机会根据最新上下文做匹配；写入则通过双入口（auto/remember）在需要时触发，新输入与后续轮次自然带来纠错与更新机会。

**「何时写入、何时纠错」由「每轮触发检索 + 按需写入」的机制覆盖，无需额外“记忆可错/纠错”规则。**

## 三大生命周期

### 1) 捕获与治理（Capture + Curate）：Subagent lingxi-memory

**执行模型**：捕获、治理、门控与写入由 **Subagent lingxi-memory**（`.cursor/agents/lingxi-memory.md`）在**独立上下文中**执行，主对话仅委派并收一句结果。

- **双入口**：
- **auto**：主 Agent 判断本轮存在可沉淀时，通过**显式调用**（在提示中使用 `/lingxi-memory mode=auto input=<本轮消息与上下文摘要>` 或自然语言「使用 lingxi-memory 子代理将可沉淀内容写入记忆库」）交给子代理；子代理产候选 → 治理 → 门控 → 写入。
- 用户**拒绝、纠正、排除**（如「不要这样」「别用 X」「这里不能用 Y」「改成 Z」）也视为可沉淀；主 Agent 应将本轮中此类表述（或要点）传入 lingxi-memory mode=auto，由子代理产候选并门控。
- 原则：**宁可多候选再门控，不少漏**；主 Agent 对「是否可沉淀」的判断宜放宽，交由子代理与用户门控做最终筛选。
- **remember**：用户执行 `/remember` 或 `/init` 选择写入时，主 Agent 通过**显式调用**（`/lingxi-memory mode=remember input=<用户输入或候选编号>` 或自然语言提及 lingxi-memory 子代理）交给子代理；子代理产候选 → 治理 → 门控 → 写入。
- **写入方式**：Subagent 使用 Cursor 提供的**文件读写能力**直接操作 `memory/notes/*.md` 与 `memory/INDEX.md`，不通过脚本。
- **门控**：merge/replace 时在 Subagent 对话内展示「治理方案（待确认）」与 A/B/C/D，用户确认后再执行；主对话不展示过程。
- **治理策略**：语义近邻 TopK（create/update/delete/skip），门控原则不变（delete 与 replace 须用户确认）。

### 3) 提取/注入（Retrieve + Inject）

**触发方式**：通过 sessionStart hook 在会话开始时注入约定，要求每轮在回答前执行一次检索与最小注入：

- Hook：`.cursor/hooks/session-init.mjs`（sessionStart，注入「每轮先执行 /memory-retrieve <当前用户消息>」的约定）
- 执行 Skill：`memory-retrieve`

**最小注入**：

- 无匹配：静默
- 有匹配：最多 Top 0-3 条，每条 1-2 句可执行提醒 + 文件指针
- 不把原文贴进对话，除非用户明确要求查看

## 统一索引（INDEX.md）

索引只存最小字段，用于治理与定位；真实语义检索以 `memory/notes/*.md` 为准。

建议字段：

| Id | Kind | Title | When to load | Status | Strength | Scope | Supersedes | File |

## 记忆文件（notes/\*.md）

记忆应记录**可复用的品味与约定**（原则、决策、模式、排障路径等），不存任务级实施细节（如某次迁移步骤、某任务的具体实现顺序）。

每条记忆一个文件，小而清晰，建议结构：

- Meta（Id/Kind/Status/Strength/Scope/Audience/Portability/Source/Tags）
- When to load（1-3 条）
- One-liner（用于注入）
- Context / Decision（decision + signals + alternatives + counter-signals）
- Pointers（代码/文档指针）

模板：`memory/references/memory-note-template.md`

## 跨项目复用（Share 目录：git submodule）

灵犀提供一个硬性约定的共享目录，用于承载“可跨项目复用”的团队经验：

- 共享目录：`.cursor/.lingxi/memory/notes/share/`
- 推荐形态：**git submodule**（团队仓库，版本锁定、同步明确）
- 生效方式：share 目录下的记忆与项目记忆一起参与检索；索引生成会递归扫描 `notes/**`。

团队级经验（可跨项目复用）需要**稳定可提取**，因此必须显式标注归属与可移植性：

- **Audience**：team / project / personal（决策权归属与适用范围）
- **Portability**：cross-project / project-only（是否允许跨项目复用）
- **Source**：来源（如 `<packName>@<version>` / manual / init），用于审计与回溯
- **Tags**（可选）：主题标签，便于导出筛选与聚合

推荐约定（用于筛选“应进入 share 仓库”的内容）：

- 团队级质量标准：Audience=team，Portability=cross-project，Strength=enforced/validated
- 团队级常见需求标准方案：Audience=team，Portability=cross-project，Kind=pattern/decision
- 前后端/运维默认约定：Audience=team，Portability=cross-project，Kind=reference/tech
- 项目内特殊备忘：Audience=project，Portability=project-only
- 个人习惯：Audience=personal（默认不进入 share）

### 冲突优先级（稳定规则）

当出现同一 `Id` 同时存在于项目与 share 时，默认 **project 覆盖 share**（避免团队库更新导致项目行为不可控）。索引生成会对重复 Id 输出 warning，便于人工治理与收敛。

## 关键原则

1. **写入是为了更好的提取**：不追求“分类完美”，追求“下次能检索到并帮你做对”
2. **空状态引导**：可提示用户「先写几条你最在意的约束或『不要』，后续检索会自动参考」，降低冷启动时的表达门槛。
3. **用户门控不可侵犯**：涉及删除或替换必须确认
4. **静默成功**：无匹配/成功/非决策输出尽量静默
5. **SSoT**：索引是唯一权威清单，内容以 notes 为准
6. **基本操作模型**：所有操作简化为 create/update/delete 三个基本操作，统一操作模型

## 参考

- **记忆写入**：Subagent `lingxi-memory`（`.cursor/agents/lingxi-memory.md`）
- **记忆检索与注入**：`memory-retrieve`（`.cursor/skills/memory-retrieve/SKILL.md`）
- **注入约定**：sessionStart hook（`.cursor/hooks/session-init.mjs`）
