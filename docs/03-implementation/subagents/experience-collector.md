# experience-collector 实现

## 概述

`experience-collector` 是后台子代理，负责在阶段执行过程中即时出现的 EXP-CANDIDATE 输出后，静默处理并暂存候选，避免干扰主对话。

## 源码位置

`.cursor/agents/experience-collector.md`

## 配置

```yaml
---
name: experience-collector
description: 在阶段执行过程中即时出现 EXP-CANDIDATE 时自动调用，静默处理并暂存候选，避免干扰主对话。Use proactively when detecting EXP-CANDIDATE comments in agent responses.
model: fast
is_background: true
---
```

### 关键配置

- **model: fast**：使用快速模型，减少延迟
- **is_background: true**：后台运行，不干扰主对话

## 职责

1. **解析候选**：从最新消息中读取 `<!-- EXP-CANDIDATE {...} -->` JSON，保留原字段（stage/trigger/decision/...）
2. **成长过滤器**：回答"若一年后在不同项目遇到类似情境，这条信息仍能提前帮我做正确判断吗？"若否，丢弃并记录理由；若是，继续
3. **最小上下文包**：合并调用方提供的高信号上下文（REQ id/title/一行描述、stage、行为/验收摘要、关键决策、指针列表），与候选 JSON 一起存入暂存区
4. **暂存**：写入或合并到 `.workflow/context/session/pending-compounding-candidates.json`，避免重复，保留时间戳与来源 stage
5. **不写入经验，不触发 curator，不向用户提问**；仅在必要时简短确认已接收

## 处理流程

### 1. 解析 EXP-CANDIDATE

从最新消息中提取 HTML 注释包裹的 JSON：

```html
<!-- EXP-CANDIDATE
{
  "stage": "work",
  "trigger": "...",
  "decision": "...",
  ...
}
-->
```

解析 JSON，保留所有原字段。

### 2. 成长过滤器

对每条候选回答：

> **如果我一年后在完全不同的项目里再遇到类似局面，这条信息还能帮我提前做出正确判断吗？**

- **否**：丢弃并记录理由
- **是**：继续处理

### 3. 最小上下文包

合并以下高信号上下文：

- REQ id/title/一行描述
- stage（来源阶段）
- 行为/验收摘要
- 关键决策
- 指针列表

与候选 JSON 一起存入暂存区。

### 4. 暂存

写入或合并到 `.workflow/context/session/pending-compounding-candidates.json`：

- **避免重复**：检查是否已存在相同候选
- **保留时间戳**：记录捕获时间
- **保留来源 stage**：记录来源阶段

### 5. 输出

- **静默或一行确认**：不要展开长说明
- **不写入经验**：只暂存，等待用户确认
- **不触发 curator**：只收集，不治理
- **不向用户提问**：静默处理

## 暂存文件格式

`.workflow/context/session/pending-compounding-candidates.json`：

```json
{
  "asked": false,
  "candidates": [
    {
      "stage": "work",
      "trigger": "当发现 root cause 并更换方案",
      "decision": "实现/修复/接口/边界的取舍",
      "alternatives": ["原方案A（放弃，因为...）"],
      "signal": "判断依据/风险信号/失败证据",
      "solution": "新的实现/修复方案",
      "verify": "测试/验证步骤与结果期望",
      "pointers": ["path/to/file"],
      "notes": "可选补充",
      "timestamp": "2026-01-12T10:00:00Z",
      "source": {
        "req": "REQ-001",
        "stage": "work"
      }
    }
  ]
}
```

## 触发机制

- **自动触发**：当检测到 EXP-CANDIDATE 注释时自动调用
- **后台运行**：不干扰主对话
- **静默处理**：用户无感知

## 参考

- [知识沉淀机制：即时捕获](../02-design/knowledge-compounding.md#即时捕获机制)
- [experience-depositor 实现](./experience-depositor.md)
