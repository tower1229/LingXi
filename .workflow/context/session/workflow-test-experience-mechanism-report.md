# Workflow 测试 - 经验沉淀机制排查报告

## 排查时间
2026-01-29

## 排查范围
全面检查经验沉淀和应用相关的所有机制是否正常工作

## 排查结果

### 1. EXP-CANDIDATE 输出机制

**状态**: ❌ 未触发

**原因分析**:
- 在测试过程中，没有输出任何 EXP-CANDIDATE 注释
- 测试任务是创建验证脚本，属于简单功能，过程中没有出现需要沉淀的关键决策、纠正或根因发现
- plan 中虽然有 "Compounding Candidates" 小节（验证脚本可以作为 CI/CD 集成点），但只是作为候选记录，没有以 EXP-CANDIDATE 格式输出

**设计要求**:
- EXP-CANDIDATE 应在以下情况输出：
  - req: 需求澄清过程中的关键决策
  - plan: 计划制定过程中的取舍
  - work: 实现过程中的纠正和根因发现
  - review: 审查过程中发现的问题和风险

**结论**: 机制设计正常，但没有触发条件

### 2. experience-collector (后台 Subagent)

**状态**: ❌ 未触发

**原因分析**:
- experience-collector 设计为后台 subagent (`is_background: true`)
- 触发条件：检测到 EXP-CANDIDATE 注释时自动调用
- 由于没有 EXP-CANDIDATE 输出，所以没有被触发

**验证方法**:
- 检查 `.workflow/context/session/pending-compounding-candidates.json` 是否存在
- 结果：文件不存在，说明没有候选被收集

**结论**: 机制设计正常，但依赖 EXP-CANDIDATE 输出，所以未触发

### 3. experience-depositor (前台 Subagent)

**状态**: ❌ 未触发

**原因分析**:
- experience-depositor 设计为前台 subagent (`is_background: false`)
- 触发条件：用户执行 `/flow 沉淀 ...` 或 `/remember ...` 命令
- 测试过程中没有执行这些命令

**设计位置**:
- `.cursor/agents/experience-depositor.md`
- 需要用户明确确认后才写入经验库

**结论**: 机制设计正常，需要用户主动触发

### 4. experience-index (Skill)

**状态**: ⚠️ 可能触发，但无输出

**原因分析**:
- 根据设计，experience-index 应该在进入 req/audit/plan/work/review/archive 任一阶段前自动激活
- 测试过程中进入了所有阶段，但**没有看到经验匹配的输出**
- 可能原因：
  1. 经验索引为空（`.workflow/context/experience/INDEX.md` 中没有 active 经验）
  2. 确实被触发了，但没有匹配到相关经验
  3. 根据设计规则"禁止没匹配就硬输出'无相关经验'"，所以没有输出

**验证**:
- 检查 `.workflow/context/experience/INDEX.md`
- 结果：索引为空，只有表头，没有任何经验记录

**结论**: 机制设计正常，但没有可匹配的经验，所以无输出（符合设计规则）

### 5. experience-curator (Skill)

**状态**: ❌ 未触发

**原因分析**:
- experience-curator 应该在 experience-depositor 成功写入新经验后自动激活
- 由于没有执行沉淀操作，所以没有被触发

**设计位置**:
- `.cursor/skills/experience-curator/SKILL.md`
- 负责经验的合并/取代治理

**结论**: 机制设计正常，依赖经验写入，所以未触发

## 机制设计验证

### 设计完整性 ✅

所有机制的设计文档都存在且完整：
- ✅ EXP-CANDIDATE 格式定义完整
- ✅ experience-collector subagent 配置完整
- ✅ experience-depositor subagent 配置完整
- ✅ experience-index skill 配置完整
- ✅ experience-curator skill 配置完整

### 触发链路 ✅

触发链路设计清晰：
1. 工作过程中输出 EXP-CANDIDATE → experience-collector 自动收集 → 暂存
2. 用户执行 `/flow 沉淀 ...` → experience-depositor 激活 → 写入经验
3. 写入成功后 → experience-curator 自动触发 → 治理经验
4. 进入阶段前 → experience-index 自动匹配 → 提醒风险

### 文件结构 ✅

相关文件结构完整：
- ✅ `.cursor/agents/experience-collector.md` 存在
- ✅ `.cursor/agents/experience-depositor.md` 存在
- ✅ `.cursor/skills/experience-index/SKILL.md` 存在
- ✅ `.cursor/skills/experience-curator/SKILL.md` 存在
- ✅ `.workflow/context/experience/INDEX.md` 存在（但为空）
- ✅ `.workflow/context/session/` 目录存在

## 总结

### 机制状态
- **设计完整性**: ✅ 完整
- **触发链路**: ✅ 清晰
- **实际触发**: ❌ 未触发（因为缺乏触发条件）

### 未触发的原因
1. **EXP-CANDIDATE 未输出**: 测试任务简单，没有出现需要沉淀的关键决策
2. **用户未执行沉淀命令**: 没有执行 `/flow 沉淀 ...` 命令
3. **经验索引为空**: 没有历史经验可匹配

### 建议

#### 如果要验证经验沉淀机制，需要：

1. **创建有决策点的测试任务**：
   - 选择包含方案选择、技术取舍、错误修复等决策点的任务
   - 在 work 阶段输出 EXP-CANDIDATE 注释

2. **执行沉淀流程**：
   - 在 work/review 阶段后执行 `/flow 沉淀 ...` 命令
   - 验证 experience-depositor 是否正常激活

3. **验证经验索引**：
   - 先沉淀一些经验
   - 然后在新的需求中验证 experience-index 是否能匹配到相关经验

4. **验证经验治理**：
   - 沉淀多条相似经验
   - 验证 experience-curator 是否能正确合并/取代

### 当前测试的局限性

本次测试主要验证了 workflow 的核心流程（req → plan → audit → work → review → archive），但**没有验证经验沉淀机制**，因为：
- 测试任务太简单，没有产生可沉淀的经验
- 没有执行沉淀命令
- 没有验证经验应用（experience-index 匹配）

### 建议的补充测试

如果要全面验证 workflow，建议增加以下测试：
1. **经验沉淀测试**：执行一个包含决策点的任务，验证 EXP-CANDIDATE 输出和收集
2. **经验应用测试**：在有历史经验的情况下，验证 experience-index 是否能正确匹配和提醒
3. **经验治理测试**：沉淀多条经验，验证 experience-curator 的合并/取代功能
