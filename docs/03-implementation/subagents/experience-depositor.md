# experience-depositor 实现

## 概述

`experience-depositor` 是前台子代理，负责将已暂存的经验候选正式写入经验库。

## 源码位置

`.cursor/agents/experience-depositor.md`

## 配置

```yaml
---
name: experience-depositor
description: 将已暂存的经验候选正式写入经验库。当用户通过 /remember ... 命令提取新经验时激活，或当用户直接输入编号选择候选经验（如 1,3）时激活。
model: inherit
is_background: false
---
```

### 关键配置

- **model: inherit**：继承主代理模型
- **is_background: false**：前台运行，需要用户交互

## 触发时机

- 用户通过 `/remember ...` 命令提取新经验
- 用户直接输入编号选择候选经验（如 `1,3` 或 `1 3`）

## 流程

### 1. 读取暂存

加载 `.workflow/context/session/pending-compounding-candidates.json`（若无则提示为空）。

### 2. 展示候选

按 stage/时间排序，简要展示：

- trigger
- decision
- signal
- solution
- verify
- pointers

请求用户选择写入项（支持全选/部分/放弃）。

### 3. 沉淀分流

对每条候选判断应沉淀到哪里（可多选，但默认只选 ROI 最高的一个）：

- **经验文档（默认）**：写入 `.workflow/context/experience/`（适合"容易忘、下次会遇到、需要提醒/指针"的知识）
- **规则/自动拦截**：如果可以自动判定且高频，优先沉淀为 hook/lint/CI（把人工检查前移）
- **Skill/流程升级**：如果是可复用流程或重复步骤，优先沉淀为新 skill 或扩展现有 skill（降低决策疲劳）
- **长期上下文补齐**：如果属于"考古/服务边界/配置规范"，优先补齐 `.workflow/context/tech/services/` 或 `.workflow/context/business/`

### 4. 成长过滤器（再次确认）

在决定"写入经验文档（长期）"之前，对每条候选再次回答：

> **如果我一年后在完全不同的项目里再遇到类似局面，这条信息还能帮我提前做出正确判断吗？**

- **否**：不写入 experience，改为沉淀到 session/worklog（项目记录）
- **是**：允许写入 experience（长期判断资产）

### 5. 冲突检测

读取 `.workflow/context/experience/INDEX.md`，对选择的候选检查：

- **触发条件相同/相似，且解决方案矛盾** → 冲突：旧经验标记 deprecated，新经验记录替代关系
- **触发条件相近且解决方案相同/相似** → 重复：默认合并（或请求用户确认合并策略）

### 6. 写入

按模板写入 `.workflow/context/experience/<tag>-<title>.md`，更新 INDEX。

**经验模板必须包含**：

- 触发条件（When to load）
- 问题现象（Symptom）
- 根因（Root cause）
- 解决方案（Fix）
- 校验方式（How to verify）
- 关联指针（Pointers）
- **Decision Shape**（必须）
- **Judgment Capsule**（必须）

**索引写入要求**：

- `Trigger (when to load)`：用于工程检索（关键词/场景）
- `Surface signal`：表层信号（让我应该警觉的味道）
- `Hidden risk`：隐含风险（真正会炸的点）

### 7. 触发 curator

在实际新增经验后调用 `experience-curator` 进行治理：

- 备份 INDEX
- 合并/替代
- 输出变更报告
- 输出质量准则建议

### 8. 清理

从暂存中移除已处理项；未写入项保留。

## 约束

- **必须征得用户确认后才写入 experience**
- **经验必须包含 Decision Shape 与 Judgment Capsule**（若缺失需补齐后再写入）
- **输出结构化、简洁，避免冗长叙述**

## 参考

- [知识沉淀机制：确认沉淀流程](../02-design/knowledge-compounding.md#确认沉淀流程)
- [经验治理机制设计](../02-design/experience-governance.md)
- [experience-collector 实现](./experience-collector.md)
