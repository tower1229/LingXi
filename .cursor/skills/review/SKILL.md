---
name: review
description: 多维度审查实现并落盘 review.md；把 Blockers/High 回写到 plan；阶段推进需人工确认。
---

# Review

## When to Use

- work 阶段交付物完成且用户确认进入 review

## Outputs (must write)

- `.workflow/requirements/in-progress/REQ-xxx.review.md`
- 回写：`.workflow/requirements/in-progress/REQ-xxx.plan.md`（Blockers/High）
- 更新：`.workflow/requirements/INDEX.md`

## Instructions

### 0) Experience Index（强制）

先调用 skill `experience-index`，结合本次改动与审查维度匹配历史坑。

### 1) 审查维度（依次执行）

1. 功能
2. 安全
3. 性能
4. 架构
5. 可维护性
6. 回归风险

### 2) review.md 模板（分级输出）

```markdown
# <REQ-xxx> Review

## 总结（3-6 行）

## 复利候选（Compounding Candidates）
- [ ] （候选）...

## 多维度审查结果
### 1. 功能审查
- Blockers:
- High:
- Medium:
- Low:

...（其他维度同结构）...

## 汇总：分级 TODO
### Blockers
### High
### Medium
### Low
```

### 3) 回写与索引更新（Fail Fast）

- Blockers/High 必须同步回 plan 的 Tasks（避免 TODO 漂移）
- index：Status = `in-review` 或 `needs-fix`，Current Phase = `review`

