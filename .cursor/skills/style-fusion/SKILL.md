---
name: style-fusion
description: 持续接收文本、抽取风格、更新长期风格画像，并对外提供当前风格能力。当用户需要分析文本风格、更新风格画像、获取当前风格特征、或生成基于风格的写作 prompt 时激活。支持四种操作：analyze（单次风格提取）、update（风格积累与融合）、get_profile（获取当前风格画像）、generate_prompt（生成风格化写作 prompt）。
---

# Style Fusion

## Overview

此 Skill 持续接收文本，抽取写作风格特征，更新长期风格画像，并对外提供当前风格能力。通过风格融合机制，将多次文本的风格特征融合为稳定的风格画像，支持风格化的写作 prompt 生成。

## 核心能力

### 1. analyze - 单次风格提取（无状态）

**使用方式**：
```
/style_fusion analyze
<粘贴文本>
```

**行为**：
- 调用风格提取器 prompt（见 `references/style-extractor-prompt.md`）
- 不读取、不写入长期状态
- 返回当前文本的风格特征

**输出格式**：
```json
{
  "status": "ok",
  "payload": {
    "sentence_length": { "short": 0.2, "medium": 0.6, "long": 0.2 },
    "logic_pattern": { "deductive": 0.6, "contrast": 0.4 },
    "emotion_intensity": 0.22,
    "vocabulary_level": "professional",
    "structure_preference": "hierarchical"
  }
}
```

**用途**：方便调试 prompt，本地验证效果

### 2. update - 风格积累与融合（核心）

**使用方式**：
```
/style_fusion update
<新文本>
```

**执行流程**：
```
text
 ↓
[Extractor Prompt] → 提取风格特征
 ↓
[Style Normalizer] → 标准化风格向量
 ↓
[Load profile.json] → 读取当前画像
 ↓
[Style Fusion Engine] → 融合新旧风格
 ↓
[Save profile.json] → 保存更新后的画像
```

**状态存储位置**：
```
.cursor/style_fusion/
 ├── profile.json        # 当前稳定画像
 ├── stats.json          # 样本数 / 方差
 └── recent_buffer.json  # 最近 N 次（可选）
```

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

**融合策略**：
- 使用加权平均融合新旧风格特征
- 新样本权重随样本数增加而递减（避免后期震荡）
- 记录每个维度的置信度和样本数
- 风格是慢变量，避免频繁震荡

### 3. get_profile - 获取当前风格画像

**使用方式**：
```
/style_fusion get_profile
```

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
    "style_vector": {
      "sentence_length": { "short": 0.18, "medium": 0.64, "long": 0.18 },
      "logic_pattern": { "deductive": 0.6, "inductive": 0.2, "contrast": 0.2 },
      "emotion_intensity": 0.22,
      "vocabulary_level": "professional",
      "structure_preference": "hierarchical"
    },
    "confidence": 0.85,
    "sample_count": 20
  }
}
```

**用途**：
- README 风格描述
- 用户画像展示
- 年度总结

### 4. generate_prompt - 生成风格化写作 prompt

**使用方式**：
```
/style_fusion generate_prompt
topic: "解释滑动窗口算法"
```

**执行流程**：
1. 读取 `profile.json` 获取当前风格画像
2. 将风格特征转换为可读的写作指导
3. 生成可直接使用的写作 prompt

**输出格式**：
```markdown
请以以下写作风格撰写文章：

**句式特征**：
- 中句为主（64%），少量短句（18%）和长句（18%）
- 避免过长的复合句

**思维方式**：
- 演绎推理为主（60%），结合对比分析（20%）
- 先界定问题，再展开论述

**情感表达**：
- 情感强度：低（0.22），保持克制、理性
- 专业而温暖，不过度技术化

**结构偏好**：
- 层次分明，使用清晰的标题层级
- 开头：先界定问题
- 结尾：总结结构而非情绪

**主题**：解释滑动窗口算法
```

**用途**：让风格"活起来"，直接用于指导写作

## 工作流程

### 初始化

首次使用时，如果 `.cursor/style_fusion/` 目录不存在，自动创建并初始化：

```json
// profile.json
{
  "style_vector": {},
  "sample_count": 0,
  "last_updated": null
}

