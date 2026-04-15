import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { afterEach, describe, it } from "node:test";
import assert from "node:assert";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const scriptPath = path.join(repoRoot, "scripts", "lingxi-setup.mjs");

function createTempDir() {
  return fs.mkdtempSync(path.join("/tmp", "lingxi-setup-test-"));
}

function runSetup(projectRoot, hostArg) {
  const args = [scriptPath];
  if (hostArg) {
    args.push("--host", hostArg);
  }
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: repoRoot,
      env: { ...process.env, CODEX_PROJECT_DIR: projectRoot, LINGXI_PROJECT_ROOT: projectRoot },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data) => {
      stdout += data;
    });
    child.stderr.on("data", (data) => {
      stderr += data;
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

describe("lingxi-setup", () => {
  let tempDir;

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("creates the runtime skeleton (default --host all)", async () => {
    tempDir = createTempDir();
    const result = await runSetup(tempDir);
    assert.strictEqual(result.code, 0, result.stderr);
    assert.ok(fs.existsSync(path.join(tempDir, ".lingxi", "memory", "INDEX.md")));
    assert.ok(!fs.existsSync(path.join(tempDir, ".lingxi", "state", "memory-ops.jsonl")));
    assert.ok(fs.existsSync(path.join(tempDir, ".codex", "config.toml")));
    assert.ok(fs.existsSync(path.join(tempDir, ".codex", "hooks.json")));
    assert.ok(fs.existsSync(path.join(tempDir, ".codex", "agents", "lingxi-session-distill.toml")));
    assert.ok(fs.existsSync(path.join(tempDir, "AGENTS.md")));
    assert.ok(fs.existsSync(path.join(tempDir, ".claude", "settings.json")));
    assert.ok(fs.existsSync(path.join(tempDir, ".claude", "agents", "lingxi-session-distill.md")));
    assert.ok(fs.existsSync(path.join(tempDir, ".claude", "skills", "task", "SKILL.md")));
    assert.ok(fs.existsSync(path.join(tempDir, "CLAUDE.md")));

    const agents = fs.readFileSync(path.join(tempDir, "AGENTS.md"), "utf8");
    const codexConfig = fs.readFileSync(path.join(tempDir, ".codex", "config.toml"), "utf8");
    const codexHooks = JSON.parse(fs.readFileSync(path.join(tempDir, ".codex", "hooks.json"), "utf8"));
    const distillAgent = fs.readFileSync(path.join(tempDir, ".codex", "agents", "lingxi-session-distill.toml"), "utf8");
    const state = JSON.parse(fs.readFileSync(path.join(tempDir, ".lingxi", "state", "processed-sessions.json"), "utf8"));
    const summary = JSON.parse(result.stdout);

    assert.strictEqual(summary.host, "all");
    assert.strictEqual(summary.codex_enabled, true);
    assert.strictEqual(summary.claude_enabled, true);
    assert.strictEqual(summary.default_distill_rrule, undefined);
    assert.strictEqual(summary.codex_hooks_enabled, true);
    assert.match(summary.codex_hooks_windows_note, /does not execute hooks natively on Windows yet/);
    assert.strictEqual(state.state_schema_version, "v2");
    assert.strictEqual(state.distill_version, "v3");
    assert.deepStrictEqual(state.summary, {
      tracked_sessions: 0,
      total_runs: 0,
      written_runs: 0,
      merged_runs: 0,
      skipped_duplicate_runs: 0,
      skipped_no_signal_runs: 0,
      failed_runs: 0,
      reprocessed_runs: 0
    });
    assert.strictEqual(state.last_run, null);
    assert.deepStrictEqual(state.sessions, {});
    assert.ok(!fs.existsSync(path.join(tempDir, ".lingxi", "setup", "automation.session-distill.toml")));
    assert.match(codexConfig, /\[features\]/);
    assert.match(codexConfig, /^codex_hooks = true$/m);
    assert.ok(Array.isArray(codexHooks.hooks?.UserPromptSubmit));
    assert.strictEqual(codexHooks.hooks.UserPromptSubmit.length, 1);
    assert.strictEqual(codexHooks.hooks.UserPromptSubmit[0].hooks[0].type, "command");
    assert.match(codexHooks.hooks.UserPromptSubmit[0].hooks[0].command, /lx-memory-hook\.mjs/);
    assert.match(agents, /Runtime root: `\.lingxi\/`/);
    assert.match(agents, /Memory index: `\.lingxi\/memory\/INDEX\.md`/);
    assert.match(agents, /Distill runner: `node scripts\/lx-distill-sessions\.mjs`/);
    assert.match(agents, /task definition \(`task`\)/);
    assert.match(agents, /task vetting \(`vet`\)/);
    assert.match(agents, /Persist only durable, reusable engineering taste\./);
    assert.match(agents, /Exclude session-distill automation\/self-distillation sessions from background memory selection\./);
    assert.match(agents, /LingXi memory is injected automatically for meaningful repository turns through repo-local hooks when hooks are active\./);
    assert.match(agents, /Skip trivial or non-repository conversation turns\./);
    assert.match(distillAgent, /Run `node scripts\/lx-distill-sessions\.mjs`/);
    assert.match(distillAgent, /Do not bypass the runner by manually reading Codex session artifacts\./);
  });

  it("--host claude generates only Claude adapter artifacts", async () => {
    tempDir = createTempDir();
    const result = await runSetup(tempDir, "claude");
    assert.strictEqual(result.code, 0, result.stderr);
    const summary = JSON.parse(result.stdout);

    assert.strictEqual(summary.host, "claude");
    assert.strictEqual(summary.codex_enabled, false);
    assert.strictEqual(summary.claude_enabled, true);
    assert.strictEqual(summary.wrote_agents_md, true);
    assert.strictEqual(summary.wrote_claude_md, true);
    assert.strictEqual(summary.default_distill_rrule, undefined);

    assert.ok(fs.existsSync(path.join(tempDir, ".lingxi", "memory", "INDEX.md")));
    assert.ok(fs.existsSync(path.join(tempDir, "AGENTS.md")));
    assert.ok(fs.existsSync(path.join(tempDir, ".claude", "settings.json")));
    assert.ok(fs.existsSync(path.join(tempDir, ".claude", "agents", "lingxi-session-distill.md")));
    assert.ok(fs.existsSync(path.join(tempDir, ".claude", "skills", "task", "SKILL.md")));
    assert.ok(fs.existsSync(path.join(tempDir, "CLAUDE.md")));

    assert.ok(!fs.existsSync(path.join(tempDir, ".codex")));
    assert.ok(!fs.existsSync(path.join(tempDir, ".lingxi", "setup", "automation.session-distill.toml")));

    const claudeSettings = JSON.parse(fs.readFileSync(path.join(tempDir, ".claude", "settings.json"), "utf8"));
    assert.ok(Array.isArray(claudeSettings.hooks?.UserPromptSubmit));
    assert.strictEqual(claudeSettings.hooks.UserPromptSubmit.length, 1);
    assert.match(claudeSettings.hooks.UserPromptSubmit[0].hooks[0].command, /lx-memory-hook\.mjs/);

    const claudeAgent = fs.readFileSync(path.join(tempDir, ".claude", "agents", "lingxi-session-distill.md"), "utf8");
    assert.match(claudeAgent, /Run `node scripts\/lx-distill-sessions\.mjs --host claude`/);

    const claudeMd = fs.readFileSync(path.join(tempDir, "CLAUDE.md"), "utf8");
    assert.match(claudeMd, /@AGENTS\.md/);
    assert.match(claudeMd, /\.claude\/skills\//);
  });

  it("--host codex generates only Codex adapter artifacts", async () => {
    tempDir = createTempDir();
    const result = await runSetup(tempDir, "codex");
    assert.strictEqual(result.code, 0, result.stderr);
    const summary = JSON.parse(result.stdout);

    assert.strictEqual(summary.host, "codex");
    assert.strictEqual(summary.codex_enabled, true);
    assert.strictEqual(summary.claude_enabled, false);
    assert.strictEqual(summary.wrote_claude_md, false);

    assert.ok(fs.existsSync(path.join(tempDir, ".codex", "config.toml")));
    assert.ok(fs.existsSync(path.join(tempDir, "AGENTS.md")));
    assert.ok(!fs.existsSync(path.join(tempDir, ".claude")));
    assert.ok(!fs.existsSync(path.join(tempDir, "CLAUDE.md")));
  });

  it("does not overwrite an existing AGENTS.md", async () => {
    tempDir = createTempDir();
    const agentsMd = path.join(tempDir, "AGENTS.md");
    fs.writeFileSync(agentsMd, "# Existing\n", "utf8");
    const result = await runSetup(tempDir);
    assert.strictEqual(result.code, 0, result.stderr);
    assert.strictEqual(fs.readFileSync(agentsMd, "utf8"), "# Existing\n");
    const summary = JSON.parse(result.stdout);
    assert.strictEqual(summary.wrote_agents_md, false);
  });

  it("does not overwrite an existing CLAUDE.md", async () => {
    tempDir = createTempDir();
    const claudeMd = path.join(tempDir, "CLAUDE.md");
    fs.writeFileSync(claudeMd, "# Custom\n", "utf8");
    const result = await runSetup(tempDir, "claude");
    assert.strictEqual(result.code, 0, result.stderr);
    assert.strictEqual(fs.readFileSync(claudeMd, "utf8"), "# Custom\n");
  });

  it("fails with guidance when .codex exists as a file instead of a directory", async () => {
    tempDir = createTempDir();
    fs.writeFileSync(path.join(tempDir, ".codex"), "", "utf8");

    const result = await runSetup(tempDir);
    assert.strictEqual(result.code, 1);
    assert.match(result.stderr, /exists as a file, but a directory is required there/i);
    assert.match(result.stderr, /Remove or rename that file and rerun bootstrap/i);
  });

  it("is idempotent and preserves existing runtime state on repeated setup", async () => {
    tempDir = createTempDir();
    const first = await runSetup(tempDir);
    assert.strictEqual(first.code, 0, first.stderr);

    const stateFile = path.join(tempDir, ".lingxi", "state", "processed-sessions.json");
    const journalFile = path.join(tempDir, ".lingxi", "state", "distill-journal.jsonl");
    const codexConfigFile = path.join(tempDir, ".codex", "config.toml");
    const codexHooksFile = path.join(tempDir, ".codex", "hooks.json");
    const agentsMd = path.join(tempDir, "AGENTS.md");

    const customState = {
      state_schema_version: "v2",
      distill_version: "v3",
      summary: {
        tracked_sessions: 1,
        total_runs: 2,
        written_runs: 1,
        merged_runs: 0,
        skipped_duplicate_runs: 1,
        skipped_no_signal_runs: 0,
        failed_runs: 0,
        reprocessed_runs: 0
      },
      last_run: {
        occurred_at: "2026-04-08T00:00:00.000Z",
        session_id: "session-001",
        operation: "skipped_duplicate",
        run_reason: "duplicate_unchanged",
        content_fingerprint: "sha256:test",
        candidate_count: 1,
        note_count: 1
      },
      sessions: {
        "session-001": {
          content_fingerprint: "sha256:test",
          distilled_at: "2026-04-08T00:00:00.000Z",
          result: "written",
          run_reason: "first_distill",
          candidate_count: 1,
          notes: ["MEM-001"]
        }
      }
    };

    fs.writeFileSync(stateFile, JSON.stringify(customState, null, 2) + "\n", "utf8");
    fs.writeFileSync(journalFile, "{\"ts\":\"2026-04-08T00:00:00.000Z\"}\n", "utf8");
    fs.writeFileSync(agentsMd, "# Existing\n", "utf8");
    fs.writeFileSync(codexConfigFile, "model = \"gpt-5.4\"\n", "utf8");
    fs.writeFileSync(codexHooksFile, JSON.stringify({
      hooks: {
        SessionStart: [
          {
            matcher: "startup|resume",
            hooks: [
              {
                type: "command",
                command: "python3 ~/.codex/hooks/session_start.py"
              }
            ]
          }
        ],
        UserPromptSubmit: [
          {
            hooks: [
              {
                type: "command",
                command: "node \"$(git rev-parse --show-toplevel)/scripts/lx-memory-hook.mjs\""
              }
            ]
          },
          {
            hooks: [
              {
                type: "command",
                command: "python3 ~/.codex/hooks/user_prompt_submit.py"
              }
            ]
          }
        ]
      }
    }, null, 2) + "\n", "utf8");
    fs.writeFileSync(
      path.join(tempDir, ".codex", "agents", "lingxi-session-distill.toml"),
      "legacy agent prompt\n",
      "utf8"
    );

    const second = await runSetup(tempDir);
    assert.strictEqual(second.code, 0, second.stderr);
    assert.deepStrictEqual(
      JSON.parse(fs.readFileSync(stateFile, "utf8")),
      customState
    );
    assert.strictEqual(fs.readFileSync(journalFile, "utf8"), "{\"ts\":\"2026-04-08T00:00:00.000Z\"}\n");
    assert.ok(!fs.existsSync(path.join(tempDir, ".lingxi", "setup", "automation.session-distill.toml")));
    const mergedConfig = fs.readFileSync(codexConfigFile, "utf8");
    const mergedHooks = JSON.parse(fs.readFileSync(codexHooksFile, "utf8"));
    assert.match(mergedConfig, /^model = "gpt-5.4"$/m);
    assert.match(mergedConfig, /\[features\]/);
    assert.match(mergedConfig, /^codex_hooks = true$/m);
    assert.strictEqual(mergedHooks.hooks.SessionStart.length, 1);
    assert.strictEqual(mergedHooks.hooks.UserPromptSubmit.length, 2);
    const lingxiGroups = mergedHooks.hooks.UserPromptSubmit.filter((group) =>
      group.hooks.some((hook) => String(hook.command || "").includes("lx-memory-hook.mjs"))
    );
    assert.strictEqual(lingxiGroups.length, 1);
    const thirdPartyGroups = mergedHooks.hooks.UserPromptSubmit.filter((group) =>
      group.hooks.some((hook) => String(hook.command || "").includes("user_prompt_submit.py"))
    );
    assert.strictEqual(thirdPartyGroups.length, 1);
    assert.match(
      fs.readFileSync(path.join(tempDir, ".codex", "agents", "lingxi-session-distill.toml"), "utf8"),
      /Run `node scripts\/lx-distill-sessions\.mjs`/
    );
    assert.strictEqual(fs.readFileSync(agentsMd, "utf8"), "# Existing\n");
    const summary = JSON.parse(second.stdout);
    assert.strictEqual(summary.wrote_agents_md, false);
  });

  it("rejects invalid --host value", async () => {
    tempDir = createTempDir();
    const result = await runSetup(tempDir, "invalid");
    assert.strictEqual(result.code, 1);
    assert.match(result.stderr, /Invalid --host value/);
  });
});
