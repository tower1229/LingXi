---
name: memory-retrieve
description: 以传入的 query 从 `.cursor/.lingxi/memory/project/` 与 `.cursor/.lingxi/memory/share/` 检索记忆，产出 adopt/reject/ask 决策输入。仅当用户消息包含自由输入时调用；仅 command/skill 调用时不调用，由主流程写入 memory.retrieve.skipped 后直接作答。
---

# Memory Retrieve

## 意图

以传入的 query（当前用户消息或 Agent 构建的决策点描述）从 @.lingxi/memory/project/ 与 @.lingxi/memory/share/ 检索可能有用的记忆，产出可执行的命中与决策输入（adopt/reject/ask），驱动回答前决策；无匹配时静默。

## 调用形式与输入

- **/memory-retrieve** \<query\>
- **何时调用**：仅当本轮用户消息包含**独立的自由输入**时，先调用 `/memory-retrieve <当前用户消息>` 再回答。以下情况**不调用**本 Skill，主流程写入 `memory.retrieve.skipped` 后直接作答：
  - 仅有零参数命令（如 `/task`、`/review`、`/start-tuning`）；
  - 命令携带参数的调用（如 `/remember <内容>`、`/task <描述>`），参数是命令的形式输入而非独立用户意图。判断依据：消息以已知命令前缀开头，其后内容为该命令的直接参数。
- 主流程：当前用户消息。嗅探场景：拟做品味嗅探提问前，可传入 Agent 构建的决策点描述；若检索到相关记忆且能覆盖当前选择，则不再问、直接按该记忆行为。

## 执行流程（SSoT）

**pre 模式**（默认，每轮用户输入时）与 **post 模式**（本轮有文件写入后，以实际变更摘要为 query 触发）共用此流程，差异见各步骤括注。

1. **理解判断与意图展开**：判断输入是否具备可检索实质；若存在指代/省略，结合最近 1-2 轮上下文补全。**【意图展开，pre 模式专属】** 当输入为实施类指令（含「修复」「实现」「落地」「完成」「改进」「重构」等动词，或描述一组待执行的技术操作）时，进一步推断该任务将涉及的变更类型并纳入 `semantic_summary`：
   - 将修改灵犀代码/配置/核心文件 → 加入「修改灵犀代码或配置」「灵犀核心文件变更」
   - 将修改含逻辑的脚本（如 .mjs、.ts）→ 加入「修改可测试逻辑」
   - 此展开仅影响 `semantic_summary` 的广度，不改变回答行为，命中后仍按正常 adopt/reject/ask 流程决策。
2. **提炼**：产出 `semantic_summary` 与 `keywords`（技术词、配置项、API 名、场景词等）。
3. **必要性判断**：若仅社交/元表达且关键词为空，跳过检索并静默返回。
4. **双路径检索（必须）**：
   - 语义路径：在范围 @.lingxi/memory/project/ 与 @.lingxi/memory/share/ 内查找与 `semantic_summary` 相关的内容。
   - 关键词路径：调用 `Grep`（ripgrep），范围 @.lingxi/memory/project/、@.lingxi/memory/share/ 正文 + @.lingxi/memory/INDEX.md 的 Title/When to load。
5. **融合与最小读取**：采用**并集（Union）**合并两路候选后重排取 top 0–2；优先保证召回率，避免仅语义路径或仅关键词路径命中的候选被误排除。重排时以语义/关键词相关性为主，`Strength`（hypothesis/validated/enforced）仅作为小权重因子或同分 tie-breaker。只对合并后的 top 0–2 调用 `Read` 做最终相关性确认。
6. **决策与注入**：对命中逐条给出 `adopt/reject/ask`，同时检查每条 note 的 `trigger_timing` 字段：
   - **pre 模式**：`trigger_timing=pre` 或 `both` 的记忆正常 adopt/reject；`trigger_timing=post` 的记忆在 pre 模式中**跳过**（不注入，不计入 adopted）。
   - **post 模式**：`trigger_timing=post` 或 `both` 的记忆正常 adopt/reject 并**立即执行对应义务**（如运行测试、更新版本号等）；`trigger_timing=pre` 的记忆在 post 模式中跳过。
   - `trigger_timing` 字段缺失时默认视为 `pre`（向后兼容）。
7. **审计（v2，必须）**：
   - 正常执行检索：追加 `event=memory.retrieve.performed`，字段必须包含 `query`、`hits`、`adopted`、`rejected`、`semantic_called`、`keyword_called`、`candidate_read_count`、`decision`（并带 `conversation_id`、`generation_id`）。
   - 显式跳过检索：追加 `event=memory.retrieve.skipped`，字段至少包含 `query`、`reason`（并带 `conversation_id`、`generation_id`）。
   - 未记录上述事件将由完整性审计追加 `memory.retrieve.missing`（软强制，不阻断主流程）。

## 关键约束

- **双路径**：语义路径（在 memory/project/、memory/share/ 范围内按 `semantic_summary` 做概念级匹配）+ 关键词路径（Grep `INDEX.md` 的 Title/When to load 及 project/、share/ 下 note 正文）；并集加权后取 top 0–2 条，按需读取原文后不相关则不注入。`Strength` 仅参与同分或近似同分时的保守重排，不覆盖主相关性分。
- **双路径可验证性**：双路径中仅关键词路径（Grep）可通过同轮 pre_tool_use 做执行证据验证；语义路径按自然语言检索结果执行，并以 `memory.retrieve.performed` 的 `semantic_called` 字段记录为准，不做工具链校验。
- **禁止顺序全读**：禁止在未完成双路径检索前，直接顺序读取 `memory/project/*` 或 `memory/share/*` 全量文件。
- **输出契约**：命中时输出结构化结果（`hits`、`adoptionCandidates`、`obligations`、`suggestedAction`）；供主 Agent 做 `adopt/reject/ask` 决策。无匹配时静默。
- **最小注入**：有匹配时仅对 **adopt** 项给出一行极简提示（可执行提醒 + 轻量引用如 `[MEM-xxx]`）；`reject` 项不对用户展示，不输出冗长解释。若依据某条记忆做方案选择，应在表述中自然引用该记忆。
- **决策必达**：主 Agent 拿到命中后必须对每条候选给出 `adopt/reject/ask` 之一；禁止命中后不做决策直接继续。

## References

- **按类型检索策略（文档约定，当前未实现逻辑）**：[references/retrieval-strategy-by-kind.md](references/retrieval-strategy-by-kind.md)
