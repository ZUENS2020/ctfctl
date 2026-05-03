import { afterEach, describe, expect, it } from "vitest";
import { cleanupRuntimeRoot, makeRuntimeRoot } from "./helpers.js";
import { resolveConfig } from "../src/core/config.js";
import {
  createChallenge,
  createMemoryBranch,
  createMemoryCommit,
  createMemoryMerge,
  ensureRuntime
} from "../src/core/runtime.js";

const runtimeRoots: string[] = [];

afterEach(async () => {
  await Promise.all(runtimeRoots.splice(0).map(cleanupRuntimeRoot));
});

describe("gccmem core model", () => {
  it("creates branches, commits and merges with stable references", async () => {
    const runtimeRoot = await makeRuntimeRoot();
    runtimeRoots.push(runtimeRoot);

    const paths = await ensureRuntime(
      await resolveConfig({
        CTFCTL_RUNTIME_ROOT: runtimeRoot
      })
    );
    const challenge = await createChallenge(paths, {
      name: "memory challenge",
      category: "reverse",
      description: "memory test",
      flagFormat: "flag{...}"
    });

    const mainBranch = await createMemoryBranch(paths, {
      challengeId: challenge.id,
      name: "main",
      parentBranchId: null
    });
    const commit = await createMemoryCommit(paths, {
      branchId: mainBranch.id,
      challengeId: challenge.id,
      message: "initial facts",
      facts: ["binary is packed"],
      hypotheses: ["upx may be involved"],
      artifactIds: [],
      evidenceIds: []
    });
    const altBranch = await createMemoryBranch(paths, {
      challengeId: challenge.id,
      name: "alt-path",
      parentBranchId: mainBranch.id
    });
    const merge = await createMemoryMerge(paths, {
      challengeId: challenge.id,
      sourceBranchId: altBranch.id,
      targetBranchId: mainBranch.id,
      resultCommitId: commit.id,
      summary: "merge validated path"
    });

    expect(mainBranch.headCommitId).toBeNull();
    expect(commit.branchId).toBe(mainBranch.id);
    expect(commit.parentCommitId).toBeNull();
    expect(merge.targetBranchId).toBe(mainBranch.id);
    expect(merge.resultCommitId).toBe(commit.id);
  });
});
