# 数据模型定义

## 概述

本文档定义 LingXi workflow 中所有数据模型的结构、字段含义和使用规范。

## Requirements Index（需求索引）

### 位置

`.workflow/requirements/INDEX.md`

### 作用

需求状态的**单一事实源（SSoT）**，所有组件都读取/更新它。

### 表头结构

```markdown
| ID | Title | Status | Current Phase | Next Action | Blockers | Links |
```

### 字段定义

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| **ID** | 字符串 | 需求唯一标识 | `REQ-001` |
| **Title** | 字符串 | 需求标题 | `经验成长机制（合并/取代 + 质量准则建议 + 沉淀后自动触发）` |
| **Status** | 枚举 | 需求状态 | `in-progress` / `planned` / `in-review` / `needs-fix` / `completed` |
| **Current Phase** | 枚举 | 当前阶段 | `req` / `plan` / `audit` / `work` / `review` / `archive` |
| **Next Action** | 字符串 | 下一步行动 | `进入 plan 阶段` / `已完成` |
| **Blockers** | 字符串 | 阻塞项 | `测试覆盖不足` / 空 |
| **Links** | 字符串 | 指向三件套路径 | `.workflow/requirements/in-progress/REQ-001.md` / `.plan.md` / `.review.md` |

### Status 值定义

- `in-progress`：进行中
- `planned`：已计划
- `in-review`：审查中
- `needs-fix`：需要修复
- `completed`：已完成

### Current Phase 值定义

- `req`：需求澄清
- `plan`：计划制定
- `audit`：技术审查
- `work`：实现与验证
- `review`：多维度审查
- `archive`：归档

### Links 格式

- **进行中**：`.workflow/requirements/in-progress/REQ-xxx.md` / `.plan.md` / `.review.md`
- **已完成**：`.workflow/requirements/completed/REQ-xxx.md` / `.plan.md` / `.review.md`

### 维护机制

- **SSoT 机制**：INDEX.md 是需求状态的单一事实源
- **自动归档**：当 Status = `completed` 时，stop hook 自动归档并更新 Links
- **一致性检查**：index-manager 提供 Fail Fast 检查

## Experience Index（经验索引）

### 位置

`.workflow/context/experience/INDEX.md`

### 作用

经验库的索引，用于"可检索、可治理、可谱系化"的经验管理。

### 表头结构

```markdown
| Tag | Title | Trigger (when to load) | Surface signal | Hidden risk | Status | Scope | Strength | Replaces | ReplacedBy | File |
```

### 字段定义

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| **Tag** | 字符串 | 唯一标识 | `apollo-config-quote` |
| **Title** | 简短标题 | 一句话描述经验 | `Apollo 配置值必须用引号包裹` |
| **Trigger (when to load)** | 字符串 | 触发加载的条件（偏工程检索） | `当使用 Apollo 配置时` |
| **Surface signal** | 字符串 | 表层信号（偏认知触发） | `配置值未用引号包裹` |
| **Hidden risk** | 字符串 | 隐含风险（偏认知触发） | `启动失败，错误信息不明确` |
| **Status** | 枚举 | 经验状态 | `active` / `deprecated` |
| **Scope** | 枚举 | 经验适用范围 | `narrow` / `medium` / `broad` |
| **Strength** | 枚举 | 经验强度 | `hypothesis` / `validated` / `enforced` |
| **Replaces** | 字符串 | 本经验取代了哪些旧经验（逗号分隔） | `EXP-001, EXP-002` |
| **ReplacedBy** | 字符串 | 本经验被哪条新经验取代 | `EXP-005` |
| **File** | 字符串 | 经验详情文件路径 | `.workflow/context/experience/apollo-config-quote-requirement.md` |

### Status 值定义

- `active`：可用
- `deprecated`：已被合并或取代（禁止删除文件，只做 deprecated 标记）

### Scope 值定义

- `narrow`：单一场景
- `medium`：同类问题
- `broad`：跨场景通用

**优先级**：`broad` > `medium` > `narrow`

### Strength 值定义

- `hypothesis`：首次总结
- `validated`：多次验证
- `enforced`：已转为自动拦截（通常意味着已转为规则/hook/lint/CI）

**优先级**：`enforced` > `validated` > `hypothesis`

### 谱系字段

- **Replaces**：谱系链（新 → 旧），逗号分隔的 Tag 列表
- **ReplacedBy**：谱系链（旧 → 新），单个 Tag

**目的**：
- 保持可追溯性：可以从新经验找到被取代的旧经验
- 支持回滚：如果需要，可以恢复旧经验

### Trigger 的分工

- **Trigger (when to load)**：偏工程检索（关键词/场景），用于在正确时刻加载
- **Surface signal / Hidden risk**：偏风险提示，用于在相似信号出现时提醒关注潜在问题

## Plan 账本（执行账本）

### 位置

`.workflow/requirements/in-progress/REQ-xxx.plan.md`

### 作用

Plan 不只是计划，也是"执行 ledger"，记录执行过程中的所有信息。

### 结构

```markdown
# REQ-xxx Plan

## 状态摘要（Status Summary）

| 属性 | 值 |
|------|-----|
| 版本 | 1.0 |
| 状态 | planned / in-progress / in-review / needs-fix / completed |
| 创建日期 | 2026-01-12 |
| 关联需求 | REQ-xxx |

## 设计决策（Design Decisions）

...

## 任务拆解（Tasks）

| # | 任务 | 优先级 | 依赖 | 状态 |
|---|---|---|---|---|
| T1 | ... | P0 | - | [x] |

## 验证清单（Validation）

| # | 验证项 | 预期结果 | 验证方式 |
|---|---|---|---|
| V1 | ... | ... | ... |

## 复利候选（Compounding Candidates）

- （候选）...
```

