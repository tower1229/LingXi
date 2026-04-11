import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import assert from "node:assert";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

function loadManifest() {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, "install", "install-manifest.json"), "utf8"));
}

describe("install manifest codex runtime", () => {
  it("ships the current 2.0 setup assets needed to bootstrap the Codex-native runtime", () => {
    const manifest = loadManifest();
    const files = new Set(manifest.files || []);

    assert.ok(files.has(".agents/plugins/marketplace.json"));
    assert.ok(files.has(".codex-plugin/plugin.json"));
    assert.ok(files.has("assets/logo-mark.svg"));
    assert.ok(files.has("assets/logo-primary.svg"));
    assert.ok(files.has("scripts/_lingxi-memory.mjs"));
    assert.ok(files.has("scripts/_lingxi-memory-semantic.mjs"));
    assert.ok(files.has("scripts/_lingxi-codex-sessions.mjs"));
    assert.ok(files.has("scripts/_lingxi-codex-session-select.mjs"));
    assert.ok(files.has("scripts/lx-bootstrap.mjs"));
    assert.ok(files.has("scripts/lx-create-automation.mjs"));
    assert.ok(files.has("scripts/lx-distill-sessions.mjs"));
    assert.ok(files.has("scripts/lx-memory-brief.mjs"));
    assert.ok(files.has("scripts/lx-select-sessions.mjs"));
    assert.ok(files.has("scripts/lingxi-memory-index.mjs"));
    assert.ok(files.has("scripts/lingxi-setup.mjs"));
    assert.ok(files.has("scripts/lx-uninstall.mjs"));
    assert.ok(files.has("templates/agents/lingxi-session-distill.toml.tmpl"));
    assert.ok(files.has("templates/automations/session-distill.toml.tmpl"));
  });

  it("declares generated runtime paths that the installer is expected to materialize", () => {
    const manifest = loadManifest();
    const runtimeFiles = new Set(manifest.runtimeFiles || []);

    assert.ok(runtimeFiles.has(".lingxi"));
    assert.ok(runtimeFiles.has(".codex/agents/lingxi-session-distill.toml"));
  });

  it("exposes explicit package scripts for setup, automation registration, and uninstall", () => {
    const manifest = loadManifest();
    assert.deepStrictEqual(manifest.packageScripts, {
      "lx:bootstrap": "node scripts/lx-bootstrap.mjs",
      "lx:create-automation": "node scripts/lx-create-automation.mjs",
      "lx:distill-sessions": "node scripts/lx-distill-sessions.mjs",
      "lx:memory-brief": "node scripts/lx-memory-brief.mjs",
      "lx:setup": "node scripts/lingxi-setup.mjs",
      "lx:uninstall": "node scripts/lx-uninstall.mjs"
    });
  });
});
