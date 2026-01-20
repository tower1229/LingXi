---
name: experience-index
description: 此 Skill 在执行 /req、/plan 001、/build 001、/review 001 等命令时自动激活，按 Trigger 匹配 team/INDEX.md 和 project/INDEX.md 的 active 经验并主动提醒风险与指针。
---

# Experience Index

## Instructions

### 1. 上下文获取逻辑（遵循上下文组织原则）

**上下文组织原则**：
- **先指针后细节**：先读取 INDEX.md（索引），再按需加载经验文件（细节）
- **最小高信号**：仅输出关键信息（风险级别 + 指针），省略冗长格式
- **分层加载**：先索引与概要，按需加载细节，避免 context rot

在激活 experience-index 时，自动获取上下文：

#### 1.1 从命令参数推断任务编号和阶段

- `/req <描述>` → 阶段：req，任务编号：自动生成
- `/plan 001` → 阶段：plan，任务编号：001
- `/build 001` → 阶段：build，任务编号：001
- `/review 001` → 阶段：review，任务编号：001
- `/review-req 001` → 阶段：review-req，任务编号：001

#### 1.2 读取对应的 req 文件

- 扫描 `.cursor/.lingxi/requirements/` 目录
- 匹配 `<taskId>.req.*.md` 文件（如 `001.req.*.md`）
- 读取 req 文件内容作为匹配上下文

**特殊情况**：

- `/req` 命令：如果 req 文件尚未创建，使用需求描述作为匹配上下文
- 如果找不到 req 文件，提示用户并提供解决方案

#### 1.3 基于 req 内容 + 当前阶段进行经验匹配

- 提取 req 中的关键词（技术选型、功能描述、架构思路等）
- 结合当前阶段（req/plan/build/review）进行 Trigger 匹配
- 输出匹配的经验（风险级别 + 指针）

### 2. 经验匹配流程（遵循上下文组织原则）

**分层加载策略**：
1. **根据命令决定读取哪些索引**：
   - `/init` → 只读取 `team/INDEX.md`（团队级标准和经验）
   - `/req`、`/plan`、`/build`、`/review` → 读取 `team/INDEX.md` + `project/INDEX.md`（团队级标准 + 项目级经验）
2. **先读取索引**：读取对应的 INDEX.md（索引层）
3. **只匹配 Status = `active` 的经验**（过滤 `deprecated`）
4. **LLM 语义匹配**：使用以下匹配任务进行智能匹配

**LLM 匹配任务**：

任务：基于当前场景，从经验列表中找出相关经验

输入：
- 当前场景：[req 内容摘要] + 阶段：[plan]
  - req 内容摘要：技术选型、功能描述、架构思路等关键信息
  - 当前阶段：req/plan/build/review
- 经验列表：INDEX.md 中所有 `active` 经验的摘要
  - 每个经验包含：Tag、Type、Title、Trigger、Surface signal、Hidden risk

匹配维度：
- **Trigger 匹配**：经验的 Trigger 是否与当前场景相关
- **阶段匹配**：经验是否适用于当前阶段
- **风险匹配**：经验的 Hidden risk 是否与当前场景的风险相关
- **信号匹配**：经验的 Surface signal 是否与当前场景的信号匹配

输出要求：
- 返回相关经验的 Tag 列表
- 对每个相关经验，给出相关性得分（0-1）和理由
- 只返回得分 >= 0.3 的经验
- 按得分降序排列，最多返回 Top 5

得分计算：
- 基础得分：0-1（基于相关性，由 LLM 判断）
- 阶段加权：
  - 当前阶段匹配：+0.2
  - 相邻阶段匹配：+0.1（如 plan 阶段匹配 req/build 阶段经验）
  - 其他阶段：+0
- 最终得分 = min(1.0, 基础得分 + 阶段加权)

优先级排序：
- 首先按最终得分降序
- 得分相同时，优先返回高 Strength 经验：`enforced` > `validated` > `hypothesis`
- 得分和 Strength 相同时，优先返回 broad Scope 经验：`broad` > `medium` > `narrow`
- 得分、Strength 和 Scope 相同时，优先返回团队级标准（Type = standard，Level = team）

5. **按需加载细节**：仅在需要详细内容时，才加载对应的经验文件（细节层）

### 3. 匹配优先级

**优先级 1：命令匹配**（最高优先级）

根据当前命令决定匹配范围：
- `/init` → 只匹配 team/（标准和经验）
- `/req`、`/plan`、`/build`、`/review` → 匹配 team/（标准） + project/（经验）

**优先级 2：文件匹配**（中等优先级）

如果当前有打开文件：
- globs 匹配 → 匹配文件相关的标准和经验
- team/standards → 通用文件规范（如 `**/*.ts` → TypeScript 规范）
- project/ → 项目特定文件模式（如 `**/services/cache/**` → 缓存策略经验）

**优先级 3：语义匹配**（最低优先级）

- Trigger 匹配 → 基于关键词/场景匹配
- Surface signal 匹配 → 基于"熟悉的风险味道"匹配
- Hidden risk 匹配 → 基于"真正会出问题的点"匹配

**匹配过滤**：
- 知识可获得性过滤：高可获得性且代码库有示例 → 降低优先级或跳过
- 团队级标准优先：同时匹配标准和经验 → 优先返回标准（Type = standard）

### 4. 输出规则（静默成功原则 + 最小高信号）

**遵循"最小高信号"原则**：
- **无匹配时**：完全静默，不输出任何内容
- **有匹配时**：仅输出关键信息（风险级别 + 指针），省略冗长的结构化格式
- 输出格式示例：
  ```
  ⚠️ 高风险：XXX（参考 EXP-001.md）
  ```
- **仅包含**：风险级别（high/medium/low）、经验标题或关键提示、文件指针
- **省略**：完整的结构化表格、详细的认知触发器说明（除非风险极高）

**先指针后细节**：
- 输出时先给出经验文件指针（EXP-001.md），而非直接输出详细内容
- 用户需要时可自行查看详细经验文件

## INDEX 字段说明

| 字段         | 类型                                    | 说明                                                                       |
| ------------ | --------------------------------------- | -------------------------------------------------------------------------- |
| `Tag`        | 唯一标识                                | 用于引用与检索                                                             |
| `Type`       | `standard` / `knowledge`                | 经验类型：standard=标准（强约束、执行底线），knowledge=经验（复杂判断、认知触发） |
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
