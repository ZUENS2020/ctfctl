import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { cleanupRuntimeRoot, makeRuntimeRoot } from "./helpers.js";
import { runCli } from "../src/cli.js";

const runtimeRoots: string[] = [];
const dockerDaemonAvailable = spawnSync("docker", ["info"], { stdio: "ignore" }).status === 0;

afterEach(async () => {
  await Promise.all(runtimeRoots.splice(0).map(cleanupRuntimeRoot));
});

describe("image commands", () => {
  it.skipIf(!dockerDaemonAvailable)("ensures and lists docker images", async () => {
    const runtimeRoot = await makeRuntimeRoot();
    runtimeRoots.push(runtimeRoot);

    const ensureResult = await runCli(["image", "ensure", "--image", "alpine:3.20"], {
      CTFCTL_RUNTIME_ROOT: runtimeRoot,
      CTFCTL_BACKEND: "docker",
      CTFCTL_DOCKER_IMAGE: "alpine:3.20"
    });

    expect(ensureResult.exitCode).toBe(0);
    expect(JSON.parse(ensureResult.stdout).data.image.name).toBe("alpine:3.20");

    const listResult = await runCli(["image", "list"], {
      CTFCTL_RUNTIME_ROOT: runtimeRoot,
      CTFCTL_BACKEND: "docker",
      CTFCTL_DOCKER_IMAGE: "alpine:3.20"
    });

    expect(listResult.exitCode).toBe(0);
    expect(JSON.parse(listResult.stdout).data.images.length).toBeGreaterThan(0);
  });
});
