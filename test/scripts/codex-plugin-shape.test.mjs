import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import assert from "node:assert";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const pluginPath = path.join(repoRoot, ".codex-plugin", "plugin.json");

describe("codex plugin shape", () => {
  it("declares a plugin manifest that points to an existing skills directory", () => {
    const manifest = JSON.parse(fs.readFileSync(pluginPath, "utf8"));
    assert.ok(typeof manifest.name === "string" && manifest.name.length > 0);
    assert.ok(typeof manifest.version === "string" && manifest.version.length > 0);
    assert.strictEqual(manifest.skills, "skills");
    assert.ok(fs.existsSync(path.join(repoRoot, manifest.skills)));
  });
});
