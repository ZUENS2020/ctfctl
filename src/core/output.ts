export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface EnvelopeMeta {
  schemaVersion: "1";
  command: string;
}

export interface SuccessEnvelope<T> {
  ok: true;
  data: T;
  meta: EnvelopeMeta;
}

export interface ErrorEnvelope {
  ok: false;
  error: {
    code: string;
    message: string;
  };
  meta: EnvelopeMeta;
}

export function toJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function createSuccessEnvelope<T>(command: string, data: T): SuccessEnvelope<T> {
  return {
    ok: true,
    data,
    meta: {
      schemaVersion: "1",
      command
    }
  };
}

export function createErrorEnvelope(command: string, code: string, message: string): ErrorEnvelope {
  return {
    ok: false,
    error: {
      code,
      message
    },
    meta: {
      schemaVersion: "1",
      command
    }
  };
}
