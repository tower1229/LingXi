---
name: remember
description: 从用户输入或对话上下文中提取记忆并写入记忆库（memory/notes/），写入前做语义近邻治理
args:
  - name: input
    required: false
    description: 记忆描述或提取指引（可直接记忆表达、禁止/约束、历史提取指引）
---

# /remember - 即时记忆写入入口

## 命令用途

从用户输入或对话上下文中提取**记忆**并写入持久化记忆库（`memory/notes/`），并在写入前自动进行语义近邻治理（create/update/delete），用于提升后续每轮的检索注入质量。

---

## 前置要求（必须）

- **Cursor Nightly**：本工作流依赖 Agent Skills（仅 Nightly 渠道可用）

---

## 使用方式

```
/remember [用户输入]
```

**用户输入必须提供**，可以是：

- **直接记忆表达**：`/remember 用户是唯一拥有价值判断能力的人`（从输入中提取并结构化记忆）
- **禁止/约束**：`/remember 这里不要用 var，用 let/const`（从输入或对话中提取并结构化为约束类记忆）
- **历史提取指引**：`/remember 吸取刚才这个 bug 的经验`（从对话历史中提取相关记忆）
- **混合模式**：`/remember 记住：... 另外：...`（分别处理）
- **简短提示**：`/remember 钱包选择问题`（帮助 AI 定位对话历史中要提取的内容）
- **关键词提示**：`/remember Apollo 配置`（帮助 AI 聚焦某个模块）

---

## 产物（必须写入）

- `.cursor/.lingxi/memory/notes/MEM-*.md`（记忆文件，需用户确认后写入）
- `.cursor/.lingxi/memory/INDEX.md`（统一索引，写入后自动更新/校验）

---

## 执行逻辑

本命令不包含执行逻辑，仅通过**显式调用**将任务交给 **lingxi-memory** 子代理；子代理定义见 `.cursor/agents/lingxi-memory.md`。具体调用方式与输出要求见下文。

## 执行流程

### 1) 解析用户输入

**用户输入不能为空**。如果用户只输入 `/remember` 而没有提供任何内容，应提示用户提供输入。

根据用户输入理解意图（直接记忆表达 / 历史提取指引 / 提示词定位 / 混合），从对话或输入中提炼结构化要点，并构造与 auto 一致的 `input` 结构（`user_input`、`target_claim`、可选 `selected_candidates`、可选 `confidence`）。

当存在“交互式候选勾选”场景时，**必须**使用 questions 多选交互收集选择结果（交互协议优先复用：使用 `/questions-interaction skills`），再将选择结果写入结构化 `input.selected_candidates[]`；不再支持用户手输编号文本写入入口（例如 `/remember 1,3`）。

### 2) 显式调用 lingxi-memory 子代理

- **不**在主对话执行提取/治理/写入；**仅**通过显式调用将任务交给 lingxi-memory 子代理，并在主对话根据其返回展示一句结果或静默。
- **调用方式**（二选一）：
  - **`/lingxi-memory` 语法**：在提示中写 `/lingxi-memory mode=remember input=<结构化对象>`（必要时补充 confidence）。
  - **自然语言**：在对话中明确提及子代理，例如「使用 lingxi-memory 子代理将以下内容写入记忆库：<内容>」。
- 子代理在独立上下文中完成：产候选 → 治理（TopK）→ 门控（如需）→ 直接文件写入 → 向主对话返回一句结果。

---

## 输出要求

调用阶段静默完成；主对话仅一句结果或静默；写入成功可完全静默。
