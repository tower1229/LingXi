#!/usr/bin/env node
/**
 * 灵犀工作区骨架创建脚本：检测并创建缺失的 .cursor/.lingxi/ 目录和文件。
 * 幂等执行，供 workspace-bootstrap Skill 或 init command 调用。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SKILL_DIR = path.resolve(__dirname, "..");
const REFS_DIR = path.join(SKILL_DIR, "references");

const TEMPLATE_SOURCES = {
  ".cursor/.lingxi/memory/references/memory-note-template.md":
    "memory-note-template.default.md",
  ".cursor/.lingxi/memory/INDEX.md": "INDEX.default.md",
};

function main() {
  try {
    const projectRoot =
      process.env.CURSOR_PROJECT_DIR ||
      process.env.CLAUDE_PROJECT_DIR ||
      process.cwd();

    const skeletonPath = path.join(REFS_DIR, "workflow-skeleton.json");
    if (!fs.existsSync(skeletonPath)) {
      console.error("[workspace-bootstrap] workflow-skeleton.json not found");
      process.exit(1);
    }

    const skeleton = JSON.parse(
      fs.readFileSync(skeletonPath, { encoding: "utf8" })
    );
    const { workflowDirectories } = skeleton;

    for (const dir of workflowDirectories) {
      const fullPath = path.join(projectRoot, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    }

    for (const [targetRel, sourceFile] of Object.entries(TEMPLATE_SOURCES)) {
      const targetPath = path.join(projectRoot, targetRel);
      if (fs.existsSync(targetPath)) continue;

      const sourcePath = path.join(REFS_DIR, sourceFile);
      if (!fs.existsSync(sourcePath)) {
        console.error(`[workspace-bootstrap] ${sourceFile} not found`);
        process.exit(1);
      }

      const parentDir = path.dirname(targetPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }

      const content = fs.readFileSync(sourcePath, { encoding: "utf8" });
      fs.writeFileSync(targetPath, content, { encoding: "utf8" });
    }

    process.exit(0);
  } catch (err) {
    console.error("[workspace-bootstrap]", err.message);
    process.exit(1);
  }
}

main();
