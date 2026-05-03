import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { cleanupRuntimeRoot, makeRuntimeRoot } from "./helpers.js";
import { runCli } from "../src/cli.js";

const runtimeRoots: string[] = [];
const dockerDaemonAvailable = spawnSync("docker", ["info"], { stdio: "ignore" }).status === 0;

afterEach(async () => {
  await Promise.all(runtimeRoots.splice(0).map(cleanupRuntimeRoot));
});

describe("exec run", () => {
  it("runs a command in the workspace and returns stdout, stderr, exitCode", async () => {
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
            CTFCTL_RUNTIME_ROOT: runtimeRoot,
            CTFCTL_BACKEND: "local-shell"
          }
        )
      ).stdout
    ).data.challenge;

    const workspace = JSON.parse(
      (
        await runCli(["workspace", "create", "--challenge", challenge.id], {
          CTFCTL_RUNTIME_ROOT: runtimeRoot,
          CTFCTL_BACKEND: "local-shell"
        })
      ).stdout
    ).data.workspace;

    const result = await runCli(
      ["exec", "run", "--workspace", workspace.id, "--cmd", "printf hello", "--reason", "smoke test"],
      {
        CTFCTL_RUNTIME_ROOT: runtimeRoot,
        CTFCTL_BACKEND: "local-shell"
      }
    );

    expect(result.exitCode).toBe(0);

    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.meta.command).toBe("exec run");
    expect(parsed.data.backend).toBe("local-shell");
    expect(parsed.data.command).toBe("printf hello");
    expect(parsed.data.reason).toBe("smoke test");
    expect(parsed.data.stdout).toBe("hello");
    expect(parsed.data.stderr).toBe("");
    expect(parsed.data.exitCode).toBe(0);
  });

  it("returns a structured error when the workspace is missing", async () => {
    const runtimeRoot = await makeRuntimeRoot();
    runtimeRoots.push(runtimeRoot);

    const result = await runCli(
      ["exec", "run", "--workspace", "ws-missing", "--cmd", "printf hello", "--reason", "smoke test"],
      {
        CTFCTL_RUNTIME_ROOT: runtimeRoot,
        CTFCTL_BACKEND: "local-shell"
      }
    );

    expect(result.exitCode).toBe(1);

    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.meta.command).toBe("exec run");
    expect(parsed.error.code).toBe("WORKSPACE_NOT_FOUND");
    expect(parsed.error.message).toContain("ws-missing");
  });

  it.skipIf(!dockerDaemonAvailable)("runs a command through docker for docker-backed workspaces", async () => {
    const runtimeRoot = await makeRuntimeRoot();
    runtimeRoots.push(runtimeRoot);

    const challenge = JSON.parse(
      (
        await runCli(
          [
            "challenge",
            "init",
            "--name",
            "docker challenge",
            "--category",
            "reverse",
            "--description",
            "run in docker",
            "--flag-format",
            "flag{...}"
          ],
          {
            CTFCTL_RUNTIME_ROOT: runtimeRoot,
            CTFCTL_BACKEND: "docker",
            CTFCTL_DOCKER_IMAGE: "alpine:3.20"
          }
        )
      ).stdout
    ).data.challenge;

    const workspace = JSON.parse(
      (
        await runCli(["workspace", "create", "--challenge", challenge.id], {
          CTFCTL_RUNTIME_ROOT: runtimeRoot,
          CTFCTL_BACKEND: "docker",
          CTFCTL_DOCKER_IMAGE: "alpine:3.20"
        })
      ).stdout
    ).data.workspace;

    const result = await runCli(
      ["exec", "run", "--workspace", workspace.id, "--cmd", "printf hello-from-docker", "--reason", "docker smoke test"],
      {
        CTFCTL_RUNTIME_ROOT: runtimeRoot,
        CTFCTL_BACKEND: "docker",
        CTFCTL_DOCKER_IMAGE: "alpine:3.20"
      }
    );

    expect(result.exitCode).toBe(0);

    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.backend).toBe("docker");
    expect(parsed.data.image).toBe("alpine:3.20");
    expect(parsed.data.stdout).toBe("hello-from-docker");
  });
});
