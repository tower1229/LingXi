#!/usr/bin/env node

/**
 * 验证 .cursor/.lingxi/tasks/INDEX.md 格式的脚本
 *
 * 验证内容：
 * 1. 表头格式（7 个字段）
 * 2. ID 格式（REQ-xxx）
 * 3. Status 值有效性
 * 4. Current Phase 值有效性
 * 5. 文件一致性（索引中的 REQ 对应的文件是否存在）
 * 6. 目录一致性（Status 和文件位置是否匹配）
 */

const fs = require("fs");
const path = require("path");

// 颜色输出
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
};

function error(message) {
  console.error(`${colors.red}✗${colors.reset} ${message}`);
}

function success(message) {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

function warning(message) {
  console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
}

// 有效值定义
const VALID_STATUS = [
  "in-progress",
  "planned",
  "in-review",
  "needs-fix",
  "completed",
];
const VALID_PHASE = ["req", "plan", "audit", "work", "review", "archive"];

// 期望的表头字段
const EXPECTED_HEADER = [
  "ID",
  "Title",
  "Status",
  "Current Phase",
  "Next Action",
  "Blockers",
  "Links",
];

/**
 * 解析表头行
 */
function parseHeader(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|")) return null;
  const parts = trimmed
    .split("|")
    .slice(1, -1)
    .map((s) => s.trim());
  return parts;
}

/**
 * 解析数据行
 */
function parseRow(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|")) return null;
  const parts = trimmed
    .split("|")
    .slice(1, -1)
    .map((s) => s.trim());
  if (parts.length < 7) return null;

  const [id, title, status, currentPhase, nextAction, blockers, links] = parts;

  // 验证 ID 格式
  if (!/^(REQ-\d{3,}|\d{3,})$/.test(id)) return null;

  return { id, title, status, currentPhase, nextAction, blockers, links };
}

/**
 * 按链接分隔符拆分 Links 字段。
 * 约定分隔符是 " / "（两侧至少一侧有空白），避免切碎路径本身的 "/"
 */
function splitLinkParts(links) {
  return links
    .replace(/`/g, "")
    .trim()
    .split(/\s+\/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function deriveTaskPrefixFromFile(fileName, fallbackId) {
  const reqStyle = fileName.match(/^([^.]+)\.req\./);
  if (reqStyle) return reqStyle[1];

  const legacyStyle = fileName.match(/^([^.]+)\.md$/);
  if (legacyStyle) return legacyStyle[1];

  return fallbackId;
}

function inferProjectRootFromIndexPath(indexPath) {
  const resolved = path.resolve(indexPath);
  const marker = `${path.sep}.cursor${path.sep}.lingxi${path.sep}tasks${path.sep}`;
  const markerIndex = resolved.indexOf(marker);

  if (markerIndex !== -1) {
    const root = resolved.slice(0, markerIndex);
    return root || path.parse(resolved).root;
  }

  return path.resolve(path.dirname(resolved), "../../..");
}

/**
 * 验证表头格式
 */
function validateHeader(header) {
  if (header.length !== EXPECTED_HEADER.length) {
    return {
      valid: false,
      error: `表头字段数量不正确：期望 ${EXPECTED_HEADER.length} 个，实际 ${header.length} 个`,
    };
  }

  for (let i = 0; i < EXPECTED_HEADER.length; i++) {
    if (header[i] !== EXPECTED_HEADER[i]) {
      return {
        valid: false,
        error: `表头字段顺序不正确：第 ${i + 1} 个字段期望 "${EXPECTED_HEADER[i]}"，实际 "${header[i]}"`,
      };
    }
  }

  return { valid: true };
}

/**
 * 验证行数据
 */
function validateRow(row, projectRoot) {
  const errors = [];

  // 验证 Status 值
  if (!VALID_STATUS.includes(row.status)) {
    errors.push(
      `行 ${row.id}: Status 值无效 "${row.status}"，有效值：${VALID_STATUS.join(", ")}`,
    );
  }

  // 验证 Current Phase 值
  if (!VALID_PHASE.includes(row.currentPhase)) {
    errors.push(
      `行 ${row.id}: Current Phase 值无效 "${row.currentPhase}"，有效值：${VALID_PHASE.join(", ")}`,
    );
  }

  // 解析 Links 字段，提取文件路径
  // Links 格式示例：
  // - `.cursor/.lingxi/tasks/completed/REQ-001.md` / `.plan.md` / `.review.md`
  // - `.cursor/.lingxi/tasks/in-progress/001.req.标题.md` / `001.plan.标题.md`
  const filePaths = [];
  const parts = splitLinkParts(row.links);

  let baseDir = null;
  let basePrefix = row.id;

  parts.forEach((part) => {
    // 如果是完整路径（包含 .cursor/.lingxi/tasks/）
    if (part.includes(".cursor/.lingxi/tasks/")) {
      // 提取完整路径
      const fullPath = path.join(projectRoot, part);
      filePaths.push(fullPath);

      // 提取基础目录与任务前缀（用于后续相对路径）
      baseDir = path.dirname(fullPath);
      basePrefix = deriveTaskPrefixFromFile(path.basename(fullPath), row.id);
    } else if (
      part.endsWith(".md")
    ) {
      // 相对路径（如 `.plan.md`）或文件名（如 `001.plan.xxx.md`）
      if (baseDir) {
        if (part.startsWith(".")) {
          // 例如：`.plan.md` -> `<prefix>.plan.md`
          const fileName = part.replace(/^\./, `${basePrefix}.`);
          filePaths.push(path.join(baseDir, fileName));
        } else {
          filePaths.push(path.join(baseDir, part));
        }
      } else {
        // 没有 baseDir 时，按状态目录做兜底解析
        const dir = row.status === "completed" ? "completed" : "in-progress";
        if (part.startsWith(".")) {
          const fileName = part.replace(/^\./, `${row.id}.`);
          filePaths.push(path.join(projectRoot, ".cursor/.lingxi/tasks", dir, fileName));
        } else {
          filePaths.push(path.join(projectRoot, ".cursor/.lingxi/tasks", dir, part));
        }
      }
    }
  });

  // 去重
  const uniquePaths = [...new Set(filePaths)];

  // 检查文件一致性
  uniquePaths.forEach((filePath) => {
    if (!fs.existsSync(filePath)) {
      errors.push(`行 ${row.id}: 文件不存在 "${filePath}"`);
    }
  });

  // 检查目录一致性
  const isCompleted = row.status === "completed";
  uniquePaths.forEach((filePath) => {
    const normalizedPath = path.normalize(filePath);
    const inProgress = normalizedPath.includes("in-progress");
    const completed = normalizedPath.includes("completed");

    if (isCompleted && inProgress) {
      errors.push(
        `行 ${row.id}: Status 为 "completed" 但文件在 in-progress/ 目录 "${filePath}"`,
      );
    } else if (!isCompleted && completed) {
      errors.push(
        `行 ${row.id}: Status 为 "${row.status}" 但文件在 completed/ 目录 "${filePath}"`,
      );
    }
  });

  return errors;
}

/**
 * 主函数
 */
function main() {
  // 获取项目根目录
  const indexPath =
    process.argv[2] ||
    path.join(process.cwd(), ".cursor/.lingxi/tasks/INDEX.md");
  const projectRoot = inferProjectRootFromIndexPath(indexPath);

  // 检查文件是否存在
  if (!fs.existsSync(indexPath)) {
    error(`文件不存在: ${indexPath}`);
    process.exit(1);
  }

  // 读取文件
  const content = fs.readFileSync(indexPath, "utf8");
  const lines = content.split("\n");

  let header = null;
  let headerLineIndex = -1;
  const rows = [];
  const errors = [];

  // 解析文件
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 查找表头
    if (!header && line.includes("| ID |")) {
      header = parseHeader(line);
      if (header) {
        headerLineIndex = i;
        const headerValidation = validateHeader(header);
        if (!headerValidation.valid) {
          errors.push(`表头验证失败: ${headerValidation.error}`);
        }
      }
    }

    // 解析数据行（表头之后）
    if (header && i > headerLineIndex) {
      const row = parseRow(line);
      if (row) {
        rows.push(row);
        const rowErrors = validateRow(row, projectRoot);
        errors.push(...rowErrors);
      }
    }
  }

  // 输出结果
  if (!header) {
    errors.push("未找到表头（应包含 `| ID |`）");
  }

  if (errors.length === 0) {
    success(`验证通过：${rows.length} 行数据全部正确`);
    process.exit(0);
  } else {
    error(`验证失败：发现 ${errors.length} 个错误`);
    errors.forEach((err) => error(`  ${err}`));
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = {
  parseHeader,
  parseRow,
  validateHeader,
  validateRow,
  splitLinkParts,
  inferProjectRootFromIndexPath,
};
