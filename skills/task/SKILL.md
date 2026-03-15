---
name: task
description: 显式调用。工作流步骤：产出 task 文档。
---

# Task

## 意图

产出一份符合模板的 task 文档（需求提纯与放大 + 核心技术方案 + 可判定验收标准），作为工作流起点。能力：读项目文件与代码库、WebSearch/context7 调研、ask-questions 澄清（遵循 ask-questions 契约）。

## 关键约束

- **任务编号**：执行 `node skills/task/scripts/next-task-id.mjs` 获取三位数编号（项目根目录）；标题最多 10 中文字符或 20 英文字符，特殊字符替换为下划线。
- **Fail Fast**：信息汇总前若必要信息缺失（功能目标、目标用户/核心场景等），用 ask-questions 一次性澄清后再写入；无有效选择时重试当前问题。
- **功能需求表（每条 F）**：必填验收标准（可二值判定）、验证方式（unit/integration/e2e/manual/rubric）、边界/异常（至少 1–2 条）、证据形式、优先级。
- **下一步建议**：只要写入了 task 文档，必须在当轮回复末尾输出「**下一步可尝试（选一项）**」+ 四项 A/B/C/D；允许集合：执行 vet skill、执行 plan skill、执行 build skill、补充/修改 task、其他/跳过。用户回复 A/B/C/D 视为选择该选项。

## 完整执行流程（关键步骤不省略）

1. **项目上下文分析（执行前）**
   - 先读取项目技术栈与目录结构（如 `package.json`、`README.md`、核心模块）。
   - 识别本次需求涉及的现有模块、潜在依赖和技术可行性。

2. **任务编号和标题生成**
   - 执行 `node skills/task/scripts/next-task-id.mjs` 获取三位数编号（在项目根目录执行）。
   - 脚本非 0 退出（如达到上限）时，必须提示用户归档旧任务后再继续。
   - 标题从需求提取核心关键词，长度受限（10 中文或 20 英文）；非法字符替换为下划线。

3. **需求提纯**
   - 对模糊需求按 5W1H（What/Why/Who/Where/When/How）澄清。
   - 澄清过程使用 `ask-questions` 协议；无有效选择只重试当前问题。
   - 识别高置信隐含意图并显式确认，避免过度推断。
   - 对需求理解做一次用户确认，形成目标、边界、成功标准。

4. **类型识别与复杂度评估**
   - 类型：前端/后端/全栈/简单功能/其他。
   - 复杂度：简单/中等/复杂。
   - 文档为主、库/SDK 作为特性标签按需补充（不强制每次出现）。

5. **需求放大**
   - 复杂或不确定场景主动做 WebSearch/context7 调研（最佳实践、方案对比、典型坑点）。
   - 简单改动可静默跳过外部调研。
   - 若方案差异主要为偏好取舍，先做品味嗅探；提问前先 memory-retrieve 决定是否可直接采用记忆。

6. **模板选择**
   - 全栈或复杂需求优先 `references/task-doc-template-full.md`。
   - 简单功能或其他优先 `references/task-doc-template-simple.md`。
   - 其他类型按需求内容补齐必要章节，不强行填充无关章节。

7. **信息汇总与 Fail Fast**
   - 写入前执行 Fail Fast：必要信息缺失时必须先问再写，禁止猜测。
   - 重要缺失项（目标用户、核心场景、成功标准、关键约束）一次性列出并澄清。

8. **Task 文档写入**
   - 写入 `.lingxi/tasks/<taskId>.task.<标题>.md`。
   - 每条 F 必须包含：需求描述、实现方案、验收标准（可二值判定）、验证方式、边界/异常、证据形式、优先级。

9. **下一步建议（有产物时必须输出）**
   - 只要本轮写入 task 文档，回复末尾必须输出「下一步可尝试（选一项）」+ A/B/C/D。
   - 选项仅允许：执行 vet skill、执行 plan skill、执行 build skill、补充/修改 task、其他/跳过。
   - 用户仅回复 A/B/C/D 时，视为选定对应项并继续执行。

## 使用场景

- **简单功能**：可静默跳过部分提纯与外部调研，但 Fail Fast 和 F 表完整性不可跳过。
- **复杂全栈**：需完整执行提纯、调研、方案对比、风险识别后再写入。

## 注意事项

1. 记忆写入通过显式调用 `lingxi-memory-write`，本 Skill 不包含写入逻辑。
2. 不引入需求冻结或硬门禁；是否进入 plan/build 由用户决定。
3. 输出遵循静默与高信号原则，避免冗长重复说明。
4. 当**补充/修改 task** 且本次修改来源于 **vet 反馈**（本轮或上一轮 vet 的审查结果）时，除修改正文外，须在 task 文档的「变更记录」小节追加一条记录（格式见 `references/task-changelog-spec.md`），并建议将头部 `版本` 递增；若无该小节则先按 spec 创建再追加。

## 产物与模板

- **产物**：`.lingxi/tasks/001.task.<标题>.md`；命名格式 `三位数.task.<标题>.md`。
- **模板**：全栈/复杂用 `references/task-doc-template-full.md`，简单功能/其他用 `references/task-doc-template-simple.md`；特性标签（文档为主、库/SDK）在元数据中可选写入。

## References

- 文档模板：`references/task-doc-template-*.md`；品味嗅探规则：`references/taste-sniff-rules.md`；变更记录规范：`references/task-changelog-spec.md`
