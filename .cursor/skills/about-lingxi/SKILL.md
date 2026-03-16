---
name: about-lingxi
description: 仅在涉及灵犀架构、工作流、记忆系统、守护层、灵犀内 Command/Skill/Hook 选择与设计、或自我迭代（诊断与改进、对灵犀核心文件如 Skill/插件/Rules/refs 的评估与修改）时激活。提供核心价值、四层架构与双轨心智模型、场景→加载清单→动作映射及 refs 指针；调优与方案评估时提供价值对齐与工程实践依据；自我迭代时提供标准出处与可改边界。勿在用户仅问通用编程、框架用法或业务逻辑时仅因出现「架构」「优化」等词而激活。
---

# About LingXi

## 定位

帮助 agent 快速建立灵犀心智模型，并在对 workflow/架构做改动、调优或方案评估时提供价值对齐与工程实践依据。**禁止在未确定具体场景时一次性加载 references 下全部文档**；以本 SKILL 页为首屏，按下方「场景与加载清单」优先加载与当前问题最相关的 1～2 篇 ref，需要时再追加。

---

## 一页纸入门（先读本节再决定是否加载 refs）

- **四层**：**调度层**（主 Agent 决策、双轨、状态与后处理）→ **执行层**（Subagents、Megaprompt 与 `<Execution_Summary>`）→ **记忆层**（HOT_RAM、SESSION_TRACE、USER、memory/、INDEX、WAL）→ **守护层**（beforeSubmitPrompt → heartbeat-check；heartbeat-plugins 注册表，入队与消费分离）。
- **双轨**：task / vet / plan / review 走 **Fast-Path**（主 Agent 直接执行）；仅涉及代码编写或 **build** 走 **Strict OS**（委派 Subagent，必走 HOT_RAM 管道）。
- **关键路径**：每轮先读 `HOT_RAM.md` → 双轨分支 → Strict OS 下「前置检索 → 派发 → 状态回收 → 消费 [POST-PROCESSING QUEUE]」；后处理未勾销前不得结束回复。
- **契约**：WAL 以 wal-schema/wal-utils 为准；Subagent 输出以 `<Execution_Summary>` 为准；HOT_RAM 以 ipc-protocols、模板为准。
- **可迭代**：工作流 Skill、心跳插件、Rules、记忆层、about-lingxi 文档等均可由自我迭代在评估后发现并修改或扩展；标准与可改边界以本 SKILL 及 refs 为准；24h 心跳等触发诊断与低风险自动改进，更大范围或高风险变更仅提案或经人工确认。可迭代实体一览见 `architecture.md` §4。
- **深入**：细节见 `references/architecture.md`、`references/lifecycle-flow.md`、`references/memory-system.md`、`references/ipc-protocols.md`；原则与调优见 `references/design-principles.md`、`references/engineering-practices.md`、`references/optimization-guide.md`。

---

## 何时使用 / 何时不激活

**仅在以下情况激活本 skill**：用户或任务涉及灵犀背景、四层架构、工作流（task/vet/plan/build/review）、记忆系统、守护层与心跳、或在灵犀内选择/设计 Command/Skill/Hook、或对灵犀相关方案做调优/评估、或**自我迭代**（诊断与改进、对灵犀核心文件如 Skill/插件/Rules/refs 的评估与修改）。

**不要激活**：用户仅问通用编程、框架 API、业务逻辑、非灵犀项目代码时，仅因出现「架构」「优化」「设计」等词而激活；若不涉及灵犀的 workflow/记忆/守护/组件选择，则不加载本 skill。

---

## 场景与加载清单

| 场景 | 建议加载（1～2 篇优先） | 读后动作 |
|------|-------------------------|----------|
| **快速了解灵犀** | 本页「一页纸入门」即可；需摘要时再加载 `core-values.md` + `architecture.md` | 用 1～3 句话说明四层 + 双轨 + 关键路径，并给出可深入 refs |
| **设计新功能 / 选组件** | `architecture.md` + `lifecycle-flow.md`；涉及记忆则加 `memory-system.md` 或 `ipc-protocols.md` | 标明涉及哪一层、建议用哪个 Command/Skill/Hook，若有文档需同步则列出 |
| **改守护层 / 心跳** | `architecture.md`（守护层一节）+ `engineering-practices.md`（OCP/分层）；实现约定见 heartbeat-plugins/README | 确认入队与消费分离、WAL 契约、插件注册方式；列出可能需改动的文件 |
| **调优 / 效果与性能** | `optimization-guide.md`；需清单勾选时加 `optimization-checklist.md` | 按层级给出调优点与建议；若做评估则给出通过项、需调整项、权衡 |
| **方案评估 / 质量评估** | `core-values.md` + `design-principles.md` + `engineering-practices.md` | 价值对齐（心有灵犀 / AI Native / 称心如意）+ 架构层级影响 + 工程实践要点 + 建议下一步 |
| **自我迭代（诊断与改进）** | 按本轮实体类型：记忆层 → `memory-system.md` + memory-write 的 write-protocol、governance-context-schema；守护层 → `architecture.md` 守护层 + `heartbeat-plugins/README.md`；工作流/Skill/refs → `architecture.md` §4 可迭代实体一览 + `design-principles.md` + `engineering-practices.md`（含自我迭代的风险与门控）。优先 1～2 篇 + 必含 architecture §4 | 标明涉及实体类型与层级；诊断与改进**须注明所依据的标准与出处**（如 architecture §4、engineering-practices SSoT）；仅执行 refs 中约定为低风险且可自动执行的动作；结果写回审计 |

---

## References 定位

详细流程、契约与检查清单在 `references/` 下，**按上表按需读取**，避免首屏加载过多。

- 核心价值与架构：`references/core-values.md`、`references/architecture.md`（含 §4 可迭代实体一览）、`references/memory-system.md`
- 调度与契约：`references/lifecycle-flow.md`、`references/ipc-protocols.md`
- 设计原则与工程实践：`references/design-principles.md`、`references/engineering-practices.md`
- 调优：`references/optimization-guide.md`、`references/optimization-checklist.md`
- 外部与课程摘要：`references/cursor-learn-courses-summary.md`（外部 URL 见该文件）
