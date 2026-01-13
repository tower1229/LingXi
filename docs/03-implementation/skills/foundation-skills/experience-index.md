# experience-index 实现

## 概述

`experience-index` 在 `/flow` 进入 req/audit/plan/work/review/archive 任一阶段前自动激活，按 Trigger 匹配历史经验并主动提醒风险与指针。

## 源码位置

`.cursor/skills/experience-index/SKILL.md`

## 处理流程

### 1. 读取索引

读取 `.workflow/context/experience/INDEX.md`

### 2. 过滤 active 经验

只匹配 Status = `active` 的经验（过滤 `deprecated`）

### 3. 匹配 Trigger

基于当前场景（需求描述/阶段/涉及模块）做关键词 + 语义匹配 Trigger（when to load）

### 4. 优先级排序

- **优先返回高 Strength 经验**：`enforced` > `validated` > `hypothesis`
- **优先返回 broad Scope 经验**：`broad` > `medium` > `narrow`

### 5. 结构化输出

尽量精简，包含：

- 高风险提醒（Level: high/medium/low）
- 认知触发器（Surface signal / Hidden risk）
- 背景文档指针（文件路径）
- 相关服务建议
- 代码模式指针
- **谱系提示**：若经验有 `Replaces`，可提示"该经验整合/取代了旧经验 X"

## 禁止

- 没匹配就硬输出"无相关经验"
- 一次任务重复提醒同一条经验
- 返回 `deprecated` 状态的经验（除非用户显式要求查看历史）

## 参考

- [数据模型：Experience Index](../02-design/data-models.md#experience-index经验索引)
- [experience-index Skill](../../../../.cursor/skills/experience-index/SKILL.md)
