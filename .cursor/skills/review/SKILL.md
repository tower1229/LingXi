---
name: review
description: 此 Skill 多维度审查实现并写入 review.md。当 work 阶段交付物完成且用户确认进入 review 时激活，把 Blockers/High 回写到 plan，阶段推进需人工确认。
---

# Review

## Outputs (must write)

- `.workflow/requirements/in-progress/REQ-xxx.review.md`
- 回写：`.workflow/requirements/in-progress/REQ-xxx.plan.md`（Blockers/High）
- 更新：`.workflow/requirements/INDEX.md`

**输出规则（静默成功原则）**：
- 文件写入成功：静默，不输出确认信息（如"已写入 REQ-xxx.review.md"）
- 文件写入失败：输出错误信息
- 索引更新成功：静默，不输出确认信息

## Instructions

### 0) Experience Index（强制）

执行前，`experience-index` 会自动匹配历史经验，结合本次改动与审查维度提醒历史坑。

### 0.1) 经验候选捕获（即时捕获）

审查过程中，如发生以下情况，立即输出经验候选（HTML 注释包裹，不干扰对话）：

- 发现功能缺陷、回归风险、需求偏差，并给出修正意见
- 测试覆盖缺口、测试质量问题（隔离性/断言等）及对应补救
- 安全/性能/架构/可维护性等维度的高风险指针
- 重要决策或文件指针被确认/调整

输出格式：

<!-- EXP-CANDIDATE
{
  "stage": "review",
  "trigger": "当发现测试覆盖缺口 B3 缺失",
  "decision": "修正/补充的建议与优先级",
  "alternatives": ["保持现状（放弃，因为风险...）"],
  "signal": "判断依据/风险信号/证据",
  "solution": "建议的修复/补测/调整",
  "verify": "验证或重测方式",
  "pointers": ["path/to/test 或代码指针"],
  "notes": "可选补充"
}
-->

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

### 3.5) Trade-off Record（取舍记录，可选）

当出现关键取舍时输出（可转写为 EXP-CANDIDATE）：
- **决策点**：正在做什么决策
- **备选方案**：所有考虑的方案（含被拒绝的）
- **拒绝理由**：为什么拒绝某些方案
- **接受的风险**（可选）：选择当前方案时接受的风险

### 4) 回写与索引更新（Fail Fast）

- Blockers/High 必须同步回 plan 的 Tasks（避免 TODO 漂移）
- **测试覆盖不足** 视为 High 级别问题
- index：Status = `in-review` 或 `needs-fix`，Current Phase = `review`

### 5) 阶段完成输出（人工闸门）

阶段完成后输出：
```
审查完成，您可以：

A) 继续修改/补充 审查
B) 进入 archive
C) 回退
D) 退出
```

### 6) 可推进判据检查（review → archive，仅用户选择 B 后执行）

用户选择 B 后，检查以下判据：

| 判据 | 验证方式 |
|------|---------|
| review 文件已写入 | `REQ-xxx.review.md` 存在且非空 |
| Blockers/High 已处理 | Blockers 必须处理，High 可处理或明确拒绝 |
| 审查结论明确 | 包含明确结论（通过/需修复/拒绝） |
| 用户明确确认任务完成 | 用户已确认 |

**检查逻辑**：满足 → 静默推进；不满足 → 输出检查清单，提供选项（强制推进 / 回退 / 补充修改）（仅在异常时展示）
