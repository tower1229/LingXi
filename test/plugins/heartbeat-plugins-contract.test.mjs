/**
 * Heartbeat Plugins Contract Tests.
 * Validates that all plugins in heartbeat-plugins/ conform to the plugin contract.
 */
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, it } from "node:test";
import assert from "node:assert";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const PLUGINS_DIR = path.join(REPO_ROOT, "heartbeat-plugins");
const REGISTRY_PATH = pathToFileURL(path.join(PLUGINS_DIR, "registry.mjs")).href;

// Plugin contract required fields
const REQUIRED_FIELDS = ["id", "consumer", "shouldEnqueue"];

describe("heartbeat-plugins contract", () => {
  it("registry.mjs exists and exports getRegisteredApps", async () => {
    const registry = await import(REGISTRY_PATH);
    assert.strictEqual(typeof registry.getRegisteredApps, "function", "getRegisteredApps must be a function");
  });

  it("all registered plugins conform to contract", async () => {
    const { getRegisteredApps } = await import(REGISTRY_PATH);
    const plugins = getRegisteredApps();

    assert.ok(plugins.length > 0, "At least one plugin must be registered");

    for (const plugin of plugins) {
      // Check required fields exist
      for (const field of REQUIRED_FIELDS) {
        assert.ok(
          plugin[field] !== undefined,
          `Plugin ${plugin.id || "unknown"} must have field: ${field}`
        );
      }

      // Validate id is non-empty string
      assert.ok(
        typeof plugin.id === "string" && plugin.id.length > 0,
        `Plugin id must be non-empty string, got: ${plugin.id}`
      );

      // Validate consumer is valid
      assert.ok(
        plugin.consumer === "main-agent" || plugin.consumer === "watchdog",
        `Plugin ${plugin.id} consumer must be "main-agent" or "watchdog", got: ${plugin.consumer}`
      );

      // Validate shouldEnqueue is function
      assert.ok(
        typeof plugin.shouldEnqueue === "function",
        `Plugin ${plugin.id} shouldEnqueue must be a function`
      );

      // If consumer is watchdog, execCommand should exist
      if (plugin.consumer === "watchdog") {
        assert.ok(
          typeof plugin.execCommand === "function",
          `Plugin ${plugin.id} (watchdog) must have execCommand function`
        );
      }
    }
  });

  it("SESSION_DISTILL has onFailure callback for consistency", async () => {
    const sessionDistillPath = pathToFileURL(path.join(PLUGINS_DIR, "session-distill.mjs")).href;
    const { default: sessionDistill } = await import(sessionDistillPath);
    assert.ok(
      typeof sessionDistill.onFailure === "function",
      "SESSION_DISTILL should have onFailure callback"
    );
  });

  it("SELF_ITERATE has onFailure callback", async () => {
    const selfIteratePath = pathToFileURL(path.join(PLUGINS_DIR, "self-iterate.mjs")).href;
    const { default: selfIterate } = await import(selfIteratePath);
    assert.ok(
      typeof selfIterate.onFailure === "function",
      "SELF_ITERATE should have onFailure callback"
    );
  });
});
