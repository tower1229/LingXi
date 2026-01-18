#!/usr/bin/env node

/**
 * 验证和更新 .workflow/context/experience/INDEX.md 格式的脚本
 * 
 * 功能：
 * 1. 索引生成：扫描经验文件目录，自动生成 INDEX.md
 * 2. 索引更新：读取现有 INDEX.md，扫描经验文件目录，比较并更新索引
 * 3. 冲突检测：检测缺失的文件、缺失的索引行、字段不一致
 * 4. 格式验证：验证索引格式、字段完整性、字段格式
 */

const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
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

function info(message) {
  console.log(`${colors.blue}ℹ${colors.reset} ${message}`);
}

// 有效值定义
const VALID_STATUS = ['active', 'deprecated'];
const VALID_SCOPE = ['narrow', 'medium', 'broad'];
const VALID_STRENGTH = ['hypothesis', 'validated', 'enforced'];

// 期望的表头字段
const EXPECTED_HEADER = ['Tag', 'Title', 'Trigger (when to load)', 'Surface signal', 'Hidden risk', 'Status', 'Scope', 'Strength', 'Replaces', 'ReplacedBy', 'File'];

// 经验文件目录
const EXPERIENCE_DIR = path.join(process.cwd(), '.workflow/context/experience');
const INDEX_PATH = path.join(EXPERIENCE_DIR, 'INDEX.md');

/**
 * 从经验文件中提取字段
 */
function extractFieldsFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  // 提取 Tag（从文件名）
  const fileName = path.basename(filePath, '.md');
  const tag = fileName;
  
  // 提取 Title（第一行标题）
  let title = '';
  for (const line of lines) {
    if (line.startsWith('# ')) {
      title = line.replace(/^#\s+/, '').trim();
      break;
    }
  }
  
  // 提取 Trigger（从"## 触发条件（When to load）"部分）
  let trigger = '';
  let inTriggerSection = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('## 触发条件') || line.includes('## When to load')) {
      inTriggerSection = true;
      continue;
    }
    if (inTriggerSection) {
      if (line.startsWith('## ')) {
        break;
      }
      if (line.trim() && !line.startsWith('-')) {
        trigger += (trigger ? ' ' : '') + line.trim();
      }
    }
  }
  trigger = trigger.trim();
  
  return { tag, title, trigger };
}

/**
 * 解析 INDEX.md 表头
 */
function parseHeader(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|')) return null;
  const parts = trimmed.split('|').slice(1, -1).map(s => s.trim());
  return parts;
}

/**
 * 解析 INDEX.md 数据行
 */
function parseRow(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|')) return null;
  const parts = trimmed.split('|').slice(1, -1).map(s => s.trim());
  if (parts.length < EXPECTED_HEADER.length) return null;
  
  const [tag, title, trigger, surfaceSignal, hiddenRisk, status, scope, strength, replaces, replacedBy, file] = parts;
  
  return { tag, title, trigger, surfaceSignal, hiddenRisk, status, scope, strength, replaces, replacedBy, file };
}

/**
 * 读取现有 INDEX.md
 */
function readExistingIndex() {
  if (!fs.existsSync(INDEX_PATH)) {
    return { header: null, rows: [] };
  }
  
  const content = fs.readFileSync(INDEX_PATH, 'utf8');
  const lines = content.split('\n');
  
  let header = null;
  let headerLineIndex = -1;
  const rows = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 查找表头
    if (!header && line.includes('| Tag |')) {
      header = parseHeader(line);
      if (header) {
        headerLineIndex = i;
      }
    }
    
    // 解析数据行（跳过表头后的分隔行）
    if (header && i > headerLineIndex + 1) {
      const row = parseRow(line);
      if (row && row.tag) {
        rows.push(row);
      }
    }
  }
  
  return { header, rows };
}

/**
 * 扫描经验文件目录
 */
