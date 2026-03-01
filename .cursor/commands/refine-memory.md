---
name: refine-memory
description: 对当前会话或指定时间范围的会话做可沉淀内容提炼并写入记忆库
args:
  - name: input
    required: false
    description: 可选。时间范围的自然语言描述，如「提炼今天的会话」「提炼最近2天的会话」「1d」「24h」。不传则对当前会话提炼。
---

# /refine-memory - 可沉淀内容提炼

**用途**：对当前会话或指定时间范围内的会话做可沉淀内容提炼，经 taste-recognition 产出多条 payload 后，**单次**传入 lingxi-memory 子代理完成治理与写入，避免并行多调导致 Id 竞争；最后将 lingxi-memory 返回的简报呈现给用户。

## 两种用法

- **默认不传参**：对**当前会话**进行提炼。用户可在一轮会话结束后执行 `/refine-memory`，即对本轮对话内容做可沉淀提取并单次传入 lingxi-memory。数据来源为当前对话上下文（或当前 conversation_id 在 `.cursor/.lingxi/workspace/audit.log` 中的记录）。
- **带参数**：接受**自然语言描述的时间范围**，对在该时间范围内的会话做提炼。示例：
  - `/refine-memory 提炼今天的会话`
  - `/refine-memory 提炼最近2天的会话`
  - `/refine-memory 1d`
  - `/refine-memory 24h`
  数据来源：`.cursor/.lingxi/workspace/audit.log` 按 `ts` 过滤，或 agent-transcripts 按时间过滤；按会话/轮次组装文本。

## 错误处理

当用户**传了参数**但无法从输入中解析出有效时间范围时，**提示错误并终止运行**（不进行提炼、不调用 taste-recognition/lingxi-memory）。无参数时不解析时间范围，不触发此校验。

## 执行步骤（自然语言描述，Agent 可直接理解并执行）

1. **确定范围**：若无参数，则对本轮当前会话提炼（使用当前对话上下文或当前 conversation_id 在 audit 中的对应记录）；若有参数，则从用户输入中解析时间范围（如「今天」「最近 N 天」「Nd」「Nh」等），若解析不到有效时间范围则提示错误并终止。
2. **汇总会话内容**：根据上一步范围，从当前对话或从 `.cursor/.lingxi/workspace/audit.log`（按 `ts` 过滤）、或从 agent-transcripts 按时间过滤，按会话/轮次组装成可识别的文本。
3. **可沉淀提取**：调用 taste-recognition 对上述内容做可沉淀偏好识别，收集产出的全部 payload（可能 0 条至多条）。
4. **单次写入**：将产出的 payload 数组（payloads）与 conversation_id（及可选 generation_id）**单次**传入 lingxi-memory 子代理，避免多次调用导致 MEM-id 重复或 note 覆盖。
5. **呈现简报**：将 lingxi-memory 返回的简报（新建/合并/跳过条数及 Id 列表）呈现给用户。

**约定**：不委托独立 Skill，本 command 内用自然语言描述步骤即可；lingxi-memory 仅接受 **payloads 数组**（taste-recognition 产出的 7 字段 payload 列表），禁止传入原始对话片段。

**产物**：`.cursor/.lingxi/memory/notes/MEM-*.md`、`INDEX.md`（经治理与门控后写入）；主对话输出 lingxi-memory 的简报或一句结果。
