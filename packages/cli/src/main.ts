export interface RunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export async function run(argv: string[]): Promise<RunResult> {
  const [command, ...args] = argv;

  if (!command || isHelpFlag(command)) {
    return {
      exitCode: 0,
      stdout: createRootHelpText(),
      stderr: "",
    };
  }

  if (command === "generate") {
    return runGenerateCommand(args);
  }

  if (command === "validate") {
    return runValidateCommand(args);
  }

  return {
    exitCode: 1,
    stdout: "",
    stderr: `unknown_command:${command}`,
  };
}

function runGenerateCommand(args: string[]): RunResult {
  const [target] = args;

  if (!target || isHelpFlag(target)) {
    return {
      exitCode: 0,
      stdout: createGenerateHelpText(),
      stderr: "",
    };
  }

  if (
    target === "types" ||
    target === "schemas" ||
    target === "protocol" ||
    target === "client-sdk"
  ) {
    return {
      exitCode: 0,
      stdout: `generate target scaffolded:${target}`,
      stderr: "",
    };
  }

  return {
    exitCode: 1,
    stdout: "",
    stderr: `unknown_generate_target:${target}`,
  };
}

function runValidateCommand(args: string[]): RunResult {
  const [firstArg] = args;

  if (!firstArg || isHelpFlag(firstArg)) {
    return {
      exitCode: 0,
      stdout: createValidateHelpText(),
      stderr: "",
    };
  }

  return {
    exitCode: 1,
    stdout: "",
    stderr: `unknown_validate_argument:${firstArg}`,
  };
}

function isHelpFlag(value: string): boolean {
  return value === "--help" || value === "-h";
}

function createRootHelpText(): string {
  return ["tabletop-cli", "", "Commands:", "  generate", "  validate"].join(
    "\n",
  );
}

function createGenerateHelpText(): string {
  return [
    "tabletop-cli generate",
    "",
    "Targets:",
    "  types",
    "  schemas",
    "  protocol",
    "  client-sdk",
  ].join("\n");
}

function createValidateHelpText(): string {
  return [
    "tabletop-cli validate",
    "",
    "Required flags:",
    "  --game <path>",
  ].join("\n");
}

if (import.meta.main) {
  const result = await run(process.argv.slice(2));

  if (result.stdout) {
    console.log(result.stdout);
  }

  if (result.stderr) {
    console.error(result.stderr);
  }

  process.exitCode = result.exitCode;
}
