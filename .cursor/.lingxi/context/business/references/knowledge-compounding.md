# 知识沉淀机制设计

## 概述

知识沉淀机制是 cursor-workflow 的核心能力，它通过"即时捕获 → 暂存 → 确认沉淀 → 治理"的流程，将工作过程中的判断和决策沉淀为可复用的长期资产。

## 流程概览

```mermaid
sequenceDiagram
    participant Skill as Stage Skill
    participant Capture as experience-capture
    participant Evaluator as candidate-evaluator
    participant Session as session/pending-compounding-candidates.json
    participant User
    participant Depositor as experience-depositor
    participant Experience as experience/
    participant Curator as experience-curator
    
    Skill->>Capture: 识别经验信号
    Capture->>Capture: 生成 EXP-CANDIDATE
    Capture->>User: 输出摘要，询问确认
    User->>Capture: 确认（A/B/C）
    Capture->>Evaluator: 调用阶段 1 评估
    Evaluator->>Capture: 返回评估结果
    Capture->>Session: 写入暂存候选
    User->>Depositor: /remember 1,3
    Depositor->>Session: 读取暂存
    Depositor->>User: 展示候选，请求选择
    User->>Depositor: 确认选择
    Depositor->>Depositor: 沉淀分流
    Depositor->>Depositor: 成长过滤器（再次确认）
    Depositor->>Depositor: 冲突检测
    Depositor->>Experience: 写入经验
    Depositor->>Curator: 触发治理
    Curator->>Curator: 合并/取代
    Curator->>Experience: 更新 INDEX
    Curator-->>User: 输出治理报告和质量准则建议
```

## 即时捕获机制

### EXP-CANDIDATE 格式

在工作过程中，当出现以下情况时，Skills 应输出结构化 EXP-CANDIDATE 注释：

- 纠正了实现方向、接口契约、数据结构、边界处理
- 排查找到 root cause，或放弃/替换某实现方案
- 测试失败暴露新坑点或隐含假设
- 重要文件/模块的关键指针或交互契约被确认/修订

**格式**：

```html
<!-- EXP-CANDIDATE
{
  "stage": "work",
  "trigger": "当发现 root cause 并更换方案",
  "decision": "实现/修复/接口/边界的取舍",
  "alternatives": ["原方案A（放弃，因为...）"],
  "signal": "判断依据/风险信号/失败证据",
  "solution": "新的实现/修复方案",
  "verify": "测试/验证步骤与结果期望",
  "pointers": ["path/to/file"],
  "notes": "可选补充"
}
-->
```

### 触发时机

EXP-CANDIDATE 应在以下阶段输出：

- **req**：需求澄清过程中的关键决策
- **plan**：计划制定过程中的取舍
- **work**：实现过程中的纠正和根因发现
- **review**：审查过程中发现的问题和风险

### 自动收集

`experience-capture` Skill 会自动处理：

1. **识别经验信号**：分析用户输入，识别经验信号（判断、取舍、边界、约束等）
2. **生成 EXP-CANDIDATE**：基于语义理解生成结构化 EXP-CANDIDATE JSON
3. **用户确认**：输出用户友好的摘要，询问用户确认
4. **评估**：用户确认后，调用 `candidate-evaluator` 执行阶段 1 评估
5. **暂存**：评估通过后，写入或合并到 `.cursor/.lingxi/context/session/pending-compounding-candidates.json`

**特点**：
- 输出用户友好的摘要，不输出技术细节（JSON 结构）
- 用户确认后才执行评估和写入，符合"人工门控"原则
- 不写入经验，不触发 curator
- 评估结果包含在暂存的候选对象中

## 成长过滤器

### 核心问题

在决定"写入经验文档（长期）"之前，对每条候选先回答一个问题：

> **如果我一年后在完全不同的项目里再遇到类似局面，这条信息还能帮我提前做出正确判断吗？**

### 判断标准

- **否**：不写入 experience，改为沉淀到 session/worklog（项目记录）
- **是**：允许写入 experience（长期判断资产）

### 应用时机

成长过滤器在两个时机应用：

1. **experience-capture**：在评估阶段初步过滤，避免暂存无价值的候选
2. **experience-depositor**：再次确认，确保只有长期资产进入 experience

### 目的

避免 experience 退化为"事实堆叠/案例百科"，把长期资产留给"可迁移的判断结构"。

## 沉淀分流

`experience-depositor` 的核心不是"只写经验文档"，而是先做**沉淀分流**，将知识与改进点放到最合适的载体。

### 分流目标

| 目标 | 适用场景 | 位置 |
|------|---------|------|
| **经验文档**（默认） | 容易忘、下次会遇到、需要提醒/指针 | `.cursor/.lingxi/context/experience/` |
| **规则/自动拦截** | 高频且可自动判定 | hook/lint/CI |
| **Skill/流程升级** | 可复用流程或重复步骤 | `.cursor/skills/` |
| **长期上下文补齐** | 考古/服务边界/配置规范 | `.cursor/.lingxi/context/tech/services/` 或 `.cursor/.lingxi/context/business/` |

