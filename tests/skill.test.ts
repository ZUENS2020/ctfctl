import { afterEach, describe, expect, it } from "vitest";
import { cleanupRuntimeRoot, makeRuntimeRoot } from "./helpers.js";
import { runCli } from "../src/cli.js";
import { ensureRuntime } from "../src/core/runtime.js";
import { resolveConfig } from "../src/core/config.js";
import {
  createSkill,
  createSkillEvaluation,
  createSkillProposal,
  createSkillTrace,
  listSkillProposals,
  listSkills,
  listSkillTraces
} from "../src/core/skills.js";

const runtimeRoots: string[] = [];

afterEach(async () => {
  await Promise.all(runtimeRoots.splice(0).map(cleanupRuntimeRoot));
});

describe("skills system", () => {
  it("stores skill, trace, evaluation and proposal records in core runtime", async () => {
    const runtimeRoot = await makeRuntimeRoot();
    runtimeRoots.push(runtimeRoot);
    const paths = await ensureRuntime(await resolveConfig({ CTFCTL_RUNTIME_ROOT: runtimeRoot }));

    const skill = await createSkill(paths, {
      name: "reverse static baseline",
      version: "1.0.0",
      applicableTo: ["reverse", "elf"],
      workflow: ["file", "strings", "checksec"],
      toolConstraints: ["exec.run only"],
      successSignals: ["flag found", "packer identified"],
      failureSignals: ["no useful strings"]
    });

    const trace = await createSkillTrace(paths, {
      skillId: skill.id,
      skillVersion: skill.version,
      challengeId: "ch-demo",
      status: "success",
      commandCount: 5,
      flagFound: true,
      notes: ["strings found interesting marker"]
    });

    const evaluation = await createSkillEvaluation(paths, {
      skillId: skill.id,
      traceId: trace.id,
      score: 0.88,
      strengths: ["short path to useful strings"],
      weaknesses: ["did not capture entropy step"]
    });

    const proposal = await createSkillProposal(paths, {
      skillId: skill.id,
      parentVersion: skill.version,
      sourceTraceId: trace.id,
      sourceEvaluationId: evaluation.id,
      proposedVersion: "1.1.0",
      summary: "insert entropy before strings",
      changes: ["add entropy after file"]
    });

    expect(skill.id).toMatch(/^skill-/);
    expect(trace.skillId).toBe(skill.id);
    expect(evaluation.traceId).toBe(trace.id);
    expect(proposal.skillId).toBe(skill.id);
    expect(proposal.sourceTraceId).toBe(trace.id);
  });

  it("registers and lists skills through the cli", async () => {
    const runtimeRoot = await makeRuntimeRoot();
    runtimeRoots.push(runtimeRoot);

    const registerResult = await runCli(
      [
        "skill",
        "register",
        "--name",
        "reverse static baseline",
        "--version",
        "1.0.0",
        "--applicable-to",
        "reverse,elf",
        "--workflow",
        "file,strings,checksec"
      ],
      { CTFCTL_RUNTIME_ROOT: runtimeRoot }
    );

    expect(registerResult.exitCode).toBe(0);
    expect(JSON.parse(registerResult.stdout).data.skill.name).toBe("reverse static baseline");

    const listResult = await runCli(["skill", "list"], {
      CTFCTL_RUNTIME_ROOT: runtimeRoot
    });

    expect(listResult.exitCode).toBe(0);
    expect(JSON.parse(listResult.stdout).data.skills).toHaveLength(1);
  });

  it("records traces and proposals through the cli", async () => {
    const runtimeRoot = await makeRuntimeRoot();
    runtimeRoots.push(runtimeRoot);

    const registerResult = await runCli(
      [
        "skill",
        "register",
        "--name",
        "reverse static baseline",
        "--version",
        "1.0.0",
        "--applicable-to",
        "reverse,elf",
        "--workflow",
        "file,strings,checksec"
      ],
      { CTFCTL_RUNTIME_ROOT: runtimeRoot }
    );

    const skill = JSON.parse(registerResult.stdout).data.skill;

    const traceResult = await runCli(
      [
        "skill",
        "trace",
        "record",
        "--skill",
        skill.id,
        "--version",
        skill.version,
        "--challenge",
        "ch-demo",
        "--status",
        "success",
        "--command-count",
        "5",
        "--flag-found",
        "true",
        "--notes",
        "good path"
      ],
      { CTFCTL_RUNTIME_ROOT: runtimeRoot }
    );

    expect(traceResult.exitCode).toBe(0);
    const trace = JSON.parse(traceResult.stdout).data.trace;

    const evaluateResult = await runCli(
      [
        "skill",
        "evaluate",
        "--skill",
        skill.id,
        "--trace",
        trace.id
      ],
      { CTFCTL_RUNTIME_ROOT: runtimeRoot }
    );

    expect(evaluateResult.exitCode).toBe(0);
    const evaluation = JSON.parse(evaluateResult.stdout).data.evaluation;

    const proposeResult = await runCli(
      [
        "skill",
        "propose",
        "--skill",
        skill.id,
        "--trace",
        trace.id,
        "--evaluation",
        evaluation.id
      ],
      { CTFCTL_RUNTIME_ROOT: runtimeRoot }
    );

    expect(proposeResult.exitCode).toBe(0);
    expect(JSON.parse(proposeResult.stdout).data.proposal.proposedVersion).toBe("1.0.1");

    const resolvedPaths = await ensureRuntime(await resolveConfig({ CTFCTL_RUNTIME_ROOT: runtimeRoot }));
    const traces = await listSkillTraces(resolvedPaths, skill.id);
    const proposals = await listSkillProposals(resolvedPaths, skill.id);
    const skills = await listSkills(resolvedPaths);

    expect(traces).toHaveLength(1);
    expect(proposals).toHaveLength(1);
    expect(skills).toHaveLength(1);
  });
});
