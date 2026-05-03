import { Command } from "commander";
import type { CommandContext } from "../cli.js";
import { createArtifact, listArtifactsByChallenge } from "../core/runtime.js";

export function registerArtifactCommands(program: Command, context: CommandContext): void {
  const artifact = program.command("artifact");

  artifact
    .command("add")
    .requiredOption("--challenge <challengeId>")
    .requiredOption("--file <filePath>")
    .action(async (options) => {
      context.setCommand("artifact add");
      const stored = await createArtifact(context.paths, {
        challengeId: options.challenge,
        workspaceId: null,
        filePath: options.file,
        source: "user_upload",
        derivedFrom: null
      });

      context.writeSuccess({
        artifact: stored
      });
    });

  artifact
    .command("list")
    .requiredOption("--challenge <challengeId>")
    .action(async (options) => {
      context.setCommand("artifact list");
      const artifacts = await listArtifactsByChallenge(context.paths, options.challenge);
      context.writeSuccess({
        artifacts
      });
    });
}
