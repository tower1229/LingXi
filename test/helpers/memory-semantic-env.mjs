import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const memorySemanticRunnerModulePath = path.resolve(__dirname, "../fixtures/memory-semantic-runner.mjs");

export function withMemorySemanticRunnerModule(env = {}, modulePath = memorySemanticRunnerModulePath) {
  return {
    ...env,
    LINGXI_MEMORY_SEMANTIC_RUNNER_MODULE: modulePath
  };
}

export function withMemorySemanticTestEnv(env = {}) {
  return withMemorySemanticRunnerModule(env, memorySemanticRunnerModulePath);
}
