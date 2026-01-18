---
name: experience-index
description: 此 Skill 在执行 /req、/plan 001、/build 001、/review 001 等命令时自动激活，按 Trigger 匹配 .workflow/context/experience/INDEX.md 的 active 经验并主动提醒风险与指针。
---

# Experience Index

## Instructions

### 1. 上下文获取逻辑

在激活 experience-index 时，自动获取上下文：

#### 1.1 从命令参数推断任务编号和阶段

- `/req <描述>` → 阶段：req，任务编号：自动生成
- `/plan 001` → 阶段：plan，任务编号：001
- `/build 001` → 阶段：build，任务编号：001
- `/review 001` → 阶段：review，任务编号：001
- `/req-review 001` → 阶段：req-review，任务编号：001

#### 1.2 读取对应的 req 文件

- 扫描 `.workflow/requirements/` 目录
- 匹配 `<taskId>.req.*.md` 文件（如 `001.req.*.md`）
- 读取 req 文件内容作为匹配上下文

**特殊情况**：

- `/req` 命令：如果 req 文件尚未创建，使用需求描述作为匹配上下文
- 如果找不到 req 文件，提示用户并提供解决方案

#### 1.3 基于 req 内容 + 当前阶段进行经验匹配

- 提取 req 中的关键词（技术选型、功能描述、架构思路等）
- 结合当前阶段（req/plan/build/review）进行 Trigger 匹配
- 输出匹配的经验（风险级别 + 指针）

### 2. 经验匹配流程

1. 读取 `.workflow/context/experience/INDEX.md`
2. 只匹配 Status = `active` 的经验（过滤 `deprecated`）
3. 基于当前场景（req 内容/阶段/涉及模块）做关键词 + 语义匹配 Trigger（when to load）
4. **优先返回高 Strength 经验**：`enforced` > `validated` > `hypothesis`
5. **优先返回 broad Scope 经验**：`broad` > `medium` > `narrow`
6. **多维度匹配策略**：
   - **任务编号 + 阶段 + Trigger 完全匹配**：优先返回（得分 > 0.7）
   - **阶段 + Trigger 匹配**：中优先级（得分 0.4-0.7，跨任务复用）
   - **仅 Trigger 关键词匹配**：低优先级（得分 0.3-0.4）

### 3. 输出规则（静默成功原则）

- **无匹配时**：完全静默，不输出任何内容
- **有匹配时**：仅输出关键信息（风险级别 + 指针），省略冗长的结构化格式
- 输出格式示例：
  ```
  ⚠️ 高风险：XXX（参考 EXP-001.md）
  ```
- 仅包含：风险级别（high/medium/low）、经验标题或关键提示、文件指针
- 省略：完整的结构化表格、详细的认知触发器说明（除非风险极高）

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

- 没匹配就硬输出"无相关经验"（应完全静默）
- 一次任务重复提醒同一条经验
- 返回 `deprecated` 状态的经验（除非用户显式要求查看历史）
- 输出冗长的结构化格式（有匹配时仅输出关键信息）
- 在上下文获取失败时继续执行（应先提示用户）

## 与 1.0 的主要区别

1. **激活时机**：从 `/flow` 统一入口改为支持多入口命令（`/req`, `/plan`, `/build`, `/review`）
2. **上下文获取**：新增从命令参数推断任务编号和阶段的逻辑
3. **匹配策略**：新增多维度匹配策略（任务编号+阶段+Trigger）
4. **文件路径**：适配新的文件命名格式（`001.req.*.md`）和目录结构

