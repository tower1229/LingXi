---
name: memory-write
description: 由 lingxi-memory-write 调用，执行 payloads 校验 → 映射生成 note → 治理 → 门控 → 直接文件写入；写入路径为 memory/project/ 与 memory/share/（由 payload.apply 决定）。
---

# Memory Write

## 意图

由 **lingxi-memory-write** 子代理调用，在给定 **payloads**（及可选 conversation_id、generation_id）下执行：校验 → 按 payload 映射生成 note → 治理（语义近邻 TopK）→ 门控 → 直接文件写入（`memory/project/` 或 `memory/share/` + INDEX），并向调用方返回执行结果摘要。

## 调用方约定

- 仅当 taste-recognition 已产出 payload 时，由 lingxi-memory-write 将 payload（单条或多条）组成 **payloads 数组**传入本 skill。
- 本 skill 不产候选、不做升维；仅接收「已判定为写」的扩展 payload，按协议执行写入。

## 输入

- **payloads**（必填，数组）：每项为扩展 payload（必填 7 字段 + layer；可选 l0OneLiner、l1OneLiner、patternHint、patternConfidence）。详见 taste-recognition 的 payload 规范。
- **conversation_id**（按需）：当前会话 ID，用于记忆审计与会话级关联。
- **generation_id**（按需）：当前轮次/生成 ID，用于审计关联。

## 执行流程（按顺序）

1. **输入校验**：校验 payloads 为非空数组，逐条校验必填字段（7 字段 + layer）及可选字段类型/枚举；任一条非法则拒收该条并返回原因（批量时可约定跳过非法条处理其余）。
2. **映射与补全**：按 [references/write-protocol.md](references/write-protocol.md) 的「映射规则」由每条 payload 生成 note 各字段；note 结构遵循 [references/memory-note-template.md](references/memory-note-template.md)。
3. **治理**：对 `memory/project/` 与 `memory/share/` 做语义近邻 TopK，按无打分硬门槛决策 `dedupe/merge/replace/veto/new`；其中 `merge` 对外单语义，内部可记录 `merge_kind`（`subject_expansion`/`scope_expansion`）。检索范围须包含本批在本轮已写入的 note。
4. **门控**：dedupe 可低风险自动执行；merge/replace 必须 ask-questions 确认；new 时按 payload.confidence：high 可静默写入，medium/low 须 ask-questions 确认。详见 write-protocol 门控节。
5. **写入**：按 payload.apply 决定路径——**apply === "team"** 时写入 `.cursor/.lingxi/memory/share/MEM-<id>.md`，INDEX 的 File 列为 `memory/share/MEM-<id>.md`；否则写入 `.cursor/.lingxi/memory/project/MEM-<id>.md`，File 列为 `memory/project/MEM-<id>.md`。读一次 INDEX 与现有 note 得最大 MEM-id，本批内顺序分配 id，本批全部处理完后一次性写回 INDEX；每条写入后向 `MEMORY_JOURNAL.jsonl` 追加审计。
6. **返回**：向调用方（lingxi-memory-write）返回简报：新建 n 条（MEM-xxx, …）、去重 d 条、合并 m 条、跳过 k 条（veto）；失败时返回错误与建议。

## 依赖（References）

- **Note 结构**：[references/memory-note-template.md](references/memory-note-template.md)
- **写入协议**（映射、治理、门控、INDEX 格式、审计）：[references/write-protocol.md](references/write-protocol.md)

## 约束

- 禁止调用 memory-storage 类脚本；仅使用 Cursor 读/写/编辑文件能力。
- 删除、替换以及 confidence 为 medium/low 的 new 均需用户确认后再执行；dedupe 可自动执行，merge 按门控确认；confidence 为 high 的 new 可静默写入。
