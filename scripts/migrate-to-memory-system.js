#!/usr/bin/env node

/**
 * 灵犀记忆系统迁移脚本
 * 将 context/ 目录重构为 memory/ 目录
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const lingxiRoot = path.join(projectRoot, '.cursor', '.lingxi');
const contextDir = path.join(lingxiRoot, 'context');
const backupDir = path.join(lingxiRoot, 'context.backup');

console.log('开始迁移灵犀记忆系统...\n');

// 1. 备份现有数据
if (fs.existsSync(contextDir)) {
    console.log('备份现有数据...');
    if (fs.existsSync(backupDir)) {
        fs.rmSync(backupDir, { recursive: true, force: true });
    }
    fs.cpSync(contextDir, backupDir, { recursive: true });
    console.log('备份完成\n');
} else {
    console.log('未找到 context 目录，跳过备份\n');
}

// 2. 创建新目录结构
console.log('创建新目录结构...');
const memoryDir = path.join(lingxiRoot, 'memory');
const memoryExperienceDir = path.join(memoryDir, 'experience');
const memoryTechDir = path.join(memoryDir, 'tech');
const memoryBusinessDir = path.join(memoryDir, 'business');
const styleFusionDir = path.join(lingxiRoot, 'style-fusion');
const workspaceDir = path.join(lingxiRoot, 'workspace');

[
    memoryExperienceDir,
    path.join(memoryExperienceDir, 'team', 'standards'),
    path.join(memoryExperienceDir, 'team', 'knowledge'),
    path.join(memoryExperienceDir, 'project'),
    path.join(memoryExperienceDir, 'references'),
    path.join(memoryTechDir, 'services'),
    path.join(memoryBusinessDir, 'references'),
    styleFusionDir,
    workspaceDir
].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

console.log('目录结构创建完成\n');

// 3. 迁移文件
console.log('迁移文件...');

if (fs.existsSync(contextDir)) {
    // 迁移 experience
    const contextExperienceDir = path.join(contextDir, 'experience');
    if (fs.existsSync(contextExperienceDir)) {
        const teamDir = path.join(contextExperienceDir, 'team');
        const projectDir = path.join(contextExperienceDir, 'project');
        const refsDir = path.join(contextExperienceDir, 'references');
        
        if (fs.existsSync(teamDir)) {
            fs.cpSync(teamDir, path.join(memoryExperienceDir, 'team'), { recursive: true });
        }
        if (fs.existsSync(projectDir)) {
            fs.cpSync(projectDir, path.join(memoryExperienceDir, 'project'), { recursive: true });
        }
        if (fs.existsSync(refsDir)) {
            fs.cpSync(refsDir, path.join(memoryExperienceDir, 'references'), { recursive: true });
        }
        
        // 迁移根目录下的文件
        const files = fs.readdirSync(contextExperienceDir);
        files.forEach(file => {
            const srcPath = path.join(contextExperienceDir, file);
            const stat = fs.statSync(srcPath);
            if (stat.isFile() && file !== 'INDEX.md') {
                fs.copyFileSync(srcPath, path.join(memoryExperienceDir, file));
            }
        });
    }
    
    // 迁移 tech
    const contextTechDir = path.join(contextDir, 'tech');
    if (fs.existsSync(contextTechDir)) {
        fs.cpSync(contextTechDir, memoryTechDir, { recursive: true });
    }
    
    // 迁移 business
    const contextBusinessDir = path.join(contextDir, 'business');
    if (fs.existsSync(contextBusinessDir)) {
        fs.cpSync(contextBusinessDir, memoryBusinessDir, { recursive: true });
    }
    
    // 迁移 style-fusion
    const contextStyleFusionDir = path.join(contextDir, 'style-fusion');
    if (fs.existsSync(contextStyleFusionDir)) {
        fs.cpSync(contextStyleFusionDir, styleFusionDir, { recursive: true });
    }
    
    // 迁移 session 到 workspace
    const contextSessionDir = path.join(contextDir, 'session');
    if (fs.existsSync(contextSessionDir)) {
        const pendingFile = path.join(contextSessionDir, 'pending-compounding-candidates.json');
        if (fs.existsSync(pendingFile)) {
            fs.copyFileSync(pendingFile, path.join(workspaceDir, 'pending-compounding-candidates.json'));
        }
    }
}

console.log('文件迁移完成\n');

// 4. 合并索引
console.log('合并索引...');

const memoryIndexPath = path.join(memoryDir, 'INDEX.md');
const experienceIndexPath = path.join(memoryExperienceDir, 'INDEX.md');
const teamIndexPath = path.join(memoryExperienceDir, 'team', 'INDEX.md');
const projectIndexPath = path.join(memoryExperienceDir, 'project', 'INDEX.md');

function parseIndexTable(filePath) {
    if (!fs.existsSync(filePath)) {
        return [];
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const entries = [];
    let inTable = false;
    let headerFound = false;
    
    for (const line of lines) {
        if (line.match(/^\|.*\|$/) && !line.match(/^\|.*---.*\|$/)) {
            if (line.match(/^\|.*Tag.*\|/)) {
                headerFound = true;
                inTable = true;
                continue;
            }
            if (inTable && headerFound && line.trim() !== '') {
                entries.push(line);
            }
        }
    }
    
    return entries;
}

const experienceEntries = [];

// 读取根目录的 INDEX.md（如果存在）
if (fs.existsSync(experienceIndexPath)) {
    const entries = parseIndexTable(experienceIndexPath);
    experienceEntries.push(...entries.map(line => 
        line.replace(/\.cursor\/\.lingxi\/context\/experience/g, '.cursor/.lingxi/memory/experience')
    ));
}

// 读取 team INDEX
if (fs.existsSync(teamIndexPath)) {
    const entries = parseIndexTable(teamIndexPath);
    entries.forEach(line => {
        let updatedLine = line.replace(/\.cursor\/\.lingxi\/context\/experience/g, '.cursor/.lingxi/memory/experience');
        // 检查是否有 Level 字段（第 10 个字段）
        const parts = updatedLine.split('|').filter(p => p.trim() !== '');
        if (parts.length >= 11 && parts.length < 13) {
            // 在 ReplacedBy 之后插入 Level
            const newParts = [...parts.slice(0, 11), 'team', ...parts.slice(11)];
            updatedLine = '|' + newParts.join('|') + '|';
        } else if (parts.length === 11) {
            // 只有 11 个字段，在最后添加 Level
            updatedLine = updatedLine.replace(/\|$/, '|team|');
        }
        experienceEntries.push(updatedLine);
    });
}

// 读取 project INDEX
if (fs.existsSync(projectIndexPath)) {
    const entries = parseIndexTable(projectIndexPath);
    entries.forEach(line => {
        let updatedLine = line.replace(/\.cursor\/\.lingxi\/context\/experience/g, '.cursor/.lingxi/memory/experience');
        const parts = updatedLine.split('|').filter(p => p.trim() !== '');
        if (parts.length >= 11 && parts.length < 13) {
            const newParts = [...parts.slice(0, 11), 'project', ...parts.slice(11)];
            updatedLine = '|' + newParts.join('|') + '|';
        } else if (parts.length === 11) {
            updatedLine = updatedLine.replace(/\|$/, '|project|');
        }
        experienceEntries.push(updatedLine);
    });
}

// 创建统一索引
const indexContent = `# Memory Index

> 灵犀统一记忆系统索引（SSoT - Single Source of Truth）
> 
> 所有持久化记忆（经验、技术、业务）使用统一的索引格式和匹配策略。

## Experience（经验记忆）

| Tag | Type | Title | Trigger | Surface signal | Hidden risk | Status | Scope | Strength | Level | Replaces | ReplacedBy | File |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
${experienceEntries.length > 0 ? experienceEntries.join('\n') : ''}

## Tech（技术记忆）

| Tag | Title | Service | Trigger | Status | File |
|---|---|---|---|---|---|

## Business（业务记忆）

| Tag | Title | Topic | Trigger | Status | File |
|---|---|---|---|---|---|
`;

fs.writeFileSync(memoryIndexPath, indexContent, 'utf8');
console.log('索引合并完成\n');

console.log('迁移完成！\n');
console.log(`新目录结构：${memoryDir}`);
console.log(`备份位置：${backupDir}`);
console.log('\n注意：旧 context 目录已保留为备份，确认迁移无误后可手动删除');
