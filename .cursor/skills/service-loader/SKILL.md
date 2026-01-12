---
name: service-loader
description: 冷启动/补齐服务上下文：把“考古”变成可复用资产，生成 .workflow/context/tech/services/<service>.md，并按需沉淀经验/规则指针。
---

# Service Loader（服务上下文冷启动）

## When to Use

- 需求涉及**多个服务/存量系统**，需要先“考古”：服务职责、边界、依赖、入口、配置点、常见坑
- 团队新人/新项目首次接入该仓库，需要快速建立**项目级长期上下文**
- 发现 plan/work/review 阶段频繁出现“我不确定服务怎么做/在哪里改/以前有什么坑”的对话

## Outputs (must write)

- `.workflow/context/tech/services/<service-or-module>.md`
- 按需更新（可选）：
  - `.workflow/context/experience/<tag>-<title>.md`（发现高价值坑点时，需走确认沉淀）
  - `.workflow/context/business/<topic>.md`（跨团队协作/业务边界）

## Principles（上下文工程）

- **先索引后细节**：产物以“概要 + 指针”为主，不复制大段代码
- **Just-in-Time**：只生成后续会反复用到的高信号信息
- **可验证**：所有结论尽量附带“如何验证/去哪看”

## Instructions

### 1) 确认范围（Fail Fast）

一次性确认：

- 服务名/仓库名（或模块名）
- 目标：为了支撑哪个 REQ/哪个业务场景？
- 允许的材料来源：仅仓库代码/README/配置样例，还是还包含内部文档（若没有 MCP/外链权限则跳过）

### 2) 获取代码（推荐在 .workflow/workspace）

将服务代码拉到 `.workflow/workspace/` 下（或在当前仓库直接分析）。

如果无法拉取（无权限/无网络），则退化为：

- 仅基于现有仓库里可见的调用点/配置点做反向推断
- 在产物中明确标注“不确定性”和缺失项

### 3) 生成服务概要文档（模板）

创建 `.workflow/context/tech/services/<service>.md`，结构建议如下：

```markdown
# <Service>（服务上下文）

## 1) 一句话定位（What / Why）

## 2) 边界（Scope）
- 负责什么
- 不负责什么

## 3) 关键入口（Pointers）
- 入口文件/启动方式：`...`
- 核心模块：`...`
- 关键函数/类：`...`

## 4) 依赖关系（Dependencies）
- 上游/下游服务
- 外部系统（配置中心/队列/DB/第三方）

## 5) 配置与开关（Config）
- 配置键/默认值/环境差异
- 常见配置坑（只写结论 + 指针）

## 6) 数据与模型（Data）
- 关键表/字段（只写必要摘要）
- 关键事件/消息（如有）

## 7) 常见坑与排障（Troubleshooting）
- 症状 → 根因 → 修复 → 验证 → 指针
- 若属于“高价值可复用坑”，记录为 experience 候选（走 /flow 沉淀）

## 8) 与本项目 REQ 的关联（Mapping）
- 本 REQ 涉及的修改点建议（指针级）
- 风险提示（高/中/低）
```

### 4) 输出与沉淀建议

完成后在对话里输出（精简）：

- 生成了哪些文档（路径）
- 下一步建议（通常回到 plan/work）
- 本轮识别到的“复利候选”列表（如有）

