---
name: remember
description: 从用户输入(可结合对话上下文理解)提取记忆并写入记忆库
args:
  - name: input
    required: false
    description: 记忆描述或提取指引（可直接记忆表达、禁止/约束、历史提取指引）
---

# /remember - 即时记忆写入

**用途**：从用户输入（可结合对话上下文）提取记忆。委托 **taste-recognition** 做品味识别，若有产出则按协议压入 `HOT_RAM.md` 的 `[POST-PROCESSING QUEUE]`。

**用法**：`/remember <用户输入>`。输入必填，可为直接记忆表达、禁止/约束、历史提取指引或简短提示；详见 taste-recognition Skill。

**执行**：委托 taste-recognition 识别 → 若 payloads 非空则压入 `HOT_RAM.md` 的 `[POST-PROCESSING QUEUE]` 等待后置处理；若无可沉淀或判定不写则**仅输出一句话结论**。

**输出**：有沉淀时提示已加入后置队列；无沉淀时一句话结论即可。
