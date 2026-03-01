---
name: task-executor
description: 当执行 /task 命令时自动激活，负责需求分析、提纯、放大和任务文档生成。
---

# Task Executor

## 意图

产出一份符合模板的 task 文档（需求提纯与放大 + 核心技术方案），作为工作流起点。能力：读项目文件与代码库、WebSearch/context7 调研、ask-questions 澄清（遵循 ask-questions 契约）。

## 关键约束

- **任务编号**：执行 `node .cursor/skills/task-executor/scripts/next-task-id.mjs` 获取三位数编号（项目根目录）；标题最多 10 中文字符或 20 英文字符，特殊字符替换为下划线。
- **Fail Fast**：信息汇总前若必要信息缺失（功能目标、目标用户/核心场景等），用 ask-questions 一次性澄清后再写入；无有效选择时重试当前问题。
- **功能需求表（每条 F）**：必填验收标准（可二值判定）、验证方式（unit/integration/e2e/manual/rubric）、边界/异常（至少 1–2 条）、证据形式、优先级。
- **下一步建议**：只要写入了 task 文档，必须在当轮回复末尾输出「**下一步可尝试（选一项）**」+ 四项 A/B/C/D；允许集合：`/vet`、`/plan`、`/build`、补充/修改 task、其他/跳过。用户回复 A/B/C/D 视为选择该选项。

## 产物与委托

- **产物**：`.cursor/.lingxi/tasks/001.task.<标题>.md`；命名格式 `三位数.task.<标题>.md`。
- **模板**：全栈/复杂用 `references/task-doc-template-full.md`，简单功能/其他用 `references/task-doc-template-simple.md`；特性标签（文档为主、库/SDK）在元数据中可选写入。

## References

- **完整执行流程**（步骤 1–9、类型/复杂度/模板矩阵、使用场景、注意事项）：[references/execution-flow.md](references/execution-flow.md)
- 文档模板：`references/task-doc-template-*.md`；品味嗅探规则：`references/taste-sniff-rules.md`
