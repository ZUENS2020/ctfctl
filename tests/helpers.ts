import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export async function makeRuntimeRoot(): Promise<string> {
  return mkdtemp(join(tmpdir(), "ctfctl-"));
}

export async function cleanupRuntimeRoot(runtimeRoot: string): Promise<void> {
  await rm(runtimeRoot, { recursive: true, force: true });
}

export async function makeTempFile(contents: string, name = "sample.txt"): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "ctfctl-file-"));
  const filePath = join(dir, name);
  await writeFile(filePath, contents, "utf8");
  return filePath;
}
