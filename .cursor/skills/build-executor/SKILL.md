---
name: build-executor
description: 当执行 /build 命令时自动激活（taskId 可选，省略时使用最新任务），负责代码实现、测试编写和执行。
---

# Build Executor

## 意图

按 req（及可选 plan）实现并通过测试。模式：存在 `<taskId>.plan.*.md` → Plan-driven（任务与顺序来自 plan）；否则 Req-driven（Agent 基于 req 拆解任务）。能力：读 req/plan、编辑代码、语义搜索、Run shell 执行测试。

## 关键约束

- **先测再实现（TDD）**：仅对验证方式为 `unit` 或 `integration` 的单元。每单元：先仅编写该单元测试（基于 testcase/req 输入/输出/边界）→ 运行确认失败/基线 → 只通过修改实现使通过，不改测试 → 通过后再下一单元。不通过改测试通过验收。
- **Req-driven 无 testcase**：先调用 testcase-designer 生成并写入 `<taskId>.testcase.<标题>.md`，再继续。
- **manual/rubric**：不写自动化测试；产出可执行清单（步骤+预期结果）与证据占位，交付前完成并保留证据。
- **下一步建议**：只要产生代码或测试变更，必须在当轮回复末尾输出「**下一步可尝试（选一项）**」+ 四项 A/B/C/D；允许集合：`/review <taskId>`、`/remember` 沉淀、先改代码再 review、其他/跳过。

## 产物与 References

- **产物**：代码与测试变更；无单独文档产物（review 文档由 review-executor 产出）。
- **完整执行流程**（模式检测、2.1–2.6、降级、测试规范、场景）：[references/execution-flow.md](references/execution-flow.md)
- 品味嗅探规则：`references/taste-sniff-rules.md`
