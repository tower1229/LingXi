import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { afterEach, describe, it } from "node:test";
import assert from "node:assert";
import { fileURLToPath } from "node:url";
import { withMemorySemanticTestEnv } from "../helpers/memory-semantic-env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const scriptPath = path.join(repoRoot, "skills", "memory-retrieve", "scripts", "retrieve-memory.mjs");

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "lingxi-retrieve-test-"));
}

function runRetrieve(projectRoot, query) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [scriptPath, "--project-root", projectRoot, "--query", query],
      {
        cwd: repoRoot,
        env: withMemorySemanticTestEnv(process.env),
        stdio: ["ignore", "pipe", "pipe"]
      }
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data) => {
      stdout += data;
    });
    child.stderr.on("data", (data) => {
      stderr += data;
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

describe("lingxi memory retrieve", () => {
  let tempDir;

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("returns the most relevant memory hits for a query", async () => {
    tempDir = createTempDir();
    const memoryDir = path.join(tempDir, ".lingxi", "memory", "project");
    fs.mkdirSync(memoryDir, { recursive: true });
    fs.writeFileSync(
      path.join(memoryDir, "MEM-001.small-patches.md"),
      `---
id: MEM-001
title: Prefer small reviewable patches
kind: preference
scope: project
source: session-distill
updated_at: 2026-04-07T12:00:00Z
when_to_load:
  - When planning a code change
---

# One-liner

Prefer small reviewable patches.

# Decision / Preference

Split changes into smaller reviewable units.

# Evidence

- The user repeatedly prefers smaller changes.
`,
      "utf8"
    );

    const result = await runRetrieve(tempDir, "small code change");
    assert.strictEqual(result.code, 0, result.stderr);
    const summary = JSON.parse(result.stdout);
    assert.strictEqual(summary.hit_count, 1);
    assert.strictEqual(summary.hits[0].note_id, "MEM-001");
    const opsLog = fs.readFileSync(path.join(tempDir, ".lingxi", "state", "memory-ops.jsonl"), "utf8")
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    assert.ok(opsLog.some((entry) => entry.operation === "retrieve_ranked" && entry.query_mode === "query_only"));
  });

  it("prefers project memory over share memory when relevance is similar", async () => {
    tempDir = createTempDir();
    const projectDir = path.join(tempDir, ".lingxi", "memory", "project");
    const shareDir = path.join(tempDir, ".lingxi", "memory", "share");
    fs.mkdirSync(projectDir, { recursive: true });
    fs.mkdirSync(shareDir, { recursive: true });

    const noteBody = (id, scope) => `---
id: ${id}
title: Prefer explicit rollback notes
kind: preference
scope: ${scope}
source: session-distill
updated_at: 2026-04-07T12:00:00Z
when_to_load:
  - When reviewing backend integration changes
---

# One-liner

Prefer explicit rollback notes for backend integration changes.

# Decision / Preference

Prefer explicit rollback notes for backend integration changes.

# Evidence

- Maintainers repeatedly ask for rollback visibility.
`;

    fs.writeFileSync(path.join(projectDir, "MEM-001.project.md"), noteBody("MEM-001", "project"), "utf8");
    fs.writeFileSync(path.join(shareDir, "MEM-002.share.md"), noteBody("MEM-002", "share"), "utf8");

    const result = await runRetrieve(tempDir, "backend integration rollback");
    assert.strictEqual(result.code, 0, result.stderr);
    const summary = JSON.parse(result.stdout);
    assert.strictEqual(summary.hit_count, 2);
    assert.strictEqual(summary.hits[0].note_id, "MEM-001");
    assert.strictEqual(summary.hits[0].scope, "project");
  });

  it("keeps the hit list minimal instead of returning weak tail matches", async () => {
    tempDir = createTempDir();
    const memoryDir = path.join(tempDir, ".lingxi", "memory", "project");
    fs.mkdirSync(memoryDir, { recursive: true });
    fs.writeFileSync(
      path.join(memoryDir, "MEM-001.rollback.md"),
      `---
id: MEM-001
title: Prefer explicit rollback notes
kind: preference
scope: project
source: session-distill
updated_at: 2026-04-07T12:00:00Z
when_to_load:
  - When reviewing backend integration changes
---

# One-liner

Prefer explicit rollback notes for backend integration changes.

# Decision / Preference

Prefer explicit rollback notes for backend integration changes.

# Evidence

- Rollback visibility repeatedly reduces review risk.
`,
      "utf8"
    );
    fs.writeFileSync(
      path.join(memoryDir, "MEM-002.docs.md"),
      `---
id: MEM-002
title: Prefer reader-first docs structure
kind: preference
scope: project
source: session-distill
updated_at: 2026-04-07T12:00:00Z
when_to_load:
  - When updating contributor guides
---

# One-liner

Prefer reader-first docs structure.

# Decision / Preference

Prefer reader-first docs structure for guide changes.

# Evidence

- Docs changes should optimize reader entrypoints.
`,
      "utf8"
    );

    const result = await runRetrieve(tempDir, "backend integration rollback");
    assert.strictEqual(result.code, 0, result.stderr);
    const summary = JSON.parse(result.stdout);
    assert.strictEqual(summary.hit_count, 1);
    assert.strictEqual(summary.hits[0].note_id, "MEM-001");
  });

  it("finds semantically related memory even when the query wording differs", async () => {
    tempDir = createTempDir();
    const memoryDir = path.join(tempDir, ".lingxi", "memory", "project");
    fs.mkdirSync(memoryDir, { recursive: true });
    fs.writeFileSync(
      path.join(memoryDir, "MEM-001.small-patches.md"),
      `---
id: MEM-001
title: Prefer small reviewable patches
kind: preference
scope: project
source: session-distill
updated_at: 2026-04-07T12:00:00Z
when_to_load:
  - When planning a code change
---

# One-liner

Prefer small reviewable patches.

# Decision / Preference

Split changes into smaller reviewable units.

# Evidence

- The user repeatedly prefers smaller changes.
`,
      "utf8"
    );

    const result = await runRetrieve(tempDir, "keep the blast radius narrow");
    assert.strictEqual(result.code, 0, result.stderr);
    const summary = JSON.parse(result.stdout);
    assert.strictEqual(summary.hit_count, 1);
    assert.strictEqual(summary.hits[0].note_id, "MEM-001");
  });
});
