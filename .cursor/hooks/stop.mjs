import fs from "node:fs/promises";
import path from "node:path";

import {
  getProjectRootFromHookScriptUrl,
  readStdinJson,
  writeStdoutJson,
} from "./_hook-utils.mjs";

async function readPendingCandidates(projectRoot) {
  const pendingFile = path.join(
    projectRoot,
    ".cursor/.lingxi/context/session/pending-compounding-candidates.json",
  );
  try {
    const raw = await fs.readFile(pendingFile, "utf8");
    return { pendingFile, data: JSON.parse(raw) };
  } catch {
    return null;
  }
}

function buildFollowupMessage(candidates) {
  const lines = candidates.map((c, i) => `${i + 1}. ${c.summary || c.trigger || `候选 ${i + 1}`}`);
  return [
    "检测到有待沉淀的经验候选。使用 `/remember` 命令查看并选择要沉淀的候选：",
    "",
    "候选列表：",
    ...lines,
    "",
    "使用方式：",
    "- `/remember` - 查看所有候选并选择沉淀",
    "- `/remember 1,3` - 直接选择第 1 和第 3 个候选进行沉淀",
    "- `/remember 全部` - 选择所有候选进行沉淀",
    "",
    "所有候选已暂存在中转文件，不会自动写入经验库。",
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

