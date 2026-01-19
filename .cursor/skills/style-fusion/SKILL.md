---
name: style-fusion
description: 持续接收文本、抽取风格、更新长期风格画像，并对外提供当前风格能力。当用户需要分析文本风格、更新风格画像、获取当前风格特征、或生成基于风格的写作 prompt 时激活。支持四种操作：analyze（单次风格提取）、update（风格积累与融合，默认动作）、get_profile（获取当前风格画像）、generate_prompt（生成风格化写作 prompt）。可直接粘贴文本，默认执行 update 操作。
---

# Style Fusion

## 动作识别

**默认动作**：直接粘贴文本时，默认执行 `update` 操作。

**识别规则**：
- 输入以 `analyze`、`update`、`get_profile`、`generate_prompt` 开头 → 对应操作
- 输入包含 `topic:` 或 `主题:` → `generate_prompt`
- 输入是 `get_profile` 或 `profile` → `get_profile`
- **其他情况** → 默认 `update`

## 核心操作

### analyze - 单次风格提取

**执行步骤**：
1. 读取 `references/style-extractor-prompt.md`
2. 使用 prompt 提取文本风格特征
3. 返回风格向量（不更新画像）

**输出格式**：
```json
{
  "status": "ok",
  "payload": {
    "sentence_length": { "short": 0.2, "medium": 0.6, "long": 0.2 },
    "logic_pattern": { "deductive": 0.6, "inductive": 0.1, "contrast": 0.3, "narrative": 0.0 },
    "emotion_intensity": 0.22,
    "vocabulary_level": "professional",
    "structure_preference": "hierarchical",
    "opening_style": "context",
    "closing_style": "summary"
  }
}
```

### update - 风格融合（默认动作）

**执行步骤**：
1. 提取风格特征（同 analyze）
2. 标准化风格向量
3. 读取 `.cursor/style_fusion/profile.json`
4. 调用 `scripts/style-fusion-engine.js` 融合新旧风格
5. 保存更新后的画像

**融合算法**：
- 新样本权重：`w_new = 1 / (sample_count + 1)`
- 旧画像权重：`w_old = 1 - w_new`
- 数值型维度：`new_value = w_old * old_value + w_new * new_value`
- 分布类维度：加权平均后归一化
- 分类型维度：加权投票（权重大的优先）

**输出格式**：
```json
{
  "status": "updated",
  "payload": {
    "changed_dimensions": ["sentence_length", "logic_pattern"],
    "confidence": 0.82,
    "sample_count": 15
  }
}
```

### get_profile - 获取风格画像

**执行步骤**：
1. 读取 `.cursor/style_fusion/profile.json`
2. 提取主导特征
3. 格式化输出

**输出格式**：
```json
{
  "status": "ok",
  "payload": {
    "dominant_traits": {
      "sentence_length": "medium-heavy",
      "logic_pattern": "deductive",
      "emotion_intensity": "low"
    },
    "style_vector": { ... },
    "confidence": 0.85,
    "sample_count": 20
  }
}
```

### generate_prompt - 生成写作 prompt

**执行步骤**：
1. 读取 `profile.json` 获取风格画像
2. 将风格向量转换为可读的写作指导
3. 生成包含主题的写作 prompt

**输出格式**：
```markdown
请以以下写作风格撰写文章：

**句式特征**：中句为主（64%），少量短句（18%）和长句（18%）

**思维方式**：演绎推理为主（60%），结合对比分析（20%）

**情感表达**：情感强度低（0.22），保持克制、理性

**结构偏好**：层次分明，使用清晰的标题层级
- 开头：先界定问题
- 结尾：总结结构而非情绪

**主题**：解释滑动窗口算法
```

## 工作流程

### 初始化

首次使用时，自动创建 `.cursor/style_fusion/` 目录并初始化：

```json
// profile.json
{
  "style_vector": {},
  "sample_count": 0,
  "last_updated": null,
  "confidence": 0
}

// stats.json
{
  "total_samples": 0,
  "dimension_variance": {},
  "confidence": 0
}
```

### 风格提取

1. 读取 `references/style-extractor-prompt.md`
2. 调用 LLM 提取风格特征
3. 标准化风格向量（分布类维度归一化）
4. 验证完整性（7 个维度必须齐全）

### 风格融合

1. 加载 `profile.json`
2. 计算融合权重（新样本权重随样本数递减）
3. 逐维度融合
4. 更新统计信息（样本数、置信度、方差）
5. 保存画像

### 风格画像 Schema

```typescript
interface StyleProfile {
  style_vector: {
    sentence_length: { short: number; medium: number; long: number; };
    logic_pattern: { deductive: number; inductive: number; contrast: number; narrative: number; };
    emotion_intensity: number;  // 0-1
    vocabulary_level: "casual" | "professional" | "academic";
    structure_preference: "linear" | "hierarchical" | "nested";
    opening_style: "question" | "statement" | "context" | "direct";
    closing_style: "summary" | "reflection" | "call_to_action" | "open";
  };
  sample_count: number;
  last_updated: string;  // ISO 8601
  confidence: number;    // 0-1
}
```

## 技术实现

- **风格融合引擎**：`scripts/style-fusion-engine.js`
- **风格提取 Prompt**：`references/style-extractor-prompt.md`
- **Schema 文档**：`references/profile-schema.md`

## 关键约束

1. **风格是慢变量**：使用平滑融合策略，避免频繁震荡
2. **JSON 稳定性优先**：数据结构稳定，便于版本控制和 diff
3. **状态持久化**：所有状态存储在 `.cursor/style_fusion/`
4. **置信度计算**：基于样本数和方差，`confidence = (1 - exp(-sample_count / 10)) * (1 - variance_penalty)`
