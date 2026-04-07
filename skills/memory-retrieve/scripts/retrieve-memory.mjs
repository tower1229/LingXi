#!/usr/bin/env node

import process from "node:process";
import { ensureRuntimeState, loadMemoryNotes, resolveProjectRoot, scoreNote } from "../../../scripts/_lingxi-memory.mjs";

function parseArgs(argv) {
  const args = { projectRoot: null, query: "", limit: 3 };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--project-root") {
      args.projectRoot = argv[i + 1] || null;
      i += 1;
      continue;
    }
    if (arg === "--query") {
      args.query = argv[i + 1] || "";
      i += 1;
      continue;
    }
    if (arg === "--limit") {
      args.limit = Number(argv[i + 1] || "3");
      i += 1;
    }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectRoot = resolveProjectRoot(args.projectRoot);
  const limit = Number.isFinite(args.limit) && args.limit > 0 ? args.limit : 3;
  ensureRuntimeState(projectRoot);
  const notes = loadMemoryNotes(projectRoot);
  const hits = notes
    .map((note) => ({
      ...note,
      score: scoreNote(note, args.query)
    }))
    .filter((note) => note.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, limit)
    .map((note) => ({
      note_id: note.id,
      title: note.title,
      kind: note.kind,
      scope: note.scope,
      score: note.score,
      when_to_load: note.when_to_load,
      one_liner: note.one_liner,
      file: note.file
    }));

  process.stdout.write(
    JSON.stringify(
      {
        query: args.query,
        hit_count: hits.length,
        hits
      },
      null,
      2
    ) + "\n"
  );
}

main();