function scanExperienceFiles() {
  const files = [];
  
  if (!fs.existsSync(EXPERIENCE_DIR)) {
    return files;
  }
  
  const entries = fs.readdirSync(EXPERIENCE_DIR, { withFileTypes: true });
  
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'INDEX.md') {
      const filePath = path.join(EXPERIENCE_DIR, entry.name);
      const fields = extractFieldsFromFile(filePath);
      files.push({
        ...fields,
        file: `.workflow/context/experience/${entry.name}`,
        filePath,
      });
    }
  }
  
  return files;
}

/**
 * 生成索引行
 */
function generateIndexRow(file, existingRow = null) {
  const tag = file.tag;
  const title = file.title || '';
  const trigger = file.trigger || '';
  const filePath = file.file;
  
  // 从现有索引中获取其他字段，如果没有则使用默认值
  const surfaceSignal = existingRow?.surfaceSignal || '';
  const hiddenRisk = existingRow?.hiddenRisk || '';
  const status = existingRow?.status || 'active';
  const scope = existingRow?.scope || 'medium';
  const strength = existingRow?.strength || 'hypothesis';
  const replaces = existingRow?.replaces || '';
  const replacedBy = existingRow?.replacedBy || '';
  
  return {
    tag,
    title,
    trigger,
    surfaceSignal,
    hiddenRisk,
    status,
    scope,
    strength,
    replaces,
    replacedBy,
    file: filePath,
  };
}

/**
 * 生成 INDEX.md 内容
 */
function generateIndexContent(rows) {
  const header = EXPECTED_HEADER.join(' | ');
  const separator = EXPECTED_HEADER.map(() => '---').join(' | ');
  
  let content = `# Experience Index\n\n`;
  content += `> 这里存放"会让下次更快/更稳"的经验沉淀。每条经验必须包含：触发条件、解决方案、校验方式、关联指针。\n>\n`;
  content += `> 重要：本索引的 Trigger 不仅用于检索，也用于"认知触发"。建议为每条经验补齐：\n>\n`;
  content += `> - Surface signal：表层信号（我闻到了熟悉的风险味道）\n`;
  content += `> - Hidden risk：隐含风险（真正会出问题的点）\n\n`;
  content += `| ${header} |\n`;
  content += `| ${separator} |\n`;
  
  for (const row of rows) {
    const line = `| ${row.tag} | ${row.title} | ${row.trigger} | ${row.surfaceSignal} | ${row.hiddenRisk} | ${row.status} | ${row.scope} | ${row.strength} | ${row.replaces} | ${row.replacedBy} | \`${row.file}\` |`;
    content += line + '\n';
  }
  
  return content;
}

/**
 * 验证索引格式
 */
function validateIndex(rows) {
  const errors = [];
  const warnings = [];
  
  for (const row of rows) {
    // 验证 Status
    if (row.status && !VALID_STATUS.includes(row.status)) {
      errors.push(`行 ${row.tag}: Status 值无效 "${row.status}"，有效值：${VALID_STATUS.join(', ')}`);
    }
    
    // 验证 Scope
    if (row.scope && !VALID_SCOPE.includes(row.scope)) {
      errors.push(`行 ${row.tag}: Scope 值无效 "${row.scope}"，有效值：${VALID_SCOPE.join(', ')}`);
    }
    
    // 验证 Strength
    if (row.strength && !VALID_STRENGTH.includes(row.strength)) {
      errors.push(`行 ${row.tag}: Strength 值无效 "${row.strength}"，有效值：${VALID_STRENGTH.join(', ')}`);
    }
    
    // 验证文件是否存在
    if (row.file) {
      const filePath = path.join(process.cwd(), row.file.replace(/^`|`$/g, ''));
      if (!fs.existsSync(filePath)) {
        errors.push(`行 ${row.tag}: 文件不存在 "${row.file}"`);
      }
    }
    
    // 警告：缺少 Surface signal 或 Hidden risk
    if (!row.surfaceSignal) {
      warnings.push(`行 ${row.tag}: 缺少 Surface signal`);
    }
    if (!row.hiddenRisk) {
      warnings.push(`行 ${row.tag}: 缺少 Hidden risk`);
    }
  }
  
  return { errors, warnings };
}

