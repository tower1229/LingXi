---
name: workflow-to-lingxi-migration
overview: 将 `.workflow` 目录移动到 `.cursor/.lingxi`，更新所有相关路径引用和安装脚本，减少对项目根目录的侵入。
todos:
  - id: backup-and-prepare
    content: 阶段1：创建备份和验证当前状态 - 备份 .workflow 目录，运行验证脚本确认功能正常
    status: completed
  - id: move-directory
    content: 阶段2：移动目录 - 将 .workflow 移动到 .cursor/.lingxi
    status: completed
  - id: update-commands
    content: 阶段3.1：更新 Commands 文件 - 批量替换所有 .workflow 路径引用为 .cursor/.lingxi（7个文件）
    status: completed
  - id: update-skills
    content: 阶段3.2：更新 Skills 文件 - 批量替换所有 .workflow 路径引用为 .cursor/.lingxi（约15+个文件）
    status: completed
  - id: update-scripts
    content: 阶段3.3：更新 Scripts - 修改 validate-experience-index.js 中的硬编码路径
    status: completed
  - id: update-docs
    content: 阶段3.4：更新文档文件 - 更新测试用例和PRD文档中的路径引用
    status: completed
  - id: update-gitignore
    content: 阶段3.5：更新 .gitignore - 更新 .workflow 相关条目为 .cursor/.lingxi
    status: completed
  - id: update-install-manifest
    content: 阶段4.1：更新 install-manifest.json - 更新 workflowDirectories、workflowIndexFiles、workflowTemplateFiles、gitignoreEntries
    status: completed
  - id: update-bash-script
    content: 阶段4.2：更新 bash.sh - 更新目录检查、创建逻辑、gitignore 更新和输出信息
    status: completed
  - id: update-powershell-script
    content: 阶段4.3：更新 powershell.ps1 - 更新目录检查、创建逻辑、gitignore 更新和输出信息
    status: completed
  - id: fix-relative-paths
    content: 阶段5：修复相对路径 - 检查并修复 .cursor/.lingxi 目录内的相对路径引用（如 business-context-template.md）
    status: completed
  - id: test-functionality
    content: 阶段6.1：功能测试 - 运行所有命令测试（/req, /plan, /build, /review, /remember），验证经验索引脚本
    status: pending
  - id: test-install-scripts
    content: 阶段6.2：安装脚本测试 - 在临时目录测试 bash.sh 和 powershell.ps1，验证新安装项目使用新路径
    status: pending
  - id: verify-path-completeness
    content: 阶段6.3：路径完整性检查 - 使用 grep 检查是否还有遗漏的 .workflow 引用
    status: completed
  - id: update-readme
    content: 阶段7：文档更新 - 更新 README.md 和其他文档中的路径说明
    status: completed
isProject: false
---

# .workflow 到 .cursor/.lingxi 迁移计划

## 目标

将 `.workflow` 目录移动到 `.cursor/.lingxi`，减少对项目根目录的侵入，同时保持所有功能正常工作。

## 影响范围分析

### 1. 目录结构变更

- **源路径**：`.workflow/`
- **目标路径**：`.cursor/.lingxi/`
- **子目录结构保持不变**：
  - `requirements/` → `.cursor/.lingxi/requirements/`
  - `context/` → `.cursor/.lingxi/context/`
  - `workspace/` → `.cursor/.lingxi/workspace/`

### 2. 代码路径引用（约 200+ 处）

#### 2.1 Commands 文件

- [`.cursor/commands/req.md`](.cursor/commands/req.md) - 引用 `.workflow/requirements/`
- [`.cursor/commands/plan.md`](.cursor/commands/plan.md) - 引用 `.workflow/requirements/`
- [`.cursor/commands/build.md`](.cursor/commands/build.md) - 引用 `.workflow/requirements/`
- [`.cursor/commands/review.md`](.cursor/commands/review.md) - 引用 `.workflow/requirements/`
- [`.cursor/commands/init.md`](.cursor/commands/init.md) - 引用 `.workflow/context/`
- [`.cursor/commands/remember.md`](.cursor/commands/remember.md) - 引用 `.workflow/context/experience/`
- [`.cursor/commands/req-review.md`](.cursor/commands/req-review.md) - 引用 `.workflow/requirements/`

