根据你刚才的逐条结论，整理成一份**完整修改方案**，便于一次性落地或分批执行。当前为 Ask 模式，我只给出方案文本，不直接改文件。

---

# 灵犀 AI Native 与说明风格 — 完整修改方案

## 关于 AI Native 表述的定位（必读）

**「信任模型、短说明、人为主的门控」不是原则性总结**，而是讨论中的、**包含因果关系的说明性内容**：

- **因果 1**：因为信任模型的理解能力 → 所以采用短说明 → 从而减少无效干预、节省 token。
- **因果 2**：因为只有人才拥有真正的品味 → 所以以人为主 → 所以需要门控。

**升维总结**：从上述因果讨论抽象出**原则层**表述（例如 core-values 中的一句话：「尊重 AI 能力，预留进化空间」；以及关键决策以人为主、门控保障）。原则层写进核心价值与评价准则；因果与实现细节作为**说明**放在核心思想、设计原则、实现方式或 references 中，**不要**把三句话本身当作原则性总结到处复读。

---

## 一、总体原则（适用于所有灵犀核心文件）

- **优先**：符合业界通行方案与最佳实践（如 Skills/Commands 的官方规范）。
- **在此基础上**：在「有效传达设计诉求与目的意图」的前提下，做**短说明风格**优化。
- **适用范围**：Commands、Skills、about-lingxi、以及下文列出的灵犀核心文档与配置；**不包含** Rules、AGENTS.md 等非灵犀核心文件。

---

## 二、保持不变的部分（仅确认，无需改）

| 项目                              | 结论                                                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 每轮约定（Hooks）                 | 保持**硬性约定**（先 memory-retrieve → taste-recognition → 有 payload 再 lingxi-memory），不改为「交给模型判断」。  |
| 记忆写入契约                      | **严格执行**：必须先 taste-recognition 产出 7 字段 payload，lingxi-memory 仅接受该 payload；不放宽。                |
| 门控边界                          | **维持现状**（merge/replace 必须确认；new 按 confidence 分流；删除/替换须确认）；尺度由人决定，模型不定义门控尺度。 |
| `.cursor/agents/lingxi-memory.md` | **保留较完整说明**，不改为短说明，以保证行为一致、可审计。                                                          |
| ask-questions **协议**            | **保留**为技术契约（question_id + option id 等），保证门控可程序化；仅在「面向人的说明」上写短。                    |
| Rules / AGENTS.md                 | 不属于灵犀核心文件，**不受**本方案约束。                                                                            |

---

## 三、需要修改的内容与方向

### 1. 核心价值中的 AI Native 表述

**文件**：`about-lingxi/references/core-values.md`（若项目根目录有同主题文档也需对齐）

**修改方向**：

- **原则层**：保持或采用**升维后的**一句（或两句）原则表述（例如「尊重 AI 能力，预留进化空间」；关键决策以人为主、门控保障）。不在原则层把「信任模型、短说明、人为主的门控」当作标题式总结。
- **说明层**：在核心思想、设计原则、实现方式中保留**因果说明**——为何采用短说明（信任模型理解能力→减少干预、节省 token）、为何门控（只有人有真正品味→人为主）。当前与「工程可控」「契约」「降级」「审计」等相关的具体实现细节，可放在同文件靠后段落或 references，注明为「实现细节」。
- 与「心有灵犀」「称心如意」并列时，读起来是「信任 AI + 少量必要约束（门控）」，而不是「全面管控」。

---

### 2. 评价准则中的 AI Native 平衡判据

**文件**：`about-lingxi/references/evaluation-criteria.md`

**修改方向**：

- **方向性原则**：与 core-values 中 AI Native 的**升维后原则**一致（如「尊重 AI 能力，预留进化空间」+ 关键决策以人为主、门控保障），而非把「信任模型、短说明、人为主的门控」三句当作原则本身。
- 判据与检查项可由此展开（例如「是否信任模型」「是否在传达意图前提下采用短说明」「门控是否服务于人」），不限于列举项；可保留 4 维判断器、组件选型表等结构。
- 删除或弱化与「全面工程可控」「处处契约」相冲突的表述，细节放入 references 或实现细节小节。

---

### 3. about-lingxi 的 SKILL.md 与 references 定位

**文件**：`.cursor/skills/about-lingxi/SKILL.md`

**修改方向**：

- **SKILL.md**：改为**短说明**——灵犀是什么、何时使用 about-lingxi、详细内容见 references；场景列表可保留但压缩为简要列表。
- **references**：在 SKILL.md 中明确说明为「需要深度调优 / 设计决策时再读」，不在首屏强调，与称心如意一致。

---

### 4. 所有灵犀核心文件的短说明风格优化

**原则**：先符合最佳实践，再在「有效传达设计诉求与目的意图」前提下做短说明优化。

**建议覆盖范围**（按类型）：

