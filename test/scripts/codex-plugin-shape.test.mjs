import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import assert from "node:assert";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const pluginPath = path.join(repoRoot, ".codex-plugin", "plugin.json");
const marketplacePath = path.join(repoRoot, ".agents", "plugins", "marketplace.json");

describe("codex plugin shape", () => {
  it("declares a plugin manifest that points to an existing skills directory", () => {
    const manifest = JSON.parse(fs.readFileSync(pluginPath, "utf8"));
    assert.ok(typeof manifest.name === "string" && manifest.name.length > 0);
    assert.ok(typeof manifest.version === "string" && manifest.version.length > 0);
    assert.strictEqual(manifest.skills, "./skills/");
    assert.ok(fs.existsSync(path.join(repoRoot, manifest.skills)));
  });

  it("exposes install-surface metadata expected for a marketplace-ready plugin", () => {
    const manifest = JSON.parse(fs.readFileSync(pluginPath, "utf8"));

    assert.strictEqual(manifest.author?.name, "tower1229");
    assert.strictEqual(manifest.license, "MIT");
    assert.strictEqual(manifest.interface?.displayName, "LingXi");
    assert.strictEqual(manifest.interface?.category, "Productivity");
    assert.ok(Array.isArray(manifest.interface?.defaultPrompt));
    assert.ok(fs.existsSync(path.join(repoRoot, manifest.interface.composerIcon)));
    assert.ok(fs.existsSync(path.join(repoRoot, manifest.interface.logo)));
  });

  it("is listed in the repo marketplace using the official marketplace path", () => {
    const marketplace = JSON.parse(fs.readFileSync(marketplacePath, "utf8"));
    const lingxi = marketplace.plugins.find((entry) => entry.name === "lingxi");

    assert.strictEqual(marketplace.name, "lingxi-plugins");
    assert.strictEqual(marketplace.interface?.displayName, "LingXi Plugins");
    assert.ok(lingxi);
    assert.strictEqual(lingxi.source?.source, "local");
    assert.strictEqual(lingxi.source?.path, "./");
    assert.strictEqual(lingxi.policy?.installation, "AVAILABLE");
    assert.strictEqual(lingxi.policy?.authentication, "ON_INSTALL");
    assert.strictEqual(lingxi.category, "Productivity");
  });
});
