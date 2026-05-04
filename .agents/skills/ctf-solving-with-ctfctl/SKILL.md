---
name: ctf-solving-with-ctfctl
description: Use when a user provides a CTF challenge description, attachments, or a target URL and wants solving to start immediately through this repository's ctfctl workflow.
---

# CTF Solving With ctfctl

## Overview

Treat `ctfctl` as the default control plane. If the user already gave a description, attachments, or a URL, do not ask for extra prompting or a plan before starting. Infer reasonable defaults and begin.

## Startup Rules

1. Infer initial metadata:
- Name: short label from the title, description, or URL host
- Category: infer from context; fall back to `misc`
- Flag format: use the explicit format if present, otherwise `flag{...}`

2. Initialize the runtime:

```bash
ctfctl image ensure --image kali/rolling
ctfctl challenge init --name "<name>" --category "<category>" --description "<description>" --flag-format 'flag{...}'
ctfctl workspace create --challenge <challenge-id>
ctfctl memory branch create --challenge <challenge-id> --name main
```

3. For each attachment with a local path, import it:

```bash
ctfctl artifact add --challenge <challenge-id> --file <path>
```

4. Record the user-provided description, URL, and attachment summary as early `evidence note` entries.

## Reconnaissance

Use `ctfctl exec run` as the default executor.

- If the challenge is web or a URL is present, start with `curl -iL`, response body inspection, header inspection, and basic path discovery.
- If the challenge is reverse, pwn, forensics, or misc with files, start with `file`, `sha256sum`, `strings`, `checksec`, `binwalk`, `7z l`, `xxd`, or other high-signal triage commands.
- If the challenge type is unclear, do generic file and network reconnaissance first instead of asking the user for more prompt engineering.

Always attach a concrete `--reason` to each `exec run` invocation.

## Solve Loop

- Keep using `ctfctl exec run` for commands by default.
- When you confirm a fact, record it with `ctfctl evidence note`.
- When a path becomes validated, save it with `ctfctl memory commit create`.
- When you produce a useful derived file, exploit script, decoded output, or write-up, add it with `ctfctl artifact add`.
- Continue until you recover a flag or hit a real blocker such as missing access, broken upstream service, or missing attachments.

## Questions

Only ask follow-up questions when progress is actually blocked. Missing prompt polish is not a blocker. The normal expectation is: description + attachments + URL is enough to start immediately.
