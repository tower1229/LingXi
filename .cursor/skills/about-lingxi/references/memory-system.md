# 记忆系统机制（Memory-first）

## 概述

记忆系统是灵犀实现“心有灵犀”的核心能力。它以 **更好的检索与注入** 为最终目的：把对话中的判断与取舍沉淀为可检索资产，并在每一轮对话前做最小注入，提升一致性与长期复用能力。

**记忆系统分为三部分**：**记忆沉淀**（用户通过 /remember 触发 + 心跳自动会话提炼）、**记忆写入**（由 lingxi-memory 子代理执行）、**记忆提取**（由 memory-retrieve 每轮执行）。记忆沉淀包含**主动记忆捕获**（/remember）与**心跳触发的会话提炼**（新会话时若距上次提炼超过 30 分钟，基于 transcript 增量自动入队最多 3 个候选会话，由 lingxi-session-distill 后台子代理提炼，source=heartbeat）；**工作流内置品味嗅探**（task/plan/build/review 等 **skill** 环节在情境驱动时经 ask-questions 收集用户选择，产出 payload 的 source=choice）同样是重要沉淀来源；/init 在初始化流程中可将确认草稿可选写入，为初始化额外产物，非惯常记忆捕获方式。

本版本采用 **扁平化记忆库**：

- `memory/INDEX.md`：统一索引（SSoT，最小元数据）
- `memory/project/`：项目级记忆文件（语义 + 关键词混合检索的主搜索面）
- `memory/share/`：跨项目共享记忆（推荐 git submodule）

## 每轮参与

检索与注入在**每次用户输入**时由 sessionStart 约定触发（每轮先执行 memory-retrieve），因此每一轮都有机会根据最新上下文做匹配；写入则通过用户触发的 /remember 或**心跳自动会话提炼**在需要时触发；/init 在初始化时可将确认草稿可选写入，属初始化额外产物。新输入与后续轮次自然带来纠错与更新机会。

**「何时写入、何时纠错」由「每轮触发检索 + 按需写入」的机制覆盖，无需额外“记忆可错/纠错”规则。**

## 记忆沉淀（用户触发 + 记忆写入）

### 1) 触发方式

由用户通过 **/remember** 主动触发记忆捕获；**会话提炼**由**心跳**自动触发（新会话时若距上次提炼超过 30 分钟，按 transcript 增量入队最多 3 个候选会话，由 lingxi-session-distill 后台子代理提炼）；**工作流内置品味嗅探**（task/plan/build/review 等 **skill** 环节在情境驱动时按各环节 `references/taste-sniff-rules.md` 经 ask-questions 收集用户选择，经 taste-recognition 产出 payload、source=choice）也会产生沉淀并写入。主 Agent 在用户执行 /remember 或环节选择题反馈时，先经 taste-recognition 产出 payload，再调用 lingxi-memory 完成写入。**/init** 在初始化项目时可将确认草稿可选写入，为初始化流程的额外产物，非惯常记忆捕获入口。

### 2) 记忆写入（Subagent lingxi-memory）

**数据流（实现逻辑）**：taste-recognition 产出扩展品味 payload（已含升维结果：layer、可选 l0OneLiner/l1OneLiner、patternHint）；仅「判定为写」的条目进入 payloads 数组。主 Agent **仅当 payloads 非空时**调用 lingxi-memory 并传入 payloads 数组；lingxi-memory 校验 payloads 后调用 **memory-write** skill 执行：按 payload 映射生成 note → 治理（TopK）→ 门控 → 写 note 与 INDEX。

**输入约定**：lingxi-memory 仅接受 **payloads 数组**（每项为扩展结构：必填 7 字段 + layer；可选 l0OneLiner、l1OneLiner、patternHint、patternConfidence）；可选 conversation_id、generation_id。详见 `.cursor/agents/lingxi-memory.md`。

**写入流程**：payload → lingxi-memory 校验 → **memory-write skill** 按 payload 映射生成 note 字段（规则见 `.cursor/skills/memory-write/references/write-protocol.md`）→ 治理（语义近邻 TopK，dedupe/merge/replace/veto/new）→ 门控 → 写 `memory/project/` 或 `memory/share/` 与 INDEX。

