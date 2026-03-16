# Reviewer 统一输出规范（SSoT）

本规范是 reviewer-doc-consistency、reviewer-security、reviewer-performance、reviewer-e2e 四个子维度审查的**统一输出结构** SSoT。review 主流程将各 reviewer 的产出按本规范聚合进 `review-report-template.md` 的「多维度审查结果」对应小节。

## 1. 目的

- 统一各 reviewer 的返回格式，便于 review 主流程直接插入报告。
- 每条问题可定位、可追溯、可修复（含位置与建议）。
- 人类可读（Markdown）为主，同时提供机器可读片段（JSON）便于脚本聚合与审计统计。

## 2. 通用结构（doc-consistency / security / performance）

每个 reviewer 返回一块 **Markdown**，结构固定如下。

### 2.1 Markdown 模板

```markdown
## <维度名称>审查结果

**维度**：<doc-consistency | security | performance>
**状态**：<completed | partial | degraded>
**说明**：<可选，如降级原因、范围说明>

### Blockers
<!-- 无则写「无」或省略本表 -->

| # | 描述 | 位置 | 建议修复 |
|---|------|------|----------|
| 1 | ... | 文件:行 或 模块/章节 | ... |

### High
...

### Medium
...

### Low
...

### 小结
- 共 X 项（Blockers: a, High: b, Medium: c, Low: d）
- 结论：<通过 / 需修复>
```

### 2.2 单条问题约定

| 字段 | 说明 |
|------|------|
| **描述** | 一句话问题摘要；可再带 1–2 句细节。 |
| **位置** | 能定位即可。如：`src/auth/login.ts:42`、`task 文档 §2.1`、`plan 文档 任务 T2`、`API POST /api/users`。 |
| **建议修复** | 可执行的一两句话；无则写「-」。 |

### 2.3 状态

| 值 | 含义 |
|----|------|
| `completed` | 正常完成该维度审查。 |
| `partial` | 只完成部分（如 E2E 只跑了一部分用例）；在「说明」中简述原因。 |
| `degraded` | 降级（如工具不可用、文档无法解析）；在「说明」中写降级原因与替代动作（如「已输出手动审查清单」）。 |

无问题时：Blockers/High/Medium/Low 可写「无」或省略表格，小结写「共 0 项，结论：通过」。

## 3. E2E 维度扩展（reviewer-e2e）

E2E 在通用结构基础上增加「场景执行结果」表与可选「失败场景详情」。

### 3.1 场景执行结果表（必须）

```markdown
## E2E 测试审查结果

**维度**：e2e
**状态**：<completed | partial | degraded>
**说明**：<可选>

### 场景执行结果

| 测试场景 | 状态 | 备注 |
|----------|------|------|
| E2E-001: 用户登录流程 | ✅ 通过 | - |
| E2E-002: 数据提交流程 | ❌ 失败 | 步骤 3 点击提交按钮无响应 |
```

状态取值：`✅ 通过` / `❌ 失败` / `⏭️ 跳过`。

### 3.2 Blockers / High / Medium / Low

与通用维度相同表格格式；E2E 特有的功能缺陷、交互问题等按优先级填入。

### 3.3 失败场景详情（可选）

对每个「失败」场景可补充：

```markdown
### 失败场景详情

- **场景**：E2E-002
- **失败步骤**：步骤 3
- **预期 vs 实际**：...
- **截图/控制台**：如有
```

## 4. 机器可读格式（可选）

为便于脚本聚合、审计统计或自动化，各 reviewer 在返回的 Markdown **之前**可输出一段 JSON，用 HTML 注释包裹，单行或多行均可。主流程或脚本可解析 `<!-- REVIEWER_JSON` 与 `-->` 之间的内容。

### 4.1 通用维度 JSON 结构

```json
<!-- REVIEWER_JSON
{
  "dimension": "doc-consistency | security | performance",
  "status": "completed | partial | degraded",
  "status_note": "可选，说明或降级原因",
  "issues": [
    {
      "severity": "blocker | high | medium | low",
      "description": "问题描述",
      "location": "文件:行 或 模块/章节",
      "suggestion": "建议修复，无则空字符串"
    }
  ],
  "summary": {
    "total": 4,
    "blockers": 1,
    "high": 1,
    "medium": 1,
    "low": 1,
    "conclusion": "通过 | 需修复"
  }
}
-->
```

