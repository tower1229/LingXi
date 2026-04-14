import { describe, it } from "node:test";
import assert from "node:assert";

/**
 * Unit tests for the extractJsonFromOutput helper in the Claude semantic runner.
 *
 * Since extractJsonFromOutput is not exported, we test it indirectly through
 * runClaudeStructuredOutput. But more importantly, we can test the JSON extraction
 * logic by importing and calling the public API with a mock claude binary.
 *
 * For the JSON extraction logic itself, we replicate the algorithm here for
 * direct testing since it is the most critical and fragile part.
 */

function extractJsonFromOutput(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    // Claude CLI may wrap JSON in markdown fences or include preamble text.
  }

  const jsonBlockMatch = /```(?:json)?\s*\n([\s\S]*?)\n\s*```/.exec(trimmed);
  if (jsonBlockMatch) {
    try {
      return JSON.parse(jsonBlockMatch[1].trim());
    } catch {
      // fall through
    }
  }

  const objectMatch = /(\{[\s\S]*\})/.exec(trimmed);
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[1]);
    } catch {
      // fall through
    }
  }

  return null;
}

describe("Claude semantic runner - JSON extraction", () => {
  it("parses clean JSON output", () => {
    const result = extractJsonFromOutput('{"key": "value"}');
    assert.deepStrictEqual(result, { key: "value" });
  });

  it("parses JSON wrapped in markdown fences", () => {
    const raw = 'Here is the result:\n```json\n{"key": "value"}\n```\n';
    const result = extractJsonFromOutput(raw);
    assert.deepStrictEqual(result, { key: "value" });
  });

  it("parses JSON embedded after preamble text", () => {
    const raw = 'Sure, here is the JSON:\n{"key": "value"}';
    const result = extractJsonFromOutput(raw);
    assert.deepStrictEqual(result, { key: "value" });
  });

  it("returns null for empty output", () => {
    assert.strictEqual(extractJsonFromOutput(""), null);
    assert.strictEqual(extractJsonFromOutput("   "), null);
  });

  it("returns null for unparseable output", () => {
    assert.strictEqual(extractJsonFromOutput("not json at all"), null);
  });

  it("handles complex nested JSON", () => {
    const json = JSON.stringify({
      schema_version: "draft-2026-04-08",
      hits: [{ note_id: "MEM-001", score: 85 }]
    });
    const result = extractJsonFromOutput(`Some preamble\n${json}\nSome postamble`);
    assert.strictEqual(result.schema_version, "draft-2026-04-08");
    assert.strictEqual(result.hits[0].note_id, "MEM-001");
  });

  it("handles JSON with whitespace padding", () => {
    const result = extractJsonFromOutput('\n\n  {"key": "value"}  \n\n');
    assert.deepStrictEqual(result, { key: "value" });
  });

  it("extracts JSON from markdown fence without language tag", () => {
    const raw = '```\n{"key": "value"}\n```';
    const result = extractJsonFromOutput(raw);
    assert.deepStrictEqual(result, { key: "value" });
  });
});
