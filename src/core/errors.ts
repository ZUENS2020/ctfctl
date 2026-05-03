export class CliError extends Error {
  readonly code: string;
  readonly exitCode: number;

  constructor(message: string, code = "CLI_ERROR", exitCode = 1) {
    super(message);
    this.name = "CliError";
    this.code = code;
    this.exitCode = exitCode;
  }
}
