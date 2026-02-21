# 插件形态下的 Hooks

## 约定

灵犀以 Cursor 官方插件形式安装后，`hooks.json` 中的 `command` 使用相对路径，例如：

- `node .cursor/hooks/session-init.mjs`
- `node .cursor/hooks/lingxi-audit.mjs`

## 工作目录说明

Cursor 执行 plugin hooks 时的**当前工作目录**以官方文档为准（[构建插件](https://cursor.com/cn/docs/plugins/building)）。若 Cursor 以**工作区根**为 cwd，则 `node .cursor/hooks/...` 会解析工作区内的 `.cursor`；插件安装时，该 `.cursor` 由 Cursor 从插件包中提供并映射到工作区。若遇 hook 未触发或路径找不到，请查阅 Cursor 插件文档中 hooks 的 cwd 与路径解析规则，必要时在仓库内更新本文档或调整 `hooks.json` 中的路径格式。