### 4.2 E2E 维度 JSON 结构

在通用结构基础上增加 `scenarios` 数组：

```json
<!-- REVIEWER_JSON
{
  "dimension": "e2e",
  "status": "completed | partial | degraded",
  "status_note": "可选",
  "scenarios": [
    {
      "id": "E2E-001",
      "name": "用户登录流程",
      "status": "passed | failed | skipped",
      "note": "可选备注"
    }
  ],
  "issues": [ ... ],
  "summary": { ... }
}
-->
```

`scenarios[].status` 与 Markdown 表对应：`passed` ↔ ✅ 通过，`failed` ↔ ❌ 失败，`skipped` ↔ ⏭️ 跳过。

### 4.3 解析约定

- 仅解析首次出现的 `<!-- REVIEWER_JSON` … `-->` 块；块内为合法 JSON，去掉首尾空白后 `JSON.parse`。
- 若 JSON 解析失败或缺失，以 Markdown 内容为准，不阻断主流程。

## 5. 与报告模板的对应关系

| 维度 | report 模板中的小节 |
|------|---------------------|
| doc-consistency | ### 8. 文档一致性审查 |
| security | ### 3. 安全审查 |
| performance | ### 4. 性能审查 |
| e2e | ### 9. E2E 测试审查 + 「E2E 测试执行结果」表 |

review 主流程：按启用维度调用对应 reviewer，将返回的 **Markdown 整块**插入上述小节（E2E 的「场景执行结果」表放入模板中的「E2E 测试执行结果」表位置）。若存在 `REVIEWER_JSON` 块，可先解析用于汇总统计或审计，再写入报告时仍以 Markdown 为准。

## 6. 示例

### 6.1 安全审查（有问题 + 机器可读）

```markdown
<!-- REVIEWER_JSON
{"dimension":"security","status":"completed","status_note":"","issues":[{"severity":"high","description":"登录接口未对密码做服务端长度校验","location":"src/auth/login.ts:42","suggestion":"在 handler 内增加长度与字符集校验"}],"summary":{"total":1,"blockers":0,"high":1,"medium":0,"low":0,"conclusion":"需修复"}}
-->

## 安全审查结果

**维度**：security
**状态**：completed
**说明**：

### Blockers
无

### High
| # | 描述 | 位置 | 建议修复 |
|---|------|------|----------|
| 1 | 登录接口未对密码做服务端长度校验 | src/auth/login.ts:42 | 在 handler 内增加长度与字符集校验 |

### Medium
无

### Low
无

### 小结
- 共 1 项（Blockers: 0, High: 1, Medium: 0, Low: 0）
- 结论：需修复
```

### 6.2 E2E 审查（含场景表 + 机器可读）

```markdown
<!-- REVIEWER_JSON
{"dimension":"e2e","status":"completed","scenarios":[{"id":"E2E-001","name":"用户登录流程","status":"passed","note":""},{"id":"E2E-002","name":"数据提交流程","status":"failed","note":"步骤 3 点击提交按钮无响应"}],"issues":[{"severity":"high","description":"E2E-002 步骤 3 点击提交按钮无响应","location":"E2E-002","suggestion":"检查提交按钮绑定与网络请求"}],"summary":{"total":1,"blockers":0,"high":1,"medium":0,"low":0,"conclusion":"需修复"}}
-->

## E2E 测试审查结果

**维度**：e2e
**状态**：completed

### 场景执行结果
| 测试场景 | 状态 | 备注 |
|----------|------|------|
| E2E-001: 用户登录流程 | ✅ 通过 | - |
| E2E-002: 数据提交流程 | ❌ 失败 | 步骤 3 点击提交按钮无响应 |

### High
| # | 描述 | 位置 | 建议修复 |
|---|------|------|----------|
| 1 | E2E-002 步骤 3 点击提交按钮无响应 | E2E-002 | 检查提交按钮绑定与网络请求 |

### 小结
- 共 1 项（Blockers: 0, High: 1, Medium: 0, Low: 0）
- 结论：需修复
```
