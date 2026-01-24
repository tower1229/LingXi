# 记忆系统机制（Memory-first）

## 概述

记忆系统是灵犀实现“心有灵犀”的核心能力。它以 **更好的检索与注入** 为最终目的：把对话中的判断与取舍沉淀为可检索资产，并在每一轮对话前做最小注入，提升一致性与长期复用能力。

本版本采用 **扁平化记忆库**：

- `memory/INDEX.md`：统一索引（SSoT，最小元数据）
- `memory/notes/`：扁平记忆文件（语义搜索的主搜索面）
- `memory/references/`：模板与规范（按需加载）

## 三大生命周期

### 1) 捕获（Capture）

**机制**：尽力而为（best-effort）。

- 自动：当对话中出现判断/取舍/边界/排障路径等信号时，尽力触发 `memory-capture`
- 手动：`/remember ...` 与 `/init` 过程中都可产生/补齐候选
- 去重：使用 `conversation_id + generation_id` 写入 `.cursor/.lingxi/workspace/processed-sessions.json`，已处理则静默跳过

**产物**：`MEM-CANDIDATE` 候选列表（在会话中展示，等待用户选择写入）。

### 2) 治理（Curate）

**触发时机**：每次写入前必做（write-time governance）。

**核心策略**：语义近邻 TopK 治理（工程上等价于“全库治理”，但成本可控）。

1. 对新候选构建概念化查询（描述“解决什么问题/约束/风险”，避免只写结论）
2. 对 `memory/notes/` 做语义搜索取 Top 5
3. LLM 概念级评估并决策：
   - **merge**：同场景同结论 → 合并优先于新增
   - **replace**：同场景结论冲突且用户明确选择新结论 → 取代（删除旧文件）
   - **veto**：冲突但无法判断更优、用户未给决定性变量 → 否决写入，要求补齐边界/变量
   - **new**：不构成合并/取代 → 新增

**门控原则**：

- 删除（merge/replace）必须用户确认
- 冲突取舍必须用户确认

### 3) 提取/注入（Retrieve + Inject）

**强保证触发**：通过 Always Apply Rule 实现“每轮必做一次检索与最小注入”：

- 规则文件：`.cursor/rules/memory-injection.mdc`
- 执行 Skill：`memory-retrieve`

**最小注入**：

- 无匹配：静默
- 有匹配：最多 Top 0-3 条，每条 1-2 句可执行提醒 + 文件指针
- 不把原文贴进对话，除非用户明确要求查看

## 统一索引（INDEX.md）

索引只存最小字段，用于治理与定位；真实语义检索以 `memory/notes/*.md` 为准。

建议字段：

| Id | Kind | Title | When to load | Status | Strength | Scope | Supersedes | File |

## 记忆文件（notes/*.md）

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
- 生效方式：share 目录下的记忆与项目记忆一起参与检索；索引生成会递归扫描 `notes/**`。\n+
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
2. **用户门控不可侵犯**：涉及删除/取代必须确认
3. **静默成功**：无匹配/成功/非决策输出尽量静默
4. **SSoT**：索引是唯一权威清单，内容以 notes 为准
## 参考

- `memory-capture`：`.cursor/skills/memory-capture/SKILL.md`
- `memory-curator`：`.cursor/skills/memory-curator/SKILL.md`
- `memory-retrieve`：`.cursor/skills/memory-retrieve/SKILL.md`
- Always Apply Rule：`.cursor/rules/memory-injection.mdc`

