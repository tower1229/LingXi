#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");

const {
  parseRow,
  validateRow,
  splitLinkParts,
  inferProjectRootFromIndexPath,
} = require("../validate-index.js");

function withTempProject(fn) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "lingxi-validate-index-"));
  try {
    fn(tempRoot);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

test("parseRow: supports legacy and numeric IDs", () => {
  const legacy = parseRow("| REQ-001 | T | planned | plan | next | none | `a` |");
  const numeric = parseRow("| 001 | T | planned | plan | next | none | `a` |");
  const invalid = parseRow("| REQ-1 | T | planned | plan | next | none | `a` |");

  assert.equal(legacy.id, "REQ-001");
  assert.equal(numeric.id, "001");
  assert.equal(invalid, null);
});

test("splitLinkParts: keeps full path segments intact", () => {
  const parts = splitLinkParts(
    "`.cursor/.lingxi/tasks/in-progress/REQ-001.md` / `.plan.md` / `.review.md`",
  );

  assert.deepEqual(parts, [
    ".cursor/.lingxi/tasks/in-progress/REQ-001.md",
    ".plan.md",
    ".review.md",
  ]);
});

test("validateRow: checks referenced req file existence from full path", () => {
  withTempProject((projectRoot) => {
    const row = {
      id: "REQ-001",
      status: "planned",
      currentPhase: "plan",
      links: "`.cursor/.lingxi/tasks/in-progress/REQ-001.md`",
    };

    const errors = validateRow(row, projectRoot);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /REQ-001\.md/);
  });
});

test("inferProjectRootFromIndexPath: resolves project root correctly", () => {
  const indexPath =
    "/tmp/sample-repo/.cursor/.lingxi/tasks/INDEX.md";
  const root = inferProjectRootFromIndexPath(indexPath);
  assert.equal(root, "/tmp/sample-repo");
});

test("CLI: passes for a valid index file", () => {
  withTempProject((projectRoot) => {
    const tasksDir = path.join(projectRoot, ".cursor/.lingxi/tasks/in-progress");
    fs.mkdirSync(tasksDir, { recursive: true });
    fs.writeFileSync(path.join(tasksDir, "REQ-001.md"), "# req\n", "utf8");

    const indexPath = path.join(projectRoot, ".cursor/.lingxi/tasks/INDEX.md");
    fs.writeFileSync(
      indexPath,
      [
        "| ID | Title | Status | Current Phase | Next Action | Blockers | Links |",
        "| --- | --- | --- | --- | --- | --- | --- |",
        "| REQ-001 | T | planned | plan | n/a | none | `.cursor/.lingxi/tasks/in-progress/REQ-001.md` |",
      ].join("\n"),
      "utf8",
    );

    const scriptPath = path.resolve(__dirname, "../validate-index.js");
    const result = spawnSync(process.execPath, [scriptPath, indexPath], {
      encoding: "utf8",
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
  });
});

test("CLI: fails when index header is missing", () => {
  withTempProject((projectRoot) => {
    const indexPath = path.join(projectRoot, ".cursor/.lingxi/tasks/INDEX.md");
    fs.mkdirSync(path.dirname(indexPath), { recursive: true });
    fs.writeFileSync(indexPath, "# empty\n", "utf8");

    const scriptPath = path.resolve(__dirname, "../validate-index.js");
    const result = spawnSync(process.execPath, [scriptPath, indexPath], {
      encoding: "utf8",
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /未找到表头/);
  });
});
