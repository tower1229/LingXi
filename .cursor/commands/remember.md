---
name: remember
description: 从用户输入(可结合对话上下文理解)提取记忆并写入记忆库
args:
  - name: input
    required: false
    description: 记忆描述或提取指引（可直接记忆表达、禁止/约束、历史提取指引）
---

# /remember - 即时记忆写入入口

## 命令用途

从用户输入(可结合对话上下文理解)中提取**记忆**，并调用 lingxi-memory subagent 写入持久化记忆库。

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

## 执行流程

### 1) 解析用户输入

**用户输入不能为空**。如果用户只输入 `/remember` 而没有提供任何内容，应提示用户提供输入。

根据用户输入理解意图（直接记忆表达 / 历史提取指引 / 提示词定位 / 混合），确定要提取的记忆范围（当前轮用户输入或用户指定的对话范围）。

### 2) 调用 taste-recognition skill

调用 taste-recognition skill（`.cursor/skills/taste-recognition/SKILL.md`），将当前轮用户输入或用户指定的「要记住的内容/对话范围」作为输入，由该 skill 判断是否可沉淀并产出 7 字段品味 payload（scene, principles, choice, evidence, source=remember, confidence, apply）。若 taste-recognition 静默（无可沉淀），则不调用 lingxi-memory，提示「未识别到可沉淀记忆」。

### 3) 调用 lingxi-memory 子代理

当 taste-recognition 产出 payload 时：

- 用该 **payload** 显式调用 lingxi-memory 子代理，并传入 **conversation_id**（及可选 generation_id）供审计。
- **调用方式**（二选一）：在提示中写 `/lingxi-memory` 并传入 payload，或自然语言「使用 lingxi-memory 子代理将以下 payload 写入记忆库：<payload>」。
- 子代理在独立上下文中完成：校验 → 映射 → 评分卡 → 治理（TopK）→ 门控（如需）→ 直接文件写入 → 向主对话返回一句结果。

---

## 输出要求

调用阶段静默完成；主对话仅一句结果或静默。
