---
name: review-req
description: 审查 req 文档（可选，可多次执行）
args:
  - name: taskId
    required: false
    description: 任务编号（如 001），省略时自动查找最新编号的任务
---

# /review-req - 审查 req 文档

## 命令用途

对 req 文档展开 review，用于辅助提升 req 文档的质量。该步骤可省略，也可以多次执行，完全取决于使用者。

**定位**：这是一个质量提升工具，不是强制环节。用户可以在任意时候使用此命令审查 req 文档，发现潜在问题并提出改进建议。

## 前置要求

- req 文档已存在：`.cursor/.lingxi/tasks/<taskId>.req.*.md`

## 使用方式

```
/review-req [taskId]
```

- **指定 taskId**：审查指定任务的 req 文档
- **省略 taskId**：自动查找最新编号的任务

**示例**：

```
/review-req 001
```

命令会自动查找 `.cursor/.lingxi/tasks/001.req.*.md` 文件。

## 产物

**不产出文件**，仅输出审查结果和建议到对话中。

**输出**：遵循 [design-principles §4–4.1](.cursor/skills/about-lingxi/references/design-principles.md)；审查完成后末尾输出下一步建议（见 review-req-executor）。

- 审查完成后：**必须在当轮回复末尾**输出「**下一步可尝试（选一项）**」及 A/B/C/D 四项（格式与允许集合见 review-req-executor Skill）；用户可通过回复 A/B/C/D 快速选择下一动作。

## 执行逻辑

本命令将执行逻辑委托给 `review-req-executor` Skill。详细执行流程请参考 `review-req-executor` Skill 文档（`.cursor/skills/review-req-executor/SKILL.md`）。

### 审查维度概览

| 维度          | 审查焦点                             | 适用场景    |
| ------------- | ------------------------------------ | ----------- |
| D1 需求完整性 | 目标、边界、用户故事、非目标是否清晰 | 通用必选    |
| D2 可验证性   | 成功标准和验收标准是否可验证         | 通用必选    |
| D3 方案合理性 | 技术选型和架构思路是否合理           | 中等+复杂度 |
| D4 规范完整性 | UI/API/数据模型等规范章节是否完整    | 按类型触发  |
| D5 风险识别   | 技术难点、外部依赖、风险是否识别     | 中等+复杂度 |

审查维度会根据 req 文档的**需求类型**和**复杂度**自动适配。

### 审查边界

**在审查范围内**：

- 需求的目标、边界、用户故事
- 成功标准和验收标准的可验证性
- 技术选型和架构思路的合理性
- UI/API/数据模型规范的完整性
- 技术风险和外部依赖的识别

**不在审查范围内**（属于下游阶段）：

- 具体实现代码/函数签名
- 详细性能调优/安全防护实现
- 测试用例设计
- 部署配置/运维脚本
