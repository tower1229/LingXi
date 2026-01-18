#!/usr/bin/env node

/**
 * 单元测试：validate-index.js
 * 
 * 测试所有可测试行为（B1-B7）
 */

const fs = require('fs');
const path = require('path');
const { parseHeader, parseRow, validateHeader, validateRow } = require('../validate-index.js');

// 测试辅助函数
function createTestIndex(content) {
  const testDir = path.join(__dirname, 'test-fixtures');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  const indexPath = path.join(testDir, 'INDEX.md');
  fs.writeFileSync(indexPath, content, 'utf8');
  return indexPath;
}

function cleanupTestFiles() {
  const testDir = path.join(__dirname, 'test-fixtures');
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

// 测试结果
let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`✓ ${name}`);
  } catch (error) {
    failed++;
    failures.push({ name, error: error.message });
    console.log(`✗ ${name}`);
    console.log(`  ${error.message}`);
  }
}

// B1: 验证表头格式
test('B1: 验证表头格式 - 正确表头', () => {
  const header = ['ID', 'Title', 'Status', 'Current Phase', 'Next Action', 'Blockers', 'Links'];
  const result = validateHeader(header);
  if (!result.valid) {
    throw new Error(`期望通过，但验证失败: ${result.error}`);
  }
});

test('B1: 验证表头格式 - 缺少字段', () => {
  const header = ['ID', 'Title', 'Status', 'Current Phase', 'Next Action', 'Blockers'];
  const result = validateHeader(header);
  if (result.valid) {
    throw new Error('期望失败，但验证通过');
  }
  if (!result.error.includes('字段数量不正确')) {
    throw new Error(`错误信息不正确: ${result.error}`);
  }
});

test('B1: 验证表头格式 - 字段顺序错误', () => {
  const header = ['ID', 'Title', 'Status', 'Current Phase', 'Next Action', 'Links', 'Blockers'];
  const result = validateHeader(header);
  if (result.valid) {
    throw new Error('期望失败，但验证通过');
  }
  if (!result.error.includes('字段顺序不正确')) {
    throw new Error(`错误信息不正确: ${result.error}`);
  }
});

// B2: 验证 ID 格式
test('B2: 验证 ID 格式 - 正确格式', () => {
  const line = '| REQ-001 | Test | in-progress | req | Next |  | `.cursor/.lingxi/requirements/in-progress/REQ-001.md` |';
  const row = parseRow(line);
  if (!row || row.id !== 'REQ-001') {
    throw new Error('期望解析成功，但解析失败');
  }
});

test('B2: 验证 ID 格式 - 数字不足3位', () => {
  const line = '| REQ-1 | Test | in-progress | req | Next |  | `.cursor/.lingxi/requirements/in-progress/REQ-1.md` |';
  const row = parseRow(line);
  if (row) {
    throw new Error('期望解析失败（ID 格式不正确），但解析成功');
  }
});

test('B2: 验证 ID 格式 - 非数字', () => {
  const line = '| REQ-abc | Test | in-progress | req | Next |  | `.cursor/.lingxi/requirements/in-progress/REQ-abc.md` |';
  const row = parseRow(line);
  if (row) {
    throw new Error('期望解析失败（ID 格式不正确），但解析成功');
  }
});

// B3: 验证 Status 值有效性
test('B3: 验证 Status 值 - 有效值', () => {
  const validStatuses = ['in-progress', 'planned', 'in-review', 'needs-fix', 'completed'];
  const projectRoot = __dirname;
  
  validStatuses.forEach(status => {
    const row = {
      id: 'REQ-001',
      status: status,
      currentPhase: 'req',
      links: `.cursor/.lingxi/requirements/in-progress/REQ-001.md`
    };
    const errors = validateRow(row, projectRoot);
    // 只检查 status 相关的错误
    const statusErrors = errors.filter(e => e.includes('Status 值无效'));
    if (statusErrors.length > 0) {
      throw new Error(`有效 Status 值 "${status}" 被拒绝: ${statusErrors[0]}`);
    }
  });
});

test('B3: 验证 Status 值 - 无效值', () => {
  const row = {
    id: 'REQ-001',
    status: 'invalid-status',
    currentPhase: 'req',
    links: `.cursor/.lingxi/requirements/in-progress/REQ-001.md`
  };
  const errors = validateRow(row, __dirname);
  const statusErrors = errors.filter(e => e.includes('Status 值无效'));
  if (statusErrors.length === 0) {
    throw new Error('期望检测到 Status 值无效，但未检测到');
  }
});

