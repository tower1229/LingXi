---
name: memory-exporter
description: 将项目内团队级记忆导出为 memory-pack（独立 Git 仓库），支持筛选与 dry-run，并在 pack 内生成/更新 memory/INDEX.md。
---

# Memory Exporter

## 目标

稳定把“团队级可跨项目复用”的记忆从当前项目导出到一个独立 **memory-pack** 仓库目录，以便团队分发与复用。

## 输入

- 用户命令：`/memory-export <packPath> [options]`
- 当前项目：`.cursor/.lingxi/memory/notes/` 与 `.cursor/.lingxi/memory/INDEX.md`

## 默认筛选规则（稳定可复用）

- `Audience=team`
- `Portability=cross-project`
- `Strength >= validated`
- `Status=active`

## 执行流程

1. 解析 `packPath` 与 options（支持 `--min-strength`、`--tags`、`--dry-run`）。
2. 扫描 `.cursor/.lingxi/memory/notes/`，按默认/用户规则筛选：
   - 缺少 `Id` 的条目跳过并在报告中提示。
3. 导出到 pack 目录：
   - 目标目录：`<packPath>/memory/notes/`
   - 文件名统一为：`<Id>.md`（稳定主键，跨项目幂等）
4. 生成/更新 pack 的索引：
   - 运行 `node scripts/validate-memory-index.js --update --root "<packPath>/memory"`
5. 输出导出报告（最小高信号）：
   - 选中条目数量、目标路径
   - 若 `--dry-run`：仅输出计划，不写文件
   - 若存在警告：逐条列出（如缺少 Id/缺少必要 Meta 字段）

## 失败处理（Fail Fast）

- packPath 不存在且无法创建：输出错误与解决方案（检查路径/权限）。
- `node` 不可用：优先提示用户安装 Node.js；若用户明确要求，可改为由 Agent 直接复制文件并用脚本逻辑生成 INDEX（但稳定性更依赖环境）。

