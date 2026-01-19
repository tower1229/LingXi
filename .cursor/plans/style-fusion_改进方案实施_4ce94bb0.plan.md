---
name: Style-Fusion 改进方案实施
overview: 增强 style-fusion skill 的转换规则具体性，并增加三个核心维度（语气、信息密度、交互性），提升风格画像的完整性和可操作性。
todos:
  - id: "1"
    content: 更新 style-extractor-prompt.md，添加三个新维度定义（语气、信息密度、交互性）
    status: in_progress
  - id: "2"
    content: 更新 profile-schema.md，添加新维度的字段说明和验证规则
    status: pending
  - id: "3"
    content: 更新 SKILL.md 的 TypeScript Schema，包含新维度
    status: pending
  - id: "4"
    content: 更新 style-fusion-engine.js 的 normalizeStyleVector，添加新维度归一化
    status: pending
  - id: "5"
    content: 更新 style-fusion-engine.js 的 fuseStyle，添加新维度融合逻辑
    status: pending
  - id: "6"
    content: 更新 style-fusion-engine.js 的 detectChanges，添加新维度检测
    status: pending
  - id: "7"
    content: 更新 style-fusion-engine.js 的 updateVariance，添加新维度方差计算
    status: pending
  - id: "8"
    content: 增强 write-doc SKILL.md 的转换规则，为现有维度添加量化指导和控制方法
    status: pending
  - id: "9"
    content: 在 write-doc SKILL.md 中添加三个新维度的转换规则
    status: pending
  - id: "10"
    content: 更新 style-fusion SKILL.md 文档，反映新维度
    status: pending
isProject: false
---

# Style-Fusion 改进方案实施计划

## 改进目标

1. **增强转换规则的具体性**：为每个维度提供实际控制方法，而非仅描述
2. **增加核心维度**：添加语气、信息密度、交互性三个重要维度

## 实施阶段

### 阶段 1：增加新维度定义

#### 1.1 更新风格提取 Prompt

**文件**：`.cursor/skills/style-fusion/references/style-extractor-prompt.md`

**修改内容**：

- 在维度 7（结尾风格）后添加三个新维度：
  - **维度 8：语气和语调 (tone_and_voice)**
    - `formality`: 0.0-1.0 数值（正式程度）
    - `person_usage`: 分布类（first_person, second_person, third_person, neutral）
    - `voice_preference`: 分类类（active, passive, mixed）
  - **维度 9：信息密度 (information_density)**
    - `density_level`: 0.0-1.0 数值（信息密度）
    - `detail_level`: 分类类（overview, moderate, detailed, comprehensive）
  - **维度 10：交互性 (interactivity)**
    - `interaction_style`: 分布类（question, directive, narrative, dialogue）
    - `supporting_elements`: 分布类（examples, code, diagrams, none）

- 更新输出格式示例，包含所有 10 个维度
- 更新注意事项：将"7 个维度"改为"10 个维度"，更新分布类维度列表

#### 1.2 更新 Schema 文档

**文件**：`.cursor/skills/style-fusion/references/profile-schema.md`

**修改内容**：

- 在 style_vector 中添加三个新维度的字段说明
- 更新版本信息：v1.0 → v2.0，7 个维度 → 10 个维度
- 更新数据验证规则：完整性检查从 7 个维度改为 10 个维度
- 添加新维度的字段说明和枚举值定义

#### 1.3 更新 TypeScript Schema

**文件**：`.cursor/skills/style-fusion/SKILL.md`

**修改内容**：

- 更新风格画像 Schema 的 TypeScript 接口定义，添加三个新维度

### 阶段 2：更新融合引擎

**文件**：`.cursor/skills/style-fusion/scripts/style-fusion-engine.js`

#### 2.1 更新标准化函数

在 `normalizeStyleVector` 函数中添加新维度的归一化逻辑：

- `tone_and_voice.person_usage`：分布类，需要归一化
- `interactivity.interaction_style`：分布类，需要归一化
- `interactivity.supporting_elements`：分布类，需要归一化

#### 2.2 更新融合逻辑

在 `fuseStyle` 函数中添加新维度的融合逻辑：

```javascript
// 融合 tone_and_voice
if (normalizedNew.tone_and_voice) {
  fusedVector.tone_and_voice = {
    formality: fuseNumeric(
      oldVector.tone_and_voice?.formality,
      normalizedNew.tone_and_voice.formality,
      weightOld,
      weightNew
    ),
    person_usage: fuseDistribution(
      oldVector.tone_and_voice?.person_usage,
      normalizedNew.tone_and_voice.person_usage,
      weightOld,
      weightNew
    ),
    voice_preference: fuseCategorical(
      oldVector.tone_and_voice?.voice_preference,
      normalizedNew.tone_and_voice.voice_preference,
      weightOld,
      weightNew
    )
  };
}

// 融合 information_density
if (normalizedNew.information_density) {
  fusedVector.information_density = {
    density_level: fuseNumeric(
      oldVector.information_density?.density_level,
      normalizedNew.information_density.density_level,
      weightOld,
      weightNew
    ),
    detail_level: fuseCategorical(
      oldVector.information_density?.detail_level,
      normalizedNew.information_density.detail_level,
      weightOld,
      weightNew
    )
  };
}

// 融合 interactivity
if (normalizedNew.interactivity) {
  fusedVector.interactivity = {
    interaction_style: fuseDistribution(
      oldVector.interactivity?.interaction_style,
      normalizedNew.interactivity.interaction_style,
      weightOld,
      weightNew
    ),
    supporting_elements: fuseDistribution(
      oldVector.interactivity?.supporting_elements,
      normalizedNew.interactivity.supporting_elements,
      weightOld,
      weightNew
    )
  };
}
```