// stats.json
{
  "total_samples": 0,
  "dimension_variance": {},
  "confidence": 0
}
```

### 风格提取流程

1. **读取风格提取 prompt**：从 `references/style-extractor-prompt.md` 加载
2. **调用 LLM**：使用 prompt 提取文本风格特征
3. **标准化**：将提取结果转换为统一的风格向量格式
4. **验证完整性**：检查必需维度是否齐全

### 风格融合流程

1. **加载当前画像**：读取 `profile.json`
2. **计算融合权重**：
   - 新样本权重：`w_new = 1 / (sample_count + 1)`
   - 旧画像权重：`w_old = 1 - w_new`
3. **逐维度融合**：
   - 对于数值型维度：`new_value = w_old * old_value + w_new * new_value`
   - 对于分类型维度：使用加权投票或概率分布融合
4. **更新统计信息**：
   - 增加样本数
   - 更新置信度（基于样本数和方差）
   - 记录变更维度
5. **保存画像**：写入 `profile.json` 和 `stats.json`

### 风格画像 Schema

```typescript
interface StyleProfile {
  style_vector: {
    // 句式长度分布
    sentence_length: {
      short: number;    // 0-1，短句比例
      medium: number;   // 0-1，中句比例
      long: number;     // 0-1，长句比例
    };
    // 逻辑模式分布
    logic_pattern: {
      deductive: number;  // 演绎推理
      inductive: number;  // 归纳推理
      contrast: number;   // 对比分析
      narrative: number;  // 叙事性
    };
    // 情感强度（0-1）
    emotion_intensity: number;
    // 词汇水平
    vocabulary_level: "casual" | "professional" | "academic";
    // 结构偏好
    structure_preference: "linear" | "hierarchical" | "nested";
    // 开头风格
    opening_style: "question" | "statement" | "context" | "direct";
    // 结尾风格
    closing_style: "summary" | "reflection" | "call_to_action" | "open";
  };
  sample_count: number;
  last_updated: string;  // ISO 8601
  confidence: number;    // 0-1
}
```

## 使用场景

### 场景 1：分析单篇文本风格

用户："分析这段文本的风格特征"

**流程**：
1. 使用 `analyze` 操作
2. 调用风格提取器
3. 返回风格特征（不更新画像）

### 场景 2：更新风格画像

用户："更新我的写作风格画像" 或 "学习这段文本的风格"

**流程**：
1. 使用 `update` 操作
2. 提取文本风格
3. 融合到现有画像
4. 保存更新后的画像

### 场景 3：获取当前风格

用户："我的写作风格是什么样的？" 或 "展示我的风格画像"

**流程**：
1. 使用 `get_profile` 操作
2. 读取 `profile.json`
3. 格式化输出风格特征

### 场景 4：生成风格化写作 prompt

用户："用我的风格写一篇关于 X 的文章" 或 "生成写作 prompt"

**流程**：
1. 使用 `generate_prompt` 操作
2. 读取风格画像
3. 转换为可读的写作指导
4. 生成 prompt

## 与其他 Skills 的集成

### 与 write-doc 集成

在 `write-doc` 执行时，可以：
1. 调用 `get_profile` 获取当前风格
2. 将风格特征注入到文档编写过程中
3. 确保文档风格一致性

### 与 experience-depositor 集成

在经验沉淀时，可以：
1. 分析经验文档的风格
2. 更新项目整体风格画像
3. 确保经验文档风格统一

## 技术实现

### 风格融合引擎

见 `scripts/style-fusion-engine.js`，包含：
- 风格向量标准化
- 加权融合算法
- 置信度计算
- 变更检测

### 风格提取 Prompt

见 `references/style-extractor-prompt.md`，包含：
- 风格维度定义
- 提取指令
- 输出格式要求

## 重要经验提醒

1. **不要一开始就 embedding**：先使用结构化特征，embedding 作为补充
2. **JSON 稳定性 > 语义优雅**：优先保证数据结构稳定，便于版本控制和 diff
3. **update 必须可回放**：每次 update 应该可追溯，git diff 很爽
4. **风格是慢变量**：不要频繁震荡，使用平滑融合策略
5. **状态持久化**：所有状态存储在 `.cursor/style_fusion/`，符合 Cursor 项目内持久化范式

## 注意事项

1. **状态管理**：确保 `profile.json` 的读写是原子的，避免并发问题
2. **版本兼容**：profile schema 变更时，需要迁移逻辑
3. **性能考虑**：风格提取需要调用 LLM，考虑缓存和批处理
4. **隐私保护**：风格画像可能包含敏感信息，注意存储安全
