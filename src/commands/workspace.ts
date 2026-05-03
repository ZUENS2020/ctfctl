import { Command } from "commander";
import type { CommandContext } from "../cli.js";
import { createWorkspace, destroyWorkspace } from "../core/runtime.js";

export function registerWorkspaceCommands(program: Command, context: CommandContext): void {
  const workspace = program.command("workspace");

  workspace
    .command("create")
    .requiredOption("--challenge <challengeId>")
    .action(async (options) => {
      context.setCommand("workspace create");
      const workspaceRecord = await createWorkspace(context.paths, options.challenge);
      context.writeSuccess({
        workspace: workspaceRecord
      });
    });

  workspace
    .command("destroy")
    .requiredOption("--workspace <workspaceId>")
    .action(async (options) => {
      context.setCommand("workspace destroy");
      const workspaceRecord = await destroyWorkspace(context.paths, options.workspace);
      context.writeSuccess({
        workspace: workspaceRecord
      });
    });
}
