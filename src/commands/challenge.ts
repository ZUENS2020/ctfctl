import { Command } from "commander";
import type { CommandContext } from "../cli.js";
import { createChallenge } from "../core/runtime.js";

export function registerChallengeCommands(program: Command, context: CommandContext): void {
  const challenge = program.command("challenge");

  challenge
    .command("init")
    .requiredOption("--name <name>")
    .requiredOption("--category <category>")
    .requiredOption("--description <description>")
    .requiredOption("--flag-format <flagFormat>")
    .action(async (options) => {
      context.setCommand("challenge init");
      const challengeRecord = await createChallenge(context.paths, {
        name: options.name,
        category: options.category,
        description: options.description,
        flagFormat: options.flagFormat
      });

      context.writeSuccess({
        challenge: challengeRecord
      });
    });
}
