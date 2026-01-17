import { readStdinJson, writeStdoutJson } from "./_hook-utils.mjs";

async function main() {
  // 该 hook 仅作为占位符保留，不执行任何检查
  // workflow 不负责包管理器选择、命令风险判断等用户偏好相关的事项
  const input = await readStdinJson();
  writeStdoutJson({ continue: true, permission: "allow" });
}

main().catch((err) => {
  // Hook 出错时默认放行，避免把工作流"锁死"
  writeStdoutJson({
    continue: true,
    permission: "allow",
    user_message: `Hook 脚本执行异常，已放行（${String(err?.message ?? err)}）`,
  });
});
