# 灵犀生命周期与调度管道 (Lifecycle Flow)

本文档展开调度层的**双轨决策**与 **Strict OS 下的确定性管道**：Tier 1/2/3 决策树、「前置检索 → 派发 → 状态回收 → 后置义务」的逐步技术细节，以及后处理队列的消费顺序。与 `architecture.md` 调度层、`agentos-kernel.mdc` 规则一一对应。

---

## 一、每轮入口：必读 HOT_RAM

主 Agent 在响应用户**任意**消息前，**第一步**必须读取当前会话的 `HOT_RAM.md`（路径含 `session_id`）。若文件不存在，则从 `HOT_RAM.default.md` 模板创建并写入正确会话路径。禁止在未摄入 HOT_RAM 前做出任何主观响应。

- **合法状态**：`IDLE` | `WAITING_SUBAGENT` | `POST_PROCESSING_REQUIRED` | `HUMAN_INTERVENTION_REQUIRED`。
- **GLOBAL CONFIG**：若 `[GLOBAL CONFIG]` 为空或占位，则从 `USER.md` 读取行为偏好并写入 HOT_RAM，每会话一次。

---

## 二、Tier 1/2/3 决策树（双轨）

请求按下列决策树划分，决定走 **Fast-Path** 还是 **Strict OS Mode**：

| 分支 | 条件 | 路径 | 行为要点 |
|------|------|------|----------|
| **Tier 1/2** | 纯信息、轻量工具调用，或工作流中的 **task / vet / plan / review**（交互与审计） | **Fast-Path** | 主 Agent **直接执行**，不委派 Subagent。可使用 ask-questions、直接写文档与完整审查报告。无需状态机，可将动作记入 SESSION_TRACE。可选：纯问答前若依赖项目规范，先做 memory-retrieve（Pre 模式）。 |
| **Tier 3** | 涉及**代码编写、调试或 build 步骤** | **Strict OS Mode** | **禁止**主 Agent 直接写代码或执行重度 I/O。**必须**委派 Subagent，并走完整 HOT_RAM 生命周期（见第三节）。build 时采用 Zero-Intervention Dispatch；其他复杂任务可先 memory-retrieve、taste-recognition，再 megaprompt-assembly 后派发。 |

- **Tier 1 增强**：回答纯信息问题时，若依赖本项目约定，先调用 memory-retrieve（Pre）。
- **Tier 3 派发**：build 仅组最小 Megaprompt 即派发；其他任务可先检索与品味识别，再组装 Megaprompt 派发。

---

## 三、Strict OS 管道：四步与后置义务

在 **Strict OS Mode** 下，调度层严格按以下顺序执行，**无隐式分支**：

1. **前置检索（可选）**  
   按需调用 memory-retrieve（Pre）、taste-recognition，结果写入 HOT_RAM 的 `[PRE-MEMORY]` 等；用于组装 Megaprompt 的工程约束。

2. **任务派发**  
   将 `Current State` 置为 `WAITING_SUBAGENT`；按 Megaprompt 组装协议（见 `ipc-protocols.md`）派发 Subagent。主 Agent 挂起，不执行业务逻辑。

3. **状态回收**  
   Subagent 返回后，主 Agent **必须**立即（且可并行）完成：  
   - 将 `<Execution_Summary>` 追加到 `SESSION_TRACE.md`；  
   - 将 HOT_RAM 的 `Current State` 改为 `POST_PROCESSING_REQUIRED`。  
   禁止在未完成上述两步前向用户报“任务完成”并结束。

4. **后置义务**  
   - 读取 HOT_RAM 的 `[POST-PROCESSING QUEUE]`；  
   - **按顺序执行队列中所有未勾选任务**（如记忆写入、WAL 消费、用户报告、状态更新等）；  
   - 若 Subagent 返回中含 `<Payload>` JSON，须解析并用于最终报告与下一步选项；  
   - **仅当队列中所有项均勾销后**，才可结束对用户的回复。

若 Subagent 返回 `FAILED` 或内核对派发信心不足，须将状态置为 `HUMAN_INTERVENTION_REQUIRED` 并暂停，请求用户决策。

---

## 四、后处理队列（POST-PROCESSING QUEUE）典型项

队列中常见项（具体以 HOT_RAM 模板与规则为准）包括但不限于：

- **POST_RETRIEVE**：基于 `<Execution_Summary>` 的 Touched Assets 做后置记忆检索，将结果追加为新的 checkbox 任务。
- **WAL_BUFFER_SYNC**：消费 `WAL_BUFFER.md` 中未勾选任务（如 `[SESSION_DISTILL]`），必要时唤起 session-distill 等子代理，完成后勾选 WAL 行。
- **USER_REPORT**：向用户呈现 Task Summary、下一步选项等。
- **记忆写入**：将本轮产生的记忆 Payload 交给 lingxi-memory-write 等。

执行顺序固定：按队列顺序依次处理，全部勾销后会话轮次才视为收敛，实现**后置闭环**（见 `design-principles.md`）。

---

## 关联导航

- **上游**：`architecture.md`（调度层、双轨、管道）、`design-principles.md`（后置闭环、主从解耦）
- **下游**：`ipc-protocols.md`（HOT_RAM 结构、Megaprompt、Execution_Summary）、`memory-system.md`（后处理中的记忆与 WAL）、`rules/agentos-kernel.md`（权威规则）
- **同层**：`architecture.md`（工作流与四层关系）、`workflow-output-principles.md`（输出契约）
