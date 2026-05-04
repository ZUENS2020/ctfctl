import { afterEach, describe, expect, it } from "vitest";
import { cleanupRuntimeRoot, makeRuntimeRoot } from "./helpers.js";
import { runCli } from "../src/cli.js";

const runtimeRoots: string[] = [];

afterEach(async () => {
  await Promise.all(runtimeRoots.splice(0).map(cleanupRuntimeRoot));
});

describe("workspace create", () => {
  it("creates a docker workspace and returns JSON with workspace path", async () => {
    const runtimeRoot = await makeRuntimeRoot();
    runtimeRoots.push(runtimeRoot);

    const challengeResult = await runCli(
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
        CTFCTL_RUNTIME_ROOT: runtimeRoot,
        CTFCTL_DOCKER_IMAGE: "alpine:3.20"
      }
    );

    const challenge = JSON.parse(challengeResult.stdout).data.challenge;
    const result = await runCli(["workspace", "create", "--challenge", challenge.id], {
      CTFCTL_RUNTIME_ROOT: runtimeRoot,
      CTFCTL_DOCKER_IMAGE: "alpine:3.20"
    });

    expect(result.exitCode).toBe(0);

    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.meta.command).toBe("workspace create");
    expect(parsed.data.workspace.id).toMatch(/^ws-/);
    expect(parsed.data.workspace.challengeId).toBe(challenge.id);
    expect(parsed.data.workspace.path).toContain(parsed.data.workspace.id);
    expect(parsed.data.workspace.backend).toBe("docker");
    expect(parsed.data.workspace.status).toBe("ready");
    expect(parsed.data.workspace.containerImage).toBe("alpine:3.20");
    expect(parsed.data.workspace.containerWorkdir).toBe("/workspace");
    expect(parsed.data.workspace.containerName).toMatch(/^ctfctl-ws-/);
  });

  it("destroys a workspace through the cli", async () => {
    const runtimeRoot = await makeRuntimeRoot();
    runtimeRoots.push(runtimeRoot);

    const challenge = JSON.parse(
      (
        await runCli(
          [
            "challenge",
            "init",
            "--name",
            "destroy challenge",
            "--category",
            "reverse",
            "--description",
            "destroy workspace",
            "--flag-format",
            "flag{...}"
          ],
          {
            CTFCTL_RUNTIME_ROOT: runtimeRoot,
            CTFCTL_DOCKER_IMAGE: "alpine:3.20"
          }
        )
      ).stdout
    ).data.challenge;

    const workspace = JSON.parse(
      (
        await runCli(["workspace", "create", "--challenge", challenge.id], {
          CTFCTL_RUNTIME_ROOT: runtimeRoot,
          CTFCTL_DOCKER_IMAGE: "alpine:3.20"
        })
      ).stdout
    ).data.workspace;

    const destroyResult = await runCli(["workspace", "destroy", "--workspace", workspace.id], {
      CTFCTL_RUNTIME_ROOT: runtimeRoot,
      CTFCTL_DOCKER_IMAGE: "alpine:3.20"
    });

    expect(destroyResult.exitCode).toBe(0);
    expect(JSON.parse(destroyResult.stdout).data.workspace.status).toBe("destroyed");
  });
});
