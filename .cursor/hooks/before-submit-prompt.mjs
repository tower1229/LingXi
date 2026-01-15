import path from "node:path";

import {
  fileExists,
  getProjectRootFromHookScriptUrl,
  readStdinJson,
  writeStdoutJson,
} from "./_hook-utils.mjs";

function extractReqId(prompt) {
  const match = prompt.match(/\bREQ-\d{3,}\b/);
  return match?.[0] ?? null;
}

async function main() {
  const input = await readStdinJson();
  const prompt = typeof input.prompt === "string" ? input.prompt : "";

  const trimmed = prompt.trim();
  if (!(trimmed === "/flow" || trimmed.startsWith("/flow "))) {
    writeStdoutJson({ continue: true });
    return;
  }

  // /flow 支持三种参数形态：
  // - /flow REQ-xxx（继续某个需求）
  // - /flow <描述>（创建新需求）
  // - /flow（空参数，自动查找进行中任务）
  // 空参数时让 Agent 处理（由 flow-router skill 实现自动查找逻辑）

  const projectRoot = getProjectRootFromHookScriptUrl(import.meta.url);
  const reqId = extractReqId(trimmed);
  if (reqId) {
    const inProgressRequirementPath = path.join(
      projectRoot,
      ".workflow/requirements/in-progress",
      `${reqId}.md`,
    );
    const completedRequirementPath = path.join(
      projectRoot,
      ".workflow/requirements/completed",
      `${reqId}.md`,
    );

    // Fail Fast：如果用户明确指定了 REQ，但本地不存在，就先拦住，避免无效执行
    if (
      !(await fileExists(inProgressRequirementPath)) &&
      !(await fileExists(completedRequirementPath))
    ) {
      writeStdoutJson({
        continue: false,
        user_message:
          `未找到 Requirement：\n` +
          `- ${path.relative(projectRoot, inProgressRequirementPath)}\n` +
          `- ${path.relative(projectRoot, completedRequirementPath)}\n` +
          "如果你是要创建新需求，请用：/flow <需求描述>（不要只给 REQ）。\n" +
          "如果你是要继续已有需求，请先确保对应文件存在（或把 REQ 写回到 .workflow/requirements/INDEX.md 后再试）。",
      });
      return;
    }
  }

  writeStdoutJson({ continue: true });
}

main().catch((err) => {
  // Hook 出错时默认放行，避免把工作流"锁死"
  writeStdoutJson({
    continue: true,
    user_message: `Hook 脚本执行异常，已放行（${String(err?.message ?? err)}）`,
  });
});
