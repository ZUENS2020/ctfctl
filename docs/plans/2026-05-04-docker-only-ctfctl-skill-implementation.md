# Docker-Only ctfctl and Codex Skill Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert `ctfctl` to Docker-only execution, validate runtime records with Zod, fix image persistence, remove legacy flat memory helpers, and add a repository Codex bootstrap skill.

**Architecture:** Keep the current thin CLI plus filesystem runtime architecture, but remove the local execution branch and tighten record validation at the runtime boundary. Ship the Codex bootstrap behavior as a repository skill package under `.agents/skills/`.

**Tech Stack:** TypeScript, Commander, Zod, Vitest, Node.js fs APIs

---

### Task 1: Write failing tests for Docker-only runtime and config

**Files:**
- Modify: `tests/config.test.ts`
- Modify: `tests/workspace.test.ts`
- Modify: `tests/exec.test.ts`

**Step 1: Write the failing tests**

- Assert `config show` reports `backend: "docker"` by default.
- Assert `config set backend ...` is rejected as unsupported.
- Assert `workspace create` always produces `backend: "docker"` and non-null container fields.
- Remove local-shell expectations from `exec run` tests and make docker execution the only integration path.

**Step 2: Run targeted tests to verify they fail**

Run: `npm run test:run -- tests/config.test.ts tests/workspace.test.ts tests/exec.test.ts`

Expected: FAIL because the code still supports local-shell and mutable backend config.

### Task 2: Write failing tests for image persistence and schema validation

**Files:**
- Modify: `tests/image.test.ts`
- Add: `tests/schema.test.ts`

**Step 1: Write the failing tests**

- Assert ensuring two images preserves both records.
- Assert re-ensuring an existing image updates only that image record.
- Assert malformed `workspace.json` or `images.json` is rejected through structured runtime validation.

**Step 2: Run targeted tests to verify they fail**

Run: `npm run test:run -- tests/image.test.ts tests/schema.test.ts`

Expected: FAIL because image ensure overwrites the file and runtime reads are not schema-validated.

### Task 3: Write failing tests for legacy memory removal and repository skill package

**Files:**
- Modify: `tests/memory.test.ts`
- Add: `tests/codex-skill.test.ts`

**Step 1: Write the failing tests**

- Keep gccmem CLI behavior tests green.
- Add assertions that the repository skill file exists and contains the required Docker-first bootstrap guidance.

**Step 2: Run targeted tests to verify they fail**

Run: `npm run test:run -- tests/memory.test.ts tests/codex-skill.test.ts`

Expected: FAIL because the repository skill package does not exist yet.

### Task 4: Implement Docker-only config, runtime, exec, image, and schema logic

**Files:**
- Modify: `src/core/config.ts`
- Modify: `src/core/schemas.ts`
- Modify: `src/core/runtime.ts`
- Modify: `src/commands/config.ts`
- Modify: `src/commands/exec.ts`
- Modify: `src/commands/image.ts`

**Step 1: Remove local-shell config and execution paths**

- Make Docker the only backend.
- Remove backend prompts and backend mutation in config commands.
- Simplify `exec run` to always use Docker.

**Step 2: Add runtime validation helpers**

- Validate records before write.
- Parse records with schema on read.
- Validate image list records.

**Step 3: Remove legacy flat memory helpers**

- Delete `MemoryRecord` schema/type and unused flat memory helpers.

**Step 4: Run targeted tests**

Run: `npm run test:run -- tests/config.test.ts tests/workspace.test.ts tests/exec.test.ts tests/image.test.ts tests/schema.test.ts tests/memory.test.ts`

Expected: PASS.

### Task 5: Add repository Codex skill and refresh user-facing docs

**Files:**
- Add: `.agents/skills/ctf-solving-with-ctfctl/SKILL.md`
- Modify: `README.md`
- Modify: `docs/项目总览.md`

**Step 1: Add the skill package**

- Create a concise skill with Docker-first bootstrap instructions.
- Require `ctfctl` as the default control plane.
- Define the zero-extra-prompt startup workflow from description, attachments, and URL.

**Step 2: Update current docs**

- Remove `local-shell` from the current README and project overview.
- Document the bootstrap skill location and behavior.

**Step 3: Run targeted tests**

Run: `npm run test:run -- tests/codex-skill.test.ts`

Expected: PASS.

### Task 6: Full verification

**Files:**
- No code changes expected

**Step 1: Run the full suite**

Run: `npm run test:run`

Expected: PASS with zero failing tests.

**Step 2: Review the diff**

Run: `git diff -- src tests docs README.md .agents`

Expected: Changes are limited to Docker-only runtime, validation, docs, and the skill package.
