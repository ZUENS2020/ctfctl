import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { cleanupRuntimeRoot, makeRuntimeRoot } from "./helpers.js";
import { runCli } from "../src/cli.js";
import { ensureDockerImageRecord, ensureRuntime, listDockerImageRecords } from "../src/core/runtime.js";
import { resolveConfig } from "../src/core/config.js";

const runtimeRoots: string[] = [];
const dockerDaemonAvailable = spawnSync("docker", ["info"], { stdio: "ignore" }).status === 0;

afterEach(async () => {
  await Promise.all(runtimeRoots.splice(0).map(cleanupRuntimeRoot));
});

describe("image commands", () => {
  it("stores multiple ensured images without overwriting previous records", async () => {
    const runtimeRoot = await makeRuntimeRoot();
    runtimeRoots.push(runtimeRoot);
    const paths = await ensureRuntime(await resolveConfig({ CTFCTL_RUNTIME_ROOT: runtimeRoot }));

    await ensureDockerImageRecord(paths, "alpine:3.20");
    await ensureDockerImageRecord(paths, "kali/rolling");

    const images = await listDockerImageRecords(paths);

    expect(images).toHaveLength(2);
    expect(images.map((image) => image.name)).toEqual(["alpine:3.20", "kali/rolling"]);
  });

  it("upserts an ensured image by name instead of duplicating it", async () => {
    const runtimeRoot = await makeRuntimeRoot();
    runtimeRoots.push(runtimeRoot);
    const paths = await ensureRuntime(await resolveConfig({ CTFCTL_RUNTIME_ROOT: runtimeRoot }));

    const first = await ensureDockerImageRecord(paths, "alpine:3.20");
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await ensureDockerImageRecord(paths, "alpine:3.20");

    const images = await listDockerImageRecords(paths);

    expect(images).toHaveLength(1);
    expect(images[0].name).toBe("alpine:3.20");
    expect(first.ensuredAt).not.toBe(second.ensuredAt);
    expect(images[0].ensuredAt).toBe(second.ensuredAt);
  });

  it.skipIf(!dockerDaemonAvailable)("ensures and lists docker images", async () => {
    const runtimeRoot = await makeRuntimeRoot();
    runtimeRoots.push(runtimeRoot);

    const ensureResult = await runCli(["image", "ensure", "--image", "alpine:3.20"], {
      CTFCTL_RUNTIME_ROOT: runtimeRoot,
      CTFCTL_DOCKER_IMAGE: "alpine:3.20"
    });

    expect(ensureResult.exitCode).toBe(0);
    expect(JSON.parse(ensureResult.stdout).data.image.name).toBe("alpine:3.20");

    const listResult = await runCli(["image", "list"], {
      CTFCTL_RUNTIME_ROOT: runtimeRoot,
      CTFCTL_DOCKER_IMAGE: "alpine:3.20"
    });

    expect(listResult.exitCode).toBe(0);
    expect(JSON.parse(listResult.stdout).data.images.length).toBeGreaterThan(0);
  });
});
