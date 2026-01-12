import fs from "node:fs/promises";
import path from "node:path";

import {
  getProjectRootFromHookScriptUrl,
  readStdinJson,
} from "./_hook-utils.mjs";

function extractCompoundingCandidates(text) {
  const lines = text.split("\n");
  const startIdx = lines.findIndex(
    (l) => l.includes("复利候选") || l.includes("Compounding Candidates"),
  );
  if (startIdx === -1) return [];

  const candidates = [];
  for (let i = startIdx + 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (line.startsWith("## ")) break;
    if (line.startsWith("### ")) break;
    if (line.startsWith("- [ ]") || line.startsWith("- [x]") || line.startsWith("- ")) {
      const summary = line
        .replace(/^- \[[ x]\]\s*/i, "")
        .replace(/^- /, "")
        .trim();
      if (summary) candidates.push({ summary });
    }
  }

  return candidates.slice(0, 8);
}

async function ensureSessionDir(projectRoot) {
  const dir = path.join(projectRoot, "ai/context/session");
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

async function main() {
  const input = await readStdinJson();
  const text = typeof input.text === "string" ? input.text : "";
  if (!text.trim()) return;

  const candidates = extractCompoundingCandidates(text);
  if (candidates.length === 0) return;

  const projectRoot = getProjectRootFromHookScriptUrl(import.meta.url);
  const sessionDir = await ensureSessionDir(projectRoot);
  const pendingFile = path.join(sessionDir, "pending-compounding-candidates.json");

  const payload = {
    asked: false,
    createdAt: new Date().toISOString(),
    candidates,
  };

  await fs.writeFile(pendingFile, JSON.stringify(payload, null, 2), "utf8");
}

main().catch(() => {
  // 不影响主流程
});

