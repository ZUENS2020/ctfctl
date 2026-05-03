import { Command } from "commander";
import type { CommandContext } from "../cli.js";
import { getChallenge } from "../core/runtime.js";

function matchesFormat(flagFormat: string, value: string): boolean {
  if (flagFormat.includes("...")) {
    const [prefix, suffix] = flagFormat.split("...");
    return value.startsWith(prefix) && value.endsWith(suffix);
  }

  return value === flagFormat;
}

export function registerVerifyCommands(program: Command, context: CommandContext): void {
  const verify = program.command("verify");

  verify
    .command("flag")
    .requiredOption("--challenge <challengeId>")
    .requiredOption("--value <value>")
    .action(async (options) => {
      context.setCommand("verify flag");
      const challenge = await getChallenge(context.paths, options.challenge);
      const valid = matchesFormat(challenge.flagFormat, options.value);
      context.writeSuccess({
        challengeId: challenge.id,
        value: options.value,
        valid
      });
    });
}
