---
name: work
description: 此 Skill 按 Plan 执行实现并持续验证。当 plan 生成完成且用户确认开始 work 时激活，回写 plan 的任务勾选与 Worklog，必要时写 checkpoint，阶段推进需人工确认。
---

# Work

## Outputs (must write)

- 更新：`.workflow/requirements/in-progress/REQ-xxx.plan.md`（任务勾选 + Worklog + Status Summary）
- 按需新增：`.workflow/context/session/<REQ-xxx>-checkpoint-*.md`

## Instructions

### 0) Experience Index（强制）

进入代码编写前，`experience-index` 会自动匹配历史经验提醒。

### 1) 状态恢复

- 优先读取 plan 的 Status Summary
- 若存在 checkpoint，加载最新一个继续

### 1.1) 经验候选捕获（即时捕获）

在实现/排查过程中，如发生以下情况，立即输出经验候选（HTML 注释包裹，不干扰对话）：

- 用户/自检纠正了实现方向、接口契约、数据结构、边界处理
- 排查找到 root cause，或放弃/替换某实现方案
- 测试失败暴露新坑点或隐含假设
- 重要文件/模块的关键指针或交互契约被确认/修订

输出格式：

<!-- EXP-CANDIDATE
{
  "stage": "work",
  "trigger": "当发现 root cause 并更换方案",
  "decision": "实现/修复/接口/边界的取舍",
  "alternatives": ["原方案A（放弃，因为...）"],
  "signal": "判断依据/风险信号/失败证据",
  "solution": "新的实现/修复方案",
  "verify": "测试/验证步骤与结果期望",
  "pointers": ["path/to/file 或接口说明"],
  "notes": "可选补充"
}
-->

### 2) 测试执行规范（强化）

#### 2.1 测试执行时机

| 时机 | 动作 | 目的 |
|-----|-----|-----|
| 任务开始前 | 运行现有测试 | 确认基线正常 |
| 每完成一个实现任务后 | 运行相关测试 | 确认实现正确 |
| 进入 review 前 | 运行全部测试 | 确认无回归 |

#### 2.2 测试编写规范

编写单元测试时遵循：

| 原则 | 说明 |
|-----|-----|
| **隔离测试** | Mock 所有外部依赖（API、数据库、文件系统） |
| **一行为一测试** | 每个测试只验证一个行为，便于定位问题 |
| **AAA 模式** | Arrange（准备数据）→ Act（执行操作）→ Assert（验证结果） |
| **基于规格** | 只测试 plan 中定义的行为，不发明新行为 |

**测试代码结构示例**：

```typescript
describe('功能名称', () => {
  it('B1: 行为描述', () => {
    // Arrange - 准备
    const input = ...;
    
    // Act - 执行
    const result = functionUnderTest(input);
    
    // Assert - 断言
    expect(result).toBe(expectedOutput);
  });
});
```

#### 2.3 测试结果记录

在 Worklog 中记录测试执行结果：

```markdown
- YYYY-MM-DD HH:MM: 运行测试
  - 命令: `yarn test src/__tests__/user.test.ts`
  - 结果: 5 passed, 0 failed
  - 覆盖: B1, B2, B3 行为已验证
```

测试失败时记录：

```markdown
- YYYY-MM-DD HH:MM: 测试失败
  - 失败用例: B2 边界条件测试
  - 原因: 空输入未正确处理
  - 修复: 添加空值检查
  - 重跑结果: 5 passed, 0 failed
```

### 3) 边做边验证（Fail Fast）

- 每完成一个"最小步"，立即记录验证方式与结果（PASS/FAIL）
- 核心逻辑优先即时验证，避免最后才发现基础模块有问题
- **测试任务与实现任务交替执行**：实现一个功能后立即编写/运行对应测试

### 4) 长任务续航：checkpoint / compaction（强烈建议）

当满足任一条件时，必须写 checkpoint（并尽量压缩到"最小高信号"）：

- 已完成一个可交付"最小步"（完成一个 task 或子任务）
- 讨论/排查超过 10-15 轮对话，信息开始分散
- 阶段切换前（work → review）
- 需要"换人/换会话/明天继续"

checkpoint 文件路径：

- `.workflow/context/session/<REQ-xxx>-checkpoint-<YYYYMMDD-HHMM>.md`

checkpoint 建议格式（结构化，便于交接）：

```markdown
# <REQ-xxx> Checkpoint - <YYYY-MM-DD HH:MM>

## 状态摘要（Status Summary）
- 阶段：work
- 进度：X/Y
- 当前任务：...
- 阻塞项：...

## 已完成（Done）
- ...

## 测试状态（Test Status）
- 单元测试：X passed / Y total
- 集成测试：X passed / Y total
- 未覆盖行为：B3, B4（待实现）

## 关键决策（Decisions）
- 决策：...
  - 原因：...
  - 影响：...

## 验证记录（Validation）
- [ ] 步骤：...
  - 结果：PASS/FAIL
  - 证据/输出：...

## 指针（Pointers）
- `path/to/file`: 为什么重要

## 下一步（Next）
- ...

## 复利候选（Compounding Candidates）
- ...
```

### 5) 回写规范（必须）

plan.md 中必须持续更新：

- Status Summary（阶段/进度/当前任务/阻塞项/上次更新）
- Worklog（做了什么 + 为什么 + 如何验证 + 结果 + 指针，保持高信号，避免流水账）
- **测试结果**（命令、通过/失败数、覆盖的行为）
- Compounding Candidates（可沉淀点）

### 6) 进入 Review 前检查

在请求进入 review 前，确认：

- [ ] 所有实现任务已完成
- [ ] 所有测试任务已完成
- [ ] 全部测试通过（运行 `yarn test` 或等效命令）
- [ ] 测试覆盖 plan 中定义的所有可测试行为
- [ ] Worklog 中记录了最终测试结果
