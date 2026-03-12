---
name: memory-retrieve
description: 以传入的 query 从 `.cursor/.lingxi/memory/project/` 与 `.cursor/.lingxi/memory/share/` 检索记忆，产出结果供主 Agent 写入 HOT_RAM.md 的 [PRE-MEMORY] 或 [POST-PROCESSING QUEUE] 区块。
---

# Memory Retrieve

## 意图

以传入的 query（当前用户消息或 Execution_Summary 的 Touched Assets）从 @.lingxi/memory/project/ 与 @.lingxi/memory/share/ 检索可能有用的记忆。
在 **AgentOS 架构**下，本 Skill 的产出不再直接用于回答，而是作为**状态机构建**的输入：
- **Pre-Phase (前置检索)**：命中结果必须由主 Agent 写入 `HOT_RAM.md` 的 `[PRE-MEMORY]` 区块，供组装 Megaprompt。
- **Post-Phase (后置检索)**：命中结果（滞后义务）必须由主 Agent 压入 `HOT_RAM.md` 的 `[POST-PROCESSING QUEUE]`。

## 调用形式与输入

- **/memory-retrieve** \<query\>
- **何时调用**：
  1. **Pre-Phase**：主 Agent 处于 `IDLE` 状态收到新指令时，以用户输入为 Query 调用。
  2. **Post-Phase**：主 Agent 处于 `POST_PROCESSING_REQUIRED` 状态消费队列时，以 Subagent 返回的 `<Execution_Summary>` 中的 `Touched Assets` 或关键节点为 Query 调用。

## 执行流程 (AgentOS 适配版)

1. **理解判断与意图展开**：判断输入是否具备可检索实质；若存在指代/省略，结合最近 1-2 轮上下文补全。
2. **提炼**：产出 `semantic_summary` 与 `keywords`（技术词、配置项、API 名、场景词等）。
3. **必要性判断**：若仅社交/元表达且关键词为空，跳过检索并静默返回。
4. **双路径检索（必须）**：
   - 语义路径：在范围 @.lingxi/memory/project/ 与 @.lingxi/memory/share/ 内查找与 `semantic_summary` 相关的内容。
   - 关键词路径：调用 `Grep`（ripgrep），范围 @.lingxi/memory/project/、@.lingxi/memory/share/ 正文 + @.lingxi/memory/INDEX.md 的 Title/When to load。
5. **融合与最小读取**：采用**并集（Union）**合并两路候选后重排取 top 0–2。
6. **输出与状态机写入 (AgentOS 核心契约)**：
   - **Pre 模式**：筛选 `trigger_timing=pre` 或 `both` 的记忆。主 Agent 必须将命中的记忆内容格式化为 `- **Rule**: [内容]`，写入 `HOT_RAM.md` 的 `[PRE-MEMORY]` 区块。
   - **Post 模式**：筛选 `trigger_timing=post` 或 `both` 的记忆。主 Agent 必须将命中的滞后义务（如“更新版本号”）格式化为 `- [ ] [POST_RETRIEVE_OBLIGATION]: [具体任务]`，压入 `HOT_RAM.md` 的 `[POST-PROCESSING QUEUE]`。

## 关键约束

- **双路径**：语义路径 + 关键词路径，并集加权后取 top 0–2 条。
- **禁止直接回答**：本 Skill 的任何输出都必须先经过 `HOT_RAM.md` 的流转，严禁绕过状态机直接向用户输出“我查到了某某记忆”。
