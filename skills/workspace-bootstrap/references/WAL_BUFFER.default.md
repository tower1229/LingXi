# 🗂️ Global WAL Buffer (全局预写日志缓冲池)

> **[SYSTEM_WARNING]**: 此文件为 AgentOS 全局系统级缓存。
> 所有跨会话共享的低频重量级操作（例如将特定会话内的排错经验提取固化为项目全局规范），均由主 Agent 写入此缓存。
> 随后由后台守护进程（如 `lingxi-self-iterate` 或 `memory-govern`）异步轮询消费并清理。

---

## 📥 [PENDING OPERATIONS] (待处理操作池)

<!-- 
格式规范见 plugin/skills/workspace-bootstrap/references/wal-schema.md
行格式：- [ ] `[TYPE]`: <JSON> 或 - [x] `[TYPE]`: <JSON>
类型：SESSION_DISTILL（30min 会话提炼）、SELF_ITERATE（24h 自我迭代）等
-->
