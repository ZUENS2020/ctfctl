import { Command } from "commander";
import type { CommandContext } from "../cli.js";
import {
  getConfigValue,
  loadStoredConfig,
  materializeConfig,
  saveStoredConfig,
  toStoredConfig,
  unsetStoredConfig,
  updateStoredConfig
} from "../core/config.js";

export function registerConfigCommands(program: Command, context: CommandContext): void {
  const config = program.command("config");

  config.command("show").action(async () => {
    context.setCommand("config show");
    context.writeSuccess({
      config: context.config
    });
  });

  config
    .command("get")
    .argument("<key>")
    .action(async (key: string) => {
      context.setCommand("config get");
      context.writeSuccess({
        key,
        value: getConfigValue(context.config, key)
      });
    });

  config
    .command("set")
    .argument("<key>")
    .argument("<value>")
    .action(async (key: string, value: string) => {
      context.setCommand("config set");
      const stored = await loadStoredConfig(context.env);
      const updatedStored = updateStoredConfig(stored, key, value);
      await saveStoredConfig(context.env, updatedStored);
      const configValue = materializeConfig(updatedStored, context.env);
      context.writeSuccess({
        config: configValue
      });
    });

  config
    .command("unset")
    .argument("<key>")
    .action(async (key: string) => {
      context.setCommand("config unset");
      const stored = await loadStoredConfig(context.env);
      const updatedStored = unsetStoredConfig(stored, key);
      await saveStoredConfig(context.env, updatedStored);
      const configValue = materializeConfig(updatedStored, context.env);
      context.writeSuccess({
        config: configValue
      });
    });

  program.command("setup").action(async () => {
    context.setCommand("setup");
    const answers = await context.prompt([
      `runtimeRoot [${context.config.runtimeRoot}]`,
      `backend [${context.config.backend}]`,
      `docker.image [${context.config.dockerImage}]`,
      `docker.workdir [${context.config.dockerWorkdir}]`
    ]);

    const nextConfig = {
      ...context.config,
      runtimeRoot: answers[0] || context.config.runtimeRoot,
      backend: (answers[1] || context.config.backend) as typeof context.config.backend,
      dockerImage: answers[2] || context.config.dockerImage,
      dockerWorkdir: answers[3] || context.config.dockerWorkdir
    };

    await saveStoredConfig(context.env, toStoredConfig(nextConfig));
    context.writeSuccess({
      config: nextConfig
    });
  });
}
