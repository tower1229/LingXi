# 🗂️ Global WAL Buffer (全局预写日志缓冲池)

> **[SYSTEM_WARNING]**: 此文件为 AgentOS 全局系统级缓存。
> 所有跨会话共享的低频重量级操作（例如将特定会话内的排错经验提取固化为项目全局规范），均由主 Agent 写入此缓存。
> 随后由后台守护进程（如 `lingxi-self-iterate` 或 `memory-govern`）异步轮询消费并清理。

---

## 📥 [PENDING OPERATIONS] (待处理操作池)

<!-- 
格式规范：
- [ ] `[OPERATION_TYPE]`: <JSON Payload>
例如：
- [ ] `[GLOBAL_MEMORY_PROMOTE]`: {"source_session": "xxx", "content": "..."}
-->

- [x] `[SELF_ITERATE]`: {"session_id": "1e113795-63b8-42e0-92b2-689873306055"}
- [x] `[SESSION_DISTILL]`: {"candidate_ids": ["fbedc02c-8df1-484f-ace2-0c796a4d3e4b","9b703413-73ef-494b-87f9-bd5be8801a0c","20ac3719-0c42-4382-967e-21385c648f51"], "enqueued_by": "1e113795-63b8-42e0-92b2-689873306055"}
- [x] `[SELF_ITERATE]`: {"session_id":"37135d5f-7d6a-4d23-bbc5-8adc8d419098"}