/**
 * 检测冲突
 */
function detectConflicts(files, existingRows) {
  const conflicts = {
    missingFiles: [],
    missingRows: [],
    fieldMismatches: [],
  };
  
  // 创建现有索引的映射
  const existingMap = new Map();
  for (const row of existingRows) {
    existingMap.set(row.tag, row);
  }
  
  // 创建文件的映射
  const fileMap = new Map();
  for (const file of files) {
    fileMap.set(file.tag, file);
  }
  
  // 检测缺失的文件（索引中有但文件不存在）
  for (const row of existingRows) {
    const filePath = path.join(process.cwd(), row.file.replace(/^`|`$/g, ''));
    if (!fs.existsSync(filePath)) {
      conflicts.missingFiles.push(row);
    }
  }
  
  // 检测缺失的索引行（文件存在但索引中没有）
  for (const file of files) {
    if (!existingMap.has(file.tag)) {
      conflicts.missingRows.push(file);
    }
  }
  
  // 检测字段不一致（文件中的字段与索引中的字段不一致）
  for (const file of files) {
    const existingRow = existingMap.get(file.tag);
    if (existingRow) {
      if (existingRow.title !== file.title) {
        conflicts.fieldMismatches.push({
          tag: file.tag,
          field: 'title',
          indexValue: existingRow.title,
          fileValue: file.title,
        });
      }
      if (existingRow.trigger !== file.trigger) {
        conflicts.fieldMismatches.push({
          tag: file.tag,
          field: 'trigger',
          indexValue: existingRow.trigger,
          fileValue: file.trigger,
        });
      }
    }
  }
  
  return conflicts;
}

/**
 * 生成索引
 */
function generateIndex() {
  info('扫描经验文件目录...');
  const files = scanExperienceFiles();
  
  if (files.length === 0) {
    warning('未找到任何经验文件');
    return;
  }
  
  info(`找到 ${files.length} 个经验文件`);
  
  // 读取现有索引
  const { rows: existingRows } = readExistingIndex();
  const existingMap = new Map();
  for (const row of existingRows) {
    existingMap.set(row.tag, row);
  }
  
  // 生成索引行
  const rows = files.map(file => {
    const existingRow = existingMap.get(file.tag);
    return generateIndexRow(file, existingRow);
  });
  
  // 按 Tag 排序
  rows.sort((a, b) => a.tag.localeCompare(b.tag));
  
  // 生成内容
  const content = generateIndexContent(rows);
  
  // 写入文件
  fs.writeFileSync(INDEX_PATH, content, 'utf8');
  success(`索引已生成：${rows.length} 条经验`);
}

/**
 * 更新索引
 */
function updateIndex() {
  info('读取现有索引...');
  const { rows: existingRows } = readExistingIndex();
  
  info('扫描经验文件目录...');
  const files = scanExperienceFiles();
  
  if (files.length === 0) {
    warning('未找到任何经验文件');
    return;
  }
  
  info(`找到 ${files.length} 个经验文件，现有索引 ${existingRows.length} 条`);
  
  // 创建现有索引的映射
  const existingMap = new Map();
  for (const row of existingRows) {
    existingMap.set(row.tag, row);
  }
  
  // 生成索引行（保留现有字段）
  const rows = files.map(file => {
    const existingRow = existingMap.get(file.tag);
    return generateIndexRow(file, existingRow);
  });
  
  // 按 Tag 排序
  rows.sort((a, b) => a.tag.localeCompare(b.tag));
  
  // 生成内容
  const content = generateIndexContent(rows);
  
  // 写入文件
  fs.writeFileSync(INDEX_PATH, content, 'utf8');
  success(`索引已更新：${rows.length} 条经验`);
  
  // 检测冲突
  const conflicts = detectConflicts(files, existingRows);
  
  if (conflicts.missingFiles.length > 0) {
    warning(`发现 ${conflicts.missingFiles.length} 个缺失的文件（索引中有但文件不存在）`);
    conflicts.missingFiles.forEach(row => {
      warning(`  - ${row.tag}: ${row.file}`);
    });
  }
  
  if (conflicts.missingRows.length > 0) {
    info(`新增 ${conflicts.missingRows.length} 个经验文件（已添加到索引）`);
  }
  
  if (conflicts.fieldMismatches.length > 0) {
    warning(`发现 ${conflicts.fieldMismatches.length} 个字段不一致（已使用文件中的值更新）`);
    conflicts.fieldMismatches.forEach(conflict => {
      warning(`  - ${conflict.tag}.${conflict.field}: "${conflict.indexValue}" -> "${conflict.fileValue}"`);
    });
  }
}

