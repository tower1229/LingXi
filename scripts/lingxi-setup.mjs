#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const targetRoot = path.resolve(process.env.CODEX_PROJECT_DIR || process.cwd());

const runtimeDirs = [
  ".lingxi/tasks",
  ".lingxi/memory/project",
  ".lingxi/memory/share",
  ".lingxi/state",
  ".lingxi/setup",
  ".codex/agents"
];

function resolveTarget(...parts) {
  return path.join(targetRoot, ...parts);
}

function ensureDir(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
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

When working in this repository:

1. Retrieve relevant LingXi memory before task or vet work.
2. Use LingXi task workflow for task definition.
3. Use LingXi vet workflow for task review.
4. Persist only durable, reusable engineering taste into LingXi memory.
5. Do not store one-off implementation details as memory.
`;
}

function main() {
  for (const dir of runtimeDirs) {
    ensureDir(resolveTarget(...dir.split("/")));
  }

  writeIfMissing(
    resolveTarget(".lingxi", "memory", "INDEX.md"),
    renderTemplate("memory/INDEX.default.md")
  );

  writeIfMissing(
    resolveTarget(".lingxi", "state", "processed-sessions.json"),
    JSON.stringify({ processed_session_ids: [] }, null, 2) + "\n"
  );

  writeIfMissing(
    resolveTarget(".lingxi", "state", "distill-journal.jsonl"),
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
