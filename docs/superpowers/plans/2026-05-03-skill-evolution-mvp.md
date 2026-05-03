# skills 自进化系统 MVP 实施计划

> **给执行型 agent 的说明：** 实施此计划时，建议逐任务推进，并用复选框跟踪状态。

**目标：** 为 `ctfctl` 增加一套结构化的 skills 系统，包括 skill registry、trace 记录、evaluator 打分、proposal 生成与查询，为后续半自动或自动演化打基础。

**架构：** skill 不是纯 prompt，而是结构化对象。每次运行 skill 都生成 trace；trace 经过 evaluator 生成评分与洞察；proposal 从 trace 和评分中提炼出新版本建议，但不会直接覆盖已有 skill。所有数据都写入 runtime，保持可审计和可回放。

**技术栈：** TypeScript、Commander、Zod、Vitest、Node.js 文件系统 API

---

## 实施阶段图

```mermaid
flowchart LR
    T1["Task 1\n冻结 skill 数据模型"] --> T2["Task 2\nskill registry"]
    T2 --> T3["Task 3\ntrace 记录"]
    T3 --> T4["Task 4\nevaluator 与 proposal"]
    T4 --> T5["Task 5\n文档与全量验证"]
```

## 文件结构

**Create**
- `src/commands/skill.ts`
- `src/core/skills.ts`
- `tests/skill.test.ts`

**Modify**
- `src/core/runtime.ts`
- `src/core/schemas.ts`
- `src/cli.ts`
- `README.md`
- `docs/项目总览.md`

## Task 1: 冻结 skill 数据模型

**Files:**
- Modify: `src/core/schemas.ts`
- Modify: `src/core/runtime.ts`
- Test: `tests/skill.test.ts`

- [ ] **Step 1: 写失败测试**

测试用例：

```ts
it("创建 skill 记录并保存版本、适用范围、workflow");
it("记录 trace 并关联 skill 版本");
it("生成 evaluation 与 proposal 记录");
```

- [ ] **Step 2: 运行测试并确认失败**

Run:

```bash
npm test -- tests/skill.test.ts
```

- [ ] **Step 3: 实现最小数据模型**

实现要求：

- `SkillRecord`
- `SkillTraceRecord`
- `SkillEvaluationRecord`
- `SkillProposalRecord`
- `RuntimePaths` 增加 `skills/`、`skill-traces/`、`skill-evaluations/`、`skill-proposals/`

- [ ] **Step 4: 重新运行测试**

Run:

```bash
npm test -- tests/skill.test.ts
```

Expected: PASS。

## Task 2: 实现 skill registry

**Files:**
- Create: `src/core/skills.ts`
- Create: `src/commands/skill.ts`
- Test: `tests/skill.test.ts`

- [ ] **Step 1: 写失败测试**

测试用例：

```ts
it("通过 cli 注册 skill 并列出 skill");
it("支持按 id 查看 skill");
```

- [ ] **Step 2: 运行测试并确认失败**

Run:

```bash
npm test -- tests/skill.test.ts
```

- [ ] **Step 3: 实现 registry 与命令**

实现要求：

- `skill register`
- `skill list`
- `skill show`

- [ ] **Step 4: 重新运行测试**

Run:

```bash
npm test -- tests/skill.test.ts
```

Expected: PASS。

## Task 3: 实现 trace 记录

**Files:**
- Create: `src/core/skills.ts`
- Modify: `src/commands/skill.ts`
- Test: `tests/skill.test.ts`

- [ ] **Step 1: 写失败测试**

测试用例：

```ts
it("记录一次 skill trace，包括 challenge、结果、命令数与 flag 状态");
it("支持列出指定 skill 的 traces");
```

- [ ] **Step 2: 运行测试并确认失败**

Run:

```bash
npm test -- tests/skill.test.ts
```

- [ ] **Step 3: 实现 trace 命令**

实现要求：

- `skill trace record`
- `skill trace list`

- [ ] **Step 4: 重新运行测试**

Run:

```bash
npm test -- tests/skill.test.ts
```

Expected: PASS。

## Task 4: 实现 evaluator 与 proposal

**Files:**
- Create: `src/core/skills.ts`
- Modify: `src/commands/skill.ts`
- Test: `tests/skill.test.ts`

- [ ] **Step 1: 写失败测试**

测试用例：

```ts
it("根据 trace 生成 evaluation 分数与洞察");
it("根据 evaluation 生成 proposal");
it("proposal 引用 parent skill 和 source trace");
```

- [ ] **Step 2: 运行测试并确认失败**

Run:

```bash
npm test -- tests/skill.test.ts
```

- [ ] **Step 3: 实现 evaluator 与 proposal 命令**

实现要求：

- `skill evaluate`
- `skill propose`
- `skill proposal list`

- [ ] **Step 4: 重新运行测试**

Run:

```bash
npm test -- tests/skill.test.ts
```

Expected: PASS。

## Task 5: 文档与全量验证

**Files:**
- Modify: `README.md`
- Modify: `docs/项目总览.md`

- [ ] **Step 1: 更新中文文档**

补充：

- skills 系统定位
- 自进化流程
- 命令说明
- mermaid 图

- [ ] **Step 2: 运行全量测试与构建**

Run:

```bash
npm test
npm run build
```

Expected: 全部通过。
