import { afterEach, describe, expect, it } from "vitest";
import { cleanupRuntimeRoot, makeRuntimeRoot } from "./helpers.js";
import { runCli } from "../src/cli.js";

const runtimeRoots: string[] = [];

afterEach(async () => {
  await Promise.all(runtimeRoots.splice(0).map(cleanupRuntimeRoot));
});

describe("config commands", () => {
  it("shows docker+kali defaults when no config file exists", async () => {
    const runtimeRoot = await makeRuntimeRoot();
    runtimeRoots.push(runtimeRoot);

    const result = await runCli(["config", "show"], {
      CTFCTL_RUNTIME_ROOT: runtimeRoot,
      CTFCTL_CONFIG_HOME: runtimeRoot
    });

    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.data.config.backend).toBe("docker");
    expect(parsed.data.config.dockerImage).toBe("kali/rolling");
    expect(parsed.data.config.dockerWorkdir).toBe("/workspace");
  });

  it("sets, gets and unsets config values through the cli", async () => {
    const runtimeRoot = await makeRuntimeRoot();
    runtimeRoots.push(runtimeRoot);
    const env = {
      CTFCTL_RUNTIME_ROOT: runtimeRoot,
      CTFCTL_CONFIG_HOME: runtimeRoot
    };

    const setBackend = await runCli(["config", "set", "backend", "local-shell"], env);
    expect(setBackend.exitCode).toBe(0);

    const setImage = await runCli(["config", "set", "docker.image", "alpine:3.20"], env);
    expect(setImage.exitCode).toBe(0);

    const getBackend = await runCli(["config", "get", "backend"], env);
    expect(getBackend.exitCode).toBe(0);
    expect(JSON.parse(getBackend.stdout).data.value).toBe("local-shell");

    const unsetImage = await runCli(["config", "unset", "docker.image"], env);
    expect(unsetImage.exitCode).toBe(0);

    const show = await runCli(["config", "show"], env);
    const parsed = JSON.parse(show.stdout);
    expect(parsed.data.config.backend).toBe("local-shell");
    expect(parsed.data.config.dockerImage).toBe("kali/rolling");
  });

  it("runs interactive setup and writes config", async () => {
    const runtimeRoot = await makeRuntimeRoot();
    runtimeRoots.push(runtimeRoot);
    const env = {
      CTFCTL_RUNTIME_ROOT: runtimeRoot,
      CTFCTL_CONFIG_HOME: runtimeRoot
    };

    const result = await runCli(["setup"], env, {
      prompt: async () => [
        `${runtimeRoot}/runtime-home`,
        "docker",
        "kali/rolling",
        "/workspace"
      ]
    });

    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.data.config.runtimeRoot).toBe(`${runtimeRoot}/runtime-home`);
    expect(parsed.data.config.backend).toBe("docker");
    expect(parsed.data.config.dockerImage).toBe("kali/rolling");
  });
});