#### 2.3 更新变更检测

在 `detectChanges` 函数中添加新维度的检测逻辑：

- 添加 `tone_and_voice.person_usage` 到分布类维度检查
- 添加 `tone_and_voice.formality` 到数值类维度检查
- 添加 `information_density.density_level` 到数值类维度检查
- 添加 `interactivity.interaction_style` 和 `interactivity.supporting_elements` 到分布类维度检查
- 添加分类类维度：`tone_and_voice.voice_preference`, `information_density.detail_level`

#### 2.4 更新方差计算

在 `updateVariance` 函数中添加新数值维度的方差计算：

- `tone_and_voice.formality`
- `information_density.density_level`

### 阶段 3：增强转换规则

**文件**：`.cursor/skills/write-doc/SKILL.md`

#### 3.1 增强现有维度转换规则

为每个现有维度添加：

- **量化指导**：将比例转换为具体数量
- **控制方法**：实际写作中的控制技巧
- **结构模板**：可复用的组织结构
- **检查清单**：可操作的验证点

**示例（句式长度）**：

```markdown
### 句式长度分布 (sentence_length)

**量化指导**：
- 短句为主（short > 0.5）：每 10 句话中，≥ 5 句短句（≤ 15 字）
- 中句为主（medium > 0.5）：每 10 句话中，≥ 5 句中句（16-30 字）
- 长句为主（long > 0.5）：每 10 句话中，≥ 5 句长句（> 30 字）
- 混合使用：根据比例分配（如 short:0.3, medium:0.6, long:0.1 → 每 10 句：3 短、6 中、1 长）

**控制方法**：
1. 写作时每写完 3 句短句，写 6 句中句，再写 1 句长句
2. 使用短句表达要点，中句展开说明，长句处理复杂概念
3. 每段结束时检查句子长度分布

**检查清单**：
- [ ] 每 10 句话的句子长度分布是否符合比例？
- [ ] 短句是否用于强调要点？
- [ ] 长句是否用于复杂概念？
```

#### 3.2 添加新维度转换规则

为三个新维度添加完整的转换规则，包括：

- 维度说明
- 量化指导（如适用）
- 控制方法
- 结构模板（如适用）
- 检查清单

**示例（语气和语调）**：

```markdown
### 语气和语调 (tone_and_voice)

**正式程度 (formality)**：
- 低正式（< 0.3）：使用口语化表达，如"可以"、"需要"
- 中等正式（0.3-0.7）：使用专业但易懂的表达
- 高正式（> 0.7）：使用书面化表达，避免口语化

**人称使用 (person_usage)**：
- 第一人称为主（first_person > 0.4）：使用"我"、"我们"表达
- 第二人称为主（second_person > 0.4）：使用"你"、"您"直接对话
- 第三人称为主（third_person > 0.4）：使用"他"、"它"客观描述
- 中性表达为主（neutral > 0.4）：避免人称，使用"可以"、"需要"等

**语态偏好 (voice_preference)**：
- active：使用主动语态（"我们实现了功能"）
- passive：使用被动语态（"功能被实现"）
- mixed：根据语境选择

**控制方法**：
1. 根据正式程度选择词汇（口语化 vs 书面化）
2. 根据人称使用比例调整表达方式
3. 优先使用主动语态，必要时使用被动语态

**检查清单**：
- [ ] 正式程度是否符合目标？
- [ ] 人称使用是否符合比例？
- [ ] 是否优先使用主动语态？
```

### 阶段 4：更新文档

#### 4.1 更新 SKILL.md

**文件**：`.cursor/skills/style-fusion/SKILL.md`

**修改内容**：

- 更新输出格式示例，包含 10 个维度
- 更新工作流程说明，提及新维度
- 更新关键约束，说明新维度的处理方式

#### 4.2 更新评估报告

**文件**：`.cursor/skills/style-fusion/EVALUATION.md`

**修改内容**：

- 标记已完成的改进项
- 更新完整性评分
- 更新易于模仿评分

## 兼容性处理

### 向后兼容

- 旧 profile.json 可能缺少新维度，需要在融合时处理：
  - 如果旧画像缺少新维度，使用默认值或新样本的值
  - 在 `fuseStyle` 函数中添加兼容性检查

### 默认值定义

```javascript
const DEFAULT_TONE_AND_VOICE = {
  formality: 0.5,
  person_usage: { first_person: 0.25, second_person: 0.25, third_person: 0.25, neutral: 0.25 },
  voice_preference: 'active'
};

const DEFAULT_INFORMATION_DENSITY = {
  density_level: 0.5,
  detail_level: 'moderate'
};

const DEFAULT_INTERACTIVITY = {
  interaction_style: { question: 0.25, directive: 0.25, narrative: 0.25, dialogue: 0.25 },
  supporting_elements: { examples: 0.25, code: 0.25, diagrams: 0.25, none: 0.25 }
};
```

## 测试计划

1. **单元测试**：测试新维度的融合逻辑
2. **集成测试**：测试完整的提取-融合-转换流程
3. **兼容性测试**：测试旧 profile.json 的兼容性
4. **转换规则测试**：验证转换规则的具体性和可操作性

## 实施顺序

1. 阶段 1：增加新维度定义（Prompt + Schema）
2. 阶段 2：更新融合引擎（支持新维度）
3. 阶段 3：增强转换规则（write-doc）
4. 阶段 4：更新文档和评估报告

## 预期效果

- **完整性**：从 7 个维度增加到 10 个维度，覆盖语气、信息密度、交互性
- **可操作性**：转换规则提供具体控制方法，而非仅描述
- **实用性**：风格画像能更准确地指导文档写作