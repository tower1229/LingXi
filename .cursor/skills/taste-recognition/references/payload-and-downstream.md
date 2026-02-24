# Payload 与下游约定（引用）

本 Skill 产出 **品味 payload**（7 字段：scene, principles, choice, evidence, source, confidence, apply）。下游约定与映射规则以以下文档为 SSoT，实现时保持一致即可。

- **Payload 规范与示例**：见本 Skill 的 `SKILL.md` 内「品味 Payload 规范」。
- **payload → note 映射、TasteKey 生成、门控规则**：见本目录 `payload-to-note-and-tastekey.md`。
- **lingxi-memory 输入契约**：`.cursor/agents/lingxi-memory.md`（仅接受上述 payload，不产候选，校验 → 映射 → 治理 → 门控 → 写入）。
