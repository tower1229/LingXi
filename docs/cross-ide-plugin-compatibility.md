# 灵犀 Plugin 跨 IDE 兼容方案

> 调研日期：2026-03-15  
> 参考文档：[Cursor Plugin Reference](https://cursor.com/docs/reference/plugins.md) · [Claude Code Plugin Guide](https://code.claude.com/docs/en/plugins) · [Claude Code Plugin Reference](https://code.claude.com/docs/en/plugins-reference) · [Claude Code Features Overview](https://code.claude.com/docs/en/features-overview)

---

## 1. 背景与目标

灵犀当前以 Cursor Plugin 形式发布，所有内容（Skills、Agents、Hooks 脚本、运行时数据）都放在 `.cursor/` 目录下。随着 Claude Code 推出自己的 Plugin 系统，目标是：

1. **同一个 Git 仓库同时兼容 Cursor 和 Claude Code 两个 IDE**
2. **内容与运行时彻底分离**：plugin 分发的内容层不依赖任何 IDE 专有目录命名
3. **IDE 特有文件只留在 IDE 专有目录中**

---

## 2. 两个平台 Plugin 系统对比

### 2.1 清单文件

| 字段 | Cursor | Claude Code |
|------|--------|-------------|
| 清单目录 | `.cursor-plugin/` | `.claude-plugin/` |
| 清单文件名 | `plugin.json` | `plugin.json` |
| 必填字段 | `name` | `name` |
| 自定义组件路径 | 支持（`skills`, `agents`, `hooks` 等字段） | 支持（同字段名） |

两者清单内容格式**几乎完全相同**，仅目录名不同。两个平台均**支持在清单中用自定义路径覆盖默认目录**，因此共享内容层完全可行。

### 2.2 组件默认路径与兼容性

| 组件 | Cursor 默认路径 | Claude Code 默认路径 | 格式兼容性 |
|------|----------------|---------------------|-----------|
| Skills | `skills/<name>/SKILL.md` | `skills/<name>/SKILL.md` | ✅ 完全相同 |
| Agents | `agents/*.md` | `agents/*.md` | ✅ 完全相同 |
| Commands | `commands/*.md` | `commands/*.md` | ✅ 完全相同 |
| MCP | `.mcp.json` | `.mcp.json` | ✅ 完全相同 |
| Rules | `rules/*.mdc` | `rules/*.md`（无 paths 字段时全局加载）| ⚠️ 结构相同，frontmatter 字段名略有差异 |
| Hooks | `hooks/hooks.json` | `hooks/hooks.json` | ⚠️ 结构相同，事件名大小写不同 |
| LSP | 不支持 | `.lsp.json` | N/A（Claude Code 独有） |

### 2.3 运行时目录约定

**两个平台的 Plugin 协议均未规定运行时数据目录。** 这是 plugin 协议的刻意设计——plugin 协议只关心分发时的静态组件（Skills、Agents、Rules、Hooks 脚本、MCP），不管理运行时产生的状态数据。

因此，灵犀的运行时目录完全由自己约定，可以独立于任何 IDE 目录命名体系。

### 2.4 Hooks 事件名差异（唯一实质不兼容点）

| 语义 | Cursor 事件名 | Claude Code 事件名 |
|------|--------------|-------------------|
| 提交 Prompt 前 | `beforeSubmitPrompt` | `UserPromptSubmit` |
| Tool 使用后 | `postToolUse` | `PostToolUse` |
| Tool 使用前 | `preToolUse` | `PreToolUse` |
| Session 开始 | `sessionStart` | `SessionStart` |
| Session 结束 | `sessionEnd` | `SessionEnd` |
| 文件编辑后 | `afterFileEdit` | `PostToolUse`（matcher: Write\|Edit）|

### 2.5 SKILL.md / Rules frontmatter 双写策略

两平台均会忽略自己不认识的 frontmatter 字段，可以在一个文件里同时携带两个平台需要的字段：

**SKILL.md（两平台通用）：**
```yaml
---
name: memory-retrieve
description: 供主 Agent 检索记忆，产出结果写入 HOT_RAM.md。
disable-model-invocation: true   # Claude Code 读取；Cursor 忽略
---
```

**Rules 文件（两平台通用）：**
```yaml
---
description: "LingXi AgentOS Kernel Directive"
globs: "*"          # Cursor 读取
alwaysApply: true   # Cursor 读取
paths:              # Claude Code 读取
  - "**/*"
---
```

---

## 3. 现状分析：灵犀的路径耦合问题

### 3.1 当前目录结构

```
LingXi/
├── .cursor-plugin/plugin.json    ← 清单，指向 .cursor/ 下各目录
└── .cursor/
    ├── skills/                   ← Plugin 内容（应共享）
    ├── agents/                   ← Plugin 内容（应共享）
    ├── commands/                 ← Plugin 内容（应共享）
    ├── rules/                    ← Plugin 内容（应共享）
    ├── heartbeat-plugins/        ← 运行时守护脚本
    ├── hooks/                    ← 运行时 Hook 脚本
    ├── hooks.json                ← Cursor 专有 Hook 配置
    └── .lingxi/                  ← 运行时数据（session、memory、WAL、OS 状态）
        ├── os/
        │   ├── HOT_RAM.md（session 内）
        │   ├── WAL_BUFFER.md
        │   ├── heartbeat-control.json
        │   └── MEMORY_JOURNAL.jsonl
        ├── memory/
        └── tasks/
```

### 3.2 硬编码路径依赖清单

通过代码分析，以下文件包含对 `.cursor/` 路径的硬编码引用，需要在重构中处理：

| 文件 | 硬编码的路径（当前） |
|------|------------|
| `plugin/hooks/heartbeat-check.mjs` | `.lingxi/os/WAL_BUFFER.md`、`heartbeat-control.json`、`heartbeat-transcript-index.json` |
| `plugin/hooks/wal-utils.mjs` | `.lingxi/os/WAL_BUFFER.md`、`plugin/skills/workspace-bootstrap/references/WAL_BUFFER.default.md` |
| `plugin/hooks/heartbeat-distill-done.mjs` | `.lingxi/os/heartbeat-control.json`、`WAL_BUFFER.md` |
| `plugin/heartbeat-plugins/self-iterate.mjs` | `.lingxi/os/heartbeat-control.json`、`plugin/agents/lingxi-self-iterate/scripts/` |
| `plugin/agents/lingxi-self-iterate/scripts/memory-improvement-proposal.mjs` | `.lingxi/os/` 下多个文件、`.lingxi/memory/` |
| `plugin/agents/lingxi-self-iterate/scripts/memory-improvement-apply.mjs` | `.lingxi/os/improvement-*.json` |
| `plugin/skills/workspace-bootstrap/scripts/workspace-bootstrap.mjs` | `.lingxi/` 下所有骨架文件路径 |
| `plugin/skills/task/scripts/latest-task-id.mjs` | `.lingxi/tasks/` |
| `plugin/skills/task/scripts/next-task-id.mjs` | `.lingxi/tasks/` |
| `plugin/skills/memory-govern/SKILL.md` | `.lingxi/memory`（文档引用） |
| `plugin/skills/workspace-bootstrap/references/HOT_RAM.default.md` | `.lingxi/os/WAL_BUFFER.md`（文档引用） |

**注意**：`heartbeat-trigger.mjs` 和 `heartbeat-distill-done.mjs` 已使用 `process.env.CURSOR_PROJECT_DIR || process.cwd()` 动态解析项目根；脚本位于 `plugin/hooks/`，项目根为 `path.resolve(scriptDir, "../..")`。

`_hook-utils.mjs` 中的 `getProjectRootFromHookScriptUrl()` 基于 `plugin/hooks/` 相对位置（`path.resolve(scriptDir, "../..")`）解析项目根。

---

## 4. 重构方案：三层分离

### 4.1 设计原则

- **内容层**（`plugin/`）：plugin 分发的静态资产，两个 IDE 完全共享，不含任何 IDE 目录名
- **运行时层**（`.lingxi/`）：灵犀自定义的运行时数据目录，从项目根直接存放，不隶属任何 IDE 目录
- **IDE 适配层**（`.cursor-plugin/`、`.claude-plugin/`、`.cursor/`、`.claude/`）：仅存放 IDE 专有配置文件

### 4.2 新目录结构

```
LingXi/
│
├── # ── 内容层（Plugin 分发资产，两个 IDE 完全共享）─────────────
│
├── plugin/
│   ├── skills/
│   │   ├── about-lingxi/SKILL.md
│   │   ├── memory-retrieve/SKILL.md
│   │   ├── memory-write/SKILL.md
│   │   ├── memory-govern/SKILL.md
│   │   ├── workspace-bootstrap/SKILL.md
│   │   ├── task/SKILL.md
│   │   ├── vet/SKILL.md
│   │   ├── plan/SKILL.md
│   │   ├── build/SKILL.md
│   │   ├── review/SKILL.md
│   │   ├── taste-recognition/SKILL.md
│   │   ├── megaprompt-assembly/SKILL.md
│   │   ├── ask-questions/SKILL.md
│   │   ├── skill-creator/SKILL.md
│   │   ├── testcase-designer/SKILL.md
│   │   └── reviewer-*/SKILL.md
│   │
│   ├── agents/
│   │   ├── lingxi-subagent.md
│   │   ├── lingxi-memory-write.md
│   │   ├── lingxi-session-distill.md
│   │   └── lingxi-self-iterate.md（及 scripts/ 子目录）
│   │
│   ├── commands/
│   │   ├── init.md
│   │   ├── remember.md
│   │   └── start-tuning.md
│   │
│   ├── rules/
│   │   └── agentos-kernel.md      ← 扩展名改 .md，frontmatter 双写
│   │
│   ├── hooks/                     ← 运行时脚本（平台无关逻辑）
│   │   ├── _hook-utils.mjs
│   │   ├── heartbeat-trigger.mjs
│   │   ├── heartbeat-check.mjs
│   │   ├── heartbeat-distill-done.mjs
│   │   └── wal-utils.mjs
│   │
│   └── heartbeat-plugins/         ← 守护层插件
│       ├── registry.mjs
│       ├── session-distill.mjs
│       └── self-iterate.mjs
│
├── # ── 运行时层（灵犀自定义，不属于任何 IDE）──────────────────
│
├── .lingxi/                       ← 运行时数据根（从项目根直接放置）
│   ├── os/
│   │   ├── sessions/              ← HOT_RAM.md 按 session 存放
│   │   ├── WAL_BUFFER.md
│   │   ├── heartbeat-control.json
│   │   ├── heartbeat-transcript-index.json
│   │   ├── MEMORY_JOURNAL.jsonl
│   │   ├── improvement-proposal.json
│   │   └── memory-diagnostics.md
│   ├── memory/
│   │   ├── INDEX.md
│   │   ├── project/
│   │   └── share/
│   └── tasks/
│
├── # ── IDE 适配层（各 IDE 专有，仅含配置）──────────────────────
│
├── .cursor-plugin/
│   └── plugin.json                ← Cursor 清单，指向 plugin/ 目录
│
├── .claude-plugin/
│   └── plugin.json                ← Claude Code 清单，指向 plugin/ 目录
│
├── .cursor/
│   └── hooks.json                 ← Cursor 专有 hook 配置（camelCase 事件名）
│
└── .claude/
    └── hooks.json                 ← Claude Code 专有 hook 配置（PascalCase 事件名）
```

### 4.3 两个清单文件

**`.cursor-plugin/plugin.json`：**
```json
{
  "name": "lingxi",
  "version": "1.1.0",
  "description": "AI workflow and memory: task/vet/plan/build/review, persistent memory, ready to use.",
  "author": { "name": "tower1229" },
  "keywords": ["workflow", "memory", "task", "lingxi"],
  "license": "MIT",
  "homepage": "https://github.com/tower1229/LingXi",
  "repository": "https://github.com/tower1229/LingXi",
  "logo": "assets/logo.svg",
  "skills":   "plugin/skills",
  "agents":   "plugin/agents",
  "commands": "plugin/commands",
  "rules":    "plugin/rules",
  "hooks":    ".cursor/hooks.json"
}
```

**`.claude-plugin/plugin.json`：**
```json
{
  "name": "lingxi",
  "version": "1.1.0",
  "description": "AI workflow and memory: task/vet/plan/build/review, persistent memory, ready to use.",
  "author": { "name": "tower1229" },
  "keywords": ["workflow", "memory", "task", "lingxi"],
  "license": "MIT",
  "homepage": "https://github.com/tower1229/LingXi",
  "repository": "https://github.com/tower1229/LingXi",
  "logo": "assets/logo.svg",
  "skills":   "plugin/skills",
  "agents":   "plugin/agents",
  "commands": "plugin/commands",
  "rules":    "plugin/rules",
  "hooks":    ".claude/hooks.json"
}
```

### 4.4 两个 Hook 配置文件

**`.cursor/hooks.json`（Cursor，camelCase）：**
```json
{
  "version": 1,
  "hooks": {
    "beforeSubmitPrompt": [
      {
        "command": "node plugin/hooks/heartbeat-trigger.mjs"
      }
    ]
  }
}
```

**`.claude/hooks.json`（Claude Code，PascalCase）：**
```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "type": "command",
        "command": "${CLAUDE_PLUGIN_ROOT}/plugin/hooks/heartbeat-trigger.mjs"
      }
    ]
  }
}
```

> Claude Code 安装插件时会将其复制到本地缓存，hooks 脚本路径必须使用 `${CLAUDE_PLUGIN_ROOT}` 环境变量，不能使用相对路径。

### 4.5 运行时路径常量统一修改

将所有脚本中的 `.cursor/.lingxi/` 替换为 `.lingxi/`，`.cursor/skills/` 替换为 `plugin/skills/`，`.cursor/agents/` 替换为 `plugin/agents/`。以 `heartbeat-check.mjs` 为例：

```javascript
// 修改前
const WAL_BUFFER_REL          = ".cursor/.lingxi/os/WAL_BUFFER.md";
const HEARTBEAT_CONTROL_REL   = ".cursor/.lingxi/os/heartbeat-control.json";
const HEARTBEAT_TRANSCRIPT_INDEX_REL = ".cursor/.lingxi/os/heartbeat-transcript-index.json";

// 修改后
const WAL_BUFFER_REL          = ".lingxi/os/WAL_BUFFER.md";
const HEARTBEAT_CONTROL_REL   = ".lingxi/os/heartbeat-control.json";
const HEARTBEAT_TRANSCRIPT_INDEX_REL = ".lingxi/os/heartbeat-transcript-index.json";
```

以 `wal-utils.mjs` 为例：
```javascript
// 修改前
const WAL_BUFFER_REL  = ".cursor/.lingxi/os/WAL_BUFFER.md";
const DEFAULT_WAL_REL = ".cursor/skills/workspace-bootstrap/references/WAL_BUFFER.default.md";

// 修改后
const WAL_BUFFER_REL  = ".lingxi/os/WAL_BUFFER.md";
const DEFAULT_WAL_REL = "plugin/skills/workspace-bootstrap/references/WAL_BUFFER.default.md";
```

以 `self-iterate.mjs` 为例：
```javascript
// 修改前
const HEARTBEAT_CONTROL_REL = ".cursor/.lingxi/os/heartbeat-control.json";
// execCommand 中：
const proposalScript = path.join(projectRoot, ".cursor/agents/lingxi-self-iterate/scripts/memory-improvement-proposal.mjs");

// 修改后
const HEARTBEAT_CONTROL_REL = ".lingxi/os/heartbeat-control.json";
// execCommand 中：
const proposalScript = path.join(projectRoot, "plugin/agents/lingxi-self-iterate/scripts/memory-improvement-proposal.mjs");
```

`_hook-utils.mjs` 中的 `getProjectRootFromHookScriptUrl()` 需更新层级计算：
```javascript
// 修改前（假设脚本在 .cursor/hooks/）
// 注释：.cursor/hooks/xxx.mjs -> project root is two levels up
return path.resolve(scriptDir, "../..");

// 修改后（脚本在 plugin/hooks/）
// 注释：plugin/hooks/xxx.mjs -> project root is two levels up
return path.resolve(scriptDir, "../..");   // 层级数不变，路径语义变了
```

### 4.6 agentos-kernel.md frontmatter 双写

```yaml
---
description: "LingXi AgentOS Kernel Directive - MUST ALWAYS APPLY"
globs: "*"
alwaysApply: true
paths:
  - "**/*"
---
```

Cursor 读取 `globs` + `alwaysApply`，Claude Code 读取 `paths`，互不干扰。

### 4.7 .gitignore 更新

```gitignore
# 灵犀运行时数据（部分需 gitignore）
.lingxi/workspace/

# OS / IDE
.DS_Store
Thumbs.db
```

---

## 5. 需要逐一修改的文件清单

### 5.1 路径常量修改（`.cursor/.lingxi/` → `.lingxi/`，`.cursor/skills/` → `plugin/skills/` 等）

| 文件 | 修改内容 |
|------|---------|
| `plugin/hooks/heartbeat-check.mjs` | 3 个路径常量（WAL、heartbeat-control、transcript-index）|
| `plugin/hooks/wal-utils.mjs` | 2 个路径常量（WAL、default WAL 骨架）|
| `plugin/hooks/heartbeat-distill-done.mjs` | 2 个路径常量（heartbeat-control、WAL）|
| `plugin/heartbeat-plugins/self-iterate.mjs` | 1 个路径常量（heartbeat-control）+ execCommand 中 2 个脚本路径 |
| `plugin/agents/lingxi-self-iterate/scripts/memory-improvement-proposal.mjs` | 7 个路径常量（os/ 和 memory/ 下各文件）|
| `plugin/agents/lingxi-self-iterate/scripts/memory-improvement-apply.mjs` | 3 个路径常量 |
| `plugin/skills/workspace-bootstrap/scripts/workspace-bootstrap.mjs` | 骨架文件映射表中所有路径 |
| `plugin/skills/task/scripts/latest-task-id.mjs` | `.lingxi/tasks/` |
| `plugin/skills/task/scripts/next-task-id.mjs` | 同上 |

### 5.2 文档引用修改

| 文件 | 修改内容 |
|------|---------|
| `plugin/skills/memory-govern/SKILL.md` | 路径示例 `.lingxi/memory` |
| `plugin/skills/workspace-bootstrap/references/HOT_RAM.default.md` | 文档中的路径引用 |
| `plugin/skills/about-lingxi/references/` 下相关 refs | 架构描述中的目录路径 |

### 5.3 Hook 配置调用路径

`plugin/skills/workspace-bootstrap/references/HOT_RAM.default.md` 中有对 heartbeat-distill-done 的调用示例：
```
# 修改前
node .cursor/hooks/heartbeat-distill-done.mjs ...

# 修改后
node plugin/hooks/heartbeat-distill-done.mjs ...
```

---

## 6. Skill 触发机制差异说明

| 平台 | 触发方式 | 命名空间 |
|------|---------|---------|
| Cursor | Agent 根据 description 自动决策；`/skill-name` 手动触发 | 无前缀，直接 `/skill-name` |
| Claude Code | 同上；plugin 内 skill 有强制命名空间 | `/lingxi:skill-name` |

用户在 Claude Code 中需使用 `/lingxi:plan` 而非 `/plan`。这是 Claude Code 防止多 plugin 冲突的设计，无法绕过。

---

## 7. 实施路径

### 阶段 1：目录重构（前置必做）

1. 创建 `plugin/` 目录，将 `.cursor/skills/`、`.cursor/agents/`、`.cursor/commands/`、`.cursor/rules/`、`.cursor/hooks/`、`.cursor/heartbeat-plugins/` 移入
2. 将 `.cursor/.lingxi/` 目录移动并重命名为项目根下的 `.lingxi/`
3. 按第 5 节清单逐一修改所有硬编码路径常量
4. 更新 `.cursor-plugin/plugin.json` 中的路径指向（`plugin/skills` 等）
5. 更新 `.cursor/hooks.json` 中的脚本调用路径（`node plugin/hooks/heartbeat-trigger.mjs`）
6. 更新 `.gitignore`（`.lingxi/workspace/`）
7. 本地回归测试：heartbeat 触发、HOT_RAM 读写、WAL 入队消费

### 阶段 2：Claude Code 适配（重构完成后）

8. 新增 `.claude-plugin/plugin.json`（参考 4.3）
9. 新增 `.claude/hooks.json`（参考 4.4，PascalCase 事件名 + `${CLAUDE_PLUGIN_ROOT}` 路径）
10. `agentos-kernel.md` frontmatter 追加 `paths` 字段（参考 4.6）
11. 对显式触发类 Skills 追加 `disable-model-invocation: true`
12. 用 `claude --plugin-dir ./` 本地验证 Claude Code 侧功能

### 阶段 3：Marketplace 发布

13. 向 [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish) 提交（Cursor 市场）
14. 向 [platform.claude.com/plugins/submit](https://platform.claude.com/plugins/submit) 提交（Claude Code 市场）

---

## 8. 改动规模评估

| 改动类型 | 文件数 | 说明 |
|---------|--------|------|
| 路径常量替换 | ~9 个脚本 | 批量查找替换，字符串替换，无逻辑改动 |
| 文档路径引用 | ~5 个 md 文件 | 示例路径更新 |
| 新增清单文件 | 1 | `.claude-plugin/plugin.json` |
| 新增 hooks 配置 | 1 | `.claude/hooks.json` |
| frontmatter 追加 | 1 | `agentos-kernel.md` 加 `paths` 字段 |
| 目录移动 | 6 个目录 | skills、agents、commands、rules、hooks、heartbeat-plugins |
| 运行时目录重命名 | 1 | `.lingxi/`（项目根下） |
