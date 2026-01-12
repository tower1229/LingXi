import { readStdinJson, writeStdoutJson } from "./_hook-utils.mjs";

function normalizeCommand(command) {
  return command.trim().replace(/\s+/g, " ");
}

function isNpmFamily(command) {
  return (
    /^npm\b/.test(command) ||
    /^pnpm\b/.test(command) ||
    /\bnpx\b/.test(command)
  );
}

function isDangerous(command) {
  const dangerousPatterns = [
    /\brm\s+-rf\b/,
    /\brm\s+-fr\b/,
    /\bmkfs\./,
    /\bdd\s+if=/,
    /\bshutdown\b/,
    /\breboot\b/,
  ];
  return dangerousPatterns.some((re) => re.test(command));
}

function isGitWrite(command) {
  return (
    /^git\b/.test(command) &&
    (/\bcommit\b/.test(command) ||
      /\bpush\b/.test(command) ||
      /\brebase\b/.test(command) ||
      /\breset\b/.test(command) ||
      /\bcheckout\b/.test(command) ||
      /\bcherry-pick\b/.test(command))
  );
}

async function main() {
  const input = await readStdinJson();
  const command = normalizeCommand(typeof input.command === "string" ? input.command : "");

  if (!command) {
    writeStdoutJson({ continue: true, permission: "allow" });
    return;
  }

  if (isNpmFamily(command)) {
    writeStdoutJson({
      continue: true,
      permission: "deny",
      user_message: "该项目建议统一使用 yarn（已拦截 npm/pnpm/npx）。",
      agent_message:
        "检测到 npm/pnpm/npx 命令。请改用 yarn（例如 `yarn add` / `yarn install` / `yarn run <script>`）。",
    });
    return;
  }

  if (isDangerous(command)) {
    writeStdoutJson({
      continue: true,
      permission: "ask",
      user_message: `检测到高风险命令：${command}。确认要继续吗？`,
      agent_message:
        "该命令可能造成不可逆的数据/文件破坏。请确认目标路径/参数无误后再批准执行。",
    });
    return;
  }

  if (isGitWrite(command)) {
    writeStdoutJson({
      continue: true,
      permission: "ask",
      user_message: `检测到可能修改 git 历史/远端的命令：${command}。确认要继续吗？`,
      agent_message:
        "该命令可能影响仓库历史或推送远端。若只是查看状态请用 `git status` / `git diff`；如确需执行请确认分支与变更无误后批准。",
    });
    return;
  }

  writeStdoutJson({ continue: true, permission: "allow" });
}

main().catch((err) => {
  // Hook 出错时默认放行，避免把工作流“锁死”
  writeStdoutJson({
    continue: true,
    permission: "allow",
    user_message: `Hook 脚本执行异常，已放行（${String(err?.message ?? err)}）`,
  });
});

