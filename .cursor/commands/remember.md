---
name: remember
description: 从用户输入(可结合对话上下文理解)提取记忆并写入记忆库
args:
  - name: input
    required: false
    description: 记忆描述或提取指引（可直接记忆表达、禁止/约束、历史提取指引）
---

# /remember - 即时记忆写入

**用途**：从用户输入（可结合对话上下文）提取记忆。委托 **taste-recognition** 做品味识别，若有产出则调用 **lingxi-memory-write** 完成治理与写入。

**用法**：`/remember <用户输入>`。输入必填，可为直接记忆表达、禁止/约束、历史提取指引或简短提示；详见 taste-recognition Skill。

**执行**：委托 taste-recognition 识别 → 若 payloads 非空则单次调用 lingxi-memory-write 并呈现简报；若无可沉淀或判定不写则**仅输出一句话结论**，不调用 lingxi-memory-write。

**输出**：有沉淀时呈现 lingxi-memory-write 的简报；无沉淀时一句话结论即可。
