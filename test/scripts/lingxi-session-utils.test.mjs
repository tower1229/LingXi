import { describe, it } from "node:test";
import assert from "node:assert";
import {
  extractText,
  normalizeRole,
  normalizeMessage,
  uniqueMessages,
  findMessages,
  parseJsonLines,
  hasEngineeringSignal,
  detectSelfDistillSkipReason,
  isPathWithin,
  ENGINEERING_SIGNAL_PATTERN,
  CURRENT_RUN_MARKERS,
  HISTORICAL_SELF_DISTILL_MARKERS
} from "../../scripts/_lingxi-session-utils.mjs";

describe("lingxi session utils", () => {
  it("exports shared constants used by both Codex and Claude adapters", () => {
    assert.ok(ENGINEERING_SIGNAL_PATTERN instanceof RegExp);
    assert.ok(Array.isArray(CURRENT_RUN_MARKERS));
    assert.ok(Array.isArray(HISTORICAL_SELF_DISTILL_MARKERS));
    assert.ok(CURRENT_RUN_MARKERS.length > 0);
    assert.ok(HISTORICAL_SELF_DISTILL_MARKERS.length > 0);
  });

  it("extracts text from nested message structures", () => {
    assert.strictEqual(extractText("hello"), "hello");
    assert.strictEqual(extractText({ text: "nested" }), "nested");
    assert.strictEqual(extractText({ content: "inner" }), "inner");
    assert.strictEqual(extractText([{ text: "a" }, { text: "b" }]), "a b");
    assert.strictEqual(extractText(null), "");
    assert.strictEqual(extractText(42), "42");
  });

  it("normalizes message roles from various event shapes", () => {
    assert.strictEqual(normalizeRole({ role: "user" }), "user");
    assert.strictEqual(normalizeRole({ role: "assistant" }), "assistant");
    assert.strictEqual(normalizeRole({ role: "system" }), "system");
    assert.strictEqual(normalizeRole({ role: "UNKNOWN" }), "");
    assert.strictEqual(normalizeRole({ sender: "user" }), "user");
    assert.strictEqual(normalizeRole({ type: "assistant" }), "assistant");
    assert.strictEqual(normalizeRole(null), "");
  });

  it("normalizes messages from Codex event_msg and response_item shapes", () => {
    const eventMsg = normalizeMessage({
      type: "event_msg",
      payload: { type: "agent_message", message: "Looking at code" }
    });
    assert.deepStrictEqual(eventMsg, { role: "assistant", content: "Looking at code" });

    const responseItem = normalizeMessage({
      type: "response_item",
      payload: { role: "user", content: "Fix the bug" }
    });
    assert.deepStrictEqual(responseItem, { role: "user", content: "Fix the bug" });

    assert.strictEqual(normalizeMessage(null), null);
    assert.strictEqual(normalizeMessage({ role: "user", content: "" }), null);
  });

  it("deduplicates messages by role+content", () => {
    const messages = uniqueMessages([
      { role: "user", content: "hello" },
      { role: "user", content: "hello" },
      { role: "assistant", content: "hi" },
      { role: "user", content: "hello" }
    ]);
    assert.strictEqual(messages.length, 2);
    assert.strictEqual(messages[0].content, "hello");
    assert.strictEqual(messages[1].content, "hi");
  });

  it("finds messages in various container shapes", () => {
    assert.strictEqual(findMessages(null).length, 0);

    const fromArray = findMessages([
      { role: "user", content: "hello" }
    ]);
    assert.strictEqual(fromArray.length, 1);

    const fromObject = findMessages({
      messages: [{ role: "user", content: "hello" }]
    });
    assert.strictEqual(fromObject.length, 1);

    const fromNested = findMessages({
      transcript: { messages: [{ role: "user", content: "hello" }] }
    });
    assert.strictEqual(fromNested.length, 1);
  });

  it("parses JSONL content into line objects", () => {
    const lines = parseJsonLines('{"a":1}\n{"b":2}\n');
    assert.strictEqual(lines.length, 2);
    assert.deepStrictEqual(lines[0], { a: 1 });
    assert.deepStrictEqual(lines[1], { b: 2 });
  });

  it("detects engineering signal in session messages", () => {
    assert.ok(hasEngineeringSignal({
      messages: [{ role: "user", content: "Fix the bug in src/index.ts" }]
    }));
    assert.ok(hasEngineeringSignal({
      messages: [{ role: "user", content: "重构前端模块的接口" }]
    }));
    assert.ok(!hasEngineeringSignal({
      messages: [{ role: "user", content: "Thanks and have a great day" }]
    }));
  });

  it("detects self-distill sessions that should be skipped", () => {
    assert.strictEqual(
      detectSelfDistillSkipReason({
        context_text: "",
        messages: [{ role: "assistant", content: "Run node scripts/lx-distill-sessions.mjs and report" }]
      }),
      "self_distill_current_run"
    );

    assert.strictEqual(
      detectSelfDistillSkipReason({
        context_text: "",
        messages: [{ role: "user", content: "Let's improve our session-distill memory about memory flow." }]
      }),
      "self_distill_historical"
    );

    assert.strictEqual(
      detectSelfDistillSkipReason({
        context_text: "",
        messages: [{ role: "user", content: "Prefer explicit interfaces when module boundaries matter." }]
      }),
      null
    );
  });

  it("correctly checks path containment", () => {
    assert.ok(isPathWithin("/a/b", "/a/b/c"));
    assert.ok(isPathWithin("/a/b", "/a/b"));
    assert.ok(!isPathWithin("/a/b", "/a/c"));
    assert.ok(!isPathWithin("/a/b", "/x/y"));
  });
});
