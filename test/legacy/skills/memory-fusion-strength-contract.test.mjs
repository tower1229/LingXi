/**
 * Memory fusion and strength contract tests.
 * Verifies admission rules are fused into taste-recognition and
 * repeated merge signals are documented as retrieval weight hints.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import assert from "node:assert";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../..");

const DISTILL_AGENT_PATH = path.join(REPO_ROOT, ".cursor", "agents", "lingxi-session-distill.md");
const TASTE_RECOGNITION_PATH = path.join(REPO_ROOT, ".cursor", "skills", "taste-recognition", "SKILL.md");
const WRITE_PROTOCOL_PATH = path.join(REPO_ROOT, ".cursor", "skills", "memory-write", "references", "write-protocol.md");
const RETRIEVE_SKILL_PATH = path.join(REPO_ROOT, ".cursor", "skills", "memory-retrieve", "SKILL.md");

describe("memory fusion and strength contracts", () => {
  it("keeps session distill as pass-through without independent gate stage", () => {
    const content = fs.readFileSync(DISTILL_AGENT_PATH, "utf8");
    assert.ok(!content.includes("Memory Admission Gate"));
    assert.ok(!content.includes("Inclusion Bar（需同时满足）"));
    assert.ok(!content.includes("Exclusions（命中即拒绝）"));
  });

  it("documents exclusions and inclusion semantics in taste-recognition", () => {
    const content = fs.readFileSync(TASTE_RECOGNITION_PATH, "utf8");
    assert.ok(content.includes("识别（含前置排除）"));
    assert.ok(content.includes("one-off task instructions"));
    assert.ok(content.includes("transient details"));
    assert.ok(content.includes("repeated-or-broad-rule"));
  });

  it("documents merge-driven strength promotion policy", () => {
    const content = fs.readFileSync(WRITE_PROTOCOL_PATH, "utf8");
    assert.ok(content.includes("重复信号到 Strength 提升"));
    assert.ok(content.includes("累计 merge 次数 ≥1：提升为 `validated`"));
    assert.ok(content.includes("累计 merge 次数 ≥3：提升为 `enforced`"));
  });

  it("documents conservative strength usage in retrieval rerank", () => {
    const content = fs.readFileSync(RETRIEVE_SKILL_PATH, "utf8");
    assert.ok(content.includes("`Strength`（hypothesis/validated/enforced）仅作为小权重因子或同分 tie-breaker"));
    assert.ok(content.includes("`Strength` 仅参与同分或近似同分时的保守重排"));
  });
});
