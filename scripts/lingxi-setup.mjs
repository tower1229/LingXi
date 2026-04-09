#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { buildIndexMarkdown, defaultProcessedSessionsState, ensureDirectoryPath, ensureLingxiLayout, processedSessionsPath, distillJournalPath } from "./_lingxi-memory.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const targetRoot = path.resolve(process.env.CODEX_PROJECT_DIR || process.cwd());

function resolveTarget(...parts) {
  return path.join(targetRoot, ...parts);
}

function ensureDir(targetPath) {
  ensureDirectoryPath(targetPath);
}

function writeIfMissing(targetPath, content) {
  if (fs.existsSync(targetPath)) {
    return false;
  }
  ensureDir(path.dirname(targetPath));
  fs.writeFileSync(targetPath, content, "utf8");
  return true;
}

function renderTemplate(relativePath, replacements = {}) {
  const templatePath = path.join(repoRoot, "templates", ...relativePath.split("/"));
  let content = fs.readFileSync(templatePath, "utf8");
  for (const [key, value] of Object.entries(replacements)) {
    content = content.replaceAll(key, value);
  }
  return content;
}

function defaultAgentsMd() {
  return `# LingXi Runtime

This repository includes a local LingXi 2.0 runtime.

- Runtime root: \`.lingxi/\`
- Memory index: \`.lingxi/memory/INDEX.md\`
- Project memory notes: \`.lingxi/memory/project/\`
- Shared memory notes: \`.lingxi/memory/share/\`
- Distill state: \`.lingxi/state/processed-sessions.json\`
- Distill journal: \`.lingxi/state/distill-journal.jsonl\`
- Background agent definition: \`.codex/agents/lingxi-session-distill.toml\`
- Generated automation config: \`.lingxi/setup/automation.session-distill.toml\`
- Codex distill runner: \`node scripts/lx-distill-sessions.mjs\`

LingXi provides dedicated workflows for:

- task definition (\`task\`)
- task vetting (\`vet\`)

Global memory rule:

- Persist only durable, reusable engineering taste.
- Do not store one-off implementation details as memory.
- Exclude session-distill automation/self-distillation sessions from background memory selection.
- Treat \`.codex/agents/\` and generated automation artifacts as Codex runtime adapters over LingXi memory core.

Memory consumption rule:

- Before meaningful repository work, load LingXi memory with \`node scripts/lx-memory-brief.mjs --prompt "<current request>"\`.
- Apply only the smallest relevant memory set.
- Skip trivial or non-repository conversation turns.
`;
}

function main() {
  ensureLingxiLayout(targetRoot);

  writeIfMissing(
    resolveTarget(".lingxi", "memory", "INDEX.md"),
    buildIndexMarkdown([], targetRoot)
  );

  writeIfMissing(
    processedSessionsPath(targetRoot),
    JSON.stringify(defaultProcessedSessionsState(), null, 2) + "\n"
  );

  writeIfMissing(
    distillJournalPath(targetRoot),
    ""
  );

  writeIfMissing(
    resolveTarget(".codex", "agents", "lingxi-session-distill.toml"),
    renderTemplate("agents/lingxi-session-distill.toml.tmpl")
  );

  writeIfMissing(
    resolveTarget(".lingxi", "setup", "automation.session-distill.toml"),
    renderTemplate("automations/session-distill.toml.tmpl", {
      "__PROJECT_ROOT__": targetRoot
    })
  );

  const agentsMdPath = resolveTarget("AGENTS.md");
  const wroteAgentsMd = writeIfMissing(agentsMdPath, defaultAgentsMd());

  const summary = {
    target_root: targetRoot,
    created_runtime_root: fs.existsSync(resolveTarget(".lingxi")),
    wrote_agents_md: wroteAgentsMd,
    default_distill_rrule: "FREQ=HOURLY;INTERVAL=6",
    automation_registration_required: true,
    automation_create_command: "node scripts/lx-create-automation.mjs",
    files: [
      ".lingxi/memory/INDEX.md",
      ".lingxi/state/processed-sessions.json",
      ".lingxi/state/distill-journal.jsonl",
      ".codex/agents/lingxi-session-distill.toml",
      ".lingxi/setup/automation.session-distill.toml"
    ]
  };

  process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
}

main();
