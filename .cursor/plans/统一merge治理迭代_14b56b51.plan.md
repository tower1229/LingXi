---
name: 统一Merge治理迭代
overview: 统一对外 merge 语义、引入 dedupe 与内部 merge 子类判定，并联动自我迭代与回放评测，形成从写入治理到24h优化的闭环。此次仅对新写入生效，不迁移既有记忆。
todos:
  - id: spec-governance-contract
    content: 更新 memory-write 与 memory-system 协议：对外统一 merge，新增 dedupe 与内部 merge_kind 契约
    status: completed
  - id: audit-schema-upgrade
    content: 扩展 append-memory-audit 事件集与兼容校验，覆盖 dedupe 和治理上下文字段
    status: completed
  - id: governance-decision-tree
    content: 在 memory-write 实现中落地无打分硬门槛决策树与门控策略
    status: completed
  - id: self-iterate-upgrade
    content: 改造 proposal/apply：消费多类治理信号并输出治理健康摘要
    status: completed
  - id: replay-eval-pipeline
    content: 将回放评测指标纳入 24h 自我迭代提案输入
    status: completed
  - id: tests-and-acceptance
    content: 补齐审计、提案、治理决策树测试并完成验收
    status: completed
isProject: false
---

# 统一 Merge 治理迭代计划

## 目标与边界

- 目标：将外部治理决策统一为 `dedupe/merge/replace/veto/new`，其中 `merge` 对外单一语义，内部保留 `merge_kind`（`subject_expansion/scope_expansion`）用于审计与自我迭代。
- 边界：本次包含协议、实现、审计、24h 自我迭代与测试；不做历史记忆迁移，仅对后续新写入生效。

## 当前实现结论（作为改造基线）

- 写入治理当前把 `merge` 绑定为 `same_scenario && same_conclusion`（应转为 `dedupe`）。见 [write-protocol](/Users/zangtao/Workspace/tower1229/LingXi/.cursor/skills/memory-write/references/write-protocol.md)。
- 审计当前仅支持 `memory.merge.diagnosed/invalid` 且强校验 `same_scenario/same_conclusion`。见 [append-memory-audit.mjs](/Users/zangtao/Workspace/tower1229/LingXi/.cursor/hooks/append-memory-audit.mjs)。
- self-iterate 仅消费 `memory.merge.diagnosed` 统计 merge 次数，无法覆盖 dedupe/扩展合并机会。见 [memory-improvement-proposal.mjs](/Users/zangtao/Workspace/tower1229/LingXi/.cursor/agents/lingxi-self-iterate/scripts/memory-improvement-proposal.mjs)。

## 方案设计（落地顺序）

1. **协议统一（先文档）**

- 更新写入协议：
  - `dedupe`：同主体同结论去重（非 merge）
  - `merge`：扩展合并（内部 `merge_kind`）
  - 保留 `replace/veto/new`
- 保持外部接口只暴露 `merge`，内部上下文新增 `governance_context` 字段（含 `merge_kind/subject_relation/conclusion_relation/target_note_id/applied_changes/idempotency_key`）。
- 同步更新记忆系统说明文档，确保“对外 merge 单语义，内部细分不外露”成为 SSoT。

1. **审计契约扩展（兼容旧事件）**

- 在 append-memory-audit 增加新事件与字段校验：
  - 新增：`memory.dedupe.applied`、`memory.dedupe.suggested`、`memory.new.created_but_related_exists`
  - 扩展：`memory.merge.diagnosed` 支持 `merge_kind` 与 `governance_context`
- 保持向后兼容：旧 payload 仍可落盘，避免阻断现有流程。

1. **治理执行逻辑改造（memory-write 实现侧）**

- 改为硬门槛决策树（无打分）：
  - same_subject + same_conclusion -> `dedupe`
  - same_subject + non_conflicting -> `merge` (`subject_expansion`)
  - different_subject + same_conclusion -> `merge` (`scope_expansion`)
  - conflicting -> `replace/veto`
  - 其他 -> `new`
- 门控规则：`dedupe` 可低风险自动；`merge/replace` 保持确认门控；`new` 沿用 confidence 策略。

1. **self-iterate 联动升级**

- proposal 生成脚本改为多信号聚合：`dedupe_pressure`、`merge_opportunity`、`fragmentation_signal`，不再只看 merge 次数。
- apply 脚本动作类型扩展：支持 low-risk dedupe/轻量 merge 优化动作自动入队，其余按风险拒绝或待确认。
- 让 24h 流程输出“治理健康摘要”（重复创建率、可合并机会、碎片化趋势）。

1. **回放评测纳入自我迭代链路**

- 增加 replay 输入（近窗口 remember + audit 事件）并计算指标：
  - `duplicate_creation_rate`
  - `merge_conversion_rate`
  - `fragmentation_index`
  - `post_injection_correction_rate`
- 指标写入 proposal，作为 action 排序与风险判定依据。

1. **测试与验收**

- 扩展/新增测试：
  - [append-memory-audit.test.mjs](/Users/zangtao/Workspace/tower1229/LingXi/test/hooks/append-memory-audit.test.mjs)：新事件与兼容校验
  - [memory-improvement-proposal.test.mjs](/Users/zangtao/Workspace/tower1229/LingXi/test/scripts/memory-improvement-proposal.test.mjs)：多信号聚合与摘要输出
  - 新增治理决策测试（建议在 `test/skills/`）：覆盖 dedupe/merge/replace/veto/new 决策树
- 验收条件：
  - 对外无 `merge_kind` 暴露
  - `same_scenario && same_conclusion` 路径不再计为 merge，而是 dedupe
  - self-iterate 能产出非 merge-only 的改进建议
  - 全量相关测试通过

## 关键风险与处理

- 风险：审计字段变更导致老数据/旧脚本不兼容。
  - 处理：append-memory-audit 采取向后兼容校验与默认值兜底。
- 风险：dedupe 自动化误删语义差异。
  - 处理：仅允许“同主体同结论”的严格 dedupe 自动执行；其余走 merge/确认门控。
- 风险：self-iterate 指标引入后噪声较大。
  - 处理：先以只读诊断输出运行一轮，稳定后再影响自动动作优先级。