#### 2.2 Skills 文件

- [`.cursor/skills/req-executor/SKILL.md`](.cursor/skills/req-executor/SKILL.md)
- [`.cursor/skills/plan-executor/SKILL.md`](.cursor/skills/plan-executor/SKILL.md)
- [`.cursor/skills/build-executor/SKILL.md`](.cursor/skills/build-executor/SKILL.md)
- [`.cursor/skills/review-executor/SKILL.md`](.cursor/skills/review-executor/SKILL.md)
- [`.cursor/skills/experience-capture/SKILL.md`](.cursor/skills/experience-capture/SKILL.md)
- [`.cursor/skills/experience-index/SKILL.md`](.cursor/skills/experience-index/SKILL.md)
- [`.cursor/skills/experience-depositor/SKILL.md`](.cursor/skills/experience-depositor/SKILL.md)
- [`.cursor/skills/experience-curator/references/experience-governance.md`](.cursor/skills/experience-curator/references/experience-governance.md)
- [`.cursor/skills/service-loader/SKILL.md`](.cursor/skills/service-loader/SKILL.md)

#### 2.3 Scripts

- [`scripts/validate-experience-index.js`](scripts/validate-experience-index.js) - 硬编码路径 `.workflow/context/experience`

#### 2.4 文档文件

- [`docs/testcase/灵犀功能测试用例.md`](docs/testcase/灵犀功能测试用例.md)
- [`docs/prd/lingxi-2.0-refactor.md`](docs/prd/lingxi-2.0-refactor.md)
- [`.workflow/context/business/references/business-context-template.md`](.workflow/context/business/references/business-context-template.md) - 相对路径引用

#### 2.5 配置文件

- [`.gitignore`](.gitignore) - 包含 `.workflow/workspace/` 和 `.workflow/context/session/`

### 3. 安装脚本

#### 3.1 Bash 脚本

- [`install/bash.sh`](install/bash.sh)
  - 第 236-239 行：检查 `.workflow` 目录存在性
  - 第 414-421 行：创建 `.workflow` 目录结构
  - 第 424-432 行：下载索引文件
  - 第 435-447 行：下载模板文件
  - 第 479-488 行：创建 `.gitignore`（包含 `.workflow` 路径）
  - 第 500 行：输出信息中提及 `.workflow/`

#### 3.2 PowerShell 脚本

- [`install/powershell.ps1`](install/powershell.ps1)
  - 第 106 行：检查 `.workflow` 目录存在性
  - 第 112-114 行：警告信息
  - 第 228-233 行：创建 `.workflow` 目录结构
  - 第 236-244 行：下载索引文件
  - 第 247-259 行：下载模板文件
  - 第 286-297 行：创建 `.gitignore`（包含 `.workflow` 路径）
  - 第 308 行：输出信息中提及 `.workflow/`

#### 3.3 安装清单

- [`install/install-manifest.json`](install/install-manifest.json)
  - `workflowDirectories` 数组：所有 `.workflow/` 开头的路径
  - `workflowIndexFiles` 数组：索引文件路径
  - `workflowTemplateFiles` 数组：模板文件路径
  - `gitignoreEntries` 数组：`.workflow/` 相关条目

## 实施步骤

### 阶段 1：准备和备份

1. **创建备份**

   - 备份当前 `.workflow` 目录到 `.workflow.backup`
   - 创建 Git 提交点（便于回滚）

2. **验证当前状态**

   - 运行 `scripts/validate-experience-index.js` 验证索引完整性
   - 确认所有功能正常工作

### 阶段 2：目录移动

1. **移动目录结构**
   ```bash
   mv .workflow .cursor/.lingxi
   ```

2. **验证目录结构**

   - 确认所有子目录和文件已正确移动
   - 检查文件权限和所有权

### 阶段 3：代码路径更新

#### 3.1 批量替换策略

使用全局搜索替换（注意区分大小写和上下文）：

