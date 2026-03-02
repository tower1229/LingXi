---
name: review-executor
description: 当执行 /review 命令时自动激活（taskId 可选，省略时使用最新任务），负责多维度审查和交付质量保证。
---

# Review Executor

## 意图

独立验收审计：基于 task 验收标准复核实现与证据，按需求编号（F1, F2, ...）给出 Pass/Fail 与证据引用，产出 review 报告。不在 review 阶段新增需求或改范围；缺口回退 build 修复。能力：读 task/plan/testcase 与变更代码、Run shell 执行测试、显式调用 reviewer-\*（含 Browser 用于 E2E）。

## 关键约束

- **taskId**：指定则用该编号的 task；省略则执行 `node .cursor/skills/task-executor/scripts/latest-task-id.mjs` 获取最新任务编号。脚本失败则输出错误并终止。
- **按 F 输出审计结果（必须）**：在写入 review 文档前，对 task 中每个 F 独立复核；按该 F 的验收标准与验证方式判定 Pass/Fail，填写证据引用；写入报告的「按需求编号的验收结果」表（见 references 模板）。证据缺失或不可验证时该 F 必须判定为 Fail，不得判 Pass。
- **维度启用**：文档一致性始终启用（reviewer-doc-consistency）；安全/性能/E2E 由语义分析 task 与变更代码判断是否启用，依赖 LLM 语义理解不关键词匹配。
- **测试脚本质量**：执行测试前必须完成测试脚本质量检查（覆盖、断言、隔离、边界、一行为一测试）；不合格则补充/修正后再执行。
- **结论门控**：只要存在证据缺失/不可验证或任一 F=Fail，总结论不得为“通过”；必须至少归类为 High/Blocker，并回退 `/build` 修复。
- **下一步建议**：只要完成审查（无论是否写入文件），必须在当轮回复末尾输出「**下一步可尝试（选一项）**」+ 四项 A/B/C/D；允许集合：修复后再 `/review`、本任务已交付/无后续、运行测试后再 review、`/remember`、暂不修/其他。

## 完整执行流程（关键步骤不省略）

1. **读取输入**
   - 扫描 `.cursor/.lingxi/tasks/`。
   - 指定 taskId 用指定编号；省略时执行 `node .cursor/skills/task-executor/scripts/latest-task-id.mjs` 获取最新编号。
   - 脚本失败必须终止并输出错误。
   - 读取 `<taskId>.task.*.md`、可选 `<taskId>.plan.*.md`、`<taskId>.testcase.*.md` 与变更文件列表。

2. **审查维度启用决策**
   - 文档一致性维度始终启用（`reviewer-doc-consistency`）。
   - 安全/性能/E2E 按 task + 代码语义按需启用（非关键词匹配）。
   - 记录维度启用决策，保证结论可追溯。

3. **测试用例文档审查**
   - 存在 testcase 时，先做 F→TC 覆盖和验证方式一致性审查。
   - 覆盖缺失需先补齐/修正再进入后续审查。

4. **测试脚本质量检查（先于执行）**
   - 必查：覆盖完整性、断言质量、测试隔离、边界条件、一行为一测试。
   - 不合格先修测试，再执行测试。

5. **测试执行**
   - 执行自动化测试并记录通过/失败/跳过。
   - 无法执行时给出手工测试清单（基于 testcase 或 task）。

6. **按需求编号输出审计结果（必须）**
   - 写 review 文档前，逐条 F 做 Pass/Fail 判定并写证据引用。
   - 证据缺失/不可验证时，该 F 必须 Fail，不得判 Pass。
   - 严禁在 review 阶段新增需求或改范围；发现缺口回退 build 修复。

7. **核心维度审查（必须）**
   - 功能、测试覆盖、架构、可维护性、回归风险按顺序审查。
   - 问题统一分级：Blockers/High/Medium/Low。

8. **可选维度审查（按需）**
   - 按启用决策显式调用 reviewer-security/reviewer-performance/reviewer-e2e。
   - 子审查失败时记录降级原因并回退主流程补审。

9. **写入 Review 文档**
   - 覆盖写入 `001.review.<标题>.md`（不存档、每次覆盖）。
   - 文档必须包含「按需求编号的验收结果」表。

10. **结论与下一步建议（必须）**
   - 给出通过/需修复/拒绝结论。
   - 只要存在证据缺失/不可验证或任一 F=Fail，结论不得为“通过”，并回退 `/build` 修复。
   - 只要完成审查（无论是否写入文件），末尾必须输出「下一步可尝试（选一项）」+ A/B/C/D。
   - 选项仅允许：修复后再 `/review`、本任务已交付/无后续、运行测试后再 review、`/remember`、暂不修/其他。

## 使用场景

- **完整交付审查**：执行全流程并产出完整审查报告。
- **简单改动审查**：可缩减可选维度，但按 F 审计结果和结论不可省略。

## 注意事项

1. 记忆写入通过显式调用 `lingxi-memory`，本 Skill 不包含写入逻辑。
2. 测试脚本质量检查必须在测试执行前完成。
3. 分级与结论必须明确，避免“有问题但无判定”。

## 产物与 References

- **产物**：`001.review.<标题>.md`（不存档，每次覆盖）；必须含「按需求编号的验收结果」表。
- **报告模板**：`references/review-report-template.md`；品味嗅探规则：`references/taste-sniff-rules.md`

## 与 Commands 的协作

本 Skill 由 `/review` 自动激活；Command 仅负责参数承载与触发说明。