**准入规则归属**：可写判定统一由 taste-recognition 在既有流程内执行：识别阶段前置 Exclusions（敏感信息、一次性指令、瞬时细节），升维阶段综合 Inclusion 语义（actionable、stable、repeated-or-broad-rule、non-sensitive）；仅产出通过判定的 payload。

**升维归属**：升维（写/不写、L0/L1、设计模式靠拢）在 taste-recognition 内完成，见 `.cursor/skills/taste-recognition/references/elevation-rules.md` 与 `references/pattern-catalog.md`；lingxi-memory 仅按 payload 映射写入，不执行评分卡。

- **写入方式**：lingxi-memory 调用 **memory-write** skill（`.cursor/skills/memory-write/SKILL.md`），skill 使用 Cursor 提供的**文件读写能力**直接操作 `memory/project/*.md`、`memory/share/*.md` 与 `memory/INDEX.md`，不通过脚本。
- **门控**：dedupe 可低风险自动执行；merge/replace 时**必须** ask-questions 确认（按 `question_id + option id` 协议）；new 路径按 `payload.confidence` 分流：high 可静默写入，medium/low 须 ask-questions。删除与替换须用户确认。
- **治理策略**：语义近邻 TopK（dedupe/merge/replace/veto/new）；合并/替换时更新 Supersedes，与 INDEX 同步。`merge` 对外单语义，内部可用 `merge_kind`（subject_expansion/scope_expansion）做审计与自我迭代分析。
- **生命周期**：Status 为 active / local / archive（约定见 lingxi-memory 映射规则）。

## 记忆提取（Retrieve + Inject）

**触发方式**：通过 sessionStart hook 在会话开始时注入约定，要求每轮在回答前执行一次检索与最小注入。**仅注入记忆提取约定**，不注入记忆沉淀约定；**主动记忆捕获**由用户通过 /remember 触发；**会话提炼**由心跳自动触发；/init 在初始化时可选写入，为初始化额外产物。
注入约定要求：命中后主 Agent 必须完成一轮 `adopt/reject/ask` 决策，不允许命中后无决策直接继续。

- Hook：`.cursor/hooks/session-init.mjs`（sessionStart，注入「每轮先执行 /memory-retrieve <当前用户消息>」的约定及 conversation_id 传入约定）
- 执行 Skill：`memory-retrieve`

**检索机制**：memory-retrieve 执行流程为**理解判断 → 提炼（语义摘要 + 关键词）→ 检索必要性判断 → 双路径检索**。当用户输入**无法独立理解、需结合上文理解**时，先结合最近对话推断完整含义再提炼；提炼后若无实质可检索（语义仅社交/元表达且关键词为空），则跳过检索以节省成本。双路径检索采用**语义 + 关键词**混合（语义路径对 memory/project/、memory/share/ 做概念匹配，关键词路径对 project/、share/ 及 INDEX 的 Title、When to load 做文本匹配），**并集加权合并**（0.7×语义 + 0.3×关键词）、**召回优先**（取并集不做交集），每路取若干候选后合并排序取 top 0–2。**嗅探场景**：拟做品味嗅探提问前，可传入 Agent 构建的决策点描述；若检索到相关记忆且能覆盖当前选择，则不再问、直接按该记忆行为。**双路径可验证性**：仅关键词路径（Grep）可通过同轮 pre_tool_use 做执行证据验证；语义路径在当前 Cursor 实现下不以独立工具形式经过 preToolUse，仅以 performed 的 semantic_called 自报为准，不做工具链校验。

**最小注入**：

- 无匹配：静默
- 有匹配：仅在存在 adopt 时给一行极简可执行提醒 + 轻量引用；未采纳（reject）不展示
- 不把原文展示在对话中，除非用户明确要求查看
- 若依据命中记忆做决策，在对外输出中自然引用记忆 ID（如 `[MEM-003]`）

**每轮审计（v2，必须）**：

- 每轮 memory-retrieve 后必须追加：
  - `memory.retrieve.performed`（执行检索）或
  - `memory.retrieve.skipped`（显式跳过）
