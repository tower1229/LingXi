---
name: experience-index
description: 在需求分析/方案设计/编码/审查/沉淀前，按 Trigger 匹配 .workflow/context/experience/INDEX.md 的 active 经验并主动提醒风险与指针。
---

# Experience Index

## When to Use

- `/flow` 进入 req/audit/plan/work/review/compound 任一阶段之前

## Instructions

1. 读取 `.workflow/context/experience/INDEX.md`
2. 只匹配 Status = `active` 的经验（过滤 `deprecated`）
3. 基于当前场景（需求描述/阶段/涉及模块）做关键词 + 语义匹配 Trigger（when to load）
4. **优先返回高 Strength 经验**：`enforced` > `validated` > `hypothesis`
5. **优先返回 broad Scope 经验**：`broad` > `medium` > `narrow`
6. 结构化输出提醒（尽量精简）：
   - 高风险提醒（Level: high/medium/low）
   - 认知触发器（Surface signal / Hidden risk）
   - 背景文档指针（文件路径）
   - 相关服务建议
   - 代码模式指针
   - **谱系提示**：若经验有 `Replaces`，可提示"该经验整合/取代了旧经验 X"

## INDEX 字段说明

| 字段         | 类型                                    | 说明                                                                       |
| ------------ | --------------------------------------- | -------------------------------------------------------------------------- |
| `Tag`        | 唯一标识                                | 用于引用与检索                                                             |
| `Title`      | 简短标题                                | 一句话描述经验                                                             |
| `Trigger`    | 关键词/场景                             | 触发加载的条件（when to load，偏工程检索）                                 |
| `Surface signal` | 句子 | 表层信号（我闻到熟悉风险味道的线索，偏认知触发） |
| `Hidden risk` | 句子 | 隐含风险（真正会出问题的点，偏认知触发） |
| `Status`     | `active` / `deprecated`                 | active=可用，deprecated=已被合并或取代                                     |
| `Scope`      | `narrow` / `medium` / `broad`           | 经验适用范围：narrow=单一场景，medium=同类问题，broad=跨场景通用           |
| `Strength`   | `hypothesis` / `validated` / `enforced` | 经验强度：hypothesis=首次总结，validated=多次验证，enforced=已转为自动拦截 |
| `Replaces`   | 逗号分隔的 Tag 列表                     | 本经验取代了哪些旧经验（谱系链：新 → 旧）                                  |
| `ReplacedBy` | Tag                                     | 本经验被哪条新经验取代（谱系链：旧 → 新）                                  |
| `File`       | 文件路径                                | 经验详情文件                                                               |

## 禁止

- 没匹配就硬输出"无相关经验"
- 一次任务重复提醒同一条经验
- 返回 `deprecated` 状态的经验（除非用户显式要求查看历史）

