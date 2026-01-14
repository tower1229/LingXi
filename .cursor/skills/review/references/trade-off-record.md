# Trade-off Record：取舍记录结构

## 概述

Trade-off Record（取舍记录）用于在阶段执行过程中**显式捕获取舍依据**，包括 trade-off、风险接受、拒绝方案等价值取向信息。该记录可作为 EXP-CANDIDATE 的高质量输入，减少沉淀时补写的成本。

## 设计原则

1. **显式捕获**：关键取舍必须被记录，不能仅停留在对话中
2. **结构化**：使用最小但完整的字段集合，确保可复用
3. **指针优先**：详细内容以指针承载，避免上下文膨胀
4. **可转写**：能直接映射为 Decision Shape / Judgment Capsule

## 最小字段定义

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| **决策点** | 字符串 | 是 | 正在做什么决策 | "选择数据存储方案" |
| **备选方案** | 数组 | 是 | 所有考虑的方案（含被拒绝的） | `["方案A：关系型数据库", "方案B：NoSQL（拒绝）"]` |
| **拒绝理由** | 字符串 | 是 | 为什么拒绝某些方案 | "方案B 不支持事务，不符合一致性要求" |
| **接受的风险** | 字符串 | 可选 | 选择当前方案时接受的风险 | "性能可能不如 NoSQL，但一致性更重要" |
| **影响范围** | 字符串 | 可选 | 该决策影响哪些模块/功能 | "数据层、API 层" |
| **回滚线索** | 字符串数组 | 可选 | 如何回滚该决策（指针） | `["src/db/migration/001.sql"]` |

## 输出时机

Trade-off Record 应在以下场景输出：

1. **关键取舍**：在多个方案中选择其一，且选择有明确理由
2. **风险接受**：明确接受某个风险（而非规避）
3. **拒绝方案**：明确拒绝某个方案，且拒绝理由值得记录

## 精简原则

- **指针优先**：详细设计文档、代码文件、配置项等以指针形式引用
- **避免冗余**：不在 Trade-off Record 中重复需求文档或 plan 中已有的信息
- **聚焦判断**：重点记录"为什么这样取舍"，而非"做了什么"

## 与 EXP-CANDIDATE 的映射关系

Trade-off Record 可以转写为 EXP-CANDIDATE，映射关系如下：

| Trade-off Record 字段 | EXP-CANDIDATE 字段 | Decision Shape / Judgment Capsule |
|---------------------|-------------------|----------------------------------|
| 决策点 | `decision` | Decision being made |
| 备选方案（含 rejected） | `alternatives` | Alternatives rejected |
| 拒绝理由 + 接受的风险 | `signal` | Discriminating signal |
| 影响范围 | `pointers` | 相关文件/模块指针 |
| 回滚线索 | `pointers` | 回滚相关指针 |

**转写示例**：

```markdown
## Trade-off Record

- **决策点**：选择数据存储方案
- **备选方案**：
  - 方案A：关系型数据库（选择）
  - 方案B：NoSQL（拒绝）
- **拒绝理由**：方案B 不支持事务，不符合一致性要求
- **接受的风险**：性能可能不如 NoSQL，但一致性更重要
- **影响范围**：数据层、API 层
- **回滚线索**：`src/db/migration/001.sql`

转写为 EXP-CANDIDATE：
<!-- EXP-CANDIDATE
{
  "stage": "plan",
  "trigger": "当需要选择数据存储方案时",
  "decision": "选择关系型数据库而非 NoSQL",
  "alternatives": ["NoSQL（拒绝，因为不支持事务，不符合一致性要求）"],
  "signal": "一致性要求高于性能要求",
  "solution": "使用关系型数据库，接受性能可能不如 NoSQL 的风险",
  "verify": "检查数据一致性测试是否通过",
  "pointers": ["src/db/migration/001.sql"]
}
-->
```

## 候选全量展示格式模板

阶段开始前回放候选时，使用以下格式展示 Trade-off Record（或转写后的 EXP-CANDIDATE）：

### 表格格式（推荐）

```markdown
## 上一阶段候选回放（req → plan）

| # | Trigger | Decision | Signal | Solution | Pointers |
|---|---------|----------|--------|----------|----------|
| 1 | 当需要选择数据存储方案时 | 选择关系型数据库而非 NoSQL | 一致性要求高于性能要求 | 使用关系型数据库，接受性能风险 | `src/db/migration/001.sql` |
| 2 | 当需要设计 API 接口时 | 选择 RESTful 而非 GraphQL | 团队熟悉度 + 简单性优先 | 使用 RESTful API | `src/api/routes/` |
```

### 列表格式（备选）

```markdown
## 上一阶段候选回放（req → plan）

### 候选 1
- **Trigger**：当需要选择数据存储方案时
- **Decision**：选择关系型数据库而非 NoSQL
- **Signal**：一致性要求高于性能要求
- **Solution**：使用关系型数据库，接受性能风险
- **Pointers**：`src/db/migration/001.sql`

### 候选 2
- **Trigger**：当需要设计 API 接口时
- **Decision**：选择 RESTful 而非 GraphQL
- **Signal**：团队熟悉度 + 简单性优先
- **Solution**：使用 RESTful API
- **Pointers**：`src/api/routes/`
```

### 展示规则

1. **排序**：按时间倒序（最新优先）
2. **去重**：若同一阶段产生多条相似候选（trigger/decision 高度相似），仅展示最新一条
3. **字段完整性**：至少包含 trigger/decision/signal/solution/verify/pointers 等摘要字段
4. **精简原则**：详细内容以指针承载，展示时仅显示摘要
