import { afterEach, describe, expect, it } from "vitest";
import { cleanupRuntimeRoot, makeRuntimeRoot } from "./helpers.js";
import { runCli } from "../src/cli.js";

const runtimeRoots: string[] = [];

afterEach(async () => {
  await Promise.all(runtimeRoots.splice(0).map(cleanupRuntimeRoot));
});

describe("challenge init", () => {
  it("initializes a challenge and returns JSON with challenge id", async () => {
    const runtimeRoot = await makeRuntimeRoot();
    runtimeRoots.push(runtimeRoot);

    const result = await runCli(
      [
        "challenge",
        "init",
        "--name",
        "local music",
        "--category",
        "reverse",
        "--description",
        "recover the song",
        "--flag-format",
        "flag{...}"
      ],
      {
        CTFCTL_RUNTIME_ROOT: runtimeRoot
      }
    );

    expect(result.exitCode).toBe(0);

    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.meta.schemaVersion).toBe("1");
    expect(parsed.meta.command).toBe("challenge init");
    expect(parsed.data.challenge.id).toMatch(/^ch-/);
    expect(parsed.data.challenge.name).toBe("local music");
    expect(parsed.data.challenge.category).toBe("reverse");
  });
});