- **Commands**：`.cursor/commands/*.md`（req、plan、build、review、review-req、remember、init 等）
  - 短说明：每条命令一句话目的 + 关键参数/约定 + 委托的 Skill；细节放 references 或 Skill 内。
- **Skills**
  - **Executor / 工具类**（req-executor、plan-executor、build-executor、review-executor、memory-retrieve、taste-recognition、ask-questions、workspace-bootstrap 等）：SKILL.md 短说明（意图 + 输入输出/关键约束 + 少量示例），详细流程/规则进 references。
  - **审查类**（reviewer-doc-consistency、reviewer-security、reviewer-performance、reviewer-e2e）：**不**改为短说明主导；保留**明确检查清单**与必要步骤，仅在人面向的「说明性文字」上可略缩短。
- **about-lingxi**：已见上文（SKILL 短说明 + references 定位）。
- **Hooks**：保持硬约定不变；若存在面向人的说明文字，可做短说明优化，不改变注入内容与顺序。

**不纳入短说明压缩的**：

- `.cursor/agents/lingxi-memory.md`：保留较完整说明。
- reviewer-\* 的检查清单与步骤：保留完整、明确。

---

### 5. ask-questions 的「面向人的说明」写短

**文件**：`.cursor/skills/ask-questions/SKILL.md`（及同 skill 下面向人的说明）

**修改方向**：

- **协议**（question_id、option id、返回格式、校验与重试）：**完全保留**，不缩短。
- **面向人的说明**（何时用、典型场景、对用户的含义）：在保持「有效传达设计意图」的前提下写短，避免冗长叙述。

---

### 6. 其他可能涉及 AI Native 或「工程可控」的文档

**建议检查并统一表述**（不强制改结构，只统一口径）：

- `about-lingxi/references/design-principles.md`：若出现「工程可控」「过度约束」等，改为与 **core-values 中升维后的 AI Native 原则**一致。
- `about-lingxi/references/component-guides.md`：组件选择与 AI Native 的叙述与 core-values、evaluation-criteria 对齐。
- `about-lingxi/references/engineering-practices.md`：若有「AI Native」小节，与升维后的原则及因果说明方向一致；实现细节可保留在 references。
- `about-lingxi/references/optimization-checklist.md`：调优检查清单中与 AI Native 相关的项，改为与升维后的原则一致（如信任模型、门控服务于人、短说明等作为**派生判据**，非原则本身）。
- `about-lingxi/references/memory-system.md`：当前记忆契约与门控已确认不改，仅若有「设计哲学」或「与 AI Native 关系」的表述，可与 core-values 中 AI Native 原则对齐。
- `about-lingxi/references/architecture.md`：若概括到「灵犀设计原则」或「AI Native」，用一两句与 core-values 一致即可。

---

## 四、建议修改清单（便于勾选执行）

| 序号 | 文件/范围                                                                                                 | 修改内容                                                                                       |
| ---- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1    | `about-lingxi/references/core-values.md`                                                                  | AI Native 原则层用升维总结（如保留「尊重 AI 能力，预留进化空间」）；因果与实现细节作为说明。   |
| 2    | `about-lingxi/references/evaluation-criteria.md`                                                          | AI Native 方向性原则与 core-values 升维后原则一致；判据可含信任模型/门控/短说明等派生项。      |
| 3    | `.cursor/skills/about-lingxi/SKILL.md`                                                                    | 短说明 + 明确 references 为「深度调优时再读」。                                                |
| 4    | `.cursor/commands/*.md`                                                                                   | 短说明风格（目的 + 关键约定 + 委托 Skill）。                                                   |
| 5    | Executor/工具类 Skills 的 SKILL.md                                                                        | 短说明（意图 + 关键约束 + 少量示例）；详细进 references。                                      |
| 6    | 审查类 reviewer-\*                                                                                        | 仅缩短「面向人的说明」；检查清单与步骤保留完整。                                               |
| 7    | `.cursor/skills/ask-questions/SKILL.md`                                                                   | 协议保留；面向人的说明写短。                                                                   |
| 8    | `design-principles.md` / `component-guides.md` / `engineering-practices.md` / `optimization-checklist.md` | 其中与 AI Native 或「工程可控」相关的表述，统一到 core-values 升维后的 AI Native 原则。         |
| 9    | `memory-system.md` / `architecture.md`                                                                    | 若有高层次的 AI Native/设计哲学表述，与 core-values 一致。                                     |

---

## 五、执行顺序

- 无固定先后顺序要求；可按清单从上到下执行，也可按「先价值与准则（1–3、8–9），再命令与 Skill（4–7）」分批做。
- 建议**先改 core-values 与 evaluation-criteria**，再改 about-lingxi SKILL 与各 Command/Skill，这样后续文件有一致的表述依据。

如果你愿意，下一步可以选「先做 1+2」或「先做 4+5」，我可以按你选的那几项给出更细的改写示例（仍以建议形式，不直接改文件）。
