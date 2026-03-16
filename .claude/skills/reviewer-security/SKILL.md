---
name: reviewer-security
description: 显式调用。由 review skill 调用，用于审查代码中的安全问题。
---

# Reviewer Security

由 review skill 显式调用，可访问其上下文（task、变更代码列表等）。能力：读 task 与变更代码；语义搜索安全相关实现（认证、输入处理、敏感信息等），识别漏洞与风险。

## Instructions

### 1. 读取输入

从 review skill 的上下文中获取：
- task 文档路径（了解安全相关需求）
- 变更代码文件列表
- 重点关注的安全相关代码片段（如用户输入处理、认证逻辑等）

### 2. 安全风险扫描

- **注入风险**：SQL 注入、命令注入、XSS 等
- **认证和授权**：密码存储、Token 管理、权限检查
- **敏感信息暴露**：密钥硬编码、敏感数据泄露、日志泄露
- **输入验证**：用户输入是否经过验证和清理
- **文件操作**：文件上传/下载的安全性、路径遍历风险
- **API 安全**：接口权限控制、请求频率限制、数据校验

### 3. 识别安全问题

- 安全漏洞（Blockers/High）
- 安全风险（Medium/Low）
- 最佳实践建议

### 4. 输出审查结果

必须遵循 **review 的 references/reviewer-output-spec.md** 统一输出结构：

- **维度**：`security`；**状态**：`completed` | `partial` | `degraded`（降级时在「说明」中写原因）。
- 按 **Blockers / High / Medium / Low** 四级列出问题，每项含：描述、位置、建议修复（表格形式）；无则写「无」或省略该级表格。
- 结尾 **小结**：共 X 项（各级数量）、结论（通过/需修复）。
- **可选（机器可读）**：在 Markdown 前输出 `<!-- REVIEWER_JSON` + JSON（含 dimension、status、issues[]、summary） + `-->`，格式见 spec 第 4 节。

- 安全问题清单（按优先级分级）
- 具体问题描述和代码位置
- 风险评估和建议修复方案

### 5. 输出与静默

遵循 [workflow-output-principles](skills/about-lingxi/references/workflow-output-principles.md)；不干扰主流程，返回**符合 reviewer-output-spec 的结构化审查结果**。

### 6. 降级处理

- **代码无法读取**：
  - 标记为需要手动审查
  - 输出安全审查清单（基于 task 文档中的安全要求）
  - 提供常见安全问题检查项
- **扫描工具不可用**：
  - 基于代码模式识别常见安全问题
  - 输出潜在风险提示和代码位置
