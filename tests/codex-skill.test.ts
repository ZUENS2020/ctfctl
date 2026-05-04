import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { describe, expect, it } from "vitest";

const skillPath = ".agents/skills/ctf-solving-with-ctfctl/SKILL.md";

describe("repository Codex bootstrap skill", () => {
  it("ships a ctfctl-first bootstrap skill for zero-prompt challenge startup", async () => {
    await access(skillPath, constants.F_OK);
    const body = await readFile(skillPath, "utf8");

    expect(body).toContain("ctfctl");
    expect(body).toContain("challenge init");
    expect(body).toContain("workspace create");
    expect(body).toContain("artifact add");
    expect(body).toContain("image ensure");
    expect(body).toContain("description");
    expect(body).toContain("attachments");
    expect(body).toContain("URL");
  });
});
