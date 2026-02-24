# Memory Index

> 统一记忆库索引（SSoT - Single Source of Truth）
>
> - 索引只存"最小元数据"，用于治理与快速定位
> - 真实内容在 `memory/notes/*.md`，用于语义检索与注入

## Memories

| Id  | Kind | Title | When to load | Status | Strength | Scope | Supersedes | CreatedAt | UpdatedAt | Source | Session | File |
| --- | ---- | ----- | ------------ | ------ | -------- | ----- | ---------- | --------- | --------- | ------ | ------- | ---- |
| MEM-001 | principle | 以问题/目标为导向设计 Agent 指令 | 编写/评审 Agent 指令（Skill、Command、规则）时；希望提升执行效果或节省 prompt 时 | active | validated | broad | | 2026-02-21T00:00:00.000Z | 2026-02-21T00:00:00.000Z | user | - | memory/notes/MEM-001.md |
| MEM-002 | principle | 作用域与定义方式约定 | 设计或评审约定生效范围、决定写 sessionStart 还是 Command/Skill 时 | active | validated | broad | | 2026-02-23T00:00:00.000Z | 2026-02-23T00:00:00.000Z | user | 839b5c02-19d8-417d-87f6-1b69c0f33576 | memory/notes/MEM-002.md |
| MEM-003 | decision | 记忆候选选择：交互式勾选（questions 多选），非手输编号 | 编写或修改 remember、lingxi-memory、init-executor、about-lingxi 相关文档时；澄清 /remember 或记忆写入交互方式时 | active | validated | narrow | | 2026-02-24T00:00:00.000Z | 2026-02-24T00:00:00.000Z | auto | 1d2ff0fc-f0d2-49be-a106-c8c7d5b8ee6e | memory/notes/MEM-003.md |
| MEM-004 | decision | lingxi-memory 输入契约不含 context 参数 | 编写或修改 lingxi-memory 的输入约定、SKILL 或调用说明时；remember 流程调用 lingxi-memory 时 | active | validated | narrow | | 2026-02-24T00:00:00.000Z | 2026-02-24T00:00:00.000Z | auto | 1d2ff0fc-f0d2-49be-a106-c8c7d5b8ee6e | memory/notes/MEM-004.md |
| MEM-005 | decision | questions 交互统一通过 questions-interaction Skill 复用 | 在 remember、init、lingxi-memory 等需要 questions 单选/多选或取消重试时；编写或评审交互流程时 | active | validated | medium | | 2026-02-24T00:00:00.000Z | 2026-02-24T00:00:00.000Z | auto | 1d2ff0fc-f0d2-49be-a106-c8c7d5b8ee6e | memory/notes/MEM-005.md |
| MEM-006 | decision | 引用 questions-interaction 时用自然语言短表达 | 在文档或 SKILL 中引用 questions-interaction 时；编写或评审「引用某 Skill」的表述时 | active | validated | medium | | 2026-02-24T00:00:00.000Z | 2026-02-24T00:00:00.000Z | auto | 1d2ff0fc-f0d2-49be-a106-c8c7d5b8ee6e | memory/notes/MEM-006.md |
