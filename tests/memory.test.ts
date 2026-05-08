import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { cleanupRuntimeRoot, makeRuntimeRoot } from "./helpers.js";
import { runCli } from "../src/cli.js";

const runtimeRoots: string[] = [];

afterEach(async () => {
  await Promise.all(runtimeRoots.splice(0).map(cleanupRuntimeRoot));
});

async function initChallenge(runtimeRoot: string, name: string) {
  const result = await runCli(
    [
      "challenge",
      "init",
      "--name",
      name,
      "--category",
      "reverse",
      "--description",
      "memory cli",
      "--flag-format",
      "flag{...}"
    ],
    {
      CTFCTL_RUNTIME_ROOT: runtimeRoot
    }
  );

  expect(result.exitCode).toBe(0);
  return JSON.parse(result.stdout).data.challenge;
}

async function createBranch(runtimeRoot: string, challengeId: string, name: string) {
  const result = await runCli(["memory", "branch", "create", "--challenge", challengeId, "--name", name], {
    CTFCTL_RUNTIME_ROOT: runtimeRoot
  });

  expect(result.exitCode).toBe(0);
  return JSON.parse(result.stdout).data.branch;
}

async function createCommit(runtimeRoot: string, challengeId: string, branchId: string, message: string) {
  const result = await runCli(
    [
      "memory",
      "commit",
      "create",
      "--branch",
      branchId,
      "--challenge",
      challengeId,
      "--message",
      message,
      "--facts",
      `${message} fact`,
      "--hypotheses",
      `${message} hypothesis`
    ],
    {
      CTFCTL_RUNTIME_ROOT: runtimeRoot
    }
  );

  expect(result.exitCode).toBe(0);
  return JSON.parse(result.stdout).data.commit;
}

async function setCommitCreatedAt(runtimeRoot: string, commitId: string, createdAt: string): Promise<void> {
  const commitPath = join(runtimeRoot, "memory", "commits", `${commitId}.json`);
  const commit = JSON.parse(await readFile(commitPath, "utf8"));
  await writeFile(commitPath, `${JSON.stringify({ ...commit, createdAt }, null, 2)}\n`, "utf8");
}

