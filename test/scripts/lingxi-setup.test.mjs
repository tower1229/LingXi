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

function runSetup(projectRoot) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
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

  it("creates the runtime skeleton", async () => {
    tempDir = createTempDir();
    const result = await runSetup(tempDir);
    assert.strictEqual(result.code, 0, result.stderr);
    assert.ok(fs.existsSync(path.join(tempDir, ".lingxi", "memory", "INDEX.md")));
    assert.ok(!fs.existsSync(path.join(tempDir, ".lingxi", "state", "memory-ops.jsonl")));
    assert.ok(fs.existsSync(path.join(tempDir, ".codex", "config.toml")));
    assert.ok(fs.existsSync(path.join(tempDir, ".codex", "hooks.json")));
    assert.ok(fs.existsSync(path.join(tempDir, ".codex", "agents", "lingxi-session-distill.toml")));
    assert.ok(fs.existsSync(path.join(tempDir, "AGENTS.md")));
    const agents = fs.readFileSync(path.join(tempDir, "AGENTS.md"), "utf8");
    const codexConfig = fs.readFileSync(path.join(tempDir, ".codex", "config.toml"), "utf8");
    const codexHooks = JSON.parse(fs.readFileSync(path.join(tempDir, ".codex", "hooks.json"), "utf8"));
    const distillAgent = fs.readFileSync(path.join(tempDir, ".codex", "agents", "lingxi-session-distill.toml"), "utf8");
    const state = JSON.parse(fs.readFileSync(path.join(tempDir, ".lingxi", "state", "processed-sessions.json"), "utf8"));
    const automation = fs.readFileSync(path.join(tempDir, ".lingxi", "setup", "automation.session-distill.toml"), "utf8");
    const summary = JSON.parse(result.stdout);
    assert.strictEqual(summary.default_distill_rrule, "FREQ=HOURLY;INTERVAL=6");
    assert.strictEqual(summary.automation_registration_required, true);
    assert.strictEqual(summary.automation_create_command, "node scripts/lx-create-automation.mjs");
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
    assert.match(automation, /rrule = "FREQ=HOURLY;INTERVAL=6"/);
    assert.match(automation, /agent = "\.codex\/agents\/lingxi-session-distill\.toml"/);
    assert.match(automation, /state_file = "\.lingxi\/state\/processed-sessions\.json"/);
    assert.match(automation, /journal_file = "\.lingxi\/state\/distill-journal\.jsonl"/);
    assert.match(automation, /lx-distill-sessions\.mjs/);
    assert.match(codexConfig, /\[features\]/);
    assert.match(codexConfig, /^codex_hooks = true$/m);
    assert.ok(Array.isArray(codexHooks.hooks?.UserPromptSubmit));
    assert.strictEqual(codexHooks.hooks.UserPromptSubmit.length, 1);
    assert.strictEqual(codexHooks.hooks.UserPromptSubmit[0].hooks[0].type, "command");
    assert.match(codexHooks.hooks.UserPromptSubmit[0].hooks[0].command, /lx-memory-hook\.mjs/);
    assert.match(agents, /Runtime root: `\.lingxi\/`/);
    assert.match(agents, /Memory index: `\.lingxi\/memory\/INDEX\.md`/);
    assert.match(agents, /Codex hook config: `\.codex\/config\.toml`/);
    assert.match(agents, /Codex hook definitions: `\.codex\/hooks\.json`/);
    assert.match(agents, /Background agent definition: `\.codex\/agents\/lingxi-session-distill\.toml`/);
    assert.match(agents, /Codex distill runner: `node scripts\/lx-distill-sessions\.mjs`/);
    assert.match(agents, /task definition \(`task`\)/);
    assert.match(agents, /task vetting \(`vet`\)/);
    assert.match(agents, /Persist only durable, reusable engineering taste\./);
    assert.match(agents, /Exclude session-distill automation\/self-distillation sessions from background memory selection\./);
    assert.match(agents, /Codex runtime adapters over LingXi memory core\./);
    assert.match(agents, /LingXi memory is injected automatically for meaningful repository turns through repo-local Codex hooks when hooks are active\./);
    assert.match(agents, /Skip trivial or non-repository conversation turns\./);
    assert.match(agents, /does not execute hooks natively on Windows yet/);
    assert.match(distillAgent, /Run `node scripts\/lx-distill-sessions\.mjs`/);
    assert.match(distillAgent, /Do not bypass the runner by manually reading Codex session artifacts\./);
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
    const automationFile = path.join(tempDir, ".lingxi", "setup", "automation.session-distill.toml");
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
    fs.writeFileSync(
      automationFile,
      "prompt = \"Analyze recent Codex sessions manually.\"\n",
      "utf8"
    );

    const second = await runSetup(tempDir);
    assert.strictEqual(second.code, 0, second.stderr);
    assert.deepStrictEqual(
      JSON.parse(fs.readFileSync(stateFile, "utf8")),
      customState
    );
    assert.strictEqual(fs.readFileSync(journalFile, "utf8"), "{\"ts\":\"2026-04-08T00:00:00.000Z\"}\n");
    assert.match(fs.readFileSync(automationFile, "utf8"), /rrule = "FREQ=HOURLY;INTERVAL=6"/);
    assert.match(fs.readFileSync(automationFile, "utf8"), /lx-distill-sessions\.mjs/);
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
});
