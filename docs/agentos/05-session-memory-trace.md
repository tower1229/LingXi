# LingXi AgentOS 会话级工作记忆 (Session Trace) 设计文档

## 一、 核心痛点：Subagent 的“孤岛失忆”现象

在 Orchestrator-Worker (主-从) 架构下，虽然隔离了沙盒，但也引入了一个生产环境中极其致命的问题：**上下文割裂与短时记忆丧失（Subagent Amnesia）**。

### 场景重现（灾难演练）：
1. **Turn 1**: 用户要求“在导航栏加一个登录按钮”。主 Agent (Orchestrator) 委派给 Subagent A。
2. **执行**: Subagent A 查阅代码，决定在 `Navbar.tsx` 中使用 `absolute` 定位加了按钮，返回 `Execution_Summary`。
3. **Turn 2**: 用户反馈“这个按钮在移动端会挡住 Logo，稍微往左边挪一点”。
4. **二次委派**: 主 Agent 收到反馈，再次创建/唤醒 Subagent B 去执行“把登录按钮往左挪一点”。
5. **系统崩溃点**: **Subagent B 是一个全新的上下文实例！** 它根本不知道 Subagent A 刚才是在 `Navbar.tsx` 里用 `absolute` 写的按钮！它只能去全局盲找，甚至可能把整个文件给改乱了。

**结论**：如果只依靠主 Agent 在 prompt 里给子代理传参数，随着多轮对话反馈的叠加，上下文的传递必然出现严重的衰减、扭曲和遗漏。

---

## 二、 解决方案：引入会话级预写日志 (Session Trace WAL)

借鉴数据库的 WAL (Write-Ahead Logging) 和操作系统的页表机制，我们必须在 `HOT_RAM.md` 和全局长期记忆库（LTM）之间，引入一个**“短期工作记忆层 (STWM - Short-Term Working Memory)”**。

我们设立一套专属的会话级日志存储目录：**`.cursor/.lingxi/os/sessions/`**。
每一条会话级短时记忆日志将以 Cursor 的原生 `session_id` 独立命名，例如：**`[session_id].trace.md`**。

### 1. 生命周期与隔离机制 (Session Isolation)
- **生**：当用户在 Cursor 发起一个全新的会话 (New Chat) 时，系统 Hook 会获取到唯一的 `session_id`，并在目录中独立拉起该维度的预写日志。
- **存**：在多会话（多 Tab 并发）场景下，两个对话的子代理（Subagents）读取的 Trace 数据将在物理层面被这串 `session_id` 完全隔离，绝不串台污染。
- **长**：伴随单个对话的生命周期，**只增不减 (Append-Only)**。
- **灭**：当用户关闭或归档某个不再使用的聊天后，未来也可以设计定期的清理任务清理过期的 `[session_id].trace.md` 文件。

### 2. 内容结构设计
它是一个时间轴流水账，记录了在这个会话里发生过的一切**“关键转折点”**：

```markdown
# ⏳ LingXi Session Trace (当前会话追踪日志)

> [!NOTE]
> 给 Subagent 的宣告：你在执行本次具体任务前，请务必快速扫一眼本日志，以理解之前的代理兄弟们做了什么，以及用户的连续反馈历史。

## [Turn 1] User Request
- **意图**: 在导航栏加一个登录按钮，需要具备科技感。

## [Turn 1] Subagent Action (by `lingxi-subagent`)
- **Action**: 修改了 `src/components/Navbar.tsx`。
- **Key Traps**: 发现 `Navbar` 被包裹在 `Layout` 中，因此避开了直接修改全局样式。
- **Decisions Made**: 使用了 `absolute` 和 Tailwind 的 `right-4` 定位。

## [Turn 2] User Feedback
- **意图**: 移动端挡住了 Logo，往左挪一点。

## [Turn 2] Subagent Action (PENDING)
...
```

### 3. 日志窗口化折叠 (Token 防爆机制)
伴随对话加深，STWM 会持续追加直到几十轮。为防止 Subagent 再次被 STWM 撑爆上下文窗口：
- 守护脚本在每次 Append 前会检查现有轮数。
- 当达到阈值（如超过 10 轮）时，启用**折叠机制**：仅保留 `[Turn 1]`（初始请求与边界）和最新的前两轮 `[Turn N-1, Turn N]`。
- 脚本会将中间被截断的试错过程替换为占位符：`<... X Turns of iterative debugging omitted ...>`。以极小开销保持上下文连续性。

---

## 三、 AgentOS 三级内存物理架构 (生产环境全景)

至此，LingXi AgentOS 完成了宏大的三级内存梯队建设，完全对标现代计算机存储层级：

| 计算机硬件层级 | LingXi AgentOS 映射 | 物理载体 | 读写特性与生命周期 |
| --- | --- | --- | --- |
| **L1/L2 Cache (寄存器/热缓存)** | **态势感知总线 / 指令控制台** | `.cursor/.lingxi/os/HOT_RAM.md` | **极高频读写，只存当前瞬间状态。** 主干 Agent 每次回话必读。全系统唯一，多会话并发时通过“内核上下文切换(Context Switch)”动态覆写。 |
| **RAM (内存/运行时上下文)** | **会话级工作记忆 (Session Trace)** | `.cursor/.lingxi/os/sessions/[session_id].trace.md` | **中频写，高频读**。伴随独立 Cursor 会话存在，Append-only 追加写入该独立会话下的踩坑纪实和历史反馈。 |
| **SSD/HDD (硬盘/固态存储)** | **长期知识库 (Long-Term Memory)** | `.cursor/.lingxi/memory/project/*.md` | **低频写，按需检索读**。跨会话永久保存的核心踩坑经验和项目架构规律。 |

---

## 四、 运行流转机制上的闭环

有了 `SESSION_TRACE.md` 后，Hook 脚本的工作流（守护进程）将变得无比平滑和强大：

1. **`subagentStop` 触发时**：
   - 守护进程脚本拦截到 Subagent 返回的 `<Execution_Summary>` 以及当前会话的 `session_id`。
   - 脚本不仅更新全局唯一的 `HOT_RAM.md` 为 `POST_PROCESSING_REQUIRED`。
   - 脚本还会**自动将这段 Summary 追加 (Append)** 到对应隔离的 `sessions/[session_id].trace.md` 的尾部！
2. **用户发送新的反馈时**：
   - `beforeSubmitPrompt` 拦截用户的输入与当前界面的 `session_id`。
   - 这是典型的 **OS 级上下文切换 (Context Switch)** 时机：脚本拦截当前标签页请求，不仅将该对话的反馈追加到该对话私有的 `[session_id].trace.md`，还会瞬间用当前 Session 的状态“覆写”全局唯一的 `HOT_RAM.md`。
3. **主 Agent 委派时**：
   - 主 Agent 在构造给下一个 Subagent 的 prompt 时，只需要附带一句系统级指令：“请结合 `.cursor/.lingxi/os/sessions/[session_id].trace.md` 的上下文历史，完成刚才交代给你的改进优化任务。”

通过这套机制，我们在没有任何侵入性地前提下，**在物理硬盘上“粘合”了所有动态子代理的破碎上下文**。任何一个随时被拉起的 Subagent，通过读取 `SESSION_TRACE.md` 这个 WAL（预写日志），就能瞬间重塑出完整的时空连续性视角。