describe("memory commands", () => {
  it("creates a branch, commits to it, and recalls by query", async () => {
    const runtimeRoot = await makeRuntimeRoot();
    runtimeRoots.push(runtimeRoot);

    const challenge = await initChallenge(runtimeRoot, "memory challenge");
    const branch = await createBranch(runtimeRoot, challenge.id, "main");

    const commitResult = await runCli(
      [
        "memory",
        "commit",
        "create",
        "--branch",
        branch.id,
        "--challenge",
        challenge.id,
        "--message",
        "audio spectrogram workflow",
        "--facts",
        "Generate a spectrogram before reversing the binary.",
        "--hypotheses",
        "audio may hide visible text"
      ],
      {
        CTFCTL_RUNTIME_ROOT: runtimeRoot
      }
    );

    expect(commitResult.exitCode).toBe(0);

    const recallResult = await runCli(["memory", "recall", "--query", "spectrogram"], {
      CTFCTL_RUNTIME_ROOT: runtimeRoot
    });

    expect(recallResult.exitCode).toBe(0);

    const parsed = JSON.parse(recallResult.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.meta.command).toBe("memory recall");
    expect(parsed.data.matches).toHaveLength(1);
    expect(parsed.data.matches[0].message).toBe("audio spectrogram workflow");
  });

  it("merges two branches through the cli", async () => {
    const runtimeRoot = await makeRuntimeRoot();
    runtimeRoots.push(runtimeRoot);

    const challenge = await initChallenge(runtimeRoot, "memory challenge");
    const mainBranch = await createBranch(runtimeRoot, challenge.id, "main");
    const altBranch = await createBranch(runtimeRoot, challenge.id, "alt");
    const commit = await createCommit(runtimeRoot, challenge.id, mainBranch.id, "validated path");

    const mergeResult = await runCli(
      [
        "memory",
        "merge",
        "--challenge",
        challenge.id,
        "--source-branch",
        altBranch.id,
        "--target-branch",
        mainBranch.id,
        "--result-commit",
        commit.id,
        "--summary",
        "merge validated path"
      ],
      {
        CTFCTL_RUNTIME_ROOT: runtimeRoot
      }
    );

    expect(mergeResult.exitCode).toBe(0);
    const parsed = JSON.parse(mergeResult.stdout);
    expect(parsed.data.merge.targetBranchId).toBe(mainBranch.id);
  });

  it("lists branches by challenge and status, shows branches with commits, kills branches, and lists commits and merges", async () => {
    const runtimeRoot = await makeRuntimeRoot();
    runtimeRoots.push(runtimeRoot);

    const challenge = await initChallenge(runtimeRoot, "primary memory challenge");
    const otherChallenge = await initChallenge(runtimeRoot, "other memory challenge");

    const activeBranch = await createBranch(runtimeRoot, challenge.id, "active");
    const deadBranch = await createBranch(runtimeRoot, challenge.id, "dead");
    const mergedSourceBranch = await createBranch(runtimeRoot, challenge.id, "merged-source");
    const targetBranch = await createBranch(runtimeRoot, challenge.id, "target");
    await createBranch(runtimeRoot, otherChallenge.id, "other-active");

    const olderCommit = await createCommit(runtimeRoot, challenge.id, activeBranch.id, "older commit");
    const newerCommit = await createCommit(runtimeRoot, challenge.id, activeBranch.id, "newer commit");
    await setCommitCreatedAt(runtimeRoot, olderCommit.id, "2024-01-02T00:00:00.000Z");
    await setCommitCreatedAt(runtimeRoot, newerCommit.id, "2024-01-01T00:00:00.000Z");

    const targetCommit = await createCommit(runtimeRoot, challenge.id, targetBranch.id, "target commit");
    const otherSourceBranch = await createBranch(runtimeRoot, otherChallenge.id, "other-source");
    const otherTargetBranch = await createBranch(runtimeRoot, otherChallenge.id, "other-target");
    const otherCommit = await createCommit(runtimeRoot, otherChallenge.id, otherTargetBranch.id, "other target commit");

    const primaryMergeResult = await runCli(
      [
        "memory",
        "merge",
        "--challenge",
        challenge.id,
        "--source-branch",
        mergedSourceBranch.id,
        "--target-branch",
        targetBranch.id,
        "--result-commit",
        targetCommit.id,
        "--summary",
        "primary merge"
      ],
      { CTFCTL_RUNTIME_ROOT: runtimeRoot }
    );
    expect(primaryMergeResult.exitCode).toBe(0);

    const otherMergeResult = await runCli(
      [
        "memory",
        "merge",
        "--challenge",
        otherChallenge.id,
        "--source-branch",
        otherSourceBranch.id,
        "--target-branch",
        otherTargetBranch.id,
        "--result-commit",
        otherCommit.id,
        "--summary",
        "other merge"
      ],
      { CTFCTL_RUNTIME_ROOT: runtimeRoot }
    );
    expect(otherMergeResult.exitCode).toBe(0);

    const killResult = await runCli(["memory", "branch", "kill", "--branch", deadBranch.id], {
      CTFCTL_RUNTIME_ROOT: runtimeRoot
    });
    expect(killResult.exitCode).toBe(0);
    expect(JSON.parse(killResult.stdout).data.branch.status).toBe("dead");

    const branchListResult = await runCli(["memory", "branch", "list", "--challenge", challenge.id], {
      CTFCTL_RUNTIME_ROOT: runtimeRoot
    });
    expect(branchListResult.exitCode).toBe(0);
    expect(JSON.parse(branchListResult.stdout).data.branches.map((branch: { id: string }) => branch.id).sort()).toEqual(
      [activeBranch.id, deadBranch.id, mergedSourceBranch.id, targetBranch.id].sort()
    );

    const activeBranchListResult = await runCli(
      ["memory", "branch", "list", "--challenge", challenge.id, "--status", "active"],
      {
        CTFCTL_RUNTIME_ROOT: runtimeRoot
      }
    );
    expect(activeBranchListResult.exitCode).toBe(0);
    expect(JSON.parse(activeBranchListResult.stdout).data.branches.map((branch: { id: string }) => branch.id).sort()).toEqual(
      [activeBranch.id, targetBranch.id].sort()
    );

    const mergedBranchListResult = await runCli(
      ["memory", "branch", "list", "--challenge", challenge.id, "--status", "merged"],
      {
        CTFCTL_RUNTIME_ROOT: runtimeRoot
      }
    );
    expect(mergedBranchListResult.exitCode).toBe(0);
    expect(JSON.parse(mergedBranchListResult.stdout).data.branches.map((branch: { id: string }) => branch.id)).toEqual([
      mergedSourceBranch.id
    ]);

    const deadBranchListResult = await runCli(
      ["memory", "branch", "list", "--challenge", challenge.id, "--status", "dead"],
      {
        CTFCTL_RUNTIME_ROOT: runtimeRoot
      }
    );
    expect(deadBranchListResult.exitCode).toBe(0);
    expect(JSON.parse(deadBranchListResult.stdout).data.branches.map((branch: { id: string }) => branch.id)).toEqual([
      deadBranch.id
    ]);

    const showResult = await runCli(["memory", "branch", "show", "--branch", activeBranch.id], {
      CTFCTL_RUNTIME_ROOT: runtimeRoot
    });
    expect(showResult.exitCode).toBe(0);
    const shown = JSON.parse(showResult.stdout).data;
    expect(shown.branch.id).toBe(activeBranch.id);
    expect(shown.commits.map((commit: { id: string }) => commit.id)).toEqual([newerCommit.id, olderCommit.id]);

    const commitListResult = await runCli(["memory", "commit", "list", "--branch", activeBranch.id], {
      CTFCTL_RUNTIME_ROOT: runtimeRoot
    });
    expect(commitListResult.exitCode).toBe(0);
    expect(JSON.parse(commitListResult.stdout).data.commits.map((commit: { id: string }) => commit.id)).toEqual([
      newerCommit.id,
      olderCommit.id
    ]);

    const mergeListResult = await runCli(["memory", "merge", "list", "--challenge", challenge.id], {
      CTFCTL_RUNTIME_ROOT: runtimeRoot
    });
    expect(mergeListResult.exitCode).toBe(0);
    const merges = JSON.parse(mergeListResult.stdout).data.merges;
    expect(merges).toHaveLength(1);
    expect(merges[0].challengeId).toBe(challenge.id);
    expect(merges[0].summary).toBe("primary merge");
  });
});
