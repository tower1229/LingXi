#!/usr/bin/env node

/**
 * validate-memory-index.js (Memory-first)
 *
 * 统一维护 `.cursor/.lingxi/memory/INDEX.md` 与 `memory/notes/*.md` 的一致性。
 *
 * 命令：
 * - --update: 扫描 notes，生成/更新 INDEX.md（保留已存在且文件仍存在的条目）
 * - --check : 校验 INDEX.md 引用的文件存在，并提示未被索引的 notes 文件
 */

const fs = require('fs');
const path = require('path');

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

const VALID_STATUS = ['active'];
const VALID_STRENGTH = ['hypothesis', 'validated', 'enforced'];
const VALID_SCOPE = ['narrow', 'medium', 'broad'];

const INDEX_HEADER = ['Id', 'Kind', 'Title', 'When to load', 'Status', 'Strength', 'Scope', 'Supersedes', 'File'];

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function safeMkdir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function listMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .map((e) => path.join(dir, e.name));
}

function extractMetaValue(lines, key) {
  // 支持两种写法：
  // - **Id**: MEM-xxx
  // - Id: MEM-xxx
  const patterns = [
    new RegExp(`^\\s*-\\s*\\*\\*${key}\\*\\*:\\s*(.+)\\s*$`),
    new RegExp(`^\\s*-\\s*${key}:\\s*(.+)\\s*$`),
  ];
  for (const line of lines) {
    for (const re of patterns) {
      const m = line.match(re);
      if (m) return m[1].trim();
    }
  }
  return '';
}

function extractTitle(lines) {
  for (const line of lines) {
    if (line.startsWith('# ')) return line.replace(/^#\s+/, '').trim();
  }
  return '';
}

function extractWhenToLoad(lines) {
  let inSection = false;
  const items = [];

  for (const line of lines) {
    if (line.trim().toLowerCase() === '## when to load') {
      inSection = true;
      continue;
    }
    if (!inSection) continue;
    if (line.startsWith('## ')) break;

    const trimmed = line.trim();
    if (!trimmed) continue;

    const normalized = trimmed
      .replace(/^[-*]\s+/, '')
      .replace(/^\d+\.\s+/, '')
      .trim();

    if (!normalized) continue;
    items.push(normalized);
  }

  return items.join('；').slice(0, 160);
}

function parseIndex(indexPath) {
  if (!fs.existsSync(indexPath)) {
    return { header: null, rows: [] };
  }
  const content = readText(indexPath);
  const lines = content.split('\n');

  let inMemories = false;
  let headerLineIndex = -1;
  let header = null;
  const rows = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/^##\s+Memories\b/)) {
      inMemories = true;
      continue;
    }
    if (!inMemories) continue;

    if (headerLineIndex === -1 && line.includes('| Id |')) {
      header = line.split('|').slice(1, -1).map((s) => s.trim());
      headerLineIndex = i;
      continue;
    }

    if (headerLineIndex !== -1 && i > headerLineIndex + 1) {
      if (!line.match(/^\|.*\|$/)) continue;
      const parts = line.split('|').slice(1, -1).map((s) => s.trim());
      if (!parts[0] || parts[0] === '---') continue;
      rows.push(parts);
    }
  }

  return { header, rows };
}

function createContext(memoryRoot) {
  const normalizedRoot = path.resolve(memoryRoot);
  const baseDir = path.dirname(normalizedRoot);
  return {
    memoryRoot: normalizedRoot,
    baseDir,
    indexPath: path.join(normalizedRoot, 'INDEX.md'),
    notesDir: path.join(normalizedRoot, 'notes'),
  };
}

function scanNotes(notesDir) {
  const files = listMarkdownFiles(notesDir);
  return files.map((filePath) => {
    const rel = `memory/notes/${path.basename(filePath)}`;
    const lines = readText(filePath).split('\n');

    const id = extractMetaValue(lines, 'Id') || path.basename(filePath, '.md');
    const kind = extractMetaValue(lines, 'Kind') || 'other';
    const status = extractMetaValue(lines, 'Status') || 'active';
    const strength = extractMetaValue(lines, 'Strength') || 'hypothesis';
    const scope = extractMetaValue(lines, 'Scope') || 'medium';
    const supersedes = extractMetaValue(lines, 'Supersedes') || '';

    const title = extractTitle(lines) || id;
    const whenToLoad = extractWhenToLoad(lines);

    return {
      id,
      kind,
      title,
      whenToLoad,
      status,
      strength,
      scope,
      supersedes,
      file: `\`${rel}\``,
      filePath,
    };
  });
}

