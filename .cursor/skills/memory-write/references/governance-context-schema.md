# Governance Context Schema

`governance_context` 用于记录治理决策的机器可读上下文，服务于审计、回放评测与 self-iterate 分析；不直接暴露给用户。

## 适用事件

- `memory.merge.diagnosed`（推荐）
- `memory.dedupe.applied`（推荐）
- `memory.dedupe.suggested`（可选）
- `memory.new.created_but_related_exists`（可选）

## 字段定义

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `subject_relation` | enum | 是 | `same_subject` \| `different_subject` |
| `conclusion_relation` | enum | 是 | `same_conclusion` \| `non_conflicting` \| `conflicting` \| `unknown` |
| `target_note_id` | string | 否 | 治理目标 note id（如 `MEM-003`） |
| `applied_changes` | string[] | 否 | 已执行变更动作；存在时必须为非空 |
| `idempotency_key` | string | 否 | 幂等键，建议 `${note_id}:${conversation_id}:${generation_id}` |

## merge_kind（仅 merge 事件）

`memory.merge.diagnosed` 可携带 `merge_kind`：

- `subject_expansion`：同主体扩结论
- `scope_expansion`：跨主体扩适用面

## 最小示例

```json
{
  "subject_relation": "same_subject",
  "conclusion_relation": "non_conflicting",
  "target_note_id": "MEM-003",
  "applied_changes": ["append_policy"],
  "idempotency_key": "MEM-006:c-123:g-456"
}
```

