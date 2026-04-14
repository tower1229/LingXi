import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import assert from "node:assert";
import {
  defaultProcessedSessionsState,
  isTrivialPrompt,
  shouldTriggerBackgroundDistill
} from "../../scripts/_lingxi-memory.mjs";

function createTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function setupProjectState(projectRoot, state) {
  const stateDir = path.join(projectRoot, ".lingxi", "state");
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(
    path.join(stateDir, "processed-sessions.json"),
    JSON.stringify(state, null, 2) + "\n",
    "utf8"
  );
}

describe("isTrivialPrompt", () => {
  it("detects trivial English greetings", () => {
    assert.ok(isTrivialPrompt("hi"));
    assert.ok(isTrivialPrompt("Hello"));
    assert.ok(isTrivialPrompt("hey"));
    assert.ok(isTrivialPrompt("ok"));
    assert.ok(isTrivialPrompt("okay"));
    assert.ok(isTrivialPrompt("yes"));
    assert.ok(isTrivialPrompt("no"));
    assert.ok(isTrivialPrompt("thanks"));
    assert.ok(isTrivialPrompt("thank you"));
    assert.ok(isTrivialPrompt("Thanks!"));
  });

  it("detects trivial Chinese phrases", () => {
    assert.ok(isTrivialPrompt("好的"));
    assert.ok(isTrivialPrompt("谢谢"));
    assert.ok(isTrivialPrompt("收到"));
    assert.ok(isTrivialPrompt("继续"));
    assert.ok(isTrivialPrompt("在吗"));
    assert.ok(isTrivialPrompt("嗯"));
    assert.ok(isTrivialPrompt("是的"));
    assert.ok(isTrivialPrompt("不是"));
    assert.ok(isTrivialPrompt("对"));
    assert.ok(isTrivialPrompt("好"));
    assert.ok(isTrivialPrompt("辛苦了"));
  });

  it("does not flag meaningful engineering prompts as trivial", () => {
    assert.ok(!isTrivialPrompt("Fix the bug in src/index.ts"));
    assert.ok(!isTrivialPrompt("Implement the backend API endpoint"));
    assert.ok(!isTrivialPrompt("Prefer explicit interfaces when module boundaries matter"));
    assert.ok(!isTrivialPrompt("请重构前端模块的接口"));
    assert.ok(!isTrivialPrompt("Please implement the backend integration seam"));
  });

  it("treats empty and very short input as trivial", () => {
    assert.ok(isTrivialPrompt(""));
    assert.ok(isTrivialPrompt(null));
    assert.ok(isTrivialPrompt(undefined));
    assert.ok(isTrivialPrompt("a"));
  });

  it("handles punctuation variants", () => {
    assert.ok(isTrivialPrompt("ok."));
    assert.ok(isTrivialPrompt("yes!"));
    assert.ok(isTrivialPrompt("好。"));
    assert.ok(isTrivialPrompt("谢谢！"));
  });
});

describe("shouldTriggerBackgroundDistill", () => {
  let tempDir;

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("returns true when no last_run exists in processed state", () => {
    tempDir = createTempDir("lingxi-distill-trigger-");
    const state = defaultProcessedSessionsState();
    setupProjectState(tempDir, state);

    assert.ok(shouldTriggerBackgroundDistill(tempDir));
  });

  it("returns true when last_run occurred_at is beyond the interval", () => {
    tempDir = createTempDir("lingxi-distill-trigger-");
    const state = defaultProcessedSessionsState();
    state.last_run = {
      occurred_at: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString()
    };
    setupProjectState(tempDir, state);

    assert.ok(shouldTriggerBackgroundDistill(tempDir, 6));
  });

  it("returns false when last_run is within the interval", () => {
    tempDir = createTempDir("lingxi-distill-trigger-");
    const state = defaultProcessedSessionsState();
    state.last_run = {
      occurred_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
    };
    setupProjectState(tempDir, state);

    assert.ok(!shouldTriggerBackgroundDistill(tempDir, 6));
  });

  it("returns true when state file is missing (defaults to no last_run)", () => {
    tempDir = createTempDir("lingxi-distill-trigger-");
    assert.ok(shouldTriggerBackgroundDistill(path.join(tempDir, "nonexistent")));
  });
});
