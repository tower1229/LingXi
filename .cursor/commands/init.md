---
name: init
description: 引导式初始化项目（创建 .cursor/.lingxi/ 骨架与可选记忆草稿，用户门控写入）
args: []
---

# /init - 项目初始化命令

## 命令用途

初始化 workflow 到项目，建立项目上下文（技术栈、目录结构、关键模块、业务链路与约束）；文档齐全时优先从现有内容整理，仅对缺失项提问。生成一份“记忆候选清单”（包含草稿项与可选候选项，默认不写入，需用户门控）。

---

## 使用方式

```
/init
```

命令无需参数。当项目已有较完整文档（如 README、架构说明、任务文档）时，agent 会**优先从现有内容中整理**项目目标、用户、关键流程、风险与发布方式，仅对无法推断或不确定的部分向你提问；你可直接确认或修正后进入候选清单与写入门控。新项目或文档较少时仍通过对话式引导收集。

## 执行逻辑

本命令将执行逻辑委托给 `init-executor` Skill。详细执行流程与收集清单见 `.cursor/skills/init-executor/SKILL.md` 及 `skills/init-executor/references/init-checklists.md`。

---

## 写入门控（关键规则）

> - 本命令会生成“记忆候选清单”，**默认不写入磁盘**。
> - 只有当你在交互步骤中明确选择写入时，才会写入 `.cursor/.lingxi/memory/notes/` 并更新 `.cursor/.lingxi/memory/INDEX.md`。
> - 写入通过**显式调用** lingxi-memory 子代理完成，主对话不展示写入过程。

---

## 交互方式

初始化过程采用交互式推进：先确认抽取结果，再按需补充缺失信息，随后生成候选清单并进行写入门控。具体交互格式、选项定义、解析与追问规则以 `.cursor/skills/init-executor/SKILL.md` 为准。
