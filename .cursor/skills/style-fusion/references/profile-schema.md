# Style Profile Schema

## profile.json 结构

```json
{
  "style_vector": {
    "sentence_length": {
      "short": 0.18,
      "medium": 0.64,
      "long": 0.18
    },
    "logic_pattern": {
      "deductive": 0.6,
      "inductive": 0.1,
      "contrast": 0.3,
      "narrative": 0.0
    },
    "emotion_intensity": 0.22,
    "vocabulary_level": "professional",
    "structure_preference": "hierarchical",
    "opening_style": "context",
    "closing_style": "summary"
  },
  "sample_count": 20,
  "last_updated": "2024-01-15T10:30:00.000Z",
  "confidence": 0.85
}
```

## 字段说明

### style_vector

风格向量，包含所有风格维度的当前值。

#### sentence_length

句式长度分布，三个值的总和必须为 1.0。

- `short`: 短句比例（≤ 15 字中文 / ≤ 10 词英文）
- `medium`: 中句比例（16-30 字中文 / 11-25 词英文）
- `long`: 长句比例（> 30 字中文 / > 25 词英文）

#### logic_pattern

逻辑模式分布，四个值的总和必须为 1.0。

- `deductive`: 演绎推理比例（从一般到具体）
- `inductive`: 归纳推理比例（从具体到一般）
- `contrast`: 对比分析比例
- `narrative`: 叙事性比例（按时间/事件顺序）

#### emotion_intensity

情感强度，数值范围 0.0 - 1.0。

- `0.0 - 0.3`: 低（理性、克制）
- `0.3 - 0.7`: 中（平衡）
- `0.7 - 1.0`: 高（强烈情感、主观）

#### vocabulary_level

词汇水平，枚举值。

- `"casual"`: 日常用语，简单直接
- `"professional"`: 专业术语适中，平衡易懂和专业
- `"academic"`: 学术化表达，术语密集

#### structure_preference

结构偏好，枚举值。

- `"linear"`: 线性结构，按顺序展开
- `"hierarchical"`: 层次结构，使用标题、分段、列表等
- `"nested"`: 嵌套结构，多层级嵌套

#### opening_style

开头风格，枚举值。

- `"question"`: 以问题开头
- `"statement"`: 以陈述句开头
- `"context"`: 先提供背景/上下文
- `"direct"`: 直接切入主题

#### closing_style

结尾风格，枚举值。

- `"summary"`: 总结要点
- `"reflection"`: 反思或展望
- `"call_to_action"`: 行动号召
- `"open"`: 开放式结尾，留下思考

### sample_count

已融合的样本数量。用于计算融合权重和置信度。

### last_updated

最后更新时间，ISO 8601 格式。

### confidence

风格画像的置信度，范围 0.0 - 1.0。

- 基于样本数：样本越多，置信度越高
- 基于方差：维度稳定性越高，置信度越高
- 计算公式：`confidence = (1 - exp(-sample_count / 10)) * (1 - variance_penalty)`

## stats.json 结构

```json
{
  "total_samples": 20,
  "dimension_variance": {
    "emotion_intensity": 0.05,
    "sentence_length": 0.02,
    "logic_pattern": 0.03
  },
  "confidence": 0.85
}
```

### total_samples

总样本数（与 profile.json 中的 sample_count 一致）。

### dimension_variance

各维度的方差，用于评估稳定性。

- 数值越小，表示该维度越稳定
- 用于计算置信度

### confidence

当前置信度（与 profile.json 中的 confidence 一致）。

## 版本兼容性

### v1.0（当前版本）

- 7 个风格维度
- 基础融合算法
- 置信度计算

### 未来扩展

如果需要添加新维度：

1. 更新 `style-extractor-prompt.md`，添加新维度定义
2. 更新 `style-fusion-engine.js`，添加融合逻辑
3. 更新此 schema 文档
4. 考虑迁移逻辑（如果旧 profile 没有新维度，使用默认值）

## 数据验证

### 必需检查

1. **分布归一化**：`sentence_length` 和 `logic_pattern` 的所有值总和必须为 1.0（允许 0.99 - 1.01 的误差）
2. **数值范围**：`emotion_intensity` 必须在 0.0 - 1.0 之间
3. **枚举值**：分类类维度必须是指定的枚举值之一
4. **完整性**：所有 7 个维度都必须存在

### 可选检查

1. **置信度合理性**：置信度应该随样本数增长
2. **时间戳有效性**：`last_updated` 应该是有效的 ISO 8601 格式
3. **样本数一致性**：`profile.json` 和 `stats.json` 中的样本数应该一致
