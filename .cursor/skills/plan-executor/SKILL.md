---
name: plan-executor
description: 当执行 /plan 命令时自动激活（taskId 可选，省略时使用最新任务），负责任务规划、测试设计和文档生成。
---

# Plan Executor

## 意图

产出 plan + testcase 文档：将 task 拆解为可执行任务（含 F→T 映射、先测再实现顺序、文件变更清单），并产出与 task 验证方式对齐的 testcase。能力：读 task/代码、语义搜索、Web/context7 深度调研、必要时 ask-questions 澄清。

## 关键约束

- **taskId**：指定则用该编号的 task；省略则执行 `node .cursor/skills/task-executor/scripts/latest-task-id.mjs` 获取最新任务编号。
- **F→T 映射**：任务清单中每任务必须标注关联需求（F 编号）；文件变更清单含测试文件与实现文件，对应 Txa/Txb。
- **先测再实现**：可单元测试的单元拆成 Txa（编写该单元测试）、Txb（实现该单元），Txb 依赖 Txa，顺序上先 Txa 再 Txb。
- **testcase**：调用 testcase-designer skill 产出；命名 `001.testcase.<标题>.md`；每条 F（验证方式不为空）均需 TC 或手工/rubric 覆盖。
- **下一步建议**：只要写入了 plan 或 testcase，必须在当轮回复末尾输出「**下一步可尝试（选一项）**」+ 四项 A/B/C/D；允许集合：`/build <taskId>`、调整 plan、其他/跳过。

## 完整执行流程（关键步骤不省略）

1. **读取输入与定位**
   - 扫描 `.cursor/.lingxi/tasks/`；指定 taskId 用指定编号，省略时执行 `node .cursor/skills/task-executor/scripts/latest-task-id.mjs`。
   - 读取 `<taskId>.task.*.md`；找不到文件时必须终止并给出可执行修复建议。

2. **目标回放与边界锁定**
   - 读取 task 全文，提取目标、验收标准、关键约束、非目标。
   - 明确进入 `/plan` 后 task 默认锁定；若 task 变化，需重新执行 `/plan`。

3. **方案细化（实施级）**
   - 基于代码上下文细化实施路径：模块改动点、接口/数据流、关键技术选择、落地顺序。
   - 若存在不确定项，使用 ask-questions 一次性澄清；涉及第三方库/API 或多方案取舍时再做外部调研。
   - 输出细化结论（做法、约束、风险、兜底策略），作为后续拆解输入。

4. **任务拆解与依赖编排**
   - 按业务独立性与可测试性拆成可执行小任务，控制单任务体量。
   - 标注依赖关系与执行顺序；可单测单元强制拆成 Txa（测试）/Txb（实现），且 Txb 依赖 Txa。
   - 输出文件变更清单，测试文件与实现文件关系可追溯。

5. **测试映射设计（F→T→TC）**
   - 每条 F 必须映射到任务与测试覆盖（unit/integration/e2e/manual/rubric）。
   - 不发明需求外行为；manual/rubric 必须提供可执行步骤、预期结果和证据形式。

6. **文档写入**
   - 写入 `001.plan.<标题>.md` 与 `001.testcase.<标题>.md`。
   - plan 必须包含：任务清单、依赖关系、文件变更清单、测试映射、执行顺序。

7. **质量自检与下一步建议（有产物时必须输出）**
   - 自检必须覆盖：F→T→TC 映射完整、依赖可执行、任务粒度适中、先测后实现顺序成立。
   - 只要写入了 plan 或 testcase，末尾必须输出「下一步可尝试（选一项）」+ A/B/C/D。
   - 选项仅允许：`/build <taskId>`、调整 plan、其他/跳过。

## 使用场景

- **简单需求**：可弱化澄清与外部放大，但 F→T 和测试覆盖不可缺失。
- **复杂需求**：必须执行代码分析与澄清，先形成可执行计划再进入 build。

## 注意事项

1. 记忆写入通过显式调用 `lingxi-memory`，本 Skill 不包含写入逻辑。
2. 测试设计必须从 task 验收标准推导，禁止新增需求外目标。
3. 计划产物需要可直接驱动 build，不写“只能讨论、不可执行”的抽象描述。

## 产物与 References

- **产物**：`001.plan.<标题>.md`、`001.testcase.<标题>.md`（标题 10 字以内，从 task 提取）。
- **模板**：`references/plan-doc-template.md`；testcase-designer 见 `.cursor/skills/testcase-designer/SKILL.md`；品味嗅探规则：`references/taste-sniff-rules.md`

## 与 Commands 的协作

本 Skill 由 `/plan` 自动激活；Command 仅负责参数承载与触发说明。
