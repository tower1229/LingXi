import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import assert from "node:assert";
import { fileURLToPath } from "node:url";
import {
  ensureRuntimeState,
  loadMemoryNotes,
  retrieveRelevantMemoryHits,
  upsertMemoryNotes
} from "../../scripts/_lingxi-memory.mjs";
import { memorySemanticRunnerModulePath } from "../helpers/memory-semantic-env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const invalidGovernanceRunnerPath = path.resolve(__dirname, "../fixtures/memory-semantic-invalid-governance-runner.mjs");
const invalidRankingRunnerPath = path.resolve(__dirname, "../fixtures/memory-semantic-invalid-ranking-runner.mjs");

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "lingxi-memory-semantic-core-"));
}

function writeNote(projectRoot, scope, filename, content) {
  const dir = path.join(projectRoot, ".lingxi", "memory", scope);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), content, "utf8");
}

describe("lingxi memory semantic core", () => {
  let tempDir;
  const originalRunnerModule = process.env.LINGXI_MEMORY_SEMANTIC_RUNNER_MODULE;

  afterEach(() => {
    if (originalRunnerModule) {
      process.env.LINGXI_MEMORY_SEMANTIC_RUNNER_MODULE = originalRunnerModule;
    } else {
      delete process.env.LINGXI_MEMORY_SEMANTIC_RUNNER_MODULE;
    }
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("uses structured retrieval context when the raw query is underspecified", async () => {
    process.env.LINGXI_MEMORY_SEMANTIC_RUNNER_MODULE = memorySemanticRunnerModulePath;
    tempDir = createTempDir();
    ensureRuntimeState(tempDir);
    writeNote(
      tempDir,
      "project",
      "MEM-001.rollback.md",
      `---
id: MEM-001
title: Prefer explicit rollback notes
kind: preference
scope: project
source: session-distill
updated_at: 2026-04-07T12:00:00Z
when_to_load:
  - When planning backend integration changes
---

# One-liner

Prefer explicit rollback path before implementation for backend integration changes.

# Decision / Preference

Document rollback path and rollback order before implementation for backend integration changes.

# Evidence

- Maintainers repeatedly ask for rollback visibility.
`,
    );

    const hits = await retrieveRelevantMemoryHits(tempDir, "service seam", 3, {
      caller: "task",
      type: "后端",
      constraints: ["Document rollback order before implementation"],
      semantic_focus: { integration: true, contract_surface: true }
    });
    assert.strictEqual(hits.length, 1);
    assert.strictEqual(hits[0].id, "MEM-001");
  });

  it("merges semantically duplicate candidates inside one batch governance pass", async () => {
    process.env.LINGXI_MEMORY_SEMANTIC_RUNNER_MODULE = memorySemanticRunnerModulePath;
    tempDir = createTempDir();
    ensureRuntimeState(tempDir);

    const results = await upsertMemoryNotes(tempDir, [
      {
        title: "Prefer explicit interfaces",
        kind: "preference",
        when_to_load: ["When defining integration boundaries"],
        one_liner: "Prefer explicit interfaces over hidden coupling.",
        decision: "Use explicit interfaces when module or integration boundaries matter.",
        evidence: ["Original wording."],
        source: "session-distill"
      },
      {
        title: "Make the interface explicit",
        kind: "preference",
        when_to_load: ["When reviewing backend seams"],
        one_liner: "Make the interface explicit so hidden coupling does not leak into implementation.",
        decision: "Keep module boundaries explicit instead of relying on hidden coupling.",
        evidence: ["Paraphrased wording."],
        source: "session-distill"
      }
    ]);

    assert.strictEqual(results[0].operation, "created");
    assert.strictEqual(results[1].operation, "merged");
    const notes = loadMemoryNotes(tempDir);
    assert.strictEqual(notes.length, 1);
    assert.match(notes[0].decision, /explicit interfaces/i);
    assert.deepStrictEqual(notes[0].evidence.sort(), ["Original wording.", "Paraphrased wording."].sort());
  });

  it("fails fast when governance returns an unsupported action", async () => {
    process.env.LINGXI_MEMORY_SEMANTIC_RUNNER_MODULE = invalidGovernanceRunnerPath;
    tempDir = createTempDir();
    ensureRuntimeState(tempDir);

    await assert.rejects(
      () =>
        upsertMemoryNotes(tempDir, [
          {
            title: "Prefer explicit interfaces",
            kind: "preference",
            when_to_load: ["When defining integration boundaries"],
            one_liner: "Prefer explicit interfaces over hidden coupling.",
            decision: "Use explicit interfaces when module or integration boundaries matter.",
            evidence: ["Original wording."],
            source: "session-distill"
          }
        ]),
      /action must be one of/
    );
  });

  it("fails fast when ranking returns malformed hits", async () => {
    process.env.LINGXI_MEMORY_SEMANTIC_RUNNER_MODULE = invalidRankingRunnerPath;
    tempDir = createTempDir();
    ensureRuntimeState(tempDir);
    writeNote(
      tempDir,
      "project",
      "MEM-001.rollback.md",
      `---
id: MEM-001
title: Prefer explicit rollback notes
kind: preference
scope: project
source: session-distill
updated_at: 2026-04-07T12:00:00Z
when_to_load:
  - When planning backend integration changes
---

# One-liner

Prefer explicit rollback path before implementation for backend integration changes.

# Decision / Preference

Document rollback path and rollback order before implementation for backend integration changes.

# Evidence

- Maintainers repeatedly ask for rollback visibility.
`,
    );

    await assert.rejects(
      () => retrieveRelevantMemoryHits(tempDir, "rollback", 3, { caller: "task" }),
      /note_id must reference an existing note|score must be an integer/
    );
  });
});
