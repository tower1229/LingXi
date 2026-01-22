import fs from "node:fs/promises";
import path from "node:path";

import {
  getProjectRootFromHookScriptUrl,
  readStdinJson,
  writeStdoutJson,
} from "./_hook-utils.mjs";

async function isProcessed(sessionKey, processedFile) {
  try {
    const raw = await fs.readFile(processedFile, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data.processed) && data.processed.includes(sessionKey);
  } catch {
    return false;
  }
}

async function markProcessed(sessionKey, processedFile) {
  try {
    const raw = await fs.readFile(processedFile, "utf8");
    const data = JSON.parse(raw);
    if (!Array.isArray(data.processed)) {
      data.processed = [];
    }
    if (!data.processed.includes(sessionKey)) {
      data.processed.push(sessionKey);
      await fs.writeFile(processedFile, JSON.stringify(data, null, 2), "utf8");
    }
  } catch {
    // 文件不存在，创建新文件
    const data = { processed: [sessionKey] };
    await fs.mkdir(path.dirname(processedFile), { recursive: true });
    await fs.writeFile(processedFile, JSON.stringify(data, null, 2), "utf8");
  }
}

async function main() {
  const input = await readStdinJson();

  // 只在一次完整循环结束时触发（避免中途插入）
  if (input.status !== "completed") return;

  // Cursor 防无限循环：loop_count 最多允许 5 次 followup
  const loopCount = typeof input.loop_count === "number" ? input.loop_count : 0;
  if (loopCount >= 5) return;

  const projectRoot = getProjectRootFromHookScriptUrl(import.meta.url);

  // 会话去重：基于 conversation_id + generation_id
  const conversationId = input.conversation_id;
  const generationId = input.generation_id;

  if (!conversationId || !generationId) {
    // 缺少必要参数，静默跳过
    return;
  }

  const sessionKey = `${conversationId}-${generationId}`;
  const processedFile = path.join(
    projectRoot,
    ".cursor/.lingxi/workspace/processed-sessions.json",
  );

  // 检查是否已处理
  if (await isProcessed(sessionKey, processedFile)) {
    return; // 已处理，静默跳过
  }

  // 标记为已处理
  await markProcessed(sessionKey, processedFile);

  // 输出 prompt 引导调用 experience-capture skill
  writeStdoutJson({
    followup_message: `请使用 @experience-capture 技能扫描本次对话（conversation_id: ${conversationId}, generation_id: ${generationId}），提取有价值的经验候选。注意过滤：单纯知识解释、临时调试猜测、尚未验证的方案、明显一次性代码。`,
  });
}

main().catch(() => {
  // 不影响主流程
});