**替换规则**：

- `.workflow/` → `.cursor/.lingxi/`
- `.workflow`（作为独立词）→ `.cursor/.lingxi`（需要上下文判断）

**需要特殊处理的场景**：

1. **相对路径引用**（在 `.workflow` 目录内的文件中）：

   - 例如：`business-context-template.md` 中的 `../../../../.cursor/skills/`
   - 需要重新计算相对路径：`../../../../../.cursor/skills/`

2. **脚本中的硬编码路径**：

   - `scripts/validate-experience-index.js` 第 50 行：
     ```javascript
     const EXPERIENCE_DIR = path.join(process.cwd(), '.workflow/context/experience');
     ```


改为：

     ```javascript
     const EXPERIENCE_DIR = path.join(process.cwd(), '.cursor/.lingxi/context/experience');
     ```

#### 3.2 文件更新清单

**Commands（7 个文件）**：

- [`.cursor/commands/req.md`](.cursor/commands/req.md)
- [`.cursor/commands/plan.md`](.cursor/commands/plan.md)
- [`.cursor/commands/build.md`](.cursor/commands/build.md)
- [`.cursor/commands/review.md`](.cursor/commands/review.md)
- [`.cursor/commands/init.md`](.cursor/commands/init.md)
- [`.cursor/commands/remember.md`](.cursor/commands/remember.md)
- [`.cursor/commands/req-review.md`](.cursor/commands/req-review.md)

**Skills（约 15+ 个文件）**：

- 所有 executor skills
- 所有 experience-* skills
- service-loader skill
- experience-curator 的引用文件

**Scripts（1 个文件）**：

- [`scripts/validate-experience-index.js`](scripts/validate-experience-index.js)

**文档文件（2+ 个文件）**：

- [`docs/testcase/灵犀功能测试用例.md`](docs/testcase/灵犀功能测试用例.md)
- [`docs/prd/lingxi-2.0-refactor.md`](docs/prd/lingxi-2.0-refactor.md)

**配置文件（1 个文件）**：

- [`.gitignore`](.gitignore)

### 阶段 4：安装脚本更新

#### 4.1 更新 install-manifest.json

**workflowDirectories** 数组：

```json
"workflowDirectories": [
  ".cursor/.lingxi/requirements",
  ".cursor/.lingxi/context/business",
  ".cursor/.lingxi/context/business/references",
  ".cursor/.lingxi/context/tech/services",
  ".cursor/.lingxi/context/experience",
  ".cursor/.lingxi/context/session",
  ".cursor/.lingxi/workspace"
]
```

**workflowIndexFiles** 数组：

```json
"workflowIndexFiles": [
  ".cursor/.lingxi/context/experience/INDEX.md"
]
```

**workflowTemplateFiles** 数组：

```json
"workflowTemplateFiles": [
  ".cursor/.lingxi/context/business/references/business-context-template.md"
]
```

**gitignoreEntries** 数组：

```json
"gitignoreEntries": [
  "# Local workspace for temp code clones, generated artifacts, etc.",
  ".cursor/.lingxi/workspace/",
  "",
  "# Session-level context (ephemeral, not a knowledge base)",
  ".cursor/.lingxi/context/session/"
]
```

#### 4.2 更新 bash.sh

1. **第 236-239 行**：检查目录存在性
   ```bash
   if [ -d ".cursor/.lingxi" ]; then
       LINGXI_EXISTS=true
       warning ".cursor/.lingxi 目录已存在"
   fi
   ```

2. **第 242 行**：合并安装模式检查
   ```bash
   if [ "$CURSOR_EXISTS" = true ] || [ "$LINGXI_EXISTS" = true ]; then
   ```

3. **第 414-421 行**：创建目录结构（使用新的路径）

4. **第 479-488 行**：更新 `.gitignore` 内容

5. **第 500 行**：更新输出信息

#### 4.3 更新 powershell.ps1

1. **第 106 行**：检查目录存在性
   ```powershell
   $LingxiExists = Test-Path ".cursor\.lingxi"
   ```

2. **第 112-114 行**：更新警告信息