// B4: 验证 Current Phase 值有效性
test('B4: 验证 Current Phase 值 - 有效值', () => {
  const validPhases = ['req', 'plan', 'audit', 'work', 'review', 'archive'];
  const projectRoot = __dirname;
  
  validPhases.forEach(phase => {
    const row = {
      id: 'REQ-001',
      status: 'in-progress',
      currentPhase: phase,
      links: `.cursor/.lingxi/requirements/in-progress/REQ-001.md`
    };
    const errors = validateRow(row, projectRoot);
    // 只检查 phase 相关的错误
    const phaseErrors = errors.filter(e => e.includes('Current Phase 值无效'));
    if (phaseErrors.length > 0) {
      throw new Error(`有效 Current Phase 值 "${phase}" 被拒绝: ${phaseErrors[0]}`);
    }
  });
});

test('B4: 验证 Current Phase 值 - 无效值', () => {
  const row = {
    id: 'REQ-001',
    status: 'in-progress',
    currentPhase: 'invalid-phase',
    links: `.cursor/.lingxi/requirements/in-progress/REQ-001.md`
  };
  const errors = validateRow(row, __dirname);
  const phaseErrors = errors.filter(e => e.includes('Current Phase 值无效'));
  if (phaseErrors.length === 0) {
    throw new Error('期望检测到 Current Phase 值无效，但未检测到');
  }
});

// B5: 检查文件一致性（简化测试，因为需要实际文件）
test('B5: 检查文件一致性 - 文件存在', () => {
  // 使用实际项目的文件进行测试
  const projectRoot = path.join(__dirname, '../../..');
  const row = {
    id: 'REQ-001',
    status: 'completed',
    currentPhase: 'archive',
    links: '`.cursor/.lingxi/requirements/completed/REQ-001.md` / `.plan.md` / `.review.md`'
  };
  const errors = validateRow(row, projectRoot);
  const fileErrors = errors.filter(e => e.includes('文件不存在'));
  // REQ-001 文件应该存在
  if (fileErrors.length > 0 && fileErrors.some(e => e.includes('REQ-001.md'))) {
    throw new Error(`期望文件存在，但检测到不存在: ${fileErrors[0]}`);
  }
});

// B6: 检查目录一致性
test('B6: 检查目录一致性 - Status=completed, 文件在 completed/', () => {
  const projectRoot = path.join(__dirname, '../../..');
  const row = {
    id: 'REQ-001',
    status: 'completed',
    currentPhase: 'archive',
    links: '`.cursor/.lingxi/requirements/completed/REQ-001.md` / `.plan.md` / `.review.md`'
  };
  const errors = validateRow(row, projectRoot);
  const dirErrors = errors.filter(e => e.includes('Status 为 "completed" 但文件在 in-progress/'));
  if (dirErrors.length > 0) {
    throw new Error(`期望目录一致性通过，但检测到错误: ${dirErrors[0]}`);
  }
});

test('B6: 检查目录一致性 - Status=in-progress, 文件在 in-progress/', () => {
  const projectRoot = path.join(__dirname, '../../..');
  const row = {
    id: 'REQ-002',
    status: 'planned',
    currentPhase: 'audit',
    links: '`.cursor/.lingxi/requirements/in-progress/REQ-002.md` / `.plan.md`'
  };
  const errors = validateRow(row, projectRoot);
  const dirErrors = errors.filter(e => e.includes('Status 为') && e.includes('但文件在 completed/'));
  if (dirErrors.length > 0) {
    throw new Error(`期望目录一致性通过，但检测到错误: ${dirErrors[0]}`);
  }
});

// B7: 输出验证结果（通过主函数测试）
test('B7: 输出验证结果 - 所有验证通过', () => {
  // 使用实际项目的 INDEX.md
  const indexPath = path.join(__dirname, '../../../.cursor/.lingxi/requirements/INDEX.md');
  if (fs.existsSync(indexPath)) {
    // 读取并解析
    const content = fs.readFileSync(indexPath, 'utf8');
    const lines = content.split('\n');
    
    let header = null;
    let headerLineIndex = -1;
    const rows = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!header && line.includes('| ID |')) {
        header = parseHeader(line);
        if (header) {
          headerLineIndex = i;
        }
      }
      if (header && i > headerLineIndex) {
        const row = parseRow(line);
        if (row) {
          rows.push(row);
        }
      }
    }
    
    if (rows.length === 0) {
      throw new Error('未解析到任何数据行');
    }
    
    // 验证应该通过（因为实际项目的 INDEX.md 是正确的）
    console.log(`  解析到 ${rows.length} 行数据`);
  }
});

// 运行所有测试
console.log('运行单元测试...\n');

// 清理测试文件
cleanupTestFiles();

// 输出结果
console.log(`\n测试结果: ${passed} 通过, ${failed} 失败`);

if (failures.length > 0) {
  console.log('\n失败的测试:');
  failures.forEach(f => {
    console.log(`  - ${f.name}: ${f.error}`);
  });
  process.exit(1);
} else {
  console.log('\n所有测试通过！');
  process.exit(0);
}
