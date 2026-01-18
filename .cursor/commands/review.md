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

## 产物

- `.workflow/requirements/<taskId>.review.<标题>.md`（审查总结报告，**不存档**）

**输出规则（静默成功原则）**：

- 文件写入成功：静默，不输出确认信息
- 文件写入失败：输出错误信息

## 执行逻辑

本命令将执行逻辑委托给 `review-executor` Skill，包括：

1. 读取输入（req、plan、testcase 文件）
2. 测试用例文档审查
3. 测试脚本质量检查
4. 测试执行
5. 多维度审查（8 个维度：功能、测试覆盖、安全、性能、架构、可维护性、回归风险、文档一致性）
6. Review 文档生成
7. 审查结果处理

详细执行流程请参考 `review-executor` Skill 文档（`.cursor/skills/review-executor/SKILL.md`）。

## 经验捕获

经验捕获由 `experience-capture` Skill 统一处理。当发现缺陷、覆盖缺口、质量问题、安全风险等情况时，会自动捕获经验候选。

详细触发场景请参考 `experience-capture` Skill 文档。

