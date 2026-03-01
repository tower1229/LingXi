---
name: review-executor
description: 当执行 /review 命令时自动激活（taskId 可选，省略时使用最新任务），负责多维度审查和交付质量保证。
---

# Review Executor

## 意图

独立验收审计：基于 task 验收标准复核实现与证据，按需求编号（F1, F2, ...）给出 Pass/Fail 与证据引用，产出 review 报告。不在 review 阶段新增需求或改范围；缺口回退 build 修复。能力：读 task/plan/testcase 与变更代码、Run shell 执行测试、显式调用 reviewer-\*（含 Browser 用于 E2E）。

## 关键约束

- **按 F 输出审计结果（必须）**：在写入 review 文档前，对 task 中每个 F 独立复核；按该 F 的验收标准与验证方式判定 Pass/Fail，填写证据引用；写入报告的「按需求编号的验收结果」表（见 references 模板）。
- **维度启用**：文档一致性始终启用（reviewer-doc-consistency）；安全/性能/E2E 由语义分析 task 与变更代码判断是否启用，依赖 LLM 语义理解不关键词匹配。
- **测试脚本质量**：执行测试前必须完成测试脚本质量检查（覆盖、断言、隔离、边界、一行为一测试）；不合格则补充/修正后再执行。
- **下一步建议**：只要完成审查（无论是否写入文件），必须在当轮回复末尾输出「**下一步可尝试（选一项）**」+ 四项 A/B/C/D；允许集合：修复后再 `/review`、本任务已交付/无后续、运行测试后再 review、`/remember`、暂不修/其他。

## 产物与 References

- **产物**：`001.review.<标题>.md`（不存档，每次覆盖）；必须含「按需求编号的验收结果」表。
- **完整执行流程**（步骤 1–10、维度启用规则、核心/可选维度、分级与结论）：[references/execution-flow.md](references/execution-flow.md)
- **报告模板**：`references/review-report-template.md`；品味嗅探规则：`references/taste-sniff-rules.md`
