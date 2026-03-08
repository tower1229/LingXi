---
name: build
description: Implements code and tests from a task (and optional plan) with TDD where applicable. Use when the user asks to implement a task, run build, or execute the build phase (e.g. /build or "implement task 001").
---

# Build

## 意图

按 task（及可选 plan）实现并通过测试。模式：存在 `<taskId>.plan.*.md` → Plan-driven（任务与顺序来自 plan）；否则 Task-driven（Agent 基于 task 拆解任务）。能力：读 task/plan、编辑代码、语义搜索、Run shell 执行测试。

## 关键约束

- **taskId**：指定则用该编号的 task；省略则执行 `node .cursor/skills/task/scripts/latest-task-id.mjs` 获取最新任务编号。
- **先测再实现（TDD）**：仅对验证方式为 `unit` 或 `integration` 的单元。每单元：先仅编写该单元测试（基于 testcase/task 文档输入/输出/边界）→ 运行确认失败/基线 → 只通过修改实现使通过，不改测试 → 通过后再下一单元。不通过改测试通过验收。
- **Task-driven 无 testcase**：先调用 testcase-designer 生成并写入 `<taskId>.testcase.<标题>.md`。生成失败、未写入、或未通过 F→TC 覆盖与验证方式一致性校验时，必须立即终止；未通过校验不得进入编码循环。
- **manual/rubric**：不写自动化测试；产出可执行清单（步骤+预期结果）与证据占位，交付前完成并保留证据。
- **下一步建议**：只要产生代码或测试变更，必须在当轮回复末尾输出「**下一步可尝试（选一项）**」+ 四项 A/B/C/D；允许集合：执行 review skill、`/remember` 沉淀、先改代码再 review、其他/跳过。

## 完整执行流程（关键步骤不省略）

1. **模式检测（自动）**
   - 指定 taskId 时使用该编号；省略时执行 `node .cursor/skills/task/scripts/latest-task-id.mjs` 获取最新任务编号。
   - 查找 `<taskId>.plan.*.md`：存在为 Plan-driven，不存在为 Task-driven。

2. **读取输入**
   - 必读 `<taskId>.task.*.md`。
   - Plan-driven 追加读取 plan + testcase。
   - Task-driven 若无 testcase，必须先调用 testcase-designer 生成并写入；生成失败或未写入时立即终止。
   - Task-driven 在进入实现前，testcase 是必需输入；若未完成 F→TC 覆盖与验证方式一致性校验，必须终止。

3. **任务与顺序确定**
   - Plan-driven 的任务顺序来自 plan。
   - Task-driven 由 Agent 基于 task 拆解，复杂依赖场景需显式标注依赖关系。

4. **先测再实现（TDD）**
   - 仅用于 `unit` / `integration` 可测单元。
   - 固定循环：先写该单元测试 -> 运行确认失败/基线 -> 只改实现使测试通过 -> 通过后再下一单元。
   - 不通过“改测试”绕过验收；不为尚不存在功能写无效 mock。

5. **按单元实现与测试循环**
   - 逐单元执行“测试->实现->复测”闭环。
   - 失败时仅调整实现，直到当前单元通过，再进入下一个单元。
   - manual/rubric 场景不写自动化测试，输出可执行步骤、预期结果、证据占位。

6. **文档同步**
   - Plan-driven 按 plan 的文档同步清单执行。
   - Task-driven 识别受影响文档（如 docs/design/architecture）并同步更新。

7. **快速 E2E 冒烟（可选）**
   - e2e 需求按语义判断是否需 Browser 验证关键流程。
   - 通过则静默；失败输出详情并标记为高优先级问题。

8. **降级路径**
   - 测试框架不可执行时，必须输出手工测试清单（基于 testcase 或 task）。
   - 文档同步无法执行时，必须输出待同步清单和阻塞原因。

9. **下一步建议（有产物时必须输出）**
   - 只要发生代码/测试变更，末尾必须输出「下一步可尝试（选一项）」+ A/B/C/D。
   - 选项仅允许：执行 review skill、`/remember`、先改代码再 review、其他/跳过。

## 测试执行规范

- **执行时机**：开始前跑现有测试；写完单元测试后立刻跑该单元；每完成实现任务跑相关测试；交付 review 前跑全量测试。
- **测试原则**：先测后实现、隔离外部依赖、单一行为单测、仅覆盖 task/plan/testcase 已定义行为。
- **结果处理**：通过静默；失败输出并循环修复。

## 使用场景

- **Plan-driven**：复杂任务、生产改动、依赖明确计划时使用。
- **Task-driven**：简单需求、快速迭代，先补 testcase 再推进。

## 注意事项

1. 记忆写入仅通过显式调用 `lingxi-memory`。
2. 当前单元测试未通过前，不得进入下一单元。
3. 模式由 plan 文件是否存在自动判定，不手动硬切换。

## 产物与 References

- **产物**：代码与测试变更；无单独文档产物（review 文档由 review skill 产出）。
- 品味嗅探规则：`references/taste-sniff-rules.md`
