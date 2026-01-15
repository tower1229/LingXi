import fs from "node:fs/promises";
import path from "node:path";

import {
  fileExists,
  getProjectRootFromHookScriptUrl,
  readStdinJson,
  writeStdoutJson,
} from "./_hook-utils.mjs";

function parseIndexRow(line) {
  // markdown table row: | a | b | c |
  const trimmed = line.trim();
  if (!trimmed.startsWith("|")) return null;
  const parts = trimmed.split("|").slice(1, -1).map((s) => s.trim());
  if (parts.length < 7) return null;
  const [id, title, status, currentPhase, nextAction, blockers, links] = parts;
  if (!/^REQ-\d{3,}$/.test(id)) return null;
  return { id, title, status, currentPhase, nextAction, blockers, links, parts };
}

async function archiveCompletedRequirements(projectRoot) {
  const indexPath = path.join(projectRoot, ".workflow/requirements/INDEX.md");
  let raw;
  try {
    raw = await fs.readFile(indexPath, "utf8");
  } catch {
    return;
  }

  const inProgressDir = path.join(projectRoot, ".workflow/requirements/in-progress");
  const completedDir = path.join(projectRoot, ".workflow/requirements/completed");
  await fs.mkdir(completedDir, { recursive: true });

  const lines = raw.split(/\r?\n/);
  let changed = false;

  for (let i = 0; i < lines.length; i += 1) {
    const row = parseIndexRow(lines[i]);
    if (!row) continue;
    if (row.status !== "completed") continue;

    // Move artifacts if they still live in in-progress/
    const artifacts = [`${row.id}.md`, `${row.id}.plan.md`, `${row.id}.review.md`];
    for (const filename of artifacts) {
      const src = path.join(inProgressDir, filename);
      const dst = path.join(completedDir, filename);
      if (await fileExists(src)) {
        // If dst already exists, keep it (avoid accidental overwrite).
        if (!(await fileExists(dst))) {
          await fs.rename(src, dst);
        }
      }
    }

    // Keep INDEX links consistent with archived location.
    const linksUpdated = row.links
      .replaceAll(
        `.workflow/requirements/in-progress/${row.id}`,
        `.workflow/requirements/completed/${row.id}`,
      )
      .replaceAll(
        `.workflow\\requirements\\in-progress\\${row.id}`,
        `.workflow\\requirements\\completed\\${row.id}`,
      );

    if (linksUpdated !== row.links) {
      row.parts[6] = linksUpdated;
      lines[i] = `| ${row.parts.join(" | ")} |`;
      changed = true;
    }
  }

  if (changed) {
    await fs.writeFile(indexPath, lines.join("\n"), "utf8");
  }
}

async function readPendingCandidates(projectRoot) {
  const pendingFile = path.join(
    projectRoot,
    ".workflow/context/session/pending-compounding-candidates.json",
  );
  try {
    const raw = await fs.readFile(pendingFile, "utf8");
    return { pendingFile, data: JSON.parse(raw) };
  } catch {
    return null;
  }
}

function buildFollowupMessage(candidates) {
  const lines = candidates.map((c, i) => `${i + 1}. ${c.summary}`);
  return [
    '检测到本轮输出包含可沉淀的"复利候选"。请先向我确认是否要写入知识库（.workflow/context/experience/）。',
    "",
    "候选列表：",
    ...lines,
    "",
    "请直接输入编号选择要沉淀的候选：",
    "- `1,3` 或 `1 3`：选择第 1 和第 3 个候选",
    "- `全部` 或 `all`：选择所有候选",
    "",
    "约束：在你确认前，不得写入 .workflow/context/experience/。",
  ].join("\n");
}

async function main() {
  const input = await readStdinJson();

  // 只在一次完整循环结束时触发（避免中途插入）
  if (input.status !== "completed") return;

  // Cursor 防无限循环：loop_count 最多允许 5 次 followup
  const loopCount = typeof input.loop_count === "number" ? input.loop_count : 0;
  if (loopCount >= 5) return;

  const projectRoot = getProjectRootFromHookScriptUrl(import.meta.url);

  // Housekeeping：将已完成的 REQ 归档到 completed/，并同步修正 INDEX Links
  try {
    await archiveCompletedRequirements(projectRoot);
  } catch {
    // 不影响主流程
  }

  const pending = await readPendingCandidates(projectRoot);
  if (!pending) return;

  const { pendingFile, data } = pending;
  if (!data || data.asked === true) return;
  if (!Array.isArray(data.candidates) || data.candidates.length === 0) return;

  // 标记已提醒，防止重复 followup
  await fs.writeFile(
    pendingFile,
    JSON.stringify({ ...data, asked: true }, null, 2),
    "utf8",
  );

  writeStdoutJson({
    followup_message: buildFollowupMessage(data.candidates),
  });
}

main().catch(() => {
  // 不影响主流程
});

