---
name: memory-retrieve
description: 以检索查询为参数检索记忆库并最小注入。query 可为用户 prompt 或 Agent 构建的决策点描述。调用形式 /memory-retrieve <query>；无匹配静默。
---

# Memory Retrieve

## 意图

以传入的 query（当前用户消息或 Agent 构建的决策点描述）从 `.cursor/.lingxi/memory/notes/` 检索可能有用的记忆，以最小高信号形式注入回答决策；不打扰用户，无匹配时静默。

## 调用形式与输入

- **/memory-retrieve** \<query\>
- 主流程：当前用户消息。嗅探场景：拟做品味嗅探提问前，可传入 Agent 构建的决策点描述；若检索到相关记忆且能覆盖当前选择，则不再问、直接按该记忆行为。

## 关键约束

- **双路径**：语义检索（notes/ 概念级匹配）+ 关键词（Grep INDEX 的 Title、When to load 及 notes 正文）；并集加权后取 top 0–2 条，按需读取原文后不相关则不注入。
- **最小注入**：有匹配时每条 1–2 句（可执行提醒 + 轻量引用如 `[MEM-xxx]`）；无匹配完全静默。不在对外输出中显式声明「我检索了记忆库」；若依据某条记忆做方案选择，应在表述中自然引用该记忆。
- **降级**：语义不可用时仅执行关键词路径；仍无匹配则静默。

## References

- **执行步骤、检索策略细节、输出行为、失败降级**：[references/retrieval-strategy.md](references/retrieval-strategy.md)
