[English](./README.md)

# LíngXī（灵犀）

以质量优先为原则推进的 LingXi 2.0 重建。

## 当前状态

这个仓库正处于 LingXi 2.0 的重建阶段。

- 2.0 的目标主线已经明确为 **Codex-native**。
- 2.0 的可见工作流刻意收敛为 `task` 和 `vet`。
- 持久记忆仍然是核心能力：`memory-retrieve`、`memory-write`、`session-distill`。
- 旧的 `.cursor/` 资产目前仍保留，用于兼容、参考和迁移安全；它们不是最终的 2.0 产品形态。

当前项目遵循“质量优先”原则：

- 不为了推进 roadmap 阶段而牺牲质量
- 先对齐当前已进入范围的能力，再继续扩张范围
- 优先追求强约束、清晰输出和可验证行为，而不是过早抽象

相关文档：

- [架构文档](./docs/architecture.md)
- [Roadmap](./docs/lingxi-2-roadmap.md)
- [质量标准](./docs/quality-baseline.md)

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
- `.cursor/`：保留中的 Cursor 时代资产与兼容面

## 安装说明

当前仓库同时存在两套表层：

1. **目标中的 2.0 架构**：Codex-native。
2. **保留中的 Cursor 安装表层**：仍会安装 `.cursor/` 资产。

因此，`install/` 里的远程安装脚本目前属于过渡期兼容路径，还不是最终的 Codex-native 2.0 分发方式。

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

当前仓库把“测试全绿”和“产品表层一致性”都视为继续推进 roadmap 之前的强制质量门槛。
