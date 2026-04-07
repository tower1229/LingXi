import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import assert from "node:assert";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

function readText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("product surface coherence", () => {
  it("keeps package and codex plugin versions aligned", () => {
    const pkg = JSON.parse(readText("package.json"));
    const plugin = JSON.parse(readText(".codex-plugin/plugin.json"));

    assert.strictEqual(
      pkg.version,
      plugin.version,
      `package.json version (${pkg.version}) must match .codex-plugin/plugin.json version (${plugin.version})`
    );
  });

  it("describes the repository as a Codex-native rebuild while acknowledging retained Cursor assets", () => {
    const readme = readText("README.md");
    const readmeZh = readText("README_ZH.md");

    assert.match(readme, /Codex-native/i);
    assert.match(readme, /legacy `?\.cursor\/`? assets/i);
    assert.match(readme, /rebuild phase|quality-first rebuild/i);

    assert.match(readmeZh, /Codex-native/i);
    assert.match(readmeZh, /旧的 `?\.cursor\/`? 资产|保留中的 Cursor 时代资产/);
    assert.match(readmeZh, /重建阶段|质量优先/);
  });

  it("marks install docs as a transitional Cursor compatibility path", () => {
    const installReadme = readText("install/README.md");

    assert.match(installReadme, /过渡期|transitional/i);
    assert.match(installReadme, /Cursor 兼容安装面|Cursor compatibility/i);
    assert.match(installReadme, /Codex-native/i);
  });
});
