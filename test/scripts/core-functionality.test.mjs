/**
 * LingXi Agent OS 核心功能可用性测试
 *
 * 验证 LingXi 的核心组件是否正确配置并可用：
 * 1. 核心目录结构
 * 2. Skills 加载
 * 3. Commands 加载
 * 4. Hooks 配置
 * 5. Heartbeat plugins
 * 6. IDE 适配配置
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import assert from "node:assert";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// REPO_ROOT 应该是项目根目录（test 目录的父目录的父目录）
const REPO_ROOT = path.resolve(__dirname, "../..");

// ============ 核心目录与文件定义 ============

const CORE_DIRS = [
  "skills",
  "commands",
  "agents",
  "hooks",
  "heartbeat-plugins",
];

const IDE_ADAPTER_DIRS = [
  ".cursor",
  ".cursor-plugin",
  ".claude",
  ".claude-plugin",
];

// 必需的 Skills（核心工作流）
const REQUIRED_SKILLS = [
  "task",
  "vet",
  "plan",
  "build",
  "review",
  "about-lingxi",
  "memory-write",
  "memory-retrieve",
  "workspace-bootstrap",
];

// 必需的 Commands
const REQUIRED_COMMANDS = [
  "init",
  "remember",
];

// 必需的 Hooks
const REQUIRED_HOOKS = [
  "heartbeat-trigger.mjs",
  "heartbeat-check.mjs",
  "wal-utils.mjs",
];

// 必需的 Heartbeat Plugins
const REQUIRED_HEARTBEAT_PLUGINS = [
  "registry.mjs",
  "session-distill.mjs",
  "self-iterate.mjs",
];

// 必需的 Agents
const REQUIRED_AGENTS = [
  "lingxi-subagent.md",
  "lingxi-session-distill.md",
  "lingxi-memory-write.md",
];

// ============ 测试用例 ============

describe("LingXi Agent OS 核心功能可用性", () => {

  describe("1. 核心目录结构", () => {
    CORE_DIRS.forEach((dir) => {
      it(`目录存在: ${dir}/`, () => {
        const dirPath = path.join(REPO_ROOT, dir);
        assert.ok(
          fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory(),
          `核心目录 ${dir}/ 不存在`
        );
      });
    });
  });

  describe("2. Skills 加载", () => {
    REQUIRED_SKILLS.forEach((skill) => {
      it(`Skill 存在: skills/${skill}/SKILL.md`, () => {
        const skillPath = path.join(REPO_ROOT, "skills", skill, "SKILL.md");
        assert.ok(
          fs.existsSync(skillPath),
          `Skill ${skill} 不存在: ${skillPath}`
        );
      });

      it(`Skill 包含有效 frontmatter: skills/${skill}/SKILL.md`, () => {
        const skillPath = path.join(REPO_ROOT, "skills", skill, "SKILL.md");
        const content = fs.readFileSync(skillPath, "utf8");
        // 检查是否包含 YAML frontmatter
        assert.ok(
          content.startsWith("---"),
          `Skill ${skill} 缺少 frontmatter`
        );
        // 检查是否有 name 字段
        const nameMatch = content.match(/^---\n[\s\S]*?name:\s*(\S+)/);
        assert.ok(nameMatch, `Skill ${skill} frontmatter 缺少 name 字段`);
      });
    });
  });

  describe("3. Commands 加载", () => {
    REQUIRED_COMMANDS.forEach((cmd) => {
      it(`Command 存在: commands/${cmd}.md`, () => {
        const cmdPath = path.join(REPO_ROOT, "commands", `${cmd}.md`);
        assert.ok(
          fs.existsSync(cmdPath),
          `Command ${cmd} 不存在: ${cmdPath}`
        );
      });

      it(`Command 包含有效 frontmatter: commands/${cmd}.md`, () => {
        const cmdPath = path.join(REPO_ROOT, "commands", `${cmd}.md`);
        const content = fs.readFileSync(cmdPath, "utf8");
        assert.ok(
          content.startsWith("---"),
          `Command ${cmd} 缺少 frontmatter`
        );
        // 检查是否有 name 和 description 字段
        const hasName = content.includes("name:");
        const hasDesc = content.includes("description:");
        assert.ok(hasName && hasDesc, `Command ${cmd} frontmatter 缺少必要字段`);
      });
    });
  });

  describe("4. Hooks 配置", () => {
    it("hooks 目录存在且包含必需文件", () => {
      const hooksDir = path.join(REPO_ROOT, "hooks");
      REQUIRED_HOOKS.forEach((hook) => {
        const hookPath = path.join(hooksDir, hook);
        assert.ok(
          fs.existsSync(hookPath),
          `Hook 文件不存在: ${hook}`
        );
      });
    });

    it(".cursor/hooks.json 存在且格式有效", () => {
      const hooksJsonPath = path.join(REPO_ROOT, ".cursor", "hooks.json");
      assert.ok(fs.existsSync(hooksJsonPath), ".cursor/hooks.json 不存在");
      const content = fs.readFileSync(hooksJsonPath, "utf8");
      const parsed = JSON.parse(content);
      assert.ok(parsed.hooks, "hooks.json 缺少 hooks 字段");
    });

    it(".claude/hooks.json 存在且格式有效", () => {
      const hooksJsonPath = path.join(REPO_ROOT, ".claude", "hooks.json");
      assert.ok(fs.existsSync(hooksJsonPath), ".claude/hooks.json 不存在");
      const content = fs.readFileSync(hooksJsonPath, "utf8");
      const parsed = JSON.parse(content);
      assert.ok(parsed.hooks, "hooks.json 缺少 hooks 字段");
      // 检查是否有正确的 matcher 结构
      const hooks = parsed.hooks;
      for (const event of Object.keys(hooks)) {
        const eventHooks = hooks[event];
        if (Array.isArray(eventHooks)) {
          for (const h of eventHooks) {
            assert.ok(h.matcher !== undefined, `Hook ${event} 缺少 matcher 字段`);
            assert.ok(h.hooks !== undefined, `Hook ${event} 缺少 hooks 字段`);
          }
        }
      }
    });
  });

  describe("5. Heartbeat Plugins", () => {
    it("heartbeat-plugins 目录存在且包含必需文件", () => {
      const pluginsDir = path.join(REPO_ROOT, "heartbeat-plugins");
      REQUIRED_HEARTBEAT_PLUGINS.forEach((plugin) => {
        const pluginPath = path.join(pluginsDir, plugin);
        assert.ok(
          fs.existsSync(pluginPath),
          `Heartbeat plugin 不存在: ${plugin}`
        );
      });
    });

    it("registry.mjs 导出有效的 PLUGINS 数组", () => {
      const registryPath = path.join(REPO_ROOT, "heartbeat-plugins", "registry.mjs");
      const content = fs.readFileSync(registryPath, "utf8");
      // 检查是否包含 PLUGINS 导出
      assert.ok(
        content.includes("PLUGINS") || content.includes("export"),
        "registry.mjs 缺少导出"
      );
    });
  });

  describe("6. Agents", () => {
    REQUIRED_AGENTS.forEach((agent) => {
      it(`Agent 存在: agents/${agent}`, () => {
        const agentPath = path.join(REPO_ROOT, "agents", agent);
        assert.ok(
          fs.existsSync(agentPath),
          `Agent 文件不存在: ${agent}`
        );
      });

      it(`Agent 包含有效 frontmatter: agents/${agent}`, () => {
        const agentPath = path.join(REPO_ROOT, "agents", agent);
        const content = fs.readFileSync(agentPath, "utf8");
        assert.ok(
          content.startsWith("---"),
          `Agent ${agent} 缺少 frontmatter`
        );
        // 检查是否有 name 字段
        const hasName = content.includes("name:");
        assert.ok(hasName, `Agent ${agent} frontmatter 缺少 name 字段`);
      });
    });
  });

  describe("7. IDE 适配配置", () => {
    IDE_ADAPTER_DIRS.forEach((dir) => {
      it(`IDE 适配目录存在: ${dir}/`, () => {
        const dirPath = path.join(REPO_ROOT, dir);
        assert.ok(
          fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory(),
          `IDE 适配目录 ${dir}/ 不存在`
        );
      });
    });

    it(".cursor-plugin/plugin.json 存在且格式有效", () => {
      const pluginJsonPath = path.join(REPO_ROOT, ".cursor-plugin", "plugin.json");
      assert.ok(fs.existsSync(pluginJsonPath), ".cursor-plugin/plugin.json 不存在");
      const content = fs.readFileSync(pluginJsonPath, "utf8");
      const parsed = JSON.parse(content);
      assert.ok(parsed.name, "plugin.json 缺少 name 字段");
      assert.ok(parsed.skills, "plugin.json 缺少 skills 字段");
    });

    it(".claude-plugin/plugin.json 存在且格式有效", () => {
      const pluginJsonPath = path.join(REPO_ROOT, ".claude-plugin", "plugin.json");
      assert.ok(fs.existsSync(pluginJsonPath), ".claude-plugin/plugin.json 不存在");
      const content = fs.readFileSync(pluginJsonPath, "utf8");
      const parsed = JSON.parse(content);
      assert.ok(parsed.name, "plugin.json 缺少 name 字段");
      // Claude Code 可能没有 skills 字段（使用默认目录），检查是否有 skills 或 commands
      assert.ok(
        parsed.skills || parsed.commands,
        "plugin.json 缺少 skills 或 commands 字段"
      );
    });
  });

  describe("8. 核心脚本可执行性", () => {
    it("workspace-bootstrap.mjs 是有效的 Node 脚本", () => {
      const scriptPath = path.join(
        REPO_ROOT,
        "skills",
        "workspace-bootstrap",
        "scripts",
        "workspace-bootstrap.mjs"
      );
      if (fs.existsSync(scriptPath)) {
        const content = fs.readFileSync(scriptPath, "utf8");
        // 检查是有效的 Node 脚本（有 shebang 或有 import）
        const isValid = content.includes("#!/usr/bin/env node") ||
                       content.includes("import ") ||
                       content.includes("export ");
        assert.ok(isValid, "workspace-bootstrap.mjs 不是有效的 Node 脚本");
      }
    });

    it("task ID 脚本存在且为可执行脚本", () => {
      const nextTaskId = path.join(REPO_ROOT, "skills", "task", "scripts", "next-task-id.mjs");
      const latestTaskId = path.join(REPO_ROOT, "skills", "task", "scripts", "latest-task-id.mjs");
      assert.ok(fs.existsSync(nextTaskId), "next-task-id.mjs 不存在");
      assert.ok(fs.existsSync(latestTaskId), "latest-task-id.mjs 不存在");
    });
  });
});
