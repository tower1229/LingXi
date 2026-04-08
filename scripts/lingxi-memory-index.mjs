#!/usr/bin/env node

import fs from "node:fs";
import process from "node:process";
import {
  buildIndexMarkdown,
  ensureRuntimeState,
  indexPath,
  loadMemoryNotes,
  resolveProjectRoot
} from "./_lingxi-memory.mjs";

function parseArgs(argv) {
  const args = { write: false, projectRoot: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--write") {
      args.write = true;
      continue;
    }
    if (arg === "--project-root") {
      args.projectRoot = argv[i + 1] || null;
      i += 1;
    }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectRoot = resolveProjectRoot(args.projectRoot);
  ensureRuntimeState(projectRoot);

  const notes = loadMemoryNotes(projectRoot);
  const markdown = buildIndexMarkdown(notes, projectRoot);

  if (args.write) {
    fs.writeFileSync(indexPath(projectRoot), markdown, "utf8");
  }

  const summary = {
    project_root: projectRoot,
    note_count: notes.length,
    notes: notes.map((note) => ({
      id: note.id,
      title: note.title,
      kind: note.kind,
      source: note.source,
      file: note.file
    }))
  };

  process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
}

main();
