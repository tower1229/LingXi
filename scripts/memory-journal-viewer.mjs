#!/usr/bin/env node
/**
 * Memory Journal Viewer - 查看记忆写入历史。
 * 用法: node memory-journal-viewer.mjs [--project-root <path>] [--limit <n>] [--type <event-type>]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PROJECT_ROOT = process.cwd();
const JOURNAL_REL = ".lingxi/os/MEMORY_JOURNAL.jsonl";

const args = process.argv.slice(2);
let projectRoot = DEFAULT_PROJECT_ROOT;
let limit = 20;
let typeFilter = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--project-root" && args[i + 1]) {
    projectRoot = path.resolve(args[i + 1]);
    i++;
  } else if (args[i] === "--limit" && args[i + 1]) {
    limit = parseInt(args[i + 1], 10) || 20;
    i++;
  } else if (args[i] === "--type" && args[i + 1]) {
    typeFilter = args[i + 1];
    i++;
  }
}

const journalPath = path.join(projectRoot, JOURNAL_REL);

if (!fs.existsSync(journalPath)) {
  console.log(`📭 No MEMORY_JOURNAL found at: ${journalPath}`);
  console.log("   (Memory writes will create this file on first use)");
  process.exit(0);
}

function parseJournalLine(line) {
  try {
    return JSON.parse(line.trim());
  } catch {
    return null;
  }
}

function formatRow(event) {
  const timestamp = event.timestamp || "";
  const type = event.event_type || "unknown";
  const noteId = event.note_id || "-";
  const source = event.source || "-";
  const action = event.action || "-";
  return `${timestamp.slice(0, 19).replace("T", " ")} | ${type.padEnd(25)} | ${noteId.padEnd(10)} | ${source.padEnd(12)} | ${action}`;
}

// 读取并解析日志
const content = fs.readFileSync(journalPath, "utf8");
const lines = content.split("\n").filter((l) => l.trim());
const events = lines.map(parseJournalLine).filter(Boolean);

// 过滤
let filtered = events;
if (typeFilter) {
  filtered = events.filter((e) => e.event_type === typeFilter);
}

// 排序（按时间戳降序）
filtered.sort((a, b) => {
  const ta = a.timestamp || "";
  const tb = b.timestamp || "";
  return tb.localeCompare(ta);
});

// 限制数量
const display = filtered.slice(0, limit);

// 输出
console.log("\n📒 Memory Journal");
console.log("=".repeat(90));
console.log(`${"Timestamp".padEnd(20)} | ${"Event Type".padEnd(25)} | ${"Note ID".padEnd(10)} | ${"Source".padEnd(12)} | Action`);
console.log("-".repeat(90));

if (display.length === 0) {
  console.log("  (No events found)");
} else {
  display.forEach((e) => console.log(formatRow(e)));
}

console.log("-".repeat(90));
console.log(`Total: ${events.length} events${typeFilter ? ` (filtered: ${filtered.length})` : ""}, showing ${display.length}`);

// 统计
if (!typeFilter) {
  const typeCount = {};
  events.forEach((e) => {
    const t = e.event_type || "unknown";
    typeCount[t] = (typeCount[t] || 0) + 1;
  });
  console.log("\n📊 Event Type Stats:");
  Object.entries(typeCount)
    .sort((a, b) => b[1] - a[1])
    .forEach(([t, count]) => {
      console.log(`   ${t}: ${count}`);
    });
}

console.log("");