- `memory.retrieve.performed` 必含字段：`query`、`hits`、`adopted`、`rejected`、`semantic_called`、`keyword_called`、`candidate_read_count`、`decision`（附 `conversation_id` / `generation_id`）
- 若轮次内缺失上述事件，完整性审计会追加 `memory.retrieve.missing`（软强制，不阻断主流程）

## 审计事件集（默认最小集）

- 默认保留核心事件：`memory_note_*`、`memory_index_updated`、`memory.retrieve.*`、`heartbeat.*`、`memory.merge.*`、`memory.dedupe.*`、`memory.improvement.*`。
- 高频 Hook 轨迹事件默认不写入；设置 `LINGXI_AUDIT_DEBUG=1` 时开启详细审计。
- 诊断与执行闭环事件：
  - `memory.merge.diagnosed` / `memory.merge.invalid` / `memory.dedupe.applied` / `memory.dedupe.suggested` / `memory.new.created_but_related_exists`
  - `memory.improvement.proposed|approved|rejected|applied|failed`
- 审计事件机器契约（JSON Schema）：`.cursor/hooks/schemas/memory-audit-events.schema.json`
- `append-memory-audit` 先按该 schema 做事件枚举/必填字段校验，再执行事件级业务约束校验（如 merge 诊断一致性）。
- 24h 诊断触发后，由 `lingxi-self-iterate` 后台子代理执行“诊断 + 自动改进（仅 low risk）”，主会话不等待、不插入确认交互。**同一 conversation_id 会话内仅触发一次**（会话级幂等门控）；诊断提案应包含回放评测指标（如 duplicate_creation_rate、merge_conversion_rate、fragmentation_index、post_injection_correction_rate）以驱动后续优化。
- 当前推荐实现为“**lingxi-self-iterate 单子代理**”架构：提案生成与自动应用统一在后台执行，主会话只消费简报。

## 统一索引（INDEX.md）

索引只存最小字段，用于治理与定位；真实语义检索以 `memory/project/*.md`、`memory/share/*.md` 为准。

建议字段：

| Id | Kind | Title | When to load | Status | Strength | Scope | Supersedes | CreatedAt | UpdatedAt | Source | Session | File |

CreatedAt、UpdatedAt 为 ISO 8601 时间；Source 为来源（remember/extract/choice/init/heartbeat，来自 payload.source；或 manual、init、<packName>@<version> 等用于初始化或团队包）；Session 为创建/更新时的会话 ID（conversation_id）。检索依赖 Title、When to load 及 notes 正文。

## 记忆文件（project/*.md、share/*.md）

**沉淀范围**：记忆沉淀包括偏好、决策经验、领域知识、产品/业务知识、行业/组织经验、启发式、设计模式、反例与约束、排障与根因等；具体类型定义及与 Kind 的对应见 taste-recognition 的 `references/content-types.md`。

记忆应记录**可复用的品味与约定**（原则、决策、模式、排障路径等），不存任务级实施细节（如某次迁移步骤、某任务的具体实现顺序）。

每条记忆一个文件，小而清晰，建议结构：

- Meta（Id/Title/Kind/Status/Strength/Scope/Audience/Portability/Source/Tags/Supersedes/CreatedAt/UpdatedAt/Session）
- When to load（1-3 条）
- One-liner（用于注入）
- Context / Decision（decision + signals + alternatives + counter-signals）
- Pointers（代码/文档指针）

模板：memory-write skill 的 `references/memory-note-template.md`（`.cursor/skills/memory-write/references/memory-note-template.md`）

## 跨项目复用（Share 目录：git submodule）

灵犀提供一个硬性约定的共享目录，用于承载“可跨项目复用”的团队经验：

- 共享目录：`.cursor/.lingxi/memory/share/`
- 推荐形态：**git submodule**（团队仓库，版本锁定、同步明确）
- 生效方式：share 目录下的记忆与项目记忆一起参与检索。添加或更新 share 后运行 **memory-govern** Skill（在 Cursor 中输入 `/memory-govern`）同步索引并可选治理。

