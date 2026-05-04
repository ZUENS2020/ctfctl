import { spawn } from "node:child_process";
import { Command } from "commander";
import type { CommandContext } from "../cli.js";
import { getWorkspace } from "../core/runtime.js";

interface ProcessResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timeout?: boolean;
}

const MAX_OUTPUT_LENGTH = 20000;

function truncateOutput(output: string): string {
  if (output.length <= MAX_OUTPUT_LENGTH) {
    return output;
  }
  const keep = 8000;
  return `${output.substring(0, keep)}\n...[TRUNCATED ${output.length - 2 * keep} chars]...\n${output.substring(output.length - keep)}`;
}

async function runProcess(file: string, args: string[], cwd?: string, timeoutMs: number = 60000): Promise<ProcessResult> {
  return await new Promise((resolve, reject) => {
    const child = spawn(file, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    let isTimeout = false;
    let timer: NodeJS.Timeout | undefined;

    if (timeoutMs > 0) {
      timer = setTimeout(() => {
        isTimeout = true;
        child.kill("SIGKILL");
      }, timeoutMs);
    }

    child.stdout.on("data", (chunk) => {
      if (stdout.length < 5000000) { // hard cap at ~5MB to avoid memory leaks
        stdout += String(chunk);
      }
    });

    child.stderr.on("data", (chunk) => {
      if (stderr.length < 5000000) {
        stderr += String(chunk);
      }
    });

    child.on("error", (err) => {
      if (timer) clearTimeout(timer);
      reject(err);
    });

    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      resolve({
        stdout: truncateOutput(stdout),
        stderr: truncateOutput(stderr),
        exitCode: isTimeout ? 124 : (code ?? 1),
        timeout: isTimeout
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
    .option("-t, --timeout <ms>", "timeout in ms (set to 0 to disable)", "60000")
    .action(async (options) => {
      context.setCommand("exec run");
      const workspace = await getWorkspace(context.paths, options.workspace);
      const timeoutMs = parseInt(options.timeout, 10);

      const result = await runProcess(
        "docker",
        [
          "run",
          "--rm",
          "-v",
          `${workspace.path}:${workspace.containerWorkdir}`,
          "-w",
          workspace.containerWorkdir,
          workspace.containerImage,
          "sh",
          "-lc",
          options.cmd
        ],
        undefined,
        timeoutMs
      );

      context.writeSuccess({
        backend: workspace.backend,
        image: workspace.containerImage,
        workspaceId: workspace.id,
        command: options.cmd,
        reason: options.reason,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        timeout: result.timeout
      });
    });
}
