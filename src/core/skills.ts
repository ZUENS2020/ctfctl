import { join } from "node:path";
import { CliError } from "./errors.js";
import { isMissingFileError, makeId, readJsonFile, type RuntimePaths, writeJsonFile } from "./runtime.js";
import type {
  SkillEvaluationRecord,
  SkillProposalRecord,
  SkillRecord,
  SkillTraceRecord
} from "./schemas.js";
import {
  skillEvaluationSchema,
  skillProposalSchema,
  skillSchema,
  skillTraceSchema
} from "./schemas.js";
import { readdir } from "node:fs/promises";
import type { ZodType } from "zod";

function parseCsv(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function nextPatchVersion(version: string): string {
  const parts = version.split(".");
  if (parts.length !== 3) {
    return `${version}.1`;
  }
  const [major, minor, patch] = parts;
  const nextPatch = Number.parseInt(patch, 10);
  if (Number.isNaN(nextPatch)) {
    return `${version}.1`;
  }
  return `${major}.${minor}.${nextPatch + 1}`;
}

async function readDirRecords<T>(dir: string, schema: ZodType<T>): Promise<T[]> {
  const files = (await readdir(dir)).sort();
  const records = await Promise.all(
    files
      .filter((file) => file.endsWith(".json"))
      .map(async (file) => await readJsonFile<T>(join(dir, file), schema))
  );
  return records;
}

async function readRequiredSkillRecord<T>(
  path: string,
  schema: ZodType<T>,
  notFoundMessage: string,
  notFoundCode: string
): Promise<T> {
  try {
    return await readJsonFile<T>(path, schema);
  } catch (error) {
    if (error instanceof CliError) {
      throw error;
    }

    if (isMissingFileError(error)) {
      throw new CliError(notFoundMessage, notFoundCode, 1);
    }

    throw error;
  }
}

export async function createSkill(
  paths: RuntimePaths,
  input: {
    name: string;
    version: string;
    applicableTo: string[];
    workflow: string[];
    toolConstraints?: string[];
    successSignals?: string[];
    failureSignals?: string[];
    parentSkillId?: string | null;
  }
): Promise<SkillRecord> {
  const skill: SkillRecord = {
    id: makeId("skill"),
    name: input.name,
    version: input.version,
    applicableTo: input.applicableTo,
    workflow: input.workflow,
    toolConstraints: input.toolConstraints ?? [],
    successSignals: input.successSignals ?? [],
    failureSignals: input.failureSignals ?? [],
    parentSkillId: input.parentSkillId ?? null,
    createdAt: new Date().toISOString()
  };
  await writeJsonFile(join(paths.skillsDir, `${skill.id}.json`), skill, skillSchema);
  return skill;
}

export async function listSkills(paths: RuntimePaths): Promise<SkillRecord[]> {
  return await readDirRecords<SkillRecord>(paths.skillsDir, skillSchema);
}

export async function getSkill(paths: RuntimePaths, skillId: string): Promise<SkillRecord> {
  return await readRequiredSkillRecord(
    join(paths.skillsDir, `${skillId}.json`),
    skillSchema,
    `Skill not found: ${skillId}`,
    "SKILL_NOT_FOUND"
  );
}

export async function createSkillTrace(
  paths: RuntimePaths,
  input: {
    skillId: string;
    skillVersion: string;
    challengeId: string;
    status: "success" | "failure" | "partial";
    commandCount: number;
    flagFound: boolean;
    notes: string[];
  }
): Promise<SkillTraceRecord> {
  await getSkill(paths, input.skillId);
  const trace: SkillTraceRecord = {
    id: makeId("trace"),
    createdAt: new Date().toISOString(),
    ...input
  };
  await writeJsonFile(join(paths.skillTracesDir, `${trace.id}.json`), trace, skillTraceSchema);
  return trace;
}

export async function listSkillTraces(paths: RuntimePaths, skillId?: string): Promise<SkillTraceRecord[]> {
  const traces = await readDirRecords<SkillTraceRecord>(paths.skillTracesDir, skillTraceSchema);
  return skillId ? traces.filter((trace) => trace.skillId === skillId) : traces;
}

export async function getSkillTrace(paths: RuntimePaths, traceId: string): Promise<SkillTraceRecord> {
  return await readRequiredSkillRecord(
    join(paths.skillTracesDir, `${traceId}.json`),
    skillTraceSchema,
    `Skill trace not found: ${traceId}`,
    "SKILL_TRACE_NOT_FOUND"
  );
}

export async function createSkillEvaluation(
  paths: RuntimePaths,
  input: {
    skillId: string;
    traceId: string;
    score: number;
    strengths: string[];
    weaknesses: string[];
  }
): Promise<SkillEvaluationRecord> {
  await getSkill(paths, input.skillId);
  await getSkillTrace(paths, input.traceId);
  const evaluation: SkillEvaluationRecord = {
    id: makeId("eval"),
    createdAt: new Date().toISOString(),
    ...input
  };
  await writeJsonFile(join(paths.skillEvaluationsDir, `${evaluation.id}.json`), evaluation, skillEvaluationSchema);
  return evaluation;
}

export async function getSkillEvaluation(paths: RuntimePaths, evaluationId: string): Promise<SkillEvaluationRecord> {
  return await readRequiredSkillRecord(
    join(paths.skillEvaluationsDir, `${evaluationId}.json`),
    skillEvaluationSchema,
    `Skill evaluation not found: ${evaluationId}`,
    "SKILL_EVALUATION_NOT_FOUND"
  );
}

export async function createSkillProposal(
  paths: RuntimePaths,
  input: {
    skillId: string;
    parentVersion: string;
    sourceTraceId: string;
    sourceEvaluationId: string;
    proposedVersion: string;
    summary: string;
    changes: string[];
  }
): Promise<SkillProposalRecord> {
  await getSkill(paths, input.skillId);
  await getSkillTrace(paths, input.sourceTraceId);
  await getSkillEvaluation(paths, input.sourceEvaluationId);
  const proposal: SkillProposalRecord = {
    id: makeId("proposal"),
    createdAt: new Date().toISOString(),
    ...input
  };
  await writeJsonFile(join(paths.skillProposalsDir, `${proposal.id}.json`), proposal, skillProposalSchema);
  return proposal;
}

export async function listSkillProposals(paths: RuntimePaths, skillId?: string): Promise<SkillProposalRecord[]> {
  const proposals = await readDirRecords<SkillProposalRecord>(paths.skillProposalsDir, skillProposalSchema);
  return skillId ? proposals.filter((proposal) => proposal.skillId === skillId) : proposals;
}

export async function evaluateSkillTrace(
  paths: RuntimePaths,
  skillId: string,
  traceId: string
): Promise<SkillEvaluationRecord> {
  const trace = await getSkillTrace(paths, traceId);
  const scoreBase = trace.flagFound ? 0.8 : trace.status === "partial" ? 0.5 : 0.25;
  const efficiencyBonus = trace.commandCount <= 5 ? 0.08 : trace.commandCount <= 10 ? 0.04 : 0;
  const score = Math.min(0.99, Number((scoreBase + efficiencyBonus).toFixed(2)));
  const strengths = trace.flagFound ? ["成功找到 flag", "路径较短"] : ["记录了可复盘 trace"];
  const weaknesses =
    trace.commandCount > 5 ? ["命令数偏多，可能需要收敛 workflow"] : ["尚未覆盖更多分支特征"];

  return await createSkillEvaluation(paths, {
    skillId,
    traceId,
    score,
    strengths,
    weaknesses
  });
}

export async function proposeSkillRevision(
  paths: RuntimePaths,
  skillId: string,
  traceId: string,
  evaluationId: string
): Promise<SkillProposalRecord> {
  const skill = await getSkill(paths, skillId);
  const trace = await getSkillTrace(paths, traceId);
  const evaluation = await getSkillEvaluation(paths, evaluationId);
  const proposedVersion = nextPatchVersion(skill.version);
  const summary = trace.flagFound
    ? "保留成功路径并补充一个额外检查步骤"
    : "调整 workflow，减少无效步骤";
  const changes = evaluation.score >= 0.8
    ? ["在现有 workflow 前段插入一个轻量验证步骤"]
    : ["收紧 workflow，优先执行更高信号步骤", "减少无效命令分支"];

  return await createSkillProposal(paths, {
    skillId,
    parentVersion: skill.version,
    sourceTraceId: traceId,
    sourceEvaluationId: evaluationId,
    proposedVersion,
    summary,
    changes
  });
}

export const skillHelpers = {
  parseCsv
};
