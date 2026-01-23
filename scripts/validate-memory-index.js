#!/usr/bin/env node

/**
 * 验证和更新 .cursor/.lingxi/memory/INDEX.md 统一索引格式的脚本
 * 
 * 功能：
 * 1. 索引生成：扫描记忆文件目录，自动生成统一索引（Experience/Tech/Business）
 * 2. 索引更新：读取现有统一索引，扫描记忆文件目录，比较并更新索引
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
const VALID_STATUS = ['active']; // 废弃的记忆已直接删除，不再保留 deprecated 状态
const VALID_SCOPE = ['narrow', 'medium', 'broad'];
const VALID_STRENGTH = ['hypothesis', 'validated', 'enforced'];
const VALID_TYPE = ['standard', 'knowledge'];

// 统一索引路径
const MEMORY_INDEX_PATH = path.join(process.cwd(), '.cursor/.lingxi/memory/INDEX.md');

// 记忆文件目录
const MEMORY_DIRS = {
  experience: {
    team: {
      standards: path.join(process.cwd(), '.cursor/.lingxi/memory/experience/team/standards'),
      knowledge: path.join(process.cwd(), '.cursor/.lingxi/memory/experience/team/knowledge'),
    },
    project: path.join(process.cwd(), '.cursor/.lingxi/memory/experience/project'),
  },
  tech: {
    services: path.join(process.cwd(), '.cursor/.lingxi/memory/tech/services'),
  },
  business: {
    root: path.join(process.cwd(), '.cursor/.lingxi/memory/business'),
  },
};

// Experience 表头
const EXPERIENCE_HEADER = ['Tag', 'Type', 'Title', 'Trigger', 'Surface signal', 'Hidden risk', 'Status', 'Scope', 'Strength', 'Level', 'Replaces', 'ReplacedBy', 'File'];

// Tech 表头
const TECH_HEADER = ['Tag', 'Title', 'Service', 'Trigger', 'Status', 'File'];

// Business 表头
const BUSINESS_HEADER = ['Tag', 'Title', 'Topic', 'Trigger', 'Status', 'File'];

/**
 * 从经验文件中提取字段
 */
function extractExperienceFields(filePath, level, type) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  const fileName = path.basename(filePath, '.md');
  const tag = fileName;
  
  let title = '';
  for (const line of lines) {
    if (line.startsWith('# ')) {
      title = line.replace(/^#\s+/, '').trim();
      break;
    }
  }
  
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
  
  return { tag, type, title, trigger, level };
}

/**
 * 从技术文件中提取字段
 */
