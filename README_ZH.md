[English](./README.md)

# LíngXī（灵犀）

以质量优先为原则推进的 LingXi 2.0 重建。

## 当前状态

这个仓库正处于 LingXi 2.0 的重建阶段。

- 2.0 的产品主线已经明确为 **Codex-native**。
- 2.0 的可见工作流刻意收敛为 `task` 和 `vet`。
- 持久记忆仍然是核心能力：`memory-retrieve`、`memory-write`、`session-distill`。
- 仓库里即便仍有 `.cursor/` 历史材料，也只是收尾阶段的临时参考物，不属于 2.0 的安装与支持表层，并且最终要从主仓库中移除。

当前项目遵循“质量优先”原则：

- 不为了推进 roadmap 阶段而牺牲质量
- 先对齐当前已进入范围的能力，再继续扩张范围
- 优先追求强约束、清晰输出和可验证行为，而不是过早抽象

相关文档：

- [架构文档](./docs/architecture.md)
- [Roadmap](./docs/lingxi-2-roadmap.md)
- [质量标准](./docs/quality-baseline.md)
- [Cursor 时代资产分层](./docs/cursor-era-asset-classification.md)

## 当前 2.0 核心

已实现或正在做质量对齐的部分：

- Codex 插件外壳：`.codex-plugin/plugin.json`
- 项目本地运行时目录：`.lingxi/`
- setup/bootstrap：`scripts/lingxi-setup.mjs`
- 可见工作流：`skills/task/`、`skills/vet/`
- 记忆核心：`skills/memory-retrieve/`、`skills/memory-write/`
- 后台提炼：`skills/session-distill/`
- 项目级 distill agent 模板：`templates/agents/lingxi-session-distill.toml.tmpl`

## 仓库结构

- `.codex-plugin/`：Codex 插件壳
- `skills/`：LingXi 2.0 技能实现
- `scripts/`：确定性 setup 与运行时辅助脚本
- `templates/`：生成到目标仓库的运行时模板
- `docs/`：架构、roadmap 与质量标准
- `.cursor/`：仓库内暂时保留的 Cursor 时代参考材料，不属于受支持的 2.0 表层，并以最终移除为目标；具体分层见 [Cursor 时代资产分层](./docs/cursor-era-asset-classification.md)

## 安装说明

`install/` 里的远程安装脚本现在会直接分发受支持的 LingXi 2.0 表层：

- `.codex-plugin/plugin.json`
- `skills/`
- `scripts/`
- `templates/`
- 生成到目标仓库中的 `.lingxi/` 与 `.codex/agents/`

它们不再安装或管理 `.cursor/` 资产。

如果要在本地验证 2.0 运行时骨架，优先在目标仓库中执行：

```bash
node scripts/lingxi-setup.mjs
```

这会生成当前 2.0 所需的 `.lingxi/` 和 `.codex/agents/` 结构。

## 开发

运行测试：

```bash
npm test
```

这条命令只运行当前受支持的 LingXi 2.0 产品测试套件。

如果要运行 Cursor 时代遗留迁移保护测试：

```bash
npm run test:legacy
```

如果改动同时涉及产品面与历史剥离工作：

```bash
npm run test:all
```

当前仓库把“当前产品测试全绿”和“产品表层一致性”都视为继续推进 roadmap 之前的强制质量门槛。
