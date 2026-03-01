# Testcase Designer — 完整约束与流程

本 Skill 由 plan-executor（主产出）、build-executor（Task-driven 且无 testcase 时）、review-executor（覆盖审计）显式调用。从 task 文档产出结构化 testcase 文档，保证 F→TC 映射与验证方式一致。

## 输入输出

- **输入**：task 文档路径（如 `.cursor/.lingxi/tasks/<taskId>.task.<标题>.md`）或 task 文档正文。
- **输出**：结构化 testcase 文档，与 [testcase-doc-template.md](testcase-doc-template.md) 同构；命名 `<taskId>.testcase.<标题>.md`（标题 10 字以内）。

## 步骤概要

1. **解析 task**：读取「4. 功能需求」表及验收标准、成功标准、验收检查清单；提取每条 F 的需求编号、需求描述、验收标准、验证方式（unit/integration/e2e/manual/rubric）、边界/异常、证据形式、优先级。
2. **核心约束**：所有「验证方式不为空」的 F 必须有对应 TC 或手工/rubric 区块；每个 TC 或手工/评审块必须标注来源需求编号（至少一个 F）。manual 的 F 生成可执行步骤、预期结果、记录模板；rubric 的 F 生成评分维度、执行步骤与记录。
3. **按验证方式分区**：unit → 单元测试用例区块；integration → 集成测试用例区块；e2e → 端到端用例区块；manual/rubric → 手工验证与评审区块（见模板「5. 手工验证与评审」）。
4. **文档结构**：按 testcase-doc-template 生成测试范围、单元/集成/E2E 用例（每用例含来源需求编号）、手工验证与评审、测试数据准备（如需要）。

## 与 plan/build/review 的约定

plan-executor 调用本 Skill 产出 testcase；build-executor 在 Task-driven 且无 testcase 时调用并生成后再继续；review-executor 按相同 F→TC 映射与验证方式做覆盖审计。

## 注意事项

不发明 task 中未出现的需求或验收标准；边界/异常从 task 推导，不随意扩展；模板以本 Skill 的 references 为 SSoT。
