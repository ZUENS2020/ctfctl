import { appendFile, copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { basename, join } from "node:path";
import type { RuntimeConfig } from "./config.js";
import { CliError } from "./errors.js";
import type {
  ArtifactRecord,
  ChallengeRecord,
  EvidenceEntry,
  MemoryBranchRecord,
  MemoryCommitRecord,
  MemoryMergeRecord,
  MemoryRecord,
  WorkspaceRecord
} from "./schemas.js";

export interface RuntimePaths {
  root: string;
  challengesDir: string;
  workspacesDir: string;
  artifactsDir: string;
  memoryDir: string;
  memoryBranchesDir: string;
  memoryCommitsDir: string;
  memoryMergesDir: string;
  skillsDir: string;
  skillTracesDir: string;
  skillEvaluationsDir: string;
  skillProposalsDir: string;
  config: RuntimeConfig;
}

export async function ensureRuntime(config: RuntimeConfig): Promise<RuntimePaths> {
  const paths: RuntimePaths = {
    root: config.runtimeRoot,
    challengesDir: join(config.runtimeRoot, "challenges"),
    workspacesDir: join(config.runtimeRoot, "workspaces"),
    artifactsDir: join(config.runtimeRoot, "artifacts"),
    memoryDir: join(config.runtimeRoot, "memory"),
    memoryBranchesDir: join(config.runtimeRoot, "memory", "branches"),
    memoryCommitsDir: join(config.runtimeRoot, "memory", "commits"),
    memoryMergesDir: join(config.runtimeRoot, "memory", "merges"),
    skillsDir: join(config.runtimeRoot, "skills"),
    skillTracesDir: join(config.runtimeRoot, "skill-traces"),
    skillEvaluationsDir: join(config.runtimeRoot, "skill-evaluations"),
    skillProposalsDir: join(config.runtimeRoot, "skill-proposals"),
    config
  };

  await Promise.all([
    mkdir(paths.root, { recursive: true }),
    mkdir(paths.challengesDir, { recursive: true }),
    mkdir(paths.workspacesDir, { recursive: true }),
    mkdir(paths.artifactsDir, { recursive: true }),
    mkdir(paths.memoryDir, { recursive: true }),
    mkdir(paths.memoryBranchesDir, { recursive: true }),
    mkdir(paths.memoryCommitsDir, { recursive: true }),
    mkdir(paths.memoryMergesDir, { recursive: true }),
    mkdir(paths.skillsDir, { recursive: true }),
    mkdir(paths.skillTracesDir, { recursive: true }),
    mkdir(paths.skillEvaluationsDir, { recursive: true }),
    mkdir(paths.skillProposalsDir, { recursive: true })
  ]);

  return paths;
}

export function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function readJsonFile<T>(path: string): Promise<T> {
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as T;
}

export async function createChallenge(paths: RuntimePaths, input: Omit<ChallengeRecord, "id" | "createdAt">): Promise<ChallengeRecord> {
  const challenge: ChallengeRecord = {
    id: makeId("ch"),
    createdAt: new Date().toISOString(),
    ...input
  };
  const challengeDir = join(paths.challengesDir, challenge.id);
  await mkdir(challengeDir, { recursive: true });
  await writeJsonFile(join(challengeDir, "challenge.json"), challenge);
  return challenge;
}

export async function getChallenge(paths: RuntimePaths, challengeId: string): Promise<ChallengeRecord> {
  try {
    return await readJsonFile<ChallengeRecord>(join(paths.challengesDir, challengeId, "challenge.json"));
  } catch {
    throw new CliError(`Challenge not found: ${challengeId}`, "CHALLENGE_NOT_FOUND", 1);
  }
}

export async function createWorkspace(paths: RuntimePaths, challengeId: string): Promise<WorkspaceRecord> {
  await getChallenge(paths, challengeId);
  const workspaceId = makeId("ws");
  const workspaceDir = join(paths.workspacesDir, workspaceId);
  const backend = paths.config.backend;
  const workspace: WorkspaceRecord = {
    id: workspaceId,
    challengeId,
    backend,
    status: "ready",
    path: join(workspaceDir, "fs"),
    containerImage: backend === "docker" ? paths.config.dockerImage : null,
    containerWorkdir: backend === "docker" ? paths.config.dockerWorkdir : null,
    containerName: backend === "docker" ? `ctfctl-${workspaceId}` : null,
    createdAt: new Date().toISOString()
  };

  await mkdir(workspaceDir, { recursive: true });
  await mkdir(workspace.path, { recursive: true });
  await writeJsonFile(join(workspaceDir, "workspace.json"), workspace);
  return workspace;
}

export async function getWorkspace(paths: RuntimePaths, workspaceId: string): Promise<WorkspaceRecord> {
  try {
    return await readJsonFile<WorkspaceRecord>(join(paths.workspacesDir, workspaceId, "workspace.json"));
  } catch {
    throw new CliError(`Workspace not found: ${workspaceId}`, "WORKSPACE_NOT_FOUND", 1);
  }
}

export async function destroyWorkspace(paths: RuntimePaths, workspaceId: string): Promise<WorkspaceRecord> {
  const workspace = await getWorkspace(paths, workspaceId);
  const destroyed: WorkspaceRecord = {
    ...workspace,
    status: "destroyed"
  };
  await writeJsonFile(join(paths.workspacesDir, workspaceId, "workspace.json"), destroyed);
  return destroyed;
}

export async function appendEvidence(paths: RuntimePaths, entry: Omit<EvidenceEntry, "id" | "createdAt">): Promise<EvidenceEntry> {
  await getChallenge(paths, entry.challengeId);
  const stored: EvidenceEntry = {
    id: makeId("ev"),
    createdAt: new Date().toISOString(),
    ...entry
  };
  await appendFile(
    join(paths.challengesDir, entry.challengeId, "evidence.jsonl"),
    `${JSON.stringify(stored)}\n`,
    "utf8"
  );
  return stored;
}

function getMimeFromFilename(filename: string): string {
  if (filename.endsWith(".txt")) {
    return "text/plain";
  }

  return "application/octet-stream";
}

async function sha256File(filePath: string): Promise<string> {
  const raw = await readFile(filePath);
  return createHash("sha256").update(raw).digest("hex");
}

export async function createArtifact(
  paths: RuntimePaths,
  input: {
    challengeId: string;
    workspaceId: string | null;
    filePath: string;
    source: string;
    derivedFrom: string | null;
  }
): Promise<ArtifactRecord> {
  await getChallenge(paths, input.challengeId);
  const artifactId = makeId("art");
  const artifactDir = join(paths.artifactsDir, artifactId);
  const blobDir = join(artifactDir, "blob");
  const filename = basename(input.filePath);
  const blobPath = join(blobDir, filename);

  await mkdir(blobDir, { recursive: true });
  await copyFile(input.filePath, blobPath);

  const artifact: ArtifactRecord = {
    id: artifactId,
    challengeId: input.challengeId,
    workspaceId: input.workspaceId,
    filename,
    mime: getMimeFromFilename(filename),
    sha256: await sha256File(input.filePath),
    source: input.source,
    derivedFrom: input.derivedFrom,
    blobPath,
    createdAt: new Date().toISOString()
  };

  await writeJsonFile(join(artifactDir, "artifact.json"), artifact);
  return artifact;
}

export async function listArtifactsByChallenge(paths: RuntimePaths, challengeId: string): Promise<ArtifactRecord[]> {
  const ids = await readdir(paths.artifactsDir);
  const artifacts = await Promise.all(
    ids.map(async (artifactId) => {
      try {
        return await readJsonFile<ArtifactRecord>(join(paths.artifactsDir, artifactId, "artifact.json"));
      } catch {
        return null;
      }
    })
  );

  return artifacts.filter((artifact): artifact is ArtifactRecord => artifact !== null && artifact.challengeId === challengeId);
}

export async function commitMemory(paths: RuntimePaths, entry: Omit<MemoryRecord, "id" | "createdAt">): Promise<MemoryRecord> {
  const stored: MemoryRecord = {
    id: makeId("mem"),
    createdAt: new Date().toISOString(),
    ...entry
  };
  await writeJsonFile(join(paths.memoryDir, `${stored.id}.json`), stored);
  return stored;
}

export async function recallMemory(paths: RuntimePaths, query: string): Promise<MemoryRecord[]> {
  const lowered = query.toLowerCase();
  const files = await readdir(paths.memoryDir);
  const matches = await Promise.all(
    files
      .filter((file) => file.endsWith(".json"))
      .map(async (file) => readJsonFile<MemoryRecord>(join(paths.memoryDir, file)))
  );

  return matches.filter((entry) => {
    const haystack = [entry.title, entry.summary, ...entry.tags].join(" ").toLowerCase();
    return haystack.includes(lowered);
  });
}

export async function recallMemoryCommits(
  paths: RuntimePaths,
  query: string
): Promise<MemoryCommitRecord[]> {
  const lowered = query.toLowerCase();
  const files = await readdir(paths.memoryCommitsDir);
  const commits = await Promise.all(
    files
      .filter((file) => file.endsWith(".json"))
      .map(async (file) => readJsonFile<MemoryCommitRecord>(join(paths.memoryCommitsDir, file)))
  );

  return commits.filter((commit) => {
    const haystack = [commit.message, ...commit.facts, ...commit.hypotheses].join(" ").toLowerCase();
    return haystack.includes(lowered);
  });
}

export async function ensureDockerImageRecord(
  paths: RuntimePaths,
  image: string
): Promise<{ name: string; ensuredAt: string }> {
  const record = {
    name: image,
    ensuredAt: new Date().toISOString()
  };
  await writeJsonFile(join(paths.root, "images.json"), [record]);
  return record;
}

export async function listDockerImageRecords(
  paths: RuntimePaths
): Promise<Array<{ name: string; ensuredAt: string }>> {
  try {
    return await readJsonFile<Array<{ name: string; ensuredAt: string }>>(join(paths.root, "images.json"));
  } catch {
    return [];
  }
}

export async function createMemoryBranch(
  paths: RuntimePaths,
  input: {
    challengeId: string;
    name: string;
    parentBranchId: string | null;
  }
): Promise<MemoryBranchRecord> {
  await getChallenge(paths, input.challengeId);
  const branch: MemoryBranchRecord = {
    id: makeId("branch"),
    challengeId: input.challengeId,
    name: input.name,
    status: "active",
    parentBranchId: input.parentBranchId,
    headCommitId: null,
    createdAt: new Date().toISOString()
  };
  await writeJsonFile(join(paths.memoryBranchesDir, `${branch.id}.json`), branch);
  return branch;
}

async function getMemoryBranch(paths: RuntimePaths, branchId: string): Promise<MemoryBranchRecord> {
  try {
    return await readJsonFile<MemoryBranchRecord>(join(paths.memoryBranchesDir, `${branchId}.json`));
  } catch {
    throw new CliError(`Memory branch not found: ${branchId}`, "MEMORY_BRANCH_NOT_FOUND", 1);
  }
}

export async function createMemoryCommit(
  paths: RuntimePaths,
  input: {
    branchId: string;
    challengeId: string;
    message: string;
    facts: string[];
    hypotheses: string[];
    artifactIds: string[];
    evidenceIds: string[];
  }
): Promise<MemoryCommitRecord> {
  const branch = await getMemoryBranch(paths, input.branchId);
  const commit: MemoryCommitRecord = {
    id: makeId("commit"),
    branchId: input.branchId,
    challengeId: input.challengeId,
    parentCommitId: branch.headCommitId,
    message: input.message,
    facts: input.facts,
    hypotheses: input.hypotheses,
    artifactIds: input.artifactIds,
    evidenceIds: input.evidenceIds,
    createdAt: new Date().toISOString()
  };

  await writeJsonFile(join(paths.memoryCommitsDir, `${commit.id}.json`), commit);
  await writeJsonFile(join(paths.memoryBranchesDir, `${branch.id}.json`), {
    ...branch,
    headCommitId: commit.id
  } satisfies MemoryBranchRecord);
  return commit;
}

export async function createMemoryMerge(
  paths: RuntimePaths,
  input: {
    challengeId: string;
    sourceBranchId: string;
    targetBranchId: string;
    resultCommitId: string;
    summary: string;
  }
): Promise<MemoryMergeRecord> {
  const sourceBranch = await getMemoryBranch(paths, input.sourceBranchId);
  const targetBranch = await getMemoryBranch(paths, input.targetBranchId);

  const merge: MemoryMergeRecord = {
    id: makeId("merge"),
    challengeId: input.challengeId,
    sourceBranchId: input.sourceBranchId,
    targetBranchId: input.targetBranchId,
    resultCommitId: input.resultCommitId,
    summary: input.summary,
    createdAt: new Date().toISOString()
  };

  await writeJsonFile(join(paths.memoryMergesDir, `${merge.id}.json`), merge);
  await writeJsonFile(join(paths.memoryBranchesDir, `${sourceBranch.id}.json`), {
    ...sourceBranch,
    status: "merged"
  } satisfies MemoryBranchRecord);
  await writeJsonFile(join(paths.memoryBranchesDir, `${targetBranch.id}.json`), targetBranch);
  return merge;
}
