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
  const originalCodexBin = process.env.LINGXI_MEMORY_SEMANTIC_CODEX_BIN;

  afterEach(() => {
    if (originalRunnerModule) {
      process.env.LINGXI_MEMORY_SEMANTIC_RUNNER_MODULE = originalRunnerModule;
    } else {
      delete process.env.LINGXI_MEMORY_SEMANTIC_RUNNER_MODULE;
    }
    if (originalCodexBin) {
      process.env.LINGXI_MEMORY_SEMANTIC_CODEX_BIN = originalCodexBin;
    } else {
      delete process.env.LINGXI_MEMORY_SEMANTIC_CODEX_BIN;
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

  it("uses codex exec without legacy approval flags", async () => {
    delete process.env.LINGXI_MEMORY_SEMANTIC_RUNNER_MODULE;
    tempDir = createTempDir();
    ensureRuntimeState(tempDir);

    const argsFile = path.join(tempDir, "codex-args.json");
    const stubPath = path.join(tempDir, "codex-stub.mjs");
    fs.writeFileSync(
      stubPath,
      `#!/usr/bin/env node
import fs from "node:fs";

const args = process.argv.slice(2);
const argsFile = ${JSON.stringify(argsFile)};
fs.writeFileSync(argsFile, JSON.stringify(args, null, 2) + "\\n", "utf8");

const outputIndex = args.indexOf("-o");
if (outputIndex === -1 || outputIndex + 1 >= args.length) {
  console.error("missing -o output file");
  process.exit(1);
}

const schemaIndex = args.indexOf("--output-schema");
if (schemaIndex === -1 || schemaIndex + 1 >= args.length) {
  console.error("missing --output-schema file");
  process.exit(1);
}

const schemaFile = args[schemaIndex + 1];
const schema = JSON.parse(fs.readFileSync(schemaFile, "utf8"));
if (schema?.properties?.schema_version?.type !== "string") {
  console.error("schema_version.type must be string");
  process.exit(1);
}
const decisionItem = schema?.properties?.decisions?.items;
if (!Array.isArray(decisionItem?.required)) {
  console.error("govern_batch decision schema must declare required fields");
  process.exit(1);
}
for (const key of ["action", "reason", "confidence", "target_note_id", "target_candidate_index", "note"]) {
  if (!decisionItem.required.includes(key)) {
    console.error(\`govern_batch decision schema missing required field: \${key}\`);
    process.exit(1);
  }
}
if (!Array.isArray(decisionItem?.properties?.target_note_id?.type) || !decisionItem.properties.target_note_id.type.includes("null")) {
  console.error("target_note_id must allow null");
  process.exit(1);
}
if (!Array.isArray(decisionItem?.properties?.target_candidate_index?.type) || !decisionItem.properties.target_candidate_index.type.includes("null")) {
  console.error("target_candidate_index must allow null");
  process.exit(1);
}
const noteSchema = decisionItem?.properties?.note;
if (!Array.isArray(noteSchema?.anyOf) || !noteSchema.anyOf.some((entry) => entry?.type === "null")) {
  console.error("note must allow null");
  process.exit(1);
}

const outputFile = args[outputIndex + 1];
const payload = {
  schema_version: "draft-2026-04-08",
  decisions: [
    {
      action: "create",
      reason: "durable engineering preference",
      confidence: 0.91,
      target_note_id: null,
      target_candidate_index: null,
      note: {
        title: "Prefer explicit interfaces",
        kind: "preference",
        one_liner: "Prefer explicit interfaces over hidden coupling.",
        decision: "Use explicit interfaces when module boundaries matter.",
        when_to_load: ["When planning integration boundaries"],
        evidence: ["Maintainer repeatedly asks for explicit interfaces."]
      }
    }
  ]
};

fs.writeFileSync(outputFile, JSON.stringify(payload, null, 2) + "\\n", "utf8");
`,
      "utf8"
    );
    fs.chmodSync(stubPath, 0o755);
    process.env.LINGXI_MEMORY_SEMANTIC_CODEX_BIN = stubPath;

    const results = await upsertMemoryNotes(tempDir, [
      {
        title: "Prefer explicit interfaces",
        kind: "preference",
        when_to_load: ["When planning integration boundaries"],
        one_liner: "Prefer explicit interfaces over hidden coupling.",
        decision: "Use explicit interfaces when module boundaries matter.",
        evidence: ["Maintainer repeatedly asks for explicit interfaces."],
        source: "session-distill"
      }
    ]);

    assert.strictEqual(results[0].operation, "created");
    const args = JSON.parse(fs.readFileSync(argsFile, "utf8"));
    assert.ok(args.includes("exec"));
    assert.ok(!args.includes("-a"));
    assert.ok(!args.includes("--approval-mode"));
  });
});
