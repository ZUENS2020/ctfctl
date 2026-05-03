import { afterEach, describe, expect, it } from "vitest";
import { cleanupRuntimeRoot, makeRuntimeRoot } from "./helpers.js";
import { runCli } from "../src/cli.js";

const runtimeRoots: string[] = [];

afterEach(async () => {
  await Promise.all(runtimeRoots.splice(0).map(cleanupRuntimeRoot));
});

describe("evidence note", () => {
  it("stores an evidence note under the challenge ledger", async () => {
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

    const result = await runCli(
      ["evidence", "note", "--challenge", challenge.id, "--kind", "fact", "--text", "header looks encrypted"],
      {
        CTFCTL_RUNTIME_ROOT: runtimeRoot
      }
    );

    expect(result.exitCode).toBe(0);

    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.meta.command).toBe("evidence note");
    expect(parsed.data.entry.challengeId).toBe(challenge.id);
    expect(parsed.data.entry.kind).toBe("fact");
    expect(parsed.data.entry.text).toBe("header looks encrypted");
  });
});
