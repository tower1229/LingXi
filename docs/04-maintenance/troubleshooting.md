# 故障排查

## 概述

本文档提供常见问题的排查方法和解决方案。

## 常见问题

### 索引不一致

**症状**：
- INDEX.md 中的状态与实际文件状态不一致
- 文件存在但 INDEX 中没有记录
- INDEX 中有记录但文件不存在

**排查**：
1. 检查 `.workflow/requirements/INDEX.md` 的表头格式
2. 检查文件是否存在（in-progress/ 或 completed/）
3. 使用 `index-manager` Skill 进行一致性检查

**解决**：
- 手动修复 INDEX.md
- 使用 `index-manager` 的 Fail Fast 检查
- 重新运行 `/flow REQ-xxx` 让系统自动修复

### 经验匹配失败

**症状**：
- `experience-index` 没有匹配到相关经验
- 匹配到的经验不相关

**排查**：
1. 检查 `.workflow/context/experience/INDEX.md` 中是否有 active 经验
2. 检查经验的 Trigger 字段是否包含相关关键词
3. 检查经验的 Status 是否为 `active`（不是 `deprecated`）

**解决**：
- 更新经验的 Trigger 字段，添加更多关键词
- 检查 Surface signal 和 Hidden risk 字段
- 确保经验 Status 为 `active`

### 阶段推进异常

**症状**：
- 阶段无法推进
- 阶段推进后状态不正确

**排查**：
1. 检查 INDEX.md 中的 `Current Phase` 和 `Status`
2. 检查 plan.md 中的 `Status Summary`
3. 检查是否有 Blockers

**解决**：
- 手动更新 INDEX.md 的状态
- 检查并解决 Blockers
- 重新运行 `/flow REQ-xxx`

### 经验沉淀失败

**症状**：
- `/flow 沉淀` 命令无响应
- 候选没有写入经验库

**排查**：
1. 检查 `.workflow/context/session/pending-compounding-candidates.json` 是否存在
2. 检查文件格式是否正确
3. 检查 experience-depositor 是否正常触发

**解决**：
- 检查暂存文件格式
- 重新运行 `/flow 沉淀`
- 检查 experience-depositor 的配置

### Subagent 未触发

**症状**：
- experience-collector 没有收集 EXP-CANDIDATE
- experience-depositor 没有响应

**排查**：
1. 检查 `.cursor/agents/` 中的配置文件
2. 检查 YAML frontmatter 是否正确
3. 检查 `is_background` 配置

**解决**：
- 检查 subagent 配置文件格式
- 确保 YAML frontmatter 正确
- 检查 Cursor Nightly 版本是否支持 Subagents

## 调试技巧

### 查看暂存文件

**位置**：`.workflow/context/session/pending-compounding-candidates.json`

**内容**：
- `asked`：是否已提醒用户
- `candidates`：候选列表

**用途**：
- 检查候选是否正确收集
- 检查候选格式是否正确

### 检查索引状态

**Requirements Index**：`.workflow/requirements/INDEX.md`
- 检查 Status 和 Current Phase
- 检查 Links 是否正确

**Experience Index**：`.workflow/context/experience/INDEX.md`
- 检查经验的 Status（active/deprecated）
- 检查谱系关系（Replaces/ReplacedBy）

### 查看 Hook 日志

**位置**：系统临时目录（由 `audit-after-shell-execution` hook 记录）

**内容**：
- command：执行的命令
- duration：执行时间
- output_head：输出头部

**用途**：
- 检查命令执行情况
- 排查性能问题

## 恢复机制

### 回滚治理操作

**场景**：experience-curator 的治理操作需要回滚

**方法**：
```bash
cp .workflow/context/experience/INDEX.md.bak .workflow/context/experience/INDEX.md
```

**注意**：
- 只能回滚 INDEX 的变更
- 已 deprecated 的经验文件不会被恢复（但文件仍然存在）

### 恢复误删经验

**场景**：经验文件被误删

**方法**：
1. 检查 git 历史（如果使用版本控制）
2. 检查备份文件（如果有）
3. 从 INDEX.md 中恢复信息，重新创建经验文件

### 修复索引不一致

**场景**：INDEX.md 与文件状态不一致

**方法**：
1. 使用 `index-manager` Skill 进行一致性检查
2. 手动修复 INDEX.md
3. 重新运行 `/flow REQ-xxx` 让系统自动修复

## 预防措施

### 定期备份

- 定期备份 `.workflow/` 目录
- 使用版本控制（git）管理 `.workflow/` 目录

### 一致性检查

- 定期运行 `index-manager` 的一致性检查
- 在关键操作前进行 Fail Fast 检查

### 文档维护

- 保持文档与代码同步
- 及时更新决策记录

## 获取帮助

如果问题无法解决：

1. **查看文档**：
   - [架构概览](../01-concepts/architecture-overview.md)
   - [工作流生命周期设计](../02-design/workflow-lifecycle.md)
   - [数据模型定义](../02-design/data-models.md)

2. **检查源码**：
   - 相关 Skill：`.cursor/skills/`
   - 相关 Hook：`.cursor/hooks/`
   - 相关 Subagent：`.cursor/agents/`

3. **查看日志**：
   - Hook 执行日志
   - Cursor 控制台输出

## 参考

- [扩展指南](./extension-guide.md)
- [最佳实践](./best-practices.md)
- [数据模型定义](../02-design/data-models.md)
