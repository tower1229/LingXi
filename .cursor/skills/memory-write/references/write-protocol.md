# Memory Write Protocol

本协议由 memory-write skill 执行，供 lingxi-memory-write 调用。根目录指 `.lingxi/memory/`，相对路径均相对项目根（如 `memory/project/MEM-001.md`）。

## 写入路径（由 payload.apply 决定）

- **apply === "team"**（团队级）：note 写入 `memory/share/MEM-<id>.md`，INDEX 的 File 列为 `memory/share/MEM-<id>.md`。
- **否则**（project 或未填，项目级）：note 写入 `memory/project/MEM-<id>.md`，INDEX 的 File 列为 `memory/project/MEM-<id>.md`。

## 映射规则（Payload → note）

Kind 与内容类型（偏好、决策经验、领域知识等）的对应见 taste-recognition 的 `references/content-types.md`。

- **Meta**：Title 由 payload.scene + choice 生成（与 INDEX Title 一致）。若 payload 含 patternHint 且 patternConfidence=high，Kind 设为 `pattern`，Title/When to load 可结合模式名；否则 Kind/Status/Strength/Scope 按 source、apply 与用户表述。**Audience/Portability 来自 apply**：`apply === "team"` → Audience=team、Portability=cross-project，否则 Audience=project、Portability=project-only；Source 来自 payload.source；Supersedes 在治理合并/替换时填写。`Strength` 允许在治理阶段根据重复 merge 信号提升。
  - **TriggerTiming 推断规则**（写入时自动推断，可被人工覆盖）：
    - `post`：When to load 中含「修改……后」「完成……后」「变更……时需同步」「改动……时」且主语为变更结果而非用户输入；
    - `both`：场景既适合执行前提醒（策略/原则），又适合执行后检查（义务/同步）；
    - `pre`：其余情况（默认）；
    - 三个值含义：`pre`=仅在用户输入时触发检索注入；`post`=仅在文件写入后的执行后检索中触发；`both`=两个时机均触发。
- **When to load**：由 payload.scene 生成 1～3 条，偏「何时加载」；若有 patternHint 可结合 taste-recognition 的 pattern-catalog 的 when-to-load 表述。One-liner 偏「做什么」。
- **One-liner**：优先使用 payload.l1OneLiner（layer 为 L1 或 L0+L1）或 payload.l0OneLiner（layer 为 L0）；若无则按「在 [scene] 下优先 [choice]」生成。
- **Context/Decision**：Decision = principles + choice；Alternatives = principles 中除 choice 外；Counter-signals 可选。
- **L0/L1**：仅按 payload.layer 及 payload.l0OneLiner、payload.l1OneLiner 填写；若 note 模板有单独 L0/L1 区块则按 layer 写入对应句。不再执行评分卡或升维判定。

反例/拒绝类：payload 中 choice 或 evidence 表达约束/禁止时，One-liner 或 Decision 可表述为「在 [scene] 下避免 X」；Counter-signals 或 When to load 中体现「何时不适用」。

**生命周期与 Status**：active = 当前有效、参与检索与注入；local = 降级为仅本机/低优先级；archive = 归档、不再参与默认检索。

## 治理逻辑（语义近邻 TopK）

- 搜索范围：`memory/project/` 与 `memory/share/`。近邻检索须**包含本批在本轮已写入的 note**，以便本批内不重复建语义相同的 note。
- 用语义搜索构建概念化查询（描述「这条记忆在解决什么决策/风险/约束」），取 Top 5 近邻。
- 对每个近邻评估：same_subject、same_conclusion、non_conflicting、conflict、completeness。
- **决策**：
  - **dedupe**：same_subject && same_conclusion → 视为重复记忆去重；保留更完整版本，删除重复 note 文件并从 INDEX 移除旧行；保留 note 的 Supersedes 填被取代的 MEM-xxx，INDEX 同步更新。
  - **merge**：用于扩展合并（减少碎片化，扩大承载信息）。对外仅暴露 `merge`；内部可记录 `merge_kind`：`subject_expansion`（同主体扩结论）或 `scope_expansion`（跨主体扩适用面）。
  - **replace**：conflict 且用户明确选新结论 → 覆盖或先删旧再建新；删除旧 note、从 INDEX 移除旧行；新 note 的 Supersedes 填被取代的 MEM-xxx，INDEX 新行同步。
  - **veto**：conflict 但无法判断更优且用户未给决定性变量 → 不写入，提示补齐或让用户选择保留哪一个。
  - **new**：与 TopK 均不构成 dedupe/merge/replace → 新建 note 与 INDEX 行。

### 无打分硬门槛决策树（实现约束）

- 仅允许规则判定，不使用相似度打分。
- **same_subject 判定粒度**：以**元主题层面**（这条记忆在解决什么类型的风险/约束/决策域）为准，而非以具体触发场景为准。只要两条记忆的核心问题域重叠（如"都在维护灵犀的可安装性/可发布性"），即视为 same_subject，触发 merge 门控而非 new。场景措辞不同（如"文件变更时"vs"版本发布时"）不构成 different_subject 的依据；应问"这两条记忆在防御同一类风险吗"。
- 推荐顺序：
  - same_subject + same_conclusion → `dedupe`
  - same_subject + non_conflicting → `merge`（`merge_kind=subject_expansion`）
  - different_subject + same_conclusion → `merge`（`merge_kind=scope_expansion`）
  - conflicting + decisive_choice=true → `replace`
  - conflicting + decisive_choice=false → `veto`
  - 其他 → `new`
