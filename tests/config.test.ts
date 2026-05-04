import { afterEach, describe, expect, it } from "vitest";
import { join, resolve } from "node:path";
import { cleanupRuntimeRoot, makeRuntimeRoot } from "./helpers.js";
import { runCli } from "../src/cli.js";
import { materializeConfig } from "../src/core/config.js";

const runtimeRoots: string[] = [];

afterEach(async () => {
  await Promise.all(runtimeRoots.splice(0).map(cleanupRuntimeRoot));
});

describe("config commands", () => {
  it("defaults runtimeRoot to the current working directory when unset", () => {
    const config = materializeConfig({}, {});

    expect(config.runtimeRoot).toBe(resolve(process.cwd(), ".ctfctl-runtime"));
  });

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

  it("sets, gets and unsets supported config values through the cli", async () => {
    const runtimeRoot = await makeRuntimeRoot();
    runtimeRoots.push(runtimeRoot);
    const env = {
      CTFCTL_CONFIG_HOME: runtimeRoot
    };

    const customRuntimeRoot = join(runtimeRoot, "custom-runtime");

    const setRuntimeRoot = await runCli(["config", "set", "runtimeRoot", customRuntimeRoot], env);
    expect(setRuntimeRoot.exitCode).toBe(0);

    const setImage = await runCli(["config", "set", "docker.image", "alpine:3.20"], env);
    expect(setImage.exitCode).toBe(0);

    const getRuntimeRoot = await runCli(["config", "get", "runtimeRoot"], env);
    expect(getRuntimeRoot.exitCode).toBe(0);
    expect(JSON.parse(getRuntimeRoot.stdout).data.value).toBe(customRuntimeRoot);

    const unsetImage = await runCli(["config", "unset", "docker.image"], env);
    expect(unsetImage.exitCode).toBe(0);

    const show = await runCli(["config", "show"], env);
    const parsed = JSON.parse(show.stdout);
    expect(parsed.data.config.backend).toBe("docker");
    expect(parsed.data.config.runtimeRoot).toBe(customRuntimeRoot);
    expect(parsed.data.config.dockerImage).toBe("kali/rolling");
  });

  it("rejects backend mutation because docker is the only supported backend", async () => {
    const runtimeRoot = await makeRuntimeRoot();
    runtimeRoots.push(runtimeRoot);
    const env = {
      CTFCTL_RUNTIME_ROOT: runtimeRoot,
      CTFCTL_CONFIG_HOME: runtimeRoot
    };

    const result = await runCli(["config", "set", "backend", "local-shell"], env);

    expect(result.exitCode).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe("INVALID_CONFIG_KEY");
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
        join(runtimeRoot, "runtime-home"),
        "kali/rolling",
        "/workspace"
      ]
    });

    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.data.config.runtimeRoot).toBe(join(runtimeRoot, "runtime-home"));
    expect(parsed.data.config.backend).toBe("docker");
    expect(parsed.data.config.dockerImage).toBe("kali/rolling");
  });
});