团队级经验（可跨项目复用）需要**稳定可提取**，因此必须显式标注归属与可移植性：

- **Audience**：project / team（项目级 / 团队级）；**本质区别为是否写入 memory/share/**：团队级写入 `memory/share/`，项目级写入 `memory/project/`。
- **Portability**：project-only / cross-project（与 Audience 一致：project→project-only，team→cross-project）
- **Source**：来源（如 `<packName>@<version>` / manual / init），用于审计与回溯
- **Tags**（可选）：主题标签，便于导出筛选与聚合

推荐约定（用于筛选“应进入 share 仓库”的内容）：

- 团队级质量标准：Audience=team，Portability=cross-project，Strength=enforced/validated，**写入 memory/share/**
- 团队级常见需求标准方案：Audience=team，Portability=cross-project，Kind=pattern/decision
- 前后端/运维默认约定：Audience=team，Portability=cross-project，Kind=reference/tech
- 项目内特殊备忘：Audience=project，Portability=project-only，**写入 memory/project/**

### 冲突优先级（稳定规则）

当出现同一 `Id` 同时存在于项目与 share 时，默认 **project 覆盖 share**（避免团队库更新导致项目行为不可控）。运行 **memory-govern** Skill（如 `/memory-govern`）时可看到重复 Id 提示，便于人工治理与收敛。

## 关键原则

1. **写入是为了更好的提取**：不追求“分类完美”，追求“下次能检索到并帮你做对”
2. **空状态引导**：可提示用户「先写几条你最在意的约束或『不要』，后续检索会自动参考」，降低冷启动时的表达门槛。
3. **用户门控不可侵犯**：涉及删除或替换必须确认；半静默仅限新建（高可靠性静默写、低可靠性显性门控），删除与替换仍须确认
4. **静默成功**：无匹配/成功/非决策输出尽量静默
5. **SSoT**：索引是唯一权威清单，内容以 project/、share/ 下 note 为准
6. **基本操作模型**：所有操作简化为 create/update/delete 三个基本操作，统一操作模型
7. **并集策略与召回优先**：记忆提取时双路径（语义 + 关键词）结果采用**并集**合并后排序，不做交集过滤；优先保证召回率，避免仅单路命中的冷门记忆被误排除，后续调优不得弱化此原则。

## 参考

- **记忆沉淀与写入（实现逻辑）**：taste-recognition（`.cursor/skills/taste-recognition/SKILL.md`）完成识别、模式靠拢与升维判定；仅当 payloads 非空时主 Agent 调用 Subagent `lingxi-memory`（`.cursor/agents/lingxi-memory.md`）传入 payloads 数组；lingxi-memory 调用 **memory-write** skill 执行写入。**主动记忆捕获**由用户通过 /remember 触发；**会话提炼**由心跳自动触发（lingxi-session-distill 后台子代理，source=heartbeat）；**工作流品味嗅探**由 task/plan/build/review 等 **skill** 环节在情境驱动时经 ask-questions 收集用户选择，经 taste-recognition 产出 payload（source=choice）后以 payloads 数组调用 lingxi-memory；/init 在初始化时可将确认草稿可选写入。详见 taste-recognition 的 `references/execution-and-triggers.md`、`references/elevation-rules.md`、`references/pattern-catalog.md` 与各环节 `references/taste-sniff-rules.md`。**内容类型定义及与 Kind 对应**见 taste-recognition 的 `references/content-types.md`。
- **记忆治理与写入**：完整步骤、治理逻辑（dedupe/merge/replace/veto/new）、门控格式与映射规则见 `.cursor/skills/memory-write/references/write-protocol.md` 与 `.cursor/agents/lingxi-memory.md`；`governance_context` 字段契约见 `.cursor/skills/memory-write/references/governance-context-schema.md`，机器校验 SSoT 见 `.cursor/skills/memory-write/references/governance-context.schema.json`。
- **记忆提取**：`memory-retrieve`（`.cursor/skills/memory-retrieve/SKILL.md`）
- **注入约定**：sessionStart hook（`.cursor/hooks/session-init.mjs`）——仅注入记忆检索约定及 conversation_id 传入约定
