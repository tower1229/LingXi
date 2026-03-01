---
name: plan-executor
description: 当执行 /plan 命令时自动激活（taskId 可选，省略时使用最新任务），负责任务规划、测试设计和文档生成。
---

# Plan Executor

## 意图

产出 plan + testcase 文档：将 task 拆解为可执行任务（含 F→T 映射、先测再实现顺序、文件变更清单），并产出与 task 验证方式对齐的 testcase。能力：读 task/代码、语义搜索、Web/context7 深度调研、必要时 ask-questions 澄清。

## 关键约束

- **taskId**：指定则用该编号的 task；省略则取 `.cursor/.lingxi/tasks/` 下 `*.task.*.md` 最大编号。
- **F→T 映射**：任务清单中每任务必须标注关联需求（F 编号）；文件变更清单含测试文件与实现文件，对应 Txa/Txb。
- **先测再实现**：可单元测试的单元拆成 Txa（编写该单元测试）、Txb（实现该单元），Txb 依赖 Txa，顺序上先 Txa 再 Txb。
- **testcase**：调用 testcase-designer skill 产出；命名 `001.testcase.<标题>.md`；每条 F（验证方式不为空）均需 TC 或手工/rubric 覆盖。
- **下一步建议**：只要写入了 plan 或 testcase，必须在当轮回复末尾输出「**下一步可尝试（选一项）**」+ 四项 A/B/C/D；允许集合：`/build <taskId>`、调整 plan、回头看 task、其他/跳过。

## 产物与 References

- **产物**：`001.plan.<标题>.md`、`001.testcase.<标题>.md`（标题 10 字以内，从 task 提取）。
- **完整执行流程**（步骤 1–9、任务分类表、测试设计、自检清单）：[references/execution-flow.md](references/execution-flow.md)
- **模板**：`references/plan-doc-template.md`；testcase-designer 见 `.cursor/skills/testcase-designer/SKILL.md`；品味嗅探规则：`references/taste-sniff-rules.md`
