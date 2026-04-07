import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import assert from "node:assert";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const architecturePath = path.join(repoRoot, "docs", "architecture.md");
const roadmapPath = path.join(repoRoot, "docs", "lingxi-2-roadmap.md");

describe("hybrid contract docs", () => {
  it("documents the current TaskSpec and VetReport contract surfaces in architecture", () => {
    const architecture = fs.readFileSync(architecturePath, "utf8");
    assert.match(architecture, /Current draft contract fields:/);
    assert.match(architecture, /`schema_version`/);
    assert.match(architecture, /Current compatibility\/pass-through fields carried by the deterministic compiler path:/);
    assert.match(architecture, /`goal`/);
    assert.match(architecture, /Current stable contract fields:/);
    assert.match(architecture, /`report_version`/);
    assert.match(architecture, /`revision_targets`/);
    assert.match(architecture, /`next_step_options`/);
  });

  it("documents repair loops for both TaskSpec and VetReport in architecture", () => {
    const architecture = fs.readFileSync(architecturePath, "utf8");
    assert.match(architecture, /LLM repairs `TaskSpec`/);
    assert.match(architecture, /The same general pattern now also applies to `VetReport`/);
    assert.match(architecture, /LingXi accepts the validated report as the stable review artifact/);
  });

  it("documents current draft fields and completed hybrid contract direction in roadmap", () => {
    const roadmap = fs.readFileSync(roadmapPath, "utf8");
    assert.match(roadmap, /Current draft fields:/);
    assert.match(roadmap, /`schema_version`/);
    assert.match(roadmap, /Compatibility fields currently preserved by the deterministic task path:/);
    assert.match(roadmap, /`report_version`/);
    assert.match(roadmap, /Current stable fields:/);
    assert.match(roadmap, /`revision_targets`/);
    assert.match(roadmap, /`next_step_options`/);
    assert.match(roadmap, /`TaskSpec` validation and repair-loop behavior/);
    assert.match(roadmap, /`VetReport` structure stability/);
  });
});
