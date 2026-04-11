import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import assert from "node:assert";
import { fileURLToPath } from "node:url";
import { compileMemoryDistillPrompt } from "../../scripts/_lingxi-memory-semantic.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const SKILL_ROOT = path.join(REPO_ROOT, "skills", "memory-distill");
const TEST_TMP_ROOT = process.env.TEST_TMPDIR || "/tmp";

describe("memory-distill skill", () => {
  const originalSkillDir = process.env.LINGXI_MEMORY_DISTILL_SKILL_DIR;
  const originalCompilerFlag = process.env.LINGXI_MEMORY_DISTILL_SKILL_COMPILER;
  let tempDir = "";

  afterEach(() => {
    if (originalSkillDir) {
      process.env.LINGXI_MEMORY_DISTILL_SKILL_DIR = originalSkillDir;
    } else {
      delete process.env.LINGXI_MEMORY_DISTILL_SKILL_DIR;
    }
    if (originalCompilerFlag) {
      process.env.LINGXI_MEMORY_DISTILL_SKILL_COMPILER = originalCompilerFlag;
    } else {
      delete process.env.LINGXI_MEMORY_DISTILL_SKILL_COMPILER;
    }
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("ships a complete skill spec with canonical operation files and examples", () => {
    const spec = JSON.parse(fs.readFileSync(path.join(SKILL_ROOT, "references", "skill-spec.json"), "utf8"));
    assert.strictEqual(spec.skill_name, "memory-distill");
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
    delete process.env.LINGXI_MEMORY_DISTILL_SKILL_COMPILER;
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

  it("dispatches retrieve prompts by intent through the skill compiler", () => {
    delete process.env.LINGXI_MEMORY_DISTILL_SKILL_COMPILER;
    const taskPrompt = compileMemoryDistillPrompt({
      operation: "retrieve_task",
      payload: {
        query: "backend integration rollback",
        limit: 3,
        context: { caller: "task", intent: "task" },
        notes: []
      }
    });
    const vetPrompt = compileMemoryDistillPrompt({
      operation: "retrieve_vet",
      payload: {
        query: "backend integration rollback",
        limit: 3,
        context: { caller: "vet", intent: "vet" },
        notes: []
      }
    });
    assert.match(taskPrompt.prompt, /# Retrieve Task/);
    assert.match(vetPrompt.prompt, /# Retrieve Vet/);
    assert.notStrictEqual(taskPrompt.metadata.operation_spec_hash, vetPrompt.metadata.operation_spec_hash);
  });

  it("fails fast when the memory-distill skill assets are incomplete", () => {
    tempDir = fs.mkdtempSync(path.join(TEST_TMP_ROOT, "lingxi-memory-distill-skill-"));
    const referencesDir = path.join(tempDir, "references");
    fs.mkdirSync(referencesDir, { recursive: true });
    fs.writeFileSync(path.join(referencesDir, "skill-spec.json"), JSON.stringify({
      skill_name: "memory-distill",
      skill_version: "1",
      prompt_pack_version: "test",
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

  it("supports temporary legacy fallback via feature flag", () => {
    process.env.LINGXI_MEMORY_DISTILL_SKILL_COMPILER = "0";
    const compiled = compileMemoryDistillPrompt({
      operation: "taste_extract",
      payload: {
        session_id: "session-001",
        content_fingerprint: "sha256:test",
        distill_version: "v3",
        messages: []
      }
    });
    assert.strictEqual(compiled.metadata.compiler_mode, "legacy");
    assert.doesNotMatch(compiled.prompt, /You are executing the memory-distill semantic skill\./);
  });
});
