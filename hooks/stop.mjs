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
    "ai/context/session/pending-compounding-candidates.json",
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
    "检测到本轮输出包含可沉淀的“复利候选”。请先向我确认是否要写入知识库（ai/context/experience/）。",
    "",
    "候选列表：",
    ...lines,
    "",
    "请用以下格式回复（继续使用单入口 /flow）：",
    "- `/flow 沉淀 1,3`：沉淀第 1 和第 3 条",
    "- `/flow 沉淀 全部`：沉淀全部",
    "- `/flow 忽略沉淀`：忽略并清空候选",
    "",
    "约束：在你确认前，不得写入 ai/context/experience/。",
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

