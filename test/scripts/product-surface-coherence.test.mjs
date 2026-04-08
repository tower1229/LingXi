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

    assert.strictEqual(pkg.scripts.test, "node --test \"test/scripts/**/*.test.mjs\"");
    assert.strictEqual(pkg.scripts["test:scripts"], "node --test \"test/scripts/**/*.test.mjs\"");
    assert.ok(!("test:legacy" in pkg.scripts));
    assert.ok(!("test:all" in pkg.scripts));
  });

  it("describes the repository as a released Codex-native product with no supported legacy install surface", () => {
    const readme = readText("README.md");
    const readmeZh = readText("README_ZH.md");

    assert.match(readme, /Codex-native/i);
    assert.match(readme, /Cursor-era repository content has been removed|retirement record/i);
    assert.match(readme, /ready for release|released/i);
    assert.doesNotMatch(readme, /rebuild phase/i);
    assert.doesNotMatch(readme, /transitional compatibility path|Cursor compatibility/i);
    assert.doesNotMatch(readme, /npm run test:legacy|npm run test:all/);

    assert.match(readmeZh, /Codex-native/i);
    assert.match(readmeZh, /已经从主树中移除|退役记录/);
    assert.match(readmeZh, /可发布|已完成当前产品范围内的实现|质量优先/);
    assert.doesNotMatch(readmeZh, /重建阶段/);
    assert.doesNotMatch(readmeZh, /兼容安装面|过渡期兼容路径/);
    assert.doesNotMatch(readmeZh, /npm run test:legacy|npm run test:all/);
  });

  it("records Phase 5/6 closure as achieved rather than still in progress", () => {
    const closurePlan = readText("docs/phase-5-6-closure-plan.md");

    assert.match(closurePlan, /closure result|release pass/i);
    assert.match(closurePlan, /productized at the supported release surface|current supported 2\.0 release surface/i);
    assert.doesNotMatch(closurePlan, /not yet fully productized|remaining gap|Current Read/);
  });

  it("describes install docs as the direct Codex-native 2.0 distribution path", () => {
    const installReadme = readText("install/README.md");

    assert.match(installReadme, /Codex-native/i);
    assert.match(installReadme, /只安装受支持的|directly install the supported|Codex-native LingXi 2\.0 surface/i);
    assert.doesNotMatch(installReadme, /过渡期|transitional|兼容安装面|Cursor compatibility/i);
  });

  it("keeps Cursor-era retirement documented and removes unsupported source-level runtime surfaces", () => {
    const classification = readText("docs/cursor-era-asset-classification.md");

    assert.match(classification, /Cursor-era repository content has now been removed from the main LingXi repository/i);
    assert.match(classification, /no active test suite requires `?\.cursor\/`? paths/i);
    assert.match(classification, /retirement work is complete/i);
    assert.ok(!fs.existsSync(path.join(repoRoot, ".cursor")));
    assert.ok(!fs.existsSync(path.join(repoRoot, ".cursor-plugin")));
    assert.ok(!fs.existsSync(path.join(repoRoot, ".lingxi")));
    assert.ok(!fs.existsSync(path.join(repoRoot, ".codex")));
    assert.ok(!fs.existsSync(path.join(repoRoot, "AGENTS.md")));
    assert.ok(!fs.existsSync(path.join(repoRoot, "test/legacy")));
  });
});
