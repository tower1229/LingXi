/**
 * validate-template.mjs tests.
 * Runs script with cwd set to fixture (valid vs invalid plugin); asserts exit code and output.
 */
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import assert from "node:assert";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const SCRIPT_PATH = path.join(REPO_ROOT, "scripts", "validate-template.mjs");
const FIXTURE_OK = path.join(__dirname, "../fixtures/validate-plugin-ok");
const FIXTURE_FAIL = path.join(__dirname, "../fixtures/validate-plugin-fail");

function runValidate(cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [SCRIPT_PATH], {
      cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d) => { stdout += d; });
    child.stderr?.on("data", (d) => { stderr += d; });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
    child.on("error", reject);
  });
}

describe("validate-plugin", () => {
  it("passes when plugin has valid manifest and frontmatter", async () => {
    const { code, stdout, stderr } = await runValidate(FIXTURE_OK);
    assert.strictEqual(code, 0, "exit code 0: " + stderr);
    assert.ok(stdout.includes("Validation passed") || stdout.includes("passed"));
  });

  it("fails when skill file lacks frontmatter", async () => {
    const { code, stderr } = await runValidate(FIXTURE_FAIL);
    assert.strictEqual(code, 1, "exit code 1");
    assert.ok(
      stderr.includes("frontmatter") || stderr.includes("missing") || stderr.includes("skill"),
      "stderr should mention frontmatter/skill: " + stderr
    );
  });
});
