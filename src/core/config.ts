import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";

import { CliError } from "./errors.js";

export type BackendKind = "docker";

export interface StoredConfig {
  runtimeRoot?: string;
  docker?: {
    image?: string;
    workdir?: string;
  };
}

export interface RuntimeConfig {
  runtimeRoot: string;
  backend: BackendKind;
  dockerImage: string;
  dockerWorkdir: string;
  configHome: string;
  configPath: string;
}

const DEFAULTS = {
  backend: "docker" as BackendKind,
  dockerImage: "kali/rolling",
  dockerWorkdir: "/workspace"
};

export function resolveDefaultRuntimeRoot(): string {
  return resolve(process.cwd(), ".ctfctl-runtime");
}

export function resolveConfigHome(env: NodeJS.ProcessEnv): string {
  return resolve(env.CTFCTL_CONFIG_HOME ?? join(homedir(), ".ctfctl"));
}

export function resolveConfigPath(env: NodeJS.ProcessEnv): string {
  return join(resolveConfigHome(env), "config.json");
}

export async function loadStoredConfig(env: NodeJS.ProcessEnv): Promise<StoredConfig> {
  try {
    const raw = await readFile(resolveConfigPath(env), "utf8");
    return JSON.parse(raw) as StoredConfig;
  } catch {
    return {};
  }
}

export async function saveStoredConfig(env: NodeJS.ProcessEnv, config: StoredConfig): Promise<void> {
  const configHome = resolveConfigHome(env);
  await mkdir(configHome, { recursive: true });
  await writeFile(resolveConfigPath(env), `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

export function materializeConfig(stored: StoredConfig, env: NodeJS.ProcessEnv): RuntimeConfig {
  const runtimeRoot = resolve(
    env.CTFCTL_RUNTIME_ROOT ??
      stored.runtimeRoot ??
      resolveDefaultRuntimeRoot()
  );
  const backend = DEFAULTS.backend;
  const dockerImage = env.CTFCTL_DOCKER_IMAGE ?? stored.docker?.image ?? DEFAULTS.dockerImage;
  const dockerWorkdir = env.CTFCTL_DOCKER_WORKDIR ?? stored.docker?.workdir ?? DEFAULTS.dockerWorkdir;
  const configHome = resolveConfigHome(env);
  const configPath = resolveConfigPath(env);

  return {
    runtimeRoot,
    backend,
    dockerImage,
    dockerWorkdir,
    configHome,
    configPath
  };
}

export async function resolveConfig(env: NodeJS.ProcessEnv): Promise<RuntimeConfig> {
  const stored = await loadStoredConfig(env);
  return materializeConfig(stored, env);
}

export function toStoredConfig(config: RuntimeConfig): StoredConfig {
  return {
    runtimeRoot: config.runtimeRoot,
    docker: {
      image: config.dockerImage,
      workdir: config.dockerWorkdir
    }
  };
}

export function getConfigValue(config: RuntimeConfig, key: string): string | null {
  switch (key) {
    case "runtimeRoot":
      return config.runtimeRoot;
    case "backend":
      return config.backend;
    case "docker.image":
      return config.dockerImage;
    case "docker.workdir":
      return config.dockerWorkdir;
    default:
      return null;
  }
}

export function updateStoredConfig(stored: StoredConfig, key: string, value: string): StoredConfig {
  switch (key) {
    case "runtimeRoot":
      return { ...stored, runtimeRoot: value };
    case "docker.image":
      return { ...stored, docker: { ...(stored.docker ?? {}), image: value } };
    case "docker.workdir":
      return { ...stored, docker: { ...(stored.docker ?? {}), workdir: value } };
    default:
      throw new CliError(`Unsupported config key: ${key}`, "INVALID_CONFIG_KEY", 1);
  }
}

export function unsetStoredConfig(stored: StoredConfig, key: string): StoredConfig {
  switch (key) {
    case "runtimeRoot":
      return { ...stored, runtimeRoot: undefined };
    case "docker.image":
      return { ...stored, docker: { ...(stored.docker ?? {}), image: undefined } };
    case "docker.workdir":
      return { ...stored, docker: { ...(stored.docker ?? {}), workdir: undefined } };
    default:
      throw new CliError(`Unsupported config key: ${key}`, "INVALID_CONFIG_KEY", 1);
  }
}
