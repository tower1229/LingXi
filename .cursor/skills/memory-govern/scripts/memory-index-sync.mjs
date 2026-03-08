#!/usr/bin/env node
/**
 * memory-index-sync.mjs
 * 仅服务 memory-govern Skill：扫描 memory/project 与 memory/share 及 INDEX，删除孤儿索引行并写回 INDEX，
 * 向 stdout 输出一行 JSON（orphanDeleted、unindexedNotes、duplicateIds）供 Agent 解析。
 * 用法：node memory-index-sync.mjs [--root <memoryRoot>]
 */
import fs from "node:fs";
import path from "node:path";

function toPosixPath(p) {
  return p.split(path.sep).join("/");
}

function extractMetaValue(lines, key) {
  const patterns = [
    new RegExp(`^\\s*-\\s*\\*\\*${key}\\*\\*:\\s*(.+)\\s*$`),
    new RegExp(`^\\s*-\\s*${key}:\\s*(.+)\\s*$`),
  ];
  for (const line of lines) {
    for (const re of patterns) {
      const m = line.match(re);
      if (m) return m[1].trim();
    }
  }
  return "";
}

function extractTitle(lines) {
  for (const line of lines) {
    if (line.startsWith("# ")) return line.replace(/^#\s+/, "").trim();
  }
  return "";
}

function extractWhenToLoad(lines) {
  let inSection = false;
  const items = [];
  for (const line of lines) {
    if (line.trim().toLowerCase() === "## when to load") {
      inSection = true;
      continue;
    }
    if (!inSection) continue;
    if (line.startsWith("## ")) break;
    const trimmed = line.trim().replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "").trim();
    if (trimmed) items.push(trimmed);
  }
  return items.join("；").slice(0, 160);
}

function listMarkdownFilesRecursive(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listMarkdownFilesRecursive(abs));
    else if (e.isFile() && e.name.endsWith(".md")) out.push(abs);
  }
  return out;
}

function parseIndex(indexPath) {
  if (!fs.existsSync(indexPath)) return { header: null, headerLine: null, rows: [], introLines: [] };
  const content = fs.readFileSync(indexPath, "utf8");
  const lines = content.split("\n");
  let inMemories = false;
  let headerLineIndex = -1;
  let header = null;
  const rows = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/^##\s+Memories\b/)) {
      inMemories = true;
      continue;
    }
    if (!inMemories) continue;
    if (headerLineIndex === -1 && line.includes("| Id |")) {
      header = line.split("|").slice(1, -1).map((s) => s.trim());
      headerLineIndex = i;
      continue;
    }
    if (headerLineIndex !== -1 && i > headerLineIndex + 1) {
      if (!line.match(/^\|.*\|$/)) continue;
      const parts = line.split("|").slice(1, -1).map((s) => s.trim());
      if (!parts[0] || parts[0] === "---") continue;
      rows.push(parts);
    }
  }

  const introLines = headerLineIndex >= 0 ? lines.slice(0, headerLineIndex) : lines;
  const headerLine = header ? `| ${header.join(" | ")} |` : null;
  const sepLine = header ? `| ${header.map(() => "---").join(" | ")} |` : null;
  return { header, headerLine, sepLine, rows, introLines };
}

function createContext(memoryRoot) {
  const normalizedRoot = path.resolve(memoryRoot);
  const baseDir = path.dirname(normalizedRoot);
  return {
    memoryRoot: normalizedRoot,
    baseDir,
    indexPath: path.join(normalizedRoot, "INDEX.md"),
    projectDir: path.join(normalizedRoot, "project"),
    shareDir: path.join(normalizedRoot, "share"),
  };
}

function scanNotesDir(dir, relPrefix, sourceDir) {
  if (!fs.existsSync(dir)) return [];
  const files = listMarkdownFilesRecursive(dir);
  return files.map((filePath) => {
    const relFromDir = toPosixPath(path.relative(dir, filePath));
    const rel = `${relPrefix}${relFromDir}`;
    const lines = fs.readFileSync(filePath, "utf8").split("\n");
    const id = extractMetaValue(lines, "Id") || path.basename(filePath, ".md");
    const kind = extractMetaValue(lines, "Kind") || "other";
    const status = extractMetaValue(lines, "Status") || "active";
    const strength = extractMetaValue(lines, "Strength") || "hypothesis";
    const scope = extractMetaValue(lines, "Scope") || "medium";
    const title = extractTitle(lines) || id;
    const whenToLoad = extractWhenToLoad(lines);
    return {
      id,
      kind,
      title,
      whenToLoad,
      status,
      strength,
      scope,
      file: `\`${rel}\``,
      relFromNotes: relFromDir,
      sourceDir,
      filePath,
    };
  });
}

