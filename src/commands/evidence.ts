import { Command } from "commander";
import type { CommandContext } from "../cli.js";
import { appendEvidence } from "../core/runtime.js";

export function registerEvidenceCommands(program: Command, context: CommandContext): void {
  const evidence = program.command("evidence");

  evidence
    .command("note")
    .requiredOption("--challenge <challengeId>")
    .requiredOption("--kind <kind>")
    .requiredOption("--text <text>")
    .action(async (options) => {
      context.setCommand("evidence note");
      const entry = await appendEvidence(context.paths, {
        challengeId: options.challenge,
        kind: options.kind,
        text: options.text
      });

      context.writeSuccess({
        entry
      });
    });
}
