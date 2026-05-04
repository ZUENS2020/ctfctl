import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { cleanupRuntimeRoot, makeRuntimeRoot } from "./helpers.js";
import { resolveConfig } from "../src/core/config.js";
import {
  createChallenge,
  createWorkspace,
  ensureRuntime,
  getWorkspace,
  listDockerImageRecords,
  writeJsonFile
} from "../src/core/runtime.js";

const runtimeRoots: string[] = [];

afterEach(async () => {
  await Promise.all(runtimeRoots.splice(0).map(cleanupRuntimeRoot));
});

describe("runtime schema validation", () => {
  it("rejects malformed workspace records", async () => {
    const runtimeRoot = await makeRuntimeRoot();
    runtimeRoots.push(runtimeRoot);
    const paths = await ensureRuntime(await resolveConfig({ CTFCTL_RUNTIME_ROOT: runtimeRoot }));
    const challenge = await createChallenge(paths, {
      name: "schema challenge",
      category: "misc",
      description: "schema test",
      flagFormat: "flag{...}"
    });
    const workspace = await createWorkspace(paths, challenge.id);

    await writeJsonFile(join(paths.workspacesDir, workspace.id, "workspace.json"), {
      ...workspace,
      backend: "local-shell"
    });

    await expect(getWorkspace(paths, workspace.id)).rejects.toMatchObject({
      code: "INVALID_RUNTIME_RECORD"
    });
  });

  it("rejects malformed docker image ledgers", async () => {
    const runtimeRoot = await makeRuntimeRoot();
    runtimeRoots.push(runtimeRoot);
    const paths = await ensureRuntime(await resolveConfig({ CTFCTL_RUNTIME_ROOT: runtimeRoot }));

    await writeJsonFile(join(paths.root, "images.json"), [
      {
        name: 123,
        ensuredAt: "not-a-date"
      }
    ]);

    await expect(listDockerImageRecords(paths)).rejects.toMatchObject({
      code: "INVALID_RUNTIME_RECORD"
    });
  });
});
