# Semantics Capsule：业务语义抽象结构

## 概述

Semantics Capsule（语义胶囊）用于从需求中抽取并固化"业务语义"（边界/规则/术语），形成可被后续需求复用的长期上下文形态。语义资产与判断资产（经验）的生命周期与治理方式不同，应分离管理。

## 设计原则

1. **语义与判断分离**：语义资产（业务边界/规则/术语）与判断资产（经验）分开管理
2. **条目化**：每个语义条目独立、可复用
3. **指针优先**：详细内容以指针承载，避免上下文膨胀
4. **可扩展**：支持新增条目类型，不限制于边界/规则/术语

## 最小字段定义

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| **条目类型** | 枚举 | 是 | 语义条目的类型 | `boundary` / `rule` / `term` |
| **条目内容** | 字符串 | 是 | 语义条目的具体内容 | "用户权限分为：管理员、编辑、只读" |
| **关联指针** | 字符串数组 | 是 | 相关文档/代码/配置的指针 | `["docs/01-concepts/user-roles.md", "src/models/User.ts"]` |
| **适用范围** | 字符串 | 可选 | 该语义适用的范围 | "整个系统" / "订单模块" |

### 条目类型说明

| 类型 | 说明 | 示例 |
|------|------|------|
| **boundary** | 业务边界：什么在系统内、什么在系统外 | "支付模块不处理退款，退款由订单模块处理" |
| **rule** | 业务规则：必须遵守的约束或逻辑 | "订单金额超过 1000 元必须审核" |
| **term** | 业务术语：领域特定概念的定义 | "订单状态：pending（待支付）、paid（已支付）、cancelled（已取消）" |

## 与经验（判断资产）的区分

| 维度 | 语义资产（Semantics Capsule） | 判断资产（Experience） |
|------|------------------------------|----------------------|
| **内容** | 业务边界/规则/术语（事实性） | 取舍依据/风险接受/拒绝方案（判断性） |
| **生命周期** | 长期稳定，随业务演进缓慢变化 | 可能被验证/升级/取代 |
| **治理方式** | 按需更新，无需合并/取代 | 需要合并/取代/升级治理 |
| **写入位置** | `.workflow/context/business/` | `.workflow/context/experience/` |
| **加载方式** | 按业务领域/模块匹配 | 按 Trigger 匹配 |

## 写入位置

### 长期上下文目录结构

```
.workflow/context/
├── business/              # 业务语义（Semantics Capsule）
│   ├── boundaries.md      # 业务边界
│   ├── rules.md           # 业务规则
│   └── terms.md           # 业务术语
├── experience/            # 判断资产（Experience）
│   ├── INDEX.md
│   └── *.md
└── tech/                  # 技术上下文
    └── services/
```

### 写入规则

- **语义资产**：写入 `.workflow/context/business/` 下的对应文件（boundaries.md / rules.md / terms.md）
- **判断资产**：写入 `.workflow/context/experience/`（需通过用户主动选择确认，如直接输入编号 `1,3` 选择候选）
- **混合内容**：若同时包含语义和判断，应拆分为两个条目分别写入

## 抽取时机

在以下阶段从需求中识别业务语义：

1. **req 阶段**：从需求文档中提取业务边界/规则/术语
2. **plan 阶段**：在任务拆解过程中发现新的业务语义

## SEM-CANDIDATE JSON 格式定义

用于从 REQ 文档提取语义候选时的结构化格式：

```json
{
  "type": "boundary|rule|term",
  "content": "语义条目的具体内容",
  "pointers": ["path/to/file1", "path/to/file2"],
  "scope": "适用范围（可选）",
  "source": "REQ-xxx"
}
```

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | 枚举 | 是 | `boundary` / `rule` / `term` |
| `content` | 字符串 | 是 | 语义条目的具体内容 |
| `pointers` | 字符串数组 | 是 | 相关文档/代码/配置的指针 |
| `scope` | 字符串 | 否 | 该语义适用的范围 |
| `source` | 字符串 | 是 | 来源 REQ id（如 "REQ-005"） |

### 示例

```json
{
  "type": "rule",
  "content": "订单金额超过 1000 元必须审核",
  "pointers": ["docs/01-concepts/order-rules.md", "src/services/order.ts:45"],
  "scope": "订单模块",
  "source": "REQ-005"
}
```

## 与 Trade-off Record 的关系

- **Trade-off Record**：捕获"为什么这样取舍"（判断资产）
- **Semantics Capsule**：捕获"业务边界/规则/术语是什么"（语义资产）

两者可以同时出现在同一需求中，但应分别处理：
- Trade-off Record → 转写为 EXP-CANDIDATE → 写入 experience（需确认）
- Semantics Capsule → 写入 business（可直接写入，或作为候选等待确认）

## 参考

- [知识沉淀机制设计](./knowledge-compounding.md) - 判断资产（Experience）的定义
- [Trade-off Record 结构定义](./trade-off-record.md) - 判断资产的捕获方式
