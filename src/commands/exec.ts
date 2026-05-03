import { spawn } from "node:child_process";
import { Command } from "commander";
import type { CommandContext } from "../cli.js";
import { getWorkspace } from "../core/runtime.js";

interface ProcessResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

async function runProcess(file: string, args: string[], cwd?: string): Promise<ProcessResult> {
  return await new Promise((resolve, reject) => {
    const child = spawn(file, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", reject);
    child.on("close", (code) => {
      resolve({
        stdout,
        stderr,
        exitCode: code ?? 1
      });
    });
  });
}

export function registerExecCommands(program: Command, context: CommandContext): void {
  const execCommand = program.command("exec");

  execCommand
    .command("run")
    .requiredOption("--workspace <workspaceId>")
    .requiredOption("--cmd <command>")
    .requiredOption("--reason <reason>")
    .action(async (options) => {
      context.setCommand("exec run");
      const workspace = await getWorkspace(context.paths, options.workspace);
      const result =
        workspace.backend === "docker"
          ? await runProcess("docker", [
              "run",
              "--rm",
              "-v",
              `${workspace.path}:${workspace.containerWorkdir ?? "/workspace"}`,
              "-w",
              workspace.containerWorkdir ?? "/workspace",
              workspace.containerImage ?? context.paths.config.dockerImage,
              "sh",
              "-lc",
              options.cmd
            ])
          : await runProcess("sh", ["-lc", options.cmd], workspace.path);

      context.writeSuccess({
        backend: workspace.backend,
        image: workspace.containerImage,
        workspaceId: workspace.id,
        command: options.cmd,
        reason: options.reason,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode
      });
    });
}
