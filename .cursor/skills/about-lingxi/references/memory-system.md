# 记忆系统机制（Memory-first）

## 概述

记忆系统是灵犀实现“心有灵犀”的核心能力。它以 **更好的检索与注入** 为最终目的：把对话中的判断与取舍沉淀为可检索资产，并在每一轮对话前做最小注入，提升一致性与长期复用能力。

**记忆系统分为四部分**：**记忆沉淀**（由用户通过 Command 触发）、**记忆写入**、**记忆提取**。记忆沉淀包含**主动记忆捕获**（/remember、/extract）与 lingxi-memory 的写入执行；/init 在初始化流程中可将确认草稿可选写入，为初始化额外产物，非惯常记忆捕获方式。

本版本采用 **扁平化记忆库**：

- `memory/INDEX.md`：统一索引（SSoT，最小元数据）
- `memory/notes/`：扁平记忆文件（语义 + 关键词混合检索的主搜索面）
- `memory/references/`：模板与规范（按需加载）

## 每轮参与

检索与注入在**每次用户输入**时由 sessionStart 约定触发（每轮先执行 memory-retrieve），因此每一轮都有机会根据最新上下文做匹配；写入则通过用户触发的 Command 在需要时触发：**主动记忆捕获**为 /remember、/extract；/init 在初始化时可将确认草稿可选写入，属初始化额外产物。新输入与后续轮次自然带来纠错与更新机会。

**「何时写入、何时纠错」由「每轮触发检索 + 按需写入」的机制覆盖，无需额外“记忆可错/纠错”规则。**

## 记忆沉淀（用户触发 + 记忆写入）

### 1) 触发方式

由用户通过 **/remember** 或 **/extract** 主动触发记忆捕获；主 Agent 在用户执行上述命令时，先经 taste-recognition 产出 payload，再调用 lingxi-memory 完成写入。**/init** 在初始化项目时可将确认草稿可选写入，为初始化流程的额外产物，非惯常记忆捕获入口。

### 2) 记忆写入（Subagent lingxi-memory）

**执行模型**：治理、门控与写入由 **Subagent lingxi-memory**（`.cursor/agents/lingxi-memory.md`）在**独立上下文中**执行，主对话仅委派并收简报。**所有写入路径必须先经 taste-recognition skill**：主 Agent 先调用 taste-recognition skill 产出 7 字段品味 payload（单条或多条），将 payload 组成 **payloads 数组**传入 lingxi-memory；lingxi-memory **仅接受 payloads 数组**，不产候选、不从原始对话做识别。

- **写入流程**：payload → 校验 → 映射生成 note 字段（规则见 lingxi-memory.md 内「映射规则」）→ **评分卡**（5 维 D1–D5，总分 T 判定写/不写、L0/L1/双层）→ 治理（语义近邻 TopK，merge/replace/veto/new）→ 门控 → 写 note 与 INDEX。
- **写入方式**：Subagent 使用 Cursor 提供的**文件读写能力**直接操作 `memory/notes/*.md` 与 `memory/INDEX.md`，不通过脚本。
- **门控**：merge/replace 时**必须** ask-questions 确认（按 `question_id + option id` 协议）；new 路径按 `payload.confidence` 分流：high 可静默写入，medium/low 须 ask-questions。删除与替换须用户确认。
- **治理策略**：语义近邻 TopK（merge/replace/veto/new）；合并/替换时更新 Supersedes，与 INDEX 同步。
- **生命周期与升维判定**：Status 为 active / local / archive；记忆升维判定标准（低价值定义、五维评分、L0/L1 决策与书写模板、例外条件、生命周期、样例）见 `.cursor/agents/lingxi-memory.md` 内「记忆升维判定标准」一节。

## 记忆提取（Retrieve + Inject）

**触发方式**：通过 sessionStart hook 在会话开始时注入约定，要求每轮在回答前执行一次检索与最小注入。**仅注入记忆提取约定**，不注入记忆沉淀约定；**主动记忆捕获**由用户通过 /remember、/extract 触发；/init 在初始化时可选写入，为初始化额外产物。

- Hook：`.cursor/hooks/session-init.mjs`（sessionStart，注入「每轮先执行 /memory-retrieve <当前用户消息>」的约定及 conversation_id 传入约定）
- 执行 Skill：`memory-retrieve`

**检索机制**：memory-retrieve 执行流程为**理解判断 → 提炼（语义摘要 + 关键词）→ 检索必要性判断 → 双路径检索**。当用户输入**无法独立理解、需结合上文理解**时，先结合最近对话推断完整含义再提炼；提炼后若无实质可检索（语义仅社交/元表达且关键词为空），则跳过检索以节省成本。双路径检索采用**语义 + 关键词**混合（语义路径对 notes/ 做概念匹配，关键词路径对 notes/ 及 INDEX 的 Title、When to load 做文本匹配），**并集加权合并**（0.7×语义 + 0.3×关键词）、**召回优先**（取并集不做交集），每路取若干候选后合并排序取 top 0–2。**降级策略**：语义不可用或失败时仅执行关键词路径；仍无匹配则静默，不向用户报错。**嗅探场景**：拟做品味嗅探提问前，可传入 Agent 构建的决策点描述；若检索到相关记忆且能覆盖当前选择，则不再问、直接按该记忆行为。

**最小注入**：

- 无匹配：静默
- 有匹配：最多 Top 0-2 条，每条 1-2 句可执行提醒 + 文件指针
- 不把原文展示在对话中，除非用户明确要求查看

## 统一索引（INDEX.md）

索引只存最小字段，用于治理与定位；真实语义检索以 `memory/notes/*.md` 为准。

建议字段：

| Id | Kind | Title | When to load | Status | Strength | Scope | Supersedes | CreatedAt | UpdatedAt | Source | Session | File |

CreatedAt、UpdatedAt 为 ISO 8601 时间；Source 为来源（manual/init/user/auto 等）；Session 为创建/更新时的会话 ID（conversation_id）。检索依赖 Title、When to load 及 notes 正文。

## 记忆文件（notes/\*.md）

记忆应记录**可复用的品味与约定**（原则、决策、模式、排障路径等），不存任务级实施细节（如某次迁移步骤、某任务的具体实现顺序）。

每条记忆一个文件，小而清晰，建议结构：

- Meta（Id/Title/Kind/Status/Strength/Scope/Audience/Portability/Source/Tags/Supersedes/CreatedAt/UpdatedAt/Session）
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
3. **用户门控不可侵犯**：涉及删除或替换必须确认；半静默仅限新建（高可靠性静默写、低可靠性显性门控），删除与替换仍须确认
4. **静默成功**：无匹配/成功/非决策输出尽量静默
5. **SSoT**：索引是唯一权威清单，内容以 notes 为准
6. **基本操作模型**：所有操作简化为 create/update/delete 三个基本操作，统一操作模型

## 参考

- **记忆沉淀**（用户触发 + 记忆写入）：Subagent `lingxi-memory`（`.cursor/agents/lingxi-memory.md`）；**主动记忆捕获**由用户通过 /remember、/extract 触发；/init 在初始化时可将确认草稿可选写入，为初始化额外产物。经 taste-recognition 产出 payload 后以 **payloads 数组**调用 lingxi-memory。
- **记忆提取**：`memory-retrieve`（`.cursor/skills/memory-retrieve/SKILL.md`）
- **注入约定**：sessionStart hook（`.cursor/hooks/session-init.mjs`）——仅注入记忆检索约定及 conversation_id 传入约定
