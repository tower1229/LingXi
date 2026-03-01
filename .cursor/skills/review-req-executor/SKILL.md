---
name: review-req-executor
description: 当执行 /review-req 命令时自动激活，负责对 req 文档进行多维度审查，辅助提升任务文档质量。
---

# Review Req Executor

## 意图

对 req 文档做多维度审查并输出改进建议；不产出文件，仅输出审查结果到对话。根据需求类型与复杂度从维度适配矩阵确定执行的维度（D1–D5），按各维度检查项执行并输出审查范围、总体评价、实施准备度、详细问题清单（仅有问题维度）、改进优先级。

## 关键约束

- **taskId**：指定则用该编号的 req；省略则取 `.cursor/.lingxi/tasks/` 下 `*.req.*.md` 最大编号。找不到文件则输出错误并终止。
- **元数据**：从 req 头部读取需求类型（前端/后端/全栈/简单功能/其他）、复杂度（简单/中等/复杂）、特性标签（可选：文档为主、库/SDK）。
- **维度**：简单功能仅 D1+D2；前端/后端/全栈按复杂度执行 D1–D4 或 D1–D5；D4 按类型或特性标签有不同分支（见 references）。
- **下一步建议**：只要输出了审查结果（总体评价、问题清单或改进建议任一项），必须在当轮回复末尾输出「**下一步可尝试（选一项）**」+ 四项 A/B/C/D；允许集合：`/plan <taskId>`、`/build <taskId>`、调整 req、回头看 req、其他/跳过。

## References

- **维度适配矩阵、D1–D5 检查项、输出格式、审查边界、使用场景**：[references/dimensions-and-flow.md](references/dimensions-and-flow.md)
- 输出与静默遵循 about-lingxi 的 workflow-output-principles。
