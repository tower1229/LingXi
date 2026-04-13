import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import assert from "node:assert";
import { fileURLToPath } from "node:url";
import {
  compileMemoryDistillPrompt,
  rankRelevantMemories
} from "../../scripts/_lingxi-memory-semantic.mjs";
import { memorySemanticRunnerModulePath } from "../helpers/memory-semantic-env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const SKILL_ROOT = path.join(REPO_ROOT, "skills", "memory-distill");
const TEST_TMP_ROOT = process.env.TEST_TMPDIR || "/tmp";

describe("memory-distill skill", () => {
  const originalSkillDir = process.env.LINGXI_MEMORY_DISTILL_SKILL_DIR;
  const originalRunnerModule = process.env.LINGXI_MEMORY_SEMANTIC_RUNNER_MODULE;
  let tempDir = "";

  afterEach(() => {
    if (originalSkillDir) {
      process.env.LINGXI_MEMORY_DISTILL_SKILL_DIR = originalSkillDir;
    } else {
      delete process.env.LINGXI_MEMORY_DISTILL_SKILL_DIR;
    }
    if (originalRunnerModule) {
      process.env.LINGXI_MEMORY_SEMANTIC_RUNNER_MODULE = originalRunnerModule;
    } else {
      delete process.env.LINGXI_MEMORY_SEMANTIC_RUNNER_MODULE;
    }
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("ships a complete skill spec with canonical operation files and examples", () => {
    const spec = JSON.parse(fs.readFileSync(path.join(SKILL_ROOT, "references", "skill-spec.json"), "utf8"));
    assert.strictEqual(spec.skill_name, "memory-distill");
    assert.ok(typeof spec.example_pack_version === "string" && spec.example_pack_version.length > 0);
    for (const [name, operation] of Object.entries(spec.operations)) {
      const instructionPath = path.join(SKILL_ROOT, "references", operation.instruction_file);
      const exampleDir = path.join(SKILL_ROOT, "references", operation.example_dir);
      assert.ok(fs.existsSync(instructionPath), name);
      assert.ok(fs.existsSync(exampleDir), name);
      assert.ok(fs.readdirSync(exampleDir).some((file) => file.endsWith(".json")), name);
    }
    const taxonomy = JSON.parse(fs.readFileSync(path.join(SKILL_ROOT, "references", "taxonomy.json"), "utf8"));
    const kindMap = JSON.parse(fs.readFileSync(path.join(SKILL_ROOT, "references", "storage-kind-map.json"), "utf8"));
    const rubrics = JSON.parse(fs.readFileSync(path.join(SKILL_ROOT, "references", "rubrics.json"), "utf8"));
    assert.ok(Array.isArray(taxonomy.content_types) && taxonomy.content_types.length > 0);
    assert.ok(kindMap.default_mapping && typeof kindMap.default_mapping === "object");
    assert.ok(rubrics.value_dimensions && typeof rubrics.value_dimensions === "object");
  });

  it("compiles extract prompt from memory-distill skill assets instead of hardcoded packs", () => {
    const compiled = compileMemoryDistillPrompt({
      operation: "taste_extract",
      payload: {
        session_id: "session-001",
        content_fingerprint: "sha256:test",
        distill_version: "v3",
        messages: [{ role: "user", content: "Make the interface explicit." }]
      }
    });

    assert.match(compiled.prompt, /You are executing the memory-distill semantic skill\./);
    assert.match(compiled.prompt, /# Taste Extract/);
    assert.match(compiled.prompt, /Taxonomy JSON:/);
    assert.match(compiled.prompt, /Rubrics JSON:/);
    assert.match(compiled.prompt, /Input JSON:/);
    assert.strictEqual(compiled.metadata.skill_name, "memory-distill");
    assert.strictEqual(compiled.metadata.compiler_mode, "skill_compiler");
  });

  it("compiles governance handoff from the memory-distill skill assets", () => {
    const compiled = compileMemoryDistillPrompt({
      operation: "governance_handoff",
      payload: {
        candidates: [],
        existing_notes: [],
        scope: "project"
      }
    });
    assert.match(compiled.prompt, /# Governance Handoff/);
    assert.match(compiled.prompt, /Storage kind map JSON:/);
    assert.match(compiled.prompt, /Rubrics JSON:/);
    assert.strictEqual(compiled.metadata.compiler_mode, "skill_compiler");
  });

  it("dispatches generic retrieve by intent through the skill compiler", async () => {
    process.env.LINGXI_MEMORY_SEMANTIC_RUNNER_MODULE = memorySemanticRunnerModulePath;
    tempDir = fs.mkdtempSync(path.join(TEST_TMP_ROOT, "lingxi-memory-distill-skill-"));
    const notes = [
      {
        id: "MEM-001",
        title: "Prefer explicit rollback notes",
        kind: "preference",
        scope: "project",
        one_liner: "Prefer explicit rollback notes.",
        decision: "Document rollback order before implementation.",
        when_to_load: ["When planning backend integration changes"],
        evidence: ["Rollback notes matter."],
        stability: 1,
        decision_gain: 3,
        trigger_clarity: 3
      },
      {
        id: "MEM-002",
        title: "Avoid vague rollback plans",
        kind: "anti_pattern",
        scope: "project",
        one_liner: "Avoid vague rollback plans.",
        decision: "Treat missing rollback order as review risk.",
        when_to_load: ["When reviewing backend integration changes"],
        evidence: ["Vague rollback plans caused review churn."],
        stability: 3,
        decision_gain: 1,
        trigger_clarity: 1
      }
    ];
    const taskRanking = await rankRelevantMemories(tempDir, "backend integration rollback", notes, {
      limit: 3,
      context: { caller: "task", intent: "task" }
    });
    const vetRanking = await rankRelevantMemories(tempDir, "backend integration rollback", notes, {
      limit: 3,
      context: { caller: "vet", intent: "vet" }
    });
    assert.strictEqual(taskRanking.semantic_meta.compiler_mode, "skill_compiler");
    assert.strictEqual(vetRanking.semantic_meta.compiler_mode, "skill_compiler");
    assert.notStrictEqual(taskRanking.semantic_meta.operation_spec_hash, vetRanking.semantic_meta.operation_spec_hash);
  });

  it("fails fast when the memory-distill skill assets are incomplete", () => {
    tempDir = fs.mkdtempSync(path.join(TEST_TMP_ROOT, "lingxi-memory-distill-skill-"));
    const referencesDir = path.join(tempDir, "references");
    fs.mkdirSync(referencesDir, { recursive: true });
    fs.writeFileSync(path.join(referencesDir, "skill-spec.json"), JSON.stringify({
      skill_name: "memory-distill",
      skill_version: "1",
      prompt_pack_version: "test",
      example_pack_version: "test-examples",
      operations: {
        taste_extract: {
          instruction_file: "operations/missing.md",
          example_dir: "examples/taste-extract",
          asset_keys: ["taxonomy"],
          max_examples: 1
        }
      }
    }, null, 2));
    fs.writeFileSync(path.join(referencesDir, "taxonomy.json"), JSON.stringify({
      version: 1,
      content_types: [{ id: "preference", description: "x" }]
    }, null, 2));
    process.env.LINGXI_MEMORY_DISTILL_SKILL_DIR = tempDir;

    assert.throws(
      () => compileMemoryDistillPrompt({
        operation: "taste_extract",
        payload: {
          session_id: "session-001",
          content_fingerprint: "sha256:test",
          distill_version: "v3",
          messages: []
        }
      }),
      /does not exist|not declared|empty/
    );
  });

  it("fails fast when the skill spec omits example_pack_version", () => {
    tempDir = fs.mkdtempSync(path.join(TEST_TMP_ROOT, "lingxi-memory-distill-skill-"));
    const referencesDir = path.join(tempDir, "references");
    fs.mkdirSync(path.join(referencesDir, "operations"), { recursive: true });
    fs.mkdirSync(path.join(referencesDir, "examples", "taste-extract"), { recursive: true });
    fs.writeFileSync(path.join(referencesDir, "skill-spec.json"), JSON.stringify({
      skill_name: "memory-distill",
      skill_version: "1",
      prompt_pack_version: "test",
      operations: {
        taste_extract: {
          instruction_file: "operations/taste-extract.md",
          example_dir: "examples/taste-extract",
          asset_keys: ["taxonomy", "rubrics"],
          max_examples: 1
        }
      }
    }, null, 2));
    fs.writeFileSync(path.join(referencesDir, "operations", "taste-extract.md"), "# Taste Extract\n", "utf8");
    fs.writeFileSync(path.join(referencesDir, "examples", "taste-extract", "001.json"), JSON.stringify({
      label: "example",
      input: { session_id: "session-001" },
      output: { schema_version: "draft-2026-04-11-extract", candidates: [] }
    }, null, 2));
    fs.writeFileSync(path.join(referencesDir, "taxonomy.json"), JSON.stringify({
      version: 1,
      content_types: [{ id: "preference", description: "x" }]
    }, null, 2));
    fs.writeFileSync(path.join(referencesDir, "rubrics.json"), JSON.stringify({
      value_dimensions: { decision_gain: "x" },
      score_scale: { min: 0, max: 3 }
    }, null, 2));
    process.env.LINGXI_MEMORY_DISTILL_SKILL_DIR = tempDir;

    assert.throws(
      () => compileMemoryDistillPrompt({
        operation: "taste_extract",
        payload: {
          session_id: "session-001",
          content_fingerprint: "sha256:test",
          distill_version: "v3",
          messages: []
        }
      }),
      /Invalid memory-distill skill-spec\.json/
    );
  });

  it("tracks prompt and example versions independently in metadata", () => {
    const compiled = compileMemoryDistillPrompt({
      operation: "taste_extract",
      payload: {
        session_id: "session-001",
        content_fingerprint: "sha256:test",
        distill_version: "v3",
        messages: []
      }
    });
    assert.strictEqual(compiled.metadata.prompt_pack_version, "2026-04-11");
    assert.strictEqual(compiled.metadata.example_pack_version, "2026-04-11");
    assert.strictEqual(compiled.metadata.compiler_mode, "skill_compiler");
  });
});
