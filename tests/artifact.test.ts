import { afterEach, describe, expect, it } from "vitest";
import { cleanupRuntimeRoot, makeRuntimeRoot, makeTempFile } from "./helpers.js";
import { resolveConfig } from "../src/core/config.js";
import { createArtifact, createChallenge, ensureRuntime, listArtifactsByChallenge } from "../src/core/runtime.js";
import { runCli } from "../src/cli.js";

const runtimeRoots: string[] = [];

afterEach(async () => {
  await Promise.all(runtimeRoots.splice(0).map(cleanupRuntimeRoot));
});

describe("artifact core model", () => {
  it("stores sha256, source, derivedFrom and workspace fields", async () => {
    const runtimeRoot = await makeRuntimeRoot();
    runtimeRoots.push(runtimeRoot);

    const paths = await ensureRuntime(
      await resolveConfig({
        CTFCTL_RUNTIME_ROOT: runtimeRoot
      })
    );
    const challenge = await createChallenge(paths, {
      name: "artifact challenge",
      category: "forensics",
      description: "artifact test",
      flagFormat: "flag{...}"
    });
    const filePath = await makeTempFile("artifact-data", "artifact.txt");

    const artifact = await createArtifact(paths, {
      challengeId: challenge.id,
      workspaceId: null,
      filePath,
      source: "user_upload",
      derivedFrom: null
    });

    expect(artifact.id).toMatch(/^art-/);
    expect(artifact.challengeId).toBe(challenge.id);
    expect(artifact.workspaceId).toBeNull();
    expect(artifact.source).toBe("user_upload");
    expect(artifact.derivedFrom).toBeNull();
    expect(artifact.sha256).toHaveLength(64);
  });

  it("indexes artifacts by challenge", async () => {
    const runtimeRoot = await makeRuntimeRoot();
    runtimeRoots.push(runtimeRoot);

    const paths = await ensureRuntime(
      await resolveConfig({
        CTFCTL_RUNTIME_ROOT: runtimeRoot
      })
    );
    const challenge = await createChallenge(paths, {
      name: "artifact challenge",
      category: "forensics",
      description: "artifact test",
      flagFormat: "flag{...}"
    });
    const filePath = await makeTempFile("artifact-data", "artifact.txt");

    await createArtifact(paths, {
      challengeId: challenge.id,
      workspaceId: null,
      filePath,
      source: "user_upload",
      derivedFrom: null
    });

    const artifacts = await listArtifactsByChallenge(paths, challenge.id);
    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].challengeId).toBe(challenge.id);
  });

  it("adds and lists artifacts through the cli", async () => {
    const runtimeRoot = await makeRuntimeRoot();
    runtimeRoots.push(runtimeRoot);

    const challengeResult = await runCli(
      [
        "challenge",
        "init",
        "--name",
        "artifact challenge",
        "--category",
        "forensics",
        "--description",
        "artifact cli",
        "--flag-format",
        "flag{...}"
      ],
      {
        CTFCTL_RUNTIME_ROOT: runtimeRoot
      }
    );

    const challenge = JSON.parse(challengeResult.stdout).data.challenge;
    const filePath = await makeTempFile("artifact-cli", "cli.txt");

    const addResult = await runCli(["artifact", "add", "--challenge", challenge.id, "--file", filePath], {
      CTFCTL_RUNTIME_ROOT: runtimeRoot
    });

    expect(addResult.exitCode).toBe(0);
    expect(JSON.parse(addResult.stdout).data.artifact.id).toMatch(/^art-/);

    const listResult = await runCli(["artifact", "list", "--challenge", challenge.id], {
      CTFCTL_RUNTIME_ROOT: runtimeRoot
    });

    expect(listResult.exitCode).toBe(0);
    const parsed = JSON.parse(listResult.stdout);
    expect(parsed.data.artifacts).toHaveLength(1);
    expect(parsed.data.artifacts[0].filename).toBe("cli.txt");
  });
});
