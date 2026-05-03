import { afterEach, describe, expect, it } from "vitest";
import { cleanupRuntimeRoot, makeRuntimeRoot } from "./helpers.js";
import { runCli } from "../src/cli.js";

const runtimeRoots: string[] = [];

afterEach(async () => {
  await Promise.all(runtimeRoots.splice(0).map(cleanupRuntimeRoot));
});

describe("verify flag", () => {
  it("verifies a flag candidate against the declared format", async () => {
    const runtimeRoot = await makeRuntimeRoot();
    runtimeRoots.push(runtimeRoot);

    const challenge = JSON.parse(
      (
        await runCli(
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
        )
      ).stdout
    ).data.challenge;

    const result = await runCli(["verify", "flag", "--challenge", challenge.id, "--value", "flag{demo}"], {
      CTFCTL_RUNTIME_ROOT: runtimeRoot
    });

    expect(result.exitCode).toBe(0);

    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.meta.command).toBe("verify flag");
    expect(parsed.data.valid).toBe(true);
    expect(parsed.data.value).toBe("flag{demo}");
  });
});