function generateIndexContent(noteEntries, existingIndex) {
  const map = new Map();

  // 保留旧索引中仍存在的条目（以 Id 为键）
  if (existingIndex.rows.length > 0) {
    const noteIds = new Set(noteEntries.map((n) => n.id));
    for (const row of existingIndex.rows) {
      // Id | Kind | Title | When to load | Status | Strength | Scope | Supersedes | File
      if (row.length < INDEX_HEADER.length) continue;
      const id = row[0];
      const status = row[4] || 'active';
      if (status === 'active' && noteIds.has(id)) {
        map.set(id, row);
      }
    }
  }

  // 用 notes 覆盖可提取字段
  for (const note of noteEntries) {
    const existing = map.get(note.id);
    const row =
      existing ||
      [
        note.id,
        note.kind,
        note.title,
        note.whenToLoad,
        'active',
        note.strength,
        note.scope,
        note.supersedes,
        note.file,
      ];

    row[1] = note.kind || row[1];
    row[2] = note.title || row[2];
    row[3] = note.whenToLoad || row[3];
    row[4] = 'active';
    row[5] = note.strength || row[5];
    row[6] = note.scope || row[6];
    row[7] = note.supersedes || row[7];
    row[8] = note.file;

    map.set(note.id, row);
  }

  // 固定输出顺序：按 id
  const rows = [...map.values()].sort((a, b) => a[0].localeCompare(b[0]));

  return [
    '# Memory Index',
    '',
    '> 统一记忆库索引（SSoT - Single Source of Truth）',
    '>',
    '> - 索引只存“最小元数据”，用于治理与快速定位',
    '> - 真实内容在 `memory/notes/*.md`，用于语义检索与注入',
    '',
    '## Memories',
    '',
    `| ${INDEX_HEADER.join(' | ')} |`,
    `| ${INDEX_HEADER.map(() => '---').join(' | ')} |`,
    ...rows.map((r) => `| ${r.join(' | ')} |`),
    '',
  ].join('\n');
}

function validateNoteEntry(note) {
  const errs = [];
  if (!note.id) errs.push('缺少 Id');
  if (!note.title) errs.push('缺少 Title');
  if (!VALID_STATUS.includes(note.status)) errs.push(`Status 无效: ${note.status}`);
  if (!VALID_STRENGTH.includes(note.strength)) errs.push(`Strength 无效: ${note.strength}`);
  if (!VALID_SCOPE.includes(note.scope)) errs.push(`Scope 无效: ${note.scope}`);
  return errs;
}

function updateIndexAt(memoryRoot) {
  const ctx = createContext(memoryRoot);
  info(`更新 memory/INDEX.md ... (root=${ctx.memoryRoot})`);
  safeMkdir(ctx.memoryRoot);
  safeMkdir(ctx.notesDir);

  const existing = parseIndex(ctx.indexPath);
  const notes = scanNotes(ctx.notesDir);

  const noteErrors = [];
  for (const n of notes) {
    const errs = validateNoteEntry(n);
    if (errs.length) noteErrors.push(`${path.basename(n.filePath)}: ${errs.join('；')}`);
  }
  if (noteErrors.length) {
    noteErrors.forEach((e) => warning(e));
  }

  const content = generateIndexContent(notes, existing);
  fs.writeFileSync(ctx.indexPath, content, 'utf8');
  success(`INDEX 已更新：notes=${notes.length}`);
}

function checkIndexAt(memoryRoot) {
  const ctx = createContext(memoryRoot);
  info(`检查 memory/INDEX.md 与 notes 一致性... (root=${ctx.memoryRoot})`);
  const existing = parseIndex(ctx.indexPath);
  const notes = scanNotes(ctx.notesDir);

  const errors = [];
  const warnings = [];

  const noteIds = new Set(notes.map((n) => n.id));
  const indexedIds = new Set();

  for (const row of existing.rows) {
    if (row.length < INDEX_HEADER.length) continue;
    const id = row[0];
    const status = row[4] || 'active';
    const file = (row[8] || '').replace(/^`|`$/g, '');
    indexedIds.add(id);

    if (status === 'active') {
      if (!noteIds.has(id)) {
        errors.push(`索引条目指向不存在的 note：${id}`);
      }
      if (file) {
        const abs = path.join(ctx.baseDir, file);
        if (!fs.existsSync(abs)) errors.push(`索引 File 不存在：${id} (${file})`);
      }
    }
  }

  for (const n of notes) {
    if (!indexedIds.has(n.id)) warnings.push(`note 未在索引中：${n.id}`);
  }

  if (errors.length) {
    errors.forEach((e) => error(e));
    process.exit(1);
  }
  if (warnings.length) warnings.forEach((w) => warning(w));
  success('检查通过：无冲突');
}

function parseArgs(argv) {
  const args = argv.slice(2);
  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    return { help: true };
  }

  const command = args.find((a) => a === '--update' || a === '--check');

  let root = null;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--root' && args[i + 1]) {
      root = args[i + 1];
      break;
    }
    if (a.startsWith('--root=')) {
      root = a.slice('--root='.length);
      break;
    }
  }

  return { command, root };
}

function main() {
  const { help, command, root } = parseArgs(process.argv);
  if (help) {
    console.log('用法: node scripts/validate-memory-index.js <command> [--root <memoryRoot>]');
    console.log('');
    console.log('命令:');
    console.log('  --update    更新索引（基于 memory/notes 生成/修复 INDEX.md）');
    console.log('  --check     检查冲突（检测索引与文件不一致）');
    console.log('');
    console.log('选项:');
    console.log('  --root      指定 memory root（默认: .cursor/.lingxi/memory）');
    process.exit(0);
  }

  const defaultRoot = path.join(process.cwd(), '.cursor/.lingxi/memory');
  const memoryRoot = root ? path.resolve(root) : defaultRoot;

  switch (command) {
    case '--update':
      updateIndexAt(memoryRoot);
      break;
    case '--check':
      checkIndexAt(memoryRoot);
      break;
    default:
      error(`未知命令: ${command}`);
      process.exit(1);
  }
}

if (require.main === module) main();

module.exports = {
  createContext,
  parseIndex,
  scanNotes,
  generateIndexContent,
  extractWhenToLoad,
  updateIndexAt,
  checkIndexAt,
};

