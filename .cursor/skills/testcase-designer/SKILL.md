---
name: testcase-designer
description: 由 plan-executor（主产出）、build-executor（Req-driven 且无 testcase 时）、review-executor（覆盖审计）显式调用，从 req 文档产出结构化 testcase 文档，保证 F→TC 映射与验证方式一致。
---

# Testcase Designer

## 触发与输入输出

- **触发**：本 Skill 由 **plan-executor**（生成 testcase）、**build-executor**（Req-driven 且无 testcase 时调用）、**review-executor**（按相同规则做覆盖审计）显式调用，不自动激活。
- **输入**：req 文档路径（如 `.cursor/.lingxi/tasks/<taskId>.req.<标题>.md`）或 req 文档正文。
- **输出**：结构化 testcase 文档，与 [references/testcase-doc-template.md](references/testcase-doc-template.md) 同构，包含单元/集成/E2E/手工验证与评审区块；命名约定与 plan 一致：`<taskId>.testcase.<标题>.md`。

## Instructions

### 1. 解析 req

- 读取 req 文档的「4. 功能需求」表及验收标准、成功标准、验收检查清单。
- 提取每条 F 的：需求编号、需求描述、验收标准、**验证方式**（unit/integration/e2e/manual/rubric）、边界/异常、证据形式、优先级。

### 2. 核心约束（必须满足）

- **覆盖**：所有「验证方式不为空」的 F 必须有对应 TC 或手工/rubric 区块；不得遗漏任一 F。
- **关联**：每个 TC（或手工验证块、评审块）必须标注**来源需求编号**（至少一个 F 编号）。
- **manual/rubric**：对验证方式为 `manual` 的 F，生成可执行步骤、预期结果、记录模板；对 `rubric` 的 F，生成评分维度、执行步骤与记录（总分/结论）。

### 3. 按验证方式分区产出

- **unit**：单元测试用例区块，每个 TC 含来源需求编号、前置条件、测试数据、步骤、预期结果、边界条件。
- **integration**：集成测试用例区块，每个 TC 含来源需求编号、前置条件、步骤、预期结果。
- **e2e**：端到端测试用例区块，含场景描述、前置条件、测试步骤、验证点、预期结果；与 req 中 e2e 需求对应。
- **manual / rubric**：手工验证与评审区块（见模板「5. 手工验证与评审」），含执行步骤、预期结果、记录模板或评分维度。

### 4. 文档结构

按 [references/testcase-doc-template.md](references/testcase-doc-template.md) 生成：

- 测试范围：1.1 覆盖的功能需求（需求编号、需求描述、测试用例编号），1.2 不覆盖的范围。
- 单元/集成/E2E 用例：每个用例块含**来源需求编号**。
- 手工验证与评审：manual/rubric 对应 F 的可执行步骤与记录/评分模板。
- 测试数据准备（如需要）。

### 5. 与 plan/build/review 的约定

- plan-executor 调用本 Skill 产出 testcase。
- build-executor 在 Req-driven 且无 testcase 时调用本 Skill 生成 testcase 再继续实施。
- review-executor 按相同 F→TC 映射与验证方式做覆盖审计，与 plan/build 口径一致。

## 注意事项

1. 不发明 req 中未出现的需求或验收标准。
2. 边界/异常从 req 的「边界/异常」列或验收标准推导，不随意扩展。
3. 模板以本 Skill 的 references 为 SSoT。

---

## 与 Commands 的协作

由 plan-executor、build-executor、review-executor 显式调用。
