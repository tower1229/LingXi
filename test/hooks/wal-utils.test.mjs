/**
 * WAL Utils 并发安全测试。
 * 验证 wal-utils.mjs 的锁机制和基本功能。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");

// 导入 wal-utils 函数
const walUtilsUrl = pathToFileURL(path.join(REPO_ROOT, "hooks/wal-utils.mjs")).href;
const {
  parseWalLine,
  parseWalLines,
  getPendingTasks,
  formatWalLine,
  appendWalTask,
  markWalLineChecked,
  modifyWalWithLock,
  acquireLock,
  releaseLock,
} = await import(walUtilsUrl);

// 测试用临时目录（模拟项目根目录）
const TEST_DIR = path.join(__dirname, "../fixtures/wal-test");
// WAL 文件实际路径是 .lingxi/os/WAL_BUFFER.md
const TEST_WAL = path.join(TEST_DIR, ".lingxi/os/WAL_BUFFER.md");
const TEST_LOCK = path.join(TEST_DIR, ".lingxi/os/.wal.lock");

describe("wal-utils: 基本解析", () => {
  it("parseWalLine 正确解析未勾选行", () => {
    const line = '- [ ] `[SESSION_DISTILL]`: {"candidate_ids":["abc"],"enqueued_by":"user1"}';
    const parsed = parseWalLine(line);
    assert.deepStrictEqual(parsed, {
      checked: false,
      type: "SESSION_DISTILL",
      payload: { candidate_ids: ["abc"], enqueued_by: "user1" },
    });
  });

  it("parseWalLine 正确解析已勾选行", () => {
    const line = '- [x] `[SELF_ITERATE]`: {"session_id":"xyz"}';
    const parsed = parseWalLine(line);
    assert.deepStrictEqual(parsed, {
      checked: true,
      type: "SELF_ITERATE",
      payload: { session_id: "xyz" },
    });
  });

  it("parseWalLine 对无效行返回 null", () => {
    assert.strictEqual(parseWalLine("not a wal line"), null);
    assert.strictEqual(parseWalLine(""), null);
  });

  it("formatWalLine 正确格式化", () => {
    const line = formatWalLine("TEST", { foo: "bar" }, false);
    assert.strictEqual(line, '- [ ] `[TEST]`: {"foo":"bar"}');
    const checkedLine = formatWalLine("TEST", { foo: "bar" }, true);
    assert.strictEqual(checkedLine, '- [x] `[TEST]`: {"foo":"bar"}');
  });

  it("parseWalLines 处理多行", () => {
    const content = `
- [ ] \`[A]\`: {"a":1}
- [x] \`[B]\`: {"b":2}
- [ ] \`[C]\`: {"c":3}
`;
    const parsed = parseWalLines(content);
    assert.strictEqual(parsed.length, 3);
    assert.strictEqual(parsed[0].checked, false);
    assert.strictEqual(parsed[1].checked, true);
    assert.strictEqual(parsed[2].type, "C");
  });

  it("getPendingTasks 只返回未勾选任务", () => {
    const content = `
- [ ] \`[A]\`: {}
- [x] \`[B]\`: {}
- [ ] \`[C]\`: {}
`;
    const pending = getPendingTasks(content);
    assert.strictEqual(pending.length, 2);
    assert.strictEqual(pending[0].type, "A");
    assert.strictEqual(pending[1].type, "C");
  });
});

describe("wal-utils: 锁机制", () => {
  // 清理测试目录
  const cleanup = () => {
    try {
      if (fs.existsSync(TEST_LOCK)) fs.unlinkSync(TEST_LOCK);
      if (fs.existsSync(TEST_WAL)) fs.unlinkSync(TEST_WAL);
    } catch { /* ignore */ }
  };

  beforeEach(cleanup);
  afterEach(cleanup);

  it("acquireLock 获取锁成功", () => {
    const result = acquireLock(TEST_LOCK, 1000);
    assert.strictEqual(result, true);
    assert.ok(fs.existsSync(TEST_LOCK));
    releaseLock(TEST_LOCK);
  });

  it("acquireLock 同一进程重复获取失败", () => {
    const result1 = acquireLock(TEST_LOCK, 1000);
    assert.strictEqual(result1, true);
    const result2 = acquireLock(TEST_LOCK, 100);
    assert.strictEqual(result2, false);
    releaseLock(TEST_LOCK);
  });

  it("releaseLock 释放后可以重新获取", () => {
    assert.strictEqual(acquireLock(TEST_LOCK, 1000), true);
    releaseLock(TEST_LOCK);
    assert.strictEqual(acquireLock(TEST_LOCK, 1000), true);
    releaseLock(TEST_LOCK);
  });
});

describe("wal-utils: 集成操作", () => {
  const cleanup = () => {
    try {
      if (fs.existsSync(TEST_LOCK)) fs.unlinkSync(TEST_LOCK);
      if (fs.existsSync(TEST_WAL)) fs.unlinkSync(TEST_WAL);
    } catch { /* ignore */ }
  };

  // 确保测试目录存在
  const ensureDir = () => {
    const lingxiDir = path.join(TEST_DIR, ".lingxi", "os");
    if (!fs.existsSync(lingxiDir)) fs.mkdirSync(lingxiDir, { recursive: true });
  };

  beforeEach(() => { cleanup(); ensureDir(); });
  afterEach(cleanup);

  it("appendWalTask 创建 WAL 并添加任务", () => {
    const result = appendWalTask(TEST_DIR, "TEST_TASK", { foo: "bar" });
    assert.strictEqual(result, true);
    assert.ok(fs.existsSync(TEST_WAL));
    const content = fs.readFileSync(TEST_WAL, "utf8");
    assert.ok(content.includes("[TEST_TASK]"));
  });

  it("markWalLineChecked 修改行状态", () => {
    const lines = [
      "- [ ] `[TEST]`: {}",
      "- [ ] `[TEST2]`: {}",
    ];
    const result = markWalLineChecked(lines, 0);
    assert.strictEqual(result, true);
    assert.ok(lines[0].includes("[x]"));
    assert.ok(lines[1].includes("[ ]"));
  });

  it("modifyWalWithLock 原子修改 WAL", () => {
    if (!fs.existsSync(TEST_DIR)) fs.mkdirSync(TEST_DIR, { recursive: true });
    fs.writeFileSync(TEST_WAL, "- [ ] `[ORIGINAL]`: {}\n", "utf8");

    const result = modifyWalWithLock(TEST_DIR, (lines) => {
      // 找到并修改
      for (let i = 0; i < lines.length; i++) {
        if (parseWalLine(lines[i]) && !parseWalLine(lines[i]).checked) {
          markWalLineChecked(lines, i);
          return true;
        }
      }
      return false;
    });

    assert.strictEqual(result, true);
    const content = fs.readFileSync(TEST_WAL, "utf8");
    assert.ok(content.includes("[x]"));
  });
});
