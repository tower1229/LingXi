---
name: reviewer-doc-consistency
description: 显式调用。由 review skill 调用，用于审查代码与 task、plan、testcase 文档的一致性。
---

# Reviewer Doc Consistency

由 review skill 显式调用，可访问其上下文（task、变更代码列表、plan/testcase 等）。能力：读 task/plan/testcase 与变更代码；语义搜索与逐文件对比。

## Instructions

从 review skill 的上下文中获取：
- task 文档路径
- 变更代码文件列表
- plan/testcase 文档路径（如存在）

### 2. 文档一致性检查

- 检查代码与 task 文档的一致性（功能是否匹配）
- 检查接口文档是否与实现一致（如涉及 API）
- 检查架构文档是否与代码结构一致（如涉及架构变更）
- 检查 plan/testcase 文档是否与实现一致

### 3. 识别不一致问题

- 代码实现与任务文档不符
- 接口文档与实现不一致
- 架构文档与代码结构不一致

### 4. 输出审查结果

必须遵循 **review 的 references/reviewer-output-spec.md** 统一输出结构：

- **维度**：`doc-consistency`；**状态**：`completed` | `partial` | `degraded`（降级时在「说明」中写原因）。
- 按 **Blockers / High / Medium / Low** 四级列出问题，每项含：描述、位置、建议修复（表格形式）；无则写「无」或省略该级表格。
- 结尾 **小结**：共 X 项（各级数量）、结论（通过/需修复）。
- **可选（机器可读）**：在 Markdown 前输出 `<!-- REVIEWER_JSON` + JSON（含 dimension、status、issues[]、summary） + `-->`，便于脚本聚合与审计；格式见 spec 第 4 节。

- 问题清单（按优先级分级：Blockers/High/Medium/Low）
- 具体问题描述和位置
- 建议修复方向

### 5. 输出与静默

遵循 [workflow-output-principles](plugin/skills/about-lingxi/references/workflow-output-principles.md)；不干扰主流程，返回**符合 reviewer-output-spec 的结构化审查结果**。

### 6. 降级处理

- **文档不存在**：
  - 标记为需要创建文档
  - 输出文档创建建议（基于代码实现）
- **文档格式无法解析**：
  - 标记为需要文档格式修复
  - 输出文档格式问题清单
