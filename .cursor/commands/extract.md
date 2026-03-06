---
name: extract
description: 从当前会话或指定时间范围的会话中提取可沉淀内容并写入记忆库
args:
  - name: input
    required: false
    description: 可选。时间范围的自然语言描述，如「提炼今天的会话」「最近2天」「1d」「24h」。不传则对当前会话提取。
---

# /extract - 从会话中提取记忆

**用途**：从当前会话或指定时间范围内的会话中提取可沉淀内容并写入记忆库。委托 **taste-recognition** 做品味提取，若有产出则**单次**调用 **lingxi-memory** 完成治理与写入。

**用法**：

- **不传参**：对当前会话提取（数据来源：当前对话上下文或当前 conversation 在 audit 中的记录）。
- **传参**：时间范围，如 `/extract 提炼今天的会话`、`/extract 最近2天`、`/extract 1d`。数据来源：audit.log 按 `ts` 或 agent-transcripts 按时间过滤后按会话组装文本。若无法解析出有效时间范围则提示错误并终止。

**执行**：确定范围 → 汇总会话内容 → 委托 taste-recognition 提取 → 若 payloads 非空则单次调用 lingxi-memory 并呈现简报；若无可沉淀或判定不写则**仅输出一句话结论**，不呈现简报、不调用 lingxi-memory。

**输出**：有沉淀时呈现 lingxi-memory 的简报（新建/合并/跳过条数及 Id 列表）；无沉淀时一句话结论即可。
