---
name: review
description: 此 Skill 多维度审查实现并落盘 review.md。当 work 阶段交付物完成且用户确认进入 review 时激活，把 Blockers/High 回写到 plan，阶段推进需人工确认。
---

# Review

## Outputs (must write)

- `.workflow/requirements/in-progress/REQ-xxx.review.md`
- 回写：`.workflow/requirements/in-progress/REQ-xxx.plan.md`（Blockers/High）
- 更新：`.workflow/requirements/INDEX.md`

## Instructions

### 0) Experience Index（强制）

执行前，`experience-index` 会自动匹配历史经验，结合本次改动与审查维度提醒历史坑。

### 1) 审查维度（依次执行）

1. 功能
2. 测试覆盖（新增）
3. 安全
4. 性能
5. 架构
6. 可维护性
7. 回归风险

### 2) 测试覆盖审查（强化）

#### 2.1 覆盖完整性

- [ ] plan 中定义的所有可测试行为是否都有对应测试
- [ ] 单元测试是否覆盖正常流程、边界条件、错误处理
- [ ] 集成测试是否覆盖关键交互场景
- [ ] 手工验证步骤是否已执行并记录结果

#### 2.2 测试质量

- [ ] 测试是否隔离（无外部依赖泄漏）
- [ ] 测试是否遵循一行为一测试原则
- [ ] 测试断言是否明确、有意义
- [ ] 测试是否可重复执行

#### 2.3 测试结果

- [ ] 所有测试是否通过
- [ ] 是否有被跳过（skip）的测试需要处理
- [ ] 测试运行时间是否合理

### 3) review.md 模板（分级输出）

```markdown
# <REQ-xxx> Review

## 总结（3-6 行）

## 测试覆盖报告

### 测试执行结果

| 类型 | 通过 | 失败 | 跳过 |
|-----|-----|-----|-----|
| 单元测试 | X | 0 | 0 |
| 集成测试 | X | 0 | 0 |

### 行为覆盖情况

| 行为ID | 行为描述 | 测试状态 |
|-------|---------|---------|
| B1 | ... | ✅ 已覆盖 |
| B2 | ... | ✅ 已覆盖 |
| B3 | ... | ⚠️ 部分覆盖（缺少边界条件） |

### 测试质量评估

- 隔离性：✅ / ⚠️ / ❌
- 可维护性：✅ / ⚠️ / ❌
- 断言质量：✅ / ⚠️ / ❌

## 复利候选（Compounding Candidates）

- [ ] （候选）...

## 多维度审查结果

### 1. 功能审查

- Blockers:
- High:
- Medium:
- Low:

### 2. 测试覆盖审查

- Blockers:
- High:
- Medium:
- Low:

### 3. 安全审查

- Blockers:
- High:
- Medium:
- Low:

### 4. 性能审查

- Blockers:
- High:
- Medium:
- Low:

### 5. 架构审查

- Blockers:
- High:
- Medium:
- Low:

### 6. 可维护性审查

- Blockers:
- High:
- Medium:
- Low:

### 7. 回归风险审查

- Blockers:
- High:
- Medium:
- Low:

## 汇总：分级 TODO

### Blockers

### High

### Medium

### Low
```

### 4) 回写与索引更新（Fail Fast）

- Blockers/High 必须同步回 plan 的 Tasks（避免 TODO 漂移）
- **测试覆盖不足** 视为 High 级别问题
- index：Status = `in-review` 或 `needs-fix`，Current Phase = `review`