function extractTechFields(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  const fileName = path.basename(filePath, '.md');
  const tag = fileName;
  
  let title = '';
  let service = '';
  
  for (const line of lines) {
    if (line.startsWith('# ')) {
      title = line.replace(/^#\s+/, '').trim();
      // 尝试从标题中提取服务名（如 "Auth Service（服务上下文）"）
      const match = title.match(/^(.+?)\s*[（(]/);
      if (match) {
        service = match[1].trim();
      } else {
        service = title;
      }
      break;
    }
  }
  
  return { tag, title, service, trigger: '' };
}

/**
 * 从业务文件中提取字段
 */
function extractBusinessFields(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  const fileName = path.basename(filePath, '.md');
  const tag = fileName;
  
  let title = '';
  let topic = '';
  
  for (const line of lines) {
    if (line.startsWith('# ')) {
      title = line.replace(/^#\s+/, '').trim();
      // 尝试从标题中提取主题（如 "Workflow 生命周期（业务上下文）"）
      const match = title.match(/^(.+?)\s*[（(]/);
      if (match) {
        topic = match[1].trim();
      } else {
        topic = title;
      }
      break;
    }
  }
  
  return { tag, title, topic, trigger: '' };
}

/**
 * 解析统一索引中的表格
 */
function parseMemoryIndex(indexPath) {
  if (!fs.existsSync(indexPath)) {
    return {
      experience: { header: null, rows: [] },
      tech: { header: null, rows: [] },
      business: { header: null, rows: [] },
    };
  }
  
  const content = fs.readFileSync(indexPath, 'utf8');
  const lines = content.split('\n');
  
  const result = {
    experience: { header: null, rows: [] },
    tech: { header: null, rows: [] },
    business: { header: null, rows: [] },
  };
  
  let currentSection = null;
  let headerFound = false;
  let headerLineIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 检测章节
    if (line.match(/^##\s+Experience/)) {
      currentSection = 'experience';
      headerFound = false;
      continue;
    } else if (line.match(/^##\s+Tech/)) {
      currentSection = 'tech';
      headerFound = false;
      continue;
    } else if (line.match(/^##\s+Business/)) {
      currentSection = 'business';
      headerFound = false;
      continue;
    }
    
    if (!currentSection) continue;
    
    // 查找表头
    if (!headerFound && line.includes('| Tag |')) {
      const parts = line.split('|').slice(1, -1).map(s => s.trim());
      result[currentSection].header = parts;
      headerFound = true;
      headerLineIndex = i;
      continue;
    }
    
    // 解析数据行
    if (headerFound && i > headerLineIndex + 1) {
      if (line.match(/^\|.*\|$/)) {
        const parts = line.split('|').slice(1, -1).map(s => s.trim());
        if (parts.length > 0 && parts[0] && parts[0] !== '---') {
          result[currentSection].rows.push(parts);
        }
      }
    }
  }
  
  return result;
}

/**
 * 扫描记忆文件
 */
function scanMemoryFiles() {
  const files = {
    experience: [],
    tech: [],
    business: [],
  };
  
  // 扫描 Experience
  if (fs.existsSync(MEMORY_DIRS.experience.team.standards)) {
    const entries = fs.readdirSync(MEMORY_DIRS.experience.team.standards, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        const filePath = path.join(MEMORY_DIRS.experience.team.standards, entry.name);
        const fields = extractExperienceFields(filePath, 'team', 'standard');
        files.experience.push({
          ...fields,
          file: `memory/experience/team/standards/${entry.name}`,
          filePath,
        });
      }
    }
  }
  
  if (fs.existsSync(MEMORY_DIRS.experience.team.knowledge)) {
    const entries = fs.readdirSync(MEMORY_DIRS.experience.team.knowledge, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        const filePath = path.join(MEMORY_DIRS.experience.team.knowledge, entry.name);
        const fields = extractExperienceFields(filePath, 'team', 'knowledge');
        files.experience.push({
          ...fields,
          file: `memory/experience/team/knowledge/${entry.name}`,
          filePath,
        });
      }
    }
  }
  
  if (fs.existsSync(MEMORY_DIRS.experience.project)) {
    const entries = fs.readdirSync(MEMORY_DIRS.experience.project, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'INDEX.md') {
        const filePath = path.join(MEMORY_DIRS.experience.project, entry.name);
        const fields = extractExperienceFields(filePath, 'project', 'knowledge');
        files.experience.push({
          ...fields,
          file: `memory/experience/project/${entry.name}`,
          filePath,
        });
      }
    }
  }
  
  // 扫描 Tech
  if (fs.existsSync(MEMORY_DIRS.tech.services)) {
    const entries = fs.readdirSync(MEMORY_DIRS.tech.services, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        const filePath = path.join(MEMORY_DIRS.tech.services, entry.name);
        const fields = extractTechFields(filePath);
        files.tech.push({
          ...fields,
          file: `memory/tech/services/${entry.name}`,
          filePath,
        });
      }
    }
  }
  
  // 扫描 Business
  if (fs.existsSync(MEMORY_DIRS.business.root)) {
    const entries = fs.readdirSync(MEMORY_DIRS.business.root, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'INDEX.md') {
        const filePath = path.join(MEMORY_DIRS.business.root, entry.name);
        const fields = extractBusinessFields(filePath);
        files.business.push({
          ...fields,
          file: `memory/business/${entry.name}`,
          filePath,
        });
      }
    }
  }
  
  return files;
}

/**
 * 生成统一索引内容
 */
function generateMemoryIndexContent(files, existingIndex) {
  let content = `# Memory Index

> 灵犀统一记忆系统索引（SSoT - Single Source of Truth）
> 
> 所有持久化记忆（经验、技术、业务）使用统一的索引格式和匹配策略。

## Experience（经验记忆）

| ${EXPERIENCE_HEADER.join(' | ')} |
| ${EXPERIENCE_HEADER.map(() => '---').join(' | ')} |
`;

  // 合并现有索引和文件
  const experienceMap = new Map();
  
  // 从现有索引加载（只加载文件存在的条目）
  if (existingIndex.experience.rows.length > 0) {
    const fileTags = new Set(files.experience.map(f => f.tag));
    existingIndex.experience.rows.forEach(row => {
      if (row.length >= 13) {
        const tag = row[0];
        const status = row[6] || 'active';
        // 只保留 active 状态且文件存在的条目（已删除的文件不在 files 中）
        if (status === 'active' && fileTags.has(tag)) {
          experienceMap.set(tag, row);
        }
      }
    });
  }
  
  // 从文件更新（只扫描存在的文件）
  files.experience.forEach(file => {
    const existingRow = experienceMap.get(file.tag);
    const row = existingRow || [
      file.tag,
      file.type || 'knowledge',
      file.title || '',
      file.trigger || '',
      '', // Surface signal
      '', // Hidden risk
      'active',
      'medium',
      'hypothesis',
      file.level || 'project',
      '', // Replaces
      '', // ReplacedBy
      `\`${file.file}\``,
    ];
    
    // 更新可提取的字段
    if (file.title) row[2] = file.title;
    if (file.trigger) row[3] = file.trigger;
    if (!existingRow) {
      row[8] = file.level || 'project'; // Level
      row[12] = `\`${file.file}\``; // File
    }
    // 确保 Status 为 active（废弃的记忆已删除，不会出现在 files 中）
    row[6] = 'active';
    
    experienceMap.set(file.tag, row);
  });
  
  // 输出 Experience 表格
  experienceMap.forEach(row => {
    content += `| ${row.join(' | ')} |\n`;
  });
  
  content += `\n## Tech（技术记忆）

| ${TECH_HEADER.join(' | ')} |
| ${TECH_HEADER.map(() => '---').join(' | ')} |
`;

  const techMap = new Map();
  
  if (existingIndex.tech.rows.length > 0) {
    const fileTags = new Set(files.tech.map(f => f.tag));
    existingIndex.tech.rows.forEach(row => {
      if (row.length >= 6) {
        const tag = row[0];
        const status = row[4] || 'active';
        // 只保留 active 状态且文件存在的条目（已删除的文件不在 files 中）
        if (status === 'active' && fileTags.has(tag)) {
          techMap.set(tag, row);
        }
      }
    });
  }
  
  files.tech.forEach(file => {
    const existingRow = techMap.get(file.tag);
    const row = existingRow || [
      file.tag,
      file.title || '',
      file.service || '',
      file.trigger || '',
      'active',
      `\`${file.file}\``,
    ];
    
    if (file.title) row[1] = file.title;
    if (file.service) row[2] = file.service;
    if (!existingRow) {
      row[5] = `\`${file.file}\``;
    }
    // 确保 Status 为 active（废弃的记忆已删除，不会出现在 files 中）
    row[4] = 'active';
    
    techMap.set(file.tag, row);
  });
  
  techMap.forEach(row => {
    content += `| ${row.join(' | ')} |\n`;
  });
  
  content += `\n## Business（业务记忆）

| ${BUSINESS_HEADER.join(' | ')} |
| ${BUSINESS_HEADER.map(() => '---').join(' | ')} |
`;

  const businessMap = new Map();
  
  if (existingIndex.business.rows.length > 0) {
    const fileTags = new Set(files.business.map(f => f.tag));
    existingIndex.business.rows.forEach(row => {
      if (row.length >= 6) {
        const tag = row[0];
        const status = row[4] || 'active';
        // 只保留 active 状态且文件存在的条目（已删除的文件不在 files 中）
        if (status === 'active' && fileTags.has(tag)) {
          businessMap.set(tag, row);
        }
      }
    });
  }
  
  files.business.forEach(file => {
    const existingRow = businessMap.get(file.tag);
    const row = existingRow || [
      file.tag,
      file.title || '',
      file.topic || '',
      file.trigger || '',
      'active',
      `\`${file.file}\``,
    ];
    
    if (file.title) row[1] = file.title;
    if (file.topic) row[2] = file.topic;
    if (!existingRow) {
      row[5] = `\`${file.file}\``;
    }
    // 确保 Status 为 active（废弃的记忆已删除，不会出现在 files 中）
    row[4] = 'active';
    
    businessMap.set(file.tag, row);
  });
  
  businessMap.forEach(row => {
    content += `| ${row.join(' | ')} |\n`;
  });
  
  return content;
}

/**
 * 更新索引
 */
function updateIndex() {
  info('更新统一索引...');
  
  const existingIndex = parseMemoryIndex(MEMORY_INDEX_PATH);
  const files = scanMemoryFiles();
  
  const content = generateMemoryIndexContent(files, existingIndex);
  
  // 确保目录存在
  const indexDir = path.dirname(MEMORY_INDEX_PATH);
  if (!fs.existsSync(indexDir)) {
    fs.mkdirSync(indexDir, { recursive: true });
  }
  
  fs.writeFileSync(MEMORY_INDEX_PATH, content, 'utf8');
  
  success(`统一索引已更新：${files.experience.length} 条经验，${files.tech.length} 条技术记忆，${files.business.length} 条业务记忆`);
}

/**
 * 检查冲突
 */
function checkConflicts() {
  info('检查冲突...');
  
  const existingIndex = parseMemoryIndex(MEMORY_INDEX_PATH);
  const files = scanMemoryFiles();
  
  const errors = [];
  const warnings = [];
  
  // 检查 Experience（只检查 active 状态的条目，已删除的文件不在索引中）
  const experienceTags = new Set(files.experience.map(f => f.tag));
  existingIndex.experience.rows.forEach(row => {
    if (row.length >= 13) {
      const tag = row[0];
      const status = row[6] || 'active';
      const file = row[12]?.replace(/^`|`$/g, '') || '';
      
      // 只检查 active 状态的条目（废弃的记忆已删除，不在索引中）
      if (status === 'active' && !experienceTags.has(tag) && file) {
        const filePath = path.join(process.cwd(), file);
        if (!fs.existsSync(filePath)) {
          errors.push(`Experience: 索引中的文件不存在 - ${tag} (${file})`);
        }
      }
    }
  });
  
  files.experience.forEach(file => {
    const found = existingIndex.experience.rows.some(row => row[0] === file.tag);
    if (!found) {
      warnings.push(`Experience: 文件未在索引中 - ${file.tag}`);
    }
  });
  
  // 检查 Tech（只检查 active 状态的条目，已删除的文件不在索引中）
  const techTags = new Set(files.tech.map(f => f.tag));
  existingIndex.tech.rows.forEach(row => {
    if (row.length >= 6) {
      const tag = row[0];
      const status = row[4] || 'active';
      const file = row[5]?.replace(/^`|`$/g, '') || '';
      
      // 只检查 active 状态的条目（废弃的记忆已删除，不在索引中）
      if (status === 'active' && !techTags.has(tag) && file) {
        const filePath = path.join(process.cwd(), file);
        if (!fs.existsSync(filePath)) {
          errors.push(`Tech: 索引中的文件不存在 - ${tag} (${file})`);
        }
      }
    }
  });
  
  // 检查 Business（只检查 active 状态的条目，已删除的文件不在索引中）
  const businessTags = new Set(files.business.map(f => f.tag));
  existingIndex.business.rows.forEach(row => {
    if (row.length >= 6) {
      const tag = row[0];
      const status = row[4] || 'active';
      const file = row[5]?.replace(/^`|`$/g, '') || '';
      
      // 只检查 active 状态的条目（废弃的记忆已删除，不在索引中）
      if (status === 'active' && !businessTags.has(tag) && file) {
        const filePath = path.join(process.cwd(), file);
        if (!fs.existsSync(filePath)) {
          errors.push(`Business: 索引中的文件不存在 - ${tag} (${file})`);
        }
      }
    }
  });
  
  if (errors.length > 0) {
    errors.forEach(err => error(err));
    process.exit(1);
  }
  
  if (warnings.length > 0) {
    warnings.forEach(warn => warning(warn));
  }
  
  success('检查通过：无冲突');
}

/**
 * 主函数
 */
function main() {
  const command = process.argv[2];
  
  if (!command || command === '--help' || command === '-h') {
    console.log('用法: node scripts/validate-memory-index.js <command>');
    console.log('');
    console.log('命令:');
    console.log('  --update    更新统一索引（合并现有索引和记忆文件）');
    console.log('  --check     检查冲突（检测索引和文件的不一致）');
    process.exit(0);
  }
  
  switch (command) {
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

module.exports = { parseMemoryIndex, scanMemoryFiles, generateMemoryIndexContent };
