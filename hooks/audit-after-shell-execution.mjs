import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { readStdinJson } from "./_hook-utils.mjs";

async function main() {
  const input = await readStdinJson();
  const logPath = path.join(os.tmpdir(), "cursor-workflow-hooks.audit.log");

  const record = {
    ts: new Date().toISOString(),
    event: "afterShellExecution",
    command: input.command ?? null,
    duration: input.duration ?? null,
    // output 可能很长，默认只记录前 4000 字符，避免日志爆炸
    output_head: typeof input.output === "string" ? input.output.slice(0, 4000) : null,
  };

  await fs.appendFile(logPath, `${JSON.stringify(record)}\n`, "utf8");
}

main().catch(() => {
  // 审计失败不影响主流程
});

