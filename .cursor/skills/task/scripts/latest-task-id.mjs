#!/usr/bin/env node
/**
 * 获取最新任务编号（三位数）。
 * 扫描 .lingxi/tasks/ 下 *.task.*.md 文件，输出最大编号。
 * 输出：001～999；未找到任务文件时退出码 1。
 */
import fs from "node:fs";
import path from "node:path";

const TASKS_DIR = path.join(process.cwd(), ".lingxi", "tasks");
const TASK_PATTERN = /^(\d{3})\.task\..*\.md$/;

let files = [];
try {
  files = fs.readdirSync(TASKS_DIR);
} catch (err) {
  if (err.code === "ENOENT") {
    console.error("未找到任务目录，请先创建任务文档");
    process.exit(1);
  }
  console.error(err.message);
  process.exit(1);
}

const ids = files
  .filter((f) => TASK_PATTERN.test(f))
  .map((f) => parseInt(f.slice(0, 3), 10));

if (!ids.length) {
  console.error("未找到 task 文档，请先创建任务文档");
  process.exit(1);
}

const latest = Math.max(...ids);
console.log(String(latest).padStart(3, "0"));
