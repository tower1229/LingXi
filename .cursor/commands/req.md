# /req - Requirement 文档生成/更新

## 命令用途

将一个模糊需求变成**可执行、可验收**的 Requirement 文档，并维护 `ai/requirements/INDEX.md` 索引。

## 依赖的技能型 rules（Skill）

- `.cursor/rules/skill-index-manager.mdc`
- `.cursor/rules/skill-context-engineering.mdc`

## 使用方式

```
/req <需求描述或标题> [可选：REQ-xxx]
```

示例：

```
/req 用户登录与会话管理
/req 新增导出报表功能 REQ-003
```

---

## 产物（必须落盘）

- `ai/requirements/in-progress/<REQ-xxx>.md`
- `ai/requirements/INDEX.md`

## 执行要点（入口 + 路由）

- **ID 生成**：若未指定 `REQ-xxx`，读取 `ai/requirements/INDEX.md` 生成下一个连续 ID
- **澄清问题**：最多 5 个，优先问“范围/验收/依赖/风险”，信息足够则不问
- **落盘结构**：创建/更新 `ai/requirements/in-progress/<REQ-xxx>.md`，使用以下结构（保持简洁、可验收；不写实现方案）：

```markdown
# <REQ-xxx>: <Title>

## 背景

## 目标（Goals）

- [ ] ...

## 非目标（Non-goals）

- ...

## 范围与边界（Scope）

- **包含**：
- **不包含**：

## 需求细化

### 用户故事 / 用例

- 作为...我想...以便...

### 关键业务规则

- ...

## 验收标准（Acceptance Criteria）

- [ ] ...

## 依赖与风险

- **依赖**：
- **风险**：

## 待确认问题

- [ ] ...
```

- **验收标准约束**：必须可验证（允许测试/脚本/手工步骤），禁止“体验良好”这类主观描述
- **索引更新**：以 `skill-index-manager.mdc` 为准（Status = `in-progress`，Links 至少包含 requirement 路径）

---

## 输出要求

- 必须实际写入/更新文件（不是只在聊天里输出）
- 最后用 3-6 行简短说明：生成了哪些文件、接下来建议执行什么命令（通常是 `/plan REQ-xxx`）
