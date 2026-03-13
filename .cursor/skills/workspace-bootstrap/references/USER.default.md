# 🧑 LingXi User Config

> **[说明]** 本文件存储用户对 Agent 行为的**全局配置**（称呼、语言、输出风格等程序记忆）。
> 由用户通过 `/remember` 显式写入，或经 `taste-recognition` 识别后门控确认写入。
> 主 Agent 在每次会话首轮（`[GLOBAL CONFIG]` 为空时）将本文件内容注入 `HOT_RAM.md` 的 `[GLOBAL CONFIG]` 区块，对**所有 Tier** 的响应生效。
>
> **注意**：本文件由 lingxi-memory-write 负责写入，主 Agent 只读取，不直接修改本文件。

---

## 行为偏好

_(空 — 通过 `/remember` 或在对话中表达偏好来填充)_
