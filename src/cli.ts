import { Command } from "commander";
import { registerArtifactCommands } from "./commands/artifact.js";
import { registerChallengeCommands } from "./commands/challenge.js";
import { registerConfigCommands } from "./commands/config.js";
import { registerEvidenceCommands } from "./commands/evidence.js";
import { registerExecCommands } from "./commands/exec.js";
import { registerImageCommands } from "./commands/image.js";
import { registerMemoryCommands } from "./commands/memory.js";
import { registerSkillCommands } from "./commands/skill.js";
import { registerVerifyCommands } from "./commands/verify.js";
import { registerWorkspaceCommands } from "./commands/workspace.js";
import { resolveConfig } from "./core/config.js";
import { CliError } from "./core/errors.js";
import { createErrorEnvelope, createSuccessEnvelope, toJson, type CommandResult } from "./core/output.js";
import { ensureRuntime, type RuntimePaths } from "./core/runtime.js";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

export interface CliHooks {
  prompt?: (questions: string[]) => Promise<string[]>;
}

export interface CommandContext {
  paths: RuntimePaths;
  env: NodeJS.ProcessEnv;
  config: Awaited<ReturnType<typeof resolveConfig>>;
  setCommand(command: string): void;
  writeSuccess<T>(data: T): void;
  writeError(code: string, message: string): void;
  prompt(questions: string[]): Promise<string[]>;
}

function deriveCommandName(args: string[]): string {
  const positional = args.filter((arg) => !arg.startsWith("--"));
  return positional.slice(0, 2).join(" ") || "unknown";
}

async function defaultPrompt(questions: string[]): Promise<string[]> {
  const rl = createInterface({ input, output });
  const answers: string[] = [];
  for (const question of questions) {
    answers.push(await rl.question(`${question}: `));
  }
  rl.close();
  return answers;
}

export async function runCli(
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
  hooks: CliHooks = {}
): Promise<CommandResult> {
  const config = await resolveConfig(env);
  const paths = await ensureRuntime(config);
  let stdout = "";
  let stderr = "";
  let currentCommand = deriveCommandName(args);

  const writeSuccess = <T>(data: T): void => {
    stdout += toJson(createSuccessEnvelope(currentCommand, data));
  };

  const writeError = (code: string, message: string): void => {
    stdout += toJson(createErrorEnvelope(currentCommand, code, message));
  };

  const program = new Command();
  program.name("ctfctl");
  program.exitOverride();
  program.configureOutput({
    writeOut: (value) => {
      stdout += value;
    },
    writeErr: (value) => {
      stderr += value;
    }
  });

  const context: CommandContext = {
    paths,
    env,
    config,
    setCommand: (command) => {
      currentCommand = command;
    },
    writeSuccess,
    writeError,
    prompt: hooks.prompt ?? defaultPrompt
  };

  registerChallengeCommands(program, context);
  registerConfigCommands(program, context);
  registerArtifactCommands(program, context);
  registerWorkspaceCommands(program, context);
  registerExecCommands(program, context);
  registerEvidenceCommands(program, context);
  registerMemoryCommands(program, context);
  registerImageCommands(program, context);
  registerSkillCommands(program, context);
  registerVerifyCommands(program, context);

  try {
    await program.parseAsync(args, { from: "user" });
    return {
      exitCode: 0,
      stdout,
      stderr
    };
  } catch (error) {
    if (error instanceof CliError) {
      writeError(error.code, error.message);
      return {
        exitCode: error.exitCode,
        stdout,
        stderr
      };
    }

    if (error instanceof Error) {
      writeError("COMMAND_FAILED", error.message);
    }

    return {
      exitCode: 1,
      stdout,
      stderr
    };
  }
}
