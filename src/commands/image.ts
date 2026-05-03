import { spawn } from "node:child_process";
import { Command } from "commander";
import type { CommandContext } from "../cli.js";
import { CliError } from "../core/errors.js";
import { ensureDockerImageRecord, listDockerImageRecords } from "../core/runtime.js";

async function runDocker(args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("docker", args, {
      stdio: "ignore"
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new CliError("Docker daemon unavailable or image operation failed", "DOCKER_DAEMON_UNAVAILABLE", 1));
    });
  });
}

export function registerImageCommands(program: Command, context: CommandContext): void {
  const image = program.command("image");

  image
    .command("ensure")
    .requiredOption("--image <image>")
    .action(async (options) => {
      context.setCommand("image ensure");
      await runDocker(["pull", options.image]);
      const stored = await ensureDockerImageRecord(context.paths, options.image);
      context.writeSuccess({
        image: stored
      });
    });

  image.command("list").action(async () => {
    context.setCommand("image list");
    const images = await listDockerImageRecords(context.paths);
    context.writeSuccess({
      images
    });
  });
}