/**
 * 检查冲突
 */
function checkConflicts() {
  info('读取现有索引...');
  const { rows: existingRows } = readExistingIndex();
  
  info('扫描经验文件目录...');
  const files = scanExperienceFiles();
  
  // 检测冲突
  const conflicts = detectConflicts(files, existingRows);
  
  // 验证索引格式
  const { errors, warnings: validationWarnings } = validateIndex(existingRows);
  
  let hasIssues = false;
  
  if (conflicts.missingFiles.length > 0) {
    hasIssues = true;
    error(`发现 ${conflicts.missingFiles.length} 个缺失的文件（索引中有但文件不存在）`);
    conflicts.missingFiles.forEach(row => {
      error(`  - ${row.tag}: ${row.file}`);
    });
  }
  
  if (conflicts.missingRows.length > 0) {
    hasIssues = true;
    warning(`发现 ${conflicts.missingRows.length} 个缺失的索引行（文件存在但索引中没有）`);
    conflicts.missingRows.forEach(file => {
      warning(`  - ${file.tag}: ${file.file}`);
    });
  }
  
  if (conflicts.fieldMismatches.length > 0) {
    hasIssues = true;
    warning(`发现 ${conflicts.fieldMismatches.length} 个字段不一致`);
    conflicts.fieldMismatches.forEach(conflict => {
      warning(`  - ${conflict.tag}.${conflict.field}: 索引="${conflict.indexValue}", 文件="${conflict.fileValue}"`);
    });
  }
  
  if (errors.length > 0) {
    hasIssues = true;
    error(`发现 ${errors.length} 个格式错误`);
    errors.forEach(err => error(`  ${err}`));
  }
  
  if (validationWarnings.length > 0) {
    validationWarnings.forEach(warn => warning(`  ${warn}`));
  }
  
  if (!hasIssues) {
    success(`检查通过：${existingRows.length} 条经验，${files.length} 个文件，无冲突`);
    process.exit(0);
  } else {
    error('检查失败：发现冲突或错误');
    process.exit(1);
  }
}

/**
 * 主函数
 */
function main() {
  const command = process.argv[2];
  
  if (!command || command === '--help' || command === '-h') {
    console.log('用法: node scripts/validate-experience-index.js <command>');
    console.log('');
    console.log('命令:');
    console.log('  --generate  生成索引（从经验文件生成 INDEX.md）');
    console.log('  --update    更新索引（合并现有索引和经验文件）');
    console.log('  --check     检查冲突（检测索引和文件的不一致）');
    process.exit(0);
  }
  
  switch (command) {
    case '--generate':
      generateIndex();
      break;
    case '--update':
      updateIndex();
      break;
    case '--check':
      checkConflicts();
      break;
    default:
      error(`未知命令: ${command}`);
      console.log('使用 --help 查看帮助');
      process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = { extractFieldsFromFile, readExistingIndex, scanExperienceFiles, generateIndexRow, generateIndexContent, validateIndex, detectConflicts };
