# Docker-Only ctfctl and Codex Bootstrap Skill Design

## Goal

Make `ctfctl` Docker-only, harden runtime schema validation, fix Docker image record handling, remove legacy flat memory helpers, and ship a repository Codex skill that can start solving from only challenge description, attachments, and URL.

## Decisions

### Runtime and CLI

- Remove `local-shell` support completely.
- Keep `workspace.backend` in the JSON protocol, but constrain it to the literal value `"docker"`.
- Keep `workspace destroy` as a status change only. It will not delete filesystem data or containers.
- Keep Docker as the only execution path for `exec run`.

### Configuration

- `backend` is no longer configurable.
- Supported config keys become:
  - `runtimeRoot`
  - `docker.image`
  - `docker.workdir`
- Config resolution order becomes `env -> stored config -> defaults`.
- `config show` may still include `backend: "docker"` as runtime metadata.

### Schema Enforcement

- Runtime records must be validated with Zod when written and when read back.
- Malformed runtime records should fail fast with a structured CLI error instead of being silently accepted.
- `images.json` gains a dedicated schema and is treated as a validated runtime record.
- The old flat `MemoryRecord` helpers are removed. Only gccmem branch/commit/merge records remain.

### Docker Image Records

- `image ensure` must upsert by image name instead of overwriting the full file with one record.
- Re-ensuring an existing image refreshes `ensuredAt`.
- `image list` returns the full validated list in stable name order.

### Codex Skill Package

- Add a real repository skill at `.agents/skills/ctf-solving-with-ctfctl/SKILL.md`.
- The skill must treat `ctfctl` as the default control plane.
- It must let Codex start from only:
  - challenge description
  - attachments
  - target URL
- The skill should direct Codex to:
  - infer initial metadata instead of asking follow-up questions unless blocked
  - initialize challenge/workspace/artifacts/evidence
  - ensure the configured Docker image
  - run first-pass reconnaissance automatically
  - continue solving until flag or explicit blocker

## Non-Goals

- No full container lifecycle manager beyond the current `docker run --rm` execution model.
- No removal of historical design docs under `docs/superpowers/`.
- No automatic publishing system for runtime `skill` records; the new Codex skill is a repository asset, not a `ctfctl skill register` entry.

## Verification Strategy

- Update tests first to reflect Docker-only behavior and config precedence.
- Add failing tests for image upsert behavior and runtime schema validation.
- Add a smoke test for the repository Codex skill package.
- Run the full test suite after implementation.
