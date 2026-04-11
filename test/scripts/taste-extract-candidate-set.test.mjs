import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import assert from "node:assert";
import { fileURLToPath } from "node:url";
import {
  TASTE_EXTRACT_CANDIDATE_SET_SCHEMA_VERSION,
  buildTasteExtractCandidateSetValidationReport,
  tasteExtractCandidateSetJsonSchema
} from "../../skills/session-distill/scripts/taste-extract-candidate-set.mjs";
import {
  adjudicateTasteCandidates,
  extractTasteCandidatesFromSession
} from "../../scripts/_lingxi-memory-semantic.mjs";
import { memorySemanticRunnerModulePath } from "../helpers/memory-semantic-env.mjs";

function createTempDir() {
  return fs.mkdtempSync(path.join(process.env.TEST_TMPDIR || "/tmp", "lingxi-taste-extract-"));
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("taste extract candidate set", () => {
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

  it("accepts a valid taste extract candidate set shape", () => {
    const report = buildTasteExtractCandidateSetValidationReport({
      schema_version: TASTE_EXTRACT_CANDIDATE_SET_SCHEMA_VERSION,
      session_id: "session-001",
      content_fingerprint: "sha256:test",
      distill_version: "v3",
      summary: {
        session_summary: "The session contains plausible durable engineering taste.",
        extracted_candidate_count: 1,
        discarded_signal_count: 0
      },
      candidates: [
        {
          scene: "When planning backend integration changes",
          content_type: "decision_experience",
          alternatives: ["Start coding before rollback planning"],
          choice: "Document rollback order before implementation.",
          rationale: "This reduces rollout risk and makes the plan reviewable.",
          evidence: ["write down rollback order first"],
          pattern_hint: "Rollback-sensitive integration planning",
          confidence: 0.78
        }
      ]
    });

    assert.strictEqual(report.ok, true);
    assert.strictEqual(report.issue_count, 0);
  });

  it("rejects malformed extract candidate fields", () => {
    const report = buildTasteExtractCandidateSetValidationReport({
      schema_version: TASTE_EXTRACT_CANDIDATE_SET_SCHEMA_VERSION,
      session_id: "session-001",
      content_fingerprint: "sha256:test",
      distill_version: "v3",
      summary: {
        session_summary: "",
        extracted_candidate_count: -1,
        discarded_signal_count: 0
      },
      candidates: [
        {
          scene: "",
          content_type: "unknown",
          alternatives: [1],
          choice: "",
          rationale: "",
          evidence: [],
          pattern_hint: "",
          confidence: 2
        }
      ]
    });

    assert.strictEqual(report.ok, false);
    assert.ok(report.issues.some((item) => item.path === "summary.session_summary"));
    assert.ok(report.issues.some((item) => item.path === "candidates[0].content_type"));
    assert.ok(report.issues.some((item) => item.path === "candidates[0].confidence"));
  });

  it("declares schema_version as a typed string in JSON Schema output", () => {
    const schema = tasteExtractCandidateSetJsonSchema();
    assert.strictEqual(schema.properties.schema_version.type, "string");
    assert.strictEqual(schema.properties.schema_version.const, TASTE_EXTRACT_CANDIDATE_SET_SCHEMA_VERSION);
  });

  it("returns high-recall raw candidates before adjudication and then filters them into final memory candidates", async () => {
    process.env.LINGXI_MEMORY_SEMANTIC_RUNNER_MODULE = memorySemanticRunnerModulePath;
    tempDir = createTempDir();
    const session = {
      session_id: "session-001",
      content_fingerprint: "sha256:test",
      distill_version: "v3",
      messages: [
        {
          role: "user",
          content: "When module seams get fuzzy, make the interface explicit so hidden coupling does not leak into implementation."
        }
      ]
    };

    const extracted = await extractTasteCandidatesFromSession(tempDir, session);
    assert.strictEqual(extracted.candidates.length, 1);
    assert.strictEqual(typeof extracted.candidates[0].scene, "string");
    assert.strictEqual(extracted.candidates[0].title, undefined);

    const adjudicated = await adjudicateTasteCandidates(tempDir, session, extracted);
    assert.strictEqual(adjudicated.candidates.length, 1);
    assert.strictEqual(adjudicated.candidates[0].title, "Prefer explicit interfaces");
    assert.strictEqual(adjudicated.candidates[0].suggested_storage_kind, "preference");
  });

  it("keeps semantic goldens in one repository source for prompt packs and tests", () => {
    const baseDir = path.resolve(__dirname, "../../skills/memory-distill/references/examples");
    const expectedDirs = [
      "taste-extract",
      "taste-adjudicate",
      "governance-handoff",
      "retrieve-task",
      "retrieve-vet"
    ];
    expectedDirs.forEach((dir) => {
      const files = fs.readdirSync(path.resolve(baseDir, dir)).filter((file) => file.endsWith(".json"));
      assert.ok(files.length > 0, dir);
      files.forEach((file) => {
        const parsed = JSON.parse(fs.readFileSync(path.resolve(baseDir, dir, file), "utf8"));
        assert.ok(typeof parsed.label === "string" && parsed.label.length > 0, `${dir}/${file}`);
        assert.ok(parsed.output && typeof parsed.output === "object", `${dir}/${file}`);
      });
    });
  });
});
