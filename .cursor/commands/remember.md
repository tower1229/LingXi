---
name: remember
description: 从用户输入(可结合对话上下文理解)提取记忆并写入记忆库
args:
  - name: input
    required: false
    description: 记忆描述或提取指引（可直接记忆表达、禁止/约束、历史提取指引）
---

# /remember - 即时记忆写入

**用途**：从用户输入（可结合对话上下文）提取记忆，经 taste-recognition 产出 7 字段 payload 后，由 lingxi-memory 子代理写入持久化记忆库。

**用法**：`/remember <用户输入>`。输入必填，可为直接记忆表达、禁止/约束、历史提取指引或简短提示；详见 taste-recognition Skill。

**约定**：必须先调用 taste-recognition 产出 payload，再以该 payload 与 conversation_id（及可选 generation_id）调用 lingxi-memory；lingxi-memory 仅接受 payload。主对话仅输出一句结果或静默。

**产物**：`.cursor/.lingxi/memory/notes/MEM-*.md`、`INDEX.md`（经用户门控后写入）。完整执行流程见 taste-recognition 与 `.cursor/agents/lingxi-memory.md`。