### Status Summary 字段

- **版本**：计划版本号
- **状态**：当前状态（planned / in-progress / in-review / needs-fix / completed）
- **创建日期**：计划创建日期
- **关联需求**：关联的 REQ-xxx

### Tasks 字段

- **#**：任务编号
- **任务**：任务描述
- **优先级**：P0（必须） / P1（重要） / P2（可选）
- **依赖**：依赖的任务编号
- **状态**：`[ ]`（未完成） / `[x]`（已完成）

### Status Summary 字段（补充）

- **测试状态**（可选）：单元测试 X passed / Y total，集成测试 X passed / Y total（仅在测试执行后更新）

### Compounding Candidates

持续输出"待沉淀候选"，供后续确认沉淀。

## Quality Standards（质量准则）

### 位置

`.cursor/rules/qs-{type}-{scope}/RULE.md`

**注意**：workflow 工具约束已在 Skills/Commands 中实现，不在此目录管理。本目录仅用于项目级质量准则。

### 命名规则

```
qs-{type}-{scope}/RULE.md

type:
  - always: 始终应用（alwaysApply: true）
  - fs: 文件模式匹配（需配置 globs）
  - i: AI 智能判断（需配置 description）
  - m: 手动引用（@qs-m-xxx）

scope:
  - security: 安全合规
  - design: 设计规范
  - frontend: 前端开发
  - backend: 后端开发
  - database: 数据库
  - general: 通用规范
  - ops: 运维部署

**注意**：Scope 只是分类标签，不准确不影响规则功能。AI 根据上下文自行选择合适的 scope。
```

### 类型定义

#### always（始终应用）

- **alwaysApply**：`true`
- **约束**：必须极精炼，每个规则 < 50 行，总计 < 150 行
- **示例**：`qs-always-general`

#### fs（文件模式匹配）

- **globs**：根据项目实际目录结构配置
- **示例**：`qs-fs-frontend`（globs: `**/components/**/*.tsx`）

#### i（AI 智能判断）

- **description**：用英文描述规则提供什么
- **示例**：`qs-i-frontend`（description: "Frontend development standards for component architecture and state management"）

#### m（手动引用）

- **引用方式**：`@qs-m-xxx`
- **示例**：`qs-m-code-review`（引用：`@qs-m-code-review`）

### Schema 索引

位置：`.cursor/rules/quality-standards-schema.md`

定义所有可能的规则组合，作为智慧沉淀时的"选择菜单"。

## Pending Compounding Candidates（待沉淀候选）

### 位置

`.workflow/context/session/pending-compounding-candidates.json`

### 作用

暂存经验候选，等待用户确认沉淀。

### 结构

```json
{
  "asked": false,
  "candidates": [
    {
      "stage": "work",
      "trigger": "当发现 root cause 并更换方案",
      "decision": "实现/修复/接口/边界的取舍",
      "alternatives": ["原方案A（放弃，因为...）"],
      "signal": "判断依据/风险信号/失败证据",
      "solution": "新的实现/修复方案",
      "verify": "测试/验证步骤与结果期望",
      "pointers": ["path/to/file"],
      "notes": "可选补充",
      "timestamp": "2026-01-12T10:00:00Z",
      "source": {
        "req": "REQ-001",
        "stage": "work"
      }
    }
  ]
}
```

### 字段定义

| 字段 | 类型 | 说明 |
|------|------|------|
| **asked** | 布尔 | 是否已提醒用户（防止重复 followup） |
| **candidates** | 数组 | 候选列表 |
| **stage** | 字符串 | 来源阶段 |
| **trigger** | 字符串 | 触发条件 |
| **decision** | 字符串 | 决策内容 |
| **alternatives** | 数组 | 拒绝的备选方案 |
| **signal** | 字符串 | 判断依据 |
| **solution** | 字符串 | 解决方案 |
| **verify** | 字符串 | 验证方式 |
| **pointers** | 数组 | 关联指针 |
| **notes** | 字符串 | 可选补充 |
| **timestamp** | 字符串 | 时间戳 |
| **source** | 对象 | 来源信息（req、stage） |

### 维护机制

- **experience-collector**：写入或合并候选
- **experience-depositor**：读取并处理候选
- **stop hook**：检测并提醒用户

## Checkpoint（检查点）

### 位置

`.workflow/context/session/<REQ-xxx>-checkpoint-*.md`

### 作用

记录当前进度，便于中断后恢复。

### 结构

```markdown
# REQ-xxx Checkpoint

## 当前进度

- 当前任务：T3
- 已完成项：T1, T2
- 待办项：T3, T4, T5

## 关键决策

- ...

## 待解决问题

- ...
```

## 总结

数据模型设计保证了：

- **SSoT 机制**：INDEX.md 是状态的单一事实源
- **可追溯性**：通过谱系字段建立经验关系链
- **可检索性**：通过 Trigger 和 Surface signal 匹配相关经验
- **可维护性**：结构清晰，字段含义明确

参考：
- [Requirements Index](../../.workflow/requirements/INDEX.md)
- [Experience Index](../../.workflow/context/experience/INDEX.md)
- [Quality Standards Schema](../../.cursor/rules/quality-standards-schema.md)