function scanNotes(ctx) {
  const fromProject = scanNotesDir(ctx.projectDir, "memory/project/", "project");
  const fromShare = scanNotesDir(ctx.shareDir, "memory/share/", "share");
  return fromProject.concat(fromShare);
}

function dedupeNotesById(notes) {
  const groups = new Map();
  for (const n of notes) {
    if (!groups.has(n.id)) groups.set(n.id, []);
    groups.get(n.id).push(n);
  }
  const deduped = [];
  const duplicates = [];
  const topLevelName = (id) => `${id}.md`;
  for (const [id, list] of groups.entries()) {
    if (list.length === 1) {
      deduped.push(list[0]);
      continue;
    }
    const sorted = [...list].sort((a, b) => {
      const aTop = a.relFromNotes === topLevelName(id) ? 0 : 1;
      const bTop = b.relFromNotes === topLevelName(id) ? 0 : 1;
      if (aTop !== bTop) return aTop - bTop;
      const aShare = a.sourceDir === "share" ? 1 : 0;
      const bShare = b.sourceDir === "share" ? 1 : 0;
      if (aShare !== bShare) return aShare - bShare;
      return a.relFromNotes.split("/").length - b.relFromNotes.split("/").length || a.relFromNotes.localeCompare(b.relFromNotes);
    });
    deduped.push(sorted[0]);
    duplicates.push({ id, winner: sorted[0].sourceDir + "/" + sorted[0].relFromNotes, all: sorted.map((x) => x.sourceDir + "/" + x.relFromNotes) });
  }
  return { deduped, duplicates };
}

function main() {
  const args = process.argv.slice(2);
  let root = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--root" && args[i + 1]) {
      root = args[i + 1];
      break;
    }
    if (args[i].startsWith("--root=")) {
      root = args[i].slice("--root=".length);
      break;
    }
  }
  const defaultRoot = path.join(process.cwd(), ".cursor", ".lingxi", "memory");
  const memoryRoot = root ? path.resolve(root) : defaultRoot;

  const ctx = createContext(memoryRoot);
  if (!fs.existsSync(ctx.memoryRoot)) {
    const out = { orphanDeleted: [], unindexedNotes: [], duplicateIds: [] };
    process.stdout.write(JSON.stringify(out) + "\n");
    process.exit(0);
  }

  const existing = parseIndex(ctx.indexPath);
  const scanned = scanNotes(ctx);
  const { deduped: notes, duplicates } = dedupeNotesById(scanned);
  const noteIds = new Set(notes.map((n) => n.id));
  const indexedIds = new Set();

  const idCol = existing.header ? existing.header.indexOf("Id") : 0;
  const statusCol = existing.header ? Math.max(existing.header.indexOf("Status"), 4) : 4;
  const fileCol = existing.header ? Math.max(existing.header.indexOf("File"), existing.header.length - 1) : 8;

  const keptRows = [];
  const orphanDeleted = [];

  for (const row of existing.rows) {
    if (row.length <= Math.max(idCol, fileCol)) continue;
    const id = row[idCol];
    const status = (row[statusCol] || "").trim() || "active";
    const fileRaw = (row[fileCol] || "").replace(/^`|`$/g, "").trim();
    indexedIds.add(id);

    if (status === "active") {
      const fileExists = fileRaw ? fs.existsSync(path.join(ctx.baseDir, fileRaw)) : false;
      const noteExists = noteIds.has(id);
      if (!fileExists || !noteExists) {
        orphanDeleted.push(id);
        continue;
      }
    }
    keptRows.push(row);
  }

  const unindexedNotes = notes
    .filter((n) => !indexedIds.has(n.id))
    .map((n) => ({
      filePath: path.relative(process.cwd(), n.filePath) || n.filePath,
      relFromNotes: n.relFromNotes,
      id: n.id || undefined,
      title: n.title || undefined,
      whenToLoad: n.whenToLoad || undefined,
      kind: n.kind || undefined,
      status: n.status || undefined,
      strength: n.strength || undefined,
      scope: n.scope || undefined,
    }));

  if (orphanDeleted.length > 0 && existing.header && existing.introLines && keptRows.length >= 0) {
    const intro = existing.introLines.join("\n");
    const tableHeader = existing.headerLine + "\n" + existing.sepLine;
    const tableBody = keptRows.map((r) => `| ${r.join(" | ")} |`).join("\n");
    const newContent = intro + "\n" + tableHeader + "\n" + tableBody + "\n\n";
    fs.writeFileSync(ctx.indexPath, newContent, "utf8");
  }

  const result = {
    orphanDeleted,
    unindexedNotes,
    duplicateIds: duplicates,
  };
  process.stdout.write(JSON.stringify(result) + "\n");
}

main();
