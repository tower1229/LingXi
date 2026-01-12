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

function detectSecretLike(prompt) {
  const patterns = [
    { name: "AWS Access Key", re: /\bAKIA[0-9A-Z]{16}\b/ },
    { name: "GitHub Token", re: /\bghp_[A-Za-z0-9]{20,}\b/ },
    { name: "OpenAI Key", re: /\bsk-[A-Za-z0-9]{20,}\b/ },
    { name: "Private Key Block", re: /BEGIN (RSA|OPENSSH|EC) PRIVATE KEY/ },
    { name: "Slack Token", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  ];

  for (const p of patterns) {
    if (p.re.test(prompt)) return p.name;
  }
  return null;
}

async function main() {
  const input = await readStdinJson();
  const prompt = typeof input.prompt === "string" ? input.prompt : "";

  const secretLike = detectSecretLike(prompt);
  if (secretLike) {
    writeStdoutJson({
      continue: false,
      user_message: `检测到可能的敏感信息（${secretLike}）。请先移除/打码后再提交。`,
    });
    return;
  }

  const trimmed = prompt.trim();
  if (!(trimmed === "/flow" || trimmed.startsWith("/flow "))) {
    writeStdoutJson({ continue: true });
    return;
  }

  // /flow 支持两种参数形态：
  // - /flow REQ-xxx（继续某个需求）
  // - /flow <描述>（创建新需求）
  // 但不允许空参数：/flow
  if (trimmed === "/flow") {
    writeStdoutJson({
      continue: false,
      user_message: "用法：/flow <REQ-xxx|需求描述>（例如：/flow REQ-001 或 /flow 实现用户登录）",
    });
    return;
  }

  const projectRoot = getProjectRootFromHookScriptUrl(import.meta.url);
  const reqId = extractReqId(trimmed);
  if (reqId) {
    const requirementPath = path.join(
      projectRoot,
      ".workflow/requirements/in-progress",
      `${reqId}.md`,
    );

    // Fail Fast：如果用户明确指定了 REQ，但本地不存在，就先拦住，避免“空转”
    if (!(await fileExists(requirementPath))) {
      writeStdoutJson({
        continue: false,
        user_message:
          `未找到 Requirement：${path.relative(projectRoot, requirementPath)}。\n` +
          "如果你是要创建新需求，请用：/flow <需求描述>（不要只给 REQ）。\n" +
          "如果你是要继续已有需求，请先确保对应文件存在（或把 REQ 写回到 .workflow/requirements/INDEX.md 后再试）。",
      });
      return;
    }
  }

  writeStdoutJson({ continue: true });
}

main().catch((err) => {
  // Hook 出错时默认放行，避免把工作流“锁死”
  writeStdoutJson({
    continue: true,
    user_message: `Hook 脚本执行异常，已放行（${String(err?.message ?? err)}）`,
  });
});

