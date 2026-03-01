---
name: testcase-designer
description: 由 plan-executor（主产出）、build-executor（Task-driven 且无 testcase 时）、review-executor（覆盖审计）显式调用，从 task 文档产出结构化 testcase 文档，保证 F→TC 映射与验证方式一致。
---

# Testcase Designer

## 意图

从 task 文档产出结构化 testcase 文档，保证 F→TC 映射与验证方式一致；供 plan 生成 testcase、build 在 Task-driven 且无 testcase 时生成、review 做覆盖审计。不自动激活，由上述三者显式调用。

## 关键约束

- **输入**：task 文档路径或正文。**输出**：与 `references/testcase-doc-template.md` 同构的 testcase 文档；命名 `<taskId>.testcase.<标题>.md`（标题 10 字以内）。
- **覆盖**：所有「验证方式不为空」的 F 必须有对应 TC 或手工/rubric 区块；每个 TC 或手工/评审块必须标注来源需求编号（至少一个 F）。
- **按验证方式分区**：unit → 单元测试用例区块；integration → 集成测试用例区块；e2e → 端到端用例区块；manual/rubric → 手工验证与评审区块（见模板）。
- 不发明 task 中未出现的需求或验收标准；边界/异常从 task 推导；模板以 references 为 SSoT。

## References

- **解析 task、核心约束、分区产出、文档结构、与 plan/build/review 约定**：[references/constraints-and-flow.md](references/constraints-and-flow.md)
- 模板：`references/testcase-doc-template.md`
