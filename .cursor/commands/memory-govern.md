---
name: memory-govern
description: 记忆库治理（同步 INDEX 与 notes，并由模型补全未索引条目、可选全库治理）
args:
  - name: dryRun
    required: false
    description: 传 --dry-run 时仅执行脚本并输出结果，不写回 INDEX、不调用模型补全、不执行全库治理
  - name: skipGovern
    required: false
    description: 传 --skip-govern 时仅执行同步与模型补全未索引，跳过全库主动治理
  - name: root
    required: false
    description: 传 --root <path> 指定 memory 根目录，默认 .cursor/.lingxi/memory
---

# /memory-govern - 记忆库治理

**用途**：同步 INDEX 与 notes（删除孤儿索引行、由模型补全未索引 note 的 INDEX 行），并可对整库做主动治理（合并/改写/归档建议）。委托 **memory-govern** Skill 执行。

**用法**：`/memory-govern [--dry-run] [--skip-govern] [--root <memoryRoot>]`

- **无参数**：执行同步 + 模型补全未索引 + 全库治理（治理建议经门控确认后写回）。
- **--dry-run**：仅运行脚本并输出 JSON 解析结果，不写回 INDEX、不调用模型、不执行阶段 2。
- **--skip-govern**：执行同步与模型补全未索引，跳过全库治理。
- **--root \<path\>**：指定 memory 根目录（默认 `.cursor/.lingxi/memory`）。

**执行**：委托 memory-govern Skill；Skill 调用本目录下 `scripts/memory-index-sync.mjs` 做检测与孤儿删除，再根据脚本输出的未索引 note 列表交模型生成 INDEX 行并写回；可选执行全库治理与门控写回。

**输出**：简报（孤儿删除数、补全未索引数、可选重复 Id 提示）；若执行阶段 2 则包含采纳的治理建议说明。
