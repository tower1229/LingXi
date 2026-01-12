---
name: req
description: 将“模糊需求”产出为可执行、可验收的 Requirement（落盘 .workflow/requirements/in-progress/REQ-xxx.md 并更新 INDEX）。
---

# Req

## When to Use

- `/flow <需求描述>` 创建新需求
- `/flow REQ-xxx` 但 requirement 缺失或需要补齐时

## Outputs (must write)

- `.workflow/requirements/in-progress/REQ-xxx.md`
- `.workflow/requirements/INDEX.md`

## Instructions

### 0) Experience Index（强制）

先调用 skill `experience-index`，输出相关历史经验提醒（只给指针与高风险点）。

### 1) 需求类型与复杂度判断

先判断需求类型（前端/后端/全栈/简单功能）与复杂度（简单/中等/复杂），用于选择模板与必问项。

### 2) Fail Fast：缺失信息一次性问清

如果“必要信息缺失”，必须一次性列出问题并给出 2-3 个选项，等待用户选择后再落盘。

### 3) Requirement 落盘模板（不写实现方案）

```markdown
# <REQ-xxx>: <Title>

| 属性     | 值                        |
| -------- | ------------------------- |
| 版本     | 1.0                       |
| 状态     | 草稿                      |
| 创建日期 | {DATE}                    |
| 需求类型 | [前端/后端/全栈/简单功能] |
| 复杂度   | [简单/中等/复杂]          |

---

## 1. 概述

### 1.1 背景

### 1.2 问题描述

### 1.3 解决方案概述（不含技术实现细节）

---

## 2. 目标与指标

### 2.1 目标

| 编号 | 目标     | 优先级   |
| ---- | -------- | -------- |
| G1   | ...      | 必须实现 |

### 2.2 非目标

### 2.3 成功标准（必须可验证）

| 标准 | 描述 | 验证方式 |
|---|---|---|
| ... | ... | 测试/脚本/手工步骤 |

---

## 3. 用户故事（至少 1 条）

### US-1: ...

**作为** ...
**我想要** ...
**以便** ...

**验收标准：**
- [ ] ...

---

## 4. 功能需求（按需）

| 编号 | 需求描述 | 优先级 |
|---|---|---|
| F1 | ... | 必须实现 |

---

## 5. 验收检查清单

- [ ] ...
```

### 4) 更新索引（SSoT）

调用 skill `index-manager`：

- Status：`in-progress`
- Current Phase：`req`
- Links：至少包含 requirement 路径

