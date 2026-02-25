# Memory Note Template

> 目标：写出**更利于语义检索与最小注入**的记忆文件（小而清晰）。
> 记忆应记录**可复用的品味与约定**（原则、决策、模式、排障路径等），**不要**写入一次性任务实施细节（如某次迁移步骤、某任务的具体实现顺序）。
>
> **结构约定**：When to load 描述「何时加载」（情境）；One-liner 描述「具体做什么/不做什么」。两者表述分工，避免与同一句 scene 完全同义重复。

## Meta

- **Id**: MEM-xxxx
- **Title**: 简短标题，与 INDEX 的 Title 列一致；用于检索与列表展示（SSoT：本字段为 INDEX Title 的来源）
- **Kind**: principle / heuristic / decision / pattern / business / tech / reference / other
- **Status**: active / local / archive（生命周期治理用）
- **Strength**: hypothesis / validated / enforced
- **Scope**: narrow / medium / broad（场景粒度；与 Audience 配合，见 payload 映射规则）
- **Audience**: team / project / personal
- **Portability**: cross-project / project-only
- **Source**: <packName>@<version> / manual / init / user / auto
- **Tags**: 可选；自由关键词
- **Supersedes**: 可选；当本条由 merge/replace 取代其他条目时，填被取代的 MEM-xxx，与 INDEX 同步
- **CreatedAt**: ISO 8601 时间，创建时间
- **UpdatedAt**: ISO 8601 时间，最后更新时间
- **Session**: 创建/更新时的会话 ID（conversation_id），用于审计与治理关联

## When to load

用 1-3 条自然语言描述「什么情况下你会用到它」（情境）。避免关键词列表堆砌。与 One-liner 分工：此处偏「何时」，One-liner 偏「做什么」。

## One-liner (for injection)

一句话可执行提醒：你希望下次我在类似场景下「立刻做对」的那句话。**拒绝、排除、反例**（如「不要…」「这里不用…」）也可写成记忆；用 **Counter-signals** 或 **One-liner** 表达禁止/约束，便于检索时注入。

## Context / Decision

- **Decision**: 当时在判断什么（而不是做了什么）
- **Signals**: 靠什么可观测信号分叉（可选）
- **Alternatives**: 拒绝了什么（可选）
- **Counter-signals**: 什么时候不适用（可选）

## Pointers

尽量给可定位的指针（文件/目录/模块名），避免大段复制内容。