### 分流原则

- **ROI 优先**：默认只选 ROI 最高的一个
- **可多选**：如果候选适合多个目标，可以多选
- **输出要求**：对每条候选给出"落点选择 + 理由 + 预期收益（下次如何变快/变稳）"

## Decision Shape 与 Judgment Capsule

### 为什么需要这两个结构？

**核心思想**：把经验主语从【事】换成【判断】。

经验不应该只是"做过什么/怎么做"的文档，而应该是"如何判断"的结构。

### Decision Shape（判断结构）

每条经验必须包含：

- **Decision being made**：我当时在判断什么
- **Alternatives rejected**：我拒绝了哪些备选方案（至少 1 个）
- **Discriminating signal**：我靠什么可观测信号做出分叉

**示例**：

```markdown
## Decision Shape（判断结构）

- Decision being made: 选择使用哪个状态管理方案
- Alternatives rejected: 
  - Redux（过于复杂，项目规模不需要）
  - Context API（性能问题，频繁更新会导致全量重渲染）
- Discriminating signal: 组件更新频率、状态共享范围、团队熟悉度
```

### Judgment Capsule（认知蒸馏）

每条经验必须包含：

- **I used to think**：我之前的认知
- **Now I believe**：我现在的认知
- **Because the decisive variable is**：决定性变量是什么

**示例**：

```markdown
## Judgment Capsule（认知蒸馏）

- I used to think: 所有异步操作都应该用 async/await
- Now I believe: 并发场景下 Promise.all 更合适
- Because the decisive variable is: 操作的依赖关系和性能要求
```

### 目的

确保经验一定能上升为"判断结构"，而不是仅成为"做过什么/怎么做"的文档。

## 经验模板

每条经验必须包含以下字段：

### 基础字段

- **触发条件（When to load）**：在什么场景下需要加载这条经验
- **问题现象（Symptom）**：用户看到/遇到的具体表现
- **根因（Root cause）**：为什么会出现这个问题
- **解决方案（Fix）**：如何解决/规避
- **校验方式（How to verify）**：如何验证问题已被解决/规避，必须可复现
- **关联指针（Pointers）**：相关文件路径、函数名、配置项等

### 判断结构字段

- **Decision Shape**：判断结构（必须）
- **Judgment Capsule**：认知蒸馏（必须）

### 可选字段

- **替代关系（Replaced by / Replaces）**：如有冲突则必须

## 冲突检测

在沉淀新经验前，必须执行冲突检测：

1. **读取所有现有经验**：读取 `.cursor/.lingxi/context/experience/INDEX.md` 中的所有 active 经验
2. **冲突检测**：检查新经验是否与现有经验冲突（触发条件相同/相似且解决方案矛盾）
3. **自动剔除矛盾旧经验**：如果检测到冲突，自动标记旧经验为 `deprecated`，并在新经验中记录替代关系
4. **经验合并/去重**：如果检测到重复或高度相似的经验（而非冲突），提供合并选项

## 确认沉淀流程

### 用户操作

1. **查看候选**：stop hook 在对话结束时提醒有待沉淀候选
2. **选择沉淀**：
   - `/remember 1,3`：沉淀第 1 和第 3 条
   - `/remember 全部`：沉淀全部
   - `/remember 忽略沉淀（如不需要沉淀）`：忽略并清空候选

### experience-depositor 处理

1. **读取暂存**：加载 `.cursor/.lingxi/context/session/pending-compounding-candidates.json`
2. **展示候选**：按 stage/时间排序，简要展示 trigger/decision/signal/solution/verify/pointers
3. **请求选择**：支持全选/部分/放弃
4. **沉淀分流**：判断应沉淀到哪里
5. **成长过滤器**：再次确认是否进入长期知识库
6. **冲突检测**：检查与现有经验的冲突
7. **写入**：按模板写入 `.cursor/.lingxi/context/experience/<tag>-<title>.md`，更新 INDEX
8. **触发 curator**：在实际新增经验后调用 `experience-curator` 进行治理
9. **清理**：从暂存中移除已处理项；未写入项保留

## 与 /remember 的区别

- **`/remember`**：即时沉淀**单条经验**，不需要 REQ-xxx，最低摩擦

两者互补，不冲突。

## 总结

知识沉淀机制通过以下设计保证了知识的质量和可复用性：

- **即时捕获**：不依赖人的记忆，自动识别可沉淀点
- **成长过滤器**：确保只有长期资产进入知识库
- **沉淀分流**：将知识放到最合适的载体
- **判断结构**：确保经验是"如何判断"而非"怎么做"
- **冲突检测**：避免矛盾经验污染知识库
- **确认机制**：人工确认保证质量

参考：
- [experience-capture 实现](../../skills/experience-capture/SKILL.md)
- [experience-depositor 实现](../03-implementation/subagents/experience-depositor.md)
- [经验治理机制设计](./experience-governance.md)
