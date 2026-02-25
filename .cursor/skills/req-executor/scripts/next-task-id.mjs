#!/usr/bin/env node
/**
 * 生成下一个任务编号（三位数）。
 * 扫描 .cursor/.lingxi/tasks/ 下 *.req.*.md 文件，取最大编号 +1。
 * 输出：001～999，超出 999 时输出 999 并退出码 1。
 */
import fs from "node:fs";
import path from "node:path";

const TASKS_DIR = path.join(process.cwd(), ".cursor", ".lingxi", "tasks");
const REQ_PATTERN = /^(\d{3})\.req\..*\.md$/;
const MAX_ID = 999;

let files = [];
try {
  files = fs.readdirSync(TASKS_DIR);
} catch (err) {
  if (err.code === "ENOENT") {
    console.log("001");
    process.exit(0);
  }
  console.error(err.message);
  process.exit(1);
}

const ids = files
  .filter((f) => REQ_PATTERN.test(f))
  .map((f) => parseInt(f.slice(0, 3), 10));
const max = ids.length ? Math.max(...ids) : 0;
const next = max + 1;

if (next > MAX_ID) {
  console.error(`任务编号已达上限 ${MAX_ID}，请归档旧任务`);
  console.log(String(MAX_ID).padStart(3, "0"));
  process.exit(1);
}

console.log(String(next).padStart(3, "0"));
