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

  it("describes the repository as a Codex-native rebuild with no supported legacy install surface", () => {
    const readme = readText("README.md");
    const readmeZh = readText("README_ZH.md");

    assert.match(readme, /Codex-native/i);
    assert.match(readme, /historical `?\.cursor\/`? material|not part of the 2\.0 install surface/i);
    assert.match(readme, /quality-first rebuild/i);
    assert.doesNotMatch(readme, /transitional compatibility path|Cursor compatibility/i);

    assert.match(readmeZh, /Codex-native/i);
    assert.match(readmeZh, /不属于 2\.0 的安装与支持表层|历史参考材料/);
    assert.match(readmeZh, /重建阶段|质量优先/);
    assert.doesNotMatch(readmeZh, /兼容安装面|过渡期兼容路径/);
  });

  it("describes install docs as the direct Codex-native 2.0 distribution path", () => {
    const installReadme = readText("install/README.md");

    assert.match(installReadme, /Codex-native/i);
    assert.match(installReadme, /不再提供旧版 `?\.cursor\/`? 兼容安装|no longer install or manage `?\.cursor\/`? assets/i);
    assert.doesNotMatch(installReadme, /过渡期|transitional|兼容安装面|Cursor compatibility/i);
  });

  it("keeps the remaining .cursor tree explicitly documented as historical only", () => {
    const classification = readText("docs/cursor-era-asset-classification.md");
    const cursorReadme = readText(".cursor/README.md");

    assert.match(classification, /does \*\*not\*\* treat any `?\.cursor\/`? path as supported product surface/i);
    assert.match(classification, /Reference-Only/);
    assert.match(classification, /Migration Artifacts/);
    assert.match(classification, /Delete-Later Candidates/);

    assert.match(cursorReadme, /historical reference/i);
    assert.match(cursorReadme, /not(?:\s|\*+)+part of the supported LingXi 2\.0 product surface/i);
    assert.match(cursorReadme, /cursor-era-asset-classification\.md/i);
  });
});
