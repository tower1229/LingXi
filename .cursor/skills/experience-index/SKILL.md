---
name: experience-index
description: 在需求分析/方案设计/编码/审查/沉淀前，按 Trigger 匹配 .workflow/context/experience/INDEX.md 的 active 经验并主动提醒风险与指针。
---

# Experience Index

## When to Use

- `/flow` 进入 req/audit/plan/work/review/compound 任一阶段之前

## Instructions

1. 读取 `.workflow/context/experience/INDEX.md`
2. 只匹配 Status = `active` 的经验（过滤 deprecated）
3. 基于当前场景（需求描述/阶段/涉及模块）做关键词 + 语义匹配 Trigger
4. 结构化输出提醒（尽量精简）：
   - 高风险提醒（Level: high/medium/low）
   - 背景文档指针（文件路径）
   - 相关服务建议
   - 代码模式指针

禁止：

- 没匹配就硬输出“无相关经验”
- 一次任务重复提醒同一条经验

