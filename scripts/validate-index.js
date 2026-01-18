#!/usr/bin/env node

/**
 * 验证 .cursor/.lingxi/requirements/INDEX.md 格式的脚本
 * 
 * 验证内容：
 * 1. 表头格式（7 个字段）
 * 2. ID 格式（REQ-xxx）
 * 3. Status 值有效性
 * 4. Current Phase 值有效性
 * 5. 文件一致性（索引中的 REQ 对应的文件是否存在）
 * 6. 目录一致性（Status 和文件位置是否匹配）
 */

const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
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
const VALID_STATUS = ['in-progress', 'planned', 'in-review', 'needs-fix', 'completed'];
const VALID_PHASE = ['req', 'plan', 'audit', 'work', 'review', 'archive'];

// 期望的表头字段
const EXPECTED_HEADER = ['ID', 'Title', 'Status', 'Current Phase', 'Next Action', 'Blockers', 'Links'];

/**
 * 解析表头行
 */
function parseHeader(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|')) return null;
  const parts = trimmed.split('|').slice(1, -1).map(s => s.trim());
  return parts;
}

/**
 * 解析数据行
 */
function parseRow(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|')) return null;
  const parts = trimmed.split('|').slice(1, -1).map(s => s.trim());
  if (parts.length < 7) return null;
  
  const [id, title, status, currentPhase, nextAction, blockers, links] = parts;
  
  // 验证 ID 格式
  if (!/^REQ-\d{3,}$/.test(id)) return null;
  
  return { id, title, status, currentPhase, nextAction, blockers, links };
}

/**
 * 验证表头格式
 */
function validateHeader(header) {
  if (header.length !== EXPECTED_HEADER.length) {
    return {
      valid: false,
      error: `表头字段数量不正确：期望 ${EXPECTED_HEADER.length} 个，实际 ${header.length} 个`
    };
  }
  
  for (let i = 0; i < EXPECTED_HEADER.length; i++) {
    if (header[i] !== EXPECTED_HEADER[i]) {
      return {
        valid: false,
        error: `表头字段顺序不正确：第 ${i + 1} 个字段期望 "${EXPECTED_HEADER[i]}"，实际 "${header[i]}"`
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
    errors.push(`行 ${row.id}: Status 值无效 "${row.status}"，有效值：${VALID_STATUS.join(', ')}`);
  }
  
  // 验证 Current Phase 值
  if (!VALID_PHASE.includes(row.currentPhase)) {
    errors.push(`行 ${row.id}: Current Phase 值无效 "${row.currentPhase}"，有效值：${VALID_PHASE.join(', ')}`);
  }
  
  // 解析 Links 字段，提取文件路径
  // Links 格式示例：`.cursor/.lingxi/requirements/completed/REQ-001.md` / `.plan.md` / `.review.md`
  // 或：`.cursor/.lingxi/requirements/in-progress/REQ-002.md` / `.plan.md`
  const filePaths = [];
  
  // 移除反引号
  const cleanLinks = row.links.replace(/`/g, '').trim();
  
  // 按 '/' 分割，但保留完整路径
  const parts = cleanLinks.split(/\s*\/\s*/).map(s => s.trim()).filter(s => s);
  
  let baseDir = null;
  
  parts.forEach(part => {
    // 如果是完整路径（包含 .cursor/.lingxi/requirements/）
    if (part.includes('.cursor/.lingxi/requirements/')) {
      // 提取完整路径
      const fullPath = path.join(projectRoot, part);
      filePaths.push(fullPath);
      
      // 提取基础目录（用于后续相对路径）
      const match = part.match(/\.cursor\/\.lingxi\/requirements\/(in-progress|completed)\//);
      if (match) {
        baseDir = path.join(projectRoot, '.cursor/.lingxi/requirements', match[1]);
      }
    } else if (part.endsWith('.md') || part.endsWith('.plan.md') || part.endsWith('.review.md')) {
      // 相对路径（如 `.plan.md`），需要基于 baseDir
      if (baseDir) {
        // 从 baseDir 构建完整路径
        // 例如：baseDir = .../completed, part = `.plan.md` -> .../completed/REQ-001.plan.md
        const reqId = row.id;
        const fileName = part.replace(/^\./, `${reqId}.`);
        filePaths.push(path.join(baseDir, fileName));
      } else {
        // 如果没有 baseDir，尝试直接解析
        if (part.startsWith('.')) {
          // 相对路径，需要找到对应的 REQ 文件
          const reqId = row.id;
          const fileName = part.replace(/^\./, `${reqId}.`);
          // 根据 status 判断目录
          const dir = row.status === 'completed' ? 'completed' : 'in-progress';
          filePaths.push(path.join(projectRoot, '.cursor/.lingxi/requirements', dir, fileName));
        }
      }
    }
  });
  
  // 去重
  const uniquePaths = [...new Set(filePaths)];
  
  // 检查文件一致性
  uniquePaths.forEach(filePath => {
    if (!fs.existsSync(filePath)) {
      errors.push(`行 ${row.id}: 文件不存在 "${filePath}"`);
    }
  });
  
  // 检查目录一致性
  const isCompleted = row.status === 'completed';
  uniquePaths.forEach(filePath => {
    const normalizedPath = path.normalize(filePath);
    const inProgress = normalizedPath.includes('in-progress');
    const completed = normalizedPath.includes('completed');
    
    if (isCompleted && inProgress) {
      errors.push(`行 ${row.id}: Status 为 "completed" 但文件在 in-progress/ 目录 "${filePath}"`);
    } else if (!isCompleted && completed) {
      errors.push(`行 ${row.id}: Status 为 "${row.status}" 但文件在 completed/ 目录 "${filePath}"`);
    }
  });
  
  return errors;
}

/**
 * 主函数
 */
function main() {
  // 获取项目根目录
  const indexPath = process.argv[2] || path.join(process.cwd(), '.cursor/.lingxi/requirements/INDEX.md');
  const projectRoot = path.dirname(path.dirname(path.dirname(indexPath)));
  
  // 检查文件是否存在
  if (!fs.existsSync(indexPath)) {
    error(`文件不存在: ${indexPath}`);
    process.exit(1);
  }
  
  // 读取文件
  const content = fs.readFileSync(indexPath, 'utf8');
  const lines = content.split('\n');
  
  let header = null;
  let headerLineIndex = -1;
  const rows = [];
  const errors = [];
  
  // 解析文件
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 查找表头
    if (!header && line.includes('| ID |')) {
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
  if (errors.length === 0) {
    success(`验证通过：${rows.length} 行数据全部正确`);
    process.exit(0);
  } else {
    error(`验证失败：发现 ${errors.length} 个错误`);
    errors.forEach(err => error(`  ${err}`));
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = { parseHeader, parseRow, validateHeader, validateRow };
