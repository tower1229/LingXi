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

// 主函数
async function main() {
    try {
        // 获取脚本所在目录
        const scriptDir = __dirname;

        // 检查是否在正确的目录
        const cursorPath = path.join(scriptDir, '.cursor');
        const aiPath = path.join(scriptDir, 'ai');

        if (!fs.existsSync(cursorPath) || !fs.existsSync(aiPath)) {
            error('未找到 .cursor 或 ai 目录');
            error('请确保在 cursor-workflow 模板仓库的根目录运行此脚本');
            process.exit(1);
        }

        info('开始安装 Cursor Workflow...');

        // 检查目标目录是否存在
        const cursorExists = fs.existsSync('.cursor');
        const aiExists = fs.existsSync('ai');

        if (cursorExists) {
            warning('.cursor 目录已存在');
        }

        if (aiExists) {
            warning('ai 目录已存在');
        }

        // 询问是否继续
        if (cursorExists || aiExists) {
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

        // 复制 commands
        info('复制 commands...');
        copyDir(path.join(scriptDir, '.cursor/commands'), '.cursor/commands');
        success('已复制 commands (7 个文件)');

        // 复制 rules
        info('复制 rules...');
        copyDir(path.join(scriptDir, '.cursor/rules'), '.cursor/rules');
        success('已复制 rules (6 个文件)');

        // 创建 ai 目录结构
        info('创建 ai 目录结构...');
        const aiDirs = [
            'ai/requirements/in-progress',
            'ai/requirements/completed',
            'ai/context/business',
            'ai/context/tech/services',
            'ai/context/experience',
            'ai/context/session',
            'ai/workspace',
        ];

        for (const dir of aiDirs) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // 复制 INDEX.md 文件
        info('复制索引文件...');
        fs.copyFileSync(
            path.join(scriptDir, 'ai/requirements/INDEX.md'),
            'ai/requirements/INDEX.md'
        );
        fs.copyFileSync(
            path.join(scriptDir, 'ai/context/experience/INDEX.md'),
            'ai/context/experience/INDEX.md'
        );
        success('已复制索引文件');

        // 更新 .gitignore
        info('更新 .gitignore...');
        const gitignoreEntries = [
            '# Local workspace for temp code clones, generated artifacts, etc.',
            'ai/workspace/',
            '',
            '# Session-level context (ephemeral, not a knowledge base)',
            'ai/context/session/',
        ];

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
                'ai/workspace/',
                '',
                '# Session-level context (ephemeral, not a knowledge base)',
                'ai/context/session/',
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
        console.log('  - .cursor/commands/ (7 个命令文件)');
        console.log('  - .cursor/rules/ (6 个规则文件)');
        console.log('  - ai/ 目录结构');
        console.log('');
        info('下一步：');
        console.log('  1. 在 Cursor 中打开项目');
        console.log('  2. 运行 /req 命令创建第一个需求');
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
