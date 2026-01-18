---
name: review
description: 审查交付（产出：001.review.<标题>.md，不存档）
args:
  - name: taskId
    required: true
    description: 任务编号（如 001）
---

# /review - 审查交付

## 命令用途

Review 是工作流的关键质量保证环节，通过多维度审查确保交付物符合要求。

## 使用方式

```
/review <taskId>
```

**示例**：

```
/review 001
```

## 依赖的 Agent Skills

以下 Skills 会自动激活：

- `review-executor`：执行多维度审查和交付质量保证
- `experience-index`：自动匹配历史经验提醒
- `experience-capture`：统一经验捕获（自动激活）

以下 Subagents 会根据语义分析结果选择性启用（由 review-executor 显式调用）：

- `reviewer-doc-consistency`：文档一致性审查（始终启用）
- `reviewer-security`：安全审查（基于需求/实现语义判断启用）
- `reviewer-performance`：性能审查（基于需求/实现语义判断启用）

## 产物

- `.workflow/requirements/<taskId>.review.<标题>.md`（审查总结报告，**不存档**）

**输出规则（静默成功原则）**：

- 文件写入成功：静默，不输出确认信息
- 文件写入失败：输出错误信息

## 执行逻辑

本命令将执行逻辑委托给 `review-executor` Skill，包括：

1. 读取输入（req、plan、testcase 文件、代码）
2. 审查维度智能启用（语义分析判断哪些维度需要启用）
3. 测试用例文档审查
4. 测试脚本质量检查
5. 测试执行
6. 依次执行核心维度（功能、测试覆盖、架构、可维护性、回归风险）
7. 并行执行可选维度（显式触发 subagents：文档一致性始终启用，安全/性能基于语义判断启用）
8. Review 文档生成
9. 审查结果处理

**选择性启用机制**：

- **文档一致性审查**：始终启用（所有任务都需要）
- **安全审查**：基于语义分析 req 文档和代码，判断是否涉及用户输入、认证、权限、敏感数据、API 接口、文件操作、数据库操作等安全相关场景
- **性能审查**：基于语义分析 req 文档和代码，判断是否涉及批量处理、实时响应、高并发、大数据量、计算密集型任务、资源敏感操作等性能相关场景

详细执行流程请参考 `review-executor` Skill 文档（`.cursor/skills/review-executor/SKILL.md`）。

## 经验捕获

经验捕获由 `experience-capture` Skill 统一处理。当发现缺陷、覆盖缺口、质量问题、安全风险等情况时，会自动捕获经验候选。

详细触发场景请参考 `experience-capture` Skill 文档。

