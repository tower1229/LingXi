---
name: memory-importer
description: 从团队 memory-pack（独立 Git 仓库）导入记忆到当前项目，提供 dry-run 报告、冲突检测与可控的覆盖策略，并更新 memory/INDEX.md。
---

# Memory Importer

## 目标

稳定把团队维护的 memory-pack 导入到当前项目，使其立即参与每轮检索注入，同时避免覆盖项目/个人级记忆导致污染。

## 输入

- 用户命令：`/memory-import <packPath> [options]`
- 当前项目 memory：`.cursor/.lingxi/memory/notes/`

## 默认策略（稳定优先）

- 默认 **dry-run**：先生成导入报告，不写入。
- 默认 `--strategy safe`：只新增，不覆盖现有同 Id 的 note（冲突全部列出）。

可选策略：

- `--strategy replaceTeam`：允许在满足条件时覆盖（仍需用户确认）。条件默认包含：
  - 目标 note 是 `Audience=team`，或目标 `Source=<packName>@<version>`（同一 pack 导入的可更新）
  - pack 的 `Strength` 不低于目标 note

## 执行流程

1. 解析 packPath 与 options（支持 `--strategy`、`--apply`、`--report`）。
2. 读取 `<packPath>/memory/notes/*.md`，以 `Id` 为主键对齐目标：
   - 不存在 → `add`
   - 内容完全一致 → `skip`
   - 存在但不同 → `conflict` 或 `replace`（由策略决定）
3. 输出导入报告（最小高信号）：
   - added / replaced / conflicts / skipped
   - 冲突列表（每条给出原因与建议下一步）
4. 若用户明确要求 `--apply`（或在对话中确认应用变更）：
   - 执行写入（新增/覆盖）
   - 为导入的 note 写入/更新 `Source=<packName>@<version>`（若 pack.json 可用）
   - 运行 `node scripts/validate-memory-index.js --update` 更新项目索引

## 输出与门控

- dry-run：必须输出报告（因为这是用户决策输入）。
- apply：写入成功尽量简洁，只输出摘要；若存在冲突，输出下一步选项。

