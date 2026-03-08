# Memory Write Protocol

本协议由 memory-write skill 执行，供 lingxi-memory 调用。根目录指 `.cursor/.lingxi/memory/`，相对路径均相对项目根（如 `memory/project/MEM-001.md`）。

## 写入路径（由 payload.apply 决定）

- **apply === "team"**（团队级）：note 写入 `memory/share/MEM-<id>.md`，INDEX 的 File 列为 `memory/share/MEM-<id>.md`。
- **否则**（project 或未填，项目级）：note 写入 `memory/project/MEM-<id>.md`，INDEX 的 File 列为 `memory/project/MEM-<id>.md`。

## 映射规则（Payload → note）

- **Meta**：Title 由 payload.scene + choice 生成（与 INDEX Title 一致）。若 payload 含 patternHint 且 patternConfidence=high，Kind 设为 `pattern`，Title/When to load 可结合模式名；否则 Kind/Status/Strength/Scope 按 source、apply 与用户表述。**Audience/Portability 来自 apply**：`apply === "team"` → Audience=team、Portability=cross-project，否则 Audience=project、Portability=project-only；Source 来自 payload.source；Supersedes 在治理合并/替换时填写。
- **When to load**：由 payload.scene 生成 1～3 条，偏「何时加载」；若有 patternHint 可结合 taste-recognition 的 pattern-catalog 的 when-to-load 表述。One-liner 偏「做什么」。
- **One-liner**：优先使用 payload.l1OneLiner（layer 为 L1 或 L0+L1）或 payload.l0OneLiner（layer 为 L0）；若无则按「在 [scene] 下优先 [choice]」生成。
- **Context/Decision**：Decision = principles + choice；Alternatives = principles 中除 choice 外；Counter-signals 可选。
- **L0/L1**：仅按 payload.layer 及 payload.l0OneLiner、payload.l1OneLiner 填写；若 note 模板有单独 L0/L1 区块则按 layer 写入对应句。不再执行评分卡或升维判定。

反例/拒绝类：payload 中 choice 或 evidence 表达约束/禁止时，One-liner 或 Decision 可表述为「在 [scene] 下避免 X」；Counter-signals 或 When to load 中体现「何时不适用」。

**生命周期与 Status**：active = 当前有效、参与检索与注入；local = 降级为仅本机/低优先级；archive = 归档、不再参与默认检索。

## 治理逻辑（语义近邻 TopK）

- 搜索范围：`memory/project/` 与 `memory/share/`（即 `.cursor/.lingxi/memory/project/`、`.cursor/.lingxi/memory/share/`）。近邻检索须**包含本批在本轮已写入的 note**，以便本批内不重复建语义相同的 note。
- 用语义搜索构建概念化查询（描述「这条记忆在解决什么决策/风险/约束」），取 Top 5 近邻。
- 对每个近邻评估：same_scenario、same_conclusion、conflict、completeness。
- **决策**：
  - **merge**：same_scenario && same_conclusion → 合并到更完整版本，删除被合并的旧 note 文件，从 INDEX 移除旧行；保留的新 note 的 Supersedes 填被取代的 MEM-xxx，INDEX 对应行同步更新 Supersedes 列。
  - **replace**：conflict 且用户明确选新结论 → 覆盖或先删旧再建新；删除旧 note、从 INDEX 移除旧行；新 note 的 Supersedes 填被取代的 MEM-xxx，INDEX 新行同步。
  - **veto**：conflict 但无法判断更优且用户未给决定性变量 → 不写入，提示补齐或让用户选择保留哪一个。
  - **new**：与 TopK 均不构成 merge/replace → 新建 note 与 INDEX 行。

## 用户门控（ask-questions）

merge/replace 时必须通过 ask-questions 发起交互（question_id: governance_confirm，options：确认执行/取消/新建替代/查看对比）。**仅在用户返回确认执行时**执行写入或删除。**new 路径**：`payload.confidence === "high"` 可静默写入；medium/low 须 ask-questions 确认后再写入。

## INDEX 格式

- 路径：`.cursor/.lingxi/memory/INDEX.md`
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
