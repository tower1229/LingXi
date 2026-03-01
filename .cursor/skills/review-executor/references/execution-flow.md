# Review Executor — 完整执行流程

本文档为 review-executor 的详细步骤、维度启用规则、审查内容与注意事项；SKILL.md 仅保留意图与关键约束。

## 定位

Review 为**独立验收审计**：基于 req 验收标准复核实现与证据，按 F1,F2,... 给出 Pass/Fail 与证据引用。不在 review 阶段新增需求或改范围；缺口与问题回退至 build 修复。

## Instructions

### 1. 读取输入

扫描 `.cursor/.lingxi/tasks/`；taskId 指定或用最大编号 req；查找 `<taskId>.req.*.md`、`<taskId>.plan.*.md`、`<taskId>.testcase.*.md`；定位测试脚本与变更代码文件列表。

### 2. 审查维度智能启用

可验证目标前置（推荐）：审查前执行或说明测试/类型检查/lint 状态。

- **文档一致性**：始终启用，显式调用 `reviewer-doc-consistency`。
- **安全**：语义分析 req（功能需求、API 规范、技术方案）与变更代码（SQL、用户输入、权限、文件操作等）；有安全相关特征则启用 `reviewer-security`，否则跳过。依赖 LLM 语义理解，不关键词匹配。
- **性能**：语义分析 req（批量/实时/高并发、成功标准中的性能指标、缓存/异步）与变更代码；有性能敏感特征则启用 `reviewer-performance`，否则跳过。
- **E2E**：语义分析 req（前端交互、关键流程、多页面）与变更代码（UI、路由、表单等）；有 E2E 特征则启用 `reviewer-e2e`，否则跳过。

记录启用决策汇总（文档一致性✅，安全/性能/E2E ✅或❌）。

### 3. 测试用例文档审查

若存在 testcase：读取并基于 req 审查；覆盖审计规则与 testcase-designer 一致（F→TC 映射与验证方式）；不完整则补充或修改。

### 4. 测试脚本质量检查（执行测试前）

检查覆盖完整性、断言准确性、测试隔离性、边界条件测试、可维护性、一行为一测试。不合格则补充/修正后再执行测试。

### 5. 测试执行

执行单元/集成测试（yarn test / npm test）；记录通过/失败/跳过。无法执行时降级：输出手动测试清单（基于 testcase 或 req）。

### 5.5 按需求编号输出审计结果（必须执行）

在写入 review 文档前，对 req 中每个 F 独立复核：按该 F 的验收标准与验证方式判定 Pass/Fail；填写证据引用（测试日志、Browser 记录、手工记录、评审打分等）。结果写入 review 报告的「按需求编号的验收结果」表。不新增需求、不修改范围或验收标准；缺口列入分级 TODO，回退 build 修复。

### 6. 依次执行核心维度（必须执行）

功能审查、测试覆盖审查、架构审查、可维护性审查、回归风险审查。每维度发现问题按 Blockers/High/Medium/Low 分级。测试覆盖不足视为 High。

### 7. 并行执行可选维度（显式调用 reviewer skills）

按步骤 2 启用决策：显式调用 reviewer-doc-consistency（始终）、reviewer-security、reviewer-performance、reviewer-e2e（按需）；传入 req、变更文件列表等；等待完成并汇总为统一分级格式。某 skill 失败时记录降级原因，可回退主流程依次执行该维度。

### 8. Review 文档写入

按 [review-report-template.md](review-report-template.md) 生成；**必须包含**步骤 5.5 的「按需求编号的验收结果」表。命名 `001.review.<标题>.md`（标题 10 字以内）；不存档，每次覆盖。

### 9. 审查结果处理与 10. 下一步建议

优先级分级：Blockers 必须修复，High 可修复或明确接受风险。结论：通过/需修复/拒绝。只要完成审查（无论是否写入文件），必须在当轮回复末尾输出「**下一步可尝试（选一项）**」+ 四项 A/B/C/D。允许集合：修复后再 `/review`、本任务已交付/无后续、运行测试后再 review、`/remember`、暂不修/其他。审查通过 → A = 本任务已交付；有 Blockers/High → A = 修复后 `/review`。

---

## 使用场景

完整审查：读输入 → 维度启用 → 测试文档/脚本检查 → 测试执行 → 按 F 输出审计结果 → 核心维度 → 并行 reviewer skills → 写入 review 文档 → 下一步建议。简单功能可简化测试脚本检查与部分维度。

---

## 注意事项

1. 记忆写入通过显式调用 lingxi-memory；本 Skill 不包含写入逻辑。
2. 测试脚本质量检查必须在测试执行前完成。
3. 所有问题按 Blockers/High/Medium/Low 分级。
4. 审查结论必须明确（通过/需修复/拒绝）。

---

## 与 Commands 的协作

由 `/review` 命令自动激活（taskId 可选）；Commands 只负责参数解析和产物说明。
