#!/usr/bin/env node

/**
 * Cursor Workflow 安装脚本 (Node.js 跨平台)
 * 将 cursor-workflow 模板集成到当前项目
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 颜色输出
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
};

function info(message) {
    console.log(`${colors.blue}ℹ${colors.reset} ${message}`);
}

function success(message) {
    console.log(`${colors.green}✓${colors.reset} ${message}`);
}

function warning(message) {
    console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
}

function error(message) {
    console.log(`${colors.red}✗${colors.reset} ${message}`);
}

// 同步读取输入（简化版，仅支持基本场景）
function readInputSync(prompt) {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question(prompt, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

// 复制目录
function copyDir(src, dest) {
    if (!fs.existsSync(src)) {
        throw new Error(`源目录不存在: ${src}`);
    }

    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

// 读取安装清单
function loadManifest() {
    const manifestPath = path.join(__dirname, 'install-manifest.json');
    if (!fs.existsSync(manifestPath)) {
        error(`未找到安装清单文件: ${manifestPath}`);
        error('请确保 install-manifest.json 文件存在');
        process.exit(1);
    }

    try {
        const manifestContent = fs.readFileSync(manifestPath, 'utf8');
        return JSON.parse(manifestContent);
    } catch (err) {
        error(`读取安装清单失败: ${err.message}`);
        process.exit(1);
    }
}

// 主函数
async function main() {
    try {
        // 读取安装清单
        const manifest = loadManifest();

        // 获取脚本所在目录
        const scriptDir = __dirname;

        // 检查是否在正确的目录
        const cursorPath = path.join(scriptDir, '.cursor');
        const workflowPath = path.join(scriptDir, '.workflow');

        if (!fs.existsSync(cursorPath) || !fs.existsSync(workflowPath)) {
            error('未找到 .cursor 或 .workflow 目录');
            error('请确保在 cursor-workflow 模板仓库的根目录运行此脚本');
            process.exit(1);
        }

        info('开始安装 Cursor Workflow...');

        // 检查目标目录是否存在
        const cursorExists = fs.existsSync('.cursor');
        const workflowExists = fs.existsSync('.workflow');

        if (cursorExists) {
            warning('.cursor 目录已存在');
        }

        if (workflowExists) {
            warning('.workflow 目录已存在');
        }

        // 询问是否继续
        if (cursorExists || workflowExists) {
            const response = await readInputSync('是否继续？这将覆盖现有文件 (y/N): ');
            if (response.toLowerCase() !== 'y') {
                info('安装已取消');
                process.exit(0);
            }
        }

        // 创建 .cursor 目录结构
        info('创建 .cursor 目录结构...');
        fs.mkdirSync('.cursor/commands', { recursive: true });
        fs.mkdirSync('.cursor/rules', { recursive: true });
        fs.mkdirSync('.cursor/skills', { recursive: true });
        fs.mkdirSync('.cursor/hooks', { recursive: true });

        // 复制 commands
        info('复制 commands...');
        for (const cmd of manifest.commands) {
            const srcPath = path.join(scriptDir, '.cursor', cmd);
            const destPath = path.join('.cursor', cmd);
            const destDir = path.dirname(destPath);
            if (!fs.existsSync(destDir)) {
                fs.mkdirSync(destDir, { recursive: true });
            }
            fs.copyFileSync(srcPath, destPath);
        }
        success(`已复制 commands (${manifest.commands.length} 个文件)`);

        // 复制 rules（项目级质量准则）
        // 注意：qs-i-workflow 不在列表中（仅用于本项目开发）
        info('复制 rules...');
        // 复制规则目录
        for (const ruleDir of manifest.rules.directories) {
            const srcPath = path.join(scriptDir, '.cursor', ruleDir);
            const destPath = path.join('.cursor', ruleDir);
            copyDir(srcPath, destPath);
        }
        // 复制规则文件
        for (const ruleFile of manifest.rules.files) {
            const srcPath = path.join(scriptDir, '.cursor', ruleFile);
            const destPath = path.join('.cursor', ruleFile);
            const destDir = path.dirname(destPath);
            if (!fs.existsSync(destDir)) {
                fs.mkdirSync(destDir, { recursive: true });
            }
            fs.copyFileSync(srcPath, destPath);
        }
        success(`已复制 rules (${manifest.rules.directories.length} 个规则目录 + ${manifest.rules.files.length} 个文件)`);


        // 复制 skills（根据清单复制，但使用 copyDir 复制整个目录结构）
        info('复制 skills...');
        copyDir(path.join(scriptDir, '.cursor/skills'), '.cursor/skills');
        success('已复制 skills');

        // 复制 hooks（hooks.json + scripts）
        info('复制 hooks...');
        copyDir(path.join(scriptDir, '.cursor/hooks'), '.cursor/hooks');
        fs.copyFileSync(path.join(scriptDir, '.cursor/hooks.json'), '.cursor/hooks.json');
        success('已复制 hooks');

        // 创建 .workflow 目录结构
        info('创建 .workflow 目录结构...');
        for (const dir of manifest.workflowDirectories) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // 复制 INDEX.md 文件
        info('复制索引文件...');
        for (const indexFile of manifest.workflowIndexFiles) {
            const srcPath = path.join(scriptDir, indexFile);
            const destPath = indexFile;
            const destDir = path.dirname(destPath);
            if (!fs.existsSync(destDir)) {
                fs.mkdirSync(destDir, { recursive: true });
            }
            fs.copyFileSync(srcPath, destPath);
        }
        success('已复制索引文件');

        // 更新 .gitignore
        info('更新 .gitignore...');
        const gitignoreEntries = manifest.gitignoreEntries;

        if (fs.existsSync('.gitignore')) {
            let content = fs.readFileSync('.gitignore', 'utf8');
            let needUpdate = false;

            for (const entry of gitignoreEntries) {
                if (entry !== '' && !content.includes(entry)) {
                    needUpdate = true;
                    break;
                }
            }

            if (needUpdate) {
                content += '\n# Cursor Workflow\n';
                for (const entry of gitignoreEntries) {
                    content += entry + '\n';
                }
                fs.writeFileSync('.gitignore', content, 'utf8');
                success('已更新 .gitignore');
            } else {
                info('.gitignore 已包含相关条目，跳过更新');
            }
        } else {
            // 创建 .gitignore
            const gitignoreContent = [
                '# Local workspace for temp code clones, generated artifacts, etc.',
                '.workflow/workspace/',
                '',
                '# Session-level context (ephemeral, not a knowledge base)',
                '.workflow/context/session/',
                '',
                '# OS / IDE',
                '.DS_Store',
                'Thumbs.db',
                '',
            ].join('\n');
            fs.writeFileSync('.gitignore', gitignoreContent, 'utf8');
            success('已创建 .gitignore');
        }

        // 输出成功信息
        console.log('');
        success('安装完成！');
        console.log('');
        info('已安装的文件：');
        console.log(`  - .cursor/commands/ (${manifest.commands.length} 个命令)`);
        console.log(`  - .cursor/rules/ (${manifest.rules.directories.length} 个规则目录 + ${manifest.rules.files.length} 个文件)`);
        console.log(`  - .cursor/skills/ (${manifest.skills.length} 个核心 skills)`);
        console.log('  - .workflow/ 目录结构');
        console.log('');
        info('下一步：');
        console.log('  1. 在 Cursor 中打开项目');
        console.log('  2. 运行 /flow <需求描述> 创建第一个需求');
        console.log('  3. 查看 README.md 了解完整工作流');
        console.log('');
        info('更多信息：https://github.com/your-org/cursor-workflow');
    } catch (err) {
        error(`安装失败: ${err.message}`);
        process.exit(1);
    }
}

// 运行主函数
main();