3. **第 117 行**：合并安装模式检查
   ```powershell
   if ($CursorExists -or $LingxiExists) {
   ```

4. **第 228-233 行**：创建目录结构（使用新的路径）

5. **第 286-297 行**：更新 `.gitignore` 内容

6. **第 308 行**：更新输出信息

### 阶段 5：相对路径修复

检查并修复 `.cursor/.lingxi/` 目录内的相对路径引用：

1. **business-context-template.md**：

   - 当前：`../../../../.cursor/skills/`
   - 更新为：`../../../../../.cursor/skills/`（增加一级）

2. **其他可能的相对路径引用**：

   - 扫描 `.cursor/.lingxi/` 目录下所有文件
   - 查找包含 `../` 的路径引用
   - 根据新的目录层级调整

### 阶段 6：测试验证

#### 6.1 功能测试

1. **经验索引验证**：
   ```bash
   node scripts/validate-experience-index.js
   ```

2. **命令测试**：

   - `/req <测试需求>` - 验证 req 文档生成路径
   - `/plan 001` - 验证 plan 文档读取路径
   - `/build 001` - 验证文件扫描路径
   - `/review 001` - 验证审查文档路径
   - `/remember <测试经验>` - 验证经验沉淀路径

3. **安装脚本测试**：

   - 在临时目录测试 bash.sh
   - 在 Windows 环境测试 powershell.ps1
   - 验证新安装的项目使用新路径

#### 6.2 路径完整性检查

使用脚本验证所有路径引用：

```bash
# 检查是否还有遗漏的 .workflow 引用
grep -r "\.workflow" .cursor/ scripts/ install/ docs/ --exclude-dir=.git
```

### 阶段 7：文档更新

1. **README.md**：

   - 更新安装说明中的目录结构描述
   - 更新快速开始中的路径示例

2. **其他文档**：

   - 更新所有提及 `.workflow` 的文档

## 向后兼容性考虑（可选）

如果需要支持旧项目迁移，可以考虑：

1. **创建迁移脚本**：

   - 检测 `.workflow` 目录存在
   - 自动迁移到 `.cursor/.lingxi`
   - 更新项目中的路径引用

2. **双路径支持**（不推荐）：

   - 同时支持 `.workflow` 和 `.cursor/.lingxi`
   - 增加复杂度和维护成本

**建议**：不提供向后兼容，直接迁移。原因：

- 迁移是一次性操作
- 保持代码简洁
- 新安装的项目直接使用新路径

## 回滚方案

如果迁移出现问题：

1. **恢复目录**：
   ```bash
   rm -rf .cursor/.lingxi
   mv .workflow.backup .workflow
   ```

2. **恢复代码**：
   ```bash
   git checkout HEAD -- .cursor/ scripts/ install/ .gitignore
   ```

3. **验证功能**：

   - 运行所有测试用例
   - 确认功能正常

## 注意事项

1. **Git 跟踪**：

   - `.cursor/.lingxi/` 目录下的文件需要被 Git 跟踪
   - 确认 `.gitignore` 规则正确

2. **路径分隔符**：

   - Windows 使用反斜杠，但代码中使用正斜杠（Node.js/Python 自动处理）
   - 安装脚本需要处理路径转换

3. **权限问题**：

   - 确保 `.cursor/.lingxi/` 目录有正确的读写权限

4. **CI/CD**：

   - 如果有 CI/CD 流程，需要同步更新路径引用

## 预期收益

1. **减少根目录侵入**：从 2 个目录（`.cursor/`, `.workflow/`）减少到 1 个（`.cursor/`）
2. **更清晰的命名**：`.lingxi` 明确标识工具归属
3. **符合 Cursor 规范**：所有 Cursor 相关配置集中在 `.cursor/` 目录下
4. **降低认知负担**：用户只需关注 `.cursor/` 目录

## 风险评估

- **低风险**：纯路径变更，无功能逻辑修改
- **影响范围**：约 200+ 处路径引用需要更新
- **测试覆盖**：需要全面测试所有命令和功能
- **回滚成本**：低（Git 回滚 + 目录恢复）