---
name: memory-govern
description: 记忆库治理：同步 INDEX 与 notes（脚本删孤儿行、模型补全未索引条目），可选全库主动治理。
---

# Memory Govern

## 意图

由 `/memory-govern` 调用。同步 `.cursor/.lingxi/memory/INDEX.md` 与 `memory/notes/` 的一致性，并由模型补全未索引 note 的 INDEX 行以提升检索质量；可选对整库做主动治理（合并/改写/归档建议）。

## 调用形式与输入

- **/memory-govern** [--dry-run] [--skip-govern] [--root \<memoryRoot\>]
- `--dry-run`：仅执行脚本并输出结果，不写回 INDEX、不调用模型补全、不执行阶段 2。
- `--skip-govern`：执行阶段 1（同步 + 模型补全未索引），跳过阶段 2（全库治理）。
- `--root`：指定 memory 根目录，默认 `.cursor/.lingxi/memory`（相对项目根）。

## 执行流程（SSoT）

### 阶段 1：同步

1. **调用脚本**：在项目根执行 `node .cursor/skills/memory-govern/scripts/memory-index-sync.mjs [--root <memoryRoot>]`。脚本会：
   - 扫描 `memory/notes/`（含 `share/`）与 `memory/INDEX.md`；
   - **直接删除**孤儿索引行（INDEX 中有但对应 note 文件不存在），并写回 INDEX；
   - 向 **stdout** 输出一行 JSON，不向 stdout 输出其他内容；错误与警告可写 stderr。
2. **解析输出**：从 stdout 读取一行 JSON，得到 `orphanDeleted`、`unindexedNotes`、`duplicateIds`。
3. **处理未索引 note**：对 `unindexedNotes` 中每一项：
   - 读取该 note 文件全文（及脚本已返回的 id/title/whenToLoad/kind 等）；
   - 调用模型，根据 note 内容生成符合规范的 INDEX 行（Id、Kind、Title、When to load、Status、Strength、Scope、Supersedes、File；若 INDEX 有扩展列 CreatedAt/UpdatedAt/Source/Session 可一并生成或留空）；
   - 将新行追加或合并进 INDEX（Id 若 note 中已有则沿用，否则分配新 MEM-xxx，与现有 INDEX 中最大 id 递增）；
   - 可选：将模型生成的 Meta 写回 note 的 frontmatter，保持 note 与 INDEX 一致。
4. **duplicateIds**：脚本已按 project-over-share 选出 winner；可选在简报中提示用户存在重复 Id，便于人工治理。

若 `--dry-run`，则仅执行步骤 1–2，输出解析结果，不写回 INDEX、不调用模型。

### 阶段 2：主动治理（可选）

当未传 `--skip-govern` 且未传 `--dry-run` 时执行：

1. **输入**：当前 INDEX 表（及可选：关键 note 摘要或全文）。
2. **模型**：对整库提出建议，可包括：合并/ Supersedes 建议、Title/When to load 优化、Kind/Strength/Scope 一致性、归档（Status=archive）建议、对 `duplicateIds` 的保留建议。
3. **门控**：建议列表经 **ask-questions** 或逐条确认，用户确认后再写回 INDEX 与（必要时）note 文件；删除/合并/归档等敏感操作必须确认，与 lingxi-memory 门控一致。
4. **写回**：仅对用户采纳的项修改 INDEX 与 note。

## 关键约束

- **脚本唯一 stdout**：脚本仅向 stdout 输出一行 JSON，便于 Agent 解析；不得在 stdout 混入日志或提示。
- **孤儿行仅由脚本删除**：删除孤儿索引行的逻辑仅在脚本内执行，Agent 不重复实现。
- **未索引条目仅由模型补全**：不依赖脚本解析的 meta 直接写 INDEX 行；须经模型生成 Title/When to load 等以保证质量。
- **Id 分配**：新 INDEX 行的 Id 优先使用 note 已有 Id；若无则从当前 INDEX 最大 MEM-id 递增分配。
- **门控**：阶段 2 的修改须用户确认后执行，不得静默改写整库。

## 依赖

- 脚本：`scripts/memory-index-sync.mjs`（本 Skill 下），仅依赖 Node 内置 `fs`/`path`。
- 项目根：脚本默认 memory 根为 `process.cwd() + '/.cursor/.lingxi/memory'`，调用时需在项目根执行或传入 `--root`。

## 输出

- 阶段 1 后：简报（删除孤儿数、补全未索引数、可选 duplicateIds 提示）。
- 阶段 2 后：采纳的治理建议数与简要说明。
- 若有错误（如脚本执行失败、JSON 解析失败）：明确报错并终止后续步骤。