- 可执行参考实现：`scripts/governance-decision.mjs`（仅作规则实现与测试基线，不绑定具体工具链）。

### 重复信号到 Strength 提升（治理侧）

- repeated 信号来源于治理阶段的 **merge/dedupe** 事件，不在识别阶段单独计数。
- 仅当治理判定为 `merge` 或 `dedupe` 且无冲突时，才可提升 Strength；replace/veto 不提升。
- 推荐映射（保守）：
  - 初始：`hypothesis`
  - 累计 merge 次数 ≥1：提升为 `validated`
  - 累计 merge 次数 ≥3：提升为 `enforced`
- 若当前条目已高于目标等级，不降级；仅在有明确人工治理指令时允许降级。

### merge/dedupe 诊断事件

- 治理判定为 `merge` 时，追加审计事件 `memory.merge.diagnosed`。
- 治理判定为 `dedupe` 时，追加审计事件 `memory.dedupe.applied`；仅建议去重未执行时记 `memory.dedupe.suggested`。
- 当治理判定为 `new` 且已识别存在高相关候选（TopK 中任一候选的 same_subject 或 same_conclusion 为 true，但因其他原因未触发 merge/dedupe）时，**必须**记录 `memory.new.created_but_related_exists`（用于碎片化诊断）；此为强制要求，不得省略。
- `memory.merge.diagnosed` 事件必填字段：`note_id`、`source`、`diagnosis_tags[]`、`primary_tag`、`action_plan[]`，并建议附带 `merge_kind` 与 `governance_context`。
- 一致性约束：
  - `primary_tag` 必须属于 `diagnosis_tags[]`。
  - `governance_context` 字段与枚举约束见 `references/governance-context-schema.md`。
- 校验失败不阻断主链路：降级写入 `memory.merge.invalid`（含 `reason` 与可选 `invalid_event`）。

## 用户门控（ask-questions）

dedupe 为低风险可自动执行；merge/replace 时必须通过 ask-questions 发起交互（question_id: governance_confirm，options：确认执行/取消/新建替代/查看对比）。**仅在用户返回确认执行时**执行写入或删除。**new 路径**：`payload.confidence === "high"` 可静默写入；medium/low 须 ask-questions 确认后再写入。

## INDEX 格式

- 路径：`.lingxi/memory/INDEX.md`
- 表头：`| Id | Kind | Title | When to load | Status | Strength | Scope | Supersedes | CreatedAt | UpdatedAt | Source | Session | File |`
- File 为相对路径：项目级 `memory/project/MEM-xxx.md`，团队级 `memory/share/MEM-xxx.md`。写入/更新时填写 CreatedAt、UpdatedAt、Source、Session（即 conversation_id）。

## 记忆审计（写入后必须执行）

每次新建/更新/删除 note 或更新 INDEX 后，在项目根执行：

```bash
node .cursor/hooks/append-memory-audit.mjs '<JSON>'
```

JSON 字段：`event`（memory_note_created | memory_note_updated | memory_note_deleted | memory_index_updated）、`ts`（脚本自动生成）、`conversation_id`、`generation_id`、`note_id`、`operation`、`source`、`file`（note 相对路径）。

## 写入实现约束

- 使用 Cursor 提供的读/写/编辑文件能力，禁止调用 memory-storage 类脚本。
- 进入时读一次 INDEX 与现有 project/、share/ 下 note，得到当前最大 MEM-id；本批内顺序分配 id 并递增，本批全部处理完后一次性写回 INDEX。
- Id 格式：MEM- 加数字，保证唯一。

## 记忆升级路径（project → team）

记忆沉淀时默认写入 `memory/project/`（项目级）。当某条记忆满足以下条件时，可考虑将其升级为团队级（写入 `memory/share/`，跨项目复用）：

**升级触发条件（满足其一）**：
- 用户在 `/remember` 或工作流嗅探时明确表示"这个规则适用于所有项目"；
- 记忆的 `Portability` 字段为 `cross-project` 且 `Strength` 已达到 `validated`（即已被合并加强过一次）；
- 在多个项目中出现相同内容的记忆沉淀（self-iterate 碎片化诊断可识别此信号）。

**升级操作步骤**：
1. 将 `memory/project/MEM-xxx.md` 复制到 `memory/share/MEM-xxx.md`；
2. 更新 note 的 Meta 字段：`Audience: team`、`Portability: cross-project`；
3. 更新 `INDEX.md` 中对应行的 `File` 列（由 `memory/project/` 改为 `memory/share/`）、`Audience` 列；
4. 删除原 `memory/project/MEM-xxx.md` 文件；
5. 执行写入审计：追加 `memory_note_updated` 事件记录迁移。

**注意**：升级为 team 级后，该记忆将跨项目可见（若 `memory/share/` 以 git submodule 形式共享）。升级前应确认内容不包含项目特定细节（如具体路径、API 密钥命名等）。

## References

- `governance_context` 契约：`references/governance-context-schema.md`
- `governance_context` JSON Schema：`references/governance-context.schema.json`
