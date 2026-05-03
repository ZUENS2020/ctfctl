import { z } from "zod";

export const challengeSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  description: z.string(),
  flagFormat: z.string(),
  createdAt: z.string()
});

export const workspaceSchema = z.object({
  id: z.string(),
  challengeId: z.string(),
  backend: z.enum(["local-shell", "docker"]),
  status: z.enum(["ready", "destroyed"]),
  path: z.string(),
  containerImage: z.string().nullable(),
  containerWorkdir: z.string().nullable(),
  containerName: z.string().nullable(),
  createdAt: z.string()
});

export const artifactSchema = z.object({
  id: z.string(),
  challengeId: z.string(),
  workspaceId: z.string().nullable(),
  filename: z.string(),
  mime: z.string(),
  sha256: z.string(),
  source: z.string(),
  derivedFrom: z.string().nullable(),
  blobPath: z.string(),
  createdAt: z.string()
});

export const evidenceEntrySchema = z.object({
  id: z.string(),
  challengeId: z.string(),
  kind: z.string(),
  text: z.string(),
  createdAt: z.string()
});

export const memoryRecordSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  summary: z.string(),
  tags: z.array(z.string()),
  createdAt: z.string()
});

export const memoryBranchSchema = z.object({
  id: z.string(),
  challengeId: z.string(),
  name: z.string(),
  status: z.enum(["active", "merged", "dead"]),
  parentBranchId: z.string().nullable(),
  headCommitId: z.string().nullable(),
  createdAt: z.string()
});

export const memoryCommitSchema = z.object({
  id: z.string(),
  branchId: z.string(),
  challengeId: z.string(),
  parentCommitId: z.string().nullable(),
  message: z.string(),
  facts: z.array(z.string()),
  hypotheses: z.array(z.string()),
  artifactIds: z.array(z.string()),
  evidenceIds: z.array(z.string()),
  createdAt: z.string()
});

export const memoryMergeSchema = z.object({
  id: z.string(),
  challengeId: z.string(),
  sourceBranchId: z.string(),
  targetBranchId: z.string(),
  resultCommitId: z.string(),
  summary: z.string(),
  createdAt: z.string()
});

export const skillSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  applicableTo: z.array(z.string()),
  workflow: z.array(z.string()),
  toolConstraints: z.array(z.string()),
  successSignals: z.array(z.string()),
  failureSignals: z.array(z.string()),
  parentSkillId: z.string().nullable(),
  createdAt: z.string()
});

export const skillTraceSchema = z.object({
  id: z.string(),
  skillId: z.string(),
  skillVersion: z.string(),
  challengeId: z.string(),
  status: z.enum(["success", "failure", "partial"]),
  commandCount: z.number(),
  flagFound: z.boolean(),
  notes: z.array(z.string()),
  createdAt: z.string()
});

export const skillEvaluationSchema = z.object({
  id: z.string(),
  skillId: z.string(),
  traceId: z.string(),
  score: z.number(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  createdAt: z.string()
});

export const skillProposalSchema = z.object({
  id: z.string(),
  skillId: z.string(),
  parentVersion: z.string(),
  sourceTraceId: z.string(),
  sourceEvaluationId: z.string(),
  proposedVersion: z.string(),
  summary: z.string(),
  changes: z.array(z.string()),
  createdAt: z.string()
});

export type ChallengeRecord = z.infer<typeof challengeSchema>;
export type WorkspaceRecord = z.infer<typeof workspaceSchema>;
export type ArtifactRecord = z.infer<typeof artifactSchema>;
export type EvidenceEntry = z.infer<typeof evidenceEntrySchema>;
export type MemoryRecord = z.infer<typeof memoryRecordSchema>;
export type MemoryBranchRecord = z.infer<typeof memoryBranchSchema>;
export type MemoryCommitRecord = z.infer<typeof memoryCommitSchema>;
export type MemoryMergeRecord = z.infer<typeof memoryMergeSchema>;
export type SkillRecord = z.infer<typeof skillSchema>;
export type SkillTraceRecord = z.infer<typeof skillTraceSchema>;
export type SkillEvaluationRecord = z.infer<typeof skillEvaluationSchema>;
export type SkillProposalRecord = z.infer<typeof skillProposalSchema>;
