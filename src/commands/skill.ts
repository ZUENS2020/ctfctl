import { Command } from "commander";
import type { CommandContext } from "../cli.js";
import {
  createSkill,
  createSkillTrace,
  evaluateSkillTrace,
  getSkill,
  listSkillProposals,
  listSkills,
  listSkillTraces,
  proposeSkillRevision,
  skillHelpers
} from "../core/skills.js";

function parseBoolean(value: string): boolean {
  return value === "true";
}

export function registerSkillCommands(program: Command, context: CommandContext): void {
  const skill = program.command("skill");

  skill
    .command("register")
    .requiredOption("--name <name>")
    .requiredOption("--version <version>")
    .requiredOption("--applicable-to <items>")
    .requiredOption("--workflow <items>")
    .option("--tool-constraints <items>")
    .option("--success-signals <items>")
    .option("--failure-signals <items>")
    .action(async (options) => {
      context.setCommand("skill register");
      const stored = await createSkill(context.paths, {
        name: options.name,
        version: options.version,
        applicableTo: skillHelpers.parseCsv(options.applicableTo),
        workflow: skillHelpers.parseCsv(options.workflow),
        toolConstraints: skillHelpers.parseCsv(options.toolConstraints),
        successSignals: skillHelpers.parseCsv(options.successSignals),
        failureSignals: skillHelpers.parseCsv(options.failureSignals)
      });
      context.writeSuccess({
        skill: stored
      });
    });

  skill.command("list").action(async () => {
    context.setCommand("skill list");
    context.writeSuccess({
      skills: await listSkills(context.paths)
    });
  });

  skill
    .command("show")
    .requiredOption("--skill <skillId>")
    .action(async (options) => {
      context.setCommand("skill show");
      context.writeSuccess({
        skill: await getSkill(context.paths, options.skill)
      });
    });

  const trace = skill.command("trace");
  trace
    .command("record")
    .requiredOption("--skill <skillId>")
    .requiredOption("--version <version>")
    .requiredOption("--challenge <challengeId>")
    .requiredOption("--status <status>")
    .requiredOption("--command-count <count>")
    .requiredOption("--flag-found <flagFound>")
    .option("--notes <notes>")
    .action(async (options) => {
      context.setCommand("skill trace record");
      const stored = await createSkillTrace(context.paths, {
        skillId: options.skill,
        skillVersion: options.version,
        challengeId: options.challenge,
        status: options.status,
        commandCount: Number.parseInt(options.commandCount, 10),
        flagFound: parseBoolean(options.flagFound),
        notes: skillHelpers.parseCsv(options.notes)
      });
      context.writeSuccess({
        trace: stored
      });
    });

  trace
    .command("list")
    .option("--skill <skillId>")
    .action(async (options) => {
      context.setCommand("skill trace list");
      context.writeSuccess({
        traces: await listSkillTraces(context.paths, options.skill)
      });
    });

  skill
    .command("evaluate")
    .requiredOption("--skill <skillId>")
    .requiredOption("--trace <traceId>")
    .action(async (options) => {
      context.setCommand("skill evaluate");
      context.writeSuccess({
        evaluation: await evaluateSkillTrace(context.paths, options.skill, options.trace)
      });
    });

  skill
    .command("propose")
    .requiredOption("--skill <skillId>")
    .requiredOption("--trace <traceId>")
    .requiredOption("--evaluation <evaluationId>")
    .action(async (options) => {
      context.setCommand("skill propose");
      context.writeSuccess({
        proposal: await proposeSkillRevision(context.paths, options.skill, options.trace, options.evaluation)
      });
    });

  const proposal = skill.command("proposal");
  proposal
    .command("list")
    .option("--skill <skillId>")
    .action(async (options) => {
      context.setCommand("skill proposal list");
      context.writeSuccess({
        proposals: await listSkillProposals(context.paths, options.skill)
      });
    });
}
