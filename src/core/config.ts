import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";

export type BackendKind = "local-shell" | "docker";

export interface StoredConfig {
  runtimeRoot?: string;
  backend?: BackendKind;
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
    stored.runtimeRoot ??
      env.CTFCTL_RUNTIME_ROOT ??
      join(resolveConfigHome(env), "runtime")
  );
  const backend = stored.backend ?? (env.CTFCTL_BACKEND === "local-shell" ? "local-shell" : DEFAULTS.backend);
  const dockerImage = stored.docker?.image ?? env.CTFCTL_DOCKER_IMAGE ?? DEFAULTS.dockerImage;
  const dockerWorkdir = stored.docker?.workdir ?? env.CTFCTL_DOCKER_WORKDIR ?? DEFAULTS.dockerWorkdir;
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
    backend: config.backend,
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
    case "backend":
      return { ...stored, backend: value as BackendKind };
    case "docker.image":
      return { ...stored, docker: { ...(stored.docker ?? {}), image: value } };
    case "docker.workdir":
      return { ...stored, docker: { ...(stored.docker ?? {}), workdir: value } };
    default:
      return stored;
  }
}

export function unsetStoredConfig(stored: StoredConfig, key: string): StoredConfig {
  switch (key) {
    case "runtimeRoot":
      return { ...stored, runtimeRoot: undefined };
    case "backend":
      return { ...stored, backend: undefined };
    case "docker.image":
      return { ...stored, docker: { ...(stored.docker ?? {}), image: undefined } };
    case "docker.workdir":
      return { ...stored, docker: { ...(stored.docker ?? {}), workdir: undefined } };
    default:
      return stored;
  }
}
