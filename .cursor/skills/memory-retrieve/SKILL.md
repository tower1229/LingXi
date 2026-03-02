---
name: memory-retrieve
description: 以传入的 query（当前用户消息或 Agent 构建的决策点描述）从 `.cursor/.lingxi/memory/notes/` 检索可能有用的记忆，产出可执行的命中与决策输入（adopt/reject/ask），驱动回答前决策；无匹配时静默。
---

# Memory Retrieve

## 意图

以传入的 query（当前用户消息或 Agent 构建的决策点描述）从 `.cursor/.lingxi/memory/notes/` 检索可能有用的记忆，产出可执行的命中与决策输入（adopt/reject/ask），驱动回答前决策；无匹配时静默。

## 调用形式与输入

- **/memory-retrieve** \<query\>
- 主流程：当前用户消息。嗅探场景：拟做品味嗅探提问前，可传入 Agent 构建的决策点描述；若检索到相关记忆且能覆盖当前选择，则不再问、直接按该记忆行为。

## 执行流程（SSoT）

1. **理解判断**：判断输入是否具备可检索实质；若存在指代/省略，结合最近 1-2 轮上下文补全。
2. **提炼**：产出 `semantic_summary` 与 `keywords`（技术词、配置项、API 名、场景词等）。
3. **必要性判断**：若仅社交/元表达且关键词为空，跳过检索并静默返回。
4. **双路径检索（必须）**：
   - 语义路径：调用 `SemanticSearch`，范围 `.cursor/.lingxi/memory/notes/`（含 `share/`）。
   - 关键词路径：调用 `Grep`（ripgrep），范围 `memory/notes/` 正文 + `memory/INDEX.md` 的 Title/When to load。
5. **融合与最小读取**：两路并集合并重排取 top 0-2，只对 top 0-2 调用 `Read` 做最终相关性确认。
6. **决策与注入**：对命中逐条给出 `adopt/reject/ask`；仅对 adopt 做一行极简注入。
7. **审计**：追加 `event=memory_retrieve`（建议字段：`query`、`hits`、`adopted`、`rejected`、`semantic_called`、`keyword_called`、`candidate_read_count`）。

## 关键约束

- **双路径**：语义检索（notes/ 概念级匹配）+ 关键词（Grep INDEX 的 Title、When to load 及 notes 正文）；并集加权后取 top 0–2 条，按需读取原文后不相关则不注入。
- **禁止顺序全读**：禁止在未完成双路径检索前，直接顺序读取 `memory/notes/*` 全量文件。
- **输出契约**：命中时输出结构化结果（`hits`、`adoptionCandidates`、`obligations`、`suggestedAction`）；供主 Agent 做 `adopt/reject/ask` 决策。无匹配时静默。
- **最小注入**：有匹配时仅对 **adopt** 项给出一行极简提示（可执行提醒 + 轻量引用如 `[MEM-xxx]`）；`reject` 项不对用户展示，不输出冗长解释。若依据某条记忆做方案选择，应在表述中自然引用该记忆。
- **决策必达**：主 Agent 拿到命中后必须对每条候选给出 `adopt/reject/ask` 之一；禁止命中后不做决策直接继续。
- **降级**：语义不可用时仅执行关键词路径；仍无匹配则静默。
