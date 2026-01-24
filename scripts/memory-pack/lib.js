const fs = require('fs');
const path = require('path');

const STRENGTH_RANK = {
  hypothesis: 1,
  validated: 2,
  enforced: 3,
};

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function writeText(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
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

function normalizeTags(raw) {
  if (!raw) return [];
  // 支持：
  // - a, b, c
  // - ["a","b"]
  // - a
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const arr = JSON.parse(trimmed);
      if (Array.isArray(arr)) return arr.map(String).map((s) => s.trim()).filter(Boolean);
    } catch {
      // fall through
    }
  }
  return trimmed
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseNoteMeta(markdown, fallbackFileName) {
  const lines = markdown.split('\n');
  const id = extractMetaValue(lines, 'Id') || fallbackFileName || '';

  const kind = extractMetaValue(lines, 'Kind') || 'other';
  const status = extractMetaValue(lines, 'Status') || 'active';
  const strength = extractMetaValue(lines, 'Strength') || 'hypothesis';
  const scope = extractMetaValue(lines, 'Scope') || 'medium';

  const audience = extractMetaValue(lines, 'Audience') || '';
  const portability = extractMetaValue(lines, 'Portability') || '';
  const source = extractMetaValue(lines, 'Source') || '';
  const tags = normalizeTags(extractMetaValue(lines, 'Tags'));

  return {
    id,
    kind,
    status,
    strength,
    scope,
    audience,
    portability,
    source,
    tags,
  };
}

function strengthAtLeast(strength, minStrength) {
  const s = STRENGTH_RANK[strength] || 0;
  const m = STRENGTH_RANK[minStrength] || 0;
  return s >= m;
}

function upsertMetaField(markdown, key, value) {
  // 只处理 Meta 区域里的 bullet line：- **Key**: value
  // 若存在则替换；否则插入到 Meta 列表末尾（但仍在下一个 ## 之前）
  const lines = markdown.split('\n');
  let inMeta = false;
  let metaStart = -1;
  let metaEnd = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().toLowerCase() === '## meta') {
      inMeta = true;
      metaStart = i;
      continue;
    }
    if (!inMeta) continue;
    if (i > metaStart && line.startsWith('## ')) {
      metaEnd = i;
      break;
    }
  }

  if (metaStart === -1) return markdown;
  if (metaEnd === -1) metaEnd = lines.length;

  const re = new RegExp(`^\\s*-\\s*\\*\\*${key}\\*\\*:\\s*(.+)\\s*$`);
  for (let i = metaStart + 1; i < metaEnd; i++) {
    if (re.test(lines[i])) {
      lines[i] = `- **${key}**: ${value}`;
      return lines.join('\n');
    }
  }

  // 插入：放在 metaEnd 之前的最后一个非空行后面（或直接 metaStart+1）
  let insertAt = metaEnd;
  for (let i = metaEnd - 1; i > metaStart; i--) {
    if (lines[i].trim() !== '') {
      insertAt = i + 1;
      break;
    }
  }
  lines.splice(insertAt, 0, `- **${key}**: ${value}`);
  return lines.join('\n');
}

module.exports = {
  readText,
  writeText,
  listMarkdownFiles,
  parseNoteMeta,
  strengthAtLeast,
  upsertMetaField,
};

